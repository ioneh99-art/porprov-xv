// scripts/uji-lapor.ts — mengunci aturan laporan hasil lapangan.
// Dijalankan: npm run uji:lapor
import {
  ABJAD_KODE, adalahFinal, bakukanKode, buangNomorKembar, buatKode, capaianTarget, hariPorprov, jenisGambar, kunciKembar,
  periksaJam, periksaLaporan, petaCabang, rekapMedali, tanggalSah, tanggalWIB, timpaKlasemen, tulisHasil,
} from '../src/lib/lapor'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

// ── kode lapor ──
const kode = buatKode()
cek('bentuk kode', /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(kode), true)
cek('kode tanpa huruf rancu', /[IO01]/.test(buatKode(n => new Uint8Array(n).map((_, i) => i * 37))), false)
cek('kode berbeda tiap kali', buatKode() === buatKode(), false)
cek('abjad 32 huruf', ABJAD_KODE.length, 32)
cek('baku dari bentuk bertanda hubung', bakukanKode('abcd-2345'), 'ABCD2345')
cek('baku buang spasi', bakukanKode('  abcd 2345 '), 'ABCD2345')
cek('baku tolak pendek', bakukanKode('ABC-234'), '')
cek('baku tolak huruf rancu', bakukanKode('ABCD-2340'), '')
cek('baku tolak bukan teks', bakukanKode(12345678 as any), '')
cek('kode buatan lolos baku', bakukanKode(kode).length, 8)

// ── tanggal ──
cek('WIB tengah malam lewat', tanggalWIB(new Date('2026-11-07T17:30:00Z')), '2026-11-08')   // 00.30 WIB
cek('WIB sore', tanggalWIB(new Date('2026-11-07T09:00:00Z')), '2026-11-07')
cek('hari pertama', hariPorprov('2026-11-07'), 1)
cek('hari terakhir', hariPorprov('2026-11-20'), 14)
cek('sehari sebelum', hariPorprov('2026-11-06'), null)
cek('sehari sesudah', hariPorprov('2026-11-21'), null)
cek('bukan tanggal', hariPorprov('7 November'), null)
cek('kosong', hariPorprov(null), null)

// ── pemeriksaan isi ──
const dasar = { nomor_teks: ' 53 kg   Putri ', atlet_ids: [5, '5', 7], hasil: 'emas' }
const ok = periksaLaporan(dasar) as any
cek('nomor dirapikan', ok.isi.nomor_teks, '53 kg Putri')
cek('atlet kembar dibuang', ok.isi.atlet_ids, [5, 7])
cek('peringkat kosong utk medali', ok.isi.peringkat, null)
cek('tanpa nomor', 'galat' in periksaLaporan({ ...dasar, nomor_teks: '  ' }), true)
cek('tanpa atlet', 'galat' in periksaLaporan({ ...dasar, atlet_ids: [] }), true)
cek('atlet bukan angka', 'galat' in periksaLaporan({ ...dasar, atlet_ids: ['x', -1, 0] }), true)
cek('hasil karangan', 'galat' in periksaLaporan({ ...dasar, hasil: 'juara' }), true)
cek('peringkat tanpa angka', 'galat' in periksaLaporan({ ...dasar, hasil: 'peringkat' }), true)
cek('peringkat 3 ditolak', 'galat' in periksaLaporan({ ...dasar, hasil: 'peringkat', peringkat: 3 }), true)
cek('peringkat 4 diterima', (periksaLaporan({ ...dasar, hasil: 'peringkat', peringkat: 4 }) as any).isi.peringkat, 4)
cek('61 atlet ditolak', 'galat' in periksaLaporan({ ...dasar, atlet_ids: Array.from({ length: 61 }, (_, i) => i + 1) }), true)
cek('nomor_id ngawur', 'galat' in periksaLaporan({ ...dasar, nomor_id: 'abc' }), true)
cek('keterangan dipotong 300', (periksaLaporan({ ...dasar, keterangan: 'x'.repeat(500) }) as any).isi.keterangan.length, 300)
cek('catatan kosong jadi null', (periksaLaporan({ ...dasar, nilai_teks: '   ' }) as any).isi.nilai_teks, null)
cek('badan kosong', 'galat' in periksaLaporan(null), true)
cek('lawan dirapikan', (periksaLaporan({ ...dasar, lawan: '  Kota   Bandung ' }) as any).isi.lawan, 'Kota Bandung')
cek('lawan kosong jadi null', (periksaLaporan(dasar) as any).isi.lawan, null)
cek('jam sah', (periksaLaporan({ ...dasar, jam: '14:30' }) as any).isi.jam, '14:30')
cek('jam satu digit dilengkapi', periksaJam('9:05'), '09:05')
cek('jam bertitik diterima', periksaJam('14.30'), '14:30')
cek('jam kosong', [periksaJam(''), periksaJam(null), periksaJam(undefined)], [null, null, null])
cek('jam 25:00 ditolak', periksaJam('25:00'), false)
cek('jam 12:60 ditolak', periksaJam('12:60'), false)
cek('jam ngawur menggagalkan laporan', 'galat' in periksaLaporan({ ...dasar, jam: 'sore' }), true)

