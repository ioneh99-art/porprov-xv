// src/app/api/konida/matriks-harian/route.ts
// Jurnal dalam format "Matrix Jadwal Harian" KONI: jadwal (tanggal, kota, venue)
// disandingkan dengan laporan lapangan yang sudah DISAHKAN.
//
//   ?dari=YYYY-MM-DD&sampai=YYYY-MM-DD   rentang tertentu (paling banyak 60 hari)
//   ?semua=1                             seluruh rentang jadwal yang ada

import { NextRequest, NextResponse } from 'next/server'
import { petaCabang, tanggalSah, tanggalWIB } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { rentangTanggal, susunMatriks, type BarisJadwal, type LaporanMatriks } from '@/lib/matriks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const URUTAN: Record<string, number> = { emas: 1, perak: 2, perunggu: 3 }
const jamWIB = (ts: string) => new Date(new Date(ts).getTime() + 7 * 3600_000).toISOString().slice(11, 16)

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()
  const u = new URL(req.url)

  const { data: jadwal, error: gagalJadwal } = await db.from('jadwal_cabor')
    .select('cabor_disiplin,cabor_nama_raw,jenis,wilayah,tuan_rumah,mulai,selesai,venue').order('mulai')
  if (gagalJadwal) return NextResponse.json({ error: gagalJadwal.message }, { status: 500 })

  let dari = u.searchParams.get('dari') ?? tanggalWIB()
  let sampai = u.searchParams.get('sampai') ?? dari
  if (u.searchParams.get('semua') === '1') {
    const mulai = (jadwal ?? []).map((j: any) => j.mulai).filter(Boolean).sort()
    const selesai = (jadwal ?? []).map((j: any) => j.selesai).filter(Boolean).sort()
    if (mulai.length) { dari = mulai[0]; sampai = selesai[selesai.length - 1] }
  }
  if (!tanggalSah(dari) || !tanggalSah(sampai) || dari > sampai)
    return NextResponse.json({ error: 'Rentang tanggal tidak dikenali.' }, { status: 400 })
  const hari = rentangTanggal(dari, sampai)

  let laporan: any[]
  try {
    laporan = await ambilSemua((d, s) => db.from('laporan_hasil')
      .select('id,cabor_id,disiplin,nomor_teks,atlet_ids,hasil,peringkat,nilai_teks,lawan,jam,tanggal,pelapor_nama,created_at')
      .eq('kontingen_id', a.kontingen_id).eq('status', 'disahkan').gte('tanggal', dari).lte('tanggal', sampai).order('id').range(d, s))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const idAtlet = Array.from(new Set(laporan.flatMap(l => l.atlet_ids as number[])))
  const atlet: Record<number, { nama: string; cabor_id: number | null }> = {}
  for (let i = 0; i < idAtlet.length; i += 500) {
    const { data } = await db.from('atlet').select('id,nama_lengkap,cabor_id').in('id', idAtlet.slice(i, i + 500))
    for (const r of (data ?? [])) atlet[r.id] = { nama: r.nama_lengkap, cabor_id: r.cabor_id }
  }
  const [{ data: cabor }, { data: kontingen }] = await Promise.all([
    db.from('cabang_olahraga').select('id,nama'),
    db.from('kontingen').select('nama').eq('id', a.kontingen_id).maybeSingle(),
  ])
  const namaCabor = new Map((cabor ?? []).map((c: any) => [c.id, c.nama]))

  // Target medali per atlet dari berkas analisis. Tautan ke atlet cabor lain
  // diabaikan — itu sisa salah-taut nama, bukan target atlet tersebut.
  const target: Record<number, string> = {}
  if (idAtlet.length) {
    const { data: akhir } = await db.from('intel_target_atlet').select('batch_id').eq('kontingen_id', a.kontingen_id)
      .order('batch_id', { ascending: false }).limit(1).maybeSingle()
    if (akhir) {
      const semuaTarget = await ambilSemua<any>((d, s) => db.from('intel_target_atlet').select('atlet_id,cabang_file,target_medali')
        .eq('batch_id', akhir.batch_id).not('atlet_id', 'is', null).order('id').range(d, s)).catch(() => [])
      const idTarget = Array.from(new Set(semuaTarget.map(t => t.atlet_id as number)))
      const caborAtlet: Record<number, number | null> = {}
      for (let i = 0; i < idTarget.length; i += 500) {
        const { data } = await db.from('atlet').select('id,cabor_id').in('id', idTarget.slice(i, i + 500))
        for (const r of (data ?? [])) caborAtlet[r.id] = r.cabor_id
      }
      const peta = petaCabang(semuaTarget.map(t => ({ cabang: t.cabang_file, cabor_id: caborAtlet[t.atlet_id] ?? null })))
      for (const t of semuaTarget) {
        if (!URUTAN[t.target_medali] || peta.get(t.cabang_file) !== caborAtlet[t.atlet_id]) continue
        if (!target[t.atlet_id] || URUTAN[t.target_medali] < URUTAN[target[t.atlet_id]]) target[t.atlet_id] = t.target_medali
      }
    }
  }

  const isi: LaporanMatriks[] = laporan.map(l => {
    // Untuk beregu, target tim = target tertinggi di antara anggotanya.
    const tt = (l.atlet_ids as number[]).map(id => target[id]).filter(Boolean).sort((x, y) => URUTAN[x] - URUTAN[y])[0] ?? null
    return {
      id: l.id, tanggal: l.tanggal, cabor: namaCabor.get(l.cabor_id) ?? '', disiplin: l.disiplin, nomor_teks: l.nomor_teks,
      atlet: (l.atlet_ids as number[]).map(id => atlet[id]?.nama ?? `Atlet ${id}`),
      hasil: l.hasil, peringkat: l.peringkat, nilai_teks: l.nilai_teks, lawan: l.lawan, jam: l.jam, jam_lapor: jamWIB(l.created_at),
      pelapor_nama: l.pelapor_nama, target: tt as LaporanMatriks['target'],
    }
  })

  return NextResponse.json({
    kontingen: kontingen?.nama ?? '', dari, sampai,
    jumlah_laporan: isi.length,
    baris: susunMatriks((jadwal ?? []) as BarisJadwal[], isi, hari),
  })
}
