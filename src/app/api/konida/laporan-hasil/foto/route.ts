// src/app/api/konida/laporan-hasil/foto/route.ts
// Foto bukti satu laporan. Wadahnya privat; berkas hanya keluar lewat sini,
// setelah sesi KONIDA dan kepemilikan kontingennya diperiksa.

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { dbLapor } from '@/lib/lapor-sesi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const id = Number(new URL(req.url).searchParams.get('id'))
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Laporan tidak dikenali.' }, { status: 400 })

  const db = dbLapor()
  const { data: l } = await db.from('laporan_hasil').select('foto_path').eq('id', id).eq('kontingen_id', a.kontingen_id).maybeSingle()
  if (!l?.foto_path) return NextResponse.json({ error: 'Laporan ini tidak punya foto.' }, { status: 404 })

  const { data: berkas, error } = await db.storage.from('bukti-hasil').download(l.foto_path)
  if (error || !berkas) return NextResponse.json({ error: 'Foto tidak ditemukan di penyimpanan.' }, { status: 404 })
  return new NextResponse(berkas, {
    headers: {
      'content-type': berkas.type || 'image/jpeg',
      'cache-control': 'private, max-age=600',
      'x-content-type-options': 'nosniff',
    },
  })
}
