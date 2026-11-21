// scripts/data-laporan-akhir-kabbandung.ts — kumpulkan & hitung seluruh angka untuk
// "Laporan Akhir PORPROV XV — Versi Kab. Bandung" (hanya membaca). Keluaran JSON.
//
//   npx tsx scripts/data-laporan-akhir-kabbandung.ts <keluaran.json>
//
// Sumber: gudang porprov15_* (arsip situs panitia, diperiksa silang dengan klasemen resmi),
// laporan_hasil Kab. Bandung (232 medali disahkan = podium resmi 232/232), target KONI 54
// (target-emas-koni.ts), proyeksi 74 (proyeksi_medali), File B (intel_target_*), data atlet kita.

import { readFileSync, writeFileSync } from 'fs'
for (const b of readFileSync('.env.local', 'utf8').split('\n')) { const m = b.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

;(async () => {
  const keluar = process.argv[2] ?? 'laporan-data.json'
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
  const { muatRapor } = await import('../src/lib/rapor-kontingen-db')
  const { muatBibit } = await import('../src/lib/bibit-atlet-db')
  const { muatPersaingan } = await import('../src/lib/persaingan-db')
  const { muatBahan } = await import('../src/lib/bahan-porprov-db')
  const { muatRekonsiliasi } = await import('../src/lib/rekonsiliasi-porprov-db')
  const { jumlahRekor, persenMenang } = await import('../src/lib/persaingan')
  const { TARGET_EMAS_KONI } = await import('../src/lib/target-emas-koni')
  const { nomorCocok, atletCocok } = await import('../src/lib/mesin-emas')

  const semua = async <T,>(q: (a: number, b: number) => any): Promise<T[]> => {
    const h: T[] = []
    for (let p = 0; ; p++) { const { data, error } = await q(p * 1000, p * 1000 + 999); if (error) throw error; h.push(...(data ?? [])); if (!data || data.length < 1000) break }
    return h
  }

  const [rapor, bibit, persaingan, bahan, rekon] = await Promise.all([muatRapor(), muatBibit(true), muatPersaingan(), muatBahan(), muatRekonsiliasi(4)])
  const kb = rapor.kontingen.find(k => k.kontingenId === 4)!
  const KB = kb.situsId
  const namaK = new Map(rapor.kontingen.map(k => [k.situsId, k.nama]))
  const namaCaborSitus = new Map(rapor.cabor.map(c => [c.situsId, c.nama]))

  // ── Laporan medali kita (sama dengan podium resmi 232/232) ──
  const [cabor, lap, proy, intelA, intelC, atletKB, p15KB] = await Promise.all([
    semua<any>((a, b) => db.from('cabang_olahraga').select('id, nama').range(a, b)),
    semua<any>((a, b) => db.from('laporan_hasil').select('id, cabor_id, nomor_teks, hasil, atlet_ids, tanggal').eq('kontingen_id', 4).in('status', ['disahkan', 'tervalidasi']).range(a, b)),
    semua<any>((a, b) => db.from('proyeksi_medali').select('urutan, tanggal, medali, cabor_id, cabor_teks, nomor_teks, atlet_teks').eq('kontingen_id', 4).order('urutan').range(a, b)),
    semua<any>((a, b) => db.from('intel_target_atlet').select('atlet_id, nama_file, cabang_file, target_medali').eq('kontingen_id', 4).range(a, b)),
    semua<any>((a, b) => db.from('intel_target_cabang').select('cabang, target_cabor_emas, target_koni_emas, probability').eq('kontingen_id', 4).range(a, b)),
    semua<any>((a, b) => db.from('atlet').select('id, nama_lengkap, cabor_id, gender, tgl_lahir, status_verifikasi').eq('kontingen_id', 4).range(a, b)),
    semua<any>((a, b) => db.from('porprov15_atlet').select('situs_id, atlet_id, nama, cabor, emas, perak, perunggu, jumlah_laga').eq('kontingen_situs_id', 16).range(a, b)),
  ])
  const namaCabor = new Map(cabor.map(c => [c.id, c.nama]))
  const namaAtlet = new Map(atletKB.map(a => [a.id, a.nama_lengkap]))
  const medaliLap = lap.filter(l => ['emas', 'perak', 'perunggu'].includes(l.hasil))

  // Medali per cabor kita
  const perCabor = new Map<number, { emas: number; perak: number; perunggu: number }>()
  medaliLap.forEach(l => { const x = perCabor.get(l.cabor_id) ?? { emas: 0, perak: 0, perunggu: 0 }; x[l.hasil as 'emas']++; perCabor.set(l.cabor_id, x) })
  const medaliPerCabor = Array.from(perCabor.entries()).map(([id, m]) => ({ cabor_id: id, cabor: namaCabor.get(id) ?? `#${id}`, ...m, total: m.emas + m.perak + m.perunggu }))
    .sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu)

  // ── Target KONI 54 per cabor ──
  const target54 = TARGET_EMAS_KONI.map(t => { const a = perCabor.get(t.cabor_id) ?? { emas: 0, perak: 0, perunggu: 0 }; return { ...t, realisasi: a.emas, perak: a.perak, perunggu: a.perunggu, selisih: a.emas - t.emas } })
  const idTarget = new Set(TARGET_EMAS_KONI.map(t => t.cabor_id))
  const emasLuarTarget = medaliPerCabor.filter(c => !idTarget.has(c.cabor_id) && c.emas > 0)

  // ── Proyeksi 74 (per nomor/atlet) dicocokkan ke laporan sah ──
  const peringkat: Record<string, number> = { emas: 3, perak: 2, perunggu: 1 }
  // Baris PPT kadang memuat beberapa nomor ("5000 M, 10.000 M, FULL MARATHON") dan ditulis berbeda
  // ("DBR MEN 12 CREW - 1000 M" vs "DBR - 12 pendayung - 1000 m (Pa)"): nomor dianggap sama bila
  // nomorCocok, ATAU angka-angkanya persis sama dan ada minimal satu kata yang sama.
  const angkaN = (s: string) => Array.from(new Set((s.toUpperCase().replace(/(\d)[.,](\d{3})\b/g, '$1$2').match(/\d+/g) ?? []).map(Number))).sort((a, b) => a - b).join(',')
  const kataN = (s: string) => new Set(s.toUpperCase().replace(/[^A-Z]+/g, ' ').split(' ').filter(w => w.length >= 3 && !['PUTRA', 'PUTRI', 'KELAS', 'NOMOR', 'MEN', 'WOMEN', 'TEAM', 'CREW'].includes(w)))
  const nomorLonggar = (t: string, l: string) => {
    if (nomorCocok(t, l)) return true
    const at = angkaN(t); if (!at || at !== angkaN(l)) return false
    const a = kataN(t), b = kataN(l); let sama = 0; a.forEach(w => { if (b.has(w)) sama++ }); return sama >= 1 || a.size === 0
  }
  const selisihHari = (a: string | null, b: string | null) => (a && b ? Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000 : 99)
  const proyeksi74 = proy.map(p => {
    const bagian = String(p.nomor_teks ?? '').split(/,|\//).map(x => x.trim()).filter(Boolean)
    const namaLap = (l: any) => (l.atlet_ids ?? []).map((i: number) => namaAtlet.get(i) ?? '')
    const urutM = (xs: any[]) => xs.sort((a, b) => (peringkat[b.hasil] ?? 0) - (peringkat[a.hasil] ?? 0))
    const sama = lap.filter(l => l.cabor_id === p.cabor_id && bagian.some(b => nomorLonggar(b, l.nomor_teks ?? '')) && atletCocok(p.atlet_teks, namaLap(l)))
    let terbaik = urutM(sama.filter(l => peringkat[l.hasil]))[0]
    let catatan = ''
    if (!terbaik && !/^\s*(team|tim)\s*$/i.test(p.atlet_teks ?? '')) {
      // Atlet yang sama meraih medali di nomor lain cabor yang sama (±3 hari dari tanggal target)
      const lain = urutM(lap.filter(l => l.cabor_id === p.cabor_id && peringkat[l.hasil] && atletCocok(p.atlet_teks, namaLap(l)) && selisihHari(l.tanggal, p.tanggal) <= 3))[0]
      if (lain) { terbaik = lain; catatan = `medali di nomor lain: ${lain.nomor_teks}` }
    }
    const tanpaMedali = !terbaik ? sama.find(l => !peringkat[l.hasil]) : null
    let hasil = terbaik ? terbaik.hasil : tanpaMedali ? 'tanpa medali' : 'tidak ada hasil tercatat'
    if (hasil === 'tidak ada hasil tercatat' && !/^\s*(team|tim)\s*$/i.test(p.atlet_teks ?? '')) {
      // Cek daftar resmi panitia: atletnya bertanding tapi tanpa medali, atau tidak tercatat sama sekali
      const kataCabor = (x: string) => new Set(String(x ?? '').toLowerCase().replace(/[^a-z]+/g, ' ').split(' ').filter(w => w.length >= 4))
      const caborT = new Set(Array.from(kataCabor(p.cabor_teks)).concat(Array.from(kataCabor(namaCabor.get(p.cabor_id) ?? ''))))
      const caborSama = (c: string) => Array.from(kataCabor(c)).some(w => caborT.has(w))
      const resmi = p15KB.find(r => caborSama(r.cabor) && atletCocok(p.atlet_teks, [r.nama]))
      if (resmi) { hasil = 'tanpa medali'; catatan = `tercatat resmi (${resmi.cabor}, ${resmi.jumlah_laga ?? 0} laga) tanpa medali` }
      else catatan = 'nama tidak ada di daftar atlet resmi panitia'
    }
    return { urutan: p.urutan, tanggal: p.tanggal, cabor: p.cabor_teks, nomor: p.nomor_teks, atlet: p.atlet_teks, hasil, catatan: catatan || (tanpaMedali ? `laporan PIC: ${tanpaMedali.hasil}` : ''), laporan: (terbaik ?? tanpaMedali)?.id ?? null }
  })

  // ── File B: target per atlet & per cabang ──
  const p15PerAtlet = new Map(p15KB.filter(p => p.atlet_id).map(p => [p.atlet_id, p]))
  const fileB = intelA.map(t => {
    const r = t.atlet_id ? p15PerAtlet.get(t.atlet_id) : null
    const hasil = !r ? 'tidak tercatat resmi' : r.emas > 0 ? 'emas' : r.perak > 0 ? 'perak' : r.perunggu > 0 ? 'perunggu' : 'tanpa medali'
    return { nama: t.nama_file, cabang: t.cabang_file, target: t.target_medali ?? 'tanpa target', hasil }
  })
  const silang: Record<string, Record<string, number>> = {}
  fileB.forEach(f => { (silang[f.target] ??= {}); silang[f.target][f.hasil] = (silang[f.target][f.hasil] ?? 0) + 1 })
  const cabangB = intelC.map(c => ({ cabang: c.cabang, targetCabor: c.target_cabor_emas, targetKoni: c.target_koni_emas, probability: c.probability }))

  // ── Emas per hari (tanggal laporan) ──
  const emasHari: Record<string, number> = {}
  medaliLap.filter(l => l.hasil === 'emas').forEach(l => { const t = l.tanggal ?? '?'; emasHari[t] = (emasHari[t] ?? 0) + 1 })

  // ── Atlet: kontingen resmi, umur, bermedali ──
  const umurDari = (tgl: string | null) => { if (!tgl) return null; const [y, m, d] = tgl.slice(0, 10).split('-').map(Number); let u = 2026 - y; if (11 < m || (m === 11 && 20 < d)) u--; return u >= 5 && u <= 80 ? u : null }
  const resmiAtlet = p15KB.map(p => ({ ...p, umur: umurDari(atletKB.find(a => a.id === p.atlet_id)?.tgl_lahir ?? null), gender: atletKB.find(a => a.id === p.atlet_id)?.gender ?? null }))
  const kelompokUmur = (u: number | null) => u == null ? 'tidak diketahui' : u <= 17 ? '≤17' : u <= 20 ? '18–20' : u <= 23 ? '21–23' : u <= 29 ? '24–29' : u <= 35 ? '30–35' : '≥36'
  const umurRingkas: Record<string, { atlet: number; bermedali: number; emas: number }> = {}
  resmiAtlet.forEach(a => { const k = kelompokUmur(a.umur); const x = (umurRingkas[k] ??= { atlet: 0, bermedali: 0, emas: 0 }); x.atlet++; if (a.emas + a.perak + a.perunggu > 0) x.bermedali++; if (a.emas > 0) x.emas++ })

  // ── Per cabor: atlet dikirim vs medali (dari peta resmi) ──
  const petaKB = rapor.peta[KB] ?? {}
  const caborKB = Object.entries(petaKB).map(([c, s]) => ({ cabor: namaCaborSitus.get(Number(c)) ?? c, ...s, medali: s.emas + s.perak + s.perunggu }))
    .sort((a, b) => b.emas - a.emas || b.medali - a.medali || b.atlet - a.atlet)
  const penguasaCabor = rapor.cabor.map(c => ({ cabor: c.nama, emas: c.emas, penguasa: c.penguasa?.nama ?? null, porsi: c.penguasa?.porsiEmas ?? null, persaingan: c.persaingan,
    kita: petaKB[c.situsId] ? { ...petaKB[c.situsId] } : null }))

  // ── Persaingan Kab. Bandung ──
  const milik = persaingan.rekor.filter(r => r.a === KB)
  const perLawan = new Map<number, typeof milik>(); milik.forEach(r => perLawan.set(r.b, [...(perLawan.get(r.b) ?? []), r]))
  const lawan = Array.from(perLawan.entries()).map(([b, rs]) => { const t = jumlahRekor(rs); return { lawan: namaK.get(b), ...t, laga: t.menang + t.kalah + t.seri, persen: persenMenang(t) } }).sort((a, b) => b.laga - a.laga)
  const perCaborDuel = new Map<number, typeof milik>(); milik.forEach(r => { if (r.caborSitusId != null) perCaborDuel.set(r.caborSitusId, [...(perCaborDuel.get(r.caborSitusId) ?? []), r]) })
  const duelCabor = Array.from(perCaborDuel.entries()).map(([c, rs]) => { const t = jumlahRekor(rs); return { cabor: namaCaborSitus.get(c), ...t, laga: t.menang + t.kalah + t.seri, persen: persenMenang(t) } }).sort((a, b) => b.laga - a.laga)
  const duelBerulang = persaingan.duelBerulang.filter(d => d.a.kontingenSitusId === KB || d.b.kontingenSitusId === KB).length

  // ── Bibit Kab. Bandung ──
  const bibitKB = bibit.atlet.filter(a => a.kontingenSitusId === KB)
  const bibitMuda = bibitKB.filter(a => a.umur != null && a.umur <= 20)
  const bibitSeJabar = bibit.atlet.slice(0, 25)

  // ── Nomor sepi: medali Kab. Bandung ──
  const sepiKB = bahan.sepiPerKontingen.find(s => s.kontingenSitusId === KB) ?? null

  const urutJenis: Record<string, number> = { emas: 0, perak: 1, perunggu: 2 }
  const medaliList = medaliLap.map(l => ({ tanggal: l.tanggal, cabor: namaCabor.get(l.cabor_id) ?? '', nomor: l.nomor_teks, hasil: l.hasil, atlet: (l.atlet_ids ?? []).map((i: number) => namaAtlet.get(i) ?? '').filter(Boolean) }))
    .sort((a, b) => urutJenis[a.hasil] - urutJenis[b.hasil] || a.cabor.localeCompare(b.cabor) || String(a.nomor).localeCompare(String(b.nomor)))

  // Matriks rekor tanding antar 6 besar klasemen
  const enam = rapor.kontingen.slice(0, 6).map(k => k.situsId)
  const matriks6 = enam.map(a => ({ kontingen: namaK.get(a), lawan: enam.map(b => { if (a === b) return null; const t = jumlahRekor(persaingan.rekor.filter(r => r.a === a && r.b === b)); return { lawan: namaK.get(b), ...t } }) }))

  const data = {
    medaliList, matriks6, persainganGlobal: { laga: persaingan.jumlahLaga, seri: persaingan.jumlahSeri, duelBerulang: persaingan.duelBerulang.length },
    dibuat: new Date().toISOString(), arsip: rapor.arsip,
    ringkas: rapor.ringkas, kb, klasemen: rapor.kontingen,
    target54, target54Total: TARGET_EMAS_KONI.reduce((t, x) => t + x.emas, 0), emasLuarTarget, medaliPerCabor,
    proyeksi74, fileB: { silang, jumlah: fileB.length, cabang: cabangB, totalTargetCabor: cabangB.reduce((t, c) => t + (c.targetCabor ?? 0), 0), totalTargetKoni: cabangB.reduce((t, c) => t + (c.targetKoni ?? 0), 0) },
    emasHari, umurRingkas, caborKB, penguasaCabor,
    persaingan: { total: jumlahRekor(milik), lawan, duelCabor, duelBerulang },
    bibit: { kb: bibitKB.slice(0, 60), mudaJumlah: bibitMuda.length, mudaEmas: bibitMuda.filter(a => a.emas > 0).length, muda: bibitMuda, seJabar: bibitSeJabar,
      kriteriaKB: bibitKB.reduce((t: Record<string, number>, a) => { a.kriteria.forEach(k => { t[k] = (t[k] ?? 0) + 1 }); return t }, {}) },
    bahan: { ringkas: bahan.ringkas, hari: bahan.hari, venue: bahan.venue.slice(0, 15), sepiKB, sepiTop: bahan.sepiPerKontingen.slice(0, 8).map(s => ({ ...s, nama: namaK.get(s.kontingenSitusId) })) },
    rekon: { jumlah: rekon.jumlah, atletBeda: rekon.atletBeda.length, nomorBeda: rekon.nomorBeda.length },
    atlet: { resmi: p15KB.length, kitaVerified: atletKB.filter(a => ['Verified', 'Posted'].includes(a.status_verifikasi)).length, bermedali: p15KB.filter(p => p.emas + p.perak + p.perunggu > 0).length, peraihEmas: p15KB.filter(p => p.emas > 0).length },
  }
  writeFileSync(keluar, JSON.stringify(data, null, 1))
  console.log('✓', keluar)
  console.log('KB', kb.peringkat, kb.emas, kb.perak, kb.perunggu, '| target54', data.target54Total, '| proyeksi', Object.entries(proyeksi74.reduce((t: any, p) => { t[p.hasil] = (t[p.hasil] ?? 0) + 1; return t }, {})))
  console.log('File B silang', JSON.stringify(silang), 'cabang', data.fileB.totalTargetCabor, data.fileB.totalTargetKoni)
  console.log('target54:', target54.map(t => `${t.cabor} ${t.realisasi}/${t.emas}`).join(' · '))
  console.log('emas luar target:', emasLuarTarget.map(c => `${c.cabor} ${c.emas}`).join(' · '))
  console.log('umur', JSON.stringify(umurRingkas))
})().catch(e => { console.error('✗', e?.message ?? e); process.exit(1) })
