// src/app/api/konida/proyeksi-emas/route.ts
// Proyeksi emas KONI vs realisasi (laporan lapangan yang sudah disahkan),
// untuk grafik situasi perolehan di War Room.

import { NextRequest, NextResponse } from 'next/server'
import { tanggalWIB } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { susunProyeksi } from '@/lib/proyeksi'

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
      ambilSemua((d, s) => db.from('laporan_hasil').select('tanggal,cabor_id')
        .eq('kontingen_id', a.kontingen_id).eq('status', 'disahkan').eq('hasil', 'emas').order('id').range(d, s)),
    ])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
  if (!proyeksi.length) return NextResponse.json({ ada: false })

  const idCabor = Array.from(new Set([...proyeksi, ...sah].map(x => x.cabor_id).filter((x): x is number => x != null)))
  const { data: cabor } = idCabor.length ? await db.from('cabang_olahraga').select('id,nama').in('id', idCabor) : { data: [] as any[] }
  const nama = new Map((cabor ?? []).map((c: any) => [c.id, c.nama as string]))

  const ringkas = susunProyeksi(
    proyeksi.map(p => ({ tanggal: p.tanggal, cabor: nama.get(p.cabor_id) ?? p.cabor_teks })),
    sah.map(l => ({ tanggal: l.tanggal, cabor: nama.get(l.cabor_id) ?? `Cabor ${l.cabor_id}` })),
    tanggalWIB(),
  )
  return NextResponse.json({ ada: true, sumber: Array.from(new Set(proyeksi.map(p => p.sumber))), ...ringkas })
}
