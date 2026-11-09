// src/lib/dayung-data-awal.ts
// Data awal & pengukuran berkala atlet Dayung (PODSI Jabar).
// Katalog ukuran, cara membaca isian, penggabungan dengan data yang sudah ada
// (Data Atlet & Tes Biomotorik), dan perkembangan dari titik nol.
// Murni hitungan supaya bisa diuji: npm run uji:dayung-data-awal.

export type KelompokUkur = 'Postur' | 'Ergometer' | 'Kekuatan'
export interface ItemUkur {
  kunci: string; label: string; singkat: string; satuan: string; kelompok: KelompokUkur
  waktu?: boolean           // diisi m:ss.d, disimpan detik
  kecilLebihBaik?: boolean  // waktu: makin kecil makin baik
  jarak?: number            // ergometer: meter
  min: number; max: number
}

export const ITEM_UKUR: ItemUkur[] = [
  { kunci: 'tinggi_badan', label: 'Tinggi badan', singkat: 'TB', satuan: 'cm', kelompok: 'Postur', min: 100, max: 230 },
  { kunci: 'berat_badan', label: 'Berat badan', singkat: 'BB', satuan: 'kg', kelompok: 'Postur', min: 25, max: 160 },
  { kunci: 'rentang_lengan', label: 'Rentang lengan', singkat: 'RL', satuan: 'cm', kelompok: 'Postur', min: 100, max: 250 },
  { kunci: 'tinggi_duduk', label: 'Tinggi duduk', singkat: 'TD', satuan: 'cm', kelompok: 'Postur', min: 50, max: 130 },
  { kunci: 'ergo_2000', label: 'Ergometer 2000 m', singkat: 'Ergo 2K', satuan: 'detik', kelompok: 'Ergometer', waktu: true, kecilLebihBaik: true, jarak: 2000, min: 300, max: 900 },
  { kunci: 'ergo_1000', label: 'Ergometer 1000 m', singkat: 'Ergo 1K', satuan: 'detik', kelompok: 'Ergometer', waktu: true, kecilLebihBaik: true, jarak: 1000, min: 150, max: 480 },
  { kunci: 'ergo_500', label: 'Ergometer 500 m', singkat: 'Ergo 500', satuan: 'detik', kelompok: 'Ergometer', waktu: true, kecilLebihBaik: true, jarak: 500, min: 60, max: 240 },
  { kunci: 'bench_pull', label: 'Bench pull 1RM', singkat: 'B.Pull', satuan: 'kg', kelompok: 'Kekuatan', min: 10, max: 200 },
  { kunci: 'pull_up', label: 'Pull-up maksimal', singkat: 'Pull-up', satuan: 'rep', kelompok: 'Kekuatan', min: 1, max: 80 },
]
export const PETA_ITEM = new Map(ITEM_UKUR.map(i => [i.kunci, i]))
/** Ukuran yang dihitung "tes khusus dayung" di kelengkapan data. */
export const ITEM_KHUSUS = ['ergo_2000', 'ergo_1000', 'ergo_500', 'bench_pull', 'pull_up']

/* ---------- Membaca & menampilkan nilai ---------- */

/** "6:45.3" → 405.3 · "405,3" → 405.3 · "1:02:03" → 3723 */
function detikDariTeks(t: string): number | null {
  const s = t.trim().replace(',', '.')
  if (!/^\d{1,2}(:\d{1,2}){0,2}(\.\d+)?$/.test(s)) return null
  return Math.round(s.split(':').map(Number).reduce((a, b) => a * 60 + b, 0) * 1000) / 1000
}

export function bacaNilai(kunci: string, teks: string | number | null | undefined): { nilai: number | null; galat?: string } {
  const item = PETA_ITEM.get(kunci)
  if (!item) return { nilai: null, galat: 'ukuran tidak dikenal' }
  const t = String(teks ?? '').trim()
  if (!t) return { nilai: null }
  const nilai = item.waktu ? detikDariTeks(t) : (/^\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null)
  if (nilai == null) return { nilai: null, galat: item.waktu ? 'format waktu m:ss.d' : 'bukan angka' }
  if (nilai < item.min || nilai > item.max)
    return { nilai: null, galat: `di luar batas wajar (${tampilNilai(kunci, item.min)}–${tampilNilai(kunci, item.max)})` }
  return { nilai }
}

