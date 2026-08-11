// src/lib/user-credential.ts
// Akses hash password user (admin/operator) dari tabel terisolasi `users_auth`
// (tak terbaca anon). Menggantikan kolom lama users.password_hash yang anon-readable.
// WAJIB dipanggil dgn klien SERVICE KEY (users_auth deny-all utk anon/authenticated).

import type { SupabaseClient } from '@supabase/supabase-js'

// Ambil hash. Fallback ke kolom lama selama transisi (sebelum kolom lama dikosongkan).
export async function getUserHash(sb: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await sb
    .from('users_auth')
    .select('password_hash')
    .eq('user_id', userId)
    .maybeSingle()
  if (data?.password_hash) return data.password_hash

  const { data: legacy } = await sb
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .maybeSingle()
  return legacy?.password_hash ?? null
}

// Simpan/replace hash HANYA ke users_auth (tidak lagi menulis kolom lama).
export async function setUserHash(sb: SupabaseClient, userId: string, hash: string): Promise<void> {
  await sb
    .from('users_auth')
    .upsert(
      { user_id: userId, password_hash: hash, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
}
