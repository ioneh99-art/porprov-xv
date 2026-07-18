# ISTIMEWA vs porprov-admin — Benchmark & Gap Analysis

**Status:** 📋 Analisa awal (2026-07-17) · belum jadi scope terkunci
**Konteks:** ISTIMEWA = sistem GMS KONI Jabar (provinsi) buatan vendor, sedang diperiksa user sebagai auditor UAT untuk PORPROV XV 2026. porprov-admin = app milik user sendiri (multi-tenant, per kabupaten/kota — kabbandung, kabbogor, bekasi, depok, dayung). Dua proyek terpisah, level berbeda (provinsi vs kabupaten), tapi audit ISTIMEWA jadi cermin: apa yang harus ditiru, apa yang harus dihindari. Detail audit ISTIMEWA di memory `istimewa-koni-jabar-analysis`; laporan final `~/Downloads/Laporan_Pemeriksaan_ISTIMEWA_Revisi2.docx`.

## Temuan penting: porprov-admin sudah mereplikasi sebagian cacat P0/P1 ISTIMEWA — secara independen

Ini bukan sekadar analogi, tapi pola cacat struktural yang sama, ditemukan lewat eksplorasi kode langsung (2026-07-17):

| Cacat ISTIMEWA (vendor) | Cermin di porprov-admin | Status |
|---|---|---|
| Trigger poin di `event_athlete` (0 baris) → logika poin TIDAK AKTIF | `audit_logs` table ada (migration `003_audit_logs.sql`), dibaca di `superadmin/logs/page.tsx`, tapi **0 pemanggilan `.insert()`** ke tabel itu di seluruh app — audit trail umum sama sekali tidak berjalan | 🔴 Sama persis |
| RLS/kredensial longgar, 4 tabel user terpisah (gms_users, sportcore_users, jabarop_users, gms_users1) | RLS `audit_logs` masih `USING (true)` (komentar "sesuaikan dgn auth check superadmin" — belum dikerjakan); **2 credential store terpisah**: `users.password_hash` vs `atlet.atlet_password_hash`; JWT secret fallback hardcoded diulang di 6 file (nilai literal sengaja tidak ditulis di sini — grep `ATLET_JWT_SECRET` di kode) | 🔴 Pola sama (auth surface terfragmentasi), beda manifestasi |
| Schema drift: kode > DB, tabel warisan nyangkut, dump != realita | `kuota_kualifikasi` (dipakai aktif di `dashboard/kualifikasi` & `operator/kualifikasi`) dan kolom `atlet.atlet_password_hash` **tidak ada di 18 file migration manapun** — `000_initial_schema.sql` sendiri berlabel "inferred from application code", bukan sumber asli | 🔴 Sama persis |
| Tabel atlet dobel (`athlete` vs `athlete_core`) | 3 sistem kuota independen tidak terintegrasi: view SQL (`v_cabor_kuota_summary`) + duplikasi logika di TS (`kuota-helpers.ts`) + sistem kuota terpisah per-`nomor_pertandingan` (`kuota_kualifikasi`, tabel undocumented di atas) | 🔴 Sama persis |

**Kenapa ini penting:** kalau porprov-admin ini nanti juga di-UAT (oleh KONI, klien kabupaten, atau auditor eksternal), temuan di atas persis jenis yang bikin ISTIMEWA dapat status "DITERIMA BERSYARAT" bukan "DITERIMA". Ini cacat yang murah untuk diperbaiki sekarang, mahal kalau ketahuan pas audit.

## Apa yang layak ditiru dari ISTIMEWA (dibaca langsung dari source PHP asli, 2026-07-17)

Dibaca langsung dari `/Users/bidang5/Documents/PORPROV KONI/PORPROV KONI/include/classification_events.php` + `appsettings.php` (fungsi `getQuotaInfo()`) + `buttonhandler.php`. Aturan konkret, bukan cuma konsep:

