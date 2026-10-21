// src/lib/matriks.ts
// Menyusun jurnal dalam format "Matrix Jadwal Harian" KONI Kab. Bandung:
//   No · Tanggal · Jam · Klaster Wilayah · Wilayah Venue · Cabor/Kegiatan ·
//   Nomor Pertandingan · Nama Atlet · Lawan · Hasil Pertandingan · Venue ·
//   Status Target · PIC
//
// Jadwal memberi tanggal, kota, dan venue per kegiatan; laporan lapangan yang
// sudah disahkan mengisi nomor, atlet, lawan, hasil, dan PIC. Murni hitungan
// tanpa database supaya bisa diuji (npm run uji:matriks).

import { tulisHasil } from './lapor'

export interface BarisJadwal {
  cabor_disiplin: string
  cabor_nama_raw: string | null
  jenis: string
  wilayah: string | null
  tuan_rumah: string | null
  mulai: string | null
  selesai: string | null
  venue: string | null
}

export interface LaporanMatriks {
  id: number
  tanggal: string
  cabor: string                 // nama cabor di sistem (cabor atlet)
  disiplin: string | null       // dari daftar resmi; kosong bila nomor diketik bebas
  nomor_teks: string
  atlet: string[]
  hasil: string
  peringkat: number | null
  nilai_teks: string | null
  lawan: string | null
  jam: string | null            // jam tanding isian PIC
  jam_lapor: string             // jam laporan dikirim (WIB), cadangan bila jam kosong
  pelapor_nama: string
  target: 'emas' | 'perak' | 'perunggu' | null
}

export interface BarisMatriks {
  no: number
  tanggal: string
  jam: string
  klaster: string
  wilayah_venue: string
  kegiatan: string
  nomor: string
  atlet: string
  lawan: string
  hasil: string
  venue: string
  status_target: string
  pic: string
}

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Ejaan yang berbeda untuk hal yang sama disatukan dulu sebelum dibandingkan. */
const SEPADAN: Record<string, string[]> = {
  HOKI: ['HOCKEY'], CANOEING: ['CANOE'], BOLAVOLI: ['BOLA', 'VOLI'], PACU: ['PACUAN'],
  GRASSTRACK: ['GRASS', 'TRACK'], RACING: ['RACE'], AQUATIC: ['AKUATIK'], PA: ['PUTRA'], PI: ['PUTRI'],
  SEPAKTAKRAW: ['SEPAK', 'TAKRAW'], BERMOTOR: ['MOTOR'], SEPEDA: ['SEPEDA'], GYMNASTIK: ['GIMNASTIK'],
}
function kata(s: string | null | undefined): string[] {
  return norm(s).split(' ').filter(Boolean).flatMap(k => SEPADAN[k] ?? [k])
}
/**
 * Kata penanda varian "biasa" di nama jadwal ("Canoeing Sprint & SUP", "Rowing
 * Classic"). Daftar nomor resmi tidak menulisnya, jadi kata ini diabaikan saat
 * membandingkan — tanpa ini "Canoeing Slalom" (dua kata) menang atas
 * "Canoeing Sprint & SUP" (tiga kata) untuk nomor Canoeing biasa.
 */
const IMBUHAN_VARIAN = new Set(['SPRINT', 'SUP', 'CLASSIC', 'KLASIK'])

/**
 * Baris jadwal yang dimaksud sebuah laporan.
 *
 * Satu cabor bisa punya beberapa baris jadwal (Dayung: Canoeing, Rowing, DBR).
 * Yang dipilih adalah yang kata-katanya paling cocok dengan disiplin dan nomor
 * laporan; kata milik nama cabornya sendiri tidak dihitung karena ada di semua
 * calon. Bila tetap seri: yang rentang tanggalnya memuat tanggal laporan,
 * lalu yang mulai paling awal.
 */
export function pilihKegiatan(jadwal: BarisJadwal[], l: { cabor: string; disiplin: string | null; nomor_teks: string; tanggal: string }): BarisJadwal | null {
  const calon = jadwal.filter(j => j.jenis === 'pertandingan' && j.cabor_nama_raw && norm(j.cabor_nama_raw) === norm(l.cabor))
  if (calon.length === 0) return null
  if (calon.length === 1) return calon[0]

  const umum = new Set([...kata(l.cabor), 'BALAP', 'AEROSPORT'])
  const milikLaporan = new Set([...kata(l.disiplin), ...kata(l.nomor_teks)].filter(k => !umum.has(k)))
  const nilai = (j: BarisJadwal) => {
    const k = Array.from(new Set(kata(j.cabor_disiplin).filter(x => !umum.has(x) && !IMBUHAN_VARIAN.has(x))))
    // Baris bernama sama dengan cabornya ("Atletik") adalah baris umum: cocok
    // sedang-sedang saja, kalah dari baris khusus yang benar-benar disebut.
    if (k.length === 0) return 0.5
    const kena = k.filter(x => milikLaporan.has(x)).length
    // Jumlah kata yang kena lebih menentukan daripada rasionya: "Rowing - Beach /
    // Coastal" yang kena dua kata harus menang atas "Rowing Classic" yang kena satu.
    // Rasio hanya pemecah seri ("Canoeing" atas "Canoeing - Slalom" untuk nomor biasa).
    return kena === 0 ? 0 : kena + (kena / k.length) * 0.5
  }
  const dalamRentang = (j: BarisJadwal) => !!j.mulai && !!j.selesai && j.mulai <= l.tanggal && l.tanggal <= j.selesai
  return [...calon].sort((a, b) =>
    nilai(b) - nilai(a)
    || Number(dalamRentang(b)) - Number(dalamRentang(a))
    || (a.mulai ?? '9').localeCompare(b.mulai ?? '9'))[0]
}

