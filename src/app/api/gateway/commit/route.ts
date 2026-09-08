// src/app/api/gateway/commit/route.ts
// Menulis hasil unggahan template yang SUDAH dikonfirmasi operator.
//
// Pengaman berlapis (pola sama dengan /api/rekonsiliasi/commit):
//  1. Wajib sesi; kontingen diambil dari sesi, bukan dari isian.
//  2. Menolak bila masih ada baris bergalat atau belum tertaut ke atlet.
//  3. Kepemilikan atlet diperiksa ulang di server — bukan percaya kiriman klien.
//  4. Sel kosong = jangan ubah. Tanda "-" = kosongkan.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { writeAudit, reqMeta } from '@/lib/audit'
import { TEMPLATES, hitungBmi, type JenisTemplate } from '@/lib/gateway/templates'
import { kategoriDariPersen, ratingDariPersen } from '@/lib/gateway/rating'
import {
  hitungPerubahan, nilaiUntukDitulis, untukAudit, kolomTerpakai,
  type RingkasUbah,
} from '@/lib/gateway/diff'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const isAdmin = (s: any) =>
  ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)


export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const jenis = String(body?.jenis ?? '') as JenisTemplate
  const baris: any[] = Array.isArray(body?.baris) ? body.baris : []
  if (!(jenis in TEMPLATES)) {
    return NextResponse.json({ error: `jenis wajib: ${Object.keys(TEMPLATES).join(' | ')}` }, { status: 400 })
  }
  if (!baris.length) return NextResponse.json({ error: 'Tidak ada baris untuk disimpan.' }, { status: 400 })

  const kontingen_id = s.kontingen_id ?? (isAdmin(s) ? Number(body.kontingen_id) : null)
  if (!kontingen_id) return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })

  // Pengaman 2 — tak boleh ada yang bergalat atau belum tertaut.
  const bergalat = baris.filter(b => Array.isArray(b.galat) && b.galat.length).length
  if (bergalat) {
    return NextResponse.json({ error: `Masih ada ${bergalat} baris bermasalah. Perbaiki berkasnya dulu.` }, { status: 422 })
  }
  const belumTertaut = baris.filter(b => b.atlet_id == null).length
  if (belumTertaut) {
    return NextResponse.json({ error: `Masih ada ${belumTertaut} baris yang belum ditautkan ke atlet.` }, { status: 422 })
  }

  const db = sb()

  // Pengaman 3 — kepemilikan atlet diperiksa ulang di server.
  const ids = Array.from(new Set(baris.map(b => Number(b.atlet_id))))
  const sah = new Map<number, string>()
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await db.from('atlet')
      .select('id,nama_lengkap')
      .eq('kontingen_id', kontingen_id)
      .in('id', ids.slice(i, i + 500))
    ;(data ?? []).forEach((a: any) => sah.set(a.id, a.nama_lengkap))
  }
  const asing = ids.filter(id => !sah.has(id))
  if (asing.length) {
    return NextResponse.json({ error: `${asing.length} atlet di luar kontingen Anda. Dibatalkan.` }, { status: 403 })
  }

  const aktor = s.username ?? s.nama ?? null
  const sekarang = new Date().toISOString()
  let tersimpan = 0, dilewati = 0
  const gagal: string[] = []

  // Nilai LAMA diambil ulang di server — perubahan dihitung dari keadaan
  // database saat ini, bukan dari kiriman peramban yang bisa sudah basi.
  const kolom = kolomTerpakai(jenis).join(',')
  const lamaPer = new Map<number, Record<string, any>>()
  if (jenis === 'identitas' || jenis === 'perlengkapan') {
    for (let i = 0; i < ids.length; i += 500) {
      const potong = ids.slice(i, i + 500)
      if (jenis === 'identitas') {
        const { data } = await db.from('atlet').select(`id,${kolom}`)
          .eq('kontingen_id', kontingen_id).in('id', potong)
        ;(data ?? []).forEach((r: any) => lamaPer.set(r.id, r))
      } else {
        const { data } = await db.from('atlet_perlengkapan').select(`atlet_id,${kolom}`)
          .in('atlet_id', potong)
        ;(data ?? []).forEach((r: any) => lamaPer.set(r.atlet_id, r))
      }
    }
  }

  const rekapUbah: RingkasUbah = { tambah: 0, ubah: 0, kosongkan: 0, sama: 0 }
  const jejak: any[] = []          // sebelum→sesudah untuk audit

  try {
    if (jenis === 'identitas') {
      for (const b of baris) {
        const p = hitungPerubahan(jenis, b.nilai ?? {}, lamaPer.get(Number(b.atlet_id)) ?? null)
        p.forEach(x => { rekapUbah[x.jenis]++ })
        const set = nilaiUntukDitulis(p)
        if (!Object.keys(set).length) { dilewati++; continue }
        set.updated_at = sekarang
        const { error } = await db.from('atlet').update(set)
          .eq('id', b.atlet_id).eq('kontingen_id', kontingen_id)
        if (error) { gagal.push(`baris ${b.baris_ke}: ${error.message}`); continue }
        jejak.push({ atlet_id: b.atlet_id, nama: sah.get(Number(b.atlet_id)), ubah: untukAudit(p) })
        tersimpan++
      }
    }

    if (jenis === 'perlengkapan') {
      for (const b of baris) {
        const p = hitungPerubahan(jenis, b.nilai ?? {}, lamaPer.get(Number(b.atlet_id)) ?? null)
        p.forEach(x => { rekapUbah[x.jenis]++ })
        const set = nilaiUntukDitulis(p)
        if (!Object.keys(set).length) { dilewati++; continue }
        const row: Record<string, any> = {
          ...set, atlet_id: b.atlet_id,
          diisi_oleh: aktor, diisi_at: sekarang, updated_at: sekarang,
        }
        const { error } = await db.from('atlet_perlengkapan').upsert(row, { onConflict: 'atlet_id' })
        if (error) { gagal.push(`baris ${b.baris_ke}: ${error.message}`); continue }

        // Cerminkan dua ukuran yang juga tersimpan di data atlet.
        const cermin: Record<string, any> = {}
        if (set.ukuran_kemeja !== undefined) cermin.ukuran_kemeja = set.ukuran_kemeja
        if (set.ukuran_sepatu !== undefined) cermin.ukuran_sepatu = set.ukuran_sepatu
        if (Object.keys(cermin).length) {
          cermin.updated_at = sekarang
          await db.from('atlet').update(cermin).eq('id', b.atlet_id).eq('kontingen_id', kontingen_id)
        }
        jejak.push({ atlet_id: b.atlet_id, nama: sah.get(Number(b.atlet_id)), ubah: untukAudit(p) })
        tersimpan++
      }
    }

    if (jenis === 'biomotorik') {
      for (const b of baris) {
        const n = b.nilai ?? {}
        const persen = n.kesimpulan_persen ?? null
        const status = n.status_tes ?? 'Hadir'
        const kategori = n.kesimpulan_kategori ?? kategoriDariPersen(persen)
        const rating = ratingDariPersen(persen, status)

        const row: Record<string, any> = {
          atlet_id: b.atlet_id,
          kontingen_id,
          nama_atlet: sah.get(Number(b.atlet_id)) ?? b.nama ?? 'Tanpa Nama',
          tanggal_tes: n.tanggal_tes,
          tahap: n.tahap,
          lembaga_penguji: n.lembaga_penguji ?? null,
          lokasi_tes: n.lokasi_tes ?? null,
          penanggung_jawab: n.penanggung_jawab ?? null,
          sumber_data: `Impor Data Gateway oleh ${aktor ?? 'operator'}`,
          berat_badan: n.berat_badan ?? null,
          tinggi_badan: n.tinggi_badan ?? null,
          bmi: n.bmi ?? hitungBmi(n.berat_badan ?? null, n.tinggi_badan ?? null),
          kesimpulan_persen: persen,
          kesimpulan_kategori: kategori,
          status_tes: status,
          matching_method: b.metode ?? 'nik',
          matching_score: b.skor ?? null,
          updated_at: sekarang,
        }

        // Idempoten: satu atlet hanya boleh punya satu baris per tahap.
        const { data: adaBaris } = await db.from('atlet_tes_fisik')
          .select('id').eq('atlet_id', b.atlet_id).eq('tahap', n.tahap).maybeSingle()

        const { data: tersimpanRow, error } = adaBaris
          ? await db.from('atlet_tes_fisik').update(row).eq('id', (adaBaris as any).id).select('id').single()
          : await db.from('atlet_tes_fisik').insert(row).select('id').single()
        if (error) { gagal.push(`baris ${b.baris_ke}: ${error.message}`); continue }

        // Perbarui ringkasan di tabel atlet supaya dasbor ikut bergerak.
        await db.from('atlet').update({
          tes_fisik_id: (tersimpanRow as any)?.id ?? null,
          tes_fisik_status: status,
          tes_fisik_kategori: kategori,
          tes_fisik_persen: persen,
          tes_fisik_rating: rating,
          updated_at: sekarang,
        }).eq('id', b.atlet_id).eq('kontingen_id', kontingen_id)

        tersimpan++
      }
    }

    await writeAudit({
      action: `GATEWAY_IMPOR_${jenis.toUpperCase()}`,
      resource: TEMPLATES[jenis].sasaran,
      resource_id: null,
      actor_id: s.id != null ? String(s.id) : null,
      actor_email: aktor, actor_role: s.role ?? s.level ?? null,
      kontingen_id,
      payload: {
        jenis, dikirim: baris.length, tersimpan, dilewati, gagal: gagal.length,
        nama_file: body?.nama_file ?? null,
        rekap_perubahan: rekapUbah,
        jejak: jejak.slice(0, 200),   // sebelum→sesudah, dibatasi agar payload wajar
      },
      severity: 'warning', ...reqMeta(req),
    })

    return NextResponse.json({
      ok: gagal.length === 0, jenis, tersimpan, dilewati, gagal,
      rekap_perubahan: rekapUbah,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Gagal menyimpan.' }, { status: 500 })
  }
}