### 1. Gerbang eligibilitas atlet (yang paling besar gap-nya)
Sebelum atlet boleh disahkan masuk ke suatu nomor pertandingan (`classification_events.php` `BeforeAdd`/`BeforeEdit`), ISTIMEWA cek berurutan:
1. **Fase pendaftaran/klasifikasi masih terbuka** (`isPhaseOpen()`) — porprov-admin **tidak punya konsep ini sama sekali** (tidak ketemu `fase_pendaftaran`/`registration_phase` di seluruh repo).
2. **Atlet sudah Verified** (`verification_status_id === 3`) sebelum boleh diklasifikasi ke nomor.
3. **Gender cocok** — `event_class_gender_id` vs `athlete.gender_id`, kecuali kategori campuran. Porprov-admin **sudah punya bahan** (`disiplin.gender` = L/P/MIXED, `atlet.gender` = L/P) tapi belum ada pengecekan silang di titik verifikasi/penugasan.
4. **Umur masuk rentang** — dihitung relatif ke **tanggal event** (bukan hari ini!), pakai `min_age`/`max_age` per nomor + basis kalkulasi (`event_opening_date` atau `event_end_year`). Porprov-admin tidak punya kolom umur min/maks di manapun — gap murni.
5. **`max_team_size`** — untuk kategori tim/pasangan/estafet, hitung atlet aktif (status bukan Rejected/Cancelled) per nomor+kontingen, tolak kalau sudah penuh. Porprov-admin tidak punya batas jumlah anggota per nomor (beda dari kuota kontingen keseluruhan).
6. **`max_event_class_per_athlete`** — batas berapa nomor yang boleh diikuti 1 atlet dalam satu disiplin. Tidak ada di porprov-admin.
7. **Kuota tersisa > 0** — lihat §2.

### 2. Empat skema kuota lewat SATU fungsi `getQuotaInfo()` (bukan sistem terpisah-pisah)
`discipline.quota_mode` memilih 1 dari 4 mode, tapi semuanya dihitung lewat satu fungsi: `bynumber_byname` (slot bernama per atlet per nomor — paling ketat), `byname` (alokasi per-atlet, presence-only, tidak dihitung sbg pool bersama), `bynumber` (pool angka bersama per nomor+kontingen — ini persis pola `kuota_kualifikasi` porprov-admin, tapi porprov-admin membuatnya sbg tabel undocumented terpisah, bukan mode dari satu sistem), `byquota` (pool global cabor+kontingen, split gender utk individual, gabung utk tim — **ini persis logika `v_cabor_kuota_summary` porprov-admin sekarang**, cuma belum diberi nama/status "mode #1 dari beberapa mode yang sah").
**Insight kunci:** porprov-admin sebenarnya sudah membangun 2 dari 4 mode ISTIMEWA (byquota via view, bynumber via tabel drift) — cuma dibangun sbg 2 sistem terpisah yang tidak sadar satu sama lain, bukan 1 sistem dgn field mode. Menyatukannya bukan membangun dari nol.

