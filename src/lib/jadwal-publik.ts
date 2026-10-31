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

/** Satu partai di halaman publik. Nama atlet ikut tampil (keputusan Bos 21 Okt 2026). */
export interface PartaiPublik {
  id: number; cabor: string; tanggal: string; jam: string | null; nomor: string; babak: string | null
  atlet: string[]; lawan: string | null; venue: string | null
  /** Disiplin (mis. "BOLA VOLI PASIR") — laporan kadang menulis nomor sebagai "DISIPLIN · nomor". */
  disiplin?: string | null
  status: 'terjadwal' | 'berlangsung' | 'ditunda' | 'selesai' | 'batal'
  /** Hasil dari laporan lapangan yang SUDAH DISAHKAN KONIDA; null kalau belum ada. */
  hasil?: HasilPartai | null
}

/** Hasil satu partai untuk publik — hanya skor dan jenis hasil, tanpa keterangan bebas. */
export interface HasilPartai { jenis: 'emas' | 'perak' | 'perunggu' | 'peringkat' | 'lolos' | 'gugur' | 'menang' | 'kalah'; label: string; skor: string | null }

/** Laporan disahkan seperlunya untuk mencocokkan ke partai. */
export interface LaporanSah { id: number; partai_id: number | null; cabor_id: number; tanggal: string; lawan: string | null; hasil: string; peringkat: number | null; nilai_teks: string | null }

const LABEL_HASIL_PUBLIK: Record<string, string> = {
  emas: 'Emas', perak: 'Perak', perunggu: 'Perunggu', lolos: 'Lolos', gugur: 'Gugur',
  menang: 'Menang', kalah: 'Kalah · masih bertanding',
}
const bakuLawan = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Hasil publik dari satu laporan; null kalau jenis hasilnya tidak dikenali. */
export function hasilPublik(l: Pick<LaporanSah, 'hasil' | 'peringkat' | 'nilai_teks'>): HasilPartai | null {
  const jenis = l.hasil as HasilPartai['jenis']
  const label = jenis === 'peringkat' ? `Peringkat ${l.peringkat ?? '?'}` : LABEL_HASIL_PUBLIK[jenis]
  if (!label) return null
  const skor = (l.nilai_teks ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) || null
  return { jenis, label, skor }
}

/**
 * Pasangkan laporan disahkan ke partai. Utamakan tautan partai_id; kalau laporan
 * tidak bertaut, cocokkan cabor + tanggal + lawan yang sama (huruf besar/kecil
 * diabaikan). Satu laporan hanya dipakai satu partai; yang terbaru menang.
 */
export function pasangHasil(partai: { id: number; cabor_id: number; tanggal: string; lawan: string | null }[], laporan: LaporanSah[]): Map<number, HasilPartai> {
  const hasil = new Map<number, HasilPartai>()
  const terpakai = new Set<number>()
  const terbaruDulu = [...laporan].sort((a, b) => b.id - a.id)
  for (const p of partai) {
    const l = terbaruDulu.find(x => !terpakai.has(x.id) && x.partai_id === p.id)
      ?? terbaruDulu.find(x => !terpakai.has(x.id) && x.partai_id == null && x.cabor_id === p.cabor_id && x.tanggal === p.tanggal
        && !!bakuLawan(p.lawan) && bakuLawan(x.lawan) === bakuLawan(p.lawan))
    if (!l) continue
    const h = hasilPublik(l)
    if (!h) continue
    terpakai.add(l.id)
    hasil.set(p.id, h)
  }
  return hasil
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

// ── Perolehan medali (halaman publik) ────────────────────────────────────────
// Hanya laporan lapangan yang sudah DISAHKAN KONIDA. Satu baris = satu medali
// nomor (beregu tetap satu medali). Nama atlet ikut tampil — keputusan Bos 21 Okt.
export type JenisMedali = 'emas' | 'perak' | 'perunggu'
export interface MedaliPublik { id: number; tanggal: string; cabor: string; nomor: string; medali: JenisMedali; atlet: string[] }
export interface RekapPublik { emas: number; perak: number; perunggu: number; total: number }

const BOBOT_MEDALI: Record<JenisMedali, number> = { emas: 0, perak: 1, perunggu: 2 }
export const adalahMedali = (h: unknown): h is JenisMedali => h === 'emas' || h === 'perak' || h === 'perunggu'

export function rekapPublik(medali: MedaliPublik[]): RekapPublik {
  const r = { emas: 0, perak: 0, perunggu: 0, total: 0 }
  for (const m of medali) { r[m.medali]++; r.total++ }
  return r
}

/** Terbaru dulu; pada tanggal yang sama emas → perak → perunggu, lalu cabor dan nomor. */
export function urutMedali(medali: MedaliPublik[]): MedaliPublik[] {
  return [...medali].sort((a, b) => b.tanggal.localeCompare(a.tanggal) || BOBOT_MEDALI[a.medali] - BOBOT_MEDALI[b.medali]
    || a.cabor.localeCompare(b.cabor, 'id') || a.nomor.localeCompare(b.nomor, 'id') || a.id - b.id)
}

/** Medali per cabor, urut emas → perak → perunggu terbanyak (gaya klasemen). */
export function medaliPerCabor(medali: MedaliPublik[]): ({ cabor: string } & RekapPublik)[] {
  const peta = new Map<string, RekapPublik>()
  for (const m of medali) {
    const r = peta.get(m.cabor) ?? { emas: 0, perak: 0, perunggu: 0, total: 0 }
    r[m.medali]++; r.total++; peta.set(m.cabor, r)
  }
  return Array.from(peta, ([cabor, r]) => ({ cabor, ...r }))
    .sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu || a.cabor.localeCompare(b.cabor, 'id'))
}

