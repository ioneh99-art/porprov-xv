# Lapor Hasil Lapangan — panduan uji dan catatan serah-terima

**Tanggal:** 2026-10-12 · **Status:** digabung ke `main` pada 2026-10-12 atas perintah Bos, tayang di produksi · **Commit fitur:** `ee73f26`

Fitur tambahan untuk KONI Kab. Bandung: PIC cabor melapor hasil pertandingan dari HP, KONI mengesahkan, dan angkanya tampil di Report Pertandingan, Dashboard, War Room, dan layar videotron.

---

## 1. Alamat untuk mencoba

- KONIDA: `https://www.konikab-bdg.com` (cadangan: `https://kab-bandung.vercel.app`) → login seperti biasa → menu **Report Pertandingan**.
- PIC di HP: `https://www.konikab-bdg.com/lapor`.
- Layar videotron: `https://www.konikab-bdg.com/konida/warroom/kabbandung?layar=1`.

Tautan di pesan WhatsApp untuk PIC mengikuti alamat yang sedang dibuka saat kode dibuat. Buat kode dari alamat yang memang akan dipakai PIC.

Untuk mencoba perubahan berikutnya tanpa menyentuh produksi, jalankan di Mac: `cd ~/Documents/VScode/porprov && npm run dev`, lalu buka `http://localhost:3000`.

Yang dibutuhkan: login KONIDA Kab. Bandung seperti biasa, dan satu HP.

---

## 2. Langkah mencoba (±10 menit)

### A. Buat kode untuk PIC
1. Login KONIDA → menu **Report Pertandingan** → tab **Kode PIC**.
2. Pilih cabor (mis. Angkat Besi), isi nama PIC dan nomor WA, tekan **Buat kode**.
3. Muncul kotak kuning berisi kode (bentuk `XXXX-XXXX`) dan pesan WhatsApp siap salin.
   - **Kode hanya tampil sekali.** Tekan *Salin pesan*, lalu kirim ke PIC lewat WhatsApp.
   - Di tabel kanan, kode hanya terlihat 4 huruf terakhirnya.

### B. Lapor dari HP (sebagai PIC)
1. Buka tautan dari pesan tadi di HP. Kode langsung dikenali; kalau tidak, ketik kodenya.
2. Isi form:
   - **Nomor pertandingan** — ketik untuk mencari di daftar resmi, atau tulis sendiri.
   - **Atlet** — centang satu orang, atau semua pemain untuk nomor beregu.
   - **Hasil** — Emas, Perak, Perunggu, Peringkat (4 ke atas), Lolos, atau Gugur.
   - **Catatan angka**, **Keterangan**, **Foto bukti** — boleh kosong.
3. Tekan **Kirim Laporan** → muncul "Laporan terkirim. Menunggu disahkan KONI."
4. Gulir ke bawah: **Laporan saya** menampilkan statusnya.

### C. Sahkan (sebagai KONIDA)
1. Kembali ke **Report Pertandingan** → tab **Antrean**. Laporan baru muncul sendiri dalam ±20 detik.
2. Coba tiga tombolnya:
   - **Sahkan** — laporan pindah ke Jurnal Harian dan angka medali di atas bertambah.
   - **Perbaiki** — membetulkan nomor, hasil, catatan angka, atau tanggal pertandingan sebelum disahkan.
   - **Tolak** — wajib menulis alasan; PIC melihat alasan itu di HP-nya.
3. Tab **Jurnal Harian** → pilih tanggal → **Cetak**.
4. Salah mengesahkan? Tekan **Kembalikan ke antrean** di kartunya.

### D. War Room dan layar videotron
1. Menu **War Room**: baris biru di atas menunjukkan medali dari laporan yang disahkan, dan angka "Medali Emas" serta "Top Klasemen" ikut berubah.
2. Tekan **Mode Layar** → tampilan penuh untuk videotron. Tekan **Layar penuh** untuk menghilangkan bingkai browser.
3. Untuk komputer videotron, buka langsung: `/konida/warroom/kabbandung?layar=1`.
4. Layar menyegarkan diri tiap 15 detik. Sahkan satu laporan lain dan lihat angkanya berubah tanpa disentuh.

