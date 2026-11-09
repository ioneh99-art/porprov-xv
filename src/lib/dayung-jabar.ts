// src/lib/dayung-jabar.ts
// Membaca data Dayung se-Jawa Barat dari situs resmi panitia PORPROV XV
// (porprov.konijabar.or.id): daftar atlet, halaman atlet, dan halaman laga
// (peserta per heat/final, peringkat, waktu, medali).
// Murni hitungan (tanpa database/jaringan) supaya bisa diuji: npm run uji:dayung-jabar.
//
// Hanya halaman publik biasa: /atlet?cabor=9, /atlet/<slug>, /jadwal?tgl=…&cabor=9, /laga/<ref>.
// Jalur yang dilarang robots.txt (/api/, /peserta/, /layar, /cek, /games/) tidak disentuh.
// Foto atlet TIDAK diambil.

import { bacaLaga, baku, rata, teks } from './konijabar'

/** Nomor cabor Dayung di situs panitia (/atlet?cabor=9). */
export const CABOR_DAYUNG_SITUS = 9
export const SITUS = 'https://porprov.konijabar.or.id'
/** Rentang tanggal laga Dayung PORPROV XV (situs: 6–18 November). */
export const TANGGAL_DAYUNG = { mulai: '2026-11-06', selesai: '2026-11-19' }

export type Gender = 'L' | 'P' | 'MIX'
export type Medali = 'emas' | 'perak' | 'perunggu'

/* ---------- Bantuan ---------- */

/** "indra-hidayat-4285" → 4285 */
export const idDariSlug = (slug: string) => Number(slug.match(/-(\d+)$/)?.[1]) || null

export function genderDari(s: string | null | undefined): Gender | null {
  const t = baku(s)
  if (/\b(campuran|mix|mixed)\b/.test(t)) return 'MIX'
  if (/\b(putri|wanita|women|w)\b/.test(t)) return 'P'
  if (/\b(putra|pria|men|m)\b/.test(t)) return 'L'
  return null
}

/** "1:29.96" → 89.96 · "45.12" → 45.12 · "1:02:03.4" → 3723.4 · selain itu null. */
export function detikDari(waktu: string | null | undefined): number | null {
  const t = (waktu ?? '').trim().replace(',', '.')
  if (!/^\d{1,2}(:\d{1,2}){0,2}(\.\d+)?$/.test(t)) return null
  const bagian = t.split(':').map(Number)
  const detik = bagian.reduce((a, b) => a * 60 + b, 0)
  return Number.isFinite(detik) && detik > 0 ? Math.round(detik * 1000) / 1000 : null
}

/** 89.96 → "1:29.96" (format catatan waktu dayung). */
export function waktuTeks(detik: number | null | undefined): string {
  if (detik == null || !Number.isFinite(detik) || detik <= 0) return '—'
  const m = Math.floor(detik / 60)
  const s = detik - m * 60
  const ss = s.toFixed(2).padStart(5, '0')
  return m > 0 ? `${m}:${ss}` : s.toFixed(2)
}

/* ---------- Daftar atlet (/atlet?cabor=9&hal=N) ---------- */

export interface AtletDaftar {
  situsId: number; slug: string; nama: string
  kontingen: string; kontingenSitusId: number | null; gender: Gender | null
}

export function bacaDaftarAtlet(html: string): { atlet: AtletDaftar[]; total: number | null; halTotal: number | null } {
  const h = rata(html)
  const atlet: AtletDaftar[] = []
  const re = /<a class="person" href="\/atlet\/([a-z0-9-]+)">(.*?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(h))) {
    const slug = m[1], isi = m[2]
    const situsId = idDariSlug(slug)
    const nama = isi.match(/<span class="person-name">(.*?)<\/span>/)?.[1]
    const meta = Array.from(isi.matchAll(/<span class="person-meta">(.*?)<\/span>(?=\s*(?:<span class="person-meta">|<\/span>))/g)).map(x => x[1])
    if (!situsId || !nama || meta.length === 0) continue
    const cid = Number(meta[0].match(/data-cid="(\d+)"/)?.[1]) || null
    const olahraga = meta[1] ?? ''
    atlet.push({
      situsId, slug, nama: teks(nama), kontingen: teks(meta[0]), kontingenSitusId: cid,
      gender: genderDari(teks(olahraga.split('<span class="sep"></span>')[1] ?? '')),
    })
  }
  const judul = h.match(/([\d.]+) atlet, Dayung\s*<span class="count">hal\. (\d+)\/(\d+)<\/span>/)
  return {
    atlet,
    total: judul ? Number(judul[1].replace(/\./g, '')) : null,
    halTotal: judul ? Number(judul[3]) : null,
  }
}

