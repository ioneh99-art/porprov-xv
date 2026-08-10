# BRIEF PERBAIKAN — Tahap 0 + Tahap 1 (Tambalan Keamanan P0)

**Dibuat:** 2026-08-10
**Untuk:** Claude Code (VS Code), di `/Users/bidang5/Documents/VScode/porprov`
**Supabase:** project `dkuonssfhkoqsdfpetsp` (Porprov, ACTIVE)
**Sifat:** perbaikan keamanan berdampak-produksi — **verifikasi dulu, uji tiap langkah, jangan borongan**
**Dasar:** audit menyeluruh 2026-08-10 (verifikasi kode + policy DB langsung)

> Scope brief ini **hanya Tahap 0 + Tahap 1**. Tahap 2 (pindah baca browser→server 93 halaman) dan Tahap 3 (fork/test/migration) **JANGAN dikerjakan di sini** — beda brief, beda risiko.

---

## 0. ATURAN MAIN (wajib)

1. **Aplikasi ini LIVE dan TIDAK punya test.** Tidak ada jaring pengaman otomatis. Kerjakan satu langkah, uji, baru lanjut. Jangan gabung banyak perubahan dalam satu commit.
2. **Kerja di branch baru** (mis. `fix/keamanan-tahap-1`), bukan `main`.
3. **Verifikasi sebelum menutup akses.** Sebelum mencabut policy baca sebuah tabel, WAJIB buktikan tidak ada halaman browser yang membacanya (langkah verifikasi ada di tiap sub-tugas). Kalau ADA yang baca dari browser, **jangan tutup** — laporkan, itu masuk Tahap 2.
4. **Jangan tulis nilai rahasia** ke laporan/commit.
5. **Migration terdokumentasi:** perubahan RLS lewat file migration baru di `src/app/migrations/` (lanjutkan penomoran, terakhir `038_`). Sertakan komentar header + statement rollback.
6. **Jangan pakai `USING (true)`** pada policy baru.
7. Pola auth yang BENAR sudah ada: `getServerSession()` di `src/lib/guard.ts` (verifikasi HMAC). Tiru itu, jangan bikin mekanisme baru. **Jangan** pakai `getOperatorContext()` untuk otorisasi (tidak memverifikasi sesi).
8. Kalau ragu untuk keputusan yang menyentuh akses data, **berhenti dan tanya** — jangan menebak.

---

## TAHAP 0 — Persiapan

1. Buat branch `fix/keamanan-tahap-1`.
2. Pastikan Supabase PITR/backup aktif (cek dashboard; kalau tidak bisa, catat di laporan).
3. **Snapshot policy sekarang** untuk perbandingan sebelum/sesudah — jalankan & simpan hasilnya:
   ```sql
   SELECT tablename, cmd, roles::text, qual, with_check
   FROM pg_policies WHERE schemaname='public' ORDER BY tablename, cmd;
   ```

---

## TAHAP 1 — Tambalan P0

### 1a. Tutup 3 route tulis yang tanpa auth

**Masalah (terverifikasi):** route berikut mengekspor mutasi tanpa cek sesi, menulis pakai service key:
- `src/app/api/jadwal/route.ts` — POST (`:28`), PATCH (`:58`), DELETE (`:82`) ke `jadwal_pertandingan`
- `src/app/api/konida/pipeline-watch/route.ts` — POST (`:34`) insert `event_kejurnas_results`
- `src/app/api/konida/refresh-pesaing/route.ts` — POST (`:15`) update

**Perbaikan:** di awal tiap handler mutasi, panggil `getServerSession()`; tolak `401` bila tidak ada sesi sah, `403` bila role/kontingen tidak berhak. Tiru route yang sudah benar (mis. `src/app/api/operator/venue/route.ts:22,27`).

**Verifikasi:** setelah patch, panggil route tanpa cookie → harus `401`; dengan sesi sah → jalan normal. Cek tidak ada route mutasi lain yang terlewat: cari file di `src/app/api/**` yang mengekspor `POST/PUT/PATCH/DELETE` tapi tak menyebut `getServerSession`. Laporkan daftar lengkapnya (mungkin ada yang belum tercatat brief ini).

### 1b. Ganti penjaga palsu jadi penjaga terverifikasi

**Masalah:** route ini pakai `getOperatorContext()` (baca cookie/header mentah, tidak verifikasi HMAC, fallback permisif `tier:'CHAMPION'`/`Kab. Bogor`) untuk otorisasi:
- `src/app/api/content/highlights/route.ts:56` (POST, update `:138`)
- `src/app/api/content/press/route.ts:66` (POST)
- `src/app/api/intel/predictor/route.ts:21` (POST)

**Perbaikan:** ganti pemakaian `getOperatorContext()` **untuk keputusan otorisasi** jadi `getServerSession()`. Ambil `kontingen_id`/role dari sesi terverifikasi. (Kalau `getOperatorContext` cuma dipakai untuk tampilan non-sensitif, boleh tetap — tapi bukan untuk gate tulis.)