### E. Yang patut dicoba dengan sengaja
- Kirim laporan yang sama dua kali → yang kedua ditolak sebagai kembar.
- Lapor "Lolos" lalu lapor "Emas" untuk nomor dan atlet yang sama → **diterima** (penyisihan lalu final).
- Di tab Kode PIC tekan **Matikan** → HP PIC langsung tidak bisa melapor lagi.

---

## 3. Aturan yang berlaku

| Aturan | Penjelasan |
|---|---|
| Hanya yang disahkan yang dihitung | Laporan menunggu dan ditolak tidak mengubah angka apa pun. |
| Satu nomor = satu medali | Emas beregu 10 pemain tetap satu emas. |
| "Lolos" bukan nomor selesai | Tidak menambah hitungan nomor, dan tidak menghalangi laporan finalnya. |
| Kembar ditolak | Nomor, susunan atlet, dan tanggal yang sama, bila hasil akhirnya sudah dilaporkan. |
| Kode terikat cabor | PIC hanya bisa memilih atlet cabornya dan tidak bisa membuka halaman lain. |
| Tanggal mengikuti WIB | Laporan lewat tengah malam tercatat hari berikutnya; KONIDA bisa membetulkan lewat **Perbaiki**. |

---

## 4. Dua hal yang berbeda dari rencana awal

**Klasemen resmi tidak ditulis.** Rencana awalnya: saat laporan disahkan, baris Kab. Bandung di tabel `klasemen_medali` ikut diperbarui. Itu tidak jadi dilakukan, karena tabel tersebut memuat angka resmi 27 kontingen dari impor dan punya pemicu lama yang menghitung per baris atlet. Tiga sumber akan saling timpa. Sebagai gantinya, Dashboard, Premium Report, dan War Room Kab. Bandung **menimpa barisnya sendiri saat dibaca** begitu ada laporan yang disahkan. Akibatnya:
- Halaman klasemen publik (`/publik/klasemen`) tetap menampilkan angka resmi, bukan angka laporan lapangan.
- Peringkat Kab. Bandung di War Room membandingkan angka lapangan kita dengan angka kontingen lain yang ada di tabel resmi.

**60 baris contoh bulan Juni tidak dihapus.** Itu data Pentathlon di `hasil_pertandingan`. Karena laporan lapangan tidak lagi menulis ke tabel itu, baris tersebut tidak mengganggu fitur ini. Risikonya tetap ada di luar fitur ini: bila operator Dayung/Pentathlon menginput hasil Kab. Bandung lewat modul lama, pemicu akan mengisi klasemen resmi dengan medali contoh itu. Menghapusnya perlu keputusan tersendiri.

---

## 5. Batasan yang diketahui

- **Login di komputer videotron habis tiap 8 jam.** Layar akan menulis peringatan merah dan angkanya berhenti diperbarui sampai login ulang.
- **23 dari 62 cabor belum punya daftar nomor resmi** (Hockey, Sepak Bola, Akuatik, Bola Basket, Menembak, dst.). PIC cabor itu mengetik nama nomornya sendiri.
- **Daftar atlet tidak bisa diubah lewat Perbaiki.** Kalau PIC salah memilih atlet: tolak, lalu minta PIC mengirim ulang.
- **Target emas per atlet mengabaikan 7 tautan meragukan** di berkas analisis (nama atlet tertaut ke orang di cabor lain). Total target tetap 94 (KONI) dan 135 (cabor).
- **Catatan jurnal lama tidak dipindahkan.** Jurnal versi lama hanya tersimpan di browser masing-masing dan tidak pernah ada di database.
- Halaman Report Pertandingan Kab. Bogor masih versi lama.

---

## 6. Yang sudah dan belum diuji

