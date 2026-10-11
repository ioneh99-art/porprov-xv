// src/app/api/konida/rekap-lapangan/route.ts
// Rekap medali dari laporan lapangan yang sudah DISAHKAN, plus capaiannya
// terhadap target emas. Dibaca Dashboard, War Room, dan layar videotron.

import { NextRequest, NextResponse } from 'next/server'
import { adalahMedali, capaianTarget, hariPorprov, petaCabang, rekapMedali, tanggalWIB, tulisHasil } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()
  const k = a.kontingen_id

  let sah: any[]
  try {
    sah = await ambilSemua((dari, sampai) => db.from('laporan_hasil')
      .select('id,cabor_id,nomor_teks,atlet_ids,hasil,peringkat,nilai_teks,tanggal,diputus_at,created_at')
      .eq('kontingen_id', k).eq('status', 'disahkan').order('diputus_at', { ascending: false }).order('id', { ascending: false }).range(dari, sampai))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
  const [{ count: menunggu }, { data: kontingen }] = await Promise.all([
    db.from('laporan_hasil').select('id', { count: 'exact', head: true }).eq('kontingen_id', k).eq('status', 'menunggu'),
    db.from('kontingen').select('nama').eq('id', k).maybeSingle(),
  ])
  const laporan = sah.map((l: any) => ({ ...l, status: 'disahkan' }))

  // ── Target emas dari berkas analisis (batch intel terbaru) ──
  const { data: akhir } = await db.from('intel_target_atlet').select('batch_id').eq('kontingen_id', k)
    .order('batch_id', { ascending: false }).limit(1).maybeSingle()
  let targetAtlet: any[] = [], targetCabang: any[] = []
  if (akhir) {
    const [t1, t2] = await Promise.all([
      ambilSemua((dari, sampai) => db.from('intel_target_atlet').select('atlet_id,nama_file,cabang_file,target_medali')
        .eq('batch_id', akhir.batch_id).not('atlet_id', 'is', null).order('id').range(dari, sampai)).catch(() => [] as any[]),
      db.from('intel_target_cabang').select('cabang,target_cabor_emas,target_koni_emas').eq('batch_id', akhir.batch_id),
    ])
    targetAtlet = t1; targetCabang = t2.data ?? []
  }

  // Nama atlet & cabor untuk semua yang akan ditampilkan.
  const idAtlet = Array.from(new Set([...laporan.flatMap((l: any) => l.atlet_ids as number[]), ...targetAtlet.map((t: any) => t.atlet_id as number)]))
  const atlet: Record<number, { nama: string; cabor_id: number | null }> = {}
  for (let i = 0; i < idAtlet.length; i += 500) {
    const { data } = await db.from('atlet').select('id,nama_lengkap,cabor_id').in('id', idAtlet.slice(i, i + 500))
    for (const r of (data ?? [])) atlet[r.id] = { nama: r.nama_lengkap, cabor_id: r.cabor_id }
  }
  const { data: semuaCabor } = await db.from('cabang_olahraga').select('id,nama')
  const namaCabor = new Map((semuaCabor ?? []).map((c: any) => [c.id, c.nama]))

  // ── Per cabor: realisasi lawan target ──
  const peta = petaCabang(targetAtlet.map((t: any) => ({ cabang: t.cabang_file, cabor_id: atlet[t.atlet_id]?.cabor_id ?? null })))
  const perCabor = new Map<number, { cabor_id: number; cabor: string; emas: number; perak: number; perunggu: number; laga: number; target_koni: number; target_cabor: number }>()
  const baris = (id: number) => {
    let b = perCabor.get(id)
    if (!b) { b = { cabor_id: id, cabor: namaCabor.get(id) ?? `Cabor ${id}`, emas: 0, perak: 0, perunggu: 0, laga: 0, target_koni: 0, target_cabor: 0 }; perCabor.set(id, b) }
    return b
  }
  for (const l of laporan) {
    const b = baris(l.cabor_id); b.laga++
    if (l.hasil === 'emas') b.emas++; else if (l.hasil === 'perak') b.perak++; else if (l.hasil === 'perunggu') b.perunggu++
  }
  let targetKoni = 0, targetCaborTotal = 0, cabangTanpaPeta = 0
  for (const c of targetCabang) {
    const koni = Number(c.target_koni_emas) || 0, cab = Number(c.target_cabor_emas) || 0
    targetKoni += koni; targetCaborTotal += cab
    const id = peta.get(c.cabang)
    if (id == null) { if (koni || cab) cabangTanpaPeta++; continue }
    const b = baris(id); b.target_koni += koni; b.target_cabor += cab
  }

  // ── Per atlet bertarget emas (tautan ke cabor lain diabaikan sebagai meragukan) ──
  let tautanMeragukan = 0
  const targetEmas = targetAtlet.filter((t: any) => t.target_medali === 'emas').flatMap((t: any) => {
    const at = atlet[t.atlet_id]
    if (!at) return []
    if (peta.get(t.cabang_file) !== at.cabor_id) { tautanMeragukan++; return [] }
    return [{ atlet_id: t.atlet_id, nama: at.nama, cabang: namaCabor.get(at.cabor_id!) ?? t.cabang_file, cabor_id: at.cabor_id }]
  })
  const capaian = capaianTarget(targetEmas, laporan)

  const hariIni = tanggalWIB()
  const perHari = new Map<string, any[]>()
  for (const l of laporan) perHari.set(l.tanggal, [...(perHari.get(l.tanggal) ?? []), l])

  return NextResponse.json({
    kontingen: kontingen?.nama ?? '',
    diperbarui: new Date().toISOString(),
    hari_ini: { tanggal: hariIni, hari_ke: hariPorprov(hariIni), rekap: rekapMedali(perHari.get(hariIni) ?? []) },
    rekap: rekapMedali(laporan),
    menunggu: menunggu ?? 0,
    per_hari: Array.from(perHari.entries()).sort((x, y) => x[0].localeCompare(y[0]))
      .map(([tanggal, ls]) => ({ tanggal, hari_ke: hariPorprov(tanggal), ...rekapMedali(ls) })),
    per_cabor: Array.from(perCabor.values())
      .sort((x, y) => y.emas - x.emas || y.perak - x.perak || y.perunggu - x.perunggu || y.target_koni - x.target_koni || x.cabor.localeCompare(y.cabor)),
    medali_terbaru: laporan.filter((l: any) => adalahMedali(l.hasil)).slice(0, 12).map((l: any) => ({
      id: l.id, cabor: namaCabor.get(l.cabor_id) ?? '', nomor: l.nomor_teks, hasil: l.hasil, tulis: tulisHasil(l),
      nilai: l.nilai_teks, tanggal: l.tanggal, waktu: l.diputus_at ?? l.created_at,
      atlet: (l.atlet_ids as number[]).map(id => atlet[id]?.nama ?? `Atlet ${id}`),
    })),
    target: {
      ada: !!akhir,
      emas_koni: targetKoni, emas_cabor: targetCaborTotal,
      atlet_emas: capaian.length,
      tercapai: capaian.filter(c => c.status === 'tercapai').length,
      belum_emas: capaian.filter(c => c.status === 'belum_emas').length,
      belum_turun: capaian.filter(c => c.status === 'belum_turun').length,
      tautan_meragukan: tautanMeragukan, cabang_tanpa_peta: cabangTanpaPeta,
      daftar: capaian.filter(c => c.status !== 'belum_turun'),
    },
  })
}