export function tampilNilai(kunci: string, nilai: number | null | undefined): string {
  if (nilai == null) return '—'
  const item = PETA_ITEM.get(kunci)
  if (!item?.waktu) return `${Number.isInteger(nilai) ? nilai : nilai.toFixed(1)}`
  const m = Math.floor(nilai / 60), s = nilai - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

/** Ergometer: waktu rata-rata per 500 m (ukuran baku dayung). */
export function pace500(kunci: string, detik: number | null | undefined): number | null {
  const item = PETA_ITEM.get(kunci)
  if (!item?.jarak || detik == null) return null
  return Math.round(detik / (item.jarak / 500) * 10) / 10
}

/** Rentang lengan ÷ tinggi badan. >1,00 = lengan lebih panjang dari tinggi (menguntungkan di dayung). */
export function indeksRentang(rentang: number | null | undefined, tinggi: number | null | undefined): number | null {
  if (!rentang || !tinggi) return null
  return Math.round(rentang / tinggi * 100) / 100
}

/* ---------- Penggabungan dengan data yang sudah ada ---------- */

export interface Ukuran { item: string; tanggal: string; nilai: number; sumber: 'Isian PODSI' | 'Tes Biomotorik' }
export interface SumberGabung {
  tglLahirLokal?: string | null          // dari Data Atlet (tabel atlet)
  tglLahirIsian?: string | null          // dari dayung_atlet_isian
  tesFisik?: { tanggal: string | null; tinggi: number | null; berat: number | null } | null
  pengukuran?: { item: string; tanggal: string; nilai: number }[]
}
export interface HasilGabung {
  tglLahir: string | null
  sumberTglLahir: 'Data Atlet' | 'Isian PODSI' | null
  /** Riwayat per ukuran, urut tanggal naik. */
  riwayat: Record<string, Ukuran[]>
  terkini: Record<string, Ukuran>
}

export function gabungDataAwal(s: SumberGabung): HasilGabung {
  const semua: Ukuran[] = (s.pengukuran ?? []).map(p => ({ item: p.item, tanggal: p.tanggal, nilai: Number(p.nilai), sumber: 'Isian PODSI' as const }))
  const tf = s.tesFisik
  if (tf?.tanggal) {
    const ada = (item: string) => semua.some(x => x.item === item && x.tanggal === tf.tanggal)
    if (tf.tinggi && !ada('tinggi_badan')) semua.push({ item: 'tinggi_badan', tanggal: tf.tanggal, nilai: Number(tf.tinggi), sumber: 'Tes Biomotorik' })
    if (tf.berat && !ada('berat_badan')) semua.push({ item: 'berat_badan', tanggal: tf.tanggal, nilai: Number(tf.berat), sumber: 'Tes Biomotorik' })
  }
  const riwayat: Record<string, Ukuran[]> = {}
  for (const u of semua) (riwayat[u.item] ??= []).push(u)
  const terkini: Record<string, Ukuran> = {}
  for (const [k, xs] of Object.entries(riwayat)) {
    xs.sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    terkini[k] = xs[xs.length - 1]
  }
  const tglLahir = s.tglLahirLokal || s.tglLahirIsian || null
  return { tglLahir, sumberTglLahir: s.tglLahirLokal ? 'Data Atlet' : s.tglLahirIsian ? 'Isian PODSI' : null, riwayat, terkini }
}

/** Perkembangan satu ukuran: titik nol (paling awal) → terkini. */
export function perkembangan(kunci: string, riwayat: { tanggal: string; nilai: number }[]):
  { awal: number; terkini: number; selisih: number; membaik: boolean | null; kali: number } | null {
  if (!riwayat.length) return null
  const urut = [...riwayat].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const awal = urut[0].nilai, terkini = urut[urut.length - 1].nilai
  const selisih = Math.round((terkini - awal) * 1000) / 1000
  const item = PETA_ITEM.get(kunci)
  // Postur bukan soal baik/buruk; ergometer makin kecil makin baik; kekuatan makin besar makin baik.
  const membaik = urut.length < 2 || selisih === 0 || item?.kelompok === 'Postur' ? null : item?.kecilLebihBaik ? selisih < 0 : selisih > 0
  return { awal, terkini, selisih, membaik, kali: urut.length }
}

/* ---------- Template Excel ---------- */

export const KOLOM_TEMPLATE = ['situs_id', 'nama', 'kontingen', 'tgl_lahir', ...ITEM_UKUR.map(i => i.kunci)]

export interface BarisTemplate { situs_id: number; tgl_lahir: string | null; nilai: Record<string, number>; galat: string[] }

/** Satu baris Excel → isian. Tanggal lahir terima "2004-05-17", "17/05/2004", atau tanggal Excel. */
export function bacaBarisTemplate(baris: Record<string, any>): BarisTemplate | null {
  const id = Number(baris.situs_id)
  if (!Number.isInteger(id) || id <= 0) return null
  const galat: string[] = []
  let tgl: string | null = null
  const t = baris.tgl_lahir
  if (t instanceof Date && !isNaN(t.getTime())) tgl = t.toISOString().slice(0, 10)
  else if (typeof t === 'string' && t.trim()) {
    const s = t.trim()
    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/), dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
    if (iso) tgl = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
    else if (dmy) tgl = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
    else galat.push(`tgl_lahir "${s}" tidak terbaca (pakai 2004-05-17 atau 17/05/2004)`)
  }
  if (tgl && !tanggalLahirWajar(tgl)) { galat.push(`tgl_lahir ${tgl} tidak wajar`); tgl = null }
  const nilai: Record<string, number> = {}
  for (const i of ITEM_UKUR) {
    const r = bacaNilai(i.kunci, baris[i.kunci])
    if (r.galat) galat.push(`${i.label}: ${r.galat}`)
    else if (r.nilai != null) nilai[i.kunci] = r.nilai
  }
  return { situs_id: id, tgl_lahir: tgl, nilai, galat }
}

/** Atlet PORPROV: umur 10–60 tahun per 2026. */
export function tanggalLahirWajar(tgl: string): boolean {
  const d = new Date(tgl + 'T00:00:00Z')
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== tgl) return false
  const th = d.getUTCFullYear()
  return th >= 1966 && th <= 2016
}
