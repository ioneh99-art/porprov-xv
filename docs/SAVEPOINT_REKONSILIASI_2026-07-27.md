# SAVEPOINT — Fitur Rekonsiliasi Peserta + Intelijen Strategis (KBAAS)
**Tanggal:** 2026-07-27 · **Status:** ter-deploy ke `main` · **Sisa:** smoke-test pakai akun asli
**Dasar:** `docs/BRIEF_FITUR_REKONSILIASI.md` (Fase 1 + 1b) · **Commit:** `a99e6d0` → `8cc03d7`

Dokumen ini: (1) apa yang dibangun, (2) **panduan mencoba langkah-per-langkah**, (3) sisa.

---

## 1. Apa yang dibangun

### Fase 1 — Rekonsiliasi Peserta Resmi
Memisahkan **674 peserta resmi** (file KONI) dari **1.097 kolam atlet** (database). Sebelumnya dashboard cuma bisa lihat 1.097, tak bisa bedakan mana peserta resmi.
- **Migration 037**: `rekonsiliasi_batch`, `rekonsiliasi_peserta`, view `v_peserta_resmi` (RLS aktif tanpa policy = service-only).
- **Util** `src/lib/rekonsiliasi.ts`: parser 3-sheet + cocok **NIK → nama-exact → fuzzy**.
- **Route**: `/api/rekonsiliasi/preview` (dry-run 0 tulis), `/commit` (confirm-before-write), `/[batchId]` (laporan), `/status` (2-angka).
- **Halaman** `/konida/rekonsiliasi`: upload → preview → **panel konfirmasi bertingkat A/B/C + tombol borong** → simpan.

### Fase 1b — Intelijen Strategis / Dashboard KBAAS
Impor file Analisis KONI → target medali per atlet + **target emas dua-lapis Cabor 135 vs KONI 94**.
- **Migration 038**: `intel_target_atlet`, `intel_target_cabang`, view `v_kbaas_target_summary` (RLS service-only).
- **Util** `src/lib/intel.ts`: parser File B (normalisasi kolom kotor EMAS/PERAK + typo, `capaian_catatan` mentah disimpan) + cocok nama **reuse `atlet_id` Fase 1**.
- **Route**: `/api/rekonsiliasi/preview-intel`, `/commit-intel`, `/kbaas`.
- **Halaman** `/konida/intel`: dashboard target emas 135/94 + proyeksi medali per atlet + impor bertingkat.

### Prinsip (dari brief §0 — dipatuhi semua)
Semua tulis lewat **route server + service key** (bukan browser) · **non-destruktif** (tak sentuh `atlet`) · **confirm-before-write** · **kontingen dari sesi** (bukan hardcode 4) · **RLS bukan `USING(true)`**.

---

## 2. 🧪 PANDUAN MENCOBA (langkah-per-langkah, pakai akun asli)

> Semua sudah teruji pakai cookie buatan. Ini smoke-test terakhir pakai login **konida Kab. Bandung asli**.

### A. Coba Rekonsiliasi Peserta (Fase 1)
1. **Login** sebagai konida Kab. Bandung → buka **`/konida/rekonsiliasi`**.
2. Klik area unggah → pilih **`REKAPITULASI JUMLAH ATLET KAB. BANDUNG 2026.xlsx`** (di ~/Downloads).
3. Tunggu **preview** muncul. Cek kartu ringkasan harus:
   - Reviu **674** · Portal **956** · Total DB **1.097** · Cocok otomatis **~478**.
   - Kartu selisih: Kolam / Tambahan pasca-ekspor **185** / Hilang **39**.
4. Di **Panel Konfirmasi** (171 baris): klik **"Terima Tier A (72)"**, lalu **"Terima Tier B (25)"**, lalu **"Terima Tier C (74)"** (konfirmasi dialog). Sekarang "perlu konfirmasi" = 0.
5. Lihat kotak merah **"Peserta resmi belum ada di database (9)"** — ini temuan (5 harapan emas). Catat/tindaklanjuti.
6. Klik **"Simpan Rekonsiliasi"** → muncul "Rekonsiliasi tersimpan, N peserta resmi".
7. Refresh → kartu **"Peserta Resmi vs Total Atlet"** muncul di atas.
   - ✅ **Berhasil** kalau angka peserta resmi ≈ 665 (674 − 9 hilang) tersimpan.

