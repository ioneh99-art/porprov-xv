// scripts/uji-bibit-atlet.ts — mengunci hitungan Bibit Atlet.
// Dijalankan: npm run uji:bibit-atlet
import { beruntunTerpanjang, hitungBibit, umurPada, type BahanAtletB } from '../src/lib/bibit-atlet'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const A = (situsId: number, nama: string, e: number, p: number, g: number, kontingen = 10): BahanAtletB =>
  ({ situsId, nama, slug: nama.toLowerCase(), kontingenSitusId: kontingen, kontingen: `K${kontingen}`, cabor: 'X', disiplin: null, gender: 'L', emas: e, perak: p, perunggu: g, jumlahLaga: 0 })

cek('beruntun', [beruntunTerpanjang([]), beruntunTerpanjang([true, true, false, true, true, true]), beruntunTerpanjang([false])], [0, 3, 0])

const atlet = [
  A(1, 'Ana', 2, 0, 0),       // 2 emas perorangan → multiEmas
  A(2, 'Budi', 3, 0, 0),      // 3 emas beregu saja → bukan juara perorangan, tapi serba bisa
  A(3, 'Cici', 0, 0, 0),      // tanpa medali, 4 menang beruntun duel → kandidat
  A(4, 'Dodi', 0, 0, 1),      // 1 perunggu saja → bukan kandidat
  A(5, 'Eka', 0, 0, 1, 99),   // 1 perunggu, kontingen kita → selalu disertakan
  A(6, 'Fani', 1, 0, 0),      // 1 emas perorangan, 3 laga tanpa kalah
]
const podium = [
  { atletSitusIds: [1], medali: 'emas' as const }, { atletSitusIds: [1], medali: 'emas' as const },
  { atletSitusIds: [2, 7, 8], medali: 'emas' as const }, { atletSitusIds: [2, 7], medali: 'emas' as const }, { atletSitusIds: [2, 9], medali: 'emas' as const },
  { atletSitusIds: [6], medali: 'emas' as const }, { atletSitusIds: [4], medali: 'perunggu' as const }, { atletSitusIds: [5], medali: 'perunggu' as const },
]
const laga = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(ref => ({ ref, tanggal: `2026-11-0${ref}`, jam: '09:00', bentuk: 'duel', selesai: true }))
  .concat([{ ref: 10, tanggal: '2026-11-01', jam: '08:00', bentuk: 'duel', selesai: false }, { ref: 11, tanggal: '2026-11-01', jam: '08:00', bentuk: 'peringkat', selesai: true }])
const peserta = [
  // Cici: kalah dulu lalu menang 4 berturut-turut (urutan input acak, harus diurut waktu)
  { lagaRef: 5, atletSitusIds: [3], menang: true }, { lagaRef: 1, atletSitusIds: [3], menang: false },
  { lagaRef: 3, atletSitusIds: [3], menang: true }, { lagaRef: 4, atletSitusIds: [3], menang: true }, { lagaRef: 2, atletSitusIds: [3], menang: true },
  // laga dibatalkan & laga peringkat diabaikan
  { lagaRef: 10, atletSitusIds: [3], menang: false }, { lagaRef: 11, atletSitusIds: [3], menang: false },
  // Fani: 3 menang tanpa kalah
  { lagaRef: 6, atletSitusIds: [6], menang: true }, { lagaRef: 7, atletSitusIds: [6], menang: true }, { lagaRef: 8, atletSitusIds: [6], menang: true },
  // Budi: kalah di laga tim (2 atlet per sisi) tidak dihitung
  { lagaRef: 9, atletSitusIds: [2, 7], menang: false },
]
const h = hitungBibit({ atlet, podium, laga, peserta, selaluSertakan: a => a.kontingenSitusId === 99 })
const cari = (n: string) => h.find(x => x.nama === n)

cek('kandidat & urutan', h.map(x => x.nama), ['Ana', 'Fani', 'Budi', 'Eka', 'Cici'])
cek('Ana multi-emas perorangan', [cari('Ana')?.emasP, cari('Ana')?.kriteria], [2, ['multiEmas']])
cek('Budi emas beregu', [cari('Budi')?.emasP, cari('Budi')?.emas, cari('Budi')?.kriteria, cari('Budi')?.duelKalah], [0, 3, ['serbaBisa'], 0])
cek('Cici beruntun 4', [cari('Cici')?.duelMenang, cari('Cici')?.duelKalah, cari('Cici')?.beruntun, cari('Cici')?.tingkatMenang, cari('Cici')?.kriteria], [4, 1, 4, 0.8, ['beruntun']])
cek('Fani tak terkalahkan', [cari('Fani')?.kriteria, cari('Fani')?.tingkatMenang], [['juaraPerorangan', 'takTerkalahkan'], 1])
cek('Dodi bukan kandidat', cari('Dodi'), undefined)
cek('Eka disertakan (kontingen kita)', [cari('Eka')?.perungguP, cari('Eka')?.kriteria], [1, []])

cek('umur', [umurPada('2008-11-20', '2026-11-20'), umurPada('2008-11-21', '2026-11-20'), umurPada(null, '2026-11-20'), umurPada('1900-01-01', '2026-11-20'), umurPada('xx', '2026-11-20')], [18, 17, null, null, null])

console.log(`uji bibit-atlet: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
