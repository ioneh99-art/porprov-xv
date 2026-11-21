// src/app/api/konida/rekonsiliasi-porprov/route.ts
// Rekonsiliasi akhir medali kontingen (dari sesi; admin pusat boleh ?kontingen_id=):
// podium resmi panitia PORPROV XV (arsip situs) vs medali yang disahkan di aplikasi kita.

import { NextRequest, NextResponse } from 'next/server'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { muatRekonsiliasi } from '@/lib/rekonsiliasi-porprov-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  try {
    return NextResponse.json(await muatRekonsiliasi(a.kontingen_id))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal memuat.' }, { status: 500 })
  }
}
