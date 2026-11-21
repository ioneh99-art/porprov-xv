// src/lib/bahan-porprov.ts — Bahan PORPROV berikutnya (hitungan murni) dari gudang PORPROV XV:
// beban jadwal per hari, kalender hari × cabor, beban tiap venue, dan nomor sepi peserta
// (nomor dengan peserta ≤ 3 = semua peserta pulang bermedali).

export interface BahanLagaJ {
  ref: number; tanggal: string | null; jam: string | null; caborSitusId: number | null
  venue: string | null; klaster: string | null; status: string | null; perebutanMedali: boolean
}
export interface BahanNomorJ { situsId: number; nama: string; caborSitusId: number | null; disiplin: string | null; gender: string | null; jumlahPeserta: number | null }
export interface BahanMedaliJ { nomorSitusId: number; medali: 'emas' | 'perak' | 'perunggu'; kontingenSitusId: number | null }

export interface HariJadwal { tanggal: string; laga: number; dibatalkan: number; perebutanMedali: number; cabor: number; venue: number }
export interface VenueBeban { nama: string; klaster: string | null; laga: number; hari: number; cabor: number[]; puncak: { tanggal: string; laga: number } | null }
export interface NomorSepi { situsId: number; nama: string; caborSitusId: number | null; disiplin: string | null; gender: string | null; peserta: number; medali: { medali: string; kontingenSitusId: number | null }[] }
export interface SepiKontingen { kontingenSitusId: number; medaliSepi: number; emasSepi: number; medaliTotal: number }

export interface BahanPorprov {
  ringkas: { hari: number; mulai: string | null; selesai: string | null; laga: number; dibatalkan: number; venue: number; nomorSepi: number; nomorTipis: number }
  hari: HariJadwal[]
  /** kalender[tanggal][caborSitusId] = jumlah laga (tanpa yang dibatalkan) */
  kalender: Record<string, Record<number, number>>
  venue: VenueBeban[]
  nomorSepi: NomorSepi[]
  sepiPerKontingen: SepiKontingen[]
}

/** Peserta ≤ 3: setiap peserta pasti naik podium. */
export const BATAS_SEPI = 3
/** Peserta 4–5: persaingan tipis. */
export const BATAS_TIPIS = 5

const batal = (s: string | null) => (s ?? '').toLowerCase().startsWith('dibatal')

export function hitungBahan(b: { laga: BahanLagaJ[]; nomor: BahanNomorJ[]; medali: BahanMedaliJ[] }): BahanPorprov {
  const perHari = new Map<string, { laga: number; dibatalkan: number; medali: number; cabor: Set<number>; venue: Set<string> }>()
  const kalender: Record<string, Record<number, number>> = {}
  const perVenue = new Map<string, { klaster: string | null; laga: number; hari: Map<string, number>; cabor: Set<number> }>()
  let dibatalkan = 0
  for (const l of b.laga) {
    if (!l.tanggal) continue
    const h = perHari.get(l.tanggal) ?? { laga: 0, dibatalkan: 0, medali: 0, cabor: new Set<number>(), venue: new Set<string>() }
    if (batal(l.status)) { h.dibatalkan++; dibatalkan++; perHari.set(l.tanggal, h); continue }
    h.laga++
    if (l.perebutanMedali) h.medali++
    if (l.caborSitusId != null) {
      h.cabor.add(l.caborSitusId)
      const k = (kalender[l.tanggal] ??= {}); k[l.caborSitusId] = (k[l.caborSitusId] ?? 0) + 1
    }
    if (l.venue) {
      h.venue.add(l.venue)
      const v = perVenue.get(l.venue) ?? { klaster: l.klaster, laga: 0, hari: new Map<string, number>(), cabor: new Set<number>() }
      v.laga++; v.hari.set(l.tanggal, (v.hari.get(l.tanggal) ?? 0) + 1)
      if (l.caborSitusId != null) v.cabor.add(l.caborSitusId)
      if (!v.klaster && l.klaster) v.klaster = l.klaster
      perVenue.set(l.venue, v)
    }
    perHari.set(l.tanggal, h)
  }
  const hari: HariJadwal[] = Array.from(perHari.entries()).sort((x, y) => x[0].localeCompare(y[0]))
    .map(([tanggal, h]) => ({ tanggal, laga: h.laga, dibatalkan: h.dibatalkan, perebutanMedali: h.medali, cabor: h.cabor.size, venue: h.venue.size }))

  const venue: VenueBeban[] = Array.from(perVenue.entries()).map(([nama, v]) => {
    const puncak = Array.from(v.hari.entries()).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]
    return { nama, klaster: v.klaster, laga: v.laga, hari: v.hari.size, cabor: Array.from(v.cabor), puncak: puncak ? { tanggal: puncak[0], laga: puncak[1] } : null }
  }).sort((x, y) => y.laga - x.laga || x.nama.localeCompare(y.nama))

  const medaliPerNomor = new Map<number, BahanMedaliJ[]>()
  b.medali.forEach(m => medaliPerNomor.set(m.nomorSitusId, [...(medaliPerNomor.get(m.nomorSitusId) ?? []), m]))
  const nomorSepi: NomorSepi[] = b.nomor.filter(n => n.jumlahPeserta != null && n.jumlahPeserta > 0 && n.jumlahPeserta <= BATAS_TIPIS)
    .map(n => ({
      situsId: n.situsId, nama: n.nama, caborSitusId: n.caborSitusId, disiplin: n.disiplin, gender: n.gender, peserta: n.jumlahPeserta!,
      medali: (medaliPerNomor.get(n.situsId) ?? []).map(m => ({ medali: m.medali, kontingenSitusId: m.kontingenSitusId })),
    }))
    .sort((x, y) => x.peserta - y.peserta || x.nama.localeCompare(y.nama))

  const idSepi = new Set(nomorSepi.filter(n => n.peserta <= BATAS_SEPI).map(n => n.situsId))
  const perK = new Map<number, SepiKontingen>()
  for (const m of b.medali) {
    if (m.kontingenSitusId == null) continue
    const s = perK.get(m.kontingenSitusId) ?? { kontingenSitusId: m.kontingenSitusId, medaliSepi: 0, emasSepi: 0, medaliTotal: 0 }
    s.medaliTotal++
    if (idSepi.has(m.nomorSitusId)) { s.medaliSepi++; if (m.medali === 'emas') s.emasSepi++ }
    perK.set(m.kontingenSitusId, s)
  }
  const sepiPerKontingen = Array.from(perK.values()).filter(s => s.medaliSepi > 0)
    .sort((x, y) => y.medaliSepi - x.medaliSepi || y.emasSepi - x.emasSepi)

  return {
    ringkas: {
      hari: hari.length, mulai: hari[0]?.tanggal ?? null, selesai: hari[hari.length - 1]?.tanggal ?? null,
      laga: hari.reduce((t, h) => t + h.laga, 0), dibatalkan, venue: venue.length,
      nomorSepi: nomorSepi.filter(n => n.peserta <= BATAS_SEPI).length,
      nomorTipis: nomorSepi.filter(n => n.peserta > BATAS_SEPI).length,
    },
    hari, kalender, venue, nomorSepi, sepiPerKontingen,
  }
}
