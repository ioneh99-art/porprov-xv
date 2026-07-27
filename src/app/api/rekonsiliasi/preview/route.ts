// src/app/api/rekonsiliasi/preview/route.ts
// Fase 1 — DRY-RUN: parse File A + cocokkan ke DB. TIDAK menulis apa pun (§0.3, §9 item 2).
// Guard sesi + kontingen dari sesi (jangan hard-code 4).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { parseFileA, reconcile, type DbAtlet } from '@/lib/rekonsiliasi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const isAdmin = (s: any) => ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

async function fetchAtletKontingen(kontingen_id: number): Promise<DbAtlet[]> {
  const db = sb(); let all: DbAtlet[] = []
  for (let p = 0; ; p++) {
    const { data } = await db.from('atlet').select('id,no_ktp,nama_lengkap').eq('kontingen_id', kontingen_id).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    all = all.concat(data as DbAtlet[]); if (data.length < 1000) break
  }
  return all
}

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File .xlsx wajib diunggah.' }, { status: 400 })

  // kontingen dari sesi; pusat boleh sebut via field form.
  const kontingen_id = s.kontingen_id ?? (isAdmin(s) ? Number(form?.get('kontingen_id')) : null)
  if (!kontingen_id) return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })

  let parsed
  try { parsed = parseFileA(Buffer.from(await file.arrayBuffer())) }
  catch (e: any) { return NextResponse.json({ error: 'Gagal parse file: ' + e.message }, { status: 422 }) }
  if (!parsed.totalReviu) return NextResponse.json({ error: 'Sheet ATLET/DATA PORTAL tidak terbaca. Pastikan File A (Rekapitulasi).' }, { status: 422 })

  const db = await fetchAtletKontingen(kontingen_id)
  const result = reconcile(parsed, db)

  return NextResponse.json({
    kontingen_id, nama_file: file.name,
    summary: result.summary, selisih: result.selisih, rows: result.rows,
    ditulis: false,   // bukti dry-run
  })
}
