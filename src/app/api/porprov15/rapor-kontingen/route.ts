// src/app/api/porprov15/rapor-kontingen/route.ts
// Rapor Kontingen & Peta Kekuatan PORPROV XV (dari gudang porprov15_*).
// Superadministrator & KONI Jabar selalu boleh; KONIDA Kab. Bandung hanya bila fitur dibuka.

import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/guard'
import { bolehLihatRapor, muatRapor } from '@/lib/rapor-kontingen-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession()
  const akses = await bolehLihatRapor(s)
  if (!akses.boleh) {
    const status = akses.alasan === 'masuk' ? 401 : 403
    return NextResponse.json({ error: akses.alasan === 'terkunci' ? 'Fitur Rapor Kontingen belum dibuka untuk kontingen ini.' : 'Tidak berhak.', alasan: akses.alasan }, { status })
  }
  try {
    return NextResponse.json(await muatRapor())
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal memuat.' }, { status: 500 })
  }
}