/* ---------- Halaman satu atlet (/atlet/<slug>) ---------- */

export interface AtletRinci {
  nama: string; kontingen: string; disiplin: string | null; gender: Gender | null
  emas: number; perak: number; perunggu: number
  /** Semua laga yang tercantum di halaman atlet (medali + pertandingan). */
  lagaRefs: number[]
}

export function bacaAtlet(html: string): AtletRinci | null {
  const h = rata(html)
  const nama = h.match(/<h1 class="page-title">(.*?)<\/h1>/)?.[1]
  const fakta = h.match(/<p class="hero-facts">(.*?)<\/p>/)?.[1]
  if (!nama || !fakta) return null
  const kontingen = fakta.match(/href="\/kontingen\/[^"]*">(.*?)<\/a>/)?.[1]
  const span = Array.from(fakta.matchAll(/<span>(.*?)<\/span>/g)).map(x => teks(x[1]))
  // Urutan hero: kontingen · cabor · [disiplin] · gender
  const gender = genderDari(span[span.length - 1])
  const disiplin = span.length >= 2 ? span[0] : (gender ? null : span[0] ?? null)
  const hitung = (j: string) => Number(h.match(new RegExp(`<div class="mc mc-${j}">\\s*<dt>.*?</dt>\\s*<dd[^>]*>(\\d+)</dd>`))?.[1] ?? 0)
  // Laga hanya dari isi halaman (sebelum "Rekan satu kontingen"), bukan menu/kaki.
  const ujung = h.indexOf('Rekan satu kontingen')
  const isi = ujung > 0 ? h.slice(0, ujung) : h
  const lagaRefs = Array.from(new Set(Array.from(isi.matchAll(/href="\/laga\/(\d+)"/g)).map(x => Number(x[1]))))
  return {
    nama: teks(nama), kontingen: kontingen ? teks(kontingen) : '', disiplin, gender,
    emas: hitung('emas'), perak: hitung('perak'), perunggu: hitung('perunggu'), lagaRefs,
  }
}

/* ---------- Jadwal harian Dayung (/jadwal?tgl=…&cabor=9) ---------- */

