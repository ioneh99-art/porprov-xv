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

### ⚙️ CAKUPAN: MULTI-KONTINGEN (bukan Kab. Bandung saja)
Fitur ini **bukan** khusus Kab. Bandung — **kodenya kontingen-aware, jalan untuk semua kontingen**:
- Semua route ambil `kontingen_id` **dari sesi** (`s.kontingen_id`), diverifikasi tak ada hardcode `4`/`kabbandung`. Konida Kab. Bogor/Bekasi/Depok/dst yang login → dapat data kontingennya sendiri, unggah file mereka sendiri.
- Superadmin (tanpa kontingen) → boleh sebut `kontingen_id` via field.
- Halaman di jalur **umum** (`/konida/rekonsiliasi`, `/konida/intel`), bukan tenant-specific.
- **Yang Kab-Bandung-doang cuma DATA/analisisnya** (674/1097/19 hilang/5 emas + laporan Excel) — karena hanya file Kab. Bandung yang tersedia saat pembangunan.
- ⚠️ **Belum diuji dengan file kontingen LAIN** (belum ada filenya). Logika generik → seharusnya jalan. **Asumsi: file kontingen lain format sama** (template KONI: 3 sheet, NIK nempel di nama, header ter-merge). Kalau struktur beda, parser mungkin perlu penyesuaian kecil.

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

---

## 6. Tambahan 2026-10-11 — 19 atlet hilang: sudah masuk, tautannya dibetulkan

Ke-19 atlet "hilang" ternyata sudah ditambahkan ke tabel `atlet` pada 2026-09-08 (id 2955–2999, NIK cocok). Dua hal dibetulkan langsung di database (tanpa migration):

1. **Tautan cabor** — 44 atlet rombongan 8 Sep (id 2956–2999) punya `cabor_nama_raw` tapi `cabor_id` kosong. Diisi dari padanan nama persis di `cabang_olahraga` (tiap nama tepat satu padanan aktif).
   Batal: `update atlet set cabor_id = null where id between 2956 and 2999;`
2. **`rekonsiliasi_peserta`** — 18 baris diarahkan ke atlet yang benar berdasarkan NIK (`match_method='nik'`, `match_score=1`, `status_peserta='peserta_resmi'`). Hasil: peserta resmi 659, tidak ketemu 15.
   Nilai lama (rekon_id → atlet_id lama / metode / skor):
   - Dulu `tidak_ketemu`, atlet_id kosong: 105 (0.500), 110 (0.526), 113 (0.467), 154 (0.524), 165 (0.545), 276 (0.476), 586 (0.455), 694 (0.455)
   - Dulu `manual` ke orang lain: 95→2300 (0.727), 207→2262 (0.769), 237→2145 (0.600), 273→1785 (0.591), 274→1803 (0.556), 406→2771 (0.632), 555→2637 (0.571), 559→1863 (0.722), 613→2673 (0.563), 630→1841 (0.550)

3. **`intel_target_atlet`** — 9 baris dengan salah-taut yang sama diarahkan ke atlet yang benar (dicocokkan lewat nama + cabang file ke `rekonsiliasi_peserta`). Target emas Wandi dan Fikri Yansyah Akbar, serta perunggu Ramdhan Firmansyah, kini menempel ke orangnya sendiri.
   Nilai lama (intel_id → atlet_id lama): 733→2300, 845→2262, 875→2145, 911→1785, 912→1803, 1044→2771, 1193→2637, 1197→1863, 1252→1841.

## 7. Tambahan 2026-10-11 — Herlin Aprilin Lali, perunggu Asian Games 2026

Atlet Dayung Kab. Bandung (id 2096) tercantum di Rekap Medali Asian Games Kemenpora v.24092026: perunggu Canoe Sprint Women's Canoe Single 200m, 24 Sep 2026, 47.309. Dicocokkan lewat nama + provinsi + cabor (rekap tidak memuat NIK). Diinput manual atas perintah Bos:

- `riwayat_prestasi` id 105 (dossier Performance) dan `riwayat_kejuaraan` id 3 (menu Kejuaraan + halaman spotlight).
- Spotlight publik menyala: `/spotlight/herlin-aprilin-lali-2096`.

Batal:
```sql
update atlet set is_public=false, public_slug=null where id=2096;
delete from riwayat_kejuaraan where id=3;
delete from riwayat_prestasi where id=105;
```
