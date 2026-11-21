// src/lib/arsip-konijabar.ts
// Pembaca SEMUA jenis halaman situs panitia PORPROV XV (porprov.konijabar.or.id) untuk
// arsip data menyeluruh: klasemen, kontingen, cabor (disiplin & nomor), nomor (podium),
// venue (koordinat), atlet, dan laga (bentuk duel maupun peringkat/waktu/nilai).
// Murni hitungan (tanpa jaringan/database) supaya bisa diuji: npm run uji:arsip-konijabar.

import { bacaLaga, rata, teks } from './konijabar'

export type Medali = 'emas' | 'perak' | 'perunggu'
export type Gender = 'L' | 'P' | 'MIX'

/* ---------- Bantuan ---------- */

/** "indra-hidayat-4285" → 4285 · "/nomor/tenis-beregu-putra-1021" → 1021 */
export const idAkhir = (s: string | null | undefined) => Number((s ?? '').match(/-(\d+)\/?$/)?.[1]) || null
const angka = (s: string | null | undefined) => {
  const t = (s ?? '').replace(/\./g, '').match(/\d+/)
  return t ? Number(t[0]) : null
}

export function genderDari(s: string | null | undefined): Gender | null {
  const t = (s ?? '').toLowerCase()
  if (/\b(campuran|mix|mixed)\b/.test(t)) return 'MIX'
  if (/\b(putri|wanita|women)\b/.test(t)) return 'P'
  if (/\b(putra|pria|men)\b/.test(t)) return 'L'
  return null
}

/** Catatan waktu → detik: "1:29.96" → 89.96, "45.12" → 45.12, "1:02:03.4" → 3723.4. Selain itu null. */
export function detikDari(s: string | null | undefined): number | null {
  const t = (s ?? '').trim().replace(',', '.')
  if (!/^\d{1,2}(:\d{1,2}){1,2}(\.\d+)?$/.test(t)) return null
  return Math.round(t.split(':').map(Number).reduce((a, b) => a * 60 + b, 0) * 1000) / 1000
}

/** Nilai angka biasa ("8,750" poin, "45.12" detik, "120 kg"): angka pertama, koma = desimal. */
export function angkaNilai(s: string | null | undefined): number | null {
  const t = (s ?? '').trim()
  if (!t) return null
  const w = detikDari(t)
  if (w != null) return w
  const m = t.replace(/\s/g, '').match(/^-?\d+([.,]\d+)?/)
  return m ? Number(m[0].replace(',', '.')) : null
}

const atletDari = (html: string) =>
  Array.from(html.matchAll(/<a class="ath(?:-chip)?" href="\/atlet\/([a-z0-9-]+)"[^>]*>(.*?)<\/a>/g))
    .map(x => ({ slug: x[1], situsId: idAkhir(x[1]), nama: teks(x[2]) }))

export interface AtletRingkas { slug: string; situsId: number | null; nama: string }

/* ---------- Klasemen medali (halaman awal) ---------- */

export interface BarisKlasemen { situsId: number | null; slug: string | null; nama: string; peringkat: number | null; emas: number; perak: number; perunggu: number; total: number }

export function bacaKlasemenMedali(html: string): BarisKlasemen[] {
  const h = rata(html)
  const keluar: BarisKlasemen[] = []
  for (const m of Array.from(h.matchAll(/<tr class="tally-row(?:\s[^"]*)?"([^>]*)>(.*?)<\/tr>/g))) {
    const attr = m[1], isi = m[2]
    const nama = isi.match(/<span class="name">(.*?)<\/span>/)?.[1]
    const sel = (k: string) => Number(teks(isi.match(new RegExp(`<td class="col-num col-${k}[^"]*">(.*?)</td>`))?.[1] ?? 'x'))
    const [e, p, g, t] = ['emas', 'perak', 'perunggu', 'total'].map(sel)
    if (!nama || ![e, p, g].every(n => Number.isInteger(n) && n >= 0)) continue
    keluar.push({
      situsId: Number(attr.match(/data-cid="(\d+)"/)?.[1]) || null,
      slug: isi.match(/href="\/kontingen\/([a-z0-9-]+)"/)?.[1] ?? null,
      nama: teks(nama),
      peringkat: Number(attr.match(/data-rank="(\d+)"/)?.[1] ?? teks(isi.match(/<td class="col-rank">(.*?)<\/td>/)?.[1] ?? '')) || null,
      emas: e, perak: p, perunggu: g, total: Number.isInteger(t) ? t : e + p + g,
    })
  }
  return keluar
}

