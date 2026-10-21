// src/lib/impor-matriks.ts
// Rencana pembaruan jadwal_cabor dari berkas "Matriks Jadwal Harian" KONI Kab. Bandung
// (sheet "Matrix Jadwal Harian": satu baris per tanggal × kegiatan × venue).
// Murni hitungan tanpa database — dipakai halaman Kelola Jadwal dan
// scripts/impor-matriks-jadwal.ts (npm run uji:impor-matriks).
//
// BUKAN impor ulang dari nol. Baris yang ada diperbarui di tempat (lewat id),
// supaya akomodasi dan kontak panitia yang sudah ditempelkan impor lain tidak
// hilang. Yang diubah hanya: tanggal mulai/selesai, venue, dan — bila kotanya
// memang pindah — tuan rumah. Baris yang tidak ada di matriks dibiarkan.

import { caborDariKlasifikasi, tanggalJadwal } from './jadwal'

const norm = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
const rapi = (s: any) => String(s ?? '').replace(/\s+/g, ' ').trim()
/** Sel venue kadang berisi beberapa tempat, satu per baris. Barisnya dijadikan " / " supaya tidak menyatu. */
const rapiVenue = (s: any) => String(s ?? '').split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' / ')
/** "KOTA DEPOK" dan "DEPOK" adalah kota yang sama; yang dibandingkan intinya. */
const kotaInti = (s: string | null | undefined) => norm(s ?? '').replace(/^(KOTA|KAB|KABUPATEN)\s+/, '')

/**
 * Nama kegiatan di matriks → nama baris yang sudah ada di sistem, untuk yang
 * penulisannya berbeda. Beberapa kegiatan matriks bisa menunjuk satu baris
 * (BMX Park/Trial/Flat Land; X Rugby dan Rugby 7s) — rentangnya digabung.
 */
export const PADANAN: Record<string, string> = {
  'RENANG':                       'Aquatic - Renang',
  'SEPEDA BMX PARK':              'Balap Sepeda BMX - Freestyle Park, Flat Land, Trial',
  'SEPEDA BMX TRIAL':             'Balap Sepeda BMX - Freestyle Park, Flat Land, Trial',
  'SEPEDA BMX FLAT LAND':         'Balap Sepeda BMX - Freestyle Park, Flat Land, Trial',
  'BMX RACING':                   'Balap Sepeda BMX - Racing',
  'SEPEDA ROAD RACE':             'Balap Sepeda Road',
  'SEPEDA MTB':                   'Balap Sepeda MTB',
  'AEROMODELING':                 'Aerosport - Aeromodeling',
  'EQUESTRIAN DRESSAGE':          'Berkuda Dressage',
  // Baris Dayung memakai nama berkas KONI 21 Okt 2026 ("Canoeing Sprint & SUP",
  // "Rowing Classic", "Rowing - Beach / Coastal"); padanan ini untuk berkas lama.
  'CANOEING':                     'Canoeing Sprint & SUP',
  'ROWING':                       'Rowing Classic',
  'ROWING BEACH':                 'Rowing - Beach / Coastal',
  'RENANG PERAIRAN TERBUKA OWS':  'Akuatik - Renang Perairan Terbuka',
  'RENANG ARTISTIK':              'Akuatik - Renang Artistik',
  'SKATEBOARD':                   'Sakteboard',
  'X RUGBY':                      'Rugby',
  'RUGBY 7 S':                    'Rugby',
  'UPACARA PEMBUKAAN':            'UPACARA PEMBUKAAN PORPROV XV 2026',
  'UPACARA PENUTUPAN':            'UPACARA PENUTUPAN PORPROV XV 2026',
}