const URUTAN: Record<string, number> = { emas: 1, perak: 2, perunggu: 3 }

/** Capaian terhadap target medali si atlet. Kosong bila ia tidak punya target. */
export function statusTarget(target: string | null, hasil: string): string {
  if (!target || !URUTAN[target]) return ''
  if (hasil === 'lolos') return `Target ${target}: masih berjalan`
  return (URUTAN[hasil] ?? 9) <= URUTAN[target] ? `Target ${target}: tercapai` : `Target ${target}: belum tercapai`
}

/** Tim besar ditulis ringkas supaya satu sel tidak memuat dua puluh nama. */
export function tulisAtlet(atlet: string[]): string {
  if (atlet.length <= 4) return atlet.join(', ')
  return `${atlet.slice(0, 3).join(', ')}, dan ${atlet.length - 3} lainnya`
}

export function rentangTanggal(dari: string, sampai: string): string[] {
  const hasil: string[] = []
  for (let t = Date.parse(dari + 'T00:00:00Z'); t <= Date.parse(sampai + 'T00:00:00Z') && hasil.length < 60; t += 86_400_000)
    hasil.push(new Date(t).toISOString().slice(0, 10))
  return hasil
}

/**
 * Satu baris per laporan yang disahkan. Kegiatan yang terjadwal hari itu tetapi
 * belum punya laporan tetap ditulis dengan kolom hasil kosong — persis lembar
 * kosong KONI, sehingga terlihat cabor mana yang belum melapor.
 */
export function susunMatriks(jadwal: BarisJadwal[], laporan: LaporanMatriks[], tanggal: string[]): BarisMatriks[] {
  const keluar: BarisMatriks[] = []
  const urutJadwal = (a: BarisJadwal, b: BarisJadwal) =>
    (a.wilayah ?? 'ZZ').localeCompare(b.wilayah ?? 'ZZ') || (a.tuan_rumah ?? 'ZZ').localeCompare(b.tuan_rumah ?? 'ZZ') || a.cabor_disiplin.localeCompare(b.cabor_disiplin)
  const jamnya = (l: LaporanMatriks) => l.jam || l.jam_lapor

  for (const t of tanggal) {
    const hariIni = laporan.filter(l => l.tanggal === t)
    const perKegiatan = new Map<BarisJadwal, LaporanMatriks[]>()
    const tanpaJadwal: LaporanMatriks[] = []
    for (const l of hariIni) {
      const j = pilihKegiatan(jadwal, l)
      if (!j) { tanpaJadwal.push(l); continue }
      perKegiatan.set(j, [...(perKegiatan.get(j) ?? []), l])
    }
    const baris = (j: BarisJadwal | null, l: LaporanMatriks | null): BarisMatriks => ({
      no: 0, tanggal: t,
      jam: l ? jamnya(l) : '',
      klaster: j?.wilayah ?? '', wilayah_venue: j?.tuan_rumah ?? '',
      kegiatan: j?.cabor_disiplin ?? l?.cabor ?? '',
      nomor: l?.nomor_teks ?? '',
      atlet: l ? tulisAtlet(l.atlet) : '',
      lawan: l?.lawan ?? '',
      hasil: l ? [tulisHasil(l), l.nilai_teks].filter(Boolean).join(' · ') : '',
      venue: j?.venue ?? '',
      status_target: l ? statusTarget(l.target, l.hasil) : '',
      pic: l?.pelapor_nama ?? '',
    })

    // Kegiatan yang terjadwal hari itu, ditambah kegiatan yang punya laporan
    // walau tanggalnya di luar rentang jadwal (jadwal bisa bergeser di lapangan).
    const terjadwal = jadwal.filter(j => j.mulai && j.selesai && j.mulai <= t && t <= j.selesai)
    const semua = Array.from(new Set([...terjadwal, ...Array.from(perKegiatan.keys())])).sort(urutJadwal)
    for (const j of semua) {
      const ls = (perKegiatan.get(j) ?? []).sort((a, b) => jamnya(a).localeCompare(jamnya(b)) || a.id - b.id)
      if (ls.length === 0) keluar.push(baris(j, null))
      else for (const l of ls) keluar.push(baris(j, l))
    }
    for (const l of tanpaJadwal.sort((a, b) => jamnya(a).localeCompare(jamnya(b)) || a.id - b.id)) keluar.push(baris(null, l))
  }
  keluar.forEach((b, i) => { b.no = i + 1 })
  return keluar
}

export const KEPALA_MATRIKS = ['No.', 'Tanggal', 'Jam', 'Klaster Wilayah', 'Wilayah Venue', 'Cabor / Kegiatan', 'Nomor Pertandingan', 'Nama Atlet', 'Lawan', 'Hasil Pertandingan', 'Venue', 'Status Target', 'PIC']

/** Isi lembar Excel, baris demi baris, meniru susunan berkas KONI (judul di kolom D). */
export function lembarMatriks(baris: BarisMatriks[], kontingen: string): (string | number)[][] {
  return [
    ['', '', '', 'MATRIX JADWAL HARIAN PORPROV XV 2026'],
    ['', '', '', `KONTINGEN ${kontingen.toUpperCase().replace(/^KAB\.\s*/, 'KABUPATEN ')}`],
    KEPALA_MATRIKS,
    ...baris.map(b => [b.no, tanggalIndonesia(b.tanggal), b.jam, b.klaster, b.wilayah_venue, b.kegiatan, b.nomor, b.atlet, b.lawan, b.hasil, b.venue, b.status_target, b.pic]),
  ]
}

/** "2026-11-07" → "07/11/2026", urutan hari/bulan/tahun yang lazim dibaca di sini. */
export function tanggalIndonesia(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}
