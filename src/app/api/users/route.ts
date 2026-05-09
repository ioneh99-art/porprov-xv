import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET() {
  const { data, error } = await sb()
    .from('users')
    .select('id, username, nama, role, is_active, kontingen_id, cabor_id, kontingen(nama), cabang_olahraga(nama)')
    .order('role')
    .order('nama')

  console.log('users data:', JSON.stringify(data)?.slice(0, 200))
  console.log('users error:', error)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, nama, password, role, kontingen_id, cabor_id } = body

  if (!username || !nama || !password || !role) {
    return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
  }

  const { data: existing } = await sb()
    .from('users')
    .select('id')
    .eq('username', username.trim().toLowerCase())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 12)

  const { data, error } = await sb()
    .from('users')
    .insert({
      username: username.trim().toLowerCase(),
      nama: nama.trim(),
      password_hash,
      role,
      kontingen_id: kontingen_id || null,
      cabor_id: cabor_id || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, nama, password, is_active, kontingen_id, cabor_id } = body

  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

  const updates: any = {}
  if (nama !== undefined) updates.nama = nama.trim()
  if (is_active !== undefined) updates.is_active = is_active
  if (kontingen_id !== undefined) updates.kontingen_id = kontingen_id
  if (cabor_id !== undefined) updates.cabor_id = cabor_id
  if (password) updates.password_hash = await bcrypt.hash(password, 12)

  const { error } = await sb()
    .from('users')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

  const { error } = await sb()
    .from('users')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}