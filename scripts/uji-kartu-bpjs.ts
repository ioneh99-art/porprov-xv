// scripts/uji-kartu-bpjs.ts — aturan kartu BPJS (baca PDF, NIK, pembatas). Dijalankan: npm run uji:kartu-bpjs
import { bacaHalamanKartu, bakukanNik, samarkanNik, nikSama, namaKartuCocok, putusanBatas, namaBerkasUnduh, BATAS } from '../src/lib/kartu-bpjs'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

// Bentuk keluaran pdftotext -layout satu halaman (data rekaan).
const kanan = '   a. Kewajiban peserta BPJS Ketenagakerjaan adalah sebagai berikut :'
const hal = [
  '                      Penting dan untuk diperhatikan :',
  '                      1. Kartu Peserta Digital/Elektronik adalah tanda bukti',
  '3204 1111 2222 0003   ' + kanan,
  '12345678901                - Tagihan iuran agar dibayarkan tepat waktu.',
  '                         b. Hak peserta BPJS Ketenagakerjaan antara lain adalah :',
  "SITI NUR'AINI  PUTRI      - Mendapatkan manfaat sesuai dengan program.",
  '10-2026                  BPJS Ketenagakerjaan.',
  '                      6. Penyalahgunaan kartu peserta ini dapat dituntut.',
].join('\n')
cek('baca: NIK, KPJ, nama, berlaku', bacaHalamanKartu(hal), { nik: '3204111122220003', kpj: '12345678901', nama: "SITI NUR'AINI PUTRI", berlaku: '10-2026' })
cek('baca: tanpa NIK → null', bacaHalamanKartu(hal.replace('3204 1111 2222 0003', '')), null)
cek('baca: kolom kanan (teks ketentuan) tidak jadi nama', bacaHalamanKartu('                      PENTING SEKALI\n3204 1111 2222 0003\n12345678901\n'), null)

cek('bakukan NIK: spasi & titik dibuang', bakukanNik(' 3204.1111 2222-0003 '), '3204111122220003')
cek('bakukan NIK: 15 angka ditolak', bakukanNik('320411112222000'), null)
cek('bakukan NIK: kosong/null ditolak', [bakukanNik(''), bakukanNik(null), bakukanNik(undefined)], [null, null, null])
cek('samarkan NIK', samarkanNik('3204111122220003'), '3204 •••• •••• 0003')
cek('samarkan NIK pendek', samarkanNik('123'), '••••')
cek('NIK sama', [nikSama('3204111122220003', '3204111122220003'), nikSama('3204111122220003', '3204111122220004'), nikSama('3204', '32041')], [true, false, false])

cek('nama: persis abaikan huruf & spasi', namaKartuCocok('TAUFIK  SAEPULOH', 'Taufik Saepuloh'), true)
cek('nama: kartu terpotong (≥20 huruf) = awalan', namaKartuCocok('MUHAMMAD FADHIL PUTRA KOM', 'Muhammad Fadhil Putra Komara'), true)
cek('nama: awalan pendek TIDAK cukup', namaKartuCocok('ANDRI', 'Andri Nurdiansyah'), false)
cek('nama: ejaan beda tidak dianggap sama', namaKartuCocok('TAUFIK SAEPULOH', 'Taupik Saepuloh'), false)

cek('batas: masih boleh', putusanBatas(BATAS.gagalIp - 1, BATAS.gagalKartu - 1), null)
cek('batas: kartu terkunci', /kartu ini/.test(putusanBatas(0, BATAS.gagalKartu) ?? ''), true)
cek('batas: IP terkunci', /perangkat ini/.test(putusanBatas(BATAS.gagalIp, 0) ?? ''), true)
cek('batas: kartu didahulukan', /kartu ini/.test(putusanBatas(BATAS.gagalIp, BATAS.gagalKartu) ?? ''), true)

cek('nama berkas unduh', [namaBerkasUnduh("Siti Nur'aini"), namaBerkasUnduh('  ')], ['BPJS_SITI_NUR_AINI.pdf', 'BPJS_KARTU.pdf'])

console.log(`uji-kartu-bpjs: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
