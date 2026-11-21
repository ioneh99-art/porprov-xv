// scripts/arsip-konijabar.ts — arsipkan SEMUA halaman publik situs panitia PORPROV XV
// (porprov.konijabar.or.id) apa adanya, dimampatkan, sebelum situs berubah/ditutup.
//
//   npx tsx scripts/arsip-konijabar.ts [tanggal-arsip]     (bawaan: hari ini)
//
// Sumber daftar halaman = sitemap.xml situs. Jalur yang dilarang robots.txt tidak disentuh.
// Hasil: data/arsip-konijabar/<tanggal>/<jalur>.html.gz + manifest.jsonl (tidak masuk git).
// Aman diulang: halaman yang sudah terarsip dilewati. 2 jalur paralel, ada jeda.

import { mkdirSync, existsSync, writeFileSync, appendFileSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { gzipSync } from 'zlib'

const SITUS = 'https://porprov.konijabar.or.id'
const UA = 'Mozilla/5.0 (compatible; arsip-porprov/1.0)'
const JALUR = 2
const JEDA_MS = 350
const DILARANG = ['/cek', '/api/', '/layar', '/games/', '/peserta/']
// Urutan arsip: halaman ringkas & paling bernilai dulu.
const URUTAN = ['', 'info', 'eksibisi', 'klaster', 'kontingen', 'cabor', 'hasil', 'bagan', 'jadwal', 'nomor', 'laga', 'atlet']

const tanggal = (/^\d{4}-\d{2}-\d{2}$/.test(process.argv[2] ?? '') ? process.argv[2] : null) ?? new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
const AKAR = join('data', 'arsip-konijabar', tanggal)

/** "/laga/3917" → laga/3917.html.gz · "/jadwal?tgl=2026-11-06" → jadwal/tgl=2026-11-06.html.gz · "/" → index.html.gz */
export function berkasUntuk(path: string): string {
  const [p, q] = path.split('?')
  let rel = p.replace(/^\/+|\/+$/g, '') || 'index'
  if (q) rel += (p.replace(/^\/+|\/+$/g, '') ? '/' : '') + q.replace(/[^A-Za-z0-9=._-]+/g, '_')
  else if (!rel.includes('/') && rel !== 'index') rel += '/index'
  return rel + '.html.gz'
}

const tidur = (ms: number) => new Promise(r => setTimeout(r, ms))

async function ambil(path: string): Promise<{ status: number; html?: string }> {
  for (let coba = 1; coba <= 4; coba++) {
    try {
      const r = await fetch(SITUS + path, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' } })
      if (r.status === 429 || r.status >= 500) { await tidur(15000 * coba); continue }
      return { status: r.status, html: r.ok ? await r.text() : undefined }
    } catch { await tidur(3000 * coba) }
  }
  return { status: 0 }
}

const langsung = /arsip-konijabar\.ts$/.test(process.argv[1] ?? '')
if (langsung) (async () => {
  mkdirSync(AKAR, { recursive: true })
  const peta = await ambil('/sitemap.xml')
  if (!peta.html) { console.log('✗ sitemap tidak terbaca'); process.exit(1) }
  writeFileSync(join(AKAR, 'sitemap.xml'), peta.html)
  const semua = Array.from(new Set(Array.from(peta.html.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1].replace(SITUS, '') || '/')))
    .map(p => p.replace(/&amp;/g, '&'))
    .filter(p => !DILARANG.some(d => p.startsWith(d)))
  const jenis = (p: string) => p.split(/[/?]/)[1] ?? ''
  semua.sort((a, b) => (URUTAN.indexOf(jenis(a)) + 99) % 99 - (URUTAN.indexOf(jenis(b)) + 99) % 99 || a.localeCompare(b, 'en', { numeric: true }))
  const antre = semua.filter(p => !existsSync(join(AKAR, berkasUntuk(p))))
  console.log(`Sitemap: ${semua.length} halaman · sudah terarsip ${semua.length - antre.length} · sisa ${antre.length}`)

  const manifest = join(AKAR, 'manifest.jsonl')
  let selesai = 0, gagal = 0, bita = 0
  const mulai = Date.now()
  let i = 0
  async function pekerja() {
    while (i < antre.length) {
      const path = antre[i++]
      const t0 = Date.now()
      const r = await ambil(path)
      if (r.html) {
        const f = join(AKAR, berkasUntuk(path))
        mkdirSync(dirname(f), { recursive: true })
        const gz = gzipSync(r.html)
        writeFileSync(f, gz)
        bita += gz.length
        selesai++
      } else gagal++
      appendFileSync(manifest, JSON.stringify({ path, status: r.status, ms: Date.now() - t0, at: new Date().toISOString() }) + '\n')
      const n = selesai + gagal
      if (n % 250 === 0) {
        const laju = n / ((Date.now() - mulai) / 1000)
        console.log(`  … ${n}/${antre.length} (${jenis(path)}) · gagal ${gagal} · ${(bita / 1e6).toFixed(1)} MB · sisa ±${Math.round((antre.length - n) / laju / 60)} mnt`)
      }
      await tidur(JEDA_MS)
    }
  }
  await Promise.all(Array.from({ length: JALUR }, pekerja))
  console.log(`\n✓ Arsip ${tanggal}: ${selesai} halaman baru, ${gagal} gagal, ${(bita / 1e6).toFixed(1)} MB mampat → ${AKAR}`)
  if (gagal) console.log('  Jalankan ulang perintah yang sama untuk mencoba lagi yang gagal.')
})().catch(e => { console.error('✗', e?.message ?? e); process.exit(1) })
