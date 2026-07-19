// src/lib/atlet-password.ts
// Hash + verifikasi password atlet (bcrypt). Auto-migrate: legacy plaintext dicek lalu di-hash
// saat login berhasil, jadi atlet lama tak terganggu & data plaintext berpindah ke bcrypt bertahap.

import bcrypt from 'bcryptjs'

export async function hashAtletPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12)
}

/**
 * Return true bila `plain` cocok dengan `stored`.
 * - stored bcrypt ($2...) → bcrypt.compare
 * - stored plaintext (legacy) → bandingkan; bila cocok & ada onMigrate → simpan hash-nya.
 */
export async function verifyAtletPassword(
  stored: string | null | undefined,
  plain: string,
  onMigrate?: (newHash: string) => Promise<void>,
): Promise<boolean> {
  if (!stored) return false
  if (stored.startsWith('$2')) return bcrypt.compare(plain, stored)
  if (stored !== plain) return false
  if (onMigrate) { try { await onMigrate(await bcrypt.hash(plain, 12)) } catch { /* biar login tetap lolos */ } }
  return true
}
