// src/lib/jadwal-publik.ts
// Susunan halaman publik jadwal kontingen (tanpa login): status kegiatan,
// kegiatan per tanggal, deretan tanggal. Murni hitungan tanpa database
// (npm run uji:jadwal-publik).
//
// Yang boleh tampil di publik hanya kolom di BarisPublik — akomodasi, kontak
// panitia, dan catatan internal sengaja tidak ikut dibaca.

export interface BarisPublik {
  id: number
  jenis: 'pertandingan' | 'upacara'
  kegiatan: string
  cabor: string | null
  wilayah: string | null
  kota: string | null
  venue: string | null
  mulai: string | null
  selesai: string | null
}

/** Angka gabungan kontingen dari daftar pendaftaran resmi — tanpa data pribadi. */
export interface AngkaKontingen { atlet: number; nomor: number; cabor: number }

export type StatusKegiatan = 'berlangsung' | 'akan' | 'selesai' | 'tanpa_tanggal'

export const LABEL_STATUS: Record<StatusKegiatan, string> = {
  berlangsung: 'Berlangsung', akan: 'Akan datang', selesai: 'Selesai', tanpa_tanggal: 'Tanggal belum ada',
}

const HARI_MS = 86_400_000
const ke = (iso: string) => Date.parse(iso + 'T00:00:00Z')
const isoDari = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function statusKegiatan(b: Pick<BarisPublik, 'mulai' | 'selesai'>, hariIni: string): StatusKegiatan {
  if (!b.mulai) return 'tanpa_tanggal'
  const selesai = b.selesai ?? b.mulai
  if (hariIni < b.mulai) return 'akan'
  if (hariIni > selesai) return 'selesai'
  return 'berlangsung'
}

/** "Hari ke-2 dari 5" selama berlangsung; null di luar rentang. */
export function hariKe(b: Pick<BarisPublik, 'mulai' | 'selesai'>, tanggal: string): { ke: number; dari: number } | null {
  if (!b.mulai) return null
  const selesai = b.selesai ?? b.mulai
  if (tanggal < b.mulai || tanggal > selesai) return null
  return { ke: Math.round((ke(tanggal) - ke(b.mulai)) / HARI_MS) + 1, dari: Math.round((ke(selesai) - ke(b.mulai)) / HARI_MS) + 1 }
}

/** Kegiatan pada satu tanggal: upacara dulu, lalu urut kota dan nama. */
export function kegiatanPada(jadwal: BarisPublik[], tanggal: string): BarisPublik[] {
  return jadwal
    .filter(b => !!b.mulai && b.mulai <= tanggal && tanggal <= (b.selesai ?? b.mulai))
    .sort((a, b) => Number(b.jenis === 'upacara') - Number(a.jenis === 'upacara')
      || (a.kota ?? '').localeCompare(b.kota ?? '') || a.kegiatan.localeCompare(b.kegiatan))
}

/** Semua tanggal dari kegiatan paling awal sampai paling akhir, beserta jumlah kegiatannya. */
export function deretTanggal(jadwal: BarisPublik[]): { tanggal: string; jumlah: number }[] {
  const ada = jadwal.filter(b => b.mulai)
  if (!ada.length) return []
  const awal = ada.map(b => b.mulai as string).sort()[0]
  const akhir = ada.map(b => (b.selesai ?? b.mulai) as string).sort().reverse()[0]
  const hasil: { tanggal: string; jumlah: number }[] = []
  // Batas 120 hari: tanggal salah ketik (mis. tahun 2062) tidak boleh membuat ribuan tombol.
  for (let t = ke(awal), n = 0; t <= ke(akhir) && n < 120; t += HARI_MS, n++) {
    const tanggal = isoDari(t)
    hasil.push({ tanggal, jumlah: kegiatanPada(jadwal, tanggal).filter(b => b.jenis === 'pertandingan').length })
  }
  return hasil
}

