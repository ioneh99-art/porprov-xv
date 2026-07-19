// src/lib/session.ts
// Integritas sesi porprov_session via HMAC-SHA256 (cookie tanda tangan terpisah `porprov_sig`).
// Web Crypto → jalan di Edge (middleware) maupun Node (route/RSC). Fail-fast bila secret kosong.
// Format porprov_session TIDAK diubah (tetap JSON) — konsumen lama tetap kompatibel.

let keyPromise: Promise<CryptoKey> | null = null

function getKey(): Promise<CryptoKey> {
  if (keyPromise) return keyPromise
  const secret = process.env.PORPROV_SESSION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('PORPROV_SESSION_SECRET belum di-set (min 16 char).')
  }
  keyPromise = crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  )
  return keyPromise
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Tandatangani nilai cookie porprov_session → base64url HMAC. Dipakai saat login. */
export async function signValue(value: string): Promise<string> {
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return bytesToB64url(new Uint8Array(sig))
}

/**
 * Verifikasi porprov_session + porprov_sig. Return payload (parsed) bila valid, else null.
 * `crypto.subtle.verify` sudah constant-time. Semua error (secret kosong / sig salah) → null (aman).
 */
export async function verifySessionCookie(value?: string, sig?: string): Promise<any | null> {
  if (!value || !sig) return null
  try {
    const key = await getKey()
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig) as BufferSource, new TextEncoder().encode(value) as BufferSource)
    if (!ok) return null
    return JSON.parse(value)
  } catch {
    return null
  }
}
