# BRIEF FITUR — Rekonsiliasi Peserta + Intelijen Strategis (KONIDA Kab. Bandung)

**Dibuat:** 2026-07-19 (diperluas dari brief rekonsiliasi awal)
**Untuk:** Claude Code (VS Code), dijalankan di `/Users/bidang5/Documents/VScode/porprov`
**Supabase:** project `dkuonssfhkoqsdfpetsp` (Porprov, ACTIVE)
**Sifat:** brief pembangunan fitur — **tapi verifikasi & minta persetujuan sebelum menulis data produksi**
**Dasar:** uji kelayakan pencocokan data 2026-07-19 (angka nyata di §3)

> **Dua sumber, satu fitur.** Fitur ini mengonsumsi **dua file resmi** yang berbagi populasi atlet yang sama (peserta Kab. Bandung):
> - **File A — Rekapitulasi** (`REKAPITULASI JUMLAH ATLET KAB. BANDUNG 2026.xlsx`): siapa peserta resmi (674). → Bagian rekonsiliasi.
> - **File B — Analisis Strategis** (`1. ANALISIS ATLET KABUPATEN BANDUNG 2026 FIX.xlsx`): target medali per atlet, pesaing, analisis, target emas dua-lapis (Cabor 135 vs KONI 94). → Bagian intelijen (§5b, §8b), sumber data asli untuk dashboard KBAAS.
>
> Track A (rekonsiliasi) dan Track B (intelijen) **berbagi resolusi nama→`atlet_id` yang sama**. Kerjakan Track A dulu (menetapkan `atlet_id`), lalu Track B menempel data strategis ke `atlet_id` itu.

---

## 0. ATURAN MAIN (baca dulu, jangan dilewati)

1. **Semua impor & penulisan data WAJIB lewat API route sisi server memakai service key** — JANGAN tulis dari komponen klien/browser. Alasan: audit menemukan mayoritas mutasi di app ini terjadi langsung browser→PostgREST pakai anon key; fitur ini tidak boleh menambah pola itu.
2. **Non-destruktif secara default.** JANGAN ubah/hapus baris `atlet` yang sudah ada. Data rekonsiliasi masuk ke **tabel baru terpisah** (§5). Penanda "peserta resmi" bersifat turunan, bukan menimpa `status_registrasi`/`is_posted`.
3. **Confirm-before-write.** Impor jalan 2 tahap: (a) *dry-run* → tampilkan ringkasan yang AKAN terjadi; (b) tulis hanya setelah operator menekan konfirmasi. Bucket nama beda-ejaan TIDAK boleh ditulis otomatis — harus dikonfirmasi manusia.
4. **Verifikasi skema dulu.** Repo ini punya schema-drift (banyak tabel/kolom tidak ada di `src/app/migrations/`). Sebelum menulis kode, **cek nama kolom sungguhan** via Supabase MCP `list_tables` (verbose) untuk `atlet`, `kualifikasi_atlet`, `nomor_pertandingan`. Jangan percaya nama kolom di brief ini mentah-mentah — konfirmasi.
5. **Migration harus terdokumentasi.** Tabel baru dibuat lewat file migration di `src/app/migrations/` (lanjutkan penomoran, terakhir `017_`). Sertakan RLS yang benar (lihat §5), jangan `USING (true)`.
6. Kalau ada yang ambigu, tulis pertanyaannya dan berhenti — jangan menebak untuk keputusan yang menyentuh data peserta resmi.

---

## 1. TUJUAN

KONI Kab. Bandung mengirim file resmi `REKAPITULASI JUMLAH ATLET KAB. BANDUNG 2026.xlsx`. Aplikasi saat ini **tidak bisa membedakan** peserta PORPROV resmi dari kolam atlet:

- Database `kontingen_id=4` = **1.097 atlet**, semuanya berstatus final (989 Verified + 108 Posted), 0 Draft/Ditolak.
- Reviu resmi KONI = **674 peserta**.
- `kualifikasi_atlet` (tabel yang seharusnya mencatat "atlet ini bertanding di nomor X") praktis **kosong** — hanya 12 baris untuk Kab. Bandung.

Akibatnya: dashboard menampilkan 1.097, tanpa cara memisahkan mana 674 peserta resmi. KONI terpaksa membuat rekonsiliasi manual di Excel. **Fitur ini memindahkan pekerjaan itu ke dalam aplikasi.**

Fitur menghasilkan:
- **A. Laporan selisih** otomatis (siapa kelebihan, siapa tambahan, siapa hilang).
- **B. Penanda peserta resmi** per atlet, hasil pencocokan file resmi ↔ database.

---

## 2. SUMBER DATA — struktur file (sudah diverifikasi)

### 2A. File A — Rekapitulasi (untuk rekonsiliasi peserta)
3 sheet:

| Sheet | Isi | Kolom penting | Kunci |
|---|---|---|---|
| **ATLET** | 674 peserta hasil reviu resmi | NO, CABANG, NAMA, L/P, NOMOR PERTANDINGAN | **hanya nama** (tidak ada NIK) |
| **REKAPITULASI** | Rekap 58 cabor: Hasil Reviu vs Portal vs Selisih | agregat angka | — |
| **DATA PORTAL** | 956 baris ekspor portal | NO, CABOR, CABANG OLAHRAGA, NOMOR, **NAMA ATLET** | **NIK menempel di kolom nama** |

**Aturan parsing (penting):**
- Sheet **DATA PORTAL**, kolom "NAMA ATLET" berformat: `NAMA (GENDER/ NIK/CABOR)` — contoh `ALDI SEPTIANA (LAKI-LAKI/ 3204111309980008/AEROMODELLING)`. Ekstrak NIK dengan regex `\d{16}`, nama = teks sebelum `(`.
- Sheet **ATLET** hanya punya nama (+ nomor pertandingan). Untuk mendapat NIK-nya, harus dicocokkan by-nama ke sheet DATA PORTAL dulu.
- Normalisasi nama untuk pencocokan: uppercase, buang tanda baca/aksen, rapatkan spasi ganda.
- Baris header berbeda tiap sheet (ATLET data mulai baris ~5, REKAPITULASI baris ~5, DATA PORTAL baris ~4). Deteksi header, jangan hard-code offset buta.

### 2B. File B — Analisis Strategis (untuk intelijen / KBAAS)
`1. ANALISIS ATLET KABUPATEN BANDUNG 2026 FIX.xlsx` — 1 sheet ("Table 1"), 659 atlet, 69 cabang, 13 kolom. Data mulai baris ~5. **Tidak ada NIK** (nama-only, sama seperti sheet ATLET File A).

Kolom (indeks 0-based):
| Idx | Kolom | Isi | Terisi |
|---|---|---|---|
| 1 | CABANG | nama cabang (hanya di baris pertama tiap grup) | 69 grup |
| 4 | NAMA | nama atlet | 659 |
| 5 | L/P | gender | 659 |
| 6 | NOMOR PERTANDINGAN | teks nomor | — |
| 7 | CAPAIAN TERBAIK/TARGET | target medali + catatan capaian (**free-text kotor**) | 394 |
| 8 | PESAING | kontingen/atlet lawan | 272 |
| 9 | ANALISIS | teks analisis strategis | 142 |
| 10 | TARGET CABOR (EMAS) | target emas versi cabor (baris pertama grup) | per cabang |
| 11 | TARGET KONI (EMAS) | target emas versi KONI (baris pertama grup) | per cabang |
| 12 | PROBABILITY % | peluang target (baris pertama grup) | per cabang |

**Total target emas:** Cabor = **135**, KONI = **94**. Sebaran medali per-atlet ≈ EMAS 169 / PERAK 106 / PERUNGGU 78 / kosong 265.

