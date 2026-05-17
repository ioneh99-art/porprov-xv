// src/app/api/superadmin/users/route.ts
// Server-side handler untuk create & update user dari superadmin panel
// Menggunakan lib/auth.ts agar bcrypt hash terjadi di server

import { NextRequest, NextResponse } from 'next/server'
import { createUser, updatePassword } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ─── POST: Buat user baru ─────────────────────────────────
export async function POST(req: NextRequest) {
  // Guard: hanya superadmin
  const session = req.cookies.get('porprov_session')?.value
  const level   = req.cookies.get('user_level')?.value
  if (!session || level !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { username, nama, email, password, role, level: userLevel, kontingen_id, cabor_id } = body

    if (!username || !nama || !password) {
      return NextResponse.json({ error: 'Username, nama, dan password wajib diisi' }, { status: 400 })
    }

    // Cek username sudah ada
    const { data: existing } = await sb
      .from('users').select('id').eq('username', username.trim().toLowerCase()).single()
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 })
    }

    const user = await createUser({
      username, nama, email, password,
      role: role ?? 'konida',
      level: userLevel ?? 'level3',
      kontingen_id: kontingen_id ? Number(kontingen_id) : undefined,
      cabor_id: cabor_id ? Number(cabor_id) : undefined,
    })

    return NextResponse.json({ ok: true, user })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── PATCH: Update user (termasuk password) ──────────────
export async function PATCH(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  const level   = req.cookies.get('user_level')?.value
  if (!session || level !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, password, ...rest } = body

    if (!id) return NextResponse.json({ error: 'ID user wajib diisi' }, { status: 400 })

    // Update data user (non-password fields)
    const updateData: Record<string, any> = {}
    if (rest.username)     updateData.username     = rest.username.trim().toLowerCase()
    if (rest.nama)         updateData.nama         = rest.nama
    if (rest.email)        updateData.email        = rest.email
    if (rest.role)         updateData.role         = rest.role
    if (rest.level)        updateData.level        = rest.level
    if (rest.kontingen_id !== undefined) updateData.kontingen_id = rest.kontingen_id ?? null
    if (rest.cabor_id !== undefined)     updateData.cabor_id     = rest.cabor_id ?? null
    if (rest.is_active !== undefined)    updateData.is_active    = rest.is_active

    if (Object.keys(updateData).length > 0) {
      const { error } = await sb.from('users').update(updateData).eq('id', id)
      if (error) throw new Error(error.message)
    }

    // Update password jika diisi
    if (password && password.length >= 6) {
      await updatePassword(id, password)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── DELETE: Hapus user ───────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  const level   = req.cookies.get('user_level')?.value
  if (!session || level !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })

    // Jangan hapus superadmin lain
    const { data: target } = await sb.from('users').select('role').eq('id', id).single()
    if (target?.role === 'superadmin') {
      return NextResponse.json({ error: 'Tidak bisa menghapus akun superadmin' }, { status: 403 })
    }

    const { error } = await sb.from('users').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}