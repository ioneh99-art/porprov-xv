// scripts/data-laporan-akhir-konijabar.ts — angka untuk "Laporan Akhir PORPROV XV — Versi KONI Jabar"
// (netral, seluruh kontingen). Hanya membaca gudang porprov15_*. Keluaran JSON.
//
//   npx tsx scripts/data-laporan-akhir-konijabar.ts <keluaran.json>

import { readFileSync, writeFileSync } from 'fs'
for (const b of readFileSync('.env.local', 'utf8').split('\n')) { const m = b.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }

;(async () => {
  const keluar = process.argv[2] ?? 'data-konijabar.json'
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
  const { muatRapor } = await import('../src/lib/rapor-kontingen-db')
  const { muatBibit } = await import('../src/lib/bibit-atlet-db')
  const { muatPersaingan } = await import('../src/lib/persaingan-db')
  const { muatBahan } = await import('../src/lib/bahan-porprov-db')
  const { jumlahRekor, persenMenang } = await import('../src/lib/persaingan')
  const semua = async <T,>(q: (a: number, b: number) => any): Promise<T[]> => {
    const h: T[] = []
    for (let p = 0; ; p++) { const { data, error } = await q(p * 1000, p * 1000 + 999); if (error) throw error; h.push(...(data ?? [])); if (!data || data.length < 1000) break }
    return h
  }

  // Versi KONI Jabar: tanpa umur (umur hanya milik data Kab. Bandung).
  const [rapor, bibit, ps, bahan] = await Promise.all([muatRapor(), muatBibit(false), muatPersaingan(), muatBahan()])
  const namaK = new Map(rapor.kontingen.map(k => [k.situsId, k.nama]))
  const namaC = new Map(rapor.cabor.map(c => [c.situsId, c.nama]))

  // ── Daftar juara 1.154 nomor ──
  const [nomor, medali] = await Promise.all([
    semua<any>((a, b) => db.from('porprov15_nomor').select('situs_id, nama, cabor_situs_id, disiplin, jumlah_peserta').order('situs_id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_medali').select('nomor_situs_id, urutan, medali, kontingen_situs_id, atlet_nama').order('id').range(a, b)),
  ])
  const perNomor = new Map<number, any[]>(); medali.forEach(m => perNomor.set(m.nomor_situs_id, [...(perNomor.get(m.nomor_situs_id) ?? []), m]))
  const urutM: Record<string, number> = { emas: 0, perak: 1, perunggu: 2 }
  const juara = nomor.map(n => {
    const ms = (perNomor.get(n.situs_id) ?? []).sort((a, b) => urutM[a.medali] - urutM[b.medali] || a.urutan - b.urutan)
    const tulis = (jenis: string) => ms.filter(m => m.medali === jenis).map(m => {
      const k = namaK.get(m.kontingen_situs_id) ?? m.kontingen ?? '—'
      const a = (m.atlet_nama ?? []) as string[]
      return a.length === 1 ? `${a[0]} (${k})` : k
    }).join('; ')
    return { cabor: namaC.get(n.cabor_situs_id) ?? '', disiplin: n.disiplin, nomor: n.nama, peserta: n.jumlah_peserta, emas: tulis('emas'), perak: tulis('perak'), perunggu: tulis('perunggu') }
  }).sort((a, b) => a.cabor.localeCompare(b.cabor) || String(a.nomor).localeCompare(String(b.nomor)))
  const jumlahJenis = { emas: medali.filter(m => m.medali === 'emas').length, perak: medali.filter(m => m.medali === 'perak').length, perunggu: medali.filter(m => m.medali === 'perunggu').length }
  const nomorTanpaPerak = nomor.filter(n => !(perNomor.get(n.situs_id) ?? []).some(m => m.medali === 'perak')).length
  const nomorDuaPerunggu = nomor.filter(n => (perNomor.get(n.situs_id) ?? []).filter(m => m.medali === 'perunggu').length >= 2).length

  // ── Rekor tanding per kontingen ──
  const rekorK = rapor.kontingen.map(k => {
    const milik = ps.rekor.filter(r => r.a === k.situsId)
    const per = new Map<number, typeof milik>(); milik.forEach(r => per.set(r.b, [...(per.get(r.b) ?? []), r]))
    const lawan = Array.from(per.entries()).map(([b, rs]) => { const t = jumlahRekor(rs); return { lawan: namaK.get(b), ...t, laga: t.menang + t.kalah + t.seri, persen: persenMenang(t) } })
    const layak = lawan.filter(l => l.laga >= 5)
    return {
      situsId: k.situsId, total: jumlahRekor(milik),
      terberat: layak.slice().sort((a, b) => (a.persen ?? 1) - (b.persen ?? 1))[0] ?? null,
      terkuasai: layak.slice().sort((a, b) => (b.persen ?? 0) - (a.persen ?? 0))[0] ?? null,
    }
  })
  // Rivalitas: pasangan dengan laga terbanyak
  const pasangan = new Map<string, { a: number; b: number; menang: number; kalah: number; seri: number }>()
  ps.rekor.filter(r => r.a < r.b).forEach(r => { const k = `${r.a}|${r.b}`; const x = pasangan.get(k) ?? { a: r.a, b: r.b, menang: 0, kalah: 0, seri: 0 }; x.menang += r.menang; x.kalah += r.kalah; x.seri += r.seri; pasangan.set(k, x) })
  const rivalitas = Array.from(pasangan.values()).map(p => ({ a: namaK.get(p.a), b: namaK.get(p.b), menang: p.menang, kalah: p.kalah, seri: p.seri, laga: p.menang + p.kalah + p.seri, persenA: (p.menang + p.seri / 2) / Math.max(1, p.menang + p.kalah + p.seri) }))
    .sort((x, y) => y.laga - x.laga).slice(0, 15)
  const sepuluh = rapor.kontingen.slice(0, 10).map(k => k.situsId)
  const matriks10 = sepuluh.map(a => ({ kontingen: namaK.get(a), lawan: sepuluh.map(b => a === b ? null : jumlahRekor(ps.rekor.filter(r => r.a === a && r.b === b))) }))

  // ── Profil kontingen ──
  const bibitPerK = new Map<number, any[]>(); bibit.atlet.forEach(a => { if (a.kontingenSitusId != null) bibitPerK.set(a.kontingenSitusId, [...(bibitPerK.get(a.kontingenSitusId) ?? []), a]) })
  const sepiPerK = new Map(bahan.sepiPerKontingen.map(s => [s.kontingenSitusId, s]))
  const profil = rapor.kontingen.map(k => {
    const sel = Object.entries(rapor.peta[k.situsId] ?? {}).map(([c, s]) => ({ cabor: namaC.get(Number(c)) ?? c, ...s }))
    const top = sel.filter(s => s.emas + s.perak + s.perunggu > 0).sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu).slice(0, 4)
    const kuasai = rapor.cabor.filter(c => c.penguasa?.situsId === k.situsId).map(c => c.nama)
    const r = rekorK.find(x => x.situsId === k.situsId)!
    const b = (bibitPerK.get(k.situsId) ?? []).slice(0, 3).map(a => ({ nama: a.nama, cabor: a.cabor, emas: a.emas, emasP: a.emasP }))
    return { ...k, top, kuasai, rekor: r, bibit: b, sepi: sepiPerK.get(k.situsId) ?? null }
  })

  // ── Nomor sepi ≤ 3 ──
  const sepiDaftar = bahan.nomorSepi.filter(n => n.peserta <= 3).map(n => ({ cabor: namaC.get(n.caborSitusId ?? -1) ?? '', nomor: n.nama, peserta: n.peserta, emas: n.medali.filter(m => m.medali === 'emas').map(m => namaK.get(m.kontingenSitusId ?? -1)).join('; ') }))
  const sepiPerCabor: Record<string, number> = {}; sepiDaftar.forEach(n => { sepiPerCabor[n.cabor] = (sepiPerCabor[n.cabor] ?? 0) + 1 })

  const data = {
    arsip: rapor.arsip, ringkas: rapor.ringkas, jumlahJenis, nomorTanpaPerak, nomorDuaPerunggu,
    klasemen: rapor.kontingen, cabor: rapor.cabor, profil, rivalitas, matriks10,
    peta10: Object.fromEntries(rapor.kontingen.slice(0, 10).map(k => [k.situsId, Object.fromEntries(Object.entries(rapor.peta[k.situsId] ?? {}).map(([c, x]) => [c, x.emas]))])),
    persainganGlobal: { laga: ps.jumlahLaga, seri: ps.jumlahSeri, duelBerulang: ps.duelBerulang.length },
    bibitTop: bibit.atlet.slice(0, 50).map(a => ({ nama: a.nama, kontingen: a.kontingen, cabor: a.cabor, emas: a.emas, perak: a.perak, perunggu: a.perunggu, emasP: a.emasP, perakP: a.perakP, perungguP: a.perungguP, duelMenang: a.duelMenang, duelKalah: a.duelKalah, beruntun: a.beruntun, kriteria: a.kriteria })),
    bibitKriteria: bibit.atlet.reduce((t: Record<string, number>, a) => { a.kriteria.forEach(k => { t[k] = (t[k] ?? 0) + 1 }); return t }, {}), bibitJumlah: bibit.atlet.length,
    beruntunTop: bibit.atlet.slice().sort((a, b) => b.beruntun - a.beruntun).slice(0, 10).map(a => ({ nama: a.nama, kontingen: a.kontingen, cabor: a.cabor, beruntun: a.beruntun, duelMenang: a.duelMenang, duelKalah: a.duelKalah })),
    bahan: { ringkas: bahan.ringkas, hari: bahan.hari, venue: bahan.venue.slice(0, 15).map(v => ({ ...v, caborNama: v.cabor.map(c => namaC.get(c) ?? String(c)) })), sepiTop: bahan.sepiPerKontingen.map(s => ({ ...s, nama: namaK.get(s.kontingenSitusId) })), sepiDaftar, sepiPerCabor },
    juara,
  }
  writeFileSync(keluar, JSON.stringify(data, null, 1))
  console.log('✓', keluar, '| juara', juara.length, '| medali', jumlahJenis, '| tanpa perak', nomorTanpaPerak, '| 2 perunggu', nomorDuaPerunggu)
  console.log('rivalitas', rivalitas.slice(0, 5).map(r => `${r.a} vs ${r.b} ${r.menang}-${r.kalah}-${r.seri}`).join(' · '))
  console.log('sepi per cabor', Object.entries(sepiPerCabor).sort((a, b) => b[1] - a[1]).slice(0, 8))
  console.log('kontingen beremas', rapor.kontingen.filter(k => k.emas > 0).length, '| tergantung', rapor.kontingen.filter(k => k.tergantung).map(k => k.nama))
})().catch(e => { console.error('✗', e?.message ?? e); process.exit(1) })
