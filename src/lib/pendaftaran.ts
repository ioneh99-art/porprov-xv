// src/lib/pendaftaran.ts
// Membaca ekspor klasifikasi_verified panitia: daftar resmi atlet per nomor.
// Murni hitungan tanpa database, supaya bisa diuji (npm run uji:pendaftaran)
// dan dipakai sama persis oleh skrip impor maupun form lapor.

export type Penanda = 'Pa' | 'Pi' | 'Campuran' | 'Terbuka'

/** Spasi ganda dan spasi di ujung dibuang — berkas asal memuatnya di ratusan baris. */
export const rapikan = (s: unknown): string =>
  (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim()

export interface AtletBerkas { nama: string; jk: 'L' | 'P'; nik: string; cabor: string }

/**
 * Kolom Atlet di berkas berbentuk:  NAMA (JENIS KELAMIN/ NIK/CABOR)
 * Dibaca dari kurung TERAKHIR, sebab nama sendiri bisa mengandung kurung.
 * Mengembalikan null bila bentuknya lain — tidak menebak.
 */
export function uraiAtlet(teks: unknown): AtletBerkas | null {
  const t = rapikan(teks)
  const buka = t.lastIndexOf('(')
  if (buka <= 0 || !t.endsWith(')')) return null
  const bagian = t.slice(buka + 1, -1).split('/').map(rapikan)
  if (bagian.length !== 3) return null
  const [jkTeks, nik, cabor] = bagian
  const jk = jkTeks.toUpperCase() === 'LAKI-LAKI' ? 'L' : jkTeks.toUpperCase() === 'PEREMPUAN' ? 'P' : null
  const nama = rapikan(t.slice(0, buka))
  if (!jk || !nama || !cabor || !/^\d+$/.test(nik)) return null
  return { nama, jk, nik, cabor }
}

/** Penanda di ujung nama nomor: "(Pa)", "(Pi)", "(Campuran)", "(Terbuka)". */
export function penandaNomor(nomor: string): Penanda | null {
  const m = /\(([^()]*)\)\s*$/.exec(nomor)
  const p = m ? m[1].trim().toLowerCase() : ''
  return p === 'pa' ? 'Pa' : p === 'pi' ? 'Pi' : p === 'campuran' ? 'Campuran' : p === 'terbuka' ? 'Terbuka' : null
}

/** Jenis kelamin yang diwajibkan sebuah nomor; null untuk Campuran/Terbuka. */
export const jkNomor = (p: Penanda | null): 'L' | 'P' | null => (p === 'Pa' ? 'L' : p === 'Pi' ? 'P' : null)

const hurufSaja = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// ── Daftar nomor untuk form PIC ──────────────────────────────────────────────
export interface BarisPendaftaran { disiplin: string; nomor: string; penanda: string | null; atlet_id: number | null }
export interface NomorResmi {
  kunci: string
  disiplin: string
  nomor: string
  penanda: Penanda | null
  /** Atlet terdaftar yang sudah ada di sistem. */
  atlet_ids: number[]
  /** Atlet terdaftar resmi yang belum ada di sistem (tidak bisa dipilih di form). */
  belum_ada: number
}

/** Satu baris berkas = satu atlet di satu nomor; di form yang dipilih adalah nomornya. */
export function kelompokkanNomor(baris: BarisPendaftaran[]): NomorResmi[] {
  const peta = new Map<string, NomorResmi>()
  for (const b of baris) {
    const kunci = `${b.disiplin}|${b.nomor}`
    let n = peta.get(kunci)
    if (!n) {
      n = { kunci, disiplin: b.disiplin, nomor: b.nomor, penanda: (b.penanda as Penanda | null) ?? penandaNomor(b.nomor), atlet_ids: [], belum_ada: 0 }
      peta.set(kunci, n)
    }
    if (b.atlet_id == null) n.belum_ada++
    else if (!n.atlet_ids.includes(b.atlet_id)) n.atlet_ids.push(b.atlet_id)
  }
  return Array.from(peta.values()).sort((a, b) =>
    a.disiplin.localeCompare(b.disiplin) || a.nomor.localeCompare(b.nomor, 'id', { numeric: true }))
}

/**
 * Tulisan nomor yang disimpan di laporan. Disiplin ikut ditulis hanya bila
 * cabornya punya lebih dari satu disiplin: "Beregu (Pa)" di Hockey tidak
 * berarti apa-apa tanpa tahu Indoor atau Outdoor.
 */
export function tulisNomorResmi(disiplin: string, nomor: string, jumlahDisiplinCabor: number): string {
  return jumlahDisiplinCabor > 1 ? `${disiplin} · ${nomor}` : nomor
}

/**
 * Cabor di berkas ("BERKUDA") tidak sama dengan cabor di sistem ("Equestrian"
 * dan "Pacuan"). Padanannya diambil dari data: cabor terbanyak di antara atlet
 * yang NIK-nya ketemu, per (cabor berkas, disiplin).
 */
export function petaCaborBerkas(taut: { cabor_berkas: string; disiplin: string; cabor_id: number | null }[]): Map<string, number> {
  const hitung = new Map<string, Map<number, number>>()
  for (const t of taut) {
    if (t.cabor_id == null) continue
    const k = `${t.cabor_berkas}|${t.disiplin}`
    const m = hitung.get(k) ?? new Map<number, number>()
    m.set(t.cabor_id, (m.get(t.cabor_id) ?? 0) + 1)
    hitung.set(k, m)
  }
  const peta = new Map<string, number>()
  hitung.forEach((m, k) => {
    let juara = -1, terbanyak = 0
    m.forEach((n, id) => { if (n > terbanyak || (n === terbanyak && id < juara)) { juara = id; terbanyak = n } })
    peta.set(k, juara)
  })
  return peta
}

/** Dua nama dianggap sama bila huruf dan angkanya sama, tanpa peduli spasi/tanda baca/besar-kecil. */
export const namaSama = (a: string, b: string) => hurufSaja(a) === hurufSaja(b)
