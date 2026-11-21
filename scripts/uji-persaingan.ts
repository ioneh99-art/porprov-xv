// scripts/uji-persaingan.ts — mengunci hitungan Persaingan antar kontingen & duel atlet berulang.
// Dijalankan: npm run uji:persaingan
import { hitungPersaingan, jumlahRekor, persenMenang, type BahanLagaP, type BahanPesertaP } from '../src/lib/persaingan'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const L = (ref: number, cabor: number, tanggal = `2026-11-${String(ref).padStart(2, '0')}`, bentuk = 'duel', selesai = true): BahanLagaP =>
  ({ ref, caborSitusId: cabor, cabor: `C${cabor}`, nomor: 'N', babak: 'Final', tanggal, bentuk, selesai })
const P = (lagaRef: number, k: number | null, menang: boolean | null, atlet: number[] = [], skor: number | null = null): BahanPesertaP =>
  ({ lagaRef, kontingenSitusId: k, menang, skor, atletSitusIds: atlet, atletNama: atlet.map(a => `A${a}`) })

const laga = [L(1, 7), L(2, 7), L(3, 8), L(4, 7), L(5, 7), L(6, 7), L(7, 7, '2026-11-07', 'peringkat'), L(8, 7, '2026-11-08', 'duel', false), L(9, 7)]
const peserta = [
  // Kontingen 1 vs 2: atlet 11 vs 21 bertemu 3x (menang, kalah, seri)
  P(1, 1, true, [11], 3), P(1, 2, false, [21], 1),
  P(2, 1, false, [11], 0), P(2, 2, true, [21], 2),
  P(4, 1, null, [11], 1), P(4, 2, null, [21], 1),
  // cabor lain: tim 1 menang atas 2
  P(3, 1, true, [12, 13]), P(3, 2, false, [22, 23]),
  // 1 vs 3 sekali (tidak berulang)
  P(5, 3, true, [31]), P(5, 1, false, [11]),
  // sesama kontingen → diabaikan
  P(6, 1, true, [11]), P(6, 1, false, [14]),
  // laga peringkat & laga belum selesai → diabaikan
  P(7, 1, true, [11]), P(7, 2, false, [21]), P(8, 1, true, [11]), P(8, 2, false, [21]),
  // laga satu sisi saja → diabaikan
  P(9, 1, true, [11]),
]
const h = hitungPersaingan({ laga, peserta })
const r = (a: number, b: number, c?: number) => jumlahRekor(h.rekor.filter(x => x.a === a && x.b === b && (c == null || x.caborSitusId === c)))

cek('jumlah laga & seri', [h.jumlahLaga, h.jumlahSeri], [5, 1])
cek('1 vs 2 semua cabor', r(1, 2), { menang: 2, kalah: 1, seri: 1 })
cek('2 vs 1 cermin', r(2, 1), { menang: 1, kalah: 2, seri: 1 })
cek('1 vs 2 cabor 7', r(1, 2, 7), { menang: 1, kalah: 1, seri: 1 })
cek('1 vs 2 cabor 8', r(1, 2, 8), { menang: 1, kalah: 0, seri: 0 })
cek('1 vs 3', r(1, 3), { menang: 0, kalah: 1, seri: 0 })
cek('sesama kontingen tidak tercatat', r(1, 1), { menang: 0, kalah: 0, seri: 0 })
cek('duel berulang hanya 11 vs 21', h.duelBerulang.map(d => [d.a.situsId, d.b.situsId, d.menangA, d.menangB, d.seri, d.laga.length]), [[11, 21, 1, 1, 1, 3]])
cek('urut waktu pertemuan', h.duelBerulang[0].laga.map(l => [l.ref, l.hasilA, l.skorA, l.skorB]), [[1, 'menang', 3, 1], [2, 'kalah', 0, 2], [4, 'seri', 1, 1]])
cek('persen menang', [persenMenang({ menang: 2, kalah: 1, seri: 1 }), persenMenang({ menang: 0, kalah: 0, seri: 0 })], [0.625, null])

console.log(`uji persaingan: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
