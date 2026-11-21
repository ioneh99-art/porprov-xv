// scripts/pilah-atlet-tak-tercatat.ts — pilah atlet Kab. Bandung berstatus Verified/Posted
// yang TIDAK ada di daftar resmi panitia PORPROV XV (gudang porprov15_*). Hanya membaca.
//
//   npx tsx scripts/pilah-atlet-tak-tercatat.ts [berkas.xlsx]
//
// Kategori (urutan prioritas):
//   1 Tercatat bertanding di laporan sah — dilaporkan PIC ikut bertanding (laporan disahkan) tapi tak ada di daftar resmi
//   2 Kemungkinan data kembar         — nama sangat mirip atlet resmi Kab. Bandung yg sudah tertaut ke id lain
//   3 Nama sama di kontingen lain     — tercatat resmi atas nama kontingen lain
//   4 Terdaftar di berkas KONI        — ada di klasifikasi resmi KONI (pendaftaran_nomor) tapi tak ada di situs
//   5 Cabor tanpa atlet resmi Kab. Bandung — seluruh cabornya tak berangkat/tak dipertandingkan untuk Kab. Bandung
//   6 Tidak ditemukan                 — kemungkinan batal berangkat / cadangan
// Lembar kedua: atlet RESMI panitia yang di data kita belum Verified/Posted (masih Draft).
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { baku } from '../src/lib/konijabar'

for (const b of readFileSync('.env.local', 'utf8').split('\n')) { const m = b.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

async function semua<T>(q: (a: number, b: number) => any): Promise<T[]> {
  const h: T[] = []
  for (let p = 0; ; p++) { const { data, error } = await q(p * 1000, p * 1000 + 999); if (error) throw error; h.push(...(data ?? [])); if (!data || data.length < 1000) break }
  return h
}
/** Kemiripan nama (Dice bigram atas huruf saja) 0–1. */
function mirip(a: string, b: string): number {
  const x = baku(a).replace(/ /g, ''), y = baku(b).replace(/ /g, '')
  if (!x || !y) return 0
  if (x === y) return 1
  const bg = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) ?? 0) + 1) } return m }
  const bx = bg(x), by = bg(y); let sama = 0
  bx.forEach((n, k) => { sama += Math.min(n, by.get(k) ?? 0) })
  return (2 * sama) / (x.length - 1 + y.length - 1)
}
/** Nama kita termuat di nama resmi (atau sebaliknya) — mis. tanpa nama belakang. */
const termuat = (a: string, b: string) => { const x = baku(a), y = baku(b); return x.length >= 6 && y.length >= 6 && (x.includes(y) || y.includes(x)) }