export interface BarisAda {
  id: number; cabor_disiplin: string; mulai: string | null; selesai: string | null
  venue: string | null; tuan_rumah: string | null; akomodasi?: string | null; catatan?: string | null
}
export interface Ubahan { id: number; nama: string; isi: Record<string, any>; ket: string[] }
export interface Tambahan {
  jenis: 'pertandingan' | 'upacara'; wilayah: string | null; tuan_rumah: string | null; cabor_disiplin: string
  cabor_nama_raw: string | null; mulai: string; selesai: string; venue: string | null; sumber: string
}
export interface RencanaMatriks {
  baris_harian: number; kegiatan: number; sama: number
  ubah: Ubahan[]; tambah: Tambahan[]
  tak_di_matriks: { id: number; nama: string; mulai: string | null; selesai: string | null }[]
  /** Baris harian yang berisi Jam, Nomor, Nama Atlet, atau Lawan — bahan jadwal partai. */
  partai: PartaiMatriks[]
}

export interface PartaiMatriks {
  tanggal: string; kegiatan: string; jadwal_id: number | null
  jam: string | null; nomor: string | null; atlet: string | null; lawan: string | null; venue: string | null
}

/** Sel jam: "09.00", "9:00", atau pecahan hari dari Excel (0,375 = 09:00). */
export function jamSel(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) {
    const menit = Math.round((v - Math.floor(v)) * 1440) % 1440
    return `${String(Math.floor(menit / 60)).padStart(2, '0')}:${String(menit % 60).padStart(2, '0')}`
  }
  const m = /^(\d{1,2})[:.](\d{2})/.exec(String(v).trim())
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const tglSingkat = (iso: string) => `${Number(iso.slice(8))} ${BULAN[Number(iso.slice(5, 7)) - 1]}`

/**
 * Isi sheet (array of array; sel tanggal mentah — nomor seri Excel atau Date)
 * dibandingkan dengan baris yang ada. Melempar Error berpesan bila bentuk
 * berkasnya tidak dikenali.
 */
