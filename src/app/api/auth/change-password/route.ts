import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { getServerSession } from '@/lib/guard'
import { getUserHash, setUserHash } from '@/lib/user-credential'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  // Sesi terverifikasi HMAC (bukan JSON.parse cookie yg bisa dipalsukan).
  const user = await getServerSession()
  if (!user?.id) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan — coba login ulang' }, { status: 401 })
  }

  const body = await req.json()
  const { password_lama, password_baru } = body

  if (!password_lama || !password_baru)
    return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })

  if (password_baru.length < 8)
    return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 })

  const client = sb()

  // Ambil password hash saat ini dari tabel terisolasi users_auth
  const stored = await getUserHash(client, String(user.id))
  if (!stored)
    return NextResponse.json({ error: 'User tidak ditemukan di database' }, { status: 404 })

  // Verifikasi password lama
  const valid = await bcrypt.compare(password_lama, stored)
  if (!valid)
    return NextResponse.json({ error: 'Password lama tidak sesuai' }, { status: 400 })

  // Simpan password baru (hanya ke users_auth)
  await setUserHash(client, String(user.id), await bcrypt.hash(password_baru, 12))

  return NextResponse.json({ ok: true })
}