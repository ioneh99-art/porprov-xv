// src/lib/klasemen-kotabdg.ts
// Rekap sementara perolehan medali semua kontingen dari situs KONI Kota Bandung
// (koni-kotabandung.or.id/klasemen) — dipakai War Room "Rekap sementara" untuk kontingen
// lain. Angka Kab. Bandung tetap data kita yang disahkan (lebih cepat diperbarui).
// Pembacanya murni supaya bisa diuji (npm run uji); pengambilnya hanya untuk server.

export const SITUS_KOTABDG = 'https://koni-kotabandung.or.id'

export interface BarisKotaBdg { kode: string; nama: string; emas: number; perak: number; perunggu: number }

const bersih = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
/** Salah ketik di sumber yang sudah diketahui. */
const BETULKAN: Record<string, string> = { 'kab. karawangan': 'Kab. Karawang' }

/**
 * Baca tabel klasemen: tiap <tr> berisi kode kontingen (span.klasemen-code), nama, lalu
 * emas/perak/perunggu. Baris "KBB" (singkatan, selalu 0) dibuang bila "Kab. Bandung Barat" ada.
 */
export function bacaKlasemenKotaBdg(html: string): BarisKotaBdg[] {
  const keluar: BarisKotaBdg[] = []
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const kode = tr.match(/klasemen-code[^>]*>\s*([^<]+?)\s*</i)?.[1]
    if (!kode) continue
    const sel = (tr.match(/<td[\s\S]*?<\/td>/gi) ?? []).map(bersih)
    // sel: [no, "kode nama", emas, perak, perunggu, total, "Lihat"]
    if (sel.length < 5) continue
    const nama0 = sel[1].replace(new RegExp(`^${kode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`), '').trim()
    const angka = sel.slice(2, 5).map(x => Number(x))
    if (!nama0 || angka.some(n => !Number.isInteger(n) || n < 0 || n > 999)) continue
    const nama = BETULKAN[nama0.toLowerCase()] ?? nama0
    keluar.push({ kode: kode.trim(), nama, emas: angka[0], perak: angka[1], perunggu: angka[2] })
  }
  const adaKbb = keluar.some(b => /^kab(upaten|\.)?\s*bandung barat$/i.test(b.nama))
  return keluar.filter(b => !(adaKbb && /^kbb$/i.test(b.nama) && b.emas + b.perak + b.perunggu === 0))
}

/** Gagal dibaca / isinya tidak masuk akal → null. Cache Next 5 menit supaya situs tidak dibanjiri. */
export async function ambilKlasemenKotaBdg(): Promise<BarisKotaBdg[] | null> {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 8000)
    const r = await fetch(`${SITUS_KOTABDG}/klasemen`, {
      headers: { 'user-agent': 'KONI-Kab-Bandung-Report/1.0 (+https://www.konikab-bdg.com)', accept: 'text/html' },
      signal: ac.signal, next: { revalidate: 300 },
    }).finally(() => clearTimeout(t))
    if (!r.ok) return null
    const baris = bacaKlasemenKotaBdg(await r.text())
    return baris.length >= 20 ? baris : null
  } catch { return null }
}