/** "1.153 dari 1.154 nomor sudah ada juaranya" + jumlah medali keseluruhan. */
export function bacaRingkasanAcara(html: string) {
  const t = teks(rata(html))
  const nomor = t.match(/([\d.]+) dari ([\d.]+) nomor sudah ada juaranya/)
  const medali = t.match(/Emas ([\d.]+) Perak ([\d.]+) Perunggu ([\d.]+)/)
  return {
    nomorBerjuara: nomor ? angka(nomor[1]) : null, nomorTotal: nomor ? angka(nomor[2]) : null,
    emas: medali ? angka(medali[1]) : null, perak: medali ? angka(medali[2]) : null, perunggu: medali ? angka(medali[3]) : null,
    diperbarui: t.match(/Diperbarui (\d{1,2}[.:]\d{2}) WIB/)?.[1] ?? null,
  }
}

/* ---------- Kontingen ---------- */

export interface KontingenRingkas { situsId: number | null; slug: string; nama: string; peringkat: number | null }

export function bacaDaftarKontingen(html: string): KontingenRingkas[] {
  const h = rata(html)
  return Array.from(h.matchAll(/<a class="tile" href="\/kontingen\/([a-z0-9-]+)">(.*?)<\/a>/g)).map(m => ({
    situsId: Number(m[2].match(/data-cid="(\d+)"/)?.[1]) || null,
    slug: m[1],
    nama: teks(m[2].match(/<span class="tile-name">(.*?)<\/span>/)?.[1] ?? ''),
    peringkat: angka(m[2].match(/<span class="tile-rank">(.*?)<\/span>/)?.[1]),
  })).filter(k => k.nama)
}

export interface KontingenRinci { nama: string; situsId: number | null; peringkat: number | null; laga: number | null; menang: number | null; atlet: number | null; emas: number; perak: number; perunggu: number }

export function bacaKontingen(html: string): KontingenRinci | null {
  const h = rata(html)
  const nama = h.match(/<h1 class="page-title">(.*?)<\/h1>/)?.[1]
  const fakta = h.match(/<p class="hero-facts">(.*?)<\/p>/)?.[1]
  if (!nama || !fakta) return null
  const lagaM = teks(fakta).match(/([\d.]+) laga, ([\d.]+) menang/)
  const hitung = (j: string) => Number(h.match(new RegExp(`<div class="mc mc-${j}">\\s*<dt>.*?</dt>\\s*<dd[^>]*>(\\d+)</dd>`))?.[1] ?? 0)
  return {
    nama: teks(nama),
    situsId: Number(h.match(/data-mine-id="(\d+)"/)?.[1] ?? h.match(/href="\/atlet\?kontingen=(\d+)"/)?.[1]) || null,
    peringkat: angka(fakta.match(/<span class="hero-rank">(.*?)<\/span>/)?.[1]),
    laga: lagaM ? angka(lagaM[1]) : null, menang: lagaM ? angka(lagaM[2]) : null,
    atlet: angka(teks(fakta).match(/([\d.]+) atlet/)?.[1]),
    emas: hitung('emas'), perak: hitung('perak'), perunggu: hitung('perunggu'),
  }
}

/* ---------- Cabor ---------- */

export interface CaborRingkas { slug: string; nama: string; nomor: number | null; selesai: number | null; rentang: string | null }

