# Lapor Hasil Lapangan — panduan uji dan catatan serah-terima

**Tanggal:** 2026-10-12 · **Branch:** `fitur/lapor-hasil-lapangan` (belum digabung ke `main`) · **Commit:** `ee73f26`

Fitur tambahan untuk KONI Kab. Bandung: PIC cabor melapor hasil pertandingan dari HP, KONI mengesahkan, dan angkanya tampil di Report Pertandingan, Dashboard, War Room, dan layar videotron.

---

## 1. Alamat untuk mencoba

**Cara 1 — pratinjau Vercel (belum menyentuh produksi):**
https://kab-bandung-cnuc73itx-iwans-projects-1619769f.vercel.app

Alamat ini terkunci login Vercel: buka di browser yang sudah login ke akun Vercel pemilik proyek. Build-nya berhasil, tetapi isinya belum bisa saya periksa dari luar karena kunci itu. Kalau login aplikasi di pratinjau gagal, kemungkinan variabel lingkungan Preview belum diisi; pakai cara 2.

**Cara 2 — server lokal di Mac (sudah terbukti jalan saat pengujian):**
```bash
cd ~/Documents/VScode/porprov && git checkout fitur/lapor-hasil-lapangan && npm run dev
```
Lalu buka `http://localhost:3000`. Untuk mencoba dari HP di Wi-Fi yang sama, cari alamat Mac dengan `ipconfig getifaddr en0`, lalu buka `http://ALAMAT-ITU:3000/lapor` di HP.

**Alamat produksi (`kab-bandung.vercel.app`, `porprov-xv.vercel.app`) belum memuat fitur ini** sampai branch digabung ke `main`.

Catatan untuk cara 2: tautan di pesan WhatsApp mengikuti alamat yang sedang dibuka. Kalau kode dibuat dari `localhost`, ganti `localhost` di tautannya dengan alamat Mac sebelum dibuka di HP, atau ketik kodenya langsung di `/lapor`.

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

Kode: branch ini belum digabung ke `main`; cukup jangan digabung.

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