**Aturan parsing khusus File B (WAJIB — kolom kotor):**
- Kolom **CAPAIAN/TARGET (idx 7)** campur aduk: `"EMAS"`, `"PERAK ( ADA POTENSI MERAIH EMAS )"`, `"EMAS, 260 KG"`, `"EMAS, 06.33.96"`, plus typo (`"EMASS"`, `"PEARAK"`). **Normalisasi jadi 2 field**: (a) `target_medali` enum → deteksi kata pertama yang cocok EMAS/PERAK/PERUNGGU dengan toleransi typo (fuzzy/startswith), sisanya `null`; (b) `capaian_catatan` = simpan teks mentah apa adanya. **Jangan buang teks mentah** — banyak berisi rekor/beban yang berguna.
- Kolom TARGET CABOR/KONI/PROBABILITY hanya terisi di **baris pertama tiap grup cabang** (merged-cell style) — propagasikan ke bawah dalam grup.
- Nama grup cabang punya spasi ganda (`"AQUATIK RENANG      PERAIRAN TERBUKA"`) — rapatkan.

---

## 3. HASIL UJI KELAYAKAN (dasar keputusan — sudah dijalankan)

**Jembatan andal — NIK (Portal ↔ DB `atlet.no_ktp` WHERE kontingen_id=4):**
- NIK portal unik: **951**
- Cocok di DB: **912 (96%)** ✅ siap otomasi
- Portal tapi tak ada di DB: 39
- DB tapi tak ada di portal: 185 (atlet masuk setelah ekspor — DB 1.097 > portal 956)

**Jembatan lemah — Nama (Reviu 674 ↔ Portal, untuk menempel NIK):**
- Cocok persis by nama: **485 (72%)**
- Beda ejaan (perlu fuzzy + konfirmasi manual): ~189
- Nama kembar/ambigu: **0** ✅ (tidak ada risiko salah orang)

**Implikasi desain:** rekonsiliasi Portal↔DB hampir penuh otomatis. Penetapan 674 peserta resmi otomatis ~70%, sisanya butuh **konfirmasi 1-klik** operator (bukan input manual penuh). Rancang UI dengan asumsi ini.

---

## 4. LINGKUP BERTAHAP

**Fase 1 (WAJIB) — Rekonsiliasi & Penanda Peserta** (File A)
Impor File A → cocokkan → laporan selisih → tandai peserta resmi. TIDAK menyentuh `nomor_pertandingan`.

**Fase 1b (WAJIB, sesudah Fase 1) — Impor Intelijen Strategis** (File B)
Impor File B → cocokkan nama ke `atlet_id` (pakai resolusi yang sama, lihat §7) → simpan target medali/pesaing/analisis per atlet + target emas dua-lapis per cabang (§5b). Menyalakan data asli untuk dashboard KBAAS (§8b). TIDAK menyentuh `atlet` maupun `nomor_pertandingan`.

**Fase 2 (OPSIONAL, jangan kerjakan dulu) — Tautkan ke Nomor Pertandingan**
Isi `kualifikasi_atlet` dari kolom "NOMOR PERTANDINGAN". Butuh pencocokan teks-nomor→`nomor_pertandingan.id` (fuzzy lagi) dan menyentuh alur kompetisi — pisahkan, minta keputusan owner dulu.

Brief ini fokus **Fase 1 + 1b**. Kerjakan berurutan: 1 dulu (menetapkan `atlet_id`), lalu 1b menempel data strategis ke `atlet_id` itu.

---

## 5. SKEMA DATA BARU (non-destruktif)

Buat migration baru (mis. `018_rekonsiliasi_peserta.sql`). Verifikasi tipe `atlet.id` (integer) dan `no_ktp` sebelum menulis FK.

