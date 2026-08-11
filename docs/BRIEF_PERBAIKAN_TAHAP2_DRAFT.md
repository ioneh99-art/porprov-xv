# BRIEF PERBAIKAN — TAHAP 2 (DRAF) — Tutup bocor PII `atlet` (NIK dkk)

> **Status: DRAF untuk direview owner. BELUM dieksekusi.**
> Fokus: **point 2** (tabel `atlet` anon-readable, mengandung NIK).
> **Point 1 (`users`) SENGAJA di-skip** atas keputusan owner — untuk brief terpisah nanti.
> Lanjutan dari Tahap 1 + 1.5 (lihat `HASIL_PERBAIKAN_TAHAP01.md`).

---

## §0 — ATURAN MAIN (wajib, sama seperti Tahap 1)
1. **Branch dulu**, jangan sentuh `main` langsung. 1 commit / langkah, **tidak borongan**.
2. **Uji tiap langkah** sebelum lanjut. Aplikasi LIVE, tak ada test otomatis.
3. **§0.3 — JANGAN cabut hak baca sebelum pembacanya dipindah.** Untuk tiap kolom/tabel yang mau dikunci: **pindahkan dulu** semua pembaca browser ke route server berpenjaga, **verifikasi halaman masih jalan**, BARU jalankan migrasi pencabutan.
4. Sesi/role/kontingen/cabor **selalu** dari `getServerSession()` (HMAC terverifikasi). Route server pakai **service key** (tembus RLS) + gerbang role — pola yang sama dgn Tahap 1.5.
5. **Jangan** pakai `USING(true)` di policy baru. **Jangan** tulis nilai rahasia ke commit/laporan.
6. **Berhenti & tunjukkan owner** sebelum merge. Smoke-test login asli dulu.

---

## §1 — TEMUAN ARSITEKTURAL (penentu strategi)
- **Tidak ada Supabase Auth.** Login = kartu HMAC sendiri (`getServerSession`). Dari sisi Postgres, **semua** baca browser = peran `anon`. RLS **tak bisa** membedakan operator sah vs penyusup.
- **Konsekuensi:** kunci-baris `atlet` = **69 halaman browser mati serentak**. Tidak layak untuk Tahap 2.
- **Skala terukur (recon 2026-08-11):**
  - `.from('atlet*')` di **69** file browser (`'use client'`).
  - Hanya **18** file yang baca **kolom sensitif** (NIK/no_ktp/no_kk/alamat/email/telepon/tempat/tanggal lahir).
  - **51** file sisanya cuma baca nama/cabor/skor/medali → **tidak perlu disentuh**.

## §2 — STRATEGI: kunci KOLOM sensitif, bukan BARIS
Cabut hak `SELECT` peran `anon` (dan `authenticated`) atas kolom PII `atlet`. Route server (service key) tetap baca penuh untuk admin/export sah.

**Skema nyata (dibaca dari DB 2026-08-11): 78 kolom. `anon` punya SELECT/INSERT/UPDATE atas SEMUA kolom.** (Tak ada kolom `nik`; ID kependudukan = `no_ktp`. Tgl lahir = `tgl_lahir`.)

**⚠ P0 TERPISAH — `atlet_password_hash` anon-readable.** Hash password portal atlet, kelas sama dgn Tahap 1c (`atlet_accounts`). 0 pembaca browser; pembaca server (`atlet/auth/login`, `atlet/register`) pakai service key. → **Dicabut lebih dulu, standalone, tanpa pindah halaman.**

**Kolom sensitif yang dikunci dari `anon`+`authenticated` (KEPUTUSAN OWNER: SETUJU 2026-08-11):**
- Kredensial: `atlet_password_hash`
- ID kependudukan: `no_ktp`, `no_kk`, `no_bpjs_kesehatan`, `no_bpjs_ketenagakerjaan`, `no_registrasi_koni`
- Keuangan: `nama_bank`, `no_rekening`, `nama_pemilik_rekening`, `cabang_bank`, `npwp`, `nama_npwp`
- Kontak/alamat rinci: `alamat`, `alamat_domisili`, `telepon`, `email`, `no_hp`, `no_hp_darurat`, `nama_kontak_darurat`, `kode_pos`, `kelurahan`, `kecamatan`
- Personal sensitif: `tempat_lahir`, `agama`, `gol_darah`, `faskes`

**TETAP publik (disengaja):** `nama_lengkap`, `gender`, `tgl_lahir` (utk hitung usia — keputusan owner poin 1), `provinsi`, `kota_kab`, `cabor_id`, `kontingen_id`, `nomor_peserta`, status/skor tes fisik, `foto_url`, `public_slug`.

**Catatan teknis penting (validasi saat eksekusi):**
- PostgREST expand `select('*')` sesuai hak-kolom peran → halaman `select('*')` **kemungkinan tetap jalan** (kolom terlarang hilang diam-diam, bukan error). **Wajib dicek per halaman** apakah ada fitur yang butuh kolom itu.
- Halaman yang **eksplisit** `select('nik'/'no_ktp'/...)` → **403 permission** → **harus** dipindah ke route server lebih dulu (§0.3).

