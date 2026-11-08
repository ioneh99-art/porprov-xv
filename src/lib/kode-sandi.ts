// src/lib/kode-sandi.ts
// Menyimpan kode PIC dalam bentuk tersandi supaya admin bisa melihat & menyalinnya lagi.
//
// Kenapa: dulu kode hanya tampil sekali saat dibuat. Banyak tautan belum sempat dikirim ke cabor,
// lalu kodenya hilang. Kini kode disandikan AES-GCM; kuncinya diturunkan dari rahasia server
// (PORPROV_SESSION_SECRET) dan tidak pernah ada di database — bocornya isi tabel saja tidak
// membuka kode. Pencocokan kode saat PIC masuk tetap memakai kode_hash.

const LABEL_KUNCI = 'lapor-kode-sandi:v1'
let kunciPromise: Promise<CryptoKey> | null = null

function kunci(): Promise<CryptoKey> {
  if (kunciPromise) return kunciPromise
  const rahasia = process.env.PORPROV_SESSION_SECRET
  if (!rahasia || rahasia.length < 16) throw new Error('PORPROV_SESSION_SECRET belum di-set (min 16 char).')
  kunciPromise = (async () => {
    const hmac = await crypto.subtle.importKey('raw', new TextEncoder().encode(rahasia), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    // Kunci sandi terpisah dari kunci tanda tangan sesi (diturunkan dengan label sendiri).
    const bahan = await crypto.subtle.sign('HMAC', hmac, new TextEncoder().encode(LABEL_KUNCI))
    return crypto.subtle.importKey('raw', bahan, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  })()
  return kunciPromise
}

const keB64 = (b: Uint8Array) => Buffer.from(b).toString('base64url')
const dariB64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'))

/** Sandikan kode (bentuk tampil, mis. ABCD-EFGH) → "v1.<iv>.<isi>". */
export async function sandikanKode(kode: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const isi = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await kunci(), new TextEncoder().encode(kode))
  return `v1.${keB64(iv)}.${keB64(new Uint8Array(isi))}`
}

/** Buka sandi kode; null bila rusak / disandikan dengan kunci lain. */
export async function bukaSandiKode(sandi: string | null | undefined): Promise<string | null> {
  if (!sandi) return null
  const [v, iv, isi] = sandi.split('.')
  if (v !== 'v1' || !iv || !isi) return null
  try {
    const polos = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: dariB64(iv) }, await kunci(), dariB64(isi))
    return new TextDecoder().decode(polos)
  } catch {
    return null
  }
}