```sql
-- Sesi impor (satu file = satu batch, bisa di-rollback logis)
CREATE TABLE rekonsiliasi_batch (
  id            BIGSERIAL PRIMARY KEY,
  kontingen_id  INTEGER NOT NULL,
  nama_file     TEXT,
  sumber        TEXT DEFAULT 'KONI',           -- asal dokumen
  total_reviu   INTEGER,                        -- 674
  total_portal  INTEGER,                        -- 956
  total_db      INTEGER,                        -- snapshot DB saat impor
  status        TEXT DEFAULT 'dry_run'          -- dry_run | confirmed
                CHECK (status IN ('dry_run','confirmed','dibatalkan')),
  dibuat_oleh   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Hasil pencocokan per baris (peserta resmi dari file)
CREATE TABLE rekonsiliasi_peserta (
  id             BIGSERIAL PRIMARY KEY,
  batch_id       BIGINT REFERENCES rekonsiliasi_batch(id) ON DELETE CASCADE,
  kontingen_id   INTEGER NOT NULL,
  -- data dari file
  nama_file      TEXT NOT NULL,                 -- nama di sheet reviu
  nik_file       TEXT,                          -- NIK dari portal (jika ketemu)
  cabang_file    TEXT,
  nomor_file     TEXT,                          -- teks nomor pertandingan (utk Fase 2)
  -- hasil cocok ke DB
  atlet_id       INTEGER REFERENCES atlet(id),  -- null jika tak ketemu
  match_method   TEXT CHECK (match_method IN ('nik','nama_exact','nama_fuzzy','manual','tidak_ketemu')),
  match_score    NUMERIC(4,3),                  -- kepercayaan fuzzy 0..1
  -- status peserta hasil rekonsiliasi
  status_peserta TEXT DEFAULT 'peserta_resmi'
                 CHECK (status_peserta IN ('peserta_resmi','perlu_konfirmasi','tidak_ketemu')),
  dikonfirmasi_oleh TEXT,
  dikonfirmasi_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (batch_id, nama_file, nik_file)
);

CREATE INDEX idx_rekon_peserta_atlet ON rekonsiliasi_peserta(atlet_id);
CREATE INDEX idx_rekon_peserta_batch ON rekonsiliasi_peserta(batch_id);
```

**Penanda peserta resmi = turunan**, bukan kolom baru di `atlet`: atlet dianggap "peserta PORPROV resmi" bila punya baris `rekonsiliasi_peserta` dengan `status_peserta='peserta_resmi'` di batch `confirmed` terbaru. Buat **view** untuk itu:

```sql
CREATE OR REPLACE VIEW v_peserta_resmi AS
SELECT DISTINCT rp.kontingen_id, rp.atlet_id
FROM rekonsiliasi_peserta rp
JOIN rekonsiliasi_batch rb ON rb.id = rp.batch_id
WHERE rb.status = 'confirmed'
  AND rp.status_peserta = 'peserta_resmi'
  AND rp.atlet_id IS NOT NULL;
```

**RLS:** aktifkan RLS di kedua tabel. JANGAN `USING (true)`. Karena app pakai auth custom (bukan Supabase Auth `auth.uid()`), penegakan otorisasi dilakukan di **API route** (cek sesi + role/kontingen). Untuk tabel ini set policy minimal: tolak akses anon; baca/tulis hanya lewat service key di server. (Ikuti pola route server yang sudah benar di repo, mis. yang membaca cookie sesi.)

## 5b. SKEMA DATA INTELIJEN (Fase 1b, File B — non-destruktif)

Tambahkan di migration yang sama (atau `019_intelijen_strategis.sql`). Semua non-destruktif; tidak menyentuh `atlet`.

