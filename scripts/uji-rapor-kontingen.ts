// scripts/uji-rapor-kontingen.ts — mengunci hitungan Rapor Kontingen & Peta Kekuatan.
// Dijalankan: npm run uji:rapor-kontingen
import { hitungRapor, labelPersaingan, type BahanKontingen, type BahanMedali } from '../src/lib/rapor-kontingen'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

const K = (situsId: number, nama: string, peringkat: number, e: number, p: number, g: number, atlet: number, laga = 0, menang = 0): BahanKontingen =>
  ({ situsId, nama, slug: nama.toLowerCase(), peringkat, emas: e, perak: p, perunggu: g, jumlahAtlet: atlet, jumlahLaga: laga, jumlahMenang: menang, kontingenId: null })
const M = (nomor: number, medali: BahanMedali['medali'], kontingen: number | null): BahanMedali => ({ nomorSitusId: nomor, medali, kontingenSitusId: kontingen })

// Dua cabor: Dayung (1) nomor 11–14, Judo (2) nomor 21–23
const cabor = [{ situsId: 1, nama: 'Dayung', jumlahNomor: 4 }, { situsId: 2, nama: 'Judo', jumlahNomor: 3 }]
const nomor = [11, 12, 13, 14].map(n => ({ situsId: n, caborSitusId: 1 })).concat([21, 22, 23].map(n => ({ situsId: n, caborSitusId: 2 })))
// A: 3 emas dayung + 1 emas judo (4 emas, 75% dari dayung → tergantung)
// B: 1 emas dayung, 2 emas judo, 1 perak judo
// C: perunggu saja
const medali = [
  M(11, 'emas', 100), M(12, 'emas', 100), M(13, 'emas', 100), M(21, 'emas', 100),
  M(14, 'emas', 200), M(22, 'emas', 200), M(23, 'emas', 200), M(21, 'perak', 200),
  M(11, 'perak', 300), M(21, 'perunggu', 300), M(22, 'perunggu', 300),
  M(12, 'perak', null), // podium tanpa kontingen diabaikan
]
const kontingen = [
  K(200, 'B', 2, 3, 1, 0, 40, 30, 20),
  K(100, 'A', 1, 4, 0, 0, 20, 10, 9),
  K(300, 'C', 3, 0, 1, 2, 50, 0, 0),
]
const atletKC = [
  { kontingenSitusId: 100, caborSitusId: 1, jumlah: 15 }, { kontingenSitusId: 100, caborSitusId: 2, jumlah: 5 },
  { kontingenSitusId: 200, caborSitusId: 1, jumlah: 10 }, { kontingenSitusId: 200, caborSitusId: 2, jumlah: 30 },
  { kontingenSitusId: 300, caborSitusId: 1, jumlah: 50 },
]
const r = hitungRapor({ kontingen, cabor, nomor, medali, atletKC, jumlahLaga: 25 })

cek('urut peringkat', r.kontingen.map(k => k.nama), ['A', 'B', 'C'])
const [a, bb, c] = r.kontingen
cek('A total & efisiensi', [a.total, a.medaliPer100Atlet, a.emasPer100Atlet], [4, 20, 20])
cek('A tingkat menang', a.tingkatMenang, 0.9)
cek('A cabor utama & tergantung', [a.caborUtama?.nama, a.caborUtama?.emas, a.caborUtama?.porsi, a.tergantung], ['Dayung', 3, 0.75, true])
cek('B cabor utama Judo 2/3 → tergantung', [bb.caborUtama?.nama, bb.caborUtama?.porsi, bb.tergantung], ['Judo', 2 / 3, true])
cek('C tanpa emas', [c.caborUtama, c.tergantung, c.tingkatMenang, c.caborBermedali, c.caborBeremas, c.caborDiikuti], [null, false, null, 2, 0, 1])
cek('A cabor diikuti/bermedali/beremas', [a.caborDiikuti, a.caborBermedali, a.caborBeremas], [2, 2, 2])

const dayung = r.cabor.find(x => x.nama === 'Dayung')!
const judo = r.cabor.find(x => x.nama === 'Judo')!
cek('Dayung penguasa A 3/4 → Dikuasai', [dayung.penguasa?.nama, dayung.penguasa?.porsiEmas, dayung.persaingan, dayung.emas, dayung.kontingenBeremas], ['A', 0.75, 'Dikuasai', 4, 2])
cek('Judo penguasa B 2/3 → Dikuasai', [judo.penguasa?.nama, judo.persaingan, judo.kontingenBermedali, judo.atlet], ['B', 'Dikuasai', 3, 35])
cek('urut cabor emas terbanyak', r.cabor.map(x => x.nama), ['Dayung', 'Judo'])
cek('peta sel', r.peta[200][2], { emas: 2, perak: 1, perunggu: 0, atlet: 30 })
cek('podium = klasemen', r.selisihKlasemen, [])
cek('ringkas', r.ringkas, { kontingen: 3, cabor: 2, nomor: 7, medali: 12, atlet: 110, laga: 25 })

// Selisih klasemen terdeteksi
const r2 = hitungRapor({ kontingen: [K(100, 'A', 1, 5, 0, 0, 20)], cabor, nomor, medali: [M(11, 'emas', 100)], atletKC: [] })
cek('selisih klasemen', r2.selisihKlasemen.map(x => [x.nama, x.resmi.emas, x.podium.emas]), [['A', 5, 1]])

// Ambang: 2 emas dari satu cabor (100%) belum disebut tergantung
const r3 = hitungRapor({ kontingen: [K(100, 'A', 1, 2, 0, 0, 5)], cabor, nomor, medali: [M(11, 'emas', 100), M(12, 'emas', 100)], atletKC: [] })
cek('ambang tergantung', [r3.kontingen[0].caborUtama?.porsi, r3.kontingen[0].tergantung], [1, false])

// Atlet 0 → efisiensi null, bukan Infinity
cek('atlet nol', [r3.kontingen[0].medaliPer100Atlet !== null], [true])
const r4 = hitungRapor({ kontingen: [K(100, 'A', 1, 0, 0, 0, 0)], cabor, nomor, medali: [], atletKC: [] })
cek('efisiensi null', [r4.kontingen[0].medaliPer100Atlet, r4.kontingen[0].emasPer100Atlet], [null, null])

cek('label persaingan', [labelPersaingan(null), labelPersaingan(0.5), labelPersaingan(0.49), labelPersaingan(0.3), labelPersaingan(0.29)],
  ['Belum ada emas', 'Dikuasai', 'Bersaing', 'Bersaing', 'Merata'])

console.log(`uji rapor-kontingen: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