/**
 * Tanggal yang dibuka pertama kali: hari ini bila ada kegiatan, bila tidak
 * tanggal terdekat sesudahnya yang ada kegiatan, bila sudah lewat semua
 * tanggal terakhir.
 */
export function tanggalAwal(jadwal: BarisPublik[], hariIni: string): string | null {
  const deret = deretTanggal(jadwal)
  if (!deret.length) return null
  const isi = deret.filter(d => d.jumlah > 0 || kegiatanPada(jadwal, d.tanggal).length > 0)
  return (isi.find(d => d.tanggal >= hariIni) ?? isi[isi.length - 1] ?? deret[0]).tanggal
}

/** Urutan daftar lengkap: berlangsung, akan datang (terdekat dulu), selesai (terbaru dulu), tanpa tanggal. */
export function urutDaftar(jadwal: BarisPublik[], hariIni: string): BarisPublik[] {
  const bobot: Record<StatusKegiatan, number> = { berlangsung: 0, akan: 1, selesai: 2, tanpa_tanggal: 3 }
  return [...jadwal].sort((a, b) => {
    const sa = statusKegiatan(a, hariIni), sb = statusKegiatan(b, hariIni)
    if (sa !== sb) return bobot[sa] - bobot[sb]
    if (sa === 'selesai') return (b.selesai ?? '').localeCompare(a.selesai ?? '') || a.kegiatan.localeCompare(b.kegiatan)
    return (a.mulai ?? '').localeCompare(b.mulai ?? '') || a.kegiatan.localeCompare(b.kegiatan)
  })
}

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

