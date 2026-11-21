// src/lib/bibit-atlet.ts — Bibit Atlet PORPROV XV (hitungan murni).
// Situs panitia tidak mencantumkan umur → bibit dinilai dari PRESTASI untuk semua kontingen;
// umur hanya ditambahkan untuk atlet Kab. Bandung (dari data atlet kita, di lapisan server).
//
// Perorangan vs beregu: medali dihitung "perorangan" bila podium hanya berisi satu atlet.
// Menang–kalah & menang beruntun hanya dari laga tanding perorangan (satu atlet per sisi),
// karena kemenangan tim (sepak bola, voli) tidak mengukur kemampuan satu orang.

export interface BahanAtletB {
  situsId: number; nama: string; slug: string
  kontingenSitusId: number | null; kontingen: string
  cabor: string | null; disiplin: string | null; gender: string | null
  emas: number; perak: number; perunggu: number; jumlahLaga: number | null
}
export interface BahanPodiumB { atletSitusIds: number[]; medali: 'emas' | 'perak' | 'perunggu' }
export interface BahanLagaB { ref: number; tanggal: string | null; jam: string | null; bentuk: string | null; selesai: boolean }
export interface BahanPesertaB { lagaRef: number; atletSitusIds: number[]; menang: boolean | null }

export type Kriteria = 'multiEmas' | 'juaraPerorangan' | 'takTerkalahkan' | 'beruntun' | 'serbaBisa'

export const LABEL_KRITERIA: Record<Kriteria, string> = {
  multiEmas: 'Multi-emas perorangan',
  juaraPerorangan: 'Juara perorangan',
  takTerkalahkan: 'Tak terkalahkan',
  beruntun: 'Menang beruntun',
  serbaBisa: 'Serba bisa',
}
export const PENJELASAN_KRITERIA: Record<Kriteria, string> = {
  multiEmas: 'minimal 2 emas dari nomor perorangan',
  juaraPerorangan: 'minimal 1 emas dari nomor perorangan',
  takTerkalahkan: `minimal ${3} laga tanding perorangan tanpa kalah`,
  beruntun: `menang ${4} kali atau lebih berturut-turut di laga tanding perorangan`,
  serbaBisa: 'medali di 3 nomor atau lebih (perorangan + beregu)',
}

export const MIN_LAGA_TAK_TERKALAHKAN = 3
export const MIN_BERUNTUN = 4
export const MIN_SERBA_BISA = 3

export interface BibitAtlet {
  situsId: number; nama: string; slug: string
  kontingenSitusId: number | null; kontingen: string
  cabor: string | null; disiplin: string | null; gender: string | null
  emas: number; perak: number; perunggu: number; total: number
  emasP: number; perakP: number; perungguP: number
  laga: number
  duelMenang: number; duelKalah: number
  tingkatMenang: number | null
  beruntun: number
  kriteria: Kriteria[]
  umur?: number | null
}

const kosongP = () => ({ emas: 0, perak: 0, perunggu: 0 })

/** Urutan bibit: emas perorangan, emas, medali perorangan, total medali, tingkat menang. */
export function bandingBibit(a: BibitAtlet, b: BibitAtlet): number {
  return b.emasP - a.emasP || b.emas - a.emas
    || (b.emasP + b.perakP + b.perungguP) - (a.emasP + a.perakP + a.perungguP)
    || b.total - a.total || b.perak - a.perak
    || (b.tingkatMenang ?? -1) - (a.tingkatMenang ?? -1) || b.beruntun - a.beruntun
    || a.nama.localeCompare(b.nama)
}

/** Menang beruntun terpanjang dari daftar hasil yang sudah urut waktu. */
export function beruntunTerpanjang(hasil: boolean[]): number {
  let maks = 0, kini = 0
  for (const h of hasil) { kini = h ? kini + 1 : 0; if (kini > maks) maks = kini }
  return maks
}

