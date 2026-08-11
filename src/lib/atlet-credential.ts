// src/lib/atlet-credential.ts
// Akses hash password atlet dari tabel terisolasi `atlet_auth` (tak terbaca anon).
// Menggantikan kolom lama atlet.atlet_password_hash yang sebelumnya anon-readable.
// Wajib dipanggil dgn klien SERVICE KEY (atlet_auth deny-all utk anon/authenticated).

import type { SupabaseClient } from '@supabase/supabase-js'

// Ambil hash. Fallback ke kolom lama selama masa transisi (sebelum kolom lama
// dikosongkan pasca-deploy) supaya atlet yg hash-nya belum ter-backfill tetap bisa login.
export async function getAtletHash(sb: SupabaseClient, atletId: number): Promise<string | null> {
  const { data } = await sb
    .from('atlet_auth')
    .select('password_hash')
    .eq('atlet_id', atletId)
    .maybeSingle()
  if (data?.password_hash) return data.password_hash

  const { data: legacy } = await sb
    .from('atlet')
    .select('atlet_password_hash')
    .eq('id', atletId)
    .maybeSingle()
  return legacy?.atlet_password_hash ?? null
}

// Simpan/replace hash HANYA ke atlet_auth (tidak lagi menulis kolom lama).
export async function setAtletHash(sb: SupabaseClient, atletId: number, hash: string): Promise<void> {
  await sb
    .from('atlet_auth')
    .upsert(
      { atlet_id: atletId, password_hash: hash, updated_at: new Date().toISOString() },
      { onConflict: 'atlet_id' },
    )
}
