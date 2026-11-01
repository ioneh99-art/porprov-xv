// src/lib/konijabar.ts
// Membaca hasil laga dari situs resmi panitia PORPROV XV (porprov.konijabar.or.id)
// dan menerjemahkannya ke bentuk laporan hasil kita. Murni hitungan (tanpa
// database/jaringan) supaya bisa diuji: npm run uji.
//
// Yang dibaca hanya halaman publik biasa: /jadwal?tgl=… dan /laga/<nomor>.
// Jalur yang dilarang robots.txt situs itu (/api/, /peserta/, /layar, /cek) tidak disentuh.

import type { Hasil } from './lapor'

export const SITUS_KONIJABAR = 'https://porprov.konijabar.or.id'
export const NAMA_SUMBER_KONIJABAR = 'Situs KONI Jabar'
export const PELAPOR_KONIJABAR = 'Situs KONI Jabar (otomatis)'
/** Nama kontingen persis seperti tertulis di situs panitia. */
export const NAMA_KONTINGEN_SITUS: Record<number, string> = { 4: 'Kab. Bandung' }
/** Hari pertama ada laga (pra-PORPROV) — dipakai saat membaca pertama kali. */
export const MULAI_LAGA = '2026-10-28'

export const urlLaga = (ref: string) => `${SITUS_KONIJABAR}/laga/${ref}`

export const baku = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function teks(html: string): string {
  return html.replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim()
}
const rata = (html: string) => html.replace(/\s+/g, ' ')

/* ---------- Halaman jadwal harian ---------- */

export interface BarisJadwalLuar { ref: string; tim: string[]; selesai: boolean }

/** Baris laga di /jadwal?tgl=…: nomor laga, nama tim yang tertulis, dan apakah sudah selesai. */
export function bacaJadwalHarian(html: string): BarisJadwalLuar[] {
  const h = rata(html)
  const hasil: BarisJadwalLuar[] = []
  const lihat = new Set<string>()
  const re = /<a class="mrow([^"]*)" href="\/laga\/(\d+)"[^>]*>(.*?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(h))) {
    const ref = m[2]
    if (lihat.has(ref)) continue
    lihat.add(ref)
    const tim = Array.from(m[3].matchAll(/<span class="ml-name">(.*?)<\/span>/g)).map(x => teks(x[1]))
    hasil.push({ ref, tim, selesai: /status-finished/.test(m[1]) || /status-pill is-done/.test(m[3]) })
  }
  return hasil
}

/* ---------- Halaman satu laga ---------- */

export interface SisiLaga { nama: string; atlet: string[]; menang: boolean }
export interface LagaLuar {
  ref: string; tanggal: string | null; jam: string | null; cabor: string; disiplin: string | null; nomor: string
  status: string; selesai: boolean; babak: string | null; kode: string | null; venue: string | null
  /** null bila laga bukan bentuk "tim A lawan tim B" (mis. heat/peringkat) — belum dibaca otomatis. */
  a: SisiLaga | null; b: SisiLaga | null; skorA: number | null; skorB: number | null; video: string | null
}

function sisi(h: string, kelas: 'side-a' | 'side-b'): SisiLaga | null {
  const awal = h.indexOf(`<div class="duel-side ${kelas}`)
  if (awal < 0) return null
  const ujungTag = h.indexOf('>', awal)
  const tag = h.slice(awal, ujungTag + 1)
  const akhirBlok = kelas === 'side-a' ? h.indexOf('<div class="duel-score"', ujungTag) : h.indexOf('</article>', ujungTag)
  const blok = h.slice(ujungTag, akhirBlok < 0 ? undefined : akhirBlok)
  const nama = blok.match(/class="duel-team"[^>]*>(?:(?!<\/a>|<\/div>).)*?<span>(.*?)<\/span>/)
  if (!nama) return null
  const atlet = Array.from(blok.matchAll(/<a class="ath-chip"[^>]*>.*?<span>(.*?)<\/span><\/a>/g)).map(x => teks(x[1]))
  return { nama: teks(nama[1]), atlet, menang: /\bis-win\b/.test(tag) }
}