**Sudah:**
- 65 uji aturan: `npm run uji:lapor`.
- 97 uji ujung-ke-ujung terhadap server lokal: seluruh alur, penolakan tanpa login, lintas kontingen, lintas cabor, kuki PIC dipalsukan jadi kuki admin, berkas bukan-foto, foto di atas 3 MB.
- Kunci anon ditolak membaca dan menulis kedua tabel serta wadah foto.
- Tampilan di browser: form di ukuran layar HP, antrean, jurnal, isi cetakan, kode PIC, Dashboard, Premium Report, War Room, mode layar.
- `npm run build` lolos.

**Belum:**
- HP sungguhan dan kamera sungguhan (pengecilan foto baru dicoba lewat kiriman berkas, bukan lewat kamera).
- Login dengan akun KONIDA asli (uji memakai sesi buatan bernama `uji-otomatis`).
- Banyak PIC melapor bersamaan.
- Layar videotron pada ukuran aslinya.

Data uji sudah dihapus semua dari database. Yang tersisa hanya jejak di `audit_logs` dengan pelaku `uji-otomatis`, `uji-otomatis-k1`, `uji-operator`, `uji-pusat`, dan `UJI ... PIC`.

---

## 7. Sebelum hari H

1. KONI menyerahkan daftar PIC per cabor (nama, cabor, nomor WA).
2. Buat satu kode per PIC dan kirim lewat WhatsApp.
3. Tunjuk satu atau dua orang pengesah di KONI.
4. Pastikan ke KONI: satu nomor beregu = satu medali (begitu cara hitung di sini).

---

## 8. Cara membatalkan

Kode: batalkan commit gabungan di `main` (`git revert -m 1 <commit gabungan>`), lalu push. Halaman lama kembali; tabel di database boleh dibiarkan karena tidak dibaca kode lama.

Database (hanya bila fitur dibatalkan total; ini menghapus semua laporan):
```sql
drop table if exists public.laporan_hasil;
drop table if exists public.lapor_akses;
-- wadah 'bukti-hasil' dihapus lewat dasbor Supabase Storage
```

---

## 9. Berkas

| Bagian | Berkas |
|---|---|
| Aturan (murni, teruji) | `src/lib/lapor.ts`, `scripts/uji-lapor.ts` |
| Sesi PIC, paginasi | `src/lib/lapor-sesi.ts` |
| Hak admin | `src/lib/lapor-admin.ts` |
| Rute PIC | `src/app/api/lapor/{masuk,data,kirim,keluar}` |
| Rute KONIDA | `src/app/api/konida/{laporan-hasil,lapor-akses,rekap-lapangan}` |
| Form HP | `src/app/lapor/page.tsx` |
| Antrean, jurnal, kode | `src/app/konida/lappertandingan/kabbandung/page.tsx` |
| Mode layar | `src/components/konida/LayarMedali.tsx` |
| Migrasi | `src/app/migrations/053_…`, `054_…` (sudah diterapkan ke database) |

---

## 10. Pembaruan 12 Oktober 2026 (sore): daftar resmi, jadwal, jenis kelamin

Dua berkas dari KONI Kab. Bandung dipakai sebagai acuan: `klasifikasi_verified` (1.860 pendaftaran resmi, 929 atlet, 637 nomor) dan `Matriks Jadwal Harian`.

### Nomor di form PIC sekarang dari daftar resmi

- Tabel baru `pendaftaran_nomor` (migrasi 055): satu baris = satu atlet di satu nomor. **NIK tidak disimpan**; berkas hanya dipakai saat impor untuk menemukan atlet di sistem.
- Di form `/lapor`, PIC memilih nomor resmi cabornya. Katalog lama `nomor_pertandingan` hanya dipakai untuk cabor yang belum punya daftar resmi (Terjun Payung, Paramotor).
- Nomor dengan **satu** atlet terdaftar: atletnya langsung tercentang. Nomor dengan **lebih dari satu**: yang tampil hanya atlet terdaftar, tetapi tidak dicentang otomatis. Nomor perorangan yang diikuti dua atlet harus dilaporkan sendiri-sendiri; mencentang keduanya akan menjadikannya satu laporan beregu. Untuk beregu ada tombol **Pilih semua**.
- Atlet pengganti tetap bisa dipilih lewat "Tampilkan semua atlet cabor".
- Nomor yang diketik sendiri masih diterima, dan ditandai sebagai bukan dari daftar resmi.

