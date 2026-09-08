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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const isAdmin = (s: any) =>
  ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

const KOSONGKAN = '-'
/** Ambil nilai siap tulis. undefined = jangan sentuh kolom ini. */
function nilaiTulis(v: any): any {
  if (v == null || v === '') return undefined
  if (typeof v === 'string' && v.trim() === KOSONGKAN) return null
  return v
}

const KOLOM_ATLET = new Set([
  'tempat_lahir', 'tgl_lahir', 'gender', 'telepon', 'email',
  'alamat', 'kecamatan', 'nama_bank', 'no_rekening',
])
const KOLOM_PERLENGKAPAN = new Set([
  'ukuran_kemeja', 'ukuran_jaket', 'ukuran_kaos', 'ukuran_celana',
  'ukuran_sepatu', 'ukuran_topi', 'ukuran_training_set', 'catatan',
])

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

  try {
    if (jenis === 'identitas') {
      for (const b of baris) {
        const set: Record<string, any> = {}
        for (const k of Array.from(KOLOM_ATLET)) {
          const v = nilaiTulis(b.nilai?.[k])
          if (v !== undefined) set[k] = v
        }
        if (!Object.keys(set).length) { dilewati++; continue }
        set.updated_at = sekarang
        const { error } = await db.from('atlet').update(set)
          .eq('id', b.atlet_id).eq('kontingen_id', kontingen_id)
        if (error) gagal.push(`baris ${b.baris_ke}: ${error.message}`)
        else tersimpan++
      }
    }

    if (jenis === 'perlengkapan') {
      for (const b of baris) {
        const row: Record<string, any> = { atlet_id: b.atlet_id }
        let ada = false
        for (const k of Array.from(KOLOM_PERLENGKAPAN)) {
          const v = nilaiTulis(b.nilai?.[k])
          if (v !== undefined) { row[k] = v; ada = true }
        }
        if (!ada) { dilewati++; continue }
        row.diisi_oleh = aktor
        row.diisi_at = sekarang
        row.updated_at = sekarang
        const { error } = await db.from('atlet_perlengkapan').upsert(row, { onConflict: 'atlet_id' })
        if (error) { gagal.push(`baris ${b.baris_ke}: ${error.message}`); continue }

        // Cerminkan dua ukuran yang juga tersimpan di data atlet.
        const cermin: Record<string, any> = {}
        if (row.ukuran_kemeja !== undefined) cermin.ukuran_kemeja = row.ukuran_kemeja
        if (row.ukuran_sepatu !== undefined) cermin.ukuran_sepatu = row.ukuran_sepatu
        if (Object.keys(cermin).length) {
          cermin.updated_at = sekarang
          await db.from('atlet').update(cermin).eq('id', b.atlet_id).eq('kontingen_id', kontingen_id)
        }
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
      payload: { jenis, dikirim: baris.length, tersimpan, dilewati, gagal: gagal.length, nama_file: body?.nama_file ?? null },
      severity: 'warning', ...reqMeta(req),
    })

    return NextResponse.json({ ok: gagal.length === 0, jenis, tersimpan, dilewati, gagal })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Gagal menyimpan.' }, { status: 500 })
  }
}