export function rencanaMatriks(baris: any[][], lama: BarisAda[], caborDb: string[], sumber: string): RencanaMatriks {
  const iKepala = baris.findIndex(r => rapi(r?.[1]) === 'Tanggal' && rapi(r?.[5]).startsWith('Cabor'))
  if (iKepala < 0) throw new Error('Baris kepala (No., Tanggal, …, Cabor / Kegiatan) tidak ketemu. Pastikan ini berkas Matriks Jadwal Harian KONI.')

  type Keg = { nama: string; tanggal: Set<string>; venue: Set<string>; kota: Set<string>; klaster: Set<string> }
  const keg = new Map<string, Keg>()
  let terbaca = 0
  for (const r of baris.slice(iKepala + 1)) {
    const nama = rapi(r?.[5]); const t = tanggalJadwal(r?.[1])
    if (!nama || !t) continue
    terbaca++
    const k = keg.get(norm(nama)) ?? { nama, tanggal: new Set(), venue: new Set(), kota: new Set(), klaster: new Set() }
    k.tanggal.add(t); if (rapiVenue(r[10])) k.venue.add(rapiVenue(r[10])); if (rapi(r[4])) k.kota.add(rapi(r[4])); if (rapi(r[3])) k.klaster.add(rapi(r[3]))
    keg.set(norm(nama), k)
  }
  if (terbaca === 0) throw new Error('Tidak ada baris jadwal yang terbaca di bawah baris kepala.')

  const perNama = new Map(lama.map(l => [norm(l.cabor_disiplin), l]))
  const tujuan = new Map<number, Keg[]>()
  const baru: Keg[] = []
  keg.forEach((k, kunci) => {
    const sasaran = perNama.get(kunci) ?? (PADANAN[kunci] ? perNama.get(norm(PADANAN[kunci])) : undefined)
    if (!sasaran) { baru.push(k); return }
    tujuan.set(sasaran.id, [...(tujuan.get(sasaran.id) ?? []), k])
  })

  const partai: PartaiMatriks[] = []
  for (const r of baris.slice(iKepala + 1)) {
    const nama = rapi(r?.[5]); const t = tanggalJadwal(r?.[1])
    if (!nama || !t) continue
    const isi = { jam: jamSel(r?.[2]), nomor: rapi(r?.[6]) || null, atlet: rapiVenue(r?.[7]).replace(/ \/ /g, ', ') || null, lawan: rapi(r?.[8]) || null }
    if (!isi.jam && !isi.nomor && !isi.atlet && !isi.lawan) continue
    const kunci = norm(nama)
    const sasaran = perNama.get(kunci) ?? (PADANAN[kunci] ? perNama.get(norm(PADANAN[kunci])) : undefined)
    partai.push({ tanggal: t, kegiatan: nama, jadwal_id: sasaran?.id ?? null, ...isi, venue: rapiVenue(r?.[10]) || null })
  }

  const ubah: Ubahan[] = []
  let sama = 0
  tujuan.forEach((ks, id) => {
    const l = lama.find(x => x.id === id)!
    const semuaTgl = ks.flatMap(k => Array.from(k.tanggal)).sort()
    const mulai = semuaTgl[0], selesai = semuaTgl[semuaTgl.length - 1]
    const venue = Array.from(new Set(ks.flatMap(k => Array.from(k.venue)))).join(' | ')
    const kota = Array.from(new Set(ks.flatMap(k => Array.from(k.kota))))
    const klaster = Array.from(new Set(ks.flatMap(k => Array.from(k.klaster))))
    const isi: Record<string, any> = {}; const ket: string[] = []
    if (l.mulai !== mulai || l.selesai !== selesai) {
      isi.mulai = mulai; isi.selesai = selesai
      ket.push(`tanggal ${l.mulai ? tglSingkat(l.mulai) : '?'}–${l.selesai ? tglSingkat(l.selesai) : '?'} → ${tglSingkat(mulai)}–${tglSingkat(selesai)}`)
    }
    // Venue dianggap sama bila tulisan lama memuat tulisan baru atau sebaliknya
    // ("Situ Cipule KAB. KARAWANG" vs "Situ Cipule") — imbuhan kota bukan perubahan.
    const vl = norm(l.venue ?? ''), vb = norm(venue)
    if (venue && !(vl === vb || (vl && vb && (vl.includes(vb) || vb.includes(vl))))) {
      isi.venue = venue; ket.push(`venue "${rapi(l.venue)}" → "${venue}"`)
    }
    if (kota.length === 1 && kotaInti(l.tuan_rumah) !== kotaInti(kota[0])) {
      isi.tuan_rumah = kota[0]; if (klaster.length === 1) isi.wilayah = klaster[0]
      // Kota menginap yang lama tidak berlaku lagi bila pertandingannya pindah kota.
      if (l.akomodasi) isi.akomodasi = null
      ket.push(`kota ${l.tuan_rumah ?? '(kosong)'} → ${kota[0]}${l.akomodasi ? ` (akomodasi "${l.akomodasi}" dikosongkan)` : ''}`)
    }
    if (ks.length > 1 && new Set(ks.map(k => Array.from(k.tanggal).sort().join())).size > 1) {
      const rinci = ks.map(k => { const t = Array.from(k.tanggal).sort(); return `${k.nama} ${tglSingkat(t[0])}–${tglSingkat(t[t.length - 1])}` }).join('; ')
      if (l.catatan !== rinci) { isi.catatan = rinci; ket.push(`rincian: ${rinci}`) }
    }
    if (Object.keys(isi).length === 0) { sama++; return }
    isi.sumber = sumber
    ubah.push({ id, nama: l.cabor_disiplin, isi, ket })
  })

  const tambah: Tambahan[] = baru.map(k => {
    const t = Array.from(k.tanggal).sort()
    return {
      jenis: /UPACARA/i.test(k.nama) ? 'upacara' : 'pertandingan',
      wilayah: Array.from(k.klaster)[0] ?? null, tuan_rumah: Array.from(k.kota)[0] ?? null,
      cabor_disiplin: k.nama, cabor_nama_raw: caborDariKlasifikasi(k.nama, caborDb),
      mulai: t[0], selesai: t[t.length - 1], venue: Array.from(k.venue).join(' | ') || null, sumber,
    }
  })
  const tak_di_matriks = lama.filter(l => !tujuan.has(l.id)).map(l => ({ id: l.id, nama: l.cabor_disiplin, mulai: l.mulai, selesai: l.selesai }))

  return { baris_harian: terbaca, kegiatan: keg.size, sama, ubah, tambah, tak_di_matriks, partai }
}