export function bacaRefJadwal(html: string): number[] {
  const h = rata(html)
  return Array.from(new Set(Array.from(h.matchAll(/<a class="mrow[^"]*" href="\/laga\/(\d+)"/g)).map(x => Number(x[1]))))
}

/* ---------- Halaman satu laga (/laga/<ref>) ---------- */

export interface PesertaLaga {
  urutan: number; kontingen: string; kontingenSitusId: number | null
  peringkat: number | null; medali: Medali | null; waktu: string | null; waktuDetik: number | null
  /** Atlet yang tertulis (situs hanya menampilkan sampai 3 nama + "+N"). */
  atlet: { slug: string; situsId: number | null; nama: string }[]
  atletLebih: number
}

export interface LagaDayung {
  ref: number; tanggal: string | null; jam: string | null; disiplin: string | null; nomor: string
  gender: Gender | null; babak: string | null; kode: string | null; venue: string | null
  status: string; selesai: boolean; perebutanMedali: boolean
  peserta: PesertaLaga[]
}

export function bacaLagaDayung(html: string, ref: number): LagaDayung | null {
  const dasar = bacaLaga(html, String(ref))
  if (!dasar || baku(dasar.cabor) !== 'dayung') return null
  const h = rata(html)
  const daftar = h.match(/<ol class="md-field">(.*?)<\/ol>/)?.[1] ?? ''
  const peserta: PesertaLaga[] = []
  const reLi = /<li class="fld([^"]*)">(.*?)<\/li>/g
  let m: RegExpExecArray | null
  let urutan = 0
  while ((m = reLi.exec(daftar))) {
    urutan++
    const kelas = m[1], isi = m[2]
    const tim = isi.match(/<a class="fld-team"[^>]*>(.*?)<\/a>/)?.[1]
    if (!tim) continue
    const rank = Number(teks(isi.match(/<span class="fld-rank">(.*?)<\/span>/)?.[1] ?? '')) || null
    const medali = (kelas.match(/fld-(emas|perak|perunggu)/)?.[1] ?? null) as Medali | null
    const waktuMentah = teks(isi.match(/<span class="fld-score">(.*?)<\/span>/)?.[1] ?? '') || null
    const atlet = Array.from(isi.matchAll(/<a class="ath" href="\/atlet\/([a-z0-9-]+)">(.*?)<\/a>/g))
      .map(x => ({ slug: x[1], situsId: idDariSlug(x[1]), nama: teks(x[2]) }))
    peserta.push({
      urutan, kontingen: teks(tim), kontingenSitusId: Number(isi.match(/data-cid="(\d+)"/)?.[1]) || null,
      peringkat: rank, medali, waktu: waktuMentah, waktuDetik: detikDari(waktuMentah),
      atlet, atletLebih: Number(isi.match(/<span class="ath-more">\+(\d+)<\/span>/)?.[1] ?? 0),
    })
  }
  return {
    ref, tanggal: dasar.tanggal, jam: dasar.jam, disiplin: dasar.disiplin, nomor: dasar.nomor,
    gender: genderDari(dasar.nomor), babak: dasar.babak, kode: dasar.kode, venue: dasar.venue,
    status: dasar.status, selesai: dasar.selesai, perebutanMedali: h.includes('class="md-medal-flag"'),
    peserta,
  }
}

/* ---------- Kontingen situs → kontingen kita ---------- */

/** "Kab. Bandung" ↔ "KAB. BANDUNG": cocok kalau nama baku sama persis. */
export function cocokKontingen(namaSitus: string, kontingen: { id: number; nama: string }[]): number | null {
  const b = baku(namaSitus)
  return kontingen.find(k => baku(k.nama) === b)?.id ?? null
}

/* ---------- Klasemen medali Dayung per kontingen ---------- */

export interface BarisKlasemen { kontingen: string; emas: number; perak: number; perunggu: number; total: number }

/** Satu medali per kontingen per laga perebutan medali (bukan per atlet di perahu). */
export function klasemenDayung(laga: { selesai: boolean; peserta: { kontingen: string; medali: Medali | null }[] }[]): BarisKlasemen[] {
  const peta = new Map<string, BarisKlasemen>()
  for (const l of laga) for (const p of l.peserta) {
    if (!p.medali) continue
    const r = peta.get(p.kontingen) ?? { kontingen: p.kontingen, emas: 0, perak: 0, perunggu: 0, total: 0 }
    r[p.medali]++; r.total++
    peta.set(p.kontingen, r)
  }
  return Array.from(peta.values()).sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu || a.kontingen.localeCompare(b.kontingen))
}

/* ---------- Mode demo: urutkan waktu yang diketik operator ---------- */

export type StatusDemo = 'ok' | 'DNS' | 'DNF' | 'DSQ'
export interface IsianDemo { urutan: number; waktuDetik: number | null; status: StatusDemo }
export interface HasilDemo { urutan: number; peringkat: number | null; medali: Medali | null; selisih: number | null }

/**
 * Peringkat dari catatan waktu: tercepat = 1, waktu sama = peringkat sama
 * (berikutnya dilompati, mis. 1,1,3). DNS/DNF/DSQ/kosong tanpa peringkat.
 * Medali hanya di laga perebutan medali, untuk peringkat 1–3.
 */
export function urutkanDemo(isian: IsianDemo[], perebutanMedali: boolean): HasilDemo[] {
  const sah = isian.filter(x => x.status === 'ok' && x.waktuDetik != null && x.waktuDetik > 0)
    .sort((a, b) => a.waktuDetik! - b.waktuDetik!)
  const terbaik = sah[0]?.waktuDetik ?? null
  const peta = new Map<number, HasilDemo>()
  sah.forEach((x, i) => {
    const sebelum = i > 0 ? sah[i - 1] : null
    const peringkat = sebelum && sebelum.waktuDetik === x.waktuDetik ? peta.get(sebelum.urutan)!.peringkat! : i + 1
    const medali: Medali | null = perebutanMedali ? (peringkat === 1 ? 'emas' : peringkat === 2 ? 'perak' : peringkat === 3 ? 'perunggu' : null) : null
    peta.set(x.urutan, { urutan: x.urutan, peringkat, medali, selisih: terbaik != null ? Math.round((x.waktuDetik! - terbaik) * 1000) / 1000 : null })
  })
  return isian.map(x => peta.get(x.urutan) ?? { urutan: x.urutan, peringkat: null, medali: null, selisih: null })
}
