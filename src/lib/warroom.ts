// src/lib/warroom.ts
// Aturan murni War Room (tanpa I/O). Prinsipnya: War Room hanya menampilkan
// angka yang benar-benar ada — tidak ada peringkat, target, atau laga contoh.

export interface BarisKlasemenWR { nama: string; emas: number; perak: number; perunggu: number; total: number }

/** Klasemen baru bermakna setelah ada satu medali di kontingen mana pun. */
export const klasemenDimulai = (k: BarisKlasemenWR[]) => k.some(r => (r.total ?? 0) > 0 || r.emas + r.perak + r.perunggu > 0)

/**
 * Peringkat kontingen di klasemen (urut emas → perak → perunggu, peringkat bersama bila sama persis).
 * null bila klasemen belum dimulai atau kontingennya tidak ada — jangan tampilkan "#1" dari deretan nol.
 */
export function peringkatKontingen(k: BarisKlasemenWR[], nama: string): number | null {
  if (!klasemenDimulai(k)) return null
  const urut = [...k].sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu)
  const i = urut.findIndex(r => r.nama.toUpperCase() === nama.toUpperCase())
  if (i < 0) return null
  const s = urut[i]
  return urut.findIndex(r => r.emas === s.emas && r.perak === s.perak && r.perunggu === s.perunggu) + 1
}

export interface PartaiWR { id: number; cabor_id: number; tanggal: string; jam: string | null; nomor_teks: string; lawan: string | null; venue: string | null; status: string; babak?: string | null }

/** Partai yang sedang bertanding (ditandai PIC/KONIDA "Sedang main"), hari ini atau kemarin, urut jam. */
export function lagaLive(partai: PartaiWR[], hariIni: string): PartaiWR[] {
  const kemarin = new Date(Date.parse(hariIni + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10)
  return partai
    .filter(p => p.status === 'berlangsung' && (p.tanggal === hariIni || p.tanggal === kemarin))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || (a.jam ?? '99:99').localeCompare(b.jam ?? '99:99') || a.id - b.id)
}

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

// ── Klasemen: tetangga & rival ───────────────────────────────────────────────
const urutKlasemen = <T extends BarisKlasemenWR>(k: T[]) =>
  [...k].sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu || a.nama.localeCompare(b.nama, 'id'))

/** Kontingen tepat di atas dan di bawah kita — "siapa yang dikejar, siapa yang mengejar". */
export function tetangga(k: BarisKlasemenWR[], nama: string): { atas: BarisKlasemenWR | null; kita: BarisKlasemenWR | null; bawah: BarisKlasemenWR | null } {
  if (!klasemenDimulai(k)) return { atas: null, kita: null, bawah: null }
  const u = urutKlasemen(k)
  const i = u.findIndex(r => r.nama.toUpperCase() === nama.toUpperCase())
  if (i < 0) return { atas: null, kita: null, bawah: null }
  return { atas: u[i - 1] ?? null, kita: u[i], bawah: u[i + 1] ?? null }
}

/** Duel dengan rival: selisih emas & total (positif = kita unggul). Rival yang tidak ada di klasemen dilewati. */
export function duelRival(k: BarisKlasemenWR[], nama: string, rival: string[]) {
  const kita = k.find(r => r.nama.toUpperCase() === nama.toUpperCase())
  return rival.flatMap(n => {
    const r = k.find(x => x.nama.toUpperCase() === n.toUpperCase())
    if (!r || !kita) return []
    return [{ ...r, selisih_emas: kita.emas - r.emas, selisih_total: kita.total - r.total }]
  })
}

// ── Misi Emas Hari Ini: proyeksi KONI lawan hasil yang disahkan ──────────────
export interface ProyeksiBaris { urutan: number; tanggal: string; cabor_id: number | null; cabor: string; nomor: string | null; atlet: string | null; kota: string | null }
export interface HasilBaris { id: number; cabor_id: number; tanggal: string; hasil: string; nomor_teks: string }
export type StatusMisi = 'emas' | 'medali_lain' | 'meleset' | 'berjalan' | 'belum'
export interface Misi extends ProyeksiBaris { status: StatusMisi; hasil: string | null }

