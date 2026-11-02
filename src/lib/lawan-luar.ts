// src/lib/lawan-luar.ts
// Pembaca halaman situs panitia (porprov.konijabar.or.id) untuk fitur Head-to-Head:
//  - /atlet?cabor=&g=&hal=  → daftar atlet peserta (nama, kontingen, cabor, putra/putri, foto)
//  - /bagan                 → daftar nomor yang sudah punya bagan
//  - /bagan?nomor=          → kartu laga babak gugur, klasemen grup, matriks laga grup
// Semua fungsi di sini murni (tanpa I/O) supaya bisa diuji dengan potongan HTML.
// Hanya halaman yang diizinkan robots.txt situs itu (/peserta/ dan /api/ tidak disentuh).

import { SITUS_KONIJABAR, baku } from './konijabar'

export interface AtletLuar {
  ref: number; slug: string; nama: string; kontingen: string; cabor: string; gender: 'L' | 'P' | null; foto: string | null
}
export interface SisiBagan { kontingen: string | null; nama: string; atlet_ref: number | null; atlet_refs: number[]; kontingen_ref: number | null; skor: string | null; hasil: 'menang' | 'kalah' | null }
export interface KartuBagan { laga: string | null; meta: string; status: 'selesai' | 'live' | 'jadwal' | 'bye'; sisi: SisiBagan[] }
export interface BarisGrup { kontingen: string; main: number; menang: number; seri: number; kalah: number; poin: number }
export interface LagaMatriks { laga: string; baris: string; kolom: string; teks: string; status: 'selesai' | 'jadwal' }
export interface BaganLuar { kartu: KartuBagan[]; grup: { nama: string; klasemen: BarisGrup[] }[]; matriks: LagaMatriks[] }

const dekode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
const teks = (s: string) => dekode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const angka = (s: string) => { const n = Number(teks(s)); return Number.isFinite(n) ? n : 0 }

/** Satu halaman /atlet: daftar atlet + nomor halaman "hal. 1/6". */
export function bacaDaftarAtlet(html: string): { atlet: AtletLuar[]; halaman: number; totalHalaman: number } {
  const atlet: AtletLuar[] = []
  const re = /<a class="person" href="\/atlet\/([^"]+?)-(\d+)">([\s\S]*?)<\/a>/g
  for (let m; (m = re.exec(html));) {
    const isi = m[3]
    const nama = teks(isi.match(/class="person-name">([\s\S]*?)<\/span>/)?.[1] ?? '')
    const meta = Array.from(isi.matchAll(/class="person-meta">([\s\S]*?)<\/span>\s*(?=<span class="person-meta"|<\/span>)/g)).map(x => x[1])
    const kontingen = teks(meta[0] ?? '')
    const caborGender = (meta[1] ?? '').split('<span class="sep"></span>')
    const g = baku(teks(caborGender[1] ?? ''))
    const foto = isi.match(/<img class="person-avatar has-photo" src="([^"]+)"/)?.[1] ?? null
    if (!nama) continue
    atlet.push({
      ref: Number(m[2]), slug: `${m[1]}-${m[2]}`, nama, kontingen, cabor: teks(caborGender[0] ?? ''),
      gender: g === 'putra' ? 'L' : g === 'putri' ? 'P' : null,
      foto: foto ? (foto.startsWith('http') ? foto : `${SITUS_KONIJABAR}${dekode(foto)}`) : null,
    })
  }
  const hal = html.match(/hal\.\s*(\d+)\s*\/\s*(\d+)/)
  return { atlet, halaman: hal ? Number(hal[1]) : 1, totalHalaman: hal ? Number(hal[2]) : 1 }
}

/** Pilihan saringan cabor di /atlet: [{ id, nama }]. */
export function bacaPilihanCabor(html: string): { id: number; nama: string }[] {
  const sel = html.match(/<select name="cabor">([\s\S]*?)<\/select>/)?.[1] ?? ''
  return Array.from(sel.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)).map(m => ({ id: Number(m[1]), nama: dekode(m[2]).trim() }))
}

/** Daftar nomor yang sudah punya bagan (dari data terstruktur halaman /bagan). */
export function bacaDaftarBagan(html: string): { ref: number; nama: string }[] {
  const hasil: { ref: number; nama: string }[] = []
  const lihat = new Set<number>()
  for (const m of Array.from(html.matchAll(/"name":"([^"]+)","url":"https:\/\/porprov\.konijabar\.or\.id\/bagan\?nomor=(\d+)"/g))) {
    const ref = Number(m[2])
    if (lihat.has(ref)) continue
    lihat.add(ref); hasil.push({ ref, nama: dekode(m[1]).replace(/\\u0026/g, '&') })
  }
  return hasil
}

