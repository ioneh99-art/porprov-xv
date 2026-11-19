// src/app/api/konida/proyeksi-emas/route.ts
// Proyeksi emas KONI vs realisasi (laporan lapangan yang sudah disahkan),
// untuk grafik situasi perolehan di War Room, plus rincian tiap emas (cabor,
// nomor, atlet) untuk rekap per hari.

import { NextRequest, NextResponse } from 'next/server'
import { tanggalWIB } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { pakaiTargetTetap, rapikanNama, rapikanNomor, susunProyeksi, urutkanRincian, type RincianEmas } from '@/lib/proyeksi'
import { SUMBER_TARGET_KONI, TARGET_EMAS_KONI, TARGET_KONI_KONTINGEN } from '@/lib/target-emas-koni'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()

  let proyeksi: any[], sah: any[]
  try {
    [proyeksi, sah] = await Promise.all([
      ambilSemua((d, s) => db.from('proyeksi_medali').select('tanggal,cabor_id,cabor_teks,sumber')
        .eq('kontingen_id', a.kontingen_id).eq('medali', 'emas').order('id').range(d, s)),
      ambilSemua((d, s) => db.from('laporan_hasil').select('id,tanggal,cabor_id,disiplin,nomor_teks,nilai_teks,atlet_ids')
        .eq('kontingen_id', a.kontingen_id).eq('status', 'disahkan').eq('hasil', 'emas').order('id').range(d, s)),
    ])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
  if (!proyeksi.length) return NextResponse.json({ ada: false })

  const idCabor = Array.from(new Set([...proyeksi, ...sah, ...TARGET_EMAS_KONI].map(x => x.cabor_id).filter((x): x is number => x != null)))
  const { data: cabor } = idCabor.length ? await db.from('cabang_olahraga').select('id,nama').in('id', idCabor) : { data: [] as any[] }
  const nama = new Map((cabor ?? []).map((c: any) => [c.id, c.nama as string]))

  const idAtlet = Array.from(new Set(sah.flatMap(l => (l.atlet_ids ?? []) as number[])))
  const namaAtlet = new Map<number, string>()
  for (let i = 0; i < idAtlet.length; i += 300) {
    const { data: at } = await db.from('atlet').select('id,nama_lengkap').in('id', idAtlet.slice(i, i + 300))
    for (const x of at ?? []) namaAtlet.set(x.id, rapikanNama(x.nama_lengkap ?? ''))
  }
  const rincian: RincianEmas[] = urutkanRincian(sah.map(l => ({
    id: l.id, tanggal: l.tanggal, cabor: nama.get(l.cabor_id) ?? `Cabor ${l.cabor_id}`,
    disiplin: l.disiplin ? rapikanNama(l.disiplin) : null, nomor: rapikanNomor(l.nomor_teks),
    atlet: ((l.atlet_ids ?? []) as number[]).map(id => namaAtlet.get(id)).filter((n): n is string => !!n).sort((a, b) => a.localeCompare(b)),
    nilai: l.nilai_teks || null,
  })))

  const realisasi = sah.map(l => ({ tanggal: l.tanggal, cabor: nama.get(l.cabor_id) ?? `Cabor ${l.cabor_id}` }))
  const ringkas = susunProyeksi(
    proyeksi.map(p => ({ tanggal: p.tanggal, cabor: nama.get(p.cabor_id) ?? p.cabor_teks })),
    realisasi,
    tanggalWIB(),
  )
  // Kab. Bandung: pembanding = target KONI 54 per cabor (tanpa tanggal); proyeksi
  // bertanggal hanya dipakai untuk rentang hari. Kontingen lain tetap proyeksi.
  if (a.kontingen_id === TARGET_KONI_KONTINGEN) {
    const target = TARGET_EMAS_KONI.map(t => ({ cabor: nama.get(t.cabor_id) ?? t.cabor, emas: t.emas }))
    return NextResponse.json({ ada: true, sumber: [SUMBER_TARGET_KONI], ...pakaiTargetTetap(ringkas, target, realisasi), rincian })
  }
  return NextResponse.json({ ada: true, sumber: Array.from(new Set(proyeksi.map(p => p.sumber))), ...ringkas, rincian })
}