/** Baca satu halaman /laga/<ref>. null bila halaman tidak dikenali. */
export function bacaLaga(html: string, ref: string): LagaLuar | null {
  const h = rata(html)
  const judul = h.match(/<h1 class="md-title"[^>]*>(.*?)<\/h1>/)
  const kicker = h.match(/<p class="md-kicker">(.*?)<\/p>/)
  if (!judul || !kicker) return null
  const cabor = teks(kicker[1].match(/<a[^>]*>(.*?)<\/a>/)?.[1] ?? kicker[1].split('<span class="sep">')[0])
  const sesudahSep = kicker[1].split('<span class="sep"></span>')[1]
  const disiplin = sesudahSep ? teks(sesudahSep) || null : null

  const fase = h.match(/<p class="md-phase">(.*?)<\/p>/)?.[1] ?? ''
  const pil = fase.match(/<span class="status-pill([^"]*)">(.*?)<\/span>/)
  const kode = fase.match(/<span class="md-no">(.*?)<\/span>/)?.[1]
  const babak = Array.from(fase.matchAll(/<span>(.*?)<\/span>/g)).map(x => teks(x[1])).filter(Boolean)[0] ?? null

  const fakta = (dt: string) => h.match(new RegExp(`<dt>${dt}</dt>\\s*<dd>(.*?)</dd>`))?.[1] ?? null
  const waktu = fakta('Waktu')
  const jamM = waktu ? teks(waktu).match(/(\d{1,2})[.:](\d{2})/) : null
  const venueHtml = fakta('Venue')
  const venue = venueHtml ? teks(venueHtml.replace(/<a class="md-map".*?<\/a>/g, '')) || null : null

  const skor = h.match(/<div class="duel-score"[^>]*>(.*?)<\/div>/)?.[1] ?? ''
  const angka = Array.from(skor.matchAll(/<span class="ds-n[^"]*">\s*(\d+)\s*<\/span>/g)).map(x => Number(x[1]))
  const duel = h.includes('class="md-duel')

  return {
    ref,
    tanggal: h.match(/href="\/jadwal\?tgl=(\d{4}-\d{2}-\d{2})"/)?.[1] ?? null,
    jam: jamM ? `${jamM[1].padStart(2, '0')}:${jamM[2]}` : null,
    cabor, disiplin, nomor: teks(judul[1]),
    status: pil ? teks(pil[2]) : '', selesai: !!pil && /\bis-done\b/.test(pil[1]),
    babak, kode: kode ? teks(kode) : null, venue,
    a: duel ? sisi(h, 'side-a') : null, b: duel ? sisi(h, 'side-b') : null,
    skorA: angka.length === 2 ? angka[0] : null, skorB: angka.length === 2 ? angka[1] : null,
    video: h.match(/href="(https:\/\/(?:www\.)?youtu(?:be\.com|\.be)\/[^"]+)"/)?.[1]?.replace(/&amp;/g, '&') ?? null,
  }
}

/* ---------- Dari sudut pandang kontingen kita ---------- */

export interface LagaKita {
  laga: LagaLuar; lawan: string; atlet: string[]
  skorKita: number | null; skorLawan: number | null
  akhir: 'menang' | 'kalah' | 'seri' | null   // null = belum selesai / belum ada skor
}

export function lagaKita(laga: LagaLuar, namaKontingen: string): LagaKita | null {
  if (!laga.a || !laga.b) return null
  const k = baku(namaKontingen)
  const kitaA = baku(laga.a.nama) === k, kitaB = baku(laga.b.nama) === k
  if (kitaA === kitaB) return null    // bukan laga kita (atau dua-duanya, mustahil)
  const kita = kitaA ? laga.a : laga.b, lawan = kitaA ? laga.b : laga.a
  const skorKita = kitaA ? laga.skorA : laga.skorB, skorLawan = kitaA ? laga.skorB : laga.skorA
  let akhir: LagaKita['akhir'] = null
  if (laga.selesai) {
    if (kita.menang && !lawan.menang) akhir = 'menang'
    else if (lawan.menang && !kita.menang) akhir = 'kalah'
    else if (skorKita != null && skorLawan != null) akhir = skorKita > skorLawan ? 'menang' : skorKita < skorLawan ? 'kalah' : 'seri'
  }
  return { laga, lawan: lawan.nama, atlet: kita.atlet, skorKita, skorLawan, akhir }
}

/**
 * Terjemahkan menang/kalah ke pilihan hasil kita menurut babaknya:
 * pool/penyisihan → Menang (pool)/Kalah – masih bertanding; babak gugur → Lolos/Gugur;
 * final → Emas/Perak; perebutan juara 3 → Perunggu/peringkat 4. KONIDA tetap bisa memperbaiki.
 */
