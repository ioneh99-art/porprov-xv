// src/app/api/operator/pentathlon-config/route.ts
// Simpan baseline UIPM pentathlon lewat server (service key). Ganti tulis anon dari
// browser (settings page). Wajib sesi. Audit.

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

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (!body.baselines || typeof body.baselines !== 'object')
    return NextResponse.json({ error: 'baselines wajib.' }, { status: 422 })

  const db = sb()
  // updated_by kolom uuid — pakai hanya bila valid uuid, else null.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const uid = [s.id, body.updated_by].map(v => (v == null ? null : String(v))).find(v => v && UUID.test(v)) ?? null

  // Insert baris aktif BARU dulu; baru nonaktifkan sisanya (agar tak pernah kosong).
  const { data: created, error } = await db.from('pentathlon_config').insert({
    baselines: body.baselines, is_active: true,
    notes: body.notes ?? 'Updated via settings', updated_by: uid,
  }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('pentathlon_config').update({ is_active: false }).eq('is_active', true).neq('id', (created as any).id)

  await writeAudit({
    action: 'SET_PENTATHLON_BASELINE', resource: 'pentathlon_config',
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
    severity: 'warning', ...reqMeta(req),
  })
  return NextResponse.json({ ok: true })
}