// ── Jadwal partai dari matriks ───────────────────────────────────────────────

export interface PartaiAda { id: number; cabor_id: number; tanggal: string; nomor_teks: string; lawan: string | null; jam: string | null; venue: string | null; atlet_ids: number[] }
export interface RencanaPartai {
  tambah: { cabor_id: number; tanggal: string; jam: string | null; nomor_teks: string; lawan: string | null; venue: string | null; atlet_ids: number[]; keterangan: string | null }[]
  lengkapi: { id: number; isi: Record<string, any>; ket: string }[]
  tak_tertaut: { kegiatan: string; tanggal: string }[]
}

/**
 * Partai dari matriks dibandingkan dengan yang sudah ada. Satu partai dikenali
 * dari cabor + tanggal + nomor + lawan. Partai yang sudah ada hanya DILENGKAPI
 * (jam, venue, atlet yang masih kosong) — isian PIC tidak pernah ditimpa berkas.
 * Nama atlet dicocokkan per cabor; yang tidak ketemu ditulis di keterangan.
 */
export function rencanaPartai(dariMatriks: PartaiMatriks[], ada: PartaiAda[], caborJadwal: Map<number, number>, atletCabor: Map<number, { id: number; nama: string }[]>): RencanaPartai {
  const hasil: RencanaPartai = { tambah: [], lengkapi: [], tak_tertaut: [] }
  const kunci = (c: number, t: string, n: string, l: string | null) => `${c}|${t}|${norm(n)}|${norm(l ?? '')}`
  const peta = new Map(ada.map(p => [kunci(p.cabor_id, p.tanggal, p.nomor_teks, p.lawan), p]))
  const sudah = new Set<string>()
  for (const m of dariMatriks) {
    const cabor = m.jadwal_id != null ? caborJadwal.get(m.jadwal_id) : undefined
    if (!cabor) { hasil.tak_tertaut.push({ kegiatan: m.kegiatan, tanggal: m.tanggal }); continue }
    const nomor = m.nomor ? `${m.kegiatan} · ${m.nomor}` : m.kegiatan
    const k = kunci(cabor, m.tanggal, nomor, m.lawan)
    if (sudah.has(k)) continue
    sudah.add(k)
    const daftar = atletCabor.get(cabor) ?? []
    const nama = (m.atlet ?? '').split(/\s*[,;]\s*/).map(x => x.trim()).filter(Boolean)
    const cocok = nama.map(n => daftar.find(a => norm(a.nama) === norm(n))?.id ?? null)
    const atlet_ids = cocok.filter((x): x is number => x != null)
    const tak = nama.filter((_, i) => cocok[i] == null)
    const lama = peta.get(k)
    if (!lama) {
      hasil.tambah.push({ cabor_id: cabor, tanggal: m.tanggal, jam: m.jam, nomor_teks: nomor, lawan: m.lawan, venue: m.venue, atlet_ids,
        keterangan: tak.length ? `Atlet di berkas KONI: ${tak.join(', ')}` : null })
      continue
    }
    const isi: Record<string, any> = {}
    if (!lama.jam && m.jam) isi.jam = m.jam
    if (!lama.venue && m.venue) isi.venue = m.venue
    if (lama.atlet_ids.length === 0 && atlet_ids.length) isi.atlet_ids = atlet_ids
    if (Object.keys(isi).length) hasil.lengkapi.push({ id: lama.id, isi, ket: `${nomor} ${m.tanggal}: dilengkapi ${Object.keys(isi).join(', ')}` })
  }
  return hasil
}
