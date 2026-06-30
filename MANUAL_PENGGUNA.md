# MANUAL PENGGUNA
## Sistem Manajemen Atlet & Intelijen Performa — PORPROV XV Jawa Barat 2026
### Kontingen Kabupaten Bandung

---

> **Versi dokumen:** Juni 2026  
> **Sistem:** Pentascore / Porprov XV Intelligence Platform  
> **Bahasa:** Indonesia

---

## DAFTAR ISI

1. [Login & Akses Sistem](#1-login--akses-sistem)
2. [Dashboard Utama](#2-dashboard-utama)
3. [Modul Kejuaraan — Track Record Prestasi](#3-modul-kejuaraan--track-record-prestasi)
   - 3.1 Halaman Landing Kejuaraan
   - 3.2 Roster Atlet Per Cabor
   - 3.3 Dossier Atlet Kejuaraan
   - 3.4 Cara Tambah Prestasi
4. [Modul Performance Intelligence Center](#4-modul-performance-intelligence-center)
   - 4.1 Halaman Utama Performance
   - 4.2 Strategic Brief (AI)
   - 4.3 Tabel Proyeksi Top-Line
   - 4.4 Roster Cabor di Performance
   - 4.5 Dossier Atlet Performance
   - 4.6 Meeting Agenda (AI)
   - 4.7 Import Data Baseline
5. [Modul Manajemen Atlet](#5-modul-manajemen-atlet)
6. [Modul Kualifikasi](#6-modul-kualifikasi)
7. [Modul Laporan & Export](#7-modul-laporan--export)
8. [Sidebar Navigasi](#8-sidebar-navigasi)
9. [Tips & FAQ](#9-tips--faq)
10. [Panduan Role & Akses](#10-panduan-role--akses)

---

## 1. LOGIN & AKSES SISTEM

### Cara Masuk Aplikasi

1. Buka browser (Chrome/Firefox/Edge disarankan)
2. Akses URL aplikasi yang diberikan oleh administrator
3. Halaman **Login Kab. Bandung** akan tampil
4. Masukkan:
   - **Email/Username** — diberikan oleh admin sistem
   - **Password** — diberikan oleh admin sistem
5. Klik tombol **"Masuk"**
6. Sistem akan otomatis mengarahkan ke Dashboard sesuai role Anda

### Lupa Password
- Hubungi administrator sistem KONI Kab. Bandung

### Logout
- Klik ikon profil di pojok sidebar (bawah)
- Pilih **"Keluar"**

---

## 2. DASHBOARD UTAMA

**Akses:** Klik menu **"Dashboard"** di sidebar kiri

### Yang Tampil di Dashboard

| Bagian | Keterangan |
|--------|------------|
| **KPI Strip** | Total atlet terdaftar, total cabor, atlet terverifikasi, jumlah medali |
| **Quick Links** | Shortcut ke Kejuaraan, Performance, Atlet, Laporan |
| **Alert Bar** | Notifikasi penting (atlet pending verifikasi, data belum lengkap, dll) |
| **Rekap Cabor** | Ringkasan per cabor: atlet, status kualifikasi, target medali |

### Langkah Penggunaan Dashboard

1. Setelah login, Anda langsung berada di Dashboard
2. Perhatikan **Alert Bar** di bagian atas — ini menampilkan hal-hal yang perlu segera ditindaklanjuti
3. Klik angka atau shortcut untuk masuk ke modul terkait
4. Dashboard tidak memerlukan input — hanya tampilan ringkasan

---

## 3. MODUL KEJUARAAN — TRACK RECORD PRESTASI

**Fungsi:** Mencatat, melihat, dan memverifikasi riwayat prestasi kompetisi semua atlet Kab. Bandung.

**Akses:** Klik **"Kejuaraan"** di sidebar kiri → pilih **"Kab. Bandung"**

---

### 3.1 Halaman Landing Kejuaraan

**URL:** `/konida/kejuaraan/kabbandung`

**Yang Tampil:**

| Bagian | Keterangan |
|--------|------------|
| **Hero Medal Strip** | Total 🥇 Emas · 🥈 Perak · 🥉 Perunggu · Atlet berprestasi |
| **Filter Status** | Semua Records / Terverifikasi / Menunggu Verifikasi |
| **Grid Cabor** | Kartu per cabor dengan ringkasan medali & atlet |

**Cara Membaca Kartu Cabor:**
- **Nama Cabor** — misalnya: Atletik, Akuatik, Angkat Berat
- **Angka medali** — jumlah total dari semua atlet di cabor itu
- **Year range** — tahun kompetisi pertama hingga terbaru
- **Top level** — level tertinggi yang pernah dicapai (Internasional/Nasional/Provinsi)
- **Jumlah atlet berprestasi** — atlet yang punya minimal 1 record

**Cara Filter:**
1. Klik tab **"Terverifikasi"** — hanya tampilkan record yang sudah dikonfirmasi admin
2. Klik tab **"Menunggu Verifikasi"** — tampilkan record yang masih pending
3. Klik tab **"Semua Records"** — kembali ke tampilan lengkap

**Cara Masuk ke Cabor:**
- Klik kartu cabor mana saja → akan masuk ke **Roster Atlet Cabor**

---

### 3.2 Roster Atlet Per Cabor

**URL:** `/konida/kejuaraan/kabbandung/[nama-cabor]`  
**Contoh:** `/konida/kejuaraan/kabbandung/atletik`

**Yang Tampil:**

| Kolom | Keterangan |
|-------|------------|
| **Nama Atlet** | Nama + gender (Putra/Putri) |
| **Medali** | 🥇 🥈 🥉 dengan jumlah per jenis |
| **Records** | Total catatan prestasi & rentang tahun |
| **Top Level** | Badge level tertinggi (Internasional/Nasional/dll) |

**Cara Filter & Sort:**

1. **Cari atlet** — ketik nama di kotak **Search** kanan atas
2. **Filter Gender** — pilih Semua / Putra / Putri
3. **Filter Level** — tampilkan hanya atlet dengan prestasi level tertentu
4. **Filter Hasil** — hanya tampilkan Emas / Perak / Perunggu saja
5. **Filter Status** — Terverifikasi / Menunggu Verifikasi
6. **Sort** — klik dropdown sort:
   - **Total medali** (default) — atlet dengan paling banyak medali di atas
   - **Emas terbanyak** — prioritas atlet paling banyak emas
   - **Level tertinggi** — atlet dengan prestasi Internasional duluan
   - **Paling baru** — kompetisi terbaru di atas
   - **Nama A-Z** — urutan alfabetis

**Cara Masuk ke Detail Atlet:**
- Klik nama atlet atau baris manapun → masuk ke **Dossier Atlet**

---

### 3.3 Dossier Atlet Kejuaraan

**URL:** `/konida/kejuaraan/kabbandung/[cabor]/[id-atlet]`

**Ini adalah halaman paling lengkap untuk track record satu atlet.**

**Bagian-bagian Halaman:**

#### A. Profile Header
| Elemen | Keterangan |
|--------|------------|
| **Avatar** | Inisial nama, atau ikon 🔥 ELITE jika atlet punya emas |
| **Nama & Cabor** | Lengkap dengan gender & asal daerah |
| **Umur** | Dihitung otomatis dari tanggal lahir |
| **Badge Status** | Hijau = Verified, dll |
| **Lokal / Non-Lokal** | 📍 Lokal = dari Kab. Bandung, 🔀 Non-lokal = dari luar |
| **No. KONI** | Nomor registrasi KONI jika tersedia |
| **Link Performa** | Tombol 📊 Lihat Performance → masuk ke modul Performance |

#### B. Rekap Medali
- Total records, total emas, perak, perunggu
- **Career span**: tahun pertama–terakhir bercompetisi
- Contoh: "2019–2024 (6 thn)"

#### C. Level Distribution
- Bar chart menunjukkan komposisi level event
- Semakin banyak Internasional/Nasional → atlet lebih prestisius

#### D. Career Timeline
- Visualisasi garis waktu karir atlet
- Setiap titik = satu event/kompetisi
- Warna titik = hasil (emas=kuning, perak=abu, perunggu=cokelat)
- Klik titik untuk lihat detail

#### E. Daftar Riwayat Prestasi
Setiap baris record menampilkan:
- **Emoji hasil** (🥇🥈🥉 atau 4️⃣)
- **Nama event/kejuaraan**
- **Hasil** (Emas/Perak/Perunggu)
- **Level** dengan warna (ungu=Internasional, biru=Nasional, cyan=Provinsi)
- **Nomor/kelas** tanding
- **Lokasi & tahun**
- **Status** (✅ Terverifikasi / ⏳ Pending / ❌ Ditolak)
- **Sumber** (diinput atlet / admin / import / terverifikasi)
- **Ikon dokumen** jika ada bukti scan

#### F. Baseline Snapshot (Atletik & Akuatik saja)
- Hanya muncul untuk cabor yang punya data baseline PORPROV
- Menampilkan gap% ke rekor acuan dan probabilitas medali

---

### 3.4 Cara Tambah Prestasi

1. Buka **Dossier Atlet** yang ingin ditambah prestasi
2. Klik tombol **"+ Tambah Prestasi"** (pojok kanan atas profil)
3. Isi form modal yang muncul:

| Field | Wajib | Keterangan |
|-------|-------|------------|
| **Nama Kejuaraan** | ✅ | Nama lengkap event/kompetisi |
| **Tingkat** | ✅ | Internasional / Nasional / Provinsi / Kabupaten / Lokal |
| **Tahun** | ✅ | Tahun pelaksanaan (format: 2024) |
| **Medali/Hasil** | ✅ | Emas / Perak / Perunggu / Juara 4 / Peserta |
| **Nomor/Kelas** | — | Misal: "100m Putra", "Kelas 56kg" |
| **Lokasi** | — | Kota/tempat pelaksanaan |
| **Catatan** | — | Keterangan tambahan |
| **Upload Bukti** | — | Foto/scan sertifikat, SK, atau piagam (PDF/JPG) |

4. Klik **"Simpan"**
5. Record baru akan muncul dengan status **"Menunggu Verifikasi"** (pending)
6. Admin/operator akan melakukan verifikasi dan mengubah status ke "Terverifikasi"

> **Catatan:** Record dengan status Pending tetap tampil di daftar, ditandai ikon ⏳. Angka medali di halaman landing hanya menghitung yang sudah Terverifikasi.

---

## 4. MODUL PERFORMANCE INTELLIGENCE CENTER

**Fungsi:** Analisis mendalam performa atlet terhadap target medali PORPROV XV — gap analysis, readiness score, proyeksi medali, dan rekomendasi strategis berbasis AI.

**Akses:** Klik **"Performance"** di sidebar kiri → pilih **"Kab. Bandung"**

---

### 4.1 Halaman Utama Performance

**URL:** `/konida/performance/kabbandung`

**Ini adalah command center intelijen kontingen Kab. Bandung.**

#### Bagian Header Sticky (Selalu Tampil)
- **Nama & logo** sistem
- **Filter Gender**: Semua / Putra / Putri
- **Search**: cari nama atlet atau cabor
- **Jam live**: update real-time
- **Tombol "📋 Meeting Agenda"**: buka halaman agenda AI
- **Tombol "📥 Import Data"**: upload baseline baru
- **Tombol "🔄"**: refresh data

#### Langkah Membaca Halaman Performance

**Langkah 1 — Baca Tabel Proyeksi Top-Line**

Tabel ini langsung tampil di atas, TANPA perlu klik apapun.

| Kolom | Arti |
|-------|------|
| **Cabor** | Nama cabang olahraga |
| **Atlet** | Jumlah atlet dengan baseline data |
| **Target (E/P/B)** | Target pelatih dalam format Emas/Perak/Perunggu |
| **Avg Gap%** | Rata-rata jarak performa ke rekor acuan |
| **Confidence** | HIGH (realistis) / MIXED (50-50) / LOW (perlu kerja keras) |

- **Baris TOTAL** di bagian bawah = agregat seluruh kontingen
- **Insights** di bawah tabel = poin strategis utama

**Langkah 2 — Baca Legend Gap%**
- 🟢 **≤ 3%** = Peluang Emas (very close to record)
- 🔵 **3–7%** = Potensial Perak/Perunggu
- 🟠 **7–12%** = Developing, perlu intervensi
- 🔴 **> 12%** = Concern, butuh evaluasi

**Langkah 3 — Baca Cabor Cards (Performance Center)**

Grid kartu per cabor di bagian bawah. Setiap kartu menampilkan:
- Emoji & nama cabor
- Jumlah atlet + target medali (E/P/B pills)
- Readiness score rata-rata
- Gap% rata-rata
- Nama atlet top kontributor
- Badge khusus (misal: "💎 Hidden Gem" untuk Angkat Berat)

**Filter Cabor Cards:**
1. **Semua** — tampilkan semua cabor
2. **Ada Baseline** — hanya cabor yang sudah punya data baseline
3. **Ada Medali** — hanya cabor yang atletnya punya riwayat kejuaraan
4. **Baseline + Medali** — kombinasi keduanya (paling prioritas)

---

### 4.2 Strategic Brief (AI)

**Fungsi:** Analisis strategis otomatis seluruh kontingen, dibuat oleh Claude AI berdasarkan semua data baseline.

#### Cara Generate

1. Di halaman Performance, lihat panel **"AI Strategic Brief"**
2. Klik tombol **"⚡ Generate Strategic Brief"**
3. Tunggu 15–30 detik (AI sedang menganalisis ratusan data atlet)
4. Brief akan tampil otomatis

#### Isi Strategic Brief

| Bagian | Keterangan |
|--------|------------|
| **Skor Kesiapan** | Angka 0–100 (hijau ≥70, kuning 50–70, merah <50) |
| **Ringkasan** | Paragraf situasi kontingen saat ini |
| **Kekuatan Utama** | Cabor/atlet yang paling siap |
| **Proyeksi Medali** | Perkiraan total medali PORPROV XV |
| **Prioritas Strategis** | Langkah aksi dengan label dampak TINGGI/SEDANG/RENDAH |
| **Peluang Emas** | Cabor/atlet yang realistis bisa raih emas |
| **Area Risiko** | Cabor/atlet yang perlu perhatian khusus |
| **Pesan untuk Pelatih** | Pesan motivasi/direktif dari AI |

> **Tip:** Generate ulang kapan saja setelah ada update data — klik tombol **"🔄 Refresh Brief"**. Setiap generate akan menggunakan data terbaru.

---

### 4.3 Tabel Proyeksi Top-Line

Tabel ini **selalu tampil otomatis** tanpa perlu AI generate. Dihitung langsung dari data baseline yang ada di database.

**Cara Membaca:**
- Setiap baris = satu cabor
- Cabor dengan **Confidence: HIGH** + **Gap kecil** → prioritas utama pelatih
- Baris **TOTAL** → gambaran keseluruhan proyeksi kontingen

---

### 4.4 Roster Cabor di Performance

**URL:** `/konida/performance/kabbandung/[nama-cabor]`

**Cara Masuk:** Klik kartu cabor mana saja di halaman Performance

**Perbedaan dengan Roster Kejuaraan:**
Di sini tampil **Readiness Score** dan **Gap%** dari data baseline — lebih spesifik ke persiapan PORPROV.

**Cara Membaca Tabel Roster:**

| Kolom | Keterangan |
|-------|------------|
| **Nama Atlet** | Nama + gender |
| **Readiness Score** | Angka 0–100 dengan tier badge |
| **Tier Badge** | UNGGULAN / POTENSIAL / DEVELOPING / CONCERN |
| **Avg Gap%** | Rata-rata jarak performa ke rekor PORPROV |
| **Jumlah Event** | Berapa nomor/event yang punya data baseline |
| **Medali** | Riwayat kejuaraan (dari modul Kejuaraan) |
| **Top Level** | Level tertinggi prestasi |

**Tier Badge Warna:**
- 🟢 **UNGGULAN** — siap bersaing di level teratas
- 🔵 **POTENSIAL** — ada potensi, butuh optimasi
- 🟠 **DEVELOPING** — perlu kerja extra
- 🔴 **CONCERN** — butuh evaluasi mendasar

**Cara Sort:**
1. **Readiness score** (default) — atlet paling siap di atas
2. **Gap terkecil** — atlet paling dekat ke rekor di atas
3. **Total medali** — berdasarkan histori kejuaraan
4. **Emas terbanyak**
5. **Level tertinggi**
6. **Nama A-Z**

---

### 4.5 Dossier Atlet Performance

**URL:** `/konida/performance/kabbandung/[cabor]/[id-atlet]`

**Cara Masuk:** Klik nama atlet di roster performance

**Bagian-bagian Halaman:**

#### A. Profile Header
- Sama seperti dossier kejuaraan, DITAMBAH:
- **Badge TIER** (pojok kanan atas) — menampilkan tier readiness dengan warna

#### B. Readiness Score Breakdown
- Skor keseluruhan + breakdown komponen:
  - Fitness % dari tes fisik
  - Gap% rata-rata dari baseline
  - Level prestasi kejuaraan
  - Jumlah medali historis

#### C. Baseline Performance Section
- Tabel per event/nomor:

| Kolom | Keterangan |
|-------|------------|
| **Event** | Nama nomor/kategori (misal: "100m", "Kelas 56kg") |
| **PB** | Personal Best yang terekam |
| **Gap%** | % jarak dari rekor acuan PORPROV |
| **Target** | Target medali (Emas/Perak/Perunggu) |
| **Prob** | Probabilitas meraih target (%) |

- Warna baris Gap%: hijau ≤3%, cyan 3-7%, orange 7-12%, merah >12%
- Baris **"n/a"** = belum ada data PB untuk event itu

#### D. AI Smart Brief (per atlet)
- Brief singkat per individu, generate dengan klik tombol **"⚡ Generate Smart Brief"**
- Isi: situasi atlet, kekuatan, risiko, rekomendasi pelatih

#### E. Action Items (AI per atlet)
- Klik **"🎯 Generate Action Items"**
- Menghasilkan daftar tindakan konkret (CRITICAL / HIGH / MEDIUM)
- Contoh: "Tingkatkan kecepatan start 100m dari 9.8 detik ke 9.5 detik — latihan sprint 3x seminggu"

#### F. Untuk Angkat Berat: Lift Progression Card
- Khusus cabor Angkat Berat
- Menampilkan perkembangan total angkatan dari tiap periode latihan
- Menampilkan delta (Δ) per periode dan tren (naik/turun)

---

### 4.6 Meeting Agenda (AI)

**URL:** `/konida/performance/kabbandung/agenda`

**Cara Masuk:** Klik tombol **"📋 Meeting Agenda"** di header Performance

**Fungsi:** Membuat agenda rapat kontingen secara otomatis berdasarkan data performa semua cabor dan atlet, dibuat oleh Claude AI.

#### Cara Gunakan

1. Halaman akan otomatis memuat data kontingen (atlet count + baseline summary)
2. Tunggu indikator "Data X atlet sudah dimuat"
3. Klik tombol **"⚡ Generate Meeting Agenda"**
4. Tunggu 20–30 detik
5. Agenda akan tampil berkelompok berdasarkan prioritas

#### Membaca Agenda

| Priority | Warna | Arti | Deadline |
|----------|-------|------|----------|
| **CRITICAL** | Merah | Harus diselesaikan minggu ini | Segera |
| **HIGH** | Orange | 2 minggu ke depan | Keputusan strategis |
| **MEDIUM** | Biru | Dalam 1 bulan | Optimasi & persiapan |
| **LONG_TERM** | Abu | Persiapan PORPROV 2030 | Jangka panjang |

Setiap item agenda menampilkan:
- **Nomor urut**
- **Judul** action item (konkret)
- **Cabor** yang relevan
- **Owner** — siapa yang bertanggung jawab
- **Deadline** (jika ada)

> **Tip:** Cetak atau screenshot agenda untuk dibagikan ke peserta rapat. Klik **"🔄 Regenerate"** untuk membuat agenda baru dengan perspektif berbeda.

---

### 4.7 Import Data Baseline

**URL:** `/konida/performance/kabbandung/import`

**Cara Masuk:** Klik tombol **"📥 Import Data"** di header Performance

**Fungsi:** Upload data baseline atlet dari file Excel untuk di-import ke sistem.

#### Langkah Import

**Tahap 1 — Upload File**
1. Siapkan file Excel (.xlsx) dengan format yang sesuai template
2. Klik **"Choose File"** atau drag-drop file ke area upload
3. Klik **"Next →"**

**Tahap 2 — Preview Data**
1. Sistem akan menampilkan preview isi file
2. Periksa kolom yang terdeteksi (nama atlet, cabor, nomor, waktu/hasil, dll)
3. Jika ada kolom yang tidak terdeteksi, mapping manual tersedia
4. Klik **"Next →"**

**Tahap 3 — Validasi**
1. Sistem mengecek konsistensi data:
   - Nama atlet harus ada di database
   - Format waktu/hasil harus valid
   - Cabor harus dikenali sistem
2. Baris yang bermasalah akan ditandai merah dengan keterangan error
3. Baris valid ditandai hijau
4. Klik **"Import Data Valid"** untuk lanjut (baris error akan di-skip)

**Tahap 4 — Konfirmasi**
1. Summary: berapa baris berhasil, berapa yang error
2. Klik **"Selesai"** untuk kembali ke Performance Center
3. Data baru langsung tersedia di roster dan dossier atlet

---

## 5. MODUL MANAJEMEN ATLET

**Akses:** Klik **"Atlet"** di sidebar kiri

**Fungsi:** CRUD (tambah, lihat, edit, hapus) data atlet Kab. Bandung.

---

### 5.1 Halaman Daftar Atlet

**Yang Tampil:**
- **Alert bar** di atas: notifikasi atlet pending verifikasi atau masalah data
- **Tabel atlet** dengan semua atlet Kab. Bandung

**Kolom Tabel:**

| Kolom | Keterangan |
|-------|------------|
| Nama & Foto | Nama lengkap dengan avatar/foto |
| Gender | Putra / Putri |
| Cabor | Cabang olahraga |
| Kualifikasi | Lolos / Pending / Tidak Lolos / Cadangan |
| Verifikasi | Verified / Pending / Revisi / Ditolak |
| Status | Aktif / Cedera / Standby / Selesai |
| Medali | 🥇🥈🥉 dari riwayat kejuaraan |

**Cara Filter & Search:**
1. Gunakan kotak **Search** untuk cari nama atlet
2. Gunakan filter **Cabor** untuk lihat satu cabor saja
3. Gunakan filter **Status Kualifikasi** untuk filter lolos/pending/dll
4. Gunakan filter **Gender** untuk Putra/Putri

---

### 5.2 Tambah Atlet Baru

1. Klik tombol **"+ Tambah Atlet"** (pojok kanan atas tabel)
2. Isi form registrasi:

| Field | Wajib | Keterangan |
|-------|-------|------------|
| Nama Lengkap | ✅ | Sesuai KTP/dokumen resmi |
| NIK | ✅ | Nomor Induk Kependudukan |
| Gender | ✅ | Putra / Putri |
| Tanggal Lahir | ✅ | Format: DD/MM/YYYY |
| Cabor | ✅ | Pilih dari dropdown cabang olahraga |
| Nomor Pertandingan | — | Nomor/kelas yang diikuti |
| Asal Daerah | — | Kota/kab asal (misal: Kab. Bandung) |
| Upload Foto | — | Format JPG/PNG, maks 2MB |

3. Klik **"Simpan"**
4. Atlet baru akan muncul di tabel dengan status **"Pending"**

---

### 5.3 Edit Data Atlet

1. Klik ikon pensil ✏️ di baris atlet yang ingin diedit
2. Ubah data yang perlu diperbarui
3. Klik **"Update"** untuk menyimpan
4. Klik **"Batal"** untuk membatalkan perubahan

---

### 5.4 Lihat Detail Atlet

1. Klik nama atlet di tabel
2. Halaman detail menampilkan semua informasi atlet termasuk:
   - Data dasar (nama, NIK, gender, umur)
   - Status kualifikasi & verifikasi
   - Fasilitas: akomodasi, kamar, konsumsi, transport
   - Jadwal pertandingan terdekat
   - Catatan/alert khusus

---

## 6. MODUL KUALIFIKASI

**Akses:** Klik **"Kualifikasi"** di sidebar kiri

**Fungsi:** Melihat dan mengupdate status kualifikasi atlet untuk PORPROV XV.

### Status Kualifikasi

| Status | Arti |
|--------|------|
| **Lolos** | Atlet sudah resmi lolos kualifikasi |
| **Pending** | Masih dalam proses verifikasi |
| **Tidak Lolos** | Tidak memenuhi syarat kualifikasi |
| **Cadangan** | Lolos sebagai cadangan (jika ada atlet utama cedera) |

### Cara Update Status

1. Buka halaman Kualifikasi Kab. Bandung
2. Cari atlet di tabel
3. Klik dropdown status di kolom **Kualifikasi**
4. Pilih status baru
5. Status otomatis tersimpan dan terupdate di seluruh sistem

---

## 7. MODUL LAPORAN & EXPORT

**Akses:** Klik **"Laporan"** di sidebar kiri

**Fungsi:** Menghasilkan laporan rekap atlet, medali, dan statistik kontingen.

### Jenis Laporan

| Laporan | Isi |
|---------|-----|
| **Rekap Atlet** | Total atlet per cabor, gender, status kualifikasi |
| **Medali** | Breakdown 🥇🥈🥉 per cabor dan atlet |
| **Kualifikasi** | Summary lolos/pending/tidak lolos |
| **Statistik** | Data agregat per kontingen |

### Cara Export

1. Pilih jenis laporan
2. (Opsional) Atur filter tanggal, cabor, atau status
3. Klik salah satu tombol export:
   - **Export PDF** — untuk laporan formal/cetak
   - **Export Excel** — untuk analisis lebih lanjut
   - **Export CSV** — untuk integrasi dengan sistem lain
4. File akan otomatis ter-download

---

## 8. SIDEBAR NAVIGASI

Sidebar di sisi kiri adalah navigasi utama ke semua modul.

| Menu | Fungsi |
|------|--------|
| 🏠 **Dashboard** | Halaman utama dengan ringkasan dan alerts |
| 🏆 **Kejuaraan** | Track record prestasi kompetisi atlet |
| 📊 **Performance** | Intelligence center gap analysis & proyeksi medali |
| 👥 **Atlet** | Manajemen data semua atlet |
| ✅ **Kualifikasi** | Status kualifikasi atlet |
| 🏢 **Profil** | Profil kontingen Kab. Bandung |
| 🏟️ **Penyelenggara** | Venue, akomodasi, logistik |
| 📋 **Laporan** | Export & laporan resmi |
| 🔬 **SIPA** | Sports Intelligence Analytics |
| 🎯 **Warroom** | Kolaborasi real-time tim |
| 📅 **Lappertandingan** | Jadwal pertandingan |
| 📁 **Dokumen** | Manajemen dokumen & sertifikat |
| 📤 **Export** | Export data massal |

**Cara collapse/expand sidebar:** Klik ikon panah di tepi sidebar (jika tersedia).

---

## 9. TIPS & FAQ

### Tips Penggunaan Optimal

**Untuk pelatih/coach:**
- Gunakan modul **Performance** setiap minggu untuk cek gap% atlet
- Perhatikan atlet dengan tier **DEVELOPING** atau **CONCERN** — mereka butuh perhatian ekstra
- Generate **Meeting Agenda** sebelum rapat mingguan untuk mendapat agenda otomatis dari AI
- Klik nama atlet di **"Top Kontributor"** untuk langsung ke dossier mereka

**Untuk admin/operator:**
- Selalu verifikasi prestasi yang masuk (status Pending) sesegera mungkin
- Pastikan data baseline sudah di-import untuk semua cabor prioritas
- Gunakan filter **"Baseline + Medali"** di Performance untuk fokus ke atlet paling siap

**Untuk manajer kontingen:**
- Buka **Dashboard** setiap pagi untuk cek alert
- Generate **Strategic Brief** setelah ada update data untuk insight terbaru
- Gunakan **Laporan** untuk materi rapat dengan KONI

---

### FAQ — Pertanyaan yang Sering Diajukan

**Q: Mengapa data medali tidak berubah padahal sudah saya tambah?**  
A: Pastikan record sudah diverifikasi (status = Terverifikasi). Record dengan status Pending tidak dihitung di total medali landing page. Minta admin untuk verifikasi.

**Q: Mengapa roster cabor Akuatik kosong?**  
A: Pastikan atlet terdaftar dengan status Verified/Posted. Jika masih kosong, hubungi admin — mungkin ada perbedaan nama cabor di database.

**Q: Apakah AI Strategic Brief bisa salah?**  
A: AI membuat analisis berdasarkan data yang ada. Jika data baseline tidak lengkap atau data kejuaraan kurang, akurasi brief akan berkurang. Pastikan data sudah lengkap sebelum generate brief.

**Q: Berapa lama Generate Strategic Brief?**  
A: Biasanya 15–30 detik. Jika lebih dari 60 detik, coba refresh halaman dan generate ulang.

**Q: Apakah data saya aman?**  
A: Ya, data tersimpan di server Supabase yang terenkripsi. Setiap kontingen hanya bisa melihat data kontingen sendiri.

**Q: Bagaimana cara upload bukti prestasi?**  
A: Di form **Tambah Prestasi**, ada field "Upload Bukti". Upload file PDF atau JPG/PNG maksimal 5MB. Bukti akan tersimpan dan bisa dilihat admin saat verifikasi.

**Q: Skor Readiness atlet saya rendah, apa artinya?**  
A: Readiness Score menggabungkan fitness %, gap ke rekor, dan histori prestasi. Skor rendah bukan berarti atlet buruk — bisa jadi data baseline belum lengkap atau atlet baru bergabung. Cek detail breakdown di dossier atlet.

**Q: Bisa tidak melihat data kontingen lain?**  
A: Tergantung role akses Anda. Operator kontingen hanya melihat data kontingen sendiri. Admin KONI bisa melihat semua kontingen.

---

## 10. PANDUAN ROLE & AKSES

### Jenis Role

| Role | Akses | Batasan |
|------|-------|---------|
| **Admin KONI** | Semua modul, semua kontingen | Tidak ada |
| **Operator Kontingen** | Data kontingen sendiri, input prestasi, import baseline | Tidak bisa hapus atlet |
| **Coach** | Lihat performance & kejuaraan atlet, tambah prestasi | Tidak bisa edit data atlet |
| **Viewer** | Baca-saja semua data kontingen | Tidak bisa tambah/edit/hapus |

### Yang Bisa Dilakukan Per Role

| Aksi | Admin | Operator | Coach | Viewer |
|------|-------|----------|-------|--------|
| Lihat semua data | ✅ | Kontingen sendiri | Kontingen sendiri | Kontingen sendiri |
| Tambah atlet | ✅ | ✅ | ❌ | ❌ |
| Edit atlet | ✅ | ✅ | ❌ | ❌ |
| Hapus atlet | ✅ | ❌ | ❌ | ❌ |
| Tambah prestasi | ✅ | ✅ | ✅ | ❌ |
| Verifikasi prestasi | ✅ | ✅ | ❌ | ❌ |
| Import baseline | ✅ | ✅ | ❌ | ❌ |
| Generate AI Brief | ✅ | ✅ | ✅ | ✅ |
| Export laporan | ✅ | ✅ | ✅ | ✅ |

---

## ALUR KERJA YANG DISARANKAN

### Alur Mingguan (untuk Operator/Coach)

```
SENIN PAGI
└── Buka Dashboard → cek alert bar
    └── Ada atlet pending verifikasi? → masuk Kejuaraan → verifikasi

SELASA
└── Buka Performance Center
    └── Cek tabel proyeksi — ada perubahan gap% atlet kunci?
        └── Klik atlet tersebut → dossier performance → cek baseline

RABU (Sebelum Rapat)
└── Buka Meeting Agenda
    └── Generate Agenda AI → Screenshot/print untuk rapat
        └── Bahas action item CRITICAL duluan

KAMIS/JUMAT
└── Update data setelah sesi latihan
    └── Tambah prestasi dari kompetisi yang baru berlangsung
        └── Upload bukti dokumen → status Pending (menunggu verifikasi admin)

AKHIR MINGGU
└── Export laporan mingguan untuk KONI
```

### Alur Menjelang PORPROV (H-30)

```
1. Import baseline terbaru untuk semua cabor prioritas
2. Generate Strategic Brief → identifikasi peluang emas
3. Review dossier semua atlet tier UNGGULAN
4. Generate Meeting Agenda → rapat seleksi tim inti
5. Update status kualifikasi atlet final
6. Export laporan resmi untuk KONI
```

---

*Dokumen ini dibuat untuk penggunaan internal Kontingen Kab. Bandung — PORPROV XV Jawa Barat 2026.*  
*Untuk bantuan teknis: hubungi tim IT KONI Kab. Bandung.*
