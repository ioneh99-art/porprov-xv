// scripts/impor-kartu-bpjs.ts — impor kartu BPJS Ketenagakerjaan dari PDF gabungan KONI.
//
//   npx tsx scripts/impor-kartu-bpjs.ts "<berkas.pdf>"           → uji saja, tidak menulis
//   npx tsx scripts/impor-kartu-bpjs.ts "<berkas.pdf>" --tulis   → unggah & simpan
//   … --timpa  → kartu yang NIK-nya sudah ada ikut ditimpa (bawaan: dilewati, supaya
//                tautan manual KONIDA & kartu lama tidak berubah — untuk berkas tambahan)
//
// Tiap halaman = satu kartu. Halaman dipecah jadi PDF sendiri (untuk diunduh
// pemiliknya) + gambar JPG kartu (untuk profil atlet), disimpan di bucket
// privat 'kartu-bpjs', lalu dicatat di tabel kartu_bpjs.
// Pencocokan atlet: NIK sama → 'nik'; nama sama tapi NIK beda → 'nik_beda'
// (kandidat, TIDAK ditautkan otomatis); selain itu 'bukan_atlet' (official dsb).
// Butuh poppler (pdftotext, pdfseparate, pdftoppm) & .env.local.
// Aman diulang: kartu yang sudah ada dilewati (kecuali --timpa).

import { readFileSync, existsSync, mkdtempSync, rmSync } from 'fs'
import { execFileSync } from 'child_process'
import { tmpdir } from 'os'
import { join, basename } from 'path'
import { createClient } from '@supabase/supabase-js'
import { bacaHalamanKartu, namaKartuCocok } from '../src/lib/kartu-bpjs'

const KONTINGEN_ID = 4
const BUCKET = 'kartu-bpjs'
// Posisi kartu di halaman 792×223 pt, dirender 300 dpi.
const POTONG = ['-r', '300', '-x', '140', '-y', '180', '-W', '825', '-H', '545']

