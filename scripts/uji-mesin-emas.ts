// scripts/uji-mesin-emas.ts — Mesin Emas: target emas + hasil situs KONI Jabar → sah otomatis.
// Dijalankan: npm run uji:mesin-emas. Contoh nama/nomor = data asli 3–6 Nov 2026.
import { atletCocok, nomorCocok, rencanaMesinEmas, type LaporMesin, type TargetEmas } from '../src/lib/mesin-emas'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const ok = JSON.stringify(dapat) === JSON.stringify(harap)
  if (ok) lulus++; else { gagal++; console.log(`✗ ${nama}\n   dapat: ${JSON.stringify(dapat)}\n   harap: ${JSON.stringify(harap)}`) }
}

// ── Nomor ──
cek('nomor sama gaya tulis beda', nomorCocok('Grego - kelas s/d 87 Kg', 'Grego - kelas s/d 87 Kg (Pa)'), true)
cek('52 kg ≠ 62 kg walau kata lain sama', nomorCocok('Bebas - Kelas s/d 52 Kg', 'Bebas - Kelas s/d 62 Kg (Pi)'), false)
cek('gaya bebas ≠ grego (kelas sama)', nomorCocok('Bebas - Kelas s/d 87 Kg', 'Grego - kelas s/d 87 Kg (Pa)'), false)
cek('angka dengan titik ribuan', nomorCocok('Kelas Terbuka 2.000 M', 'Kelas Terbuka 2000 M'), true)
cek('huruf menempel angka (K2 1000M)', nomorCocok('M K 2 - 1000 M', 'K2 1000M (Pa)'), true)
cek('K-2 ≠ K-1', nomorCocok('M K 2 - 1000 M', 'K1 1000 M (Pa)'), false)
cek('putra vs putri bertentangan', nomorCocok('Beregu Putra', 'Beregu (Pi)'), false)
cek('hanya angka (angkat besi)', nomorCocok('60 KG', '60 Kg Putra'), true)
cek('nomor kosong', nomorCocok(null, '60 kg'), false)

// ── Atlet ──
cek('nama target huruf besar', atletCocok('IKBAR GUSTIANA', ['Ikbar Gustiana']), true)
cek('nama target terpotong/beda ejaan (cukup satu kata)', atletCocok('HERLIN APRILIA', ['Herlin Aprilin Lali']), true)
cek('beregu: satu nama cocok', atletCocok('LUTFAN ANANDA - M FAISAL - M RIFKI - ASEP W', ['Asep Wandi', 'Lutfan Ananda Antariksa']), true)
cek('atlet lain', atletCocok('ABDUL LATIF', ['Riski Muzaki']), false)
cek('"Muhammad" saja tidak cukup', atletCocok('MUHAMMAD RASYA', ['Muhammad Ikhsan']), false)
cek('laporan tanpa atlet', atletCocok('ABDUL LATIF', []), false)
cek('target TEAM tidak diperiksa', atletCocok('TEAM', []), true)

// ── Rencana ──
const T = (urutan: number, tanggal: string, nomor: string, atlet: string, cabor_id = 25): TargetEmas => ({ urutan, tanggal, cabor_id, nomor, atlet })
let id = 100
const L = (x: Partial<LaporMesin>): LaporMesin => ({
  id: ++id, cabor_id: 25, tanggal: '2026-11-05', lawan: 'Kota Bekasi', partai_id: null, hasil: 'emas', peringkat: null,
  status: 'menunggu', ref_luar: String(id), pelapor_nama: 'Situs KONI Jabar', nomor_teks: 'Bebas - Kelas s/d 52 Kg (Pa)', atlet: ['Abdul Latif'], ...x,
})
const target = [T(4, '2026-11-05', 'Bebas - Kelas s/d 52 Kg', 'ABDUL LATIF'), T(5, '2026-11-05', 'Bebas - Kelas s/d 86 Kg', 'NURDIANSYAH'), T(8, '2026-11-06', 'Bebas - Kelas s/d 70 Kg', 'DIMAS MAULANA')]

