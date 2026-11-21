// src/app/api/porprov15/persaingan/route.ts
// Persaingan PORPROV XV: rekor antar kontingen per cabor + duel atlet berulang.
// Akses = sama dengan Rapor Kontingen (KONI Jabar & Superadministrator; Kab. Bandung bila dibuka).

import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/guard'
import { bolehLihatRapor } from '@/lib/rapor-kontingen-db'
import { muatPersaingan } from '@/lib/persaingan-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const akses = await bolehLihatRapor(await getServerSession())
  if (!akses.boleh) return NextResponse.json({ error: 'Tidak berhak.', alasan: akses.alasan }, { status: akses.alasan === 'masuk' ? 401 : 403 })
  try {
    return NextResponse.json(await muatPersaingan())
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal memuat.' }, { status: 500 })
  }
}