export function tebakHasil(babak: string | null, kode: string | null, akhir: 'menang' | 'kalah' | 'seri'):
  { hasil: Hasil; peringkat: number | null; catatan: string | null } {
  const b = baku(`${babak ?? ''} ${kode ?? ''}`)
  const seri = akhir === 'seri' ? 'Hasil SERI — sesuaikan sebelum mengesahkan.' : null
  const menang = akhir === 'menang'
  if (/perebutan|juara 3|tempat 3|perunggu|\bko b3\b/.test(b)) return menang ? { hasil: 'perunggu', peringkat: null, catatan: seri } : { hasil: 'peringkat', peringkat: 4, catatan: seri }
  if (/semi|perempat|quarter|\b(8|16|32|64) besar\b|\brepechage\b|\bko (qf|sf)\d*\b/.test(b)) return { hasil: menang ? 'lolos' : 'gugur', peringkat: null, catatan: seri }
  if (/(^|\s)(grand )?final(\s|$)|\bko f\b/.test(b)) return { hasil: menang ? 'emas' : 'perak', peringkat: null, catatan: seri }
  if (/gugur|knock|play ?off|\bko\b/.test(b)) return { hasil: menang ? 'lolos' : 'gugur', peringkat: null, catatan: seri }
  return { hasil: menang ? 'menang' : 'kalah', peringkat: null, catatan: seri }
}

/* ---------- Mencocokkan ke data kita ---------- */

const JENIS_KELAMIN: [RegExp, string][] = [[/\bputra\b|\(pa\)|\bpa\b/, 'pa'], [/\bputri\b|\(pi\)|\bpi\b/, 'pi'], [/\bcampuran\b|\bmix/, 'campuran']]
function kelamin(s: string | null | undefined): string | null {
  const t = ` ${(s ?? '').toLowerCase()} `
  for (const [re, k] of JENIS_KELAMIN) if (re.test(t)) return k
  return null
}
const tanpaKelamin = (s: string | null | undefined) => baku(s).replace(/\b(putra|putri|campuran|pa|pi)\b/g, ' ').replace(/\s+/g, ' ').trim()

/** Nomor di situs ("Beregu Putra") sama dengan nomor kita ("Beregu Putra (Pa)" / "BOLA VOLI PASIR · Beregu (Pa)")? */
export function nomorSama(situs: string, kita: string | null | undefined): boolean {
  if (!kita) return false
  const gs = kelamin(situs), gk = kelamin(kita)
  if (gs && gk && gs !== gk) return false
  const a = tanpaKelamin(situs), b = tanpaKelamin(kita)
  return !!a && !!b && (a === b || b.endsWith(' ' + a) || a.endsWith(' ' + b))
}

/** Lawan di situs ("Kota Bandung") sama dengan lawan kita ("Kota Bandung 2")? Angka urut tim diabaikan. */
export function lawanSama(situs: string, kita: string | null | undefined): boolean {
  const a = baku(situs), b = baku(kita)
  if (!a || !b) return false
  const potong = (s: string) => s.replace(/\s\d+$/, '')
  return a === b || potong(a) === potong(b)
}

export interface PartaiCocok { id: number; cabor_id: number; tanggal: string; jam: string | null; nomor_teks: string; lawan: string | null; atlet_nama?: string[] }

/**
 * Cari partai jadwal kita untuk laga ini (cabor + tanggal sama), urut kekuatan bukti:
 * lawan sama (dan nomornya cocok bila lebih dari satu), atlet yang sama, nomor sama.
 */
export function cocokPartai<P extends PartaiCocok>(lk: LagaKita, caborId: number | null, partai: P[]): P | undefined {
  if (caborId == null || !lk.laga.tanggal) return undefined
  const hari = partai.filter(p => p.cabor_id === caborId && p.tanggal === lk.laga.tanggal)
  if (!hari.length) return undefined
  const satu = (xs: P[]) => {
    if (xs.length <= 1) return xs[0]
    const jamSama = xs.filter(p => p.jam && p.jam === lk.laga.jam)
    return jamSama.length === 1 ? jamSama[0] : undefined
  }
  const lawan = hari.filter(p => lawanSama(lk.lawan, p.lawan))
  if (lawan.length) return satu(lawan.length > 1 ? lawan.filter(p => nomorSama(lk.laga.nomor, p.nomor_teks)) : lawan) ?? satu(lawan)
  const namaKita = new Set(lk.atlet.map(baku))
  const atlet = hari.filter(p => !p.lawan && (p.atlet_nama ?? []).some(n => namaKita.has(baku(n))))
  if (atlet.length) return satu(atlet)
  return satu(hari.filter(p => !p.lawan && nomorSama(lk.laga.nomor, p.nomor_teks)))
}

