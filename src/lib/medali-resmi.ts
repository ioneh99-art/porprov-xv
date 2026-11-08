// src/lib/medali-resmi.ts
// Pembanding daftar medali resmi panitia (porprov.konijabar.or.id/kontingen/<slug>, bagian
// "Medali per cabor") dengan medali di data kita.
//
// Kenapa perlu: sinkron laga hanya membaca laga yang tertulis di jadwal. Medali yang laga
// penentunya tidak tercantum (mis. perunggu gulat lewat repechage) tidak pernah terbaca —
// 8 Nov 2026 perunggu Moch Fakri Azriel Ardiansyah (Gulat Bebas 57 kg) tertinggal karena ini.
// Medali resmi yang belum ada di data kita masuk Antrean (status menunggu) untuk KONIDA.
// Fungsi di sini murni (npm run uji:medali-resmi).

import { SITUS_KONIJABAR, baku, nomorSama } from './konijabar'

export type JenisMedali = 'emas' | 'perak' | 'perunggu'
export interface MedaliSitus {
  cabor: string; jenis: JenisMedali; nomor: string
  /** Laga penentu di situs (/laga/<ref>) bila ditautkan; sebagian medali tanpa tautan. */
  laga: string | null
  atlet: string[]
}

/** Halaman kontingen di situs panitia: "Kab. Bandung" → /kontingen/kab-bandung. */
export const urlKontingen = (nama: string) => `${SITUS_KONIJABAR}/kontingen/${baku(nama).replace(/ /g, '-')}`

const teks = (html: string) => html.replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, ' ').trim()

/** Baca bagian "Medali per cabor" di halaman kontingen. */
export function bacaMedaliKontingen(html: string): MedaliSitus[] {
  const h = html.replace(/\s+/g, ' ')
  const hasil: MedaliSitus[] = []
  for (const blok of h.split('<details class="sport-block').slice(1)) {
    const cabor = teks(blok.match(/<span class="sb-name">(.*?)<\/span>/)?.[1] ?? '')
    if (!cabor) continue
    for (const li of blok.split('<li>').slice(1)) {
      const jenis = li.match(/medal-dot-(emas|perak|perunggu)/)?.[1] as JenisMedali | undefined
      const ev = li.match(/<a class="ml-event"([^>]*)>(.*?)<\/a>/)
      if (!jenis || !ev) continue
      const ath = li.match(/<span class="ml-athletes">(.*?)<\/span>/)?.[1] ?? ''
      hasil.push({
        // Tanda video ("Ada video laga") ikut di dalam tautan nomor — dibuang.
        cabor, jenis, nomor: teks(ev[2].replace(/<span class="vmark".*$/, '')),
        laga: ev[1].match(/data-match="(\d+)"/)?.[1] ?? null,
        atlet: Array.from(ath.matchAll(/<a class="ath"[^>]*>(.*?)<\/a>/g)).map(x => teks(x[1])).filter(Boolean),
      })
    }
  }
  return hasil
}

/** Kunci laporan medali dari daftar resmi (ref_luar) — sekali dibuat/ditolak KONIDA, tidak dibuat lagi. */
export const refMedaliResmi = (m: MedaliSitus) =>
  `medali-${m.laga ?? baku(`${m.cabor} ${m.nomor}`).replace(/ /g, '-')}-${m.jenis}`.slice(0, 120)

export interface MedaliKita {
  id: number; cabor_id: number; hasil: string; status: string; nomor_teks: string
  ref_luar: string | null; atlet: string[]
}

/**
 * Medali resmi yang belum ada di data kita. Dianggap sudah ada bila ada laporan (belum ditolak)
 * di cabor yang sama dengan jenis medali sama, dan nomornya sama ATAU atletnya sama (nama nomor
 * di situs kadang beda tulisan). Medali yang laporannya pernah dibuat dari daftar ini tidak
 * dibuat lagi walau sudah ditolak KONIDA.
 */
export function medaliTerlewat(situs: MedaliSitus[], kita: MedaliKita[], caborId: (nama: string) => number | null): MedaliSitus[] {
  return situs.filter(m => {
    const ref = refMedaliResmi(m)
    if (kita.some(l => l.ref_luar === ref)) return false
    const cid = caborId(m.cabor)
    const nama = new Set(m.atlet.map(baku))
    return !kita.some(l => l.status !== 'ditolak' && l.hasil === m.jenis && (cid == null || l.cabor_id === cid)
      && (nomorSama(m.nomor, l.nomor_teks) || l.atlet.some(a => nama.has(baku(a)))))
  })
}

const LABEL: Record<JenisMedali, string> = { emas: 'Emas', perak: 'Perak', perunggu: 'Perunggu' }
/** Keterangan laporan yang dibuat dari daftar medali resmi. */
export const keteranganMedaliResmi = (m: MedaliSitus, url: string) =>
  (`${LABEL[m.jenis]} menurut daftar medali resmi Situs KONI Jabar (${m.cabor} · ${m.nomor}${m.atlet.length ? ` · ${m.atlet.join(', ')}` : ''}). `
  + `Laga penentunya belum terbaca otomatis (mis. repechage) — cek lalu sahkan · ${url}`).slice(0, 480)
