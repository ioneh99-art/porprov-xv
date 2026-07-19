# Rencana Jenis 2 — Renovasi RLS (pindah tulisan browser → server)

Status: RANCANGAN (belum dieksekusi), 2026-07-19. Prasyarat: Jenis 1 & 3 + Fase A/B sudah selesai.

## Inti masalah
Hampir semua tabel punya policy tulis `public ... USING(true)` → siapa pun dengan anon key bisa **baca & tulis**. Ini karena app nulis langsung dari browser (tanpa Supabase Auth, DB tak tahu siapa penulis). Tabel `atlet` sudah ditutup (Fase B) sebagai contoh polanya. Jenis 2 = lakukan hal serupa untuk sisa tabel — **tapi cerdas**, karena tak semua butuh route server.

## Wawasan kunci: 2 jenis tabel, 2 penanganan
Tidak semua dari ~28 tabel butuh route server. Yang menentukan: **apakah browser BENAR-BENAR menulisnya?**

- **SAFE-TIGHTEN** — policy tulis terbuka TAPI browser tak pernah nulis (tulis lewat API service key, atau tak ada tulis). → cukup **hapus policy tulis** (aman, cepat, tinggal tes baca).
- **NEEDS-ROUTE** — browser aktif nulis. → **bikin route server dulu, repoint halaman, baru perketat** (pola Fase B).

Maka langkah 1 bukan ngoding, tapi **triase**.

---

## Inventaris tabel (dari pg_policies, 2026-07-19)
Dikelompokkan per sensitivitas — urutan garap dari paling sensitif:

### TIER 1 — Keuangan & tenancy 🔴 (paling kritis)
`tenants`, `invoices`, `invoice_items`, `atlet_accounts` (kosong)
> Ubah level/plan tenant & tagihan dari browser = bahaya bisnis. Prioritas #1.

### TIER 2 — Integritas kompetisi 🟠
`nomor_pertandingan`, `hasil_pertandingan`, `peserta_nomor`, `kualifikasi_atlet`, `kuota_kualifikasi`, `cabor_kuota`, `klasemen_medali`, `jadwal_pertandingan`, `klaster`, `event_info`
> Hasil/medali/nomor bisa diubah dari luar = kredibilitas pertandingan.

### TIER 3 — Data atlet pendukung 🟡
`atlet` (UPDATE — insert sudah ditutup), `atlet_dokumen`, `atlet_perlengkapan`, `riwayat_kejuaraan`, `riwayat_prestasi`, `rekam_performa`

### TIER 4 — Log/import/audit ⚪ (server-only seharusnya)
`atlet_data_quality_audit`, `import_historis`, `rekap_import_log`

### Mati (drop policy bareng cleanup)
`operator_cabor` (tabel legacy, sudah ditandai di Fase A)

---

## Fase eksekusi Jenis 2

### J2-0 · Triase (read-only, ~1 sesi)
Untuk tiap tabel di atas: tentukan penulisnya (browser-anon / API-service / tak ada) dengan sisir `'use client'` + grep `.from('<tabel>').(insert|update|delete|upsert)`. Output: 2 daftar — **SAFE-TIGHTEN** vs **NEEDS-ROUTE**. Tanpa ini, tebakan bisa mecahin app.

### J2-1 · Sweep SAFE-TIGHTEN (risiko rendah, ~1 sesi)
Drop policy tulis di tabel yang browser TAK nulis. Tes baca tiap tabel (jangan sampai halaman kosong). Kemungkinan besar melunasi separuh daftar sekali jalan. Termasuk drop policy `authenticated` yang mati + `operator_cabor`.

### J2-2 · Cluster TIER 1 Keuangan (sensitif, ~1 sesi)
Bikin route server utk tulis `tenants`/`invoices`/`invoice_items` (auth superadmin, service key, audit). `set-level` sudah ada — perluas. Repoint halaman superadmin. Drop policy tulis. Tes.

### J2-3 · Cluster TIER 2 Kompetisi (~1–2 sesi)
Route server utk hasil/nomor/kualifikasi/kuota/medali (auth operator/admin sesuai peran, service key, audit). Repoint halaman operator. Drop policy tulis. Tes per alur (input hasil, draw, kualifikasi).

### J2-4 · Cluster TIER 3 Data atlet (~1 sesi)
Route server utk dokumen/perlengkapan/riwayat + tutup `atlet` UPDATE. Repoint. Drop policy. Tes.

### J2-5 · TIER 4 Log + verifikasi akhir (~0.5 sesi)
Server-only untuk tabel log. Jalankan Supabase **security advisors** — pastikan tak ada lagi policy tulis `public true` selain yang disengaja. Dokumentasikan sisa.

---

## Prinsip & rambu
- **Pola per tabel = Fase B:** route server (service key + validasi + audit) → repoint halaman → drop policy tulis → **tes bukti** (anon ditolak, server sukses).
- **Baca (SELECT) anon DIPERTAHANKAN** di mana app perlu — hanya tulis yang dipindah.
- **App LIVE:** tes tiap perubahan (mint cookie HMAC), push = deploy. Bisa dijeda antar-cluster kapan saja.
- **Estimasi total:** ~5–7 sesi kerja. Incremental, tiap fase berdiri sendiri & aman di-pause.
- **Bukan** migrasi data — cuma pindah jalur tulis + perketat izin. Data lama tak disentuh.

## Kenapa ini "besar" tapi tidak menakutkan
Tiap cluster kecil & mandiri (persis Fase B yang barusan lancar). Yang bikin "besar" cuma **jumlah**-nya (~28 tabel), bukan kerumitan tiap langkah. Triase (J2-0) yang menentukan berapa banyak yang benar-benar butuh route vs cukup di-drop.
