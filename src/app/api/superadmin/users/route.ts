// src/app/api/superadmin/users/route.ts
// CRUD users — superadmin only

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function requireSuperadmin(req: NextRequest): boolean {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return false
  try {
    const s = JSON.parse(session)
    return s.role === 'superadmin'
  } catch { return false }
}

// GET — list all users
export async function GET(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await sb
    .from('users')
    .select('id, username, nama, email, role, level, kontingen_id, cabor_id, is_active, created_at, kontingen(nama)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create user
export async function POST(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { username, password, nama, email, role, level, kontingen_id, cabor_id, is_active } = body

  if (!username || !password || !nama || !role)
    return NextResponse.json({ error: 'Username, password, nama, role wajib diisi' }, { status: 400 })

  // Cek username sudah ada
  const { data: existing } = await sb
    .from('users').select('id').eq('username', username).single()
  if (existing)
    return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 })

  const password_hash = await bcrypt.hash(password, 12)

  const { data, error } = await sb.from('users').insert({
    username, password_hash, nama,
    email:        email || null,
    role, level:  level || null,
    kontingen_id: kontingen_id || null,
    cabor_id:     cabor_id || null,
    is_active:    is_active ?? true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, user: data })
}

// PUT — update user
export async function PUT(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, password, nama, email, role, level, kontingen_id, cabor_id, is_active } = body

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const update: any = {
    nama, email: email || null, role,
    level: level || null,
    kontingen_id: kontingen_id || null,
    cabor_id: cabor_id || null,
    is_active: is_active ?? true,
  }

  if (password) {
    update.password_hash = await bcrypt.hash(password, 12)
  }

  const { error } = await sb.from('users').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH — toggle active
export async function PATCH(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await sb.from('users').update({ is_active }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — hapus user
export async function DELETE(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await sb.from('users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}