Mengimpor ulang bila KONI mengirim berkas baru (menggantikan seluruh daftar kontingen itu):
```bash
npx tsx scripts/impor-pendaftaran.ts "<berkas.xlsx>"            # pratinjau
npx tsx scripts/impor-pendaftaran.ts "<berkas.xlsx>" --simpan
```

Yang perlu ditindaklanjuti ke KONI ada di `~/Downloads/Temuan_Pemeriksaan_Klasifikasi_KabBandung_12Okt.xlsx`: 17 atlet terdaftar resmi belum ada di sistem, 7 atlet bertarget emas tidak terdaftar, 33 NIK janggal di berkas resmi.

### Jadwal diperbarui dari matriks

22 baris `jadwal_cabor` diperbarui (tanggal, venue, atau kota), 1 ditambah (Equestrian Endurance), 60 tidak berubah. Akomodasi dan kontak panitia yang sudah ada tidak disentuh, kecuali akomodasi Balap Sepeda MTB yang dikosongkan karena pertandingannya pindah dari Kab. Cirebon ke Kab. Bogor.

Perubahan tanggal terbesar: Hapkido 5–8 → 12–15 Nov, Kick Boxing 16–19 → 12–15 Nov, Floorball 13–18 → 9–14 Nov, Modern Pentathlon 12–14 → 12–19 Nov, Berkuda Dressage 10–16 → 12–19 Nov (pindah Bekasi → Kota Depok).

Tujuh baris tidak ada di matriks dan dibiarkan apa adanya: Paramotor, Terbang Layang, Loncat Indah, Ice Skating, Dayung SUP, Marathon, dan satu baris lama "Akuatik - Renang 8–13 Nov" (matriks menyebut Renang 5–10 Nov).

Membatalkan: baris lama tersimpan di `_backup_jadwal_cabor_2026-10-12.json` di akar repo (tidak ikut git).
```bash
npx tsx scripts/impor-matriks-jadwal.ts "<berkas.xlsx>"            # pratinjau perubahan
```

### Jenis kelamin 22 atlet dibetulkan

Jenis kelamin di sistem ternyata diturunkan dari angka NIK, sehingga NIK yang salah ketik membuatnya terbalik. Dibetulkan mengikuti berkas resmi; 20 di antaranya didukung nomor putra/putri yang diikuti atlet itu. Dua hanya turun di nomor campuran sehingga tidak punya bukti kedua dan perlu dipastikan: **Marselly Ericks** (Berkuda, id 2553) dan **Aira Puspita Rahmadani** (Dayung, id 2972).

Tanggal lahir mereka tidak diubah (juga turunan NIK, dan tanggal yang benar tidak diketahui), jadi umur beberapa di antaranya masih keliru.

Membatalkan:
```sql
-- dikembalikan ke P (sebelum koreksi)
update atlet set gender = 'P' where id in (1797, 1954, 1980, 2127, 2210, 2242, 2248, 2359, 2361, 2405, 2442, 2553, 2819, 2988);
-- dikembalikan ke L (sebelum koreksi)
update atlet set gender = 'L' where id in (2101, 2239, 2368, 2739, 2750, 2838, 2870, 2972);
```
Jejaknya ada di `audit_logs` dengan aksi `KOREKSI_GENDER_BERKAS_RESMI`.

---

## 11. Pembaruan 12 Oktober 2026 (malam): nomor kembar, Lawan dan Jam, jurnal format KONI

