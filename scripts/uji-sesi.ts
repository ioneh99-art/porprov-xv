// scripts/uji-sesi.ts — mengunci masa berlaku sesi admin (exp di dalam isi yang ditandatangani).
// Dijalankan: npm run uji:sesi
process.env.PORPROV_SESSION_SECRET = 'kunci-uji-saja-bukan-produksi-0123456789'

import { signValue, verifySessionCookie, sesiMasihBerlaku, UMUR_SESI_DETIK } from '../src/lib/session'

let lulus = 0, gagal = 0
const cek = (nama: string, ok: boolean) => {
  if (ok) lulus++
  else { gagal++; console.log(`  GAGAL  ${nama}`) }
}

const DASAR = { id: 1, username: 'uji', nama: 'Uji', role: 'konida', kontingen_id: 4, cabor_id: null, cabor_nama: null, level: 'level1', plan_id: null }
const buat = async (isi: object) => { const v = JSON.stringify(isi); return [v, await signValue(v)] as const }

async function main() {
  const kini = Date.now()

  // ── Sesi sah & belum lewat → diterima, isi utuh ──
  const [v1, s1] = await buat({ ...DASAR, exp: kini + UMUR_SESI_DETIK * 1000 })
  const p1 = await verifySessionCookie(v1, s1)
  cek('sesi segar diterima', !!p1 && p1.id === 1 && p1.level === 'level1' && p1.kontingen_id === 4)

  // ── exp sudah lewat → ditolak walau tanda tangan sah ──
  const [v2, s2] = await buat({ ...DASAR, exp: kini - 1000 })
  cek('sesi kedaluwarsa ditolak', (await verifySessionCookie(v2, s2)) === null)

  // ── Sesi lama tanpa exp → ditolak ──
  const [v3, s3] = await buat(DASAR)
  cek('sesi lama tanpa exp ditolak', (await verifySessionCookie(v3, s3)) === null)

  // ── exp bukan angka → ditolak ──
  for (const exp of ['9999999999999', null, Infinity, NaN, true]) {
    const [v, s] = await buat({ ...DASAR, exp })
    cek(`exp=${String(exp)} (${typeof exp}) ditolak`, (await verifySessionCookie(v, s)) === null)
  }

  // ── exp diubah tanpa tanda tangan ulang → ditolak ──
  const v4 = v2.replace(String(kini - 1000), String(kini + 9_999_999))
  cek('exp dipalsukan ditolak', v4 !== v2 && (await verifySessionCookie(v4, s2)) === null)

  // ── Tanda tangan salah / kosong → tetap ditolak ──
  cek('sig salah ditolak', (await verifySessionCookie(v1, s3)) === null)
  cek('tanpa sig ditolak', (await verifySessionCookie(v1, undefined)) === null)
  cek('tanpa isi ditolak', (await verifySessionCookie(undefined, s1)) === null)

  // ── Isi bertanda tangan sah tapi bukan objek sesi → ditolak ──
  for (const mentah of ['null', '123', '"teks"', '[]']) {
    cek(`isi ${mentah} ditolak`, (await verifySessionCookie(mentah, await signValue(mentah))) === null)
  }

  // ── Batas waktu persis ──
  cek('tepat di exp = sudah habis', sesiMasihBerlaku({ exp: 1000 }, 1000) === false)
  cek('1 ms sebelum exp = masih berlaku', sesiMasihBerlaku({ exp: 1000 }, 999) === true)
  cek('umur sesi 8 jam', UMUR_SESI_DETIK === 28800)

  console.log(`uji-sesi: ${lulus} lulus, ${gagal} gagal`)
  if (gagal) process.exit(1)
}
main()