/** Halaman /bagan?nomor=: kartu babak gugur, klasemen grup, dan matriks laga grup. */
export function bacaBagan(html: string): BaganLuar {
  const kartu: KartuBagan[] = []
  // Tiap kartu dipotong dari awal tag-nya sampai awal kartu berikutnya (isi kartu bisa bersarang).
  const awal = Array.from(html.matchAll(/<(a|div) class="bk-card([^"]*)"([^>]*)>/g))
  awal.forEach((m, i) => {
    const kelas = m[2], atribut = m[3]
    const dari = m.index! + m[0].length
    const isi = html.slice(dari, i + 1 < awal.length ? awal[i + 1].index : Math.min(html.length, dari + 4000))
    const laga = atribut.match(/href="\/laga\/(\d+)"/)?.[1] ?? null
    const meta = teks(isi.match(/class="bk-meta"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '')
    const sisi: SisiBagan[] = []
    const reSisi = /<span class="bk-side([^"]*)"([^>]*)>([\s\S]*?)(?=<span class="bk-side|$)/g
    for (let s; (s = reSisi.exec(isi));) {
      const attr = s[2]
      const judul = dekode(attr.match(/title="([^"]*)"/)?.[1] ?? '')
      const dk = attr.match(/data-k="(\d+)-([\d.]+)"/)
      const titik = judul.indexOf(': ')
      const nama = teks(s[3].match(/class="bk-name">([\s\S]*?)<\/span>/)?.[1] ?? '')
      if (!nama) continue
      const refs = dk ? dk[2].split('.').map(Number) : []
      sisi.push({
        kontingen: titik > 0 ? judul.slice(0, titik) : null, nama,
        skor: teks(s[3].match(/class="bk-score">([\s\S]*?)<\/span>/)?.[1] ?? '') || null,
        kontingen_ref: dk ? Number(dk[1]) : null, atlet_ref: refs.length === 1 ? refs[0] : null, atlet_refs: refs,
        hasil: s[1].includes('is-win') ? 'menang' : s[1].includes('is-lose') ? 'kalah' : null,
      })
    }
    const status: KartuBagan['status'] = kelas.includes('is-empty') ? 'bye' : kelas.includes('is-done') ? 'selesai' : kelas.includes('is-live') ? 'live' : 'jadwal'
    if (sisi.length) kartu.push({ laga, meta, status, sisi })
  })

  const grup: BaganLuar['grup'] = []
  const matriks: LagaMatriks[] = []
  for (const g of Array.from(html.matchAll(/<section class="sg-group[^"]*"[\s\S]*?<span class="sg-pill">([^<]+)<\/span>([\s\S]*?)<\/section>/g))) {
    const nama = teks(g[1]), isi = g[2]
    const panel = isi.match(/data-pane="klasemen"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? ''
    const klasemen: BarisGrup[] = []
    for (const r of Array.from(panel.matchAll(/<tr>([\s\S]*?)<\/tr>/g))) {
      const sel = Array.from(r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g), (x: RegExpMatchArray) => x[1])
      if (sel.length < 7) continue
      klasemen.push({ kontingen: teks(sel[1]), main: angka(sel[2]), menang: angka(sel[3]), seri: angka(sel[4]), kalah: angka(sel[5]), poin: angka(sel[6]) })
    }
    grup.push({ nama, klasemen })
    // Matriks: kolom dari judul <th title>, baris dari sel pertama; tiap sel berisi tautan laga.
    const mx = isi.match(/data-pane="matriks"[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/)?.[1] ?? ''
    const kolom = Array.from((mx.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? '').matchAll(/<th title="([^"]+)"/g), (x: RegExpMatchArray) => dekode(x[1]))
    for (const r of Array.from((mx.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? '').matchAll(/<tr>([\s\S]*?)<\/tr>/g))) {
      const sel = Array.from(r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g), (x: RegExpMatchArray) => x[1])
      const baris = teks(sel[0] ?? '')
      sel.slice(1).forEach((c, i) => {
        const a = c.match(/<a class="mx-res ([^"]+)" href="\/laga\/(\d+)"[^>]*>([\s\S]*?)<\/a>/)
        if (a && kolom[i]) matriks.push({ laga: a[2], baris, kolom: kolom[i], teks: teks(a[3]), status: a[1].includes('wait') ? 'jadwal' : 'selesai' })
      })
    }
  }
  return { kartu, grup, matriks }
}

/** Putra/putri dari tulisan nomor: 'L' | 'P' | null (campuran/terbuka/tak jelas). */
export function genderNomor(nomor: string | null | undefined): 'L' | 'P' | null {
  const n = ` ${baku(nomor)} `
  if (/ (campuran|mix|mixed|terbuka|open) /.test(n)) return null
  if (/ (putri|pi|wanita|women|w) /.test(n)) return 'P'
  if (/ (putra|pa|pria|men|m) /.test(n)) return 'L'
  return null
}

