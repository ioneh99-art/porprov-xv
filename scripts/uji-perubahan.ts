// scripts/uji-perubahan.ts
// Uji perhitungan "apa yang berubah" sebelum data ditulis.
// Jalankan: npm run uji:perubahan
//
// Ini penjaga terpenting terhadap kekhawatiran "data fundamental jadi acak-acakan":
// tiap impor harus bisa menjawab kolom mana yang BERTAMBAH, mana yang DITIMPA,
// dan mana yang tidak tersentuh — sebelum operator menekan simpan.

import {
  hitungPerubahan, ringkasPerubahan, nilaiUntukDitulis, untukAudit,
} from '@/lib/gateway/diff'

let lulus = 0, gagal = 0
const cek = (nama: string, syarat: boolean, ket = '') => {
  if (syarat) { lulus++; console.log(`  ✓ ${nama}`) }
  else { gagal++; console.log(`  ✗ ${nama} ${ket}`) }
}
const cari = (p: any[], kolom: string) => p.find(x => x.kolom === kolom)

console.log('\n[1] Sel KOSONG tidak menyentuh apa pun')
{
  const p = hitungPerubahan('identitas',
    { alamat: '', telepon: null, email: undefined },
    { alamat: 'Jl. Lama', telepon: '0811', email: 'a@b.c' })
  cek('tiga sel kosong → nol perubahan', p.length === 0, `dapat ${p.length}`)
}

console.log('\n[2] Kolom kosong terisi = TAMBAH')
{
  const p = hitungPerubahan('identitas', { alamat: 'Jl. Baru' }, { alamat: null })
  cek('null → terisi = tambah', cari(p,'alamat')?.jenis === 'tambah', `dapat ${cari(p,'alamat')?.jenis}`)
  const q = hitungPerubahan('identitas', { alamat: 'Jl. Baru' }, {})
  cek('baris belum ada sama sekali = tambah', cari(q,'alamat')?.jenis === 'tambah')
}

console.log('\n[3] Kolom terisi ditimpa = UBAH — ini yang berisiko')
{
  const p = hitungPerubahan('identitas',
    { alamat: 'Jl. Baru', tgl_lahir: '2007-06-02' },
    { alamat: 'Jl. Lama', tgl_lahir: '2007-02-06' })
  cek('alamat berbeda → ubah', cari(p,'alamat')?.jenis === 'ubah')
  cek('tanggal lahir berbeda → ubah', cari(p,'tgl_lahir')?.jenis === 'ubah')
  cek('nilai lama ikut dilaporkan', cari(p,'tgl_lahir')?.lama === '2007-02-06')
}

console.log('\n[4] Nilai sama tidak dianggap perubahan')
{
  const p = hitungPerubahan('identitas',
    { alamat: '  Jl. Sama  ', nama_bank: 'BJB' },
    { alamat: 'Jl. Sama', nama_bank: 'BJB' })
  cek('spasi di ujung diabaikan', cari(p,'alamat')?.jenis === 'sama')
  cek('teks identik → sama', cari(p,'nama_bank')?.jenis === 'sama')
}

console.log('\n[5] Perbedaan bentuk BUKAN perubahan')
{
  const p = hitungPerubahan('perlengkapan', { ukuran_sepatu: '30' }, { ukuran_sepatu: 30 })
  cek('"30" vs angka 30 → sama', cari(p,'ukuran_sepatu')?.jenis === 'sama',
      `dapat ${cari(p,'ukuran_sepatu')?.jenis}`)
  const q = hitungPerubahan('identitas',
    { tgl_lahir: '2004-04-11' }, { tgl_lahir: '2004-04-11T00:00:00+07:00' })
  cek('tanggal berjam vs tanggal saja → sama', cari(q,'tgl_lahir')?.jenis === 'sama',
      `dapat ${cari(q,'tgl_lahir')?.jenis}`)
}

console.log('\n[6] Tanda "-" mengosongkan dengan sengaja')
{
  const p = hitungPerubahan('identitas', { telepon: '-' }, { telepon: '08123' })
  cek('ada isi → kosongkan', cari(p,'telepon')?.jenis === 'kosongkan')
  cek('nilai tulis jadi null', nilaiUntukDitulis(p).telepon === null)
  const q = hitungPerubahan('identitas', { telepon: '-' }, { telepon: null })
  cek('memang sudah kosong → sama', cari(q,'telepon')?.jenis === 'sama')
}

console.log('\n[7] Hanya yang berubah yang ditulis')
{
  const p = hitungPerubahan('identitas',
    { alamat: 'Jl. Baru', nama_bank: 'BJB', kecamatan: 'Soreang' },
    { alamat: 'Jl. Lama', nama_bank: 'BJB', kecamatan: null })
  const set = nilaiUntukDitulis(p)
  cek('kolom "sama" tidak ikut ditulis', !('nama_bank' in set), `dapat ${Object.keys(set)}`)
  cek('kolom ubah ikut ditulis', set.alamat === 'Jl. Baru')
  cek('kolom tambah ikut ditulis', set.kecamatan === 'Soreang')
  const j = untukAudit(p)
  cek('audit mencatat sebelum→sesudah', j.alamat?.lama === 'Jl. Lama' && j.alamat?.baru === 'Jl. Baru')
  cek('audit tidak mencatat yang sama', !('nama_bank' in j))
}

console.log('\n[8] Ringkasan tiga angka untuk operator')
{
  const semua = [
    hitungPerubahan('identitas', { alamat: 'A' }, { alamat: null }),        // tambah
    hitungPerubahan('identitas', { alamat: 'B' }, { alamat: 'A' }),         // ubah
    hitungPerubahan('identitas', { alamat: 'A' }, { alamat: 'A' }),         // sama
    hitungPerubahan('identitas', { alamat: '-' }, { alamat: 'A' }),         // kosongkan
  ]
  const r = ringkasPerubahan(semua)
  cek('hitungan tepat', r.tambah === 1 && r.ubah === 1 && r.sama === 1 && r.kosongkan === 1,
      JSON.stringify(r))
}

console.log('\n[9] Kolom di luar daftar tidak bisa disusupkan')
{
  const p = hitungPerubahan('identitas',
    { nik: '9999999999999999', kontingen_id: 99, alamat: 'A' } as any, { alamat: null })
  cek('NIK tidak bisa diubah lewat template', !cari(p,'nik'))
  cek('kontingen_id tidak bisa dipindah', !cari(p,'kontingen_id'))
  cek('yang sah tetap terbaca', cari(p,'alamat')?.jenis === 'tambah')
}

console.log(`\n───── LULUS ${lulus} · GAGAL ${gagal}\n`)
process.exit(gagal ? 1 : 0)