```sql
-- Target strategis per atlet (dari File B)
CREATE TABLE intel_target_atlet (
  id              BIGSERIAL PRIMARY KEY,
  batch_id        BIGINT REFERENCES rekonsiliasi_batch(id) ON DELETE CASCADE,
  kontingen_id    INTEGER NOT NULL,
  atlet_id        INTEGER REFERENCES atlet(id),   -- null jika nama tak ketemu
  nama_file       TEXT NOT NULL,
  cabang_file     TEXT,
  target_medali   TEXT CHECK (target_medali IN ('emas','perak','perunggu') OR target_medali IS NULL),
  capaian_catatan TEXT,                            -- teks mentah kolom CAPAIAN/TARGET (jangan dibuang)
  pesaing         TEXT,
  analisis        TEXT,
  match_method    TEXT CHECK (match_method IN ('nik','nama_exact','nama_fuzzy','manual','tidak_ketemu')),
  match_score     NUMERIC(4,3),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (batch_id, nama_file, cabang_file)
);
CREATE INDEX idx_intel_target_atlet ON intel_target_atlet(atlet_id);

-- Target emas dua-lapis per cabang (dari File B, baris pertama tiap grup)
CREATE TABLE intel_target_cabang (
  id                 BIGSERIAL PRIMARY KEY,
  batch_id           BIGINT REFERENCES rekonsiliasi_batch(id) ON DELETE CASCADE,
  kontingen_id       INTEGER NOT NULL,
  cabang             TEXT NOT NULL,
  target_cabor_emas  NUMERIC(5,2),                 -- total 135
  target_koni_emas   NUMERIC(5,2),                 -- total 94
  probability        NUMERIC(5,2),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (batch_id, cabang)
);
```

**View ringkas untuk dashboard KBAAS:**
```sql
CREATE OR REPLACE VIEW v_kbaas_target_summary AS
SELECT ita.kontingen_id,
       COUNT(*) FILTER (WHERE target_medali='emas')     AS atlet_target_emas,
       COUNT(*) FILTER (WHERE target_medali='perak')    AS atlet_target_perak,
       COUNT(*) FILTER (WHERE target_medali='perunggu') AS atlet_target_perunggu,
       (SELECT SUM(target_cabor_emas) FROM intel_target_cabang c WHERE c.batch_id=ita.batch_id) AS total_target_cabor_emas,
       (SELECT SUM(target_koni_emas)  FROM intel_target_cabang c WHERE c.batch_id=ita.batch_id) AS total_target_koni_emas
FROM intel_target_atlet ita
JOIN rekonsiliasi_batch rb ON rb.id=ita.batch_id AND rb.status='confirmed'
GROUP BY ita.kontingen_id, ita.batch_id;
```

RLS: sama seperti §5 (tolak anon; akses lewat route server).

---

## 6. ARSITEKTUR

```
UI (operator, dashboard Kab. Bandung)
  │  upload .xlsx
  ▼
POST /api/rekonsiliasi/preview   ── parse + cocokkan + hitung, TIDAK menulis  → kembalikan ringkasan + daftar bucket
  │  (operator lihat, konfirmasi bucket fuzzy)
  ▼
POST /api/rekonsiliasi/commit    ── tulis batch + baris (service key)          → status='confirmed'
  ▼
GET  /api/rekonsiliasi/[batchId] ── laporan selisih & hasil
```

- Route WAJIB cek sesi & role di awal (lihat cara route lain membaca cookie `porprov_session`). Tolak kalau bukan operator/konida yang berhak atas kontingen tsb.
- Parsing Excel: pakai `xlsx` (sudah ada di `package.json`).
- Filter semua query ke `kontingen_id` milik pemanggil — jangan hard-code 4 (walau target awal Kab. Bandung, buat kontingen-aware).

---

## 7. ALGORITMA PENCOCOKAN (urutan prioritas)

Untuk tiap peserta di sheet ATLET (674):
1. Ambil NIK-nya via pencocokan nama exact ke sheet DATA PORTAL. Bila dapat NIK →
2. **Cocok NIK** ke `atlet.no_ktp` (kontingen sama) → `match_method='nik'`, `status='peserta_resmi'`. (≈70% jalur ini, presisi tinggi.)
3. Bila NIK tak ada / tak cocok → **cocok nama exact** langsung ke `atlet.nama_lengkap` (kontingen sama) → `nama_exact`.
4. Bila tetap gagal → **fuzzy nama** (mis. Levenshtein/token-sort ratio) → ambil kandidat terbaik dengan skor; tandai `status='perlu_konfirmasi'`, JANGAN auto-terima.
5. Bila tak ada kandidat memadai → `status='tidak_ketemu'`, `match_method='tidak_ketemu'`.

