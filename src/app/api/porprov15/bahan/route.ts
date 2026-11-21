// src/app/api/porprov15/bahan/route.ts
// Bahan PORPROV berikutnya: beban jadwal per hari, kalender hari × cabor, beban venue, nomor sepi.
// Akses = sama dengan Rapor Kontingen.

import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/guard'
import { bolehLihatRapor } from '@/lib/rapor-kontingen-db'
import { muatBahan } from '@/lib/bahan-porprov-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const akses = await bolehLihatRapor(await getServerSession())
  if (!akses.boleh) return NextResponse.json({ error: 'Tidak berhak.', alasan: akses.alasan }, { status: akses.alasan === 'masuk' ? 401 : 403 })
  try {
    return NextResponse.json(await muatBahan())
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal memuat.' }, { status: 500 })
  }
}