### 185 nomor kembar dinonaktifkan

Di `nomor_pertandingan`, 185 baris yang nama, jenis kelamin, dan cabornya sama persis dengan baris lain (impor ganda 13 Mei) diberi `is_active = false`. Yang dipertahankan dari tiap kelompok adalah yang id-nya terkecil. Tidak satu pun dari ke-185 baris itu dirujuk data peserta, hasil, kualifikasi, kuota, jadwal, baseline, maupun laporan. Nomor aktif sekarang 1.151.

Tujuh halaman yang sebelumnya tidak menyaring nomor aktif sekarang menyaringnya: operator Hasil, Kualifikasi, Jadwal, dan Dashboard; superadmin Aturan Nomor; Dashboard utama; dan hitungan notifikasi. Halaman khusus operator Dayung dan Pentathlon tidak diubah (cabornya tidak punya baris kembar).

Membatalkan:
```sql
update nomor_pertandingan set is_active = true, catatan_approval = null
where catatan_approval like 'Dinonaktifkan 2026-10-12: kembaran%';
```

### Isian Lawan dan Jam tanding

Dua isian baru di form PIC (migrasi 056), keduanya boleh kosong. Bila Jam kosong, jurnal memakai jam laporan dikirim. KONIDA bisa mengisi atau membetulkan keduanya lewat **Perbaiki**.

### Jurnal dalam format "Matrix Jadwal Harian" KONI

Di tab **Jurnal Harian** ada tiga tombol baru:

| Tombol | Hasil |
|---|---|
| Cetak format KONI | Lembar mendatar untuk tanggal yang sedang dipilih |
| Excel hari ini | Berkas `.xlsx` untuk tanggal yang sedang dipilih |
| Excel seluruh jadwal | Berkas `.xlsx` dari hari pertama sampai terakhir jadwal (28 Okt–20 Nov) |

Kolomnya sama dengan berkas KONI: No, Tanggal, Jam, Klaster Wilayah, Wilayah Venue, Cabor/Kegiatan, Nomor Pertandingan, Nama Atlet, Lawan, Hasil Pertandingan, Venue, Status Target, PIC.

Cara terisinya:
- **Tanggal, Klaster, Wilayah Venue, Kegiatan, Venue** dari jadwal.
- **Nomor, Nama Atlet, Lawan, Hasil, Jam, PIC** dari laporan yang sudah disahkan. Satu laporan = satu baris.
- **Status Target** dihitung dari target medali atlet di berkas analisis: tercapai, belum tercapai, atau masih berjalan (bila hasilnya baru "lolos"). Kosong bila atlet tidak punya target.
- Kegiatan yang terjadwal hari itu tetapi belum punya laporan tetap ditulis dengan kolom hasil kosong, supaya terlihat cabor mana yang belum melapor.

Batasannya:
- Jadwal tersimpan per kegiatan (rentang hari), bukan per nomor. Jadi matriks tidak tahu nomor mana yang seharusnya bertanding hari itu; yang tampil hanya yang sudah dilaporkan.
- Tiga baris BMX di berkas KONI (Park, Trial, Flat Land) adalah satu baris di sistem; begitu juga X Rugby dan Rugby 7s.
- Laporan dari cabor yang tidak punya jadwal ditaruh di akhir hari itu dengan kolom kota dan venue kosong.
- Baris jadwal Mini 4WD ditautkan ke cabor Balap Motor (sebelumnya tidak tertaut).

---

## 12. Pembaruan 14 Oktober 2026: catatan lapangan dan laporan per cabor

Acuannya format **Laporan Monitoring PORPROV XV** dari KONI Jabar. Atas arahan Bos, yang diambil hanya yang berguna bagi KONI Kab. Bandung. Yang tidak dipakai: jumlah dan daftar peserta kab/kota lain, bagian "nomor yang pesertanya sedikit" (datanya milik penyelenggara), tanda tangan Tim Monev, dan logo KONI Jabar.

