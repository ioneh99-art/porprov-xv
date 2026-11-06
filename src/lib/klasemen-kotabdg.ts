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

export interface RekapSumber {
  baris: { nama: string; emas: number; perak: number; perunggu: number }[]
  sumber: string; waktu: string | null; langsung: boolean
  /** Angka Kab. Bandung menurut sumber (sebelum diganti data kita). */
  kab_bandung_sumber: { emas: number; perak: number; perunggu: number } | null
}

/**
 * Bahan rekap sementara (War Room & halaman publik): situs KONI Kota Bandung langsung;
 * bila tidak terbaca, potret terakhir tabel klasemen_sementara. Tidak ada keduanya → null.
 * `db` = klien Supabase server (kunci layanan).
 */
export async function ambilRekapSumber(db: any, kontingenKita: (nama: string) => boolean): Promise<RekapSumber | null> {
  const situs = await ambilKlasemenKotaBdg()
  if (situs) {
    const kb = situs.find(b => kontingenKita(b.nama))
    return {
      baris: situs.map(b => ({ nama: b.nama, emas: b.emas, perak: b.perak, perunggu: b.perunggu })),
      sumber: 'situs KONI Kota Bandung (koni-kotabandung.or.id/klasemen)', waktu: new Date().toISOString(), langsung: true,
      kab_bandung_sumber: kb ? { emas: kb.emas, perak: kb.perak, perunggu: kb.perunggu } : null,
    }
  }
  const { data: akhir, error } = await db.from('klasemen_sementara').select('potret,potret_at,sumber').order('potret_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  if (!akhir) return null
  const { data: baris, error: e2 } = await db.from('klasemen_sementara').select('kontingen,emas,perak,perunggu').eq('potret', akhir.potret)
  if (e2) throw new Error(e2.message)
  return {
    baris: (baris ?? []).map((r: any) => ({ nama: r.kontingen, emas: r.emas, perak: r.perak, perunggu: r.perunggu })),
    sumber: `${akhir.sumber} (situs KONI Kota Bandung sedang tidak terbaca)`, waktu: akhir.potret_at, langsung: false, kab_bandung_sumber: null,
  }
}
