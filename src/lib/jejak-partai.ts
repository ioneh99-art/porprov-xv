// src/lib/jejak-partai.ts
// Jejak per partai untuk Report Pertandingan: tiap partai di jadwal dipasangkan
// dengan laporan hasilnya, supaya admin langsung tahu apakah partai itu sudah
// dilaporkan, siapa yang melapor, dan siapa yang mengesahkan atau menolak.
// Murni hitungan (tanpa database) supaya bisa diuji: npm run uji.

export interface PartaiJejak {
  id: number; cabor_id: number; tanggal: string; jam: string | null; nomor_teks: string | null; babak: string | null
  lawan: string | null; venue: string | null; status: string; dibuat_oleh?: string | null; diubah_oleh?: string | null; updated_at?: string | null
}
export interface LaporanJejak {
  id: number; partai_id?: number | null; cabor_id: number; tanggal: string; lawan: string | null; nomor_teks: string
  status: 'menunggu' | 'disahkan' | 'ditolak'; created_at: string; jam?: string | null
}
/** belum = tidak ada laporan; menunggu = dilaporkan, belum diputus; disahkan; ditolak = semua laporannya ditolak. */
export type TahapJejak = 'belum' | 'menunggu' | 'disahkan' | 'ditolak'

export interface BarisJejak<P extends PartaiJejak, L extends LaporanJejak> {
  kunci: string; tanggal: string; cabor_id: number; jam: string | null
  partai: P | null; laporan: L[]; tahap: TahapJejak
  /** Partai yang tanggalnya sudah lewat/hari ini tapi belum ada laporan sama sekali. */
  perluLaporan: boolean
}

const baku = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function tahapDari(laporan: { status: string }[]): TahapJejak {
  if (laporan.some(l => l.status === 'disahkan')) return 'disahkan'
  if (laporan.some(l => l.status === 'menunggu')) return 'menunggu'
  return laporan.length ? 'ditolak' : 'belum'
}

/**
 * Pasangkan laporan ke partai: utamakan partai_id; kalau tidak bertaut, cocokkan
 * cabor + tanggal + lawan yang sama; kalau lawan kosong/beda tapi cabor itu hanya
 * punya SATU partai di tanggal tersebut, pakai partai itu. Sisanya tampil sebagai
 * baris tersendiri (laporan tanpa partai di jadwal) — tidak ada yang hilang.
 */
export function susunJejak<P extends PartaiJejak, L extends LaporanJejak>(partai: P[], laporan: L[], hariIni: string): BarisJejak<P, L>[] {
  const per = new Map<number, L[]>()
  const lepas: L[] = []
  const byId = new Map(partai.map(p => [p.id, p]))
  for (const l of laporan) {
    let p = l.partai_id != null ? byId.get(l.partai_id) : undefined
    if (!p) {
      const hari = partai.filter(x => x.cabor_id === l.cabor_id && x.tanggal === l.tanggal)
      p = (baku(l.lawan) ? hari.find(x => baku(x.lawan) === baku(l.lawan)) : undefined) ?? (hari.length === 1 ? hari[0] : undefined)
    }
    if (p) per.set(p.id, [...(per.get(p.id) ?? []), l])
    else lepas.push(l)
  }
  const urutLap = (a: L, b: L) => b.created_at.localeCompare(a.created_at) || b.id - a.id
  const baris: BarisJejak<P, L>[] = partai.map(p => {
    const lap = (per.get(p.id) ?? []).sort(urutLap)
    const tahap = tahapDari(lap)
    return {
      kunci: `p${p.id}`, tanggal: p.tanggal, cabor_id: p.cabor_id, jam: p.jam, partai: p, laporan: lap, tahap,
      perluLaporan: tahap === 'belum' && p.tanggal <= hariIni && p.status !== 'batal' && p.status !== 'ditunda',
    }
  })
  for (const l of lepas) baris.push({ kunci: `l${l.id}`, tanggal: l.tanggal, cabor_id: l.cabor_id, jam: l.jam ?? null, partai: null, laporan: [l], tahap: tahapDari([l]), perluLaporan: false })
  return baris.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (a.jam ?? '99').localeCompare(b.jam ?? '99') || a.cabor_id - b.cabor_id || a.kunci.localeCompare(b.kunci))
}

export interface RingkasJejak { partai: number; disahkan: number; menunggu: number; ditolak: number; perluLaporan: number }
export function ringkasJejak(baris: BarisJejak<any, any>[]): RingkasJejak {
  const r: RingkasJejak = { partai: 0, disahkan: 0, menunggu: 0, ditolak: 0, perluLaporan: 0 }
  for (const b of baris) {
    r.partai++
    if (b.tahap === 'disahkan') r.disahkan++
    else if (b.tahap === 'menunggu') r.menunggu++
    else if (b.tahap === 'ditolak') r.ditolak++
    if (b.perluLaporan) r.perluLaporan++
  }
  return r
}
