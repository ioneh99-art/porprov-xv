// scripts/uji-kode-sandi.ts — kode PIC tersimpan tersandi & pemulihan kode lama dari teks tempelan.
// Dijalankan: npm run uji:kode-sandi
process.env.PORPROV_SESSION_SECRET ||= 'kunci-uji-lokal-bukan-produksi-0123456789'
import { buatKode, kodeDalamTeks, tampilKode, bakukanKode } from '../src/lib/lapor'
import { bukaSandiKode, sandikanKode } from '../src/lib/kode-sandi'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

async function main() {
  const kode = buatKode()
  const s1 = await sandikanKode(kode), s2 = await sandikanKode(kode)
  cek('sandi bisa dibuka lagi', await bukaSandiKode(s1), kode)
  cek('sandi tidak memuat kode polos', s1.includes(kode) || s1.includes(kode.replace('-', '')), false)
  cek('sandi acak tiap kali (iv baru)', s1 === s2, false)
  const rusak = s1.slice(0, -3) + (s1.endsWith('A') ? 'BBB' : 'AAA')
  cek('sandi diubah → ditolak', await bukaSandiKode(rusak), null)
  cek('sandi kosong → null', await bukaSandiKode(null), null)
  cek('format asing → null', await bukaSandiKode('v2.abc.def'), null)

  cek('tampil kode', tampilKode('ABCDEFGH'), 'ABCD-EFGH')
  const k1 = buatKode(), k2 = buatKode()
  const berkas = `Kode PIC Kab. Bandung\n1. Dayung — Budi\n   Tautan: https://www.konikab-bdg.com/lapor#${k1}\n   Kode: ${k1}\n2. Kempo — Sari  kode ${k2.toLowerCase()}\nPORPROV XV 2026-11-07`
  cek('kode dari isi berkas: unik, dua-duanya', kodeDalamTeks(berkas).sort(), [bakukanKode(k1), bakukanKode(k2)].sort())
  cek('kode tanpa tanda hubung juga terbaca', kodeDalamTeks(k1.replace('-', '')), [bakukanKode(k1)])
  cek('huruf rancu (O/I/0/1) bukan kode', kodeDalamTeks('ABCD-EFG0 IOIO-1234'), [])
  cek('bagian kata panjang tidak dipotong jadi kode', kodeDalamTeks('ABCDEFGHJK'), [])
  cek('bukan teks → kosong', kodeDalamTeks(undefined), [])
  cek('batas jumlah calon', kodeDalamTeks(Array.from({ length: 20 }, () => buatKode()).join(' '), 5).length, 5)

  console.log(`\n${lulus} lulus, ${gagal} gagal`)
  if (gagal > 0) process.exit(1)
}
main()
