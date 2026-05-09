import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function loginUser(username: string, password: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.trim())
    .eq('is_active', true)
    .single()

  if (error || !user) return null

  // Cek apakah password sudah di-hash atau masih plain text
  const isHashed = user.password_hash?.startsWith('$2')
  const valid = isHashed
    ? await bcrypt.compare(password, user.password_hash)
    : password === user.password_hash  // fallback plain text sementara

  if (!valid) return null
  return user
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}