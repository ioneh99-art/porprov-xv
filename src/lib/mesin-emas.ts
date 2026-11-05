// src/lib/mesin-emas.ts
// Mesin Emas: target emas KONI (proyeksi_medali) yang hasilnya sudah tercatat final di
// situs KONI Jabar langsung DISAHKAN tanpa menunggu tombol KONIDA (keputusan Bos, 5 Nov 2026).
// Hanya nomor yang ada di daftar target; medali di luar target tetap lewat Antrean.
// Apa pun medalinya (emas/perak/perunggu) — yang dicatat adalah hasil sebenarnya.
//
// Pengaman: mesin hanya mengesahkan bila cocoknya JELAS — cabor sama, angka kelas/jarak
// sama persis, putra/putri tidak bertentangan, nama atlet cocok, tanggal ±2 hari dari target.
// Bila PIC melaporkan hasil berbeda, atau laporan itu pernah dikoreksi KONIDA, mesin diam
// dan keputusan tetap di tangan KONIDA. Fungsi di sini murni (npm run uji:mesin-emas).

import { baku } from './konijabar'
import { genderNomor } from './lawan-luar'
import { pasangKembar, rencanaSahkan, type LaporKembar } from './lapor-kembar'

/** Nama pemutus yang tercatat di laporan (diputus_oleh) — juga penanda di layar. */
export const MESIN_EMAS = 'Mesin Emas (otomatis)'
export const MEDALI = ['emas', 'perak', 'perunggu'] as const
export const SELISIH_HARI = 2

export interface TargetEmas { urutan: number; tanggal: string; cabor_id: number | null; nomor: string | null; atlet: string | null }
export interface LaporMesin extends LaporKembar {
  /** Nama atlet laporan. */
  atlet: string[]
  /** Pernah dikembalikan/ditolak/diperbaiki KONIDA → mesin tidak menyentuhnya lagi. */
  dikoreksi?: boolean
}
export interface SahMesin { urutan: number; dari: number; sahkan: number | null; tutup: number | null; hasil: string }
export interface TahanMesin { urutan: number; laporan: number; alasan: string }

const BUANG = new Set(['PA', 'PI', 'PUTRA', 'PUTRI', 'KELAS', 'NOMOR', 'SD', 'S', 'D', 'KG', 'M'])
const rapikan = (s: string | null | undefined) =>
  (s ?? '').toUpperCase().replace(/(\d)[.,](\d{3})\b/g, '$1$2')
    .replace(/([A-Z])(\d)/g, '$1 $2').replace(/(\d)([A-Z])/g, '$1 $2').replace(/[^A-Z0-9]+/g, ' ').trim()
const kata = (s: string | null | undefined) => rapikan(s).split(' ').filter(w => w && !BUANG.has(w))
const angka = (s: string | null | undefined) => Array.from(new Set(rapikan(s).split(' ').filter(w => /^\d+$/.test(w)).map(Number))).sort((a, b) => a - b)

/**
 * Nomor target dan nomor laporan sama? Angkanya (kelas berat, jarak, nomor perahu) harus
 * persis sama — "Bebas 52 Kg" ≠ "Bebas 62 Kg" walau kata lainnya sama — dan sebagian besar
 * kata lainnya sama. Putra/putri yang bertentangan → tidak.
 */
export function nomorCocok(target: string | null, laporan: string | null): boolean {
  if (!target || !laporan) return false
  const ga = genderNomor(target), gb = genderNomor(laporan)
  if (ga && gb && ga !== gb) return false
  if (angka(target).join(',') !== angka(laporan).join(',')) return false
  const a = new Set(kata(target).filter(w => !/^\d+$/.test(w))), b = new Set(kata(laporan).filter(w => !/^\d+$/.test(w)))
  if (!a.size || !b.size) return angka(target).length > 0
  let sama = 0
  a.forEach(w => { if (b.has(w)) sama++ })
  return sama / Math.min(a.size, b.size) >= 0.6
}

const NAMA_UMUM = new Set(['muhammad', 'muhamad', 'mohammad', 'mohamad', 'moch', 'mochamad', 'mohamed', 'muh', 'team', 'tim', 'kab', 'bandung'])
const kataNama = (s: string) => baku(s).split(' ').filter(w => w.length >= 3 && !NAMA_UMUM.has(w))