### Catatan lapangan (form PIC)

Halaman `/lapor` sekarang punya dua tab: **Lapor Hasil** dan **Catatan Lapangan**. Ada tiga jenis catatan, mengikuti bagian III–V format Monev:

| Jenis | Contoh |
|---|---|
| Tidak sesuai aturan/THB | Kelas, jadwal, atau undian diubah mendadak; penilaian tidak sesuai aturan; bahan protes |
| Masalah teknis pertandingan | Alat atau lapangan bermasalah, pertandingan tertunda, atlet cedera saat bertanding |
| Di luar teknis pertandingan | Akomodasi, transportasi, konsumsi, kesehatan atlet |

Isian lainnya: centang **Perlu tindakan segera** (ditandai merah di KONIDA), nomor pertandingan dan atlet terkait (boleh kosong), jam kejadian, uraian minimal 10 huruf, dan satu foto. Catatan **tidak mengubah angka apa pun** dan tidak perlu disahkan. Bila PIC mengirim catatan mendesak, layar HP-nya mengingatkan untuk juga menelepon atau WA pengurus KONI, karena sistem ini bukan alarm.

Tabelnya `catatan_lapangan` (migrasi 057). Seperti `laporan_hasil`, tabel ini hanya bisa disentuh lewat rute server. Foto masuk ke wadah privat yang sama (`bukti-hasil`), di folder `<kontingen>/catatan/<tanggal>/`.

### Tab "Catatan Lapangan" (KONIDA)

- Bila ada catatan mendesak yang belum ditangani, muncul **peringatan merah** di atas semua tab. Ada juga kotak angka baru "Catatan belum ditangani". Daftar disegarkan sendiri tiap 20 detik.
- Alurnya: **Belum ditangani → Sedang ditangani → Selesai**. Tanggapan boleh diisi di tiap langkah dan terlihat oleh PIC di HP-nya.
- **Abaikan** wajib disertai alasan. Catatan yang diabaikan tidak ikut tercetak di laporan cabor. **Buka lagi** mengembalikannya.
- Ada tautan **Hubungi lewat WA** ke nomor PIC bila nomornya tercatat.

### Tab "Laporan Cabor" (KONIDA)

Satu baris per cabor berisi PIC, jumlah hasil yang disahkan, medali, dan jumlah catatan. Dua tombol per baris:
- **Cetak**: laporan siap cetak/simpan PDF (A4, Arial 12, spasi 1,5), dengan foto bukti dan lambang Kab. Bandung di kepala.
- **Word**: berkas `.doc` yang bisa disunting di Word, tanpa foto (sudah dicoba dibuka di Microsoft Word).

Isinya:

| Bagian | Sumber |
|---|---|
| I. Informasi umum: tuan rumah, waktu, tempat, disiplin, nomor, jumlah atlet, PIC, periode | Jadwal (matriks) dan daftar resmi pendaftaran |
| II. Hasil pertandingan: perolehan medali, daftar medali, capaian target | Laporan yang sudah **disahkan** |
| III. Kesesuaian dengan aturan (THB) | Catatan jenis aturan |
| IV. Permasalahan teknis pertandingan | Catatan jenis teknis |
| V. Lain-lain (di luar teknis) | Catatan jenis non-teknis |
| VI. Pengesahan | PIC pelapor dan KONIDA pengesah, kolom TTD kosong |
| VII. Lampiran: dokumentasi, jadwal, hasil per nomor, daftar atlet per nomor | Foto bukti, jadwal, laporan disahkan, daftar resmi |

### Membatalkan

```sql
-- hapus foto catatan dulu lewat Storage (folder <kontingen>/catatan/), lalu:
drop table if exists public.catatan_lapangan;
```
Kode tab dan rutenya ada di commit fitur ini; `git revert` commit itu mengembalikan halaman seperti sebelumnya. Laporan hasil tidak tersentuh.

### Uji

