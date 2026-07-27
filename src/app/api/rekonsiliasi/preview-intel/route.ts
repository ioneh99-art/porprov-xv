// src/app/api/rekonsiliasi/preview-intel/route.ts
// Fase 1b DRY-RUN — parse File B + cocok nama (reuse atlet_id Fase 1). TIDAK menulis.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { parseFileB, matchIntel } from '@/lib/intel'
import { norm, type DbAtlet } from '@/lib/rekonsiliasi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const isAdmin = (s: any) => ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File .xlsx wajib.' }, { status: 400 })
  const kontingen_id = s.kontingen_id ?? (isAdmin(s) ? Number(form?.get('kontingen_id')) : null)
  if (!kontingen_id) return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })

  let parsed
  try { parsed = parseFileB(Buffer.from(await file.arrayBuffer())) }
  catch (e: any) { return NextResponse.json({ error: 'Gagal parse File B: ' + e.message }, { status: 422 }) }
  if (!parsed.totalAtlet) return NextResponse.json({ error: 'Sheet analisis tak terbaca. Pastikan File B (Analisis Strategis).' }, { status: 422 })

  const db = sb()
  // Peta Fase 1: batch confirmed terbaru → nama_file→atlet_id.
  const fase1Map = new Map<string, { atlet_id: number; nama: string }>()
  const { data: batch } = await db.from('rekonsiliasi_batch').select('id').eq('kontingen_id', kontingen_id).eq('status', 'confirmed').order('id', { ascending: false }).limit(1).maybeSingle()
  if (batch) {
    const { data: peserta } = await db.from('rekonsiliasi_peserta').select('nama_file,atlet_id').eq('batch_id', (batch as any).id).not('atlet_id', 'is', null)
    for (const p of peserta ?? []) fase1Map.set(norm((p as any).nama_file), { atlet_id: (p as any).atlet_id, nama: (p as any).nama_file })
  }

  // DB atlet (utk nama match).
  let atl: DbAtlet[] = []
  for (let p = 0; ; p++) {
    const { data } = await db.from('atlet').select('id,no_ktp,nama_lengkap').eq('kontingen_id', kontingen_id).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    atl = atl.concat(data as DbAtlet[]); if (data.length < 1000) break
  }

  const { rows, summary } = matchIntel(parsed, fase1Map, atl)
  return NextResponse.json({ kontingen_id, nama_file: file.name, punya_fase1: !!batch, summary, cabang: parsed.cabang, rows, ditulis: false })
}