## §3 — DAFTAR KERJA: 18 halaman baca-PII (pindah ke route server dulu)
```
src/app/konida/atlet/[id]/edit/page.tsx        (select '*', tulis juga → route server r/w)
src/app/konida/atlet/[id]/page.tsx
src/app/konida/dashboard/basic/page.tsx
src/app/konida/dashboard/bogor/page.tsx
src/app/konida/dashboard/kabbandung/page.tsx
src/app/konida/export/kabbandung/page.tsx      (export → server route + gate role)
src/app/konida/export/kabbogor/page.tsx
src/app/konida/laporan/kabbandung/page.tsx
src/app/konida/laporan/kabbogor/page.tsx
src/app/konida/lappertandingan/kabbandung/page.tsx
src/app/konida/lappertandingan/kabbogor/page.tsx
src/app/operator/dayung/data-gateway/page.tsx
src/app/operator/dayung/laporan/page.tsx
src/app/operator/pentathlon/laporan/page.tsx
src/app/superadmin/integrity/page.tsx
src/app/superadmin/verif/page.tsx
src/components/dashboard/DashboardBogor.tsx
src/components/dashboard/DashboardDefault.tsx
```
Pola pemindahan tiap halaman:
1. Buat/pakai route server `GET /api/atlet/detail` (atau `/api/atlet/export`) — `getServerSession` + gerbang role + **scoping kontingen dari sesi** (operator hanya kontingennya; pusat boleh sebut).
2. Ganti `supabase.from('atlet').select('nik'...)` di komponen jadi `fetch('/api/atlet/...')`.
3. Verifikasi halaman render sama seperti sebelumnya.

## §4 — URUTAN EKSEKUSI
0. **[QUICK WIN — aman segera] Cabut `atlet_password_hash` dari `anon`+`authenticated`.** 0 pembaca browser, server pakai service key. Migrasi kecil + rollback `GRANT`. Uji: login/register atlet asli tetap jalan; probe anon `?select=atlet_password_hash` → ditolak.
1. **Inventarisasi kolom** — ✅ dilakukan 2026-08-11 (skema 78 kolom, lihat §2). Cek tambahan: tabel turunan (`atlet_biomotor`, `atlet_tes_fisik`, `atlet_mutation_history`) apakah juga simpan PII → kunci bila perlu.
2. **Bangun route server** pembaca-PII (detail + export) — 1 commit, uji 4-kasus (anon 401, cookie palsu 401, role salah 403, sah lolos).
3. **Pindah 18 halaman** ke route itu — commit per halaman/kluster, verifikasi tiap halaman di browser.
4. **Grep bukti** — pastikan 0 sisa `.from('atlet').select(<kolom sensitif>)` di `'use client'`.
5. **Migrasi pencabutan** (nomor berikutnya, ≥ 040): `REVOKE SELECT (nik, no_ktp, no_kk, alamat, email, telepon) ON public.atlet FROM anon, authenticated;` + tabel turunan bila perlu. **Tanpa** `USING(true)`.
6. **Verifikasi pasca-migrasi**: 51 halaman non-sensitif tetap jalan; 18 halaman via server tetap tampil PII; probe anon langsung ke Supabase REST utk kolom nik → **ditolak**.
7. **Berhenti, smoke-test login asli, tunjukkan owner** sebelum merge.

## §5 — UJI & BUKTI
- **Probe kebocoran (sebelum vs sesudah):** `curl` REST Supabase pakai anon key `?select=nik&limit=1` → sebelum: data keluar; sesudah: **error/permission denied**.
- Tiap route server: anon 401, cookie palsu (`porprov_sig=BAD`) 401, role salah 403, role sah lolos.
- Regресi UI: buka 18 halaman + sampel 5 dari 51 halaman non-sensitif dengan login asli.

## §6 — ROLLBACK
- Migrasi pencabutan reversible: `GRANT SELECT (…) ON public.atlet TO anon;` (siapkan file `_rollback`).
- Semua di branch; tak merge sebelum owner ACC.

## §7 — DI LUAR LINGKUP TAHAP 2 (jangan dikerjakan)
- **Point 1 — `users` anon-readable** (`password_hash`): **di-skip** atas keputusan owner. Brief terpisah.
- **Kunci-baris penuh `atlet`** (anti-enumerasi baris): butuh **jembatan peran auth** (mint Supabase JWT ber-peran `authenticated` setelah login porprov, atau proxy semua baca lewat server). Perubahan arsitektur besar → **Tahap 3** terpisah.
- Tabel `atlet` kolom non-sensitif tetap anon-readable (disengaja, dipakai dashboard publik).

## §8 — KEPUTUSAN OWNER (SUDAH DIPUTUS 2026-08-11)
1. ✅ `tgl_lahir` **tetap publik** (usia jangan rusak); identitas-keras/keuangan/kontak **dikunci**.
2. ✅ Strategi **kunci-kolom** (Tahap 2); **kunci-baris ditunda ke Tahap 3**.
3. ✅ **Export massal PII** (unduh file berisi banyak NIK/rekening): **superadmin, koni_jabar, konida** saja. **Operator cabor**: boleh **lihat detail atlet kontingennya sendiri** (scoping via sesi), **tidak** boleh unduh dump massal.

→ Brief siap dieksekusi. Point 1 (`users`) tetap di luar lingkup.