/**
 * Atlet target ada di laporan? Target ditulis singkat ("HERLIN APRILIA", "LUTFAN ANANDA - M FAISAL")
 * — cukup satu nama orang yang satu katanya sama dengan nama atlet di laporan.
 * Target tanpa nama ("TEAM") → tidak diperiksa (nomor beregu).
 */
export function atletCocok(target: string | null, atletLaporan: string[]): boolean {
  if (!target || /^\s*(team|tim)\s*$/i.test(target)) return true
  const ada = new Set(atletLaporan.flatMap(kataNama))
  if (!ada.size) return false
  return target.split(/[-,]/).some(orang => kataNama(orang).some(w => ada.has(w)))
}

const hari = (iso: string) => Date.parse(iso + 'T00:00:00Z') / 86_400_000
const adalahMedali = (h: string) => (MEDALI as readonly string[]).includes(h)

/**
 * Apa yang disahkan mesin untuk target yang tanggalnya sudah tiba (≤ hariIni).
 * `laporan` = semua laporan kontingen (yang ditolak boleh ikut; diabaikan).
 */
export function rencanaMesinEmas(target: TargetEmas[], laporan: LaporMesin[], hariIni: string): { sahkan: SahMesin[]; tahan: TahanMesin[] } {
  const hidup = laporan.filter(l => l.status !== 'ditolak')
  const sahkan: SahMesin[] = [], tahan: TahanMesin[] = []
  const dipakai = new Set<number>()
  const urut = [...target].filter(t => t.tanggal <= hariIni && t.cabor_id != null)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.urutan - b.urutan)

  for (const t of urut) {
    const nomorIni = hidup.filter(l => l.cabor_id === t.cabor_id && Math.abs(hari(l.tanggal) - hari(t.tanggal)) <= SELISIH_HARI && nomorCocok(t.nomor, l.nomor_teks ?? null))
    const medali = nomorIni.filter(l => adalahMedali(l.hasil))
    if (medali.some(l => l.status === 'disahkan')) continue // sudah sah (PIC/KONIDA/mesin)

    const situs = medali.filter(l => l.ref_luar && l.status === 'menunggu' && !dipakai.has(l.id) && atletCocok(t.atlet, l.atlet))
    if (!situs.length) continue
    if (situs.some(l => l.dikoreksi)) continue // KONIDA sudah turun tangan — tidak diulang mesin
    if (situs.length > 1) { tahan.push({ urutan: t.urutan, laporan: situs[0].id, alasan: `Situs mencatat ${situs.length} medali untuk nomor ini (#${situs.map(l => l.id).join(', #')}) — pilih manual.` }); continue }
    const s = situs[0]

    const pic = medali.filter(l => !l.ref_luar && l.status === 'menunggu')
    const picBeda = pic.filter(l => l.hasil !== s.hasil)
    if (picBeda.length) { tahan.push({ urutan: t.urutan, laporan: s.id, alasan: `PIC melaporkan ${picBeda.map(l => `${l.hasil} (#${l.id})`).join(', ')}, situs mencatat ${s.hasil} — KONIDA yang memutuskan.` }); continue }

    const sehari = hidup.filter(l => l.cabor_id === s.cabor_id && l.tanggal === s.tanggal)
    const k = pasangKembar(sehari).get(s.id)
    let rencana: { sahkan: number | null; tutup: number | null }
    if (k) {
      const r = rencanaSahkan(s, k)
      if ('galat' in r) { tahan.push({ urutan: t.urutan, laporan: s.id, alasan: r.galat }); continue }
      rencana = r
    } else if (pic.length === 1) {
      // Laporan PIC medali yang sama (lawan ditulis beda sehingga tidak terpasang kembar): PIC yang disahkan.
      rencana = { sahkan: pic[0].id, tutup: s.id }
    } else if (pic.length > 1) {
      tahan.push({ urutan: t.urutan, laporan: s.id, alasan: `Ada ${pic.length} laporan PIC medali ${s.hasil} untuk nomor ini — pilih manual.` }); continue
    } else {
      rencana = { sahkan: s.id, tutup: null }
    }
    dipakai.add(s.id)
    sahkan.push({ urutan: t.urutan, dari: s.id, ...rencana, hasil: s.hasil })
  }
  return { sahkan, tahan }
}