Untuk laporan selisih (Portal ↔ DB, murni NIK — sudah 96% bersih):
- **Kelebihan portal**: NIK portal ada, tapi atletnya TIDAK di daftar reviu 674 → kandidat "kolam, bukan peserta".
- **Tambahan pasca-ekspor**: atlet di DB, NIK tak ada di portal (≈185) → masuk setelah snapshot.
- **Hilang**: NIK portal tak ada di DB (≈39).
- **Anomali arah balik**: cabor yang di REKAPITULASI selisihnya negatif (mis. Hoki Outdoor −3).

### 7b. Pencocokan File B (Fase 1b) — REUSE, jangan bikin baru
File B tidak punya NIK (nama-only). **Manfaatkan hasil Fase 1**: untuk tiap baris File B, cocokkan nama ke peta `nama_norm → atlet_id` yang sudah dibangun Fase 1 (dari resolusi reviu+portal). Prioritas: (1) nama exact ke hasil Fase 1 → ambil `atlet_id`-nya; (2) nama exact ke `atlet.nama_lengkap`; (3) fuzzy → `perlu_konfirmasi`. Karena populasi File B ⊂ peserta resmi, sebagian besar sudah ter-resolve di Fase 1 — cocok-nya harus tinggi. Simpan `target_medali` (dinormalisasi) + `capaian_catatan` (mentah) + `pesaing` + `analisis`.

---

## 8. UI

Halaman baru di area KONIDA Kab. Bandung (ikuti struktur `src/app/konida/...` yang ada). Komponen:

1. **Upload & Preview** — drop file → panggil `/preview` → tampilkan kartu ringkasan: 674 reviu / 956 portal / 1.097 DB / cocok NIK 912 / perlu konfirmasi ~189.
2. **Panel Konfirmasi** — daftar `perlu_konfirmasi`: nama file ↔ kandidat DB terdekat + skor, tombol **Terima / Tolak / Cari manual**. Operator beres-in di sini.
3. **Laporan Selisih** — tab: Kelebihan / Tambahan / Hilang / Anomali per cabor. Bisa export.
4. **Tombol Commit** — aktif setelah konfirmasi selesai → `/commit`.
5. Setelah commit: dashboard bisa pakai `v_peserta_resmi` untuk menampilkan **"Peserta Resmi: 674"** terpisah dari **"Total Atlet: 1.097"**.

## 8b. UI INTELIJEN / KBAAS (Fase 1b)

Impor File B lewat alur `/preview` → `/commit` yang sama (deteksi jenis file dari struktur sheet, atau tcombol terpisah "Impor Analisis Strategis"). Setelah commit, tambahkan ke dashboard KBAAS Kab. Bandung:

1. **KPI target emas dua-lapis** — kartu besar: **Target Cabor 135 emas** vs **Target KONI 94 emas** (dari `v_kbaas_target_summary`), plus jumlah atlet per tier target (emas/perak/perunggu).
2. **Tabel proyeksi medali per atlet** — nama, cabang, target medali, pesaing, ringkasan analisis. Bisa filter per cabang / per tier.
3. **(opsional) Pembanding** — tempatkan target manusia ini berdampingan dengan proyeksi AI modul intel yang sudah ada (`intel/predictor`, KBAAS) sebagai patokan validasi. Jangan bangun ulang modul intel — cukup tampilkan angka File B sebagai "target resmi".

Catatan: `capaian_catatan` (teks mentah) berguna ditampilkan sebagai tooltip/detail — banyak berisi rekor/beban (mis. "667,5 KG", "06.33.96").

