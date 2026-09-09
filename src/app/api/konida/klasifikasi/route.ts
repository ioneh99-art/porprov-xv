// src/app/api/konida/klasifikasi/route.ts
// Pemilahan cabor menurut pengurus, disilangkan dengan kesiapan data atlet.
//
// Berkas pengurus memilah 65 cabor ke lima kategori sifat pertandingan dan
// empat tingkat prioritas, berdasarkan raihan Babak Kualifikasi PORPROV 2025.
// Sendirian itu cuma tabel Excel. Nilainya muncul saat disilangkan: cabor
// Prioritas 1 mana yang atletnya belum lengkap berkasnya, dan kapan mereka
// bertanding.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export async function GET() {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })
  const kontingen = s.kontingen_id ?? 4
  const db = sb()

  let atlet: any[] = []
  for (let p = 0; ; p++) {
    const { data } = await db.from('atlet')
      .select('id,cabor_nama_raw,foto_url,prioritas_emas,status_registrasi')
      .eq('kontingen_id', kontingen).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data?.length) break
    atlet = atlet.concat(data)
    if (data.length < 1000) break
  }
  const aktif = atlet.filter(a => a.status_registrasi !== 'Ditolak Admin')

  const [klasRes, jadwalRes] = await Promise.all([
    db.from('v_klasifikasi_cabor').select('*'),
    db.from('v_jadwal_cabor').select('cabor_nama_raw,mulai_paling_awal,tuan_rumah'),
  ])
  const klas = klasRes.data ?? []
  const jadwal = new Map((jadwalRes.data ?? []).map((j: any) => [j.cabor_nama_raw, j]))

  const per = new Map<string, { atlet: number; tanpaFoto: number; elite: number }>()
  aktif.forEach(a => {
    const c = (a.cabor_nama_raw ?? '').trim()
    if (!c) return
    const e = per.get(c) ?? { atlet: 0, tanpaFoto: 0, elite: 0 }
    e.atlet++
    if (!a.foto_url) e.tanpaFoto++
    if (a.prioritas_emas) e.elite++
    per.set(c, e)
  })

  const cabor = klas.map((k: any) => {
    const h = per.get(k.cabor_nama_raw) ?? { atlet: 0, tanpaFoto: 0, elite: 0 }
    const j: any = jadwal.get(k.cabor_nama_raw)
    return {
      cabor: k.cabor_nama_raw, kategori: k.kategori, prioritas: k.prioritas,
      bk_emas: k.bk_emas, bk_perak: k.bk_perak, bk_perunggu: k.bk_perunggu,
      atlet: h.atlet, tanpa_foto: h.tanpaFoto, elite: h.elite,
      mulai: j?.mulai_paling_awal ?? null, tuan_rumah: j?.tuan_rumah ?? null,
    }
  }).sort((a: any, b: any) =>
    (a.prioritas ?? 9) - (b.prioritas ?? 9) || b.bk_emas - a.bk_emas)

  const kumpul = (kunci: 'kategori' | 'prioritas') => {
    const m = new Map<string, any>()
    cabor.forEach((c: any) => {
      const k = String(c[kunci] ?? 'Tanpa ' + kunci)
      if (!m.has(k)) m.set(k, { nama: k, cabor: 0, emas: 0, perak: 0, perunggu: 0, atlet: 0, tanpa_foto: 0, elite: 0 })
      const e = m.get(k)
      e.cabor++; e.emas += c.bk_emas; e.perak += c.bk_perak; e.perunggu += c.bk_perunggu
      e.atlet += c.atlet; e.tanpa_foto += c.tanpa_foto; e.elite += c.elite
    })
    return Array.from(m.values()).sort((a, b) => b.emas - a.emas)
  }

  const totalEmas = cabor.reduce((n: number, c: any) => n + c.bk_emas, 0)

  return NextResponse.json({
    total: { emas: totalEmas,
             perak: cabor.reduce((n: number, c: any) => n + c.bk_perak, 0),
             perunggu: cabor.reduce((n: number, c: any) => n + c.bk_perunggu, 0) },
    per_kategori: kumpul('kategori'),
    per_prioritas: kumpul('prioritas').sort((a, b) => a.nama.localeCompare(b.nama)),
    cabor,
  })
}