const kataNomor = (s: string | null) => new Set(norm(s).split(' ').filter(w => w.length >= 2 && !['PA', 'PI', 'PUTRA', 'PUTRI', 'KELAS', 'NOMOR'].includes(w)))
function miripNomor(a: string | null, b: string | null): number {
  const x = kataNomor(a), y = kataNomor(b)
  if (!x.size || !y.size) return 0
  let sama = 0
  x.forEach(w => { if (y.has(w)) sama++ })
  return sama / Math.min(x.size, y.size)
}

/**
 * Status tiap emas yang diproyeksikan KONI. Satu laporan disahkan hanya boleh
 * "dipakai" satu baris proyeksi. Pertama dicocokkan lewat nama nomor (≥ 60% kata
 * sama), sisanya emas cabor yang sama di tanggal yang sama dibagi berurutan.
 * Cabor yang sedang main (tanda "Sedang main") → berjalan.
 */
export function statusMisi(proyeksi: ProyeksiBaris[], laporan: HasilBaris[], caborLive: Set<number>): Misi[] {
  const dipakai = new Set<number>()
  const hasilRow = new Map<number, HasilBaris>()
  const kunci = (t: string, c: number | null) => `${t}|${c}`
  const lapPer = new Map<string, HasilBaris[]>()
  for (const l of laporan) lapPer.set(kunci(l.tanggal, l.cabor_id), [...(lapPer.get(kunci(l.tanggal, l.cabor_id)) ?? []), l])
  const urut = [...proyeksi].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.urutan - b.urutan)
  // 1. lewat nama nomor
  for (const p of urut) {
    const calon = (lapPer.get(kunci(p.tanggal, p.cabor_id)) ?? []).filter(l => !dipakai.has(l.id))
      .map(l => ({ l, s: miripNomor(p.nomor, l.nomor_teks) })).filter(x => x.s >= 0.6).sort((a, b) => b.s - a.s || (a.l.hasil === 'emas' ? -1 : 1))
    if (calon[0]) { dipakai.add(calon[0].l.id); hasilRow.set(p.urutan, calon[0].l) }
  }
  // 2. emas sisa di cabor & tanggal yang sama
  for (const p of urut) {
    if (hasilRow.has(p.urutan)) continue
    const emas = (lapPer.get(kunci(p.tanggal, p.cabor_id)) ?? []).find(l => !dipakai.has(l.id) && l.hasil === 'emas')
    if (emas) { dipakai.add(emas.id); hasilRow.set(p.urutan, emas) }
  }
  return urut.map(p => {
    const h = hasilRow.get(p.urutan)
    let status: StatusMisi = 'belum'
    if (h) status = h.hasil === 'emas' ? 'emas' : h.hasil === 'perak' || h.hasil === 'perunggu' ? 'medali_lain' : h.hasil === 'lolos' || h.hasil === 'menang' || h.hasil === 'kalah' ? 'berjalan' : 'meleset'
    if (status === 'belum' && p.cabor_id != null && caborLive.has(p.cabor_id)) status = 'berjalan'
    return { ...p, status, hasil: h?.hasil ?? null }
  })
}

// ── Arena: sedang main & berikutnya ──────────────────────────────────────────
/** Menit dari jamKini ke jam (HH:MM); negatif bila sudah lewat; null bila jam kosong. */
export function menitLagi(jam: string | null, jamKini: string): number | null {
  if (!jam || !/^\d{2}:\d{2}/.test(jam) || !/^\d{2}:\d{2}/.test(jamKini)) return null
  const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
  return m(jam) - m(jamKini)
}

/**
 * Partai berikutnya: hari ini yang belum selesai (terjadwal/ditunda), urut jam —
 * yang jamnya sudah lewat > 3 jam tanpa kabar tidak dipajang lagi. Bila hari ini
 * habis, partai pada tanggal terdekat berikutnya.
 */
export function partaiBerikut(partai: PartaiWR[], hariIni: string, jamKini: string, batas = 6): (PartaiWR & { menit: number | null })[] {
  const tunggu = (p: PartaiWR) => p.status === 'terjadwal' || p.status === 'ditunda'
  const hari = partai.filter(p => tunggu(p) && p.tanggal === hariIni)
    .map(p => ({ ...p, menit: menitLagi(p.jam, jamKini) }))
    .filter(p => p.menit == null || p.menit > -180)
    .sort((a, b) => (a.jam ?? '99:99').localeCompare(b.jam ?? '99:99') || a.id - b.id)
  if (hari.length) return hari.slice(0, batas)
  const depan = partai.filter(p => tunggu(p) && p.tanggal > hariIni).map(p => p.tanggal).sort()[0]
  if (!depan) return []
  return partai.filter(p => tunggu(p) && p.tanggal === depan)
    .sort((a, b) => (a.jam ?? '99:99').localeCompare(b.jam ?? '99:99') || a.id - b.id)
    .slice(0, batas).map(p => ({ ...p, menit: null }))
}

