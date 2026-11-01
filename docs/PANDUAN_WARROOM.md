# War Room Kab. Bandung — panduan (v4, 28 Okt 2026)

Khusus PORPROV XV. **Tidak ada data contoh, target sementara, atau referensi POPDA** — bagian yang belum punya data
tampil kosong dengan jujur ("—", "Klasemen belum dimulai").

| Bagian | Isi | Sumber data |
|---|---|---|
| KPI atas | Peringkat, emas (/ proyeksi KONI), total medali, laga live, total atlet | klasemen resmi + laporan disahkan, `proyeksi_medali`, `jadwal_partai` |
| **Misi Emas Hari Ini** | Emas yang diproyeksikan KONI hari ini (atau hari proyeksi terdekat) + status: belum main / berjalan / ✅ emas / medali lain / ✕ meleset | `proyeksi_medali` × `laporan_hasil` disahkan (cocok nama nomor, sisanya per cabor+tanggal) |
| **Arena** | Partai "Sedang main" + partai berikutnya dengan hitung mundur | `jadwal_partai` (diisi PIC/KONIDA/matriks) |
| Gap ke Puncak · **Pertarungan Peringkat** · Top Klasemen | Selisih dengan kontingen di atas/bawah, duel rival (Kota Bandung, Kab. Bekasi, Kab. Bogor, Kota Bekasi) | **klasemen resmi** (lihat di bawah) |
| Situasi Perolehan Emas | Proyeksi vs realisasi, per cabor tertinggal | `/api/konida/proyeksi-emas` |
| **Kalender Panas** | Emas diproyeksikan per hari, emas disahkan (✓), jumlah kegiatan; hari paling menentukan | proyeksi + jadwal kegiatan |
| **Peta Perjuangan** | Kota tempat cabor kita bertanding hari ini; merah berdenyut = ada partai sedang main | `jadwal_cabor` + `jadwal_partai` |
| **Kesehatan Operasi** | Laporan menunggu disahkan, catatan lapangan belum ditangani, cabor main hari ini + status PIC + sudah lapor/belum | `laporan_hasil`, `catatan_lapangan`, `lapor_akses` |
| **Detik Emas** | Layar penuh setiap medali BARU disahkan (emas 12 dtk, perak/perunggu 8 dtk), juga di atas Mode Layar | rekap lapangan (cek tiap 20 dtk) |
| Mode Layar (videotron) | 5 halaman berputar; halaman 5 = Misi emas + partai berikutnya | sama |

## Command Center — 3 monitor (1 Nov 2026)

Tiga alamat, satu per monitor landscape (login KONIDA di komputer monitor, buka alamat, tekan F11):

| Layar | Alamat | Isi |
|---|---|---|
| 1 · Posisi kita | `/konida/warroom/kabbandung/layar/1` | Peringkat besar, emas/perak/perunggu, garis menuju **target 74**, kalimat ringkas 30 detik, 8 besar klasemen + selisih ke atas/bawah |
| 2 · Hari ini, sekarang | `/konida/warroom/kabbandung/layar/2` | Arena (sedang main & berikutnya), Misi Emas, pita "hasil terbaru" (hanya yang disahkan) |
| 3 · Sebaran dan wajah | `/konida/warroom/kabbandung/layar/3` | Peta kota hari ini, peraih medali terbaru + foto, medali per cabor, (di luar Mode Kunjungan) baris operasi |

- **Detik Emas** tampil di ketiga layar. Data segar tiap 20 dtk; layar tidak tidur; kursor hilang saat diam; muat ulang sendiri tiap 4 jam.
- **Mode Kunjungan** (War Room → tombol **Command Center**, bisa dari HP): ucapan selamat datang di Layar 2, huruf lebih besar,
  data internal disembunyikan. Disimpan di tabel `command_center` (migrasi 065), audit `COMMAND_CENTER_UBAH`.
- Papan ketik: tombol 1/2/3 berpindah layar. Aturan & uji: `src/lib/command-center.ts`, `npm run uji:command-center`.

## Klasemen resmi — otomatis dari situs KONI Jabar (sejak 1 Nov 2026)

Angka 26 kontingen lain dibaca dari `porprov.konijabar.or.id/data/tally.json` (klasemen terverifikasi panitia) setiap kali
situs dibaca (Report Pertandingan dibuka / Layar 1 menyala, paling sering 15 menit sekali; cron 21.00 WIB). Perubahan
tercatat `KLASEMEN_RESMI_OTOMATIS`. Angka Kab. Bandung tetap dari laporan yang disahkan KONIDA. Input manual di bawah
tetap ada sebagai cadangan bila situs panitia bermasalah.

## Klasemen resmi (input manual — cadangan)

Angka 26 kontingen lain **tidak masuk otomatis**. Tim KONIDA mengetiknya dari klasemen resmi panitia:
War Room → kolom Pertarungan Peringkat → **Perbarui klasemen** → isi 🥇🥈🥉 → Simpan.
Hanya baris yang berubah yang disimpan; tercatat di `audit_logs` (`KLASEMEN_RESMI_UBAH`, sebelum/sesudah).
Angka Kab. Bandung otomatis memakai laporan lapangan yang disahkan. Akses: KONIDA Kab. Bandung + superadmin.
Rute: `GET/POST /api/konida/klasemen-resmi`. Bahan War Room: `GET /api/konida/warroom`.

## Catatan terbuka
- Target emas resmi = **74** (keputusan Bos 1 Nov 2026) = jumlah proyeksi emas KONI di `proyeksi_medali`; dipakai KPI,
  grafik, Mode Layar, dan Command Center. Angka 94 (berkas analisis) hanya cadangan bila proyeksi kosong.
- Tabel lama `hasil_pertandingan` (60 baris uji 9 Jun 2026, kontingen 4) dipakai modul operator Dayung/Pentathlon dan
  punya pemicu yang menulis `klasemen_medali`. Tidak disentuh; bila ada baris baru untuk kontingen 4, klasemen Kab. Bandung
  bisa tertimpa angka uji itu.
- Aturan & uji: `src/lib/warroom.ts`, `scripts/uji-warroom.ts`.