export function hitungBibit(b: {
  atlet: BahanAtletB[]; podium: BahanPodiumB[]; laga: BahanLagaB[]; peserta: BahanPesertaB[]
  /** Atlet yang selalu disertakan walau belum memenuhi syarat kandidat (mis. seluruh atlet bermedali Kab. Bandung). */
  selaluSertakan?: (a: BahanAtletB) => boolean
}): BibitAtlet[] {
  const perorangan = new Map<number, ReturnType<typeof kosongP>>()
  for (const p of b.podium) {
    if (p.atletSitusIds.length !== 1) continue
    const id = p.atletSitusIds[0]
    const x = perorangan.get(id) ?? kosongP()
    x[p.medali]++
    perorangan.set(id, x)
  }

  const lagaDuel = new Map(b.laga.filter(l => l.bentuk === 'duel' && l.selesai).map(l => [l.ref, l]))
  const kunciWaktu = (l: BahanLagaB) => `${l.tanggal ?? '9999-99-99'} ${(l.jam ?? '99:99').padStart(5, '0')} ${String(l.ref).padStart(7, '0')}`
  const duel = new Map<number, { waktu: string; menang: boolean }[]>()
  for (const p of b.peserta) {
    const l = lagaDuel.get(p.lagaRef)
    if (!l || p.menang == null || p.atletSitusIds.length !== 1) continue
    const id = p.atletSitusIds[0]
    duel.set(id, [...(duel.get(id) ?? []), { waktu: kunciWaktu(l), menang: p.menang }])
  }

  const hasil: BibitAtlet[] = []
  for (const a of b.atlet) {
    const per = perorangan.get(a.situsId) ?? kosongP()
    const d = (duel.get(a.situsId) ?? []).sort((x, y) => x.waktu.localeCompare(y.waktu))
    const duelMenang = d.filter(x => x.menang).length, duelKalah = d.length - duelMenang
    const total = a.emas + a.perak + a.perunggu
    const beruntun = beruntunTerpanjang(d.map(x => x.menang))
    const kriteria: Kriteria[] = []
    if (per.emas >= 2) kriteria.push('multiEmas')
    else if (per.emas >= 1) kriteria.push('juaraPerorangan')
    if (d.length >= MIN_LAGA_TAK_TERKALAHKAN && duelKalah === 0) kriteria.push('takTerkalahkan')
    if (beruntun >= MIN_BERUNTUN) kriteria.push('beruntun')
    if (total >= MIN_SERBA_BISA) kriteria.push('serbaBisa')
    const kandidat = a.emas >= 1 || total >= 2 || kriteria.length > 0 || (!!b.selaluSertakan && total >= 1 && b.selaluSertakan(a))
    if (!kandidat) continue
    hasil.push({
      situsId: a.situsId, nama: a.nama, slug: a.slug, kontingenSitusId: a.kontingenSitusId, kontingen: a.kontingen,
      cabor: a.cabor, disiplin: a.disiplin, gender: a.gender,
      emas: a.emas, perak: a.perak, perunggu: a.perunggu, total,
      emasP: per.emas, perakP: per.perak, perungguP: per.perunggu,
      laga: a.jumlahLaga ?? 0, duelMenang, duelKalah,
      tingkatMenang: d.length ? duelMenang / d.length : null,
      beruntun, kriteria,
    })
  }
  return hasil.sort(bandingBibit)
}

/** Umur (tahun penuh) pada tanggal acuan; null bila tanggal lahir kosong/tidak sah. */
export function umurPada(tglLahir: string | null | undefined, acuan: string): number | null {
  if (!tglLahir || !/^\d{4}-\d{2}-\d{2}/.test(tglLahir)) return null
  const [ly, lm, ld] = tglLahir.slice(0, 10).split('-').map(Number)
  const [ay, am, ad] = acuan.slice(0, 10).split('-').map(Number)
  let u = ay - ly
  if (am < lm || (am === lm && ad < ld)) u--
  return u >= 5 && u <= 80 ? u : null
}
