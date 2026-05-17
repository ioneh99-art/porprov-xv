// lib/auth.ts
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ─── Login ────────────────────────────────────────────────
export async function loginUser(username: string, password: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.trim().toLowerCase())
    .eq('is_active', true)
    .single()

  if (error || !user) return null

  const isHashed = user.password_hash?.startsWith('$2')

  if (isHashed) {
    // Normal — cek bcrypt
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return null
  } else {
    // Plain text sementara — cek lalu auto-migrate ke bcrypt
    if (password !== user.password_hash) return null

    // Auto-upgrade: hash sekarang juga agar next login sudah bcrypt
    const hashed = await bcrypt.hash(password, 12)
    await supabase
      .from('users')
      .update({ password_hash: hashed })
      .eq('id', user.id)
  }

  return user
}

// ─── Hash password ────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// ─── Create user baru (dipanggil dari superadmin panel) ───
export async function createUser(data: {
  username: string
  nama: string
  email?: string
  password: string
  role: string
  level: string
  kontingen_id?: number
  cabor_id?: number
  is_active?: boolean
}) {
  const password_hash = await bcrypt.hash(data.password, 12)

  const { data: inserted, error } = await supabase
    .from('users')
    .insert({
      username:     data.username.trim().toLowerCase(),
      nama:         data.nama,
      email:        data.email ?? null,
      password_hash,
      role:         data.role,
      level:        data.level,
      kontingen_id: data.kontingen_id ?? null,
      cabor_id:     data.cabor_id ?? null,
      is_active:    data.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return inserted
}

// ─── Update password (dipanggil dari superadmin panel) ────
export async function updatePassword(userId: string, newPassword: string) {
  const password_hash = await bcrypt.hash(newPassword, 12)

  const { error } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}

// ─── Get user by ID ───────────────────────────────────────
export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

// ─── Cek apakah semua password sudah di-hash ─────────────
// Jalankan sekali dari /superadmin/system untuk audit
export async function auditPasswordHashes(): Promise<{
  total: number
  hashed: number
  plaintext: number
}> {
  const { data } = await supabase
    .from('users')
    .select('id, password_hash')

  const total     = data?.length ?? 0
  const hashed    = data?.filter(u => u.password_hash?.startsWith('$2')).length ?? 0
  const plaintext = total - hashed

  return { total, hashed, plaintext }
}