export function bacaDaftarCabor(html: string): CaborRingkas[] {
  const h = rata(html)
  const keluar: CaborRingkas[] = []
  for (const m of Array.from(h.matchAll(/<a[^>]*href="\/cabor\/([a-z0-9-]+)"[^>]*>(.*?)<\/a>/g))) {
    const isi = teks(m[2])
    const n = isi.match(/(\d+) nomor, (\d+) selesai/)
    if (!n) continue
    const rentang = isi.match(/(\d{1,2}(?:\s\w+)?\s*-\s*\d{1,2}\s\w+)/)?.[1] ?? null
    keluar.push({ slug: m[1], nama: isi.split(/\s\d+ nomor/)[0].trim(), nomor: Number(n[1]), selesai: Number(n[2]), rentang })
  }
  return keluar
}

export interface DisiplinCabor { situsId: number | null; nama: string; jadwal: { rentang: string; venueSitusId: number | null; venue: string }[] }
export interface NomorDiCabor { situsId: number | null; slug: string; nama: string; disiplinSitusId: number | null; selesai: boolean }
export interface CaborRinci {
  situsId: number | null; nama: string; jumlahNomor: number | null; rentang: string | null; jumlahAtlet: number | null
  disiplin: DisiplinCabor[]; nomor: NomorDiCabor[]
}

