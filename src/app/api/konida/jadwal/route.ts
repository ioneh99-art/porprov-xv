// src/app/api/konida/jadwal/route.ts
// Jadwal pertandingan disilangkan dengan data atlet.
//
// Nilainya bukan pada jadwalnya sendiri — itu ada di berkas Excel panitia —
// tapi pada persilangannya: cabor mana yang turun paling dulu, berapa
// atletnya, dan berapa di antaranya yang berkasnya belum lengkap. Selama
// keduanya terpisah, "Futsal bertanding 28 Oktober" dan "17 atlet Futsal
// belum berpasfoto" adalah dua fakta yang tidak pernah bertemu.

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

/** Selisih hari dari hari ini, dihitung di zona waktu setempat.
 *  Sengaja TIDAK memakai toISOString(): mesin ini berzona Asia/Jakarta, dan
 *  konversi ke UTC pernah menggeser tanggal lahir atlet sehari. */
function hariLagi(tanggal: string | null): number | null {
  if (!tanggal) return null
  const [y, m, d] = tanggal.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const kini = new Date()
  const hariIni = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate())
  return Math.round((target.getTime() - hariIni.getTime()) / 86400000)
}

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

  const [jadwalRes, upacaraRes] = await Promise.all([
    db.from('v_jadwal_cabor').select('*'),
    db.from('jadwal_cabor').select('cabor_disiplin,mulai,venue').eq('jenis', 'upacara').order('mulai'),
  ])
  const jadwal  = jadwalRes.data ?? []
  const upacara = (upacaraRes.data ?? []).map((u: any) => ({
    nama: u.cabor_disiplin, tanggal: u.mulai, venue: u.venue, hari_lagi: hariLagi(u.mulai),
  }))

  const punyaJadwal = new Set(jadwal.map((j: any) => j.cabor_nama_raw))

  const perCabor = new Map<string, { atlet: number; tanpaFoto: number; elite: number }>()
  aktif.forEach(a => {
    const c = (a.cabor_nama_raw ?? '').trim()
    if (!c) return
    const e = perCabor.get(c) ?? { atlet: 0, tanpaFoto: 0, elite: 0 }
    e.atlet++
    if (!a.foto_url) e.tanpaFoto++
    if (a.prioritas_emas) e.elite++
    perCabor.set(c, e)
  })

  const cabor = jadwal.map((j: any) => {
    const h = perCabor.get(j.cabor_nama_raw) ?? { atlet: 0, tanpaFoto: 0, elite: 0 }
    return {
      cabor: j.cabor_nama_raw, jumlah_nomor: j.jumlah_nomor,
      mulai: j.mulai_paling_awal, selesai: j.selesai_paling_akhir,
      tuan_rumah: j.tuan_rumah, venue: j.venue, wilayah: j.wilayah,
      hari_lagi: hariLagi(j.mulai_paling_awal),
      atlet: h.atlet, tanpa_foto: h.tanpaFoto, elite: h.elite,
    }
  }).sort((a: any, b: any) => (a.hari_lagi ?? 9e9) - (b.hari_lagi ?? 9e9))

  // ── Silang: dua arah, keduanya perlu diketahui ──
  const tanpaJadwal = Array.from(perCabor.entries())
    .filter(([c]) => !punyaJadwal.has(c))
    .map(([cabor, h]) => ({ cabor, atlet: h.atlet, elite: h.elite }))
    .sort((a, b) => b.atlet - a.atlet)

  const pembukaan = upacara.find(u => /PEMBUKAAN/i.test(u.nama))
  const sebelumPembukaan = pembukaan
    ? cabor.filter((c: any) => c.mulai && c.mulai < pembukaan.tanggal)
    : []

  return NextResponse.json({
    upacara,
    pertandingan_pertama: cabor[0]?.mulai ?? null,
    hari_ke_pertandingan_pertama: cabor[0]?.hari_lagi ?? null,
    cabor,
    tanpa_jadwal: tanpaJadwal,
    sebelum_pembukaan: sebelumPembukaan.map((c: any) => ({
      cabor: c.cabor, mulai: c.mulai, atlet: c.atlet, tanpa_foto: c.tanpa_foto,
    })),
  })
}
