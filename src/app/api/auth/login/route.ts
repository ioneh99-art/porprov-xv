import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, password } = body

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username dan password wajib diisi' },
      { status: 400 }
    )
  }

  const user = await loginUser(username, password)

  if (!user) {
    return NextResponse.json(
      { error: 'Username atau password salah' },
      { status: 401 }
    )
  }

  const redirect =
    user.role === 'admin' ? '/dashboard' :
    user.role === 'konida' ? '/konida/dashboard' :
    user.role === 'operator_cabor' ? '/operator/dashboard' :
    '/login'

  const sessionData = JSON.stringify({
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    kontingen_id: user.kontingen_id,
    cabor_id: user.cabor_id,
  })

  const res = NextResponse.json({ ok: true, redirect })
  res.cookies.set('porprov_session', sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return res
}