// ── Kalender panas ───────────────────────────────────────────────────────────
export interface HariPanas { tanggal: string; proyeksi: number; realisasi: number; kegiatan: number }
/** Satu baris per tanggal dari..sampai: emas diproyeksikan, emas disahkan, dan jumlah kegiatan cabor kita. */
export function kalenderPanas(proyeksiTgl: string[], realisasiTgl: string[], kegiatan: { mulai: string | null; selesai: string | null }[], dari: string, sampai: string): HariPanas[] {
  const hasil: HariPanas[] = []
  for (let t = Date.parse(dari + 'T00:00:00Z'), akhir = Date.parse(sampai + 'T00:00:00Z'); t <= akhir; t += 86_400_000) {
    const tgl = new Date(t).toISOString().slice(0, 10)
    hasil.push({
      tanggal: tgl,
      proyeksi: proyeksiTgl.filter(x => x === tgl).length,
      realisasi: realisasiTgl.filter(x => x === tgl).length,
      kegiatan: kegiatan.filter(k => k.mulai && k.selesai && k.mulai <= tgl && tgl <= k.selesai).length,
    })
  }
  return hasil
}

// ── Kota tuan rumah PORPROV XV (untuk peta perjuangan) ───────────────────────
export const KOTA_TUAN_RUMAH: Record<string, { lat: number; lng: number; label: string }> = {
  'BEKASI':       { lat: -6.2381, lng: 107.0024, label: 'Bekasi' },
  'BOGOR':        { lat: -6.5971, lng: 106.8060, label: 'Bogor' },
  'KAB BOGOR':    { lat: -6.4818, lng: 106.8540, label: 'Kab. Bogor' },
  'DEPOK':        { lat: -6.4025, lng: 106.7942, label: 'Depok' },
  'KARAWANG':     { lat: -6.3227, lng: 107.3376, label: 'Karawang' },
  'PURWAKARTA':   { lat: -6.5569, lng: 107.4431, label: 'Purwakarta' },
  'SUBANG':       { lat: -6.5715, lng: 107.7587, label: 'Subang' },
  'INDRAMAYU':    { lat: -6.3264, lng: 108.3200, label: 'Indramayu' },
  'MAJALENGKA':   { lat: -6.8364, lng: 108.2274, label: 'Majalengka' },
  'SUMEDANG':     { lat: -6.8381, lng: 107.9264, label: 'Sumedang' },
  'KOTA BANDUNG': { lat: -6.9175, lng: 107.6191, label: 'Kota Bandung' },
  'KAB BANDUNG':  { lat: -7.0251, lng: 107.5197, label: 'Kab. Bandung' },
  'KOTA CIMAHI':  { lat: -6.8722, lng: 107.5425, label: 'Cimahi' },
  'CIAMIS':       { lat: -7.3257, lng: 108.3534, label: 'Ciamis' },
  'PANGANDARAN':  { lat: -7.6833, lng: 108.6500, label: 'Pangandaran' },
}
/** Koordinat kota tuan rumah dari tulisan jadwal ("KAB. BANDUNG", "Kota Depok", "BEKASI"…); null bila tak dikenal. */
export function koordinatKota(nama: string | null | undefined) {
  const n = norm(nama)
  if (!n) return null
  if (KOTA_TUAN_RUMAH[n]) return KOTA_TUAN_RUMAH[n]
  const tanpa = n.replace(/^(KOTA|KAB|KABUPATEN) /, '')
  if (KOTA_TUAN_RUMAH[tanpa]) return KOTA_TUAN_RUMAH[tanpa]
  const k = Object.keys(KOTA_TUAN_RUMAH).find(x => x.endsWith(' ' + tanpa))
  return k ? KOTA_TUAN_RUMAH[k] : null
}

/** Rival utama Kab. Bandung (kontingen besar & tetangga). */
export const RIVAL_KABBANDUNG = ['KOTA BANDUNG', 'KAB. BEKASI', 'KAB. BOGOR', 'KOTA BEKASI']