// ── tanggal koreksi ──
cek('tanggal sah', tanggalSah('2026-11-07'), true)
cek('tanggal tak ada di kalender', tanggalSah('2026-02-31'), false)
cek('tanggal format lain', tanggalSah('07/11/2026'), false)
cek('tanggal bukan teks', tanggalSah(20261107), false)

// ── kembar ──
const k1 = kunciKembar({ nomor_teks: '53 kg Putri', atlet_ids: [7, 5], tanggal: '2026-11-07' })
cek('urutan atlet tak berpengaruh', k1, kunciKembar({ nomor_teks: '53 KG  putri', atlet_ids: [5, 7], tanggal: '2026-11-07' }))
cek('beda hari bukan kembar', k1 === kunciKembar({ nomor_teks: '53 kg Putri', atlet_ids: [5, 7], tanggal: '2026-11-08' }), false)
cek('beda atlet bukan kembar', k1 === kunciKembar({ nomor_teks: '53 kg Putri', atlet_ids: [5], tanggal: '2026-11-07' }), false)

// ── rekap: hanya yang disahkan, satu laporan satu medali ──
const lap = [
  { hasil: 'emas', status: 'disahkan' },        // beregu 10 orang pun tetap satu baris
  { hasil: 'emas', status: 'menunggu' },
  { hasil: 'emas', status: 'ditolak' },
  { hasil: 'perak', status: 'disahkan' },
  { hasil: 'perunggu', status: 'disahkan' },
  { hasil: 'gugur', status: 'disahkan' },
  { hasil: 'lolos', status: 'disahkan' },
  { hasil: 'peringkat', status: 'disahkan' },
]
// 'lolos' belum dihitung sebagai nomor selesai: penyisihan + final tidak boleh jadi dua.
cek('rekap', rekapMedali(lap), { emas: 1, perak: 1, perunggu: 1, total: 3, laga: 5 })
cek('lolos belum final', adalahFinal('lolos'), false)
cek('gugur sudah final', adalahFinal('gugur'), true)
cek('menang/kalah pool belum final', [adalahFinal('menang'), adalahFinal('kalah')], [false, false])
cek('menang/kalah pool tidak menambah laga selesai', rekapMedali([{ hasil: 'menang', status: 'disahkan' }, { hasil: 'kalah', status: 'disahkan' }]).laga, 0)
cek('hanya lolos = belum ada nomor selesai', rekapMedali([{ hasil: 'lolos', status: 'disahkan' }]).laga, 0)
cek('rekap kosong', rekapMedali([]), { emas: 0, perak: 0, perunggu: 0, total: 0, laga: 0 })
cek('tulis peringkat', tulisHasil({ hasil: 'peringkat', peringkat: 5 }), 'Peringkat 5')
cek('tulis emas', tulisHasil({ hasil: 'emas' }), 'Emas')

// ── klasemen ditimpa hitungan lapangan ──
const klas = [
  { nama: 'KOTA BANDUNG', emas: 10, perak: 5, perunggu: 5, total: 20 },
  { nama: 'KAB. BEKASI', emas: 8, perak: 9, perunggu: 2, total: 19 },
  { nama: 'KAB. BANDUNG', emas: 0, perak: 0, perunggu: 0, total: 0 },
]
cek('tanpa laporan, klasemen utuh', timpaKlasemen(klas, rekapMedali([]), 'KAB. BANDUNG'), klas)
const naik = timpaKlasemen(klas, { emas: 9, perak: 1, perunggu: 0, total: 10, laga: 12 }, 'kab. bandung')
cek('naik ke peringkat 2', naik.map(k => k.nama), ['KOTA BANDUNG', 'KAB. BANDUNG', 'KAB. BEKASI'])
cek('angka tertimpa', naik[1], { nama: 'KAB. BANDUNG', emas: 9, perak: 1, perunggu: 0, total: 10 })
cek('asal tidak berubah', klas[2].emas, 0)
cek('kontingen lain tidak tersentuh', timpaKlasemen(klas, { emas: 9, perak: 1, perunggu: 0, total: 10, laga: 1 }, 'KOTA BANDUNG BARAT').map(k => k.emas), [10, 8, 0])
const seri = timpaKlasemen(klas, { emas: 8, perak: 9, perunggu: 3, total: 20, laga: 20 }, 'KAB. BANDUNG')
cek('seri emas & perak, perunggu memutus', seri.map(k => k.nama), ['KOTA BANDUNG', 'KAB. BANDUNG', 'KAB. BEKASI'])