{ id = 100
  const r = rencanaMesinEmas(target, [L({})], '2026-11-05')
  cek('emas situs cocok target → disahkan', r, { sahkan: [{ urutan: 4, dari: 101, sahkan: 101, tutup: null, hasil: 'emas' }], tahan: [] }) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ hasil: 'perak' })], '2026-11-05')
  cek('target dapat perak → yang disahkan perak (hasil sebenarnya)', r.sahkan.map(s => [s.urutan, s.hasil]), [[4, 'perak']]) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ hasil: 'menang' })], '2026-11-05')
  cek('baru menang penyisihan → belum apa-apa', r, { sahkan: [], tahan: [] }) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ tanggal: '2026-11-06', nomor_teks: 'Bebas - Kelas s/d 70 Kg (Pa)', atlet: ['Dimas Maulana'] })], '2026-11-05')
  cek('target besok belum diproses', r.sahkan.length, 0) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ nomor_teks: 'Bebas - Kelas s/d 62 Kg (Pi)', atlet: ['Dewi Kristina'] })], '2026-11-05')
  cek('medali di nomor lain (62 kg) tidak dipakai target 52 kg', r.sahkan.length, 0) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ atlet: ['Riski Muzaki'] })], '2026-11-05')
  cek('atlet tidak cocok → tidak disahkan', r.sahkan.length, 0) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ status: 'disahkan', ref_luar: null }), L({})], '2026-11-05')
  cek('sudah ada medali sah untuk nomor itu → diam', r, { sahkan: [], tahan: [] }) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ dikoreksi: true })], '2026-11-05')
  cek('pernah dikoreksi KONIDA → mesin tidak mengulang', r, { sahkan: [], tahan: [] }) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ status: 'ditolak' })], '2026-11-05')
  cek('laporan ditolak diabaikan', r.sahkan.length, 0) }
{ id = 100
  const situs = L({}), pic = L({ ref_luar: null, pelapor_nama: 'PIC Gulat', hasil: 'emas' })
  const r = rencanaMesinEmas(target, [situs, pic], '2026-11-05')
  cek('PIC lapor emas yang sama (kembar) → PIC yang disahkan, data situs ditutup', r.sahkan, [{ urutan: 4, dari: situs.id, sahkan: pic.id, tutup: situs.id, hasil: 'emas' }]) }
{ id = 100
  const situs = L({}), pic = L({ ref_luar: null, pelapor_nama: 'PIC Gulat', hasil: 'emas', lawan: 'Kota Banjar' })
  const r = rencanaMesinEmas(target, [situs, pic], '2026-11-05')
  cek('PIC emas sama, lawan ditulis beda → tetap PIC yang disahkan', [r.sahkan[0]?.sahkan, r.sahkan[0]?.tutup], [pic.id, situs.id]) }
{ id = 100
  const situs = L({}), pic = L({ ref_luar: null, hasil: 'perak' })
  const r = rencanaMesinEmas(target, [situs, pic], '2026-11-05')
  cek('PIC perak vs situs emas → ditahan untuk KONIDA', [r.sahkan.length, r.tahan.map(t => t.urutan)], [0, [4]]) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({}), L({ hasil: 'perunggu' })], '2026-11-05')
  cek('situs dua medali untuk satu nomor → ditahan', [r.sahkan.length, r.tahan.length], [0, 1]) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ tanggal: '2026-11-07' })], '2026-11-07')
  cek('jadwal mundur 2 hari masih tertangkap', r.sahkan.length, 1) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({ tanggal: '2026-11-08' })], '2026-11-08')
  cek('mundur 3 hari → tidak (bisa nomor lain)', r.sahkan.length, 0) }
{ id = 100
  const r = rencanaMesinEmas(target, [L({}), L({ nomor_teks: 'Bebas - Kelas s/d 86 Kg (Pa)', atlet: ['Nurdiansyah'], hasil: 'perunggu' })], '2026-11-05')
  cek('dua target sehari: masing-masing dapat laporannya', r.sahkan.map(s => [s.urutan, s.hasil]), [[4, 'emas'], [5, 'perunggu']]) }
{ id = 100
  const r = rencanaMesinEmas([{ ...target[0], cabor_id: null }], [L({})], '2026-11-05')
  cek('target tanpa cabor_id dilewati', r.sahkan.length, 0) }

console.log(`\nuji-mesin-emas: ${lulus} lulus, ${gagal} gagal`)
if (gagal > 0) process.exit(1)
