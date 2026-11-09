// src/lib/dayung-profil.ts
// Profil Atlet Dayung (PODSI Jabar): indikator performa dari hasil lomba resmi +
// kelengkapan data atlet (identitas, performa, manajemen).
// Murni hitungan supaya bisa diuji: npm run uji:dayung-profil.

export interface LagaRingkas {
  ref: number; tanggal: string | null; jam: string | null; nomor: string; babak: string | null; kode: string | null
  selesai: boolean; perebutan_medali: boolean
}
export interface PesertaRingkas {
  laga_ref: number; urutan: number; kontingen: string; peringkat: number | null
  medali: 'emas' | 'perak' | 'perunggu' | null; waktu: string | null; waktu_detik: number | null
  atlet_situs_ids: number[]; atlet_nama: string[]
}

export interface LagaAtlet {
  ref: number; tanggal: string | null; jam: string | null; nomor: string; babak: string | null; kode: string | null
  final: boolean; selesai: boolean; peringkat: number | null; jumlahPerahu: number
  waktu: string | null; waktuDetik: number | null; medali: PesertaRingkas['medali']
  /** Waktu juara ÷ waktu atlet × 100 (100 = juara). */
  persenJuara: number | null
  selisihJuara: number | null
  /** Final tanpa medali: selisih ke waktu peringkat 3. */
  selisihMedali: number | null
  /** Heat: true lolos ke final nomor yang sama, false tidak, null belum diketahui. */
  lolosFinal: boolean | null
  rekan: string[]
}

const bulat = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d

export function lagaAtlet(situsId: number, laga: LagaRingkas[], peserta: PesertaRingkas[]): LagaAtlet[] {
  const perLaga = new Map<number, PesertaRingkas[]>()
  peserta.forEach(p => perLaga.set(p.laga_ref, [...(perLaga.get(p.laga_ref) ?? []), p]))
  const petaLaga = new Map(laga.map(l => [l.ref, l]))
  const hasil: LagaAtlet[] = []
  for (const p of peserta) {
    if (!p.atlet_situs_ids.includes(situsId)) continue
    const l = petaLaga.get(p.laga_ref)
    if (!l) continue
    const semua = perLaga.get(l.ref) ?? []
    const berwaktu = semua.filter(x => x.waktu_detik != null).sort((a, b) => a.waktu_detik! - b.waktu_detik!)
    const juara = berwaktu[0]?.waktu_detik ?? null
    const ketiga = semua.find(x => x.peringkat === 3)?.waktu_detik ?? null
    let lolosFinal: boolean | null = null
    if (!l.perebutan_medali) {
      const finalSama = laga.filter(x => x.perebutan_medali && x.nomor === l.nomor)
      const pesertaFinal = finalSama.flatMap(f => perLaga.get(f.ref) ?? [])
      if (pesertaFinal.length) lolosFinal = pesertaFinal.some(x => x.atlet_situs_ids.includes(situsId))
    }
    hasil.push({
      ref: l.ref, tanggal: l.tanggal, jam: l.jam, nomor: l.nomor, babak: l.babak, kode: l.kode,
      final: l.perebutan_medali, selesai: l.selesai, peringkat: p.peringkat, jumlahPerahu: semua.length,
      waktu: p.waktu, waktuDetik: p.waktu_detik, medali: p.medali,
      persenJuara: juara != null && p.waktu_detik ? bulat(juara / p.waktu_detik * 100, 1) : null,
      selisihJuara: juara != null && p.waktu_detik != null ? bulat(p.waktu_detik - juara) : null,
      selisihMedali: l.perebutan_medali && !p.medali && ketiga != null && p.waktu_detik != null ? bulat(p.waktu_detik - ketiga) : null,
      lolosFinal,
      rekan: p.atlet_nama.filter((_, i) => p.atlet_situs_ids[i] !== situsId),
    })
  }
  return hasil.sort((a, b) => `${a.tanggal ?? ''} ${a.jam ?? ''}`.localeCompare(`${b.tanggal ?? ''} ${b.jam ?? ''}`) || a.ref - b.ref)
}

export interface RingkasPerforma {
  laga: number; selesai: number; final: number
  emas: number; perak: number; perunggu: number
  persenRata: number | null; persenTerbaik: number | null
  /** Final terdekat dengan emas yang belum dimenangi. */
  terdekatEmas: { nomor: string; selisih: number } | null
  terbaikPerNomor: { nomor: string; waktu: string; waktuDetik: number; ref: number }[]
  lolosHeat: { lolos: number; dari: number }
  bebanMaksHarian: number
}