const KATA_UMUM = new Set(['putra', 'putri', 'pa', 'pi', 'kelas', 'nomor', 'kg', 'dan', 'campuran', 'terbuka', 'under', 'max', 'sd', 's', 'd', 'm'])
/** Kelompok kata penentu jenis: bila satu sisi menyebutnya, sisi lain wajib menyebut kelompok yang sama. */
const KELOMPOK_JENIS = [
  ['outdoor', 'lapangan', 'field'], ['indoor'], ['pasir', 'pantai', 'beach'], ['3x3'], ['5x5'],
  ['beregu', 'team', 'tim', 'berpasangan', 'ganda', 'double', 'pair', 'estafet', 'relay'],
  ['perorangan', 'individu', 'individual', 'single', 'tunggal'],
]
const angkaDari = (s: string) => new Set((s.match(/\d+/g) ?? []).map(x => String(Number(x))))
// "K - 1", "C 2" (kayak/kano) dijadikan satu kata ("k1", "c2") supaya huruf penentunya tidak hilang.
const satukanKelas = (s: string) => s.replace(/\b([KC])\s*-?\s*(\d)\b/gi, '$1$2')
const kataPenting = (s: string) => new Set(baku(satukanKelas(s)).split(' ').filter(w => w.length > 1 && !/^\d+$/.test(w) && !KATA_UMUM.has(w)))
const jenisDari = (kata: Set<string>) => KELOMPOK_JENIS.map(g => g.some(w => kata.has(w)))

/**
 * Cari bagan situs untuk satu target emas. Bagan bernama "<Cabor> <Nomor> <Putra/Putri>".
 * Syarat: cabor sama, jenis kelamin cocok, semua angka kelas di bagan ada di target,
 * kata penentu jenis (outdoor/indoor/beregu/perorangan/3x3 …) sama, dan kata lain cukup mirip.
 * Hanya bila satu kandidat jelas paling mirip — ragu berarti tanpa bagan.
 */
export function cocokBagan(cabor: string, nomor: string | null, daftar: { ref: number; nama: string }[],
  opsi: { gender?: 'L' | 'P' | null; caborTeks?: string | null } = {}): { ref: number; nama: string } | null {
  const c = baku(cabor)
  const g = genderNomor(nomor) ?? opsi.gender ?? null
  const teksTarget = `${nomor ?? ''} ${opsi.caborTeks ?? ''}`
  const kataT = kataPenting(teksTarget)
  for (const w of Array.from(kataPenting(cabor))) kataT.delete(w)
  const angkaT = angkaDari(nomor ?? '')
  const jenisT = jenisDari(kataT)
  const calon = daftar.filter(b => baku(b.nama).startsWith(c))
    .filter(b => { const gb = genderNomor(b.nama); return !g || !gb || gb === g })
    .map(b => {
      const sisa = b.nama.slice(cabor.length)
      const kataB = kataPenting(sisa)
      const angkaB = angkaDari(sisa)
      if (Array.from(angkaB).some(x => !angkaT.has(x))) return null
      if (angkaT.size && angkaB.size === 0) return null
      if (jenisDari(kataB).some((v, i) => v !== jenisT[i])) return null
      const biasa = (k: Set<string>) => new Set(Array.from(k).filter(w => !KELOMPOK_JENIS.some(gr => gr.includes(w))))
      const t = biasa(kataT), bb = biasa(kataB)
      const sama = Array.from(t).filter(w => bb.has(w)).length
      // Nomor tanpa kata (mis. "W C 1 - 200 M"): cukup bila seluruh angkanya sama persis.
      const skor = t.size ? sama / Math.max(t.size, bb.size)
        : angkaT.size ? (angkaB.size === angkaT.size ? 0.5 : 0)
        : bb.size ? 0 : 1
      return skor >= 0.5 ? { b, skor } : null
    })
    .filter((x): x is { b: { ref: number; nama: string }; skor: number } => !!x)
    .sort((a, b) => b.skor - a.skor)
  if (!calon.length) return null
  if (calon.length > 1 && calon[1].skor === calon[0].skor) return null
  return calon[0].b
}

/**
 * Kontingen yang disebut di teks pesaing File B ("KOTA BANDUNG", "Karawang, Syaifahmi …").
 * Nama tanpa "Kab./Kota" yang ambigu (mis. Bandung, Bekasi) dipetakan ke keduanya.
 */
export function kontingenDisebut(teksPesaing: string | null | undefined, kontingen: string[]): string[] {
  // Singkatan yang biasa dipakai di File B.
  const t = ` ${baku(teksPesaing)} `.replace(/ bdg /g, ' bandung ').replace(/ kbb /g, ' kab bandung barat ').replace(/ tasik /g, ' tasikmalaya ').replace(/ kabupaten /g, ' kab ')
  if (!t.trim()) return []
  const hasil = new Set<string>()
  for (const k of kontingen) {
    const bk = baku(k)                       // "kab bandung", "kota bandung"
    const inti = bk.replace(/^(kab|kota)\s+/, '')
    const lengkap = [bk]
    if (lengkap.some(x => t.includes(` ${x} `))) { hasil.add(k); continue }
    // Hanya inti ("karawang") — cocokkan bila tidak didahului kab/kota lain.
    if (t.includes(` ${inti} `) && !new RegExp(` (kab|kota) ${inti} `).test(t)) hasil.add(k)
  }
  return Array.from(hasil)
}

/** URL halaman situs. */
export const urlAtletLuar = (slug: string) => `${SITUS_KONIJABAR}/atlet/${slug}`
export const urlBagan = (ref: number) => `${SITUS_KONIJABAR}/bagan?nomor=${ref}`
