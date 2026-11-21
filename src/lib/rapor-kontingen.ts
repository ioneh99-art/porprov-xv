// src/lib/rapor-kontingen.ts — Rapor Kontingen & Peta Kekuatan PORPROV XV (hitungan murni).
// Bahan: gudang porprov15_* (arsip situs panitia, diperiksa silang dengan klasemen resmi).
// Satu podium = satu medali (beregu dihitung satu, sama seperti klasemen resmi).

export type JenisMedali = 'emas' | 'perak' | 'perunggu'

export interface BahanKontingen {
  situsId: number; nama: string; slug: string; peringkat: number | null
  emas: number; perak: number; perunggu: number
  jumlahAtlet: number | null; jumlahLaga: number | null; jumlahMenang: number | null
  kontingenId: number | null
}
export interface BahanCabor { situsId: number; nama: string; jumlahNomor: number | null }
export interface BahanNomor { situsId: number; caborSitusId: number | null }
export interface BahanMedali { nomorSitusId: number; medali: JenisMedali; kontingenSitusId: number | null }
export interface BahanAtletKC { kontingenSitusId: number; caborSitusId: number; jumlah: number }

export interface Hitung { emas: number; perak: number; perunggu: number }
export interface SelPeta extends Hitung { atlet: number }

export interface CaborUtama { situsId: number; nama: string; emas: number; porsi: number }

export interface RaporKontingen {
  situsId: number; nama: string; slug: string; kontingenId: number | null
  peringkat: number | null
  emas: number; perak: number; perunggu: number; total: number
  atlet: number; laga: number; menang: number
  /** menang / laga (0–1), null bila belum ada laga */
  tingkatMenang: number | null
  medaliPer100Atlet: number | null
  emasPer100Atlet: number | null
  caborDiikuti: number; caborBermedali: number; caborBeremas: number
  caborUtama: CaborUtama | null
  /** Lebih dari separuh emas berasal dari satu cabor (minimal AMBANG_EMAS_TERGANTUNG emas). */
  tergantung: boolean
}

export type Persaingan = 'Dikuasai' | 'Bersaing' | 'Merata' | 'Belum ada emas'

export interface RingkasCabor {
  situsId: number; nama: string; nomor: number
  emas: number; medali: number; atlet: number
  penguasa: { situsId: number; nama: string; emas: number; perak: number; perunggu: number; porsiEmas: number } | null
  kontingenBeremas: number; kontingenBermedali: number; kontingenIkut: number
  persaingan: Persaingan
}

export interface Rapor {
  ringkas: { kontingen: number; cabor: number; nomor: number; medali: number; atlet: number; laga: number }
  kontingen: RaporKontingen[]
  cabor: RingkasCabor[]
  /** sel[kontingenSitusId][caborSitusId] */
  peta: Record<number, Record<number, SelPeta>>
  /** Podium per kontingen vs angka resmi klasemen — harus kosong. */
  selisihKlasemen: { nama: string; resmi: Hitung; podium: Hitung }[]
}

/** Batas porsi emas cabor teratas untuk disebut "tergantung pada satu cabor". */
export const PORSI_TERGANTUNG = 0.5
/** Kontingen dengan emas sangat sedikit tidak dinilai ketergantungannya (1 dari 1 = 100% tak bermakna). */
export const AMBANG_EMAS_TERGANTUNG = 3
/** Porsi emas penguasa: ≥ 50% Dikuasai, 30–50% Bersaing, < 30% Merata. */
export const BATAS_DIKUASAI = 0.5
export const BATAS_BERSAING = 0.3

const kosong = (): SelPeta => ({ emas: 0, perak: 0, perunggu: 0, atlet: 0 })
const per100 = (x: number, n: number) => (n > 0 ? Math.round((x / n) * 1000) / 10 : null)

/** Urutan klasemen: emas, perak, perunggu (terbanyak dulu). */
export function bandingMedali(a: Hitung, b: Hitung): number {
  return b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu
}

export function labelPersaingan(porsiEmasPenguasa: number | null): Persaingan {
  if (porsiEmasPenguasa == null) return 'Belum ada emas'
  if (porsiEmasPenguasa >= BATAS_DIKUASAI) return 'Dikuasai'
  if (porsiEmasPenguasa >= BATAS_BERSAING) return 'Bersaing'
  return 'Merata'
}