- `npm run uji:catatan` (30) dan `npm run uji:laporan-cabor` (52) untuk aturan dan penyusunan laporan, termasuk penetralan isian berbahaya.
- Uji ujung-ke-ujung di server lokal dengan basis data produksi: 51 pemeriksaan untuk catatan, laporan cabor, kirim hasil berfoto, dan uji lama 97 + 26. Semuanya lulus, dan data uji sudah dihapus.
- Belum dicoba: kamera HP sungguhan dan akun KONIDA asli di cloud.

---

## 13. Pembaruan 16 Oktober 2026: peta War Room dan grafik proyeksi vs realisasi emas

### Peta kembali tampil

Penyedia peta latar lama (CARTO, `basemaps.cartocdn.com`) kini mengembalikan ubin bertuliskan "API KEY REQUIRED" bila diminta tanpa kunci, sehingga semua peta tampil rusak. Semua peta Leaflet sekarang memakai `pasangUbin()` di `src/lib/peta-ubin.ts`: kanvas Esri gelap atau terang, tanpa kunci, dengan atribusi "Peta © Esri". Bila suatu saat Esri juga meminta kunci, cukup ganti alamat di berkas itu.

### Grafik "Situasi Perolehan Emas" di War Room

Patokannya proyeksi KONI dari berkas `PPT Grafik Raihan Emas.pdf`: 74 emas dari 3 sampai 19 November, disimpan di tabel `proyeksi_medali` (migrasi 058). Realisasi dihitung dari laporan lapangan berhasil **emas** yang sudah **disahkan**, dengan aturan satu nomor = satu emas.

Isi panelnya:
- angka realisasi, proyeksi sampai hari berjalan, selisih (▲ di depan / ● sesuai / ▼ di belakang), dan persen tercapai;
- grafik akumulasi (proyeksi oranye putus-putus, realisasi biru) dan grafik emas per hari;
- daftar per cabor, yang paling tertinggal di atas, plus tabel harian.

"Hari berjalan" adalah hari terakhir yang punya realisasi, atau hari ini bila lebih akhir. Panel disegarkan sendiri setiap 20 detik.

Mengganti proyeksi bila KONI memberi versi baru: hapus baris lama sesuai sumbernya, lalu muat yang baru dengan nama `sumber` berbeda. Membatalkan seluruhnya: `drop table if exists public.proyeksi_medali;` (panel otomatis tersembunyi bila tabel kosong).

### Mode Layar (videotron) jadi empat halaman (16 Oktober 2026)

Alamat tetap `…/konida/warroom/kabbandung?layar=1`. Isinya sekarang empat halaman yang berputar sendiri. Bisa juga digulir manual, atau dipindah lewat titik di kanan bawah, tombol panah, atau Page Up/Down:

1. **Perolehan medali**, kini dengan peringkat sementara dan tanggal di tiap medali terbaru (±25 detik).
2. **Grafik perolehan emas**: akumulasi proyeksi KONI vs emas yang diraih, emas per hari, dan hari dengan emas terbanyak (±25 detik).
3. **Medali per tanggal**: semua medali yang disahkan, dikelompokkan per hari, tanggal terbaru di atas. Daftarnya bergulir pelan sendiri; halaman ini baru berganti setelah daftarnya habis (paling lama 3 menit).
4. **Klasemen & jadwal**: 10 besar klasemen (angka Kab. Bandung dari laporan yang disahkan), hitung mundur ke pembukaan, dan cabor Kab. Bandung yang bertanding hari ini atau jadwal terdekat (±25 detik).

Setiap sentuhan, guliran, atau tombol membuat putar otomatis berhenti 60 detik, supaya operator bisa membaca. Tombol "Putar otomatis" mematikannya sama sekali.

Yang sengaja tidak ditampilkan di layar umum: catatan lapangan, antrean pengesahan, data PIC, dan target per atlet. Garis proyeksi KONI ikut tampil di grafik; bila KONI tidak ingin proyeksinya terlihat umum, garis itu bisa disembunyikan.