// ── Kabar LOLOS di halaman depan ─────────────────────────────────────────────
// Bos 30 Okt 2026: begitu KONIDA mengesahkan laporan "lolos", publik melihat
// pengumumannya di bagian paling atas selama cabor itu masih berjalan.

/** Laporan "lolos" terbaru satu nomor, siap tampil di publik (tanpa keterangan bebas PIC). */
export interface KabarLolos { id: number; jenis: 'lolos' | 'menang'; cabor: string; nomor: string; tanggal: string; lawan: string | null; skor: string | null; babak: string | null }

const bakuNomor = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Per cabor + nomor, ambil laporan disahkan TERBARU (tanggal, lalu id). Hanya
 * yang terbarunya "lolos" atau "menang" (laga pool) yang jadi kabar; kalah di pool
 * menurunkan kabar tanpa menyatakan tersingkir: kalau sesudahnya gugur atau sudah
 * medali, perjalanan nomor itu selesai dan kabar lolosnya turun. Babak diambil
 * dari partai yang bertaut (partai_id, atau cabor + tanggal + lawan sama).
 */
export function pilihKabarLolos(
  laporan: (LaporanSah & { nomor_teks: string | null })[],
  namaCabor: Map<number, string>,
  partai: { id: number; cabor_id: number; tanggal: string; lawan: string | null; babak: string | null }[],
): KabarLolos[] {
  const terbaru = new Map<string, LaporanSah & { nomor_teks: string | null }>()
  for (const l of laporan) {
    const k = `${l.cabor_id}|${bakuNomor(l.nomor_teks)}`
    const ada = terbaru.get(k)
    if (!ada || l.tanggal > ada.tanggal || (l.tanggal === ada.tanggal && l.id > ada.id)) terbaru.set(k, l)
  }
  const kabar: KabarLolos[] = []
  for (const l of Array.from(terbaru.values())) {
    if (l.hasil !== 'lolos' && l.hasil !== 'menang') continue
    const p = partai.find(x => x.id === l.partai_id)
      ?? (l.partai_id == null ? partai.find(x => x.cabor_id === l.cabor_id && x.tanggal === l.tanggal && !!bakuLawan(x.lawan) && bakuLawan(x.lawan) === bakuLawan(l.lawan)) : undefined)
    kabar.push({
      id: l.id, jenis: l.hasil as KabarLolos['jenis'], cabor: namaCabor.get(l.cabor_id) ?? '', nomor: (l.nomor_teks ?? '').trim(), tanggal: l.tanggal,
      lawan: p?.lawan ?? (l.lawan?.trim() || null), skor: hasilPublik(l)?.skor ?? null, babak: p?.babak ?? null,
    })
  }
  return kabar.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id)
}

const bakuCabor = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
const tambahHari = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)

/**
 * Kabar lolos yang masih tayang pada `hariIni`: sejak tanggal laporan sampai
 * kegiatan cabornya selesai (jadwal_cabor, nama cabor sama). Kalau cabornya
 * tidak ada di jadwal, tayang 3 hari. Ikut disertakan laga berikutnya nomor itu.
 */
export function kabarLolosAktif(kabar: KabarLolos[], jadwal: BarisPublik[], partai: PartaiPublik[], hariIni: string):
  (KabarLolos & { sampai: string; berikut: PartaiPublik | null })[] {
  return kabar.flatMap(k => {
    const selesai = jadwal.filter(b => b.jenis === 'pertandingan' && bakuCabor(b.cabor) === bakuCabor(k.cabor))
      .map(b => b.selesai ?? b.mulai).filter((x): x is string => !!x).sort().reverse()[0]
    const sampai = selesai && selesai >= k.tanggal ? selesai : tambahHari(k.tanggal, 3)
    if (hariIni < k.tanggal || hariIni > sampai) return []
    const berikut = partai.filter(p => bakuCabor(p.cabor) === bakuCabor(k.cabor) && (bakuNomor(p.nomor) === bakuNomor(k.nomor) || (!!p.disiplin && bakuNomor(`${p.disiplin} ${p.nomor}`) === bakuNomor(k.nomor)))
      && p.tanggal >= hariIni && p.tanggal > k.tanggal && (p.status === 'terjadwal' || p.status === 'berlangsung' || p.status === 'ditunda'))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (a.jam ?? '99').localeCompare(b.jam ?? '99'))[0] ?? null
    return [{ ...k, sampai, berikut }]
  })
}

/** "SITI NAJIRA ADABINA" → "Siti Najira Adabina" (nama dari berkas pendaftaran KONI yang huruf besar semua). */
export const namaRapi = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase())

/**
 * Nama atlet satu partai: atlet yang tersambung ke data atlet, ditambah atlet
 * yang ada di daftar pendaftaran resmi (disiplin + nomor sama) tapi belum punya
 * data atlet (belum ada NIK). Tambahan hanya kalau partai memang punya daftar
 * atlet — partai tanpa atlet (mis. Futsal) tetap kosong, bukan setengah tim.
 */
export function namaAtletPartai(tersambung: string[], belumTersambung: string[]): string[] {
  if (!tersambung.length) return tersambung
  // Nama yang tersimpan HURUF BESAR SEMUA dirapikan; yang sudah campuran dibiarkan.
  tersambung = tersambung.map(n => /[A-Z]/.test(n) && n === n.toUpperCase() ? namaRapi(n) : n)
  const ada = new Set(tersambung.map(n => n.toLowerCase()))
  return [...tersambung, ...belumTersambung.map(namaRapi).filter(n => !ada.has(n.toLowerCase()))]
}