export function bacaCabor(html: string): CaborRinci | null {
  const h = rata(html)
  const nama = h.match(/<h1 class="page-title">(.*?)<\/h1>/)?.[1]
  const fakta = h.match(/<p class="hero-facts">(.*?)<\/p>/)?.[1]
  if (!nama || !fakta) return null
  const spans = Array.from(fakta.matchAll(/<span>(.*?)<\/span>/g)).map(x => teks(x[1]))
  const disiplin: DisiplinCabor[] = []
  const nomor: NomorDiCabor[] = []
  // Setiap blok disiplin: <div class="discipline panel …" id="disiplin-N"> … </div> sampai blok berikutnya.
  const blok = h.split(/<div class="discipline panel[^"]*" id="disiplin-/).slice(1)
  for (const b of blok) {
    const dId = Number(b.match(/^(\d+)"/)?.[1]) || null
    const dNama = teks(b.match(/<h3 class="discipline-name">(.*?)<\/h3>/)?.[1] ?? '') || teks(nama)
    const jadwal = Array.from(b.matchAll(/<p class="discipline-when">(.*?)<\/p>/g)).map(x => ({
      rentang: teks(x[1].split('<span class="sep">')[0]),
      venueSitusId: Number(x[1].match(/venue=(\d+)/)?.[1]) || null,
      venue: teks(x[1].split('<span class="sep"></span>')[1] ?? ''),
    }))
    disiplin.push({ situsId: dId, nama: dNama, jadwal })
    for (const e of Array.from(b.matchAll(/<li class="event([^"]*)">\s*<span class="event-name"><a class="event-nomor" href="\/nomor\/([a-z0-9-]+)">(.*?)<\/a>/g)))
      nomor.push({ situsId: idAkhir(e[2]), slug: e[2], nama: teks(e[3]), disiplinSitusId: dId, selesai: /is-done/.test(e[1]) })
  }
  return {
    situsId: Number(h.match(/href="\/atlet\?cabor=(\d+)"/)?.[1]) || null,
    nama: teks(nama),
    jumlahNomor: angka(spans.find(s => /nomor/.test(s))),
    rentang: spans.find(s => /\d+\s*-\s*\d+|\d+ \w+ber/.test(s) && !/nomor/.test(s)) ?? null,
    jumlahAtlet: angka(teks(fakta).match(/([\d.]+) atlet/)?.[1]),
    disiplin, nomor,
  }
}

/* ---------- Nomor (podium) ---------- */

export interface PodiumNomor { medali: Medali; urutan: number; lagaRef: number | null; kontingenSlug: string | null; kontingen: string; atlet: AtletRingkas[] }
export interface NomorRinci {
  situsId: number | null; caborSlug: string | null; kicker: string | null; nama: string; status: string | null; selesai: boolean
  rentang: string | null; venueSitusId: number | null; venue: string | null; jumlahLaga: number | null; jumlahPeserta: number | null
  podium: PodiumNomor[]
}

export function bacaNomor(html: string): NomorRinci | null {
  const h = rata(html)
  const nama = h.match(/<h1 class="page-title">(.*?)<\/h1>/)?.[1]
  const fakta = h.match(/<p class="hero-facts">(.*?)<\/p>/)?.[1]
  if (!nama || fakta == null) return null
  const status = fakta.match(/<span class="nm-status([^"]*)">(.*?)<\/span>/)
  const spans = Array.from(fakta.matchAll(/<span>(.*?)<\/span>/g)).map(x => teks(x[1]))
  const venue = fakta.match(/<a href="\/klaster\?venue=(\d+)[^"]*">(.*?)<\/a>/)
  const podium: PodiumNomor[] = []
  const juara = h.match(/<ol class="nm-podium[^"]*">(.*?)<\/ol>/)?.[1] ?? ''
  let urutan = 0
  for (const m of Array.from(juara.matchAll(/<li class="nm-place nm-(emas|perak|perunggu)[^"]*">(.*?)<\/li>/g))) {
    urutan++
    const isi = m[2]
    // Beregu: nm-who → kontingen, atlet di nm-athletes. Perorangan: nm-who → atlet, kontingen di nm-team.
    const siapa = isi.match(/<a class="nm-who" href="\/(kontingen|atlet)\/([a-z0-9-]+)"[^>]*>.*?<span class="nm-who-name">(.*?)<\/span>/)
    const tim = isi.match(/<a class="nm-team" href="\/kontingen\/([a-z0-9-]+)"[^>]*>(.*?)<\/a>/)
    const perorangan = siapa?.[1] === 'atlet'
    podium.push({
      medali: m[1] as Medali, urutan,
      lagaRef: Number(isi.match(/class="nm-final" href="\/laga\/(\d+)"/)?.[1]) || null,
      kontingenSlug: perorangan ? tim?.[1] ?? null : siapa?.[2] ?? null,
      kontingen: perorangan ? teks(tim?.[2] ?? '') : teks(siapa?.[3] ?? ''),
      atlet: perorangan
        ? [{ slug: siapa![2], situsId: idAkhir(siapa![2]), nama: teks(siapa![3]) }]
        : atletDari(isi.match(/<p class="nm-athletes">(.*?)<\/p>/)?.[1] ?? ''),
    })
  }
  return {
    situsId: Number(h.match(/href="\/bagan\?nomor=(\d+)"/)?.[1]) || idAkhir(h.match(/data-share-url="[^"]*\/nomor\/([a-z0-9-]+)"/)?.[1]),
    caborSlug: h.match(/<nav class="crumbs"[^>]*>.*?<a href="\/cabor\/([a-z0-9-]+)"/)?.[1] ?? null,
    kicker: teks((h.match(/<p class="nm-kicker">(.*?)<\/p>/)?.[1] ?? '').replace(/&middot;/g, '·')) || null,
    nama: teks(nama),
    status: status ? teks(status[2]) : null, selesai: !!status && /is-done/.test(status[1]),
    rentang: spans.find(s => /\d/.test(s) && !/laga|peserta/.test(s)) ?? null,
    venueSitusId: venue ? Number(venue[1]) : null, venue: venue ? teks(venue[2]) : null,
    jumlahLaga: angka(spans.find(s => /laga/.test(s))), jumlahPeserta: angka(spans.find(s => /peserta/.test(s))),
    podium: podium.filter(p => p.kontingen),
  }
}

/* ---------- Venue (halaman klaster) ---------- */

export interface Venue { situsId: number; nama: string; klasterIds: number[]; klaster: string[]; cabor: string[]; lokasi: { nama: string; lat: number | null; lng: number | null; alamat: string | null; peta: string | null }[] }

export function bacaVenue(html: string): Venue[] {
  const data = html.match(/<script type="application\/json" data-vmap-data>([\s\S]*?)<\/script>/)?.[1]
  if (!data) return []
  const namaKlaster = new Map<number, string>()
  for (const m of Array.from(rata(html).matchAll(/data-vmap-c="(\d+)"[^>]*>(?:<span[^>]*><\/span>)?\s*(.*?)<\/button>/g)))
    namaKlaster.set(Number(m[1]), teks(m[2]))
  let isi: any[] = []
  try { isi = JSON.parse(data) } catch { return [] }
  return isi.map(v => ({
    situsId: Number(v.id), nama: String(v.n ?? '').trim(),
    klasterIds: (v.c ?? []).map(Number), klaster: (v.c ?? []).map((c: number) => namaKlaster.get(Number(c)) ?? String(c)),
    cabor: (v.s ?? []).map((s: any[]) => String(s[0])),
    lokasi: (v.p ?? []).map((p: any[]) => ({ nama: String(p[0] ?? ''), lat: Number(p[1]) || null, lng: Number(p[2]) || null, alamat: p[3] ?? null, peta: p[4] ?? null })),
  }))
}

/* ---------- Atlet ---------- */

export interface AtletRinci {
  nama: string; kontingenSlug: string | null; kontingen: string; caborSlug: string | null; cabor: string | null
  disiplin: string | null; gender: Gender | null; emas: number; perak: number; perunggu: number; lagaRefs: number[]
}

export function bacaAtletPenuh(html: string): AtletRinci | null {
  const h = rata(html)
  const nama = h.match(/<h1 class="page-title">(.*?)<\/h1>/)?.[1]
  const fakta = h.match(/<p class="hero-facts">(.*?)<\/p>/)?.[1]
  if (!nama || fakta == null) return null
  const kont = fakta.match(/href="\/kontingen\/([a-z0-9-]+)">(.*?)<\/a>/)
  const cab = fakta.match(/href="\/cabor\/([a-z0-9-]+)">(.*?)<\/a>/)
  const span = Array.from(fakta.matchAll(/<span>(.*?)<\/span>/g)).map(x => teks(x[1]))
  const gender = genderDari(span[span.length - 1])
  const disiplin = gender ? (span.length >= 2 ? span[span.length - 2] : null) : (span[span.length - 1] ?? null)
  const hitung = (j: string) => Number(h.match(new RegExp(`<div class="mc mc-${j}">\\s*<dt>.*?</dt>\\s*<dd[^>]*>(\\d+)</dd>`))?.[1] ?? 0)
  const ujung = h.indexOf('Rekan satu kontingen')
  const isi = ujung > 0 ? h.slice(0, ujung) : h
  return {
    nama: teks(nama), kontingenSlug: kont?.[1] ?? null, kontingen: kont ? teks(kont[2]) : '',
    caborSlug: cab?.[1] ?? null, cabor: cab ? teks(cab[2]) : null, disiplin, gender,
    emas: hitung('emas'), perak: hitung('perak'), perunggu: hitung('perunggu'),
    lagaRefs: Array.from(new Set(Array.from(isi.matchAll(/href="\/laga\/(\d+)"/g)).map(x => Number(x[1])))),
  }
}

/* ---------- Laga ---------- */

export interface PesertaLaga {
  urutan: number; sisi: 'a' | 'b' | null; kontingenSlug: string | null; kontingen: string
  menang: boolean | null; skor: number | null; peringkat: number | null; medali: Medali | null
  nilai: string | null; nilaiAngka: number | null; atlet: AtletRingkas[]; atletLebih: number
}
export interface LagaRinci {
  ref: number; nomorSitusId: number | null; caborSitusId: number | null
  tanggal: string | null; jam: string | null; cabor: string; disiplin: string | null; nomor: string; gender: Gender | null
  babak: string | null; kode: string | null; venue: string | null; klaster: string | null; status: string; selesai: boolean
  perebutanMedali: boolean; bentuk: 'duel' | 'peringkat' | 'kosong'; video: string | null
  peserta: PesertaLaga[]
}

function sisiDuel(h: string, kelas: 'side-a' | 'side-b', urutan: number, skor: number | null): PesertaLaga | null {
  const awal = h.indexOf(`<div class="duel-side ${kelas}`)
  if (awal < 0) return null
  const ujungTag = h.indexOf('>', awal)
  const tag = h.slice(awal, ujungTag + 1)
  const akhir = kelas === 'side-a' ? h.indexOf('<div class="duel-score"', ujungTag) : h.indexOf('</article>', ujungTag)
  const blok = h.slice(ujungTag, akhir < 0 ? undefined : akhir)
  const tim = blok.match(/<a class="duel-team" href="\/kontingen\/([a-z0-9-]+)"[^>]*>.*?<span>(.*?)<\/span>/)
  const timTanpaTautan = blok.match(/class="duel-team"[^>]*>(?:(?!<\/a>|<\/div>).)*?<span>(.*?)<\/span>/)
  const nama = tim ? teks(tim[2]) : timTanpaTautan ? teks(timTanpaTautan[1]) : ''
  if (!nama) return null
  return {
    urutan, sisi: kelas === 'side-a' ? 'a' : 'b', kontingenSlug: tim?.[1] ?? null, kontingen: nama,
    menang: /\bis-win\b/.test(tag), skor, peringkat: null, medali: null, nilai: skor != null ? String(skor) : null, nilaiAngka: skor,
    atlet: atletDari(blok.match(/<p class="duel-athletes">(.*?)<\/p>/)?.[1] ?? ''), atletLebih: 0,
  }
}

export function bacaLagaPenuh(html: string, ref: number): LagaRinci | null {
  const dasar = bacaLaga(html, String(ref))
  if (!dasar) return null
  const h = rata(html)
  const peserta: PesertaLaga[] = []
  let bentuk: LagaRinci['bentuk'] = 'kosong'
  if (h.includes('class="md-duel')) {
    bentuk = 'duel'
    const a = sisiDuel(h, 'side-a', 1, dasar.skorA), b = sisiDuel(h, 'side-b', 2, dasar.skorB)
    if (a) peserta.push(a)
    if (b) peserta.push(b)
  } else {
    const daftar = h.match(/<ol class="md-field">(.*?)<\/ol>/)?.[1]
    if (daftar) {
      bentuk = 'peringkat'
      let urutan = 0
      for (const m of Array.from(daftar.matchAll(/<li class="fld([^"]*)">(.*?)<\/li>/g))) {
        urutan++
        const isi = m[2]
        const tim = isi.match(/<a class="fld-team" href="\/kontingen\/([a-z0-9-]+)"[^>]*>(.*?)<\/a>/) ?? isi.match(/<(?:a|span) class="fld-team"[^>]*>()(.*?)<\/(?:a|span)>/)
        if (!tim) continue
        const nilai = teks(isi.match(/<span class="fld-score">(.*?)<\/span>/)?.[1] ?? '') || null
        peserta.push({
          urutan, sisi: null, kontingenSlug: tim[1] || null, kontingen: teks(tim[2]),
          menang: null, skor: null,
          peringkat: Number(teks(isi.match(/<span class="fld-rank">(.*?)<\/span>/)?.[1] ?? '')) || null,
          medali: (m[1].match(/fld-(emas|perak|perunggu)/)?.[1] ?? null) as Medali | null,
          nilai, nilaiAngka: angkaNilai(nilai),
          atlet: atletDari(isi), atletLebih: Number(isi.match(/<span class="ath-more">\+(\d+)<\/span>/)?.[1] ?? 0),
        })
      }
    }
  }
  return {
    // Sebelum 20 Nov tautannya /bagan?nomor=N; setelah penutupan /nomor/<nama>-N.
    ref, nomorSitusId: dasar.bagan ?? idAkhir(h.match(/href="\/nomor\/([a-z0-9-]+)"/)?.[1]), caborSitusId: Number(h.match(/href="\/jadwal\?tgl=[^"&]*&amp;cabor=(\d+)"/)?.[1]) || null,
    tanggal: dasar.tanggal, jam: dasar.jam, cabor: dasar.cabor, disiplin: dasar.disiplin, nomor: dasar.nomor,
    gender: genderDari(dasar.nomor), babak: dasar.babak, kode: dasar.kode, venue: dasar.venue,
    klaster: teks(h.match(/<dt>Klaster<\/dt>\s*<dd>(.*?)<\/dd>/)?.[1] ?? '') || null,
    status: dasar.status, selesai: dasar.selesai, perebutanMedali: h.includes('class="md-medal-flag"'),
    bentuk, video: dasar.video, peserta,
  }
}
