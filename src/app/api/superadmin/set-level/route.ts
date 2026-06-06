// src/app/api/superadmin/set-level/route.ts
// Update tenant level via SERVICE_ROLE (bypass RLS)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type UserLevel = 'superadmin' | 'koni_jabar' | 'level1' | 'level2' | 'level3'
const VALID_LEVELS: UserLevel[] = ['superadmin', 'koni_jabar', 'level1', 'level2', 'level3']

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ ok: false, error: 'Server config error: SERVICE_ROLE_KEY missing' }, { status: 500 })
  }

  let body: { kontingen_id: number; level: UserLevel }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.kontingen_id) {
    return NextResponse.json({ ok: false, error: 'kontingen_id wajib diisi' }, { status: 400 })
  }
  if (!body.level || !VALID_LEVELS.includes(body.level)) {
    return NextResponse.json({ ok: false, error: `Level invalid: ${body.level}` }, { status: 400 })
  }

  const { error } = await sbAdmin
    .from('tenants')
    .update({ level: body.level })
    .eq('kontingen_id', body.kontingen_id)

  if (error) {
    console.error('[API /set-level] error:', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
