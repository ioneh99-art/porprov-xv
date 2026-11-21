// src/app/api/porprov15/bibit-atlet/route.ts
// Bibit Atlet PORPROV XV (prestasi semua kontingen). Akses = sama dengan Rapor Kontingen.
// Umur atlet Kab. Bandung hanya dikirim ke Superadministrator & akun KONIDA Kab. Bandung
// (data milik Kab. Bandung; akun KONI Jabar melihat prestasi saja).

import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/guard'
import { akunKonidaBersaklar, bolehLihatRapor, superadmin } from '@/lib/rapor-kontingen-db'
import { muatBibit } from '@/lib/bibit-atlet-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession()
  const akses = await bolehLihatRapor(s)
  if (!akses.boleh) return NextResponse.json({ error: 'Tidak berhak.', alasan: akses.alasan }, { status: akses.alasan === 'masuk' ? 401 : 403 })
  try {
    return NextResponse.json(await muatBibit(superadmin(s) || akunKonidaBersaklar(s)))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal memuat.' }, { status: 500 })
  }
}