**Verifikasi:** panggil tanpa sesi → ditolak. Pastikan `kontingen_id` yang dipakai berasal dari sesi, bukan body/header.

### 1c. Tutup baca tabel KREDENSIAL untuk anon

**Masalah (terverifikasi via `pg_policies`):** tabel ini punya policy `FOR SELECT ... USING (true)` untuk role `public` → bisa dibaca siapa pun dengan anon key, **termasuk kolom `password_hash` dan NIK**:
- `users` — akun admin/operator + `password_hash`, role
- `atlet_accounts` — `password_hash` akun atlet

**Langkah WAJIB sebelum menutup (jangan lewati):**
1. Cari pembaca dari browser:
   ```
   grep -rn "from('users')\|from(\"users\")" src/app --include=*.tsx | grep -i "use client\|createClient" (dan telusuri file yang match)
   grep -rn "atlet_accounts" src/app --include=*.tsx
   ```
   Lebih tepat: cari komponen `'use client'` yang memanggil `.from('users')` / `.from('atlet_accounts')` via `createClient(anon)`.
2. **Kalau ADA pembaca browser** → JANGAN tutup, laporkan file-nya (kemungkinan perlu dipindah ke server dulu = Tahap 2). Login admin sendiri lewat `api/auth/login` (server, service key) — TIDAK terpengaruh.
3. **Kalau TIDAK ADA** → aman ditutup.

**Perbaikan (bila aman):** migration baru `039_tutup_baca_kredensial_anon.sql` yang `DROP POLICY` untuk policy SELECT-anon di `users` dan `atlet_accounts`. Karena akses sah ke tabel ini lewat service key (server), service key **bypass RLS** — jadi route server tetap jalan. Sertakan statement rollback di komentar.

**JANGAN sentuh `atlet` di tahap ini.** Tabel `atlet` punya policy SELECT publik `USING(true)` TAPI banyak halaman browser membacanya (NIK, dsb.) — menutupnya sekarang akan mematikan ~puluhan halaman. Itu Tahap 2. Cukup catat di laporan bahwa `atlet` (dan `atlet_biomotor`, `atlet_tes_fisik`, `atlet_mutation_history`) masih anon-readable dan menunggu Tahap 2.

**Verifikasi setelah tutup:**
- Query pakai anon key ke `users`/`atlet_accounts` → harus 0 baris / ditolak.
- Login admin & login atlet → masih jalan (lewat server).
- Jalankan ulang snapshot `pg_policies`, bandingkan dengan Tahap 0.

---

## ACCEPTANCE CRITERIA

| # | Kriteria | Uji |
|---|---|---|
| 1 | `api/jadwal` POST/PATCH/DELETE tolak tanpa sesi | panggil tanpa cookie → 401 |
| 2 | `pipeline-watch` & `refresh-pesaing` POST tolak tanpa sesi | 401 |
| 3 | `content/*` & `intel/predictor` pakai `getServerSession`, bukan `getOperatorContext` untuk gate | baca kode + tes tanpa sesi |
| 4 | Tidak ada route mutasi lain tanpa `getServerSession` yang terlewat | daftar hasil grep di laporan |
| 5 | `users` & `atlet_accounts` tak lagi terbaca anon | query anon → 0 baris |
| 6 | Login admin & atlet tetap berfungsi | tes login |
| 7 | `atlet` sengaja TIDAK diubah (ditunda ke Tahap 2) | konfirmasi di laporan |
| 8 | Fitur yang route-nya dipatch tetap jalan untuk user sah | smoke test |

---

## YANG TIDAK BOLEH

- Jangan tutup baca `atlet`/biomotor/tes_fisik (Tahap 2 — akan mematikan halaman browser).
- Jangan pindah 93 halaman ke server (Tahap 2).
- Jangan sentuh fork copy-paste / test / lokasi migration (Tahap 3).
- Jangan pakai `USING(true)` di policy baru.
- Jangan menutup akses tanpa langkah verifikasi 1c dulu.
- Jangan commit banyak perubahan sekaligus — pisah per sub-tugas (1a, 1b, 1c).

---

## URUTAN & PENUTUP

1. Tahap 0 (branch + snapshot policy).
2. 1a → uji → commit.
3. 1b → uji → commit.
4. 1c: verifikasi pembaca dulu → kalau aman, migration + uji → commit.
5. Tulis laporan singkat `docs/HASIL_PERBAIKAN_TAHAP01.md`: apa yang ditutup, apa yang ditunda ke Tahap 2 (daftar tabel anon-read tersisa + halaman yang membacanya), route mutasi lain yang ditemukan.
6. **BERHENTI setelah Tahap 1. Jangan lanjut Tahap 2** — tunjukkan laporan ke owner dulu.

> Sumber temuan: `docs/BRIEF_AUDIT_VERIFIKASI.md` + audit 2026-08-10. Kalau butuh konteks, tanya owner.