### 3. Gerbang "posted" — porprov-admin TERNYATA SUDAH PUNYA, dan sudah benar
ISTIMEWA punya staging table `athlete_core` (belum final) vs `athlete` (live, sudah "posted") — supaya kuota/laporan tidak pernah menghitung atlet yang belum kelar diverifikasi. **Porprov-admin sudah punya pola yang sama**: kolom `atlet.is_posted` (`000_initial_schema.sql:129`), di-set `true` lewat aksi "posting" di `api/verifikasi/route.ts:79`, dan `v_cabor_kuota_summary` sudah benar memfilter `status_registrasi IN ('Verified','Posted')` saja (`002_cabor_kuota.sql:63-71`). **Ini kekuatan yang sudah dimiliki, bukan gap** — pertahankan.
**Tapi**: `kuota_kualifikasi` (sistem kuota #3 yang undocumented) **tidak ketemu filter status apapun** saat digrep — kemungkinan besar dia menghitung SEMUA atlet termasuk yang belum Verified, jadi lubang kuota-safety yang sudah dihindari sistem #1 tapi bocor di sistem #3.

### 4. Aturan integritas kompetisi: minimal 4 kontingen per nomor
Laporan ringkasan klasifikasi ISTIMEWA menandai `⚠️ < 4` untuk nomor yang diikuti kurang dari 4 kontingen (indikasi nomor tidak kompetitif/perlu ditinjau). Ini relevan di level **superadmin lintas-tenant** porprov-admin (tiap tenant kabupaten cuma lihat kontingennya sendiri) — prioritas rendah, butuh verifikasi dulu apakah `nomor_pertandingan` sudah konsisten ID-nya lintas kontingen (belum dicek).

## Roadmap perbaikan (diurutkan by risiko)

### P0 — tutup cacat yang mencerminkan temuan P0/P1 ISTIMEWA
- [ ] Nyalakan `audit_logs`: tambah `.insert()` di semua mutation endpoint admin/operator, atau hapus modulnya kalau tidak akan dikerjakan (jangan biarkan UI "logs" menampilkan tabel kosong selamanya)
- [ ] Ketatkan RLS `audit_logs` — ganti `USING (true)` jadi cek role superadmin
- [ ] Hapus hardcoded JWT secret fallback (6 file) — wajibkan `ATLET_JWT_SECRET` di env, fail-fast kalau kosong
- [ ] Hapus plaintext-password auto-migrate fallback di `src/lib/auth.ts:21-37` (indikasi ada password plaintext legacy — audit dulu, migrasi paksa, baru cabut fallback-nya)
- [ ] Tulis migration retroaktif untuk `kuota_kualifikasi`, kolom `atlet.atlet_password_hash`, **dan tabel `nomor_pertandingan` sendiri** (dipakai aktif di 8 file migration lain sbg referensi tapi tidak pernah ada `CREATE TABLE`-nya di manapun — termasuk di `000_initial_schema.sql` yg katanya "baseline") supaya schema-as-code = realita DB

### P1 — adopsi kekuatan ISTIMEWA (gap fitur nyata, urutan disarankan)
- [ ] **P1a — Gender-match gate (paling murah, langsung bisa)**: tolak/warn di `api/verifikasi/route.ts` saat transisi ke `Verified` kalau `disiplin.gender` bukan `MIXED` dan `atlet.gender` tidak cocok. Tidak perlu migration baru — kedua kolom sudah ada.
- [ ] **P1b — Tutup lubang kuota-safety di `kuota_kualifikasi`**: tambah filter `status_registrasi IN ('Verified','Posted')` di query sistem kuota #3 (samakan dengan pola yang sudah benar di `v_cabor_kuota_summary`), sekalian bikin migration retroaktif utk tabel ini (gabung dgn item P0 di atas).
- [ ] **P1c — Batas umur per nomor**: migration baru tambah `usia_min`/`usia_maks` (INT, nullable=tanpa batas) ke tabel nomor pertandingan + kolom acuan tanggal event (mis. `kejuaraan.tanggal_mulai` PORPROV XV 2026) supaya umur dihitung relatif ke tanggal event, bukan hari ini — cek di titik verifikasi.
- [ ] **P1d — Batas anggota tim per nomor (`max_team_size`)**: kolom baru di tabel nomor pertandingan utk kategori tim/pasangan/estafet + hitung atlet aktif (Verified/Posted) per nomor+kontingen sebelum entry baru diterima.
- [ ] **P1e — Konsolidasi kuota jadi 1 sistem bermode**: tambah kolom `quota_mode` (`byquota`/`bynumber`) ke `cabor_master`/`disiplin`; satu RPC/view yang bercabang per mode (persis pola `getQuotaInfo()`), pensiunkan duplikasi matematika di `kuota-helpers.ts`, `kuota_kualifikasi` jadi implementasi mode `bynumber` yang terdokumentasi — bukan tabel drift.
- [ ] **P1f — Fase pendaftaran/verifikasi**: kalau PORPROV XV 2026 makin dekat, pertimbangkan gerbang `isPhaseOpen()`-style (tabel `fase_kompetisi` dgn tanggal buka/tutup per tahap) supaya verifikasi tidak bisa diubah setelah cut-off — saat ini tidak ada penguncian waktu sama sekali.
- [ ] P1g (opsional, rendah prioritas) — laporan minimal-4-kontingen-per-nomor di level superadmin lintas tenant, kalau `nomor_pertandingan` sudah konsisten ID-nya lintas kontingen (belum diverifikasi).

### P2 — polish
- [ ] Tombol "Lupa password?" (`konida/login/bekasi/page.tsx:236`) — implementasikan atau hapus, jangan biarkan dead UI
- [ ] Evaluasi apakah `atlet_password_hash` sebaiknya tetap di tabel `atlet` (self-service login by NIK) atau dipindah ke `users` — putuskan sekali, dokumentasikan alasannya, supaya tidak jadi "tabel user dobel" versi porprov-admin

## Yang TIDAK perlu ditiru dari ISTIMEWA
Kompleksitas provinsi (rebrand berkali jabarop→gms→sportcore, 4 tabel user duplikat, dump kredensial di PDF) adalah gejala proyek vendor yang lepas kendali — bukan pola arsitektur yang layak dikejar. porprov-admin sudah lebih rapi di titik ini (single tenant model per kabupaten, tidak ada kredensial bocor di file ter-track); jaga itu, jangan ikut menambah tabel/kredensial paralel demi "menambah fitur cepat".
