// src/app/api/rekonsiliasi/[batchId]/route.ts
// Fase 1 — laporan hasil rekonsiliasi 1 batch. Guard sesi + kontingen milik pemanggil.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const isAdmin = (s: any) => ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

export async function GET(_req: NextRequest, { params }: { params: { batchId: string } }) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = Number(params.batchId)
  if (!id) return NextResponse.json({ error: 'batchId invalid' }, { status: 400 })

  const db = sb()
  const { data: batch } = await db.from('rekonsiliasi_batch').select('*').eq('id', id).single()
  if (!batch) return NextResponse.json({ error: 'Batch tidak ditemukan' }, { status: 404 })
  // Kontingen-aware: non-admin hanya batch kontingennya.
  if (!isAdmin(s) && s.kontingen_id != null && Number((batch as any).kontingen_id) !== Number(s.kontingen_id))
    return NextResponse.json({ error: 'Bukan kontingen Anda' }, { status: 403 })

  const { data: rows } = await db.from('rekonsiliasi_peserta').select('*').eq('batch_id', id).order('cabang_file')
  const r = rows ?? []
  return NextResponse.json({
    batch,
    ringkas: {
      total: r.length,
      peserta_resmi: r.filter((x: any) => x.status_peserta === 'peserta_resmi').length,
      tidak_ketemu: r.filter((x: any) => x.status_peserta === 'tidak_ketemu').length,
      via_nik: r.filter((x: any) => x.match_method === 'nik').length,
      via_manual: r.filter((x: any) => x.match_method === 'manual').length,
    },
    rows: r,
  })
}