export function hitungRapor(b: {
  kontingen: BahanKontingen[]; cabor: BahanCabor[]; nomor: BahanNomor[]; medali: BahanMedali[]; atletKC: BahanAtletKC[]
  /** Jumlah laga seluruh PORPROV (bukan jumlah per kontingen, karena satu laga diikuti banyak kontingen). */
  jumlahLaga?: number
}): Rapor {
  const caborNomor = new Map(b.nomor.map(n => [n.situsId, n.caborSitusId]))
  const namaCabor = new Map(b.cabor.map(c => [c.situsId, c.nama]))
  const peta: Record<number, Record<number, SelPeta>> = {}
  const sel = (k: number, c: number) => ((peta[k] ??= {})[c] ??= kosong())

  const podium = new Map<number, Hitung>()
  for (const m of b.medali) {
    if (m.kontingenSitusId == null) continue
    const p = podium.get(m.kontingenSitusId) ?? { emas: 0, perak: 0, perunggu: 0 }
    p[m.medali]++
    podium.set(m.kontingenSitusId, p)
    const c = caborNomor.get(m.nomorSitusId)
    if (c != null) sel(m.kontingenSitusId, c)[m.medali]++
  }
  for (const a of b.atletKC) sel(a.kontingenSitusId, a.caborSitusId).atlet += a.jumlah

  const kontingen: RaporKontingen[] = b.kontingen.map(k => {
    const baris = Object.entries(peta[k.situsId] ?? {}).map(([c, s]) => ({ c: Number(c), s }))
    const atletPeta = baris.reduce((t, x) => t + x.s.atlet, 0)
    const atlet = k.jumlahAtlet ?? atletPeta
    const total = k.emas + k.perak + k.perunggu
    const emasPeta = baris.reduce((t, x) => t + x.s.emas, 0)
    const teratas = baris.filter(x => x.s.emas > 0).sort((x, y) => bandingMedali(x.s, y.s))[0]
    const caborUtama = teratas
      ? { situsId: teratas.c, nama: namaCabor.get(teratas.c) ?? '', emas: teratas.s.emas, porsi: emasPeta ? teratas.s.emas / emasPeta : 0 }
      : null
    const laga = k.jumlahLaga ?? 0, menang = k.jumlahMenang ?? 0
    return {
      situsId: k.situsId, nama: k.nama, slug: k.slug, kontingenId: k.kontingenId, peringkat: k.peringkat,
      emas: k.emas, perak: k.perak, perunggu: k.perunggu, total,
      atlet, laga, menang,
      tingkatMenang: laga > 0 ? menang / laga : null,
      medaliPer100Atlet: per100(total, atlet),
      emasPer100Atlet: per100(k.emas, atlet),
      caborDiikuti: baris.filter(x => x.s.atlet > 0).length,
      caborBermedali: baris.filter(x => x.s.emas + x.s.perak + x.s.perunggu > 0).length,
      caborBeremas: baris.filter(x => x.s.emas > 0).length,
      caborUtama,
      tergantung: !!caborUtama && emasPeta >= AMBANG_EMAS_TERGANTUNG && caborUtama.porsi > PORSI_TERGANTUNG,
    }
  }).sort((x, y) => (x.peringkat ?? 999) - (y.peringkat ?? 999) || bandingMedali(x, y))

  const namaKont = new Map(b.kontingen.map(k => [k.situsId, k.nama]))
  const cabor: RingkasCabor[] = b.cabor.map(c => {
    const per = Object.entries(peta).map(([k, s]) => ({ k: Number(k), s: s[c.situsId] })).filter(x => x.s)
    const emas = per.reduce((t, x) => t + x.s.emas, 0)
    const medali = per.reduce((t, x) => t + x.s.emas + x.s.perak + x.s.perunggu, 0)
    const atas = per.filter(x => x.s.emas + x.s.perak + x.s.perunggu > 0).sort((x, y) => bandingMedali(x.s, y.s))[0]
    const penguasa = atas && atas.s.emas > 0
      ? { situsId: atas.k, nama: namaKont.get(atas.k) ?? '', emas: atas.s.emas, perak: atas.s.perak, perunggu: atas.s.perunggu, porsiEmas: emas ? atas.s.emas / emas : 0 }
      : null
    return {
      situsId: c.situsId, nama: c.nama, nomor: c.jumlahNomor ?? 0, emas, medali,
      atlet: per.reduce((t, x) => t + x.s.atlet, 0),
      penguasa,
      kontingenBeremas: per.filter(x => x.s.emas > 0).length,
      kontingenBermedali: per.filter(x => x.s.emas + x.s.perak + x.s.perunggu > 0).length,
      kontingenIkut: per.filter(x => x.s.atlet > 0).length,
      persaingan: labelPersaingan(penguasa?.porsiEmas ?? null),
    }
  }).sort((x, y) => y.emas - x.emas || y.medali - x.medali || x.nama.localeCompare(y.nama))

  const selisihKlasemen = b.kontingen
    .map(k => ({ nama: k.nama, resmi: { emas: k.emas, perak: k.perak, perunggu: k.perunggu }, podium: podium.get(k.situsId) ?? { emas: 0, perak: 0, perunggu: 0 } }))
    .filter(x => bandingMedali(x.resmi, x.podium) !== 0)

  return {
    ringkas: {
      kontingen: b.kontingen.length, cabor: b.cabor.length, nomor: b.nomor.length, medali: b.medali.length,
      atlet: kontingen.reduce((t, k) => t + k.atlet, 0),
      laga: b.jumlahLaga ?? 0,
    },
    kontingen, cabor, peta, selisihKlasemen,
  }
}
