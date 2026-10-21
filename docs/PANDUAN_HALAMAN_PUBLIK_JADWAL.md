# Halaman Publik Jadwal & Kelola Jadwal — panduan

**Tanggal:** 2026-10-21 · **Tayang di:** https://kab-bandung.vercel.app

## 1. Alamat

| Untuk | Alamat |
|---|---|
| Masyarakat umum (tanpa login) | https://kab-bandung.vercel.app |
| Grup PIC cabor — jadwal lengkap langsung terbuka | https://kab-bandung.vercel.app/#jadwal |
| Login admin | tombol **Masuk** di pojok kanan atas, atau `/konida/login/kabbandung` |
| Mengubah jadwal | setelah login → menu **Jadwal Pertandingan** (di bawah Dashboard) |

Di alamat lain (porprov-xv, dayung-jabar) halaman ini tetap bisa dibuka lewat `/publik/kabbandung`, tetapi halaman awalnya tidak berubah.

## 2. Isi halaman publik

- Bagian atas (selalu tampil): Menara Soreang, hitung mundur ke Upacara Pembukaan, angka kontingen
  (atlet, cabor, nomor dari daftar pendaftaran resmi KONI — angka gabungan, tanpa data pribadi),
  pertandingan terdekat / sedang berlangsung, ajakan dukung + tombol **Bagikan lewat WhatsApp**.
- Terlipat sampai tombol **Lihat Jadwal / Buka jadwal lengkap** ditekan: jadwal per tanggal,
  semua kegiatan (cari + saring status), dan peta perjuangan per wilayah.
- Yang **sengaja tidak tampil**: akomodasi, kontak panitia, catatan internal, target per atlet,
  dan perolehan medali (data medali di sistem masih berisi data simulasi).

## 3. Mengubah jadwal (admin)

Hanya **KONIDA Kab. Bandung** dan **superadmin**. Akun KONI Jabar sengaja tidak bisa.

- **Ubah satu kegiatan:** tombol **Ubah** → tanggal, kota, wilayah, venue, catatan → Simpan.
  Halaman publik langsung ikut berubah.
- **Sembunyikan dari publik:** tombol mata di kolom *Publik*. Baris tetap ada untuk War Room dan jurnal.
- **Berkas matriks baru dari KONI:** **Unggah Matriks KONI** → muncul daftar *Diperbarui / Ditambah /
  Tidak ada di berkas* → **Simpan**. Tidak ada yang tersimpan sebelum tombol Simpan ditekan.
  Kegiatan yang tidak ada di berkas dibiarkan (tidak dihapus).

Aturan pembacaan berkas matriks sama dengan skrip `scripts/impor-matriks-jadwal.ts`
(`src/lib/impor-matriks.ts`).

## 4. Jadwal partai (per pertandingan)

Satu partai = tanggal, jam, nomor, babak, atlet, lawan, venue, status
(terjadwal / sedang bertanding / ditunda / selesai / batal). Tabel `jadwal_partai` (migrasi 060).

- **PIC cabor dari HP:** `/lapor` → tab **Jadwal** → *Tambah jadwal partai*. Nomor dipilih dari daftar
  resmi pendaftaran, atlet dari atlet cabornya (server mencocokkan ulang keduanya).
  Tombol cepat: *Sedang main*, *Ditunda*, *Selesai*.
- **KONIDA:** menu **Jadwal Pertandingan** → tab **Jadwal partai** → ubah/tambah/hapus.
  Atlet dipilih PIC; dari dashboard atlet tidak diubah.
- **Matriks KONI:** baris yang berisi Jam / Nomor / Nama Atlet / Lawan menjadi partai saat
  berkas diunggah. Partai yang sudah ada hanya **dilengkapi** (jam, venue, atlet yang kosong) —
  isian PIC tidak pernah ditimpa berkas. Nama atlet yang tidak ketemu ditulis di keterangan.
- **Langsung tampil** di halaman publik (bagian *Jadwal tanding* dan di tanggalnya), **termasuk
  nama atlet** — keputusan Bos 21 Okt 2026. Partai berstatus *batal* tidak tampil.
- **Lapor hasil lebih cepat:** di tab *Lapor Hasil* muncul *Isi cepat dari jadwal* (partai kemarin
  dan hari ini yang belum selesai). Setelah laporan terkirim, partainya otomatis *Selesai*.

## 5. Cara batal

Setiap perubahan tercatat di `audit_logs`:

| action | isi `payload` |
|---|---|
| `JADWAL_UBAH` | `sebelum` dan `sesudah` per kolom |
| `JADWAL_TAMBAH` | baris baru lengkap |
| `JADWAL_HAPUS` | baris yang dihapus lengkap (bisa dimasukkan kembali) |
| `JADWAL_IMPOR_MATRIKS` | daftar baris yang diubah beserta isi sebelumnya, partai yang ditambah/dilengkapi |
| `LAPOR_JADWAL_TAMBAH/UBAH/HAPUS` | partai dari HP PIC (sebelum/sesudah, atau baris lengkap saat dihapus) |
| `JADWAL_PARTAI_TAMBAH/UBAH/HAPUS` | partai dari dashboard KONIDA |

Kolom `jadwal_cabor.tampil_publik` (migrasi 059) menentukan apa yang tampil di publik.
Cadangan jadwal sebelum impor 21 Okt: `_backup_jadwal_cabor_2026-10-21.json` di folder repo.