;(async () => {
  const keluar = process.argv[2] ?? `${process.env.HOME}/Downloads/Pilah_Atlet_Tidak_Tercatat_PORPROV_KabBandung_21Nov2026.xlsx`
  const { data: kon } = await db.from('porprov15_kontingen').select('situs_id').eq('kontingen_id', 4).single()
  const KB = kon!.situs_id
  const [kita, resmi, cabor, daftar, lapor, bpjs, rek, p15cabor] = await Promise.all([
    semua<any>((a, b) => db.from('atlet').select('id, nama_lengkap, status_verifikasi, cabor_id, cabor_nama_raw, gender').eq('kontingen_id', 4).in('status_verifikasi', ['Verified', 'Posted']).order('id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_atlet').select('situs_id, slug, nama, kontingen, kontingen_situs_id, cabor, cabor_situs_id, atlet_id, emas, perak, perunggu').order('situs_id').range(a, b)),
    semua<any>((a, b) => db.from('cabang_olahraga').select('id, nama').range(a, b)),
    semua<any>((a, b) => db.from('pendaftaran_nomor').select('atlet_id, nomor, cabor_berkas').eq('kontingen_id', 4).not('atlet_id', 'is', null).range(a, b)),
    semua<any>((a, b) => db.from('laporan_hasil').select('id, hasil, nomor_teks, atlet_ids, status').eq('kontingen_id', 4).in('status', ['disahkan', 'tervalidasi']).range(a, b)),
    semua<any>((a, b) => db.from('kartu_bpjs').select('atlet_id').eq('kontingen_id', 4).not('atlet_id', 'is', null).range(a, b)),
    semua<any>((a, b) => db.from('rekonsiliasi_peserta').select('atlet_id, status_peserta').not('atlet_id', 'is', null).range(a, b)),
    semua<any>((a, b) => db.from('porprov15_cabor').select('situs_id, nama, cabor_id').range(a, b)),
  ])
  const namaCabor = new Map(cabor.map(c => [c.id, c.nama]))
  const tertaut = new Set(resmi.filter(r => r.atlet_id).map(r => r.atlet_id))
  const tak = kita.filter(a => !tertaut.has(a.id))
  const resmiKB = resmi.filter(r => r.kontingen_situs_id === KB)
  const resmiLain = resmi.filter(r => r.kontingen_situs_id !== KB)
  const namaLokal = new Map(kita.map(a => [a.id, a.nama_lengkap]))
  // cabor kita (cabor_id) yang punya atlet resmi Kab. Bandung
  const caborSitusKeKita = new Map(p15cabor.map(c => [c.situs_id, c.cabor_id]))
  const caborBerangkat = new Set(resmiKB.map(r => caborSitusKeKita.get(r.cabor_situs_id)).filter(Boolean))
  const caborBerangkatNama = new Set(resmiKB.map(r => baku(r.cabor)))
  const daftarPer = new Map<number, string[]>(); daftar.forEach(d => daftarPer.set(d.atlet_id, [...(daftarPer.get(d.atlet_id) ?? []), d.nomor]))
  const laporPer = new Map<number, string[]>(); lapor.forEach(l => (l.atlet_ids ?? []).forEach((i: number) => laporPer.set(i, [...(laporPer.get(i) ?? []), `#${l.id} ${l.hasil} ${l.nomor_teks}`])))
  const punyaBpjs = new Set(bpjs.map(b => b.atlet_id))
  const rekPer = new Map(rek.map(r => [r.atlet_id, r.status_peserta]))

  const baris = tak.map(a => {
    const cab = namaCabor.get(a.cabor_id) ?? a.cabor_nama_raw ?? '—'
    // Kembar hanya dicari di cabor yang sama (nama mirip di cabor lain = orang lain).
    const caborSama = (r: any) => caborSitusKeKita.get(r.cabor_situs_id) === a.cabor_id || baku(r.cabor) === baku(cab)
    const kandidatKB = resmiKB.filter(caborSama).map(r => ({ r, s: Math.max(mirip(a.nama_lengkap, r.nama), termuat(a.nama_lengkap, r.nama) ? 0.9 : 0) })).sort((x, y) => y.s - x.s)[0]
    const namaLain = resmiLain.map(r => ({ r, s: mirip(a.nama_lengkap, r.nama) })).filter(x => x.s >= 0.9).sort((x, y) => y.s - x.s)
    // Nama sama di kontingen lain hanya bermakna bila cabornya juga sama; beda cabor = kemungkinan orang lain.
    const kandidatLain = namaLain.find(x => caborSama(x.r))
    const senamaLain = !kandidatLain && namaLain[0] ? ` · ada nama sama di ${namaLain[0].r.kontingen} (${namaLain[0].r.cabor}) — beda cabor, kemungkinan orang lain` : ''
    const lap = laporPer.get(a.id) ?? []
    const dft = daftarPer.get(a.id) ?? []
    const caborAda = caborBerangkat.has(a.cabor_id) || caborBerangkatNama.has(baku(cab))
    let kategori: string, petunjuk = ''
    const miripCabor = kandidatKB && kandidatKB.s >= 0.6 ? ` · nama resmi paling mirip di cabor ini: "${kandidatKB.r.nama}" ${(kandidatKB.s * 100).toFixed(0)}%` : ''
    if (lap.length) { kategori = '1 Tercatat bertanding di laporan sah'; petunjuk = lap.join('; ') + miripCabor }
    else if (kandidatKB && kandidatKB.s >= 0.82) {
      kategori = '2 Kemungkinan data kembar'
      petunjuk = `Mirip atlet resmi "${kandidatKB.r.nama}" (${kandidatKB.r.cabor}) yang tertaut ke id ${kandidatKB.r.atlet_id} "${namaLokal.get(kandidatKB.r.atlet_id) ?? '?'}" · kemiripan ${(kandidatKB.s * 100).toFixed(0)}%`
    }
    else if (kandidatLain) { kategori = '3 Nama sama di kontingen lain'; petunjuk = `Resmi atas nama ${kandidatLain.r.kontingen} (${kandidatLain.r.cabor}) — "${kandidatLain.r.nama}"` }
    else if (dft.length) { kategori = '4 Terdaftar di berkas KONI, tak ada di situs'; petunjuk = dft.join('; ') }
    else if (!caborAda) { kategori = '5 Cabor tanpa atlet resmi Kab. Bandung'; petunjuk = `Tidak ada satu pun atlet resmi Kab. Bandung di cabor ${cab}` }
    else { kategori = '6 Tidak ditemukan'; petunjuk = (miripCabor + senamaLain).replace(/^ · /, '') }
    return {
      kategori, id: a.id, nama: a.nama_lengkap, cabor: cab, status: a.status_verifikasi, gender: a.gender ?? '',
      bpjs: punyaBpjs.has(a.id) ? 'ya' : '', reviu674: rekPer.get(a.id) ?? '', daftarKoni: dft.length ? 'ya' : '', petunjuk,
    }
  }).sort((x, y) => x.kategori.localeCompare(y.kategori) || x.cabor.localeCompare(y.cabor) || x.nama.localeCompare(y.nama))

  const hit: Record<string, number> = {}; baris.forEach(b => { hit[b.kategori] = (hit[b.kategori] ?? 0) + 1 })
  const perCabor: Record<string, number> = {}; baris.forEach(b => { perCabor[b.cabor] = (perCabor[b.cabor] ?? 0) + 1 })
  console.log(`Atlet Verified/Posted Kab. Bandung: ${kita.length} · tertaut ke daftar resmi: ${kita.length - tak.length} · tidak tercatat: ${tak.length}`)
  console.log(hit)
  console.log('per cabor (teratas):', Object.entries(perCabor).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([c, n]) => `${c} ${n}`).join(' · '))
  baris.filter(b => b.kategori.startsWith('1') || b.kategori.startsWith('2') || b.kategori.startsWith('3') || b.kategori.startsWith('4')).forEach(b => console.log(` [${b.kategori[0]}] #${b.id} ${b.nama} (${b.cabor}) — ${b.petunjuk}`))

  // Excel
  const wb = new ExcelJS.Workbook(); wb.creator = 'Superadministrator'
  const ring = wb.addWorksheet('Ringkasan')
  ring.columns = [{ width: 52 }, { width: 12 }, { width: 70 }]
  ring.addRow(['Pilah atlet Kab. Bandung (Verified/Posted) yang tidak ada di daftar resmi panitia PORPROV XV']).font = { bold: true, size: 13 }
  ring.addRow([`Sumber resmi: arsip situs panitia porprov.konijabar.or.id (20 Nov 2026). Dibuat 21 Nov 2026 oleh Superadministrator. Data atlet tidak diubah.`])
  ring.addRow([])
  ring.addRow(['Atlet Verified/Posted Kab. Bandung', kita.length]); ring.addRow(['Tertaut ke daftar resmi panitia', kita.length - tak.length]); ring.addRow(['Tidak tercatat di daftar resmi', tak.length])
  ring.addRow([])
  const jelas: Record<string, string> = {
    '1 Tercatat bertanding di laporan sah': 'Dilaporkan PIC ikut bertanding (laporan hasil yang sudah disahkan), tapi namanya tidak ada di daftar resmi panitia. Cek: salah pilih atlet oleh PIC, atau atlet resmi dengan nama lain.',
    '2 Kemungkinan data kembar': 'Di cabor yang sama ada atlet resmi Kab. Bandung bernama sangat mirip yang sudah tertaut ke data lain. Kemungkinan satu orang tercatat dua kali — perlu digabung.',
    '3 Nama sama di kontingen lain': 'Di cabor yang sama tercatat resmi atas nama kontingen lain. Cek: pindah/dipinjam kontingen lain, atau sekadar nama sama.',
    '4 Terdaftar di berkas KONI, tak ada di situs': 'Ada di berkas klasifikasi resmi KONI tapi tidak muncul di situs panitia. Cek ke panitia.',
    '5 Cabor tanpa atlet resmi Kab. Bandung': 'Tidak ada satu pun atlet resmi Kab. Bandung di cabor ini — cabor tidak berangkat/tidak dipertandingkan untuk Kab. Bandung.',
    '6 Tidak ditemukan': 'Cabornya berangkat tapi atlet ini tidak tercatat. Kemungkinan batal berangkat, cadangan, atau diganti.',
  }
  const hk = ring.addRow(['Kategori', 'Jumlah', 'Arti & tindakan']); hk.font = { bold: true }
  Object.keys(jelas).forEach(k => ring.addRow([k, hit[k] ?? 0, jelas[k]]).getCell(3).alignment = { wrapText: true })
  ring.addRow([]); const hc = ring.addRow(['Cabor', 'Jumlah']); hc.font = { bold: true }
  Object.entries(perCabor).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => ring.addRow([c, n]))

  const ws = wb.addWorksheet('Daftar atlet')
  ws.columns = [
    { header: 'Kategori', key: 'kategori', width: 40 }, { header: 'ID', key: 'id', width: 7 }, { header: 'Nama', key: 'nama', width: 34 },
    { header: 'Cabor', key: 'cabor', width: 20 }, { header: 'Status', key: 'status', width: 10 }, { header: 'L/P', key: 'gender', width: 5 },
    { header: 'Kartu BPJS', key: 'bpjs', width: 10 }, { header: 'Reviu 674', key: 'reviu674', width: 16 }, { header: 'Berkas KONI', key: 'daftarKoni', width: 11 },
    { header: 'Petunjuk', key: 'petunjuk', width: 90 }, { header: 'Keputusan KONIDA', key: 'keputusan', width: 24 },
  ]
  ws.getRow(1).font = { bold: true }; ws.views = [{ state: 'frozen', ySplit: 1 }]; ws.autoFilter = { from: 'A1', to: 'K1' }
  baris.forEach(b => ws.addRow(b))
  // Sisi sebaliknya: atlet RESMI panitia yang di data kita belum Verified/Posted
  const idResmiKB = resmiKB.filter(r => r.atlet_id).map(r => r.atlet_id)
  const status = new Map<number, any>()
  for (let i = 0; i < idResmiKB.length; i += 500) {
    const { data, error } = await db.from('atlet').select('id, nama_lengkap, status_verifikasi, cabor_id, cabor_nama_raw').in('id', idResmiKB.slice(i, i + 500))
    if (error) throw error
    ;(data ?? []).forEach(a => status.set(a.id, a))
  }
  const draft = resmiKB.filter(r => r.atlet_id && !['Verified', 'Posted'].includes(status.get(r.atlet_id)?.status_verifikasi))
    .map(r => { const a = status.get(r.atlet_id); return { id: a.id, nama: a.nama_lengkap, namaResmi: r.nama, cabor: r.cabor, status: a.status_verifikasi, medali: `${r.emas}/${r.perak}/${r.perunggu}`, bermedali: r.emas + r.perak + r.perunggu > 0 ? 'ya' : '', bpjs: punyaBpjs.has(a.id) ? 'ya' : '', halaman: `https://porprov.konijabar.or.id/atlet/${r.slug}` } })
    .sort((x, y) => (y.bermedali ? 1 : 0) - (x.bermedali ? 1 : 0) || x.cabor.localeCompare(y.cabor) || x.nama.localeCompare(y.nama))
  console.log(`Atlet resmi Kab. Bandung yang di data kita belum Verified/Posted: ${draft.length} (bermedali ${draft.filter(d => d.bermedali).length})`)
  ring.addRow([]); ring.addRow([`Sebaliknya: ${draft.length} atlet RESMI panitia (${draft.filter(d => d.bermedali).length} bermedali) di data kita masih berstatus belum Verified/Posted — lihat lembar "Resmi tapi Draft".`]).font = { bold: true }
  const wd = wb.addWorksheet('Resmi tapi Draft')
  wd.columns = [
    { header: 'ID', key: 'id', width: 7 }, { header: 'Nama di data kita', key: 'nama', width: 34 }, { header: 'Nama resmi', key: 'namaResmi', width: 34 },
    { header: 'Cabor', key: 'cabor', width: 20 }, { header: 'Status', key: 'status', width: 10 }, { header: 'E/P/Pr', key: 'medali', width: 8 },
    { header: 'Bermedali', key: 'bermedali', width: 10 }, { header: 'Kartu BPJS', key: 'bpjs', width: 10 }, { header: 'Halaman resmi', key: 'halaman', width: 60 },
    { header: 'Keputusan KONIDA', key: 'keputusan', width: 24 },
  ]
  wd.getRow(1).font = { bold: true }; wd.views = [{ state: 'frozen', ySplit: 1 }]; wd.autoFilter = { from: 'A1', to: 'J1' }
  draft.forEach(d => wd.addRow(d))
  await wb.xlsx.writeFile(keluar)
  console.log(`\n✓ ${keluar}`)
})().catch(e => { console.error('✗', e?.message ?? e); process.exit(1) })