function muatEnv() {
  if (!existsSync('.env.local')) return
  for (const b of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = b.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

;(async () => {
  const berkas = process.argv[2]
  const tulis = process.argv.includes('--tulis')
  if (!berkas || !existsSync(berkas)) { console.log('✗ Sebutkan berkas PDF kartu.'); process.exit(1) }
  muatEnv()
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

  // 1. Baca teks semua halaman
  const halaman = execFileSync('pdftotext', ['-layout', berkas, '-'], { maxBuffer: 1 << 28 }).toString().split('\f')
  const kartu: { hal: number; nik: string; kpj: string; nama: string; berlaku: string | null }[] = []
  const gagalBaca: number[] = []
  halaman.forEach((t, i) => {
    if (!t.trim()) return
    const k = bacaHalamanKartu(t)
    if (k) kartu.push({ hal: i + 1, ...k }); else gagalBaca.push(i + 1)
  })
  console.log(`Terbaca ${kartu.length} kartu${gagalBaca.length ? `, GAGAL dibaca halaman: ${gagalBaca.join(', ')}` : ''}`)

  // 2. Atlet kontingen
  let atlet: any[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('atlet').select('id,nama_lengkap,no_ktp').eq('kontingen_id', KONTINGEN_ID).range(f, f + 999)
    if (error) throw error
    atlet = atlet.concat(data); if (data.length < 1000) break
  }
  const perNik = new Map<string, any[]>()
  for (const a of atlet) {
    const n = String(a.no_ktp ?? '').replace(/\D/g, ''); if (!n) continue
    perNik.set(n, [...(perNik.get(n) ?? []), a])
  }

  // 3. Cocokkan
  const dipakai = new Set<number>()
  const rencana = kartu.map(k => {
    const c = perNik.get(k.nik) ?? []
    if (c.length === 1) { dipakai.add(c[0].id); return { ...k, status: 'nik', atlet_id: c[0].id as number | null, kandidat: null as number | null } }
    return { ...k, status: 'bukan_atlet', atlet_id: null as number | null, kandidat: null as number | null }
  })
  for (const r of rencana) {
    if (r.status !== 'bukan_atlet') continue
    const c = atlet.filter(a => !dipakai.has(a.id) && namaKartuCocok(r.nama, a.nama_lengkap))
    if (c.length === 1) { r.status = 'nik_beda'; r.kandidat = c[0].id }
  }
  // Kartu yang NIK-nya sudah tersimpan dilewati (kecuali --timpa): berkas tambahan tidak boleh
  // mengubah kartu lama, termasuk yang sudah ditautkan manual oleh KONIDA.
  const timpa = process.argv.includes('--timpa')
  const ada = new Set<string>()
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('kartu_bpjs').select('nik').eq('kontingen_id', KONTINGEN_ID).range(f, f + 999)
    if (error) throw error
    for (const r of data ?? []) ada.add(r.nik)
    if ((data ?? []).length < 1000) break
  }
  const kembarBerkas = kartu.length - new Set(kartu.map(k => k.nik)).size
  const sudahAda = rencana.filter(r => ada.has(r.nik)).length
  if (!timpa) for (let i = rencana.length - 1; i >= 0; i--) if (ada.has(rencana[i].nik)) rencana.splice(i, 1)
  console.log(`Sudah ada di sistem: ${sudahAda}${timpa ? ' (akan ditimpa)' : ' (dilewati)'} · NIK kembar di berkas: ${kembarBerkas} · Akan disimpan: ${rencana.length}`)
  const hitung = (s: string) => rencana.filter(r => r.status === s).length
  console.log(`Cocok NIK: ${hitung('nik')} · Nama sama NIK beda: ${hitung('nik_beda')} · Bukan atlet: ${hitung('bukan_atlet')}`)
  if (!tulis) { console.log('(uji saja — tambahkan --tulis untuk menyimpan)'); return }

  // 4. Pecah, unggah, simpan
  const tmp = mkdtempSync(join(tmpdir(), 'kartu-bpjs-'))
  let ok = 0, gagal = 0
  try {
    const kerjakan = async (r: typeof rencana[number]) => {
      const p = join(tmp, `h${r.hal}`)
      execFileSync('pdfseparate', ['-f', String(r.hal), '-l', String(r.hal), berkas, `${p}.pdf`])
      execFileSync('pdftoppm', ['-f', String(r.hal), '-l', String(r.hal), ...POTONG, '-jpeg', '-jpegopt', 'quality=85', '-singlefile', berkas, p])
      const jalurPdf = `${KONTINGEN_ID}/${r.nik}.pdf`, jalurJpg = `${KONTINGEN_ID}/${r.nik}.jpg`
      const u1 = await db.storage.from(BUCKET).upload(jalurPdf, readFileSync(`${p}.pdf`), { upsert: true, contentType: 'application/pdf' })
      const u2 = await db.storage.from(BUCKET).upload(jalurJpg, readFileSync(`${p}.jpg`), { upsert: true, contentType: 'image/jpeg' })
      if (u1.error || u2.error) throw new Error((u1.error ?? u2.error)!.message)
      const { error } = await db.from('kartu_bpjs').upsert({
        kontingen_id: KONTINGEN_ID, atlet_id: r.atlet_id, kandidat_atlet_id: r.kandidat, status_cocok: r.status,
        jenis: 'ketenagakerjaan', nik: r.nik, kpj: r.kpj, nama_kartu: r.nama, berlaku: r.berlaku,
        berkas_pdf: jalurPdf, berkas_gambar: jalurJpg, sumber_berkas: basename(berkas), sumber_halaman: r.hal,
      }, { onConflict: 'kontingen_id,nik,jenis' })
      if (error) throw new Error(error.message)
      rmSync(`${p}.pdf`, { force: true }); rmSync(`${p}.jpg`, { force: true })
    }
    const antre = [...rencana]
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (let r = antre.shift(); r; r = antre.shift()) {
        try { await kerjakan(r); ok++ } catch (e: any) { gagal++; console.log(`✗ hal ${r.hal}: ${e.message}`) }
        if ((ok + gagal) % 50 === 0) console.log(`  … ${ok + gagal}/${rencana.length}`)
      }
    }))
  } finally { rmSync(tmp, { recursive: true, force: true }) }

  await db.from('audit_logs').insert({
    action: 'KARTU_BPJS_DIIMPOR', resource: 'kartu_bpjs', kontingen_id: KONTINGEN_ID, actor_email: 'skrip impor-kartu-bpjs',
    severity: 'info', payload: { berkas: basename(berkas), tersimpan: ok, gagal, dilewati_sudah_ada: timpa ? 0 : sudahAda, nik: hitung('nik'), nik_beda: hitung('nik_beda'), bukan_atlet: hitung('bukan_atlet') },
  })
  console.log(`✓ Tersimpan ${ok} kartu${gagal ? `, gagal ${gagal}` : ''}.`)
})()