/** Pencarian bebas: semua kata harus ada di nama kegiatan, cabor, kota, atau venue. */
export function cocokCari(b: BarisPublik, cari: string): boolean {
  const kata = norm(cari).split(' ').filter(Boolean)
  if (!kata.length) return true
  const teks = norm([b.kegiatan, b.cabor, b.kota, b.venue].join(' '))
  return kata.every(k => teks.includes(k))
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export const namaHari = (iso: string) => HARI[new Date(ke(iso)).getUTCDay()]
export const tglPanjang = (iso: string) => `${namaHari(iso)}, ${Number(iso.slice(8))} ${BULAN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`

/** "28 Okt", "6–10 Nov", "31 Okt – 8 Nov". */
export function rentangSingkat(mulai: string | null, selesai: string | null): string {
  if (!mulai) return 'Tanggal belum ada'
  const s = selesai ?? mulai
  const tm = Number(mulai.slice(8)), bm = BULAN3[Number(mulai.slice(5, 7)) - 1]
  const ts = Number(s.slice(8)), bs = BULAN3[Number(s.slice(5, 7)) - 1]
  if (mulai === s) return `${tm} ${bm}`
  if (mulai.slice(0, 7) === s.slice(0, 7)) return `${tm}–${ts} ${bs}`
  return `${tm} ${bm} – ${ts} ${bs}`
}

// ── Hiasan halaman publik ────────────────────────────────────────────────────

/** Ikon cabor (emoji, tampil di semua HP tanpa unduhan). Urutan penting: yang lebih khusus dulu. */
const IKON: [RegExp, string][] = [
  [/UPACARA/, '🏟️'], [/FUTSAL|SEPAK ?BOLA/, '⚽'], [/TAKRAW/, '🏐'], [/BASKET/, '🏀'], [/VOLI/, '🏐'],
  [/POLO AIR/, '🤽'], [/RENANG ARTISTIK|LONCAT INDAH/, '🤸'], [/RENANG|AKUATIK|AQUATIC|OWS/, '🏊'], [/SELAM/, '🤿'],
  [/CANOE|ROWING|DAYUNG|DBR|SUP/, '🚣'], [/LAYAR/, '⛵'], [/ARUNG JERAM/, '🛶'], [/TRIATHLON/, '🏊'],
  [/PENTATHLON/, '🤺'], [/ANGGAR/, '🤺'], [/PANAHAN/, '🏹'], [/MENEMBAK/, '🎯'], [/GOLF/, '⛳'],
  [/BULUTANGKIS/, '🏸'], [/TENIS MEJA/, '🏓'], [/SQUASH|TENIS/, '🎾'], [/GATEBALL|PETANQUE|BOLING|BOWLING/, '🎳'],
  [/BILIAR/, '🎱'], [/CATUR/, '♟️'], [/E ?SPORT/, '🎮'], [/MINI 4WD|BERMOTOR|MOTOR/, '🏍️'],
  [/BMX|SEPEDA|MTB/, '🚴'], [/SEPATU RODA/, '🛼'], [/SAKTEBOARD|SKATEBOARD/, '🛹'], [/ATLETIK|MARATHON/, '🏃'],
  [/BERKUDA|EQU|PACU/, '🏇'], [/PANJAT/, '🧗'], [/PARALAYANG|GANTOLE|TERJUN|PARAMOTOR|TERBANG/, '🪂'],
  [/AEROMODEL/, '✈️'], [/GIMNASTIK|SENAM/, '🤸'], [/DANSA|DANCE/, '💃'], [/DRUMBAND/, '🥁'],
  [/ANGKAT|BINARAGA/, '🏋️'], [/GULAT|SAMBO|KURASH|JUJITSU|JUDO/, '🤼'],
  [/TINJU|KICK|MUAY|MMA|IBCA/, '🥊'], [/KARATE|TAEKWONDO|SILAT|WUSHU|KEMPO|HAPKIDO/, '🥋'],
  [/HOKI|HOCKEY|FLOORBALL/, '🏑'], [/RUGBY/, '🏉'], [/SKATING/, '⛸️'],
]
export function ikonCabor(b: Pick<BarisPublik, 'kegiatan' | 'cabor'>): string {
  const teks = norm(`${b.kegiatan} ${b.cabor ?? ''}`)
  return IKON.find(([re]) => re.test(teks))?.[1] ?? '🏅'
}

/** Ringkasan per wilayah: kota tuan rumah beserta jumlah kegiatannya, terbanyak dulu. */
export function ringkasWilayah(jadwal: BarisPublik[]): { wilayah: string; kegiatan: number; kota: { nama: string; kegiatan: number }[] }[] {
  const peta = new Map<string, Map<string, number>>()
  for (const b of jadwal) {
    if (b.jenis !== 'pertandingan' || !b.wilayah) continue
    const w = b.wilayah.trim().toUpperCase(), k = (b.kota ?? '-').trim().toUpperCase()
    const kota = peta.get(w) ?? new Map<string, number>()
    kota.set(k, (kota.get(k) ?? 0) + 1); peta.set(w, kota)
  }
  return Array.from(peta.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([wilayah, kota]) => ({
    wilayah,
    kegiatan: Array.from(kota.values()).reduce((n, x) => n + x, 0),
    kota: Array.from(kota.entries()).map(([nama, kegiatan]) => ({ nama, kegiatan })).sort((a, b) => b.kegiatan - a.kegiatan || a.nama.localeCompare(b.nama)),
  }))
}

/** Kegiatan yang segera dimulai (belum mulai), terdekat dulu. */
export function segeraMulai(jadwal: BarisPublik[], hariIni: string, jumlah = 6): (BarisPublik & { hari_lagi: number })[] {
  return jadwal
    .filter(b => b.jenis === 'pertandingan' && !!b.mulai && b.mulai > hariIni)
    .sort((a, b) => (a.mulai as string).localeCompare(b.mulai as string) || a.kegiatan.localeCompare(b.kegiatan))
    .slice(0, jumlah)
    .map(b => ({ ...b, hari_lagi: Math.round((ke(b.mulai as string) - ke(hariIni)) / HARI_MS) }))
}