export function ringkasPerforma(rows: LagaAtlet[]): RingkasPerforma {
  const persen = rows.map(r => r.persenJuara).filter((x): x is number => x != null)
  const kalah = rows.filter(r => r.final && r.medali !== 'emas' && r.selisihJuara != null && r.selisihJuara > 0)
    .sort((a, b) => a.selisihJuara! - b.selisihJuara!)
  const terbaik = new Map<string, LagaAtlet>()
  rows.forEach(r => {
    if (r.waktuDetik == null || !r.waktu) return
    const t = terbaik.get(r.nomor)
    if (!t || r.waktuDetik < t.waktuDetik!) terbaik.set(r.nomor, r)
  })
  const perHari = new Map<string, number>()
  rows.forEach(r => { if (r.tanggal) perHari.set(r.tanggal, (perHari.get(r.tanggal) ?? 0) + 1) })
  const heat = rows.filter(r => !r.final && r.lolosFinal != null)
  return {
    laga: rows.length, selesai: rows.filter(r => r.selesai).length, final: rows.filter(r => r.final).length,
    emas: rows.filter(r => r.medali === 'emas').length,
    perak: rows.filter(r => r.medali === 'perak').length,
    perunggu: rows.filter(r => r.medali === 'perunggu').length,
    persenRata: persen.length ? bulat(persen.reduce((a, b) => a + b, 0) / persen.length, 1) : null,
    persenTerbaik: persen.length ? Math.max(...persen) : null,
    terdekatEmas: kalah[0] ? { nomor: kalah[0].nomor, selisih: kalah[0].selisihJuara! } : null,
    terbaikPerNomor: Array.from(terbaik.values()).map(r => ({ nomor: r.nomor, waktu: r.waktu!, waktuDetik: r.waktuDetik!, ref: r.ref })),
    lolosHeat: { lolos: heat.filter(r => r.lolosFinal).length, dari: heat.length },
    bebanMaksHarian: Math.max(0, ...Array.from(perHari.values())),
  }
}

/* ---------- Umur ---------- */

export const PATOKAN_UMUR = '2026-11-07' // pembukaan PORPROV XV

export function umurPada(tglLahir: string | null | undefined, patokan = PATOKAN_UMUR): number | null {
  if (!tglLahir) return null
  const b = new Date(tglLahir + 'T00:00:00Z'), p = new Date(patokan + 'T00:00:00Z')
  if (isNaN(b.getTime())) return null
  let u = p.getUTCFullYear() - b.getUTCFullYear()
  if (p.getUTCMonth() < b.getUTCMonth() || (p.getUTCMonth() === b.getUTCMonth() && p.getUTCDate() < b.getUTCDate())) u--
  return u
}

/** Kelompok umur pembinaan: U-18 (≤18), U-23 (19–23), Senior (≥24). */
export function kelompokUmur(umur: number | null): 'U-18' | 'U-23' | 'Senior' | null {
  if (umur == null) return null
  return umur <= 18 ? 'U-18' : umur <= 23 ? 'U-23' : 'Senior'
}

/* ---------- Kelengkapan data ---------- */

export type Lapis = 'Identitas' | 'Performa' | 'Manajemen'
export interface ButirKelengkapan { kunci: string; label: string; lapis: Lapis; ada: boolean }

export interface DataKelengkapan {
  tanggalLahir?: boolean; terverifikasi?: boolean
  hasilLomba?: boolean; tesFisik?: boolean; postur?: boolean
  bpjs?: boolean; riwayat?: boolean; perlengkapan?: boolean; dokumen?: boolean
}

export const BUTIR: { kunci: keyof DataKelengkapan; label: string; lapis: Lapis }[] = [
  { kunci: 'tanggalLahir', label: 'Tanggal lahir', lapis: 'Identitas' },
  { kunci: 'terverifikasi', label: 'Terverifikasi', lapis: 'Identitas' },
  { kunci: 'hasilLomba', label: 'Hasil lomba', lapis: 'Performa' },
  { kunci: 'tesFisik', label: 'Tes fisik', lapis: 'Performa' },
  { kunci: 'postur', label: 'Tinggi & berat', lapis: 'Performa' },
  { kunci: 'bpjs', label: 'BPJS', lapis: 'Manajemen' },
  { kunci: 'riwayat', label: 'Riwayat prestasi', lapis: 'Manajemen' },
  { kunci: 'perlengkapan', label: 'Ukuran perlengkapan', lapis: 'Manajemen' },
  { kunci: 'dokumen', label: 'Dokumen', lapis: 'Manajemen' },
]

export function kelengkapan(d: DataKelengkapan): { butir: ButirKelengkapan[]; ada: number; total: number; persen: number } {
  const butir = BUTIR.map(b => ({ kunci: b.kunci, label: b.label, lapis: b.lapis, ada: !!d[b.kunci] }))
  const ada = butir.filter(b => b.ada).length
  return { butir, ada, total: butir.length, persen: Math.round(ada / butir.length * 100) }
}
