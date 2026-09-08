// src/app/api/gateway/preview/route.ts
// Pratinjau unggahan template: baca + cocokkan. READ-ONLY — tidak menulis apa pun.
// Kontingen diambil dari sesi, bukan dari isian pengguna.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { bacaBerkas, cocokkan } from '@/lib/gateway/import'
import { TEMPLATES, type JenisTemplate } from '@/lib/gateway/templates'
import {
  hitungPerubahan, ringkasPerubahan, kolomTerpakai, type Perubahan,
} from '@/lib/gateway/diff'
import type { DbAtlet } from '@/lib/rekonsiliasi'

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

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  const jenis = String(form?.get('jenis') ?? '') as JenisTemplate
  if (!file) return NextResponse.json({ error: 'Berkas belum dipilih.' }, { status: 400 })
  if (!(jenis in TEMPLATES)) {
    return NextResponse.json({ error: `jenis wajib: ${Object.keys(TEMPLATES).join(' | ')}` }, { status: 400 })
  }

  const kontingen_id = s.kontingen_id ?? (isAdmin(s) ? Number(form?.get('kontingen_id')) : null)
  if (!kontingen_id) {
    return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const hasil = bacaBerkas(buf, jenis)

    // Kolam atlet untuk pencocokan — hanya kontingen ini. Paginasi 1000.
    const db = sb()
    let atlet: DbAtlet[] = []
    for (let p = 0; ; p++) {
      const { data, error } = await db.from('atlet')
        .select('id,no_ktp,nama_lengkap')
        .eq('kontingen_id', kontingen_id)
        .range(p * 1000, (p + 1) * 1000 - 1)
      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      atlet = atlet.concat(data as DbAtlet[])
      if (data.length < 1000) break
    }

    const cocok = cocokkan(hasil, atlet)

    // ── Ambil nilai LAMA supaya operator melihat apa yang akan tertimpa ──
    // Tanpa ini pratinjau cuma bilang "nama cocok", tanpa memberitahu bahwa
    // alamat atau tanggal lahir yang sudah benar akan tertulis ulang.
    const idsTertaut = Array.from(new Set(
      cocok.baris.map(b => b.atlet_id).filter((x): x is number => x != null)))
    const lamaPerAtlet = new Map<number, Record<string, any>>()

    if (idsTertaut.length) {
      const kolom = kolomTerpakai(jenis).join(',')
      for (let i = 0; i < idsTertaut.length; i += 500) {
        const potong = idsTertaut.slice(i, i + 500)
        if (jenis === 'identitas') {
          const { data } = await db.from('atlet').select(`id,${kolom}`)
            .eq('kontingen_id', kontingen_id).in('id', potong)
          ;(data ?? []).forEach((r: any) => lamaPerAtlet.set(r.id, r))
        } else if (jenis === 'perlengkapan') {
          const { data } = await db.from('atlet_perlengkapan').select(`atlet_id,${kolom}`)
            .in('atlet_id', potong)
          ;(data ?? []).forEach((r: any) => lamaPerAtlet.set(r.atlet_id, r))
        } else {
          const { data } = await db.from('atlet_tes_fisik').select(`atlet_id,tahap,${kolom}`)
            .in('atlet_id', potong)
          ;(data ?? []).forEach((r: any) => lamaPerAtlet.set(r.atlet_id * 1000 + Number(r.tahap ?? 0), r))
        }
      }
    }

    const semuaPerubahan: Perubahan[][] = []
    for (const b of cocok.baris as any[]) {
      if (b.atlet_id == null) { b.perubahan = []; b.baris_baru = false; continue }
      const kunci = jenis === 'biomotorik'
        ? b.atlet_id * 1000 + Number(b.nilai?.tahap ?? 0)
        : b.atlet_id
      const lama = lamaPerAtlet.get(kunci) ?? null
      b.baris_baru = lama == null                       // biomotorik: tahap ini belum pernah ada
      b.perubahan = hitungPerubahan(jenis, b.nilai ?? {}, lama)
      semuaPerubahan.push(b.perubahan)
    }

    return NextResponse.json({
      ...cocok,
      kontingen_id,
      nama_file: file.name,
      total_kolam_atlet: atlet.length,
      ringkas_perubahan: ringkasPerubahan(semuaPerubahan),
      baris_baru: (cocok.baris as any[]).filter(b => b.atlet_id != null && b.baris_baru).length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Gagal membaca berkas.' }, { status: 422 })
  }
}