---

## 9. ACCEPTANCE CRITERIA

| # | Kriteria | Uji |
|---|---|---|
| 1 | Parse File A 3 sheet benar (674 / 956 baris, NIK terekstrak) | hitung = angka §3 |
| 2 | `/preview` tidak menulis apa pun ke DB | cek tak ada baris baru |
| 3 | Cocok NIK menghasilkan ~912 `match_method='nik'` | bandingkan uji kelayakan |
| 4 | Bucket `perlu_konfirmasi` ≈189, semua punya kandidat + skor | visual |
| 5 | Commit hanya jalan setelah konfirmasi & tekan tombol | coba commit tanpa konfirmasi → ditolak |
| 6 | `v_peserta_resmi` mengembalikan jumlah peserta resmi yang benar | count |
| 7 | Route menolak pemanggil tanpa sesi/role sah | test tanpa cookie |
| 8 | Tidak ada baris `atlet` yang berubah | diff sebelum/sesudah |
| 9 | RLS aktif, bukan `USING (true)` | cek `pg_policies` |
| 10 | Parse File B benar: 659 atlet, target emas Cabor=135 / KONI=94 | hitung = §2B |
| 11 | Normalisasi `target_medali`: typo (EMASS/PEARAK) tetap ke-map, `capaian_catatan` mentah tersimpan utuh | spot-check |
| 12 | `v_kbaas_target_summary` menampilkan 135 vs 94 emas | count |
| 13 | File B ter-cocok ke `atlet_id` reuse hasil Fase 1 (cocok tinggi) | rasio match |

---

## 10. YANG TIDAK BOLEH DILAKUKAN

- Jangan ubah/hapus baris `atlet`, `status_registrasi`, atau `is_posted`.
- Jangan menulis dari komponen klien; semua tulis lewat route server + service key.
- Jangan auto-terima hasil fuzzy tanpa konfirmasi manusia.
- Jangan kerjakan Fase 2 (tautan `nomor_pertandingan`) di brief ini.
- Jangan hard-code `kontingen_id=4`; ambil dari sesi.
- Jangan pakai `USING (true)` pada RLS tabel baru.
- **File B:** jangan buang teks mentah kolom CAPAIAN/TARGET; jangan bangun ulang modul intel/KBAAS yang sudah ada — cukup sediakan datanya.

---

## 11. LANGKAH EKSEKUSI YANG DISARANKAN

1. **Verifikasi skema** live (`list_tables` verbose: `atlet`, `kualifikasi_atlet`, `nomor_pertandingan`) — konfirmasi nama kolom sebelum menulis migration.
2. Tulis migration `018_rekonsiliasi_peserta.sql` (§5) + RLS.
3. Bangun parser Excel (server util) + fungsi pencocokan (§7) dengan unit test kecil pakai angka §3 sebagai oracle.
4. Route `/preview` (dry-run) dulu, buktikan tak menulis.
5. UI Upload + Preview + Panel Konfirmasi.
6. Route `/commit` + view `v_peserta_resmi`.
7. Sambungkan ke dashboard (dua angka terpisah).
8. Jalankan Acceptance Criteria §9 (item 1–9).
9. **Sebelum commit ke DB produksi pertama kali: tunjukkan ringkasan dry-run ke owner, minta persetujuan.**
10. **Fase 1b** (setelah Fase 1 lolos): migration §5b + parser File B (§2B, normalisasi kolom kotor) + cocok reuse (§7b) + dashboard KBAAS (§8b) + Acceptance item 10–13.

> Sumber resmi: `~/Downloads/REKAPITULASI JUMLAH ATLET KAB. BANDUNG 2026.xlsx` (File A) dan `~/Downloads/1. ANALISIS ATLET KABUPATEN BANDUNG 2026 FIX.xlsx` (File B). Uji kelayakan File A ada di sesi analisis; kalau butuh, minta owner.