/** Nomor resmi pendaftaran kita untuk laga ini (dipakai bila laga tidak bertaut ke partai jadwal). */
export function pilihNomorResmi(laga: LagaLuar, daftar: { disiplin: string | null; nomor: string }[]): string | null {
  const cocok = daftar.filter(d => nomorSama(laga.nomor, d.nomor))
  if (cocok.length <= 1) return cocok[0]?.nomor ?? null
  const disiplin = cocok.filter(d => laga.disiplin && baku(d.disiplin).includes(baku(laga.disiplin)))
  return disiplin.length === 1 ? disiplin[0].nomor : null
}

/** Cabor kita (cabang_olahraga) dari nama cabor di situs. */
export function cocokCabor(nama: string, cabor: { id: number; nama: string }[]): number | null {
  const n = baku(nama)
  const SINONIM: Record<string, string> = { gimnastik: 'senam', berkuda: 'equestrian', dansa: 'dancesport' }
  const cari = SINONIM[n] ?? n
  return cabor.find(c => baku(c.nama) === cari)?.id ?? null
}

/** Skor untuk kolom "catatan angka", dari sisi kontingen kita: "3-5". */
export const skorTeks = (lk: LagaKita) => lk.skorKita != null && lk.skorLawan != null ? `${lk.skorKita}-${lk.skorLawan}` : null

/** Keterangan laporan otomatis — menyebut sumber dan tautan laga supaya mudah dicek. */
export function keteranganLaporan(lk: LagaKita, catatan: string | null): string {
  const l = lk.laga
  return [
    `${NAMA_SUMBER_KONIJABAR}: ${[l.disiplin, l.babak, l.kode].filter(Boolean).join(' · ')}`.trim(),
    l.venue, catatan, urlLaga(l.ref),
  ].filter(Boolean).join(' · ').slice(0, 480)
}

/* ---------- Alarm beda data: laporan kita vs situs panitia ---------- */

export interface HasilLuarBanding {
  ref: string; tanggal: string | null; cabor_id: number | null; partai_id: number | null; laporan_id: number | null
  lawan: string | null; skor_kita: number | null; skor_lawan: number | null; akhir: 'menang' | 'kalah' | 'seri' | null
  babak?: string | null; skor_sebelum?: string | null; berubah_at?: string | null; dicek_kunci?: string | null
}
export interface LaporanBanding {
  id: number; cabor_id: number; partai_id?: number | null; tanggal: string; lawan: string | null
  hasil: Hasil; nilai_teks: string | null; status: 'menunggu' | 'disahkan' | 'ditolak'; pelapor_nama: string; ref_luar?: string | null
}
export interface AlarmBeda {
  kunci: string; ref: string; url: string; tanggal: string | null; cabor_id: number | null; partai_id: number | null
  laporan_id: number; laporan_status: LaporanBanding['status']; pelapor: string
  kita: string; situs: string; alasan: string; berubah: string | null; dicek: boolean
}

/** Arah hasil laporan kita: menang/kalah, atau null bila tidak bisa dibandingkan per laga (mis. perunggu, peringkat). */
export function arahHasil(h: Hasil): 'menang' | 'kalah' | null {
  if (h === 'menang' || h === 'lolos' || h === 'emas') return 'menang'
  if (h === 'kalah' || h === 'gugur' || h === 'perak') return 'kalah'
  return null
}