// ── target emas ──
const target = [
  { atlet_id: 1, nama: 'A', cabang: 'Dayung', cabor_id: 147 },
  { atlet_id: 2, nama: 'B', cabang: 'Dayung', cabor_id: 147 },
  { atlet_id: 3, nama: 'C', cabang: 'Hockey', cabor_id: 146 },
  { atlet_id: 4, nama: 'D', cabang: 'Hockey', cabor_id: 146 },
]
const sah = [
  { atlet_ids: [1], hasil: 'perak', peringkat: null, nomor_teks: 'K1 500m' },
  { atlet_ids: [1], hasil: 'emas', peringkat: null, nomor_teks: 'K1 200m' },       // nomor kedua menebus
  { atlet_ids: [2], hasil: 'peringkat', peringkat: 6, nomor_teks: 'C1 200m' },
  { atlet_ids: [2], hasil: 'peringkat', peringkat: 4, nomor_teks: 'C1 500m' },
  { atlet_ids: [3, 99], hasil: 'gugur', peringkat: null, nomor_teks: 'Beregu Putra' },
]
const cap = capaianTarget(target, sah)
cek('emas di nomor kedua = tercapai', [cap[0].status, cap[0].terbaik, cap[0].nomor], ['tercapai', 'Emas', 'K1 200m'])
cek('peringkat terbaik yang dipakai', [cap[1].status, cap[1].terbaik], ['belum_emas', 'Peringkat 4'])
cek('anggota regu ikut tercatat', [cap[2].status, cap[2].terbaik], ['belum_emas', 'Gugur'])
cek('belum turun', [cap[3].status, cap[3].terbaik], ['belum_turun', null])

// ── peta cabang berkas → cabor sistem ──
const peta = petaCabang([
  { cabang: 'HOKI OUTDOOR', cabor_id: 146 }, { cabang: 'HOKI OUTDOOR', cabor_id: 146 }, { cabang: 'HOKI OUTDOOR', cabor_id: 55 },
  { cabang: 'DAYUNG', cabor_id: 147 }, { cabang: 'YATIM', cabor_id: null },
])
cek('cabor terbanyak menang', peta.get('HOKI OUTDOOR'), 146)
cek('satu tautan cukup', peta.get('DAYUNG'), 147)
cek('tanpa tautan tidak dipetakan', peta.has('YATIM'), false)

// ── foto ──
cek('jpeg', jenisGambar(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext, 'jpg')
cek('png', jenisGambar(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext, 'png')
cek('webp', jenisGambar(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.ext, 'webp')
cek('html menyamar .jpg ditolak', jenisGambar(new TextEncoder().encode('<html><script>')), null)
cek('berkas kosong ditolak', jenisGambar(new Uint8Array([])), null)

// ── nomor kembar di daftar resmi ──
const daftar = [
  { id: 2620, nama: 'Angkat Besi -55kg Putra', gender: 'L', sub: null },
  { id: 2434, nama: 'Angkat Besi -55kg Putra', gender: 'L', sub: null },
  { id: 2446, nama: 'Angkat Besi -55kg Putri', gender: 'P', sub: null },
  { id: 2632, nama: 'angkat  besi -55KG putri ', gender: 'P', sub: null },
  { id: 9001, nama: 'Sprint 200m', gender: 'L', sub: 'Dayung - Canoe' },
  { id: 9002, nama: 'Sprint 200m', gender: 'L', sub: 'Dayung - Rowing' },
  { id: 9003, nama: 'Sprint 200m', gender: 'P', sub: 'Dayung - Canoe' },
]
const bersih = buangNomorKembar(daftar)
cek('kembar dibuang, id terkecil yang dipertahankan', bersih.map(n => n.id), [2434, 2446, 9001, 9002, 9003])
cek('beda jenis kelamin bukan kembar', bersih.filter(n => n.nama.includes('55')).length, 2)
cek('beda sub-cabor bukan kembar', bersih.filter(n => n.nama === 'Sprint 200m' && n.gender === 'L').length, 2)
cek('daftar tanpa kembar tidak berubah', buangNomorKembar(bersih).map(n => n.id), bersih.map(n => n.id))
cek('daftar kosong', buangNomorKembar([]), [])

console.log(`\n${lulus} lulus, ${gagal} gagal`)
if (gagal > 0) process.exit(1)