### B. Coba Intelijen Strategis / KBAAS (Fase 1b)
1. Buka **`/konida/intel`**.
2. Klik **"Impor file Analisis Strategis"** → pilih **`1. ANALISIS ATLET KABUPATEN BANDUNG 2026 FIX.xlsx`**.
3. Cek preview: **Cabor emas 135 · KONI emas 94 · Atlet 658 · Cocok ~466**.
4. Selesaikan konfirmasi nama (tombol borong A/B/C), lalu **"Simpan Analisis Strategis"**.
5. Dashboard muncul: kartu emas **Cabor 135 / KONI 94** + jumlah atlet per target + **tabel proyeksi per atlet** (nama, cabang, target, pesaing).
   - ✅ **Berhasil** kalau kartu 135/94 tampil + tabel terisi.

### C. Kalau ada yang aneh
Catat: **halaman apa · langkah ke berapa · pesan error apa (kalau ada)** → kasih ke sesi berikutnya, langsung didiagnosa. Data lama **aman** (fitur non-destruktif — tak ada baris `atlet` yang berubah).

---

## 3. Hasil review data (sudah dikonfirmasi Komandan)
```
674 peserta resmi
├─ 478 cocok otomatis (NIK + nama persis)
├─ 171 dikonfirmasi sama (beda ejaan/mungkin/ragu — dijamin Komandan)
└─  25 sisa → 19 belum di DB (5 EMAS!) + ~6 nama panggilan (dikonfirmasi via File B)
```
**19 peserta hilang dari DB** = semua benar-benar hilang (0 mutasi lintas-kontingen). **5 harapan emas**: Angel Manarisip (Berkuda), Bahana Ronni (Basket 3x3), Rizki (Sambo), + Wandi & Fikri Yansyah (perlu cek NIK). File B mengonfirmasi ke-20 nama ambigu = atlet asli.

**5 laporan Excel di `~/Downloads/`:** Ketidakcocokan · BedaEjaan · SisaBelumKetemu · SisaAkhir · **DAFTAR_Atlet_Peserta_Hilang_dari_DB** (dengan NIK + target medali).

---

## 4. Sisa pekerjaan
| Item | Prioritas |
|---|---|
| **Smoke-test pakai akun asli** (§2 di atas) | 🔴 Tinggi |
| **Tambahkan 19 atlet hilang ke DB** (mulai 5 harapan emas) — pakai gerbang `/api/atlet/create` | 🟠 Sedang |
| Hookup 2-angka ke dashboard utama kabbandung (route `/api/rekonsiliasi/status` sudah siap; dashboard 1297 baris, disisipkan hati-hati) | 🟢 Opsional |
| **Fase 2** (tautkan ke `nomor_pertandingan` via `kualifikasi_atlet`) — brief §4, belum dikerjakan | 🟢 Opsional, minta keputusan dulu |

---

## 5. Catatan teknis
- Migration `037`, `038` (applied live). Semua route self-guard (getServerSession) → tak butuh middleware matcher.
- Parser: sheet ATLET/File B header **ter-merge** — nama diambil dari kolom sebelum "L/P"; footer disaring via wajib-gender-L/P.
- **BUG File B DIBETULKAN**: target Cabor tadinya 144 (carry-over antar-grup) → dibaca hanya saat grup mulai → **135 pas**.
- Cocok nama: NIK (jangkar), lalu nama-exact, lalu fuzzy (Levenshtein + token-sort). Ambang panel konfirmasi 0.55; UI menggolongkan A(≥0.90)/B/C.
- Detail juga di memori `rekap-atlet-kabbandung-2026` & `analisis-strategis-kabbandung-2026`.

**Semua di branch `main`, ter-deploy. Aman berhenti di sini.** 🎯
