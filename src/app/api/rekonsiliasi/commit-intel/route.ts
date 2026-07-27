// src/app/api/rekonsiliasi/commit-intel/route.ts
// Fase 1b — tulis intel_target_atlet + intel_target_cabang (service key). Confirm-before-write.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
const isAdmin = (s: any) => ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)
const MEDALI = ['emas', 'perak', 'perunggu']

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : []
  const cabang: any[] = Array.isArray(body?.cabang) ? body.cabang : []
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada baris.' }, { status: 400 })

  const kontingen_id = s.kontingen_id ?? (isAdmin(s) ? Number(body.kontingen_id) : null)
  if (!kontingen_id) return NextResponse.json({ error: 'Kontingen tidak diketahui.' }, { status: 403 })

  // Confirm-before-write: fuzzy yg belum diputuskan (masih 'nama_fuzzy') tak boleh ditulis.
  const belum = rows.filter(r => r.match_method === 'nama_fuzzy').length
  if (belum > 0) return NextResponse.json({ error: `Masih ada ${belum} baris perlu dikonfirmasi.` }, { status: 422 })

  const db = sb()
  const actorEmail = s.username ?? s.nama ?? null

  // Validasi atlet_id milik kontingen.
  const atletIds = Array.from(new Set(rows.map(r => r.atlet_id).filter((x: any) => x != null)))
  const valid = new Set<number>()
  if (atletIds.length) { const { data } = await db.from('atlet').select('id').eq('kontingen_id', kontingen_id).in('id', atletIds); (data ?? []).forEach((a: any) => valid.add(a.id)) }

  // Batch confirmed utk intel.
  const { data: batch, error: be } = await db.from('rekonsiliasi_batch').insert({
    kontingen_id, nama_file: body.nama_file ?? 'File B — Analisis', sumber: 'KONI-Analisis', status: 'confirmed', dibuat_oleh: actorEmail,
  }).select('id').single()
  if (be) return NextResponse.json({ error: be.message }, { status: 500 })
  const batch_id = (batch as any).id

  // intel_target_atlet
  const seen = new Set<string>()
  const atletRows = []
  for (const r of rows) {
    const key = `${r.nama}|${r.cabang}`
    if (seen.has(key)) continue; seen.add(key)
    const atlet_id = r.atlet_id != null && valid.has(r.atlet_id) ? r.atlet_id : null
    const manual = r.match_method === 'manual' || r.dikonfirmasi
    atletRows.push({
      batch_id, kontingen_id, atlet_id, nama_file: r.nama, cabang_file: r.cabang,
      target_medali: MEDALI.includes(r.target_medali) ? r.target_medali : null,
      capaian_catatan: r.capaian_catatan ?? null, pesaing: r.pesaing ?? null, analisis: r.analisis ?? null,
      match_method: atlet_id ? (manual ? 'manual' : (r.match_method === 'tidak_ketemu' ? 'nama_exact' : r.match_method)) : 'tidak_ketemu',
      match_score: r.match_score ?? null,
    })
  }
  for (let i = 0; i < atletRows.length; i += 500) {
    const { error } = await db.from('intel_target_atlet').insert(atletRows.slice(i, i + 500))
    if (error) return NextResponse.json({ error: error.message, batch_id }, { status: 500 })
  }

  // intel_target_cabang
  const seenC = new Set<string>()
  const cabangRows = cabang.filter(c => c.cabang && !seenC.has(c.cabang) && seenC.add(c.cabang)).map(c => ({
    batch_id, kontingen_id, cabang: c.cabang,
    target_cabor_emas: c.target_cabor_emas ?? null, target_koni_emas: c.target_koni_emas ?? null, probability: c.probability ?? null,
  }))
  if (cabangRows.length) { const { error } = await db.from('intel_target_cabang').insert(cabangRows); if (error) return NextResponse.json({ error: error.message, batch_id }, { status: 500 }) }

  await writeAudit({
    action: 'INTEL_COMMIT', resource: 'intel_target_atlet', resource_id: batch_id,
    actor_id: s.id != null ? String(s.id) : null, actor_email: actorEmail, actor_role: s.role ?? s.level ?? null,
    kontingen_id, payload: { atlet: atletRows.length, cabang: cabangRows.length }, severity: 'warning', ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, batch_id, atlet: atletRows.length, cabang: cabangRows.length })
}