/** Skor utama dari catatan angka ("5 - 2", "1-2 (17-21, ...)", "3:1") → [a, b]. Rincian dalam kurung diabaikan. */
export function skorUtama(nilai: string | null | undefined): [number, number] | null {
  const m = (nilai ?? '').replace(/\(.*?\)/g, ' ').match(/(\d+)\s*[-–—:]\s*(\d+)/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

const tulisSkor = (a: number | null, b: number | null) => a != null && b != null ? `${a}–${b}` : '–'

/**
 * Bandingkan satu laporan kita dengan hasil situs untuk laga yang sama.
 * 'sama' bila arah (menang/kalah) dan skor utama cocok — skor yang ditulis terbalik
 * ("kalah 5-3" untuk kita 3, lawan 5) masih dianggap sama; 'beda' + alasan bila tidak;
 * 'tak_bisa' bila tidak ada yang bisa dibandingkan.
 */
export function bandingkan(l: Pick<LaporanBanding, 'hasil' | 'nilai_teks'>, h: Pick<HasilLuarBanding, 'skor_kita' | 'skor_lawan' | 'akhir'>):
  { status: 'sama' | 'beda' | 'tak_bisa'; alasan: string | null } {
  const alasan: string[] = []
  let dibanding = false
  const arah = arahHasil(l.hasil)
  if (arah && (h.akhir === 'menang' || h.akhir === 'kalah')) {
    dibanding = true
    if (arah !== h.akhir) alasan.push(`laporan kita ${arah}, situs ${h.akhir}`)
  }
  if (arah && h.akhir === 'seri') { dibanding = true; alasan.push(`laporan kita ${arah}, situs seri`) }
  const s = skorUtama(l.nilai_teks)
  if (s && h.skor_kita != null && h.skor_lawan != null) {
    dibanding = true
    const lurus = s[0] === h.skor_kita && s[1] === h.skor_lawan
    const balik = s[0] === h.skor_lawan && s[1] === h.skor_kita
    if (!lurus && !balik) alasan.push(`skor kita ${s[0]}–${s[1]}, situs ${h.skor_kita}–${h.skor_lawan}`)
  }
  if (!dibanding) return { status: 'tak_bisa', alasan: null }
  return alasan.length ? { status: 'beda', alasan: alasan.join('; ') } : { status: 'sama', alasan: null }
}

/** Kunci satu perbandingan — berubah bila salah satu sisi berubah, sehingga tanda "sudah dicek" gugur sendiri. */
export const kunciBanding = (h: HasilLuarBanding, l: LaporanBanding) =>
  `${h.ref}:${h.skor_kita}-${h.skor_lawan}-${h.akhir}|${l.id}:${l.hasil}:${(l.nilai_teks ?? '').replace(/\s+/g, '')}`

/**
 * Semua laporan kita (selain yang ditolak) yang membahas laga situs yang sama, lalu dibandingkan.
 * Laga yang sama = laporan buatan dari laga itu, atau partai jadwal yang sama dengan lawan yang sama,
 * atau (tanpa partai) cabor + tanggal + lawan yang sama. Laporan tanpa lawan pada partai tanpa lawan
 * (mis. Gulat: banyak babak per kelas) tidak dibandingkan per laga.
 */
export function cariAlarm(hasil: HasilLuarBanding[], laporan: LaporanBanding[], lawanPartai: Map<number, string | null>): AlarmBeda[] {
  const keluar: AlarmBeda[] = []
  for (const h of hasil) {
    if (!h.akhir) continue
    const terkait = laporan.filter(l => {
      if (l.status === 'ditolak') return false
      if (l.ref_luar) return l.ref_luar === h.ref
      const lawanL = l.lawan ?? (l.partai_id != null ? lawanPartai.get(l.partai_id) ?? null : null)
      if (!h.lawan || !lawanSama(h.lawan, lawanL)) return false
      if (h.partai_id != null && l.partai_id != null) return h.partai_id === l.partai_id
      return l.cabor_id === h.cabor_id && l.tanggal === h.tanggal
    })
    const dicek = new Set((h.dicek_kunci ?? '').split('\n').filter(Boolean))
    for (const l of terkait) {
      const b = bandingkan(l, h)
      if (b.status !== 'beda') continue
      const kunci = kunciBanding(h, l)
      keluar.push({
        kunci, ref: h.ref, url: urlLaga(h.ref), tanggal: h.tanggal, cabor_id: h.cabor_id, partai_id: h.partai_id,
        laporan_id: l.id, laporan_status: l.status, pelapor: l.pelapor_nama,
        kita: `${l.nilai_teks ?? '–'} (${l.hasil})`, situs: `${tulisSkor(h.skor_kita, h.skor_lawan)} ${h.akhir}`,
        alasan: b.alasan!, berubah: h.skor_sebelum ? `${h.skor_sebelum.replace('-', '–')} → ${tulisSkor(h.skor_kita, h.skor_lawan)}` : null,
        dicek: dicek.has(kunci),
      })
    }
  }
  return keluar.sort((a, b) => Number(a.dicek) - Number(b.dicek) || (b.tanggal ?? '').localeCompare(a.tanggal ?? ''))
}
