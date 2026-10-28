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
