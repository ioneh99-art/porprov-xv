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

## Klasemen resmi (wajib diisi tim KONIDA)

Angka 26 kontingen lain **tidak masuk otomatis**. Tim KONIDA mengetiknya dari klasemen resmi panitia:
War Room → kolom Pertarungan Peringkat → **Perbarui klasemen** → isi 🥇🥈🥉 → Simpan.
Hanya baris yang berubah yang disimpan; tercatat di `audit_logs` (`KLASEMEN_RESMI_UBAH`, sebelum/sesudah).
Angka Kab. Bandung otomatis memakai laporan lapangan yang disahkan. Akses: KONIDA Kab. Bandung + superadmin.
Rute: `GET/POST /api/konida/klasemen-resmi`. Bahan War Room: `GET /api/konida/warroom`.

## Catatan terbuka
- Target emas berbeda di dua tempat: KPI & grafik = **74** (proyeksi PPT KONI 16 Okt); Mode Layar halaman 1 = **94**
  ("target KONI" berkas analisis). Perlu satu angka resmi dari Bos.
- Tabel lama `hasil_pertandingan` (60 baris uji 9 Jun 2026, kontingen 4) dipakai modul operator Dayung/Pentathlon dan
  punya pemicu yang menulis `klasemen_medali`. Tidak disentuh; bila ada baris baru untuk kontingen 4, klasemen Kab. Bandung
  bisa tertimpa angka uji itu.
- Aturan & uji: `src/lib/warroom.ts`, `scripts/uji-warroom.ts`.
