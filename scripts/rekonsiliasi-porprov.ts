// scripts/rekonsiliasi-porprov.ts — cetak rekonsiliasi akhir medali satu kontingen:
// podium resmi PORPROV XV (porprov15_*, dari arsip situs panitia) vs medali disahkan kita.
//
//   npx tsx scripts/rekonsiliasi-porprov.ts [kontingen_id]     (bawaan 4 = Kab. Bandung)
//
// Sama dengan panel "Rekonsiliasi akhir" di War Room → Perolehan Medali.

import { readFileSync, existsSync } from 'fs'

if (existsSync('.env.local'))
  for (const b of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = b.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }

;(async () => {
  const { muatRekonsiliasi } = await import('../src/lib/rekonsiliasi-porprov-db')
  const id = Number(process.argv[2] ?? 4)
  const r = await muatRekonsiliasi(id)
  if (!r.kontingen) { console.log(`Kontingen ${id} belum tertaut ke data PORPROV (porprov15_kontingen.kontingen_id).`); return }
  console.log(`${r.kontingen.nama} · peringkat ${r.kontingen.peringkat} · resmi ${r.kontingen.emas}/${r.kontingen.perak}/${r.kontingen.perunggu} · arsip ${r.arsip.tanggal}`)
  console.log(`Medali resmi ${r.jumlah.resmi} · disahkan kita ${r.jumlah.kita} · berpasangan ${r.jumlah.berpasangan}`)
  console.log(`\nResmi tapi tidak ada di data kita (${r.resmiSaja.length}):`)
  r.resmiSaja.forEach(x => console.log(`  ${x.jenis} · ${x.cabor} · ${x.nomor} · ${x.atlet.join(', ')}`))
  console.log(`\nDisahkan kita tapi tidak ada di podium resmi (${r.kitaSaja.length}):`)
  r.kitaSaja.forEach(x => console.log(`  #${x.laporanId} ${x.jenis} · ${x.nomor} · ${x.atlet.join(', ')}`))
  console.log(`\nNama nomor ditulis berbeda (${r.nomorBeda.length}):`)
  r.nomorBeda.forEach(x => console.log(`  #${x.laporanId} ${x.jenis} · resmi "${x.nomorResmi}" · kita "${x.nomorKita}"`))
  const nyata = r.atletBeda.filter(x => x.hanyaResmi.length)
  console.log(`\nDaftar atlet berbeda (${r.atletBeda.length}; ${nyata.length} dengan nama resmi yang belum ada di laporan kita):`)
  r.atletBeda.forEach(x => console.log(`  #${x.laporanId} ${x.jenis} · ${x.nomorResmi}${x.resmiTanpaNama ? ' · (panitia tidak mencantumkan nama)' : ''}${x.hanyaResmi.length ? ` · hanya resmi: ${x.hanyaResmi.join(', ')}` : ''}${x.hanyaKita.length ? ` · hanya kita: ${x.hanyaKita.join(', ')}` : ''}`))
})().catch(e => { console.error('✗', e?.message ?? e); process.exit(1) })
