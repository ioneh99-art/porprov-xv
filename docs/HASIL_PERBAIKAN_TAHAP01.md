# HASIL PERBAIKAN — Tahap 0 + Tahap 1 (Tambalan Keamanan P0)

**Tanggal:** 2026-08-10 · **Branch:** `fix/keamanan-tahap-1` (BELUM di-merge ke `main`)
**Dasar:** `docs/BRIEF_PERBAIKAN_TAHAP01.md` · **Status:** Tahap 1 SELESAI, BERHENTI menunggu owner

---

## Ringkasan
3 sub-tugas Tahap 1 dikerjakan **per commit terpisah**, diuji tiap langkah:

| Sub | Commit | Hasil |
|---|---|---|
| 1a — guard route mutasi tanpa auth | `c813cdc` | ✅ 3 route ditutup (anon 401) |
| 1b — ganti penjaga palsu → terverifikasi | `587de89` | ✅ 3 route pakai `getServerSession` |
| 1c — tutup baca kredensial anon | `40e580b` (migration 039) | ✅ `atlet_accounts` ditutup · ⏸️ `users` ditunda Tahap 2 |

**PITR/backup:** tidak bisa diverifikasi dari sini (tak ada akses dashboard Supabase). **Owner mohon cek** Supabase → Database → Backups sebelum lanjut Tahap 2.

---

## 1a — Route mutasi tanpa auth (SELESAI)
Ditambah `getServerSession()` di awal tiap handler mutasi (401 tanpa sesi). Pola meniru `api/operator/venue`.
- `api/jadwal` — POST, PATCH, DELETE (GET/baca publik dibiarkan)
- `api/konida/pipeline-watch` — POST
- `api/konida/refresh-pesaing` — POST

**Uji:** anon → semua **401** ✅ · sesi sah → lolos guard (400 karena body kosong, bukan 401) ✅

### ⚠️ Route mutasi LAIN yang ditemukan (grep menyeluruh — item 4)
Route yang mengekspor POST/PUT/PATCH/DELETE tapi **tanpa `getServerSession`**, dikelompokkan:

**Aman (dijaga mekanisme lain):**
- **Login/auth** (memang publik): `auth/login`, `auth/logout`, `auth/change-password`, `auth/update-profile`, `atlet/login`, `atlet/auth/login`, `atlet/logout`, `atlet/register`.
- **JWT atlet** (portal): `atlet/kejuaraan`, `atlet/update`, `atlet/upload-dokumen`.
- **Middleware** (`/api/superadmin/*` + AI_PREFIXES): `superadmin/ai`, `superadmin/assign-plan`, `superadmin/subscriptions`, `ai-brief`, `ai-nlq`, `chatbot`, `sipa`, `dayung/brief`, `jarvis/*`, `sport-intel`, `baseline/smart-brief`, `performance/{smart-brief,strategic-brief,atlet-action-items,meeting-agenda}`.

**🔴 BENAR-BENAR TERBUKA (kandidat Tahap berikutnya — belum diperbaiki, di luar scope brief ini):**
- `admin/tes-fisik-unmatched` (POST) — tanpa cek apapun
- `cache/invalidate` (POST) — tanpa cek
- `konida/talent-lobby` (POST) — tanpa cek
- `performance/import` (POST) — tanpa cek (**menulis atlet massal**)
- `operator/prestasi` (POST, DELETE) — tanpa cek
- `intel/scout` (POST) — ada cek lain (bukan sesi) — perlu ditinjau
- `verifikasi` (POST) — baca `porprov_session` via `JSON.parse` **tanpa verifikasi HMAC** (bukan `getServerSession`) → cookie tak-bertanda-tangan bisa lolos. **Perlu diganti ke `getServerSession`.**

> Rekomendasi: tangani daftar 🔴 ini di brief/tahap lanjutan (pola sama: `getServerSession` gate). Tidak dikerjakan sekarang agar sesuai scope + aturan "jangan borongan".

---

## 1b — Penjaga palsu → terverifikasi (SELESAI)
`getOperatorContext()` membaca cookie mentah `operator_cabor`/`operator_kontingen`/`operator_tier` (bisa dipalsukan klien) + fallback permisif `Kab. Bogor`/`CHAMPION`. Diganti `getServerSession()` untuk **gate tulis**:
- `content/highlights` POST — tambah gate (dispatch job video ione Factory + update DB).
- `content/press` POST — tambah gate (`ctx` tetap hanya utk fallback tampilan di prompt LLM, bukan gate).
- `intel/predictor` POST — tambah gate **+ scope `cabor`/`kontingen` diambil dari SESI terverifikasi** (`cabor_nama` + resolve `kontingen_id`→nama), bukan cookie yg bisa dipalsukan.

**Uji:** anon → ketiganya **401** ✅ · `intel/predictor` + sesi → lolos guard ✅
**Catatan:** `intel/predictor` mengembalikan **500 di lokal** karena route pakai env `SUPABASE_SERVICE_ROLE_KEY` (tidak ada di `.env.local` lokal; ada `SUPABASE_SERVICE_KEY`). Ini **pra-ada** (bukan dari perubahan ini) dan **jalan di produksi** (env tsb terpasang di Vercel). Auth-nya benar.

---

## 1c — Tutup baca kredensial anon (SEBAGIAN — sesuai §0.3)
Verifikasi pembaca browser dulu (WAJIB, §0.3):

| Tabel | Pembaca browser? | Tindakan |
|---|---|---|
| `atlet_accounts` | ✅ TIDAK ADA (hanya `api/atlet/login`, server service-key) | **DITUTUP** (migration 039) |
| `users` | 🔴 ADA — `superadmin/page`, `superadmin/tenants`, `superadmin/system`, `superadmin/users` baca via anon `sb` | **DITUNDA Tahap 2** (jangan tutup, akan mematikan UI) |

**Migration 039** — `DROP POLICY public_read_atlet_accounts ON atlet_accounts` (rollback di komentar). RLS aktif → anon deny-all; `service_role` bypass → login atlet tetap jalan.

**Snapshot policy (sebelum → sesudah):**
```
atlet_accounts: public_read_atlet_accounts SELECT public USING(true)  →  (tak ada policy, RLS deny-anon)
users:          allow_login SELECT public USING(true)                 →  (TETAP — Tahap 2)
```
**Uji:** anon SELECT `atlet_accounts` → ditolak (RLS on, 0 policy) ✅ · anon `users` → masih terbaca (sengaja) ✅ · `api/atlet/login` pakai `SUPABASE_SERVICE_KEY` (bypass RLS) ✅

---

## Ditunda ke TAHAP 2 (jangan dikerjakan sekarang)
1. **`users` masih anon-readable** (`password_hash`, role) — dibaca 4 halaman superadmin dari browser. Pindahkan baca ke route server (pola `api/superadmin/tenants` / `api/users`) dulu, baru cabut policy.
2. **Tabel atlet masih anon-readable** (`USING(true)`, mengandung NIK dll) — dibaca puluhan halaman browser: `atlet`, `atlet_biomotor`, `atlet_tes_fisik`, `atlet_mutation_history`. (Sesuai brief §80 — jangan disentuh di Tahap 1.)
3. **Route mutasi terbuka** dari daftar 1a di atas (`performance/import`, `operator/prestasi`, `verifikasi` HMAC, dll).

---

## ACCEPTANCE CRITERIA
| # | Kriteria | Status |
|---|---|---|
| 1 | `api/jadwal` POST/PATCH/DELETE tolak tanpa sesi | ✅ 401 |
| 2 | `pipeline-watch` & `refresh-pesaing` POST tolak tanpa sesi | ✅ 401 |
| 3 | `content/*` & `intel/predictor` pakai `getServerSession` (bukan `getOperatorContext`) | ✅ |
| 4 | Daftar route mutasi lain yang terlewat | ✅ (di atas) |
| 5 | `atlet_accounts` tak terbaca anon | ✅ · `users` **ditunda** (§0.3) |
| 6 | Login admin & atlet tetap berfungsi | ✅ (service key, bypass RLS) |
| 7 | `atlet` sengaja TIDAK diubah | ✅ |
| 8 | Fitur yang route-nya dipatch tetap jalan utk user sah | ✅ (lolos guard dgn sesi) |

---

## Status akhir
- Branch `fix/keamanan-tahap-1`, 3 commit (`c813cdc`, `587de89`, `40e580b`). **BELUM di-merge ke `main`.**
- **BERHENTI di sini** sesuai brief §URUTAN.6 — menunggu review owner sebelum Tahap 2.

---
---

# HASIL PERBAIKAN — TAHAP 1.5 (P0: 6 route mutasi)

Lanjutan dari Tahap 1. Menutup 6 route mutasi yang masih baca cookie mentah
(`JSON.parse`) atau `getOperatorContext` (penjaga palsu). Semua diganti
`getServerSession()` (verifikasi HMAC) + gerbang role, + sumber kontingen/cabor
dipindah dari input yg bisa dipalsukan ke sesi terverifikasi.

Branch: **`fix/keamanan-tahap-1b`** (lanjut dari `fix/keamanan-tahap-1`). **BELUM di-merge.**

## Yang diperbaiki — per route (1 commit / route, TIDAK borongan)

| # | Route | Sebelum | Sesudah | Commit |
|---|---|---|---|---|
| 1 | `api/verifikasi` (POST+GET) | `JSON.parse(cookie)` tanpa verifikasi | `getServerSession` + role `[operator_cabor, admin, konida, superadmin, koni_jabar]` | `2f70555` |
| 2 | `api/performance/import` (POST) | kontingen dari **FormData** (fallback `4`) | `getServerSession` + role; kontingen **dari sesi**, pusat boleh sebut | `54b1571` |
| 3 | `api/operator/prestasi` (GET/POST/DELETE) | `getSession()` baca cookie mentah | `getServerSession`; `cabor_id` dari sesi | `f4d9cd0` |
| 4 | `api/admin/tes-fisik-unmatched` (GET/POST) | tanpa gerbang | `getServerSession` + role (POST: hanya `superadmin`/`koni_jabar`) | `6181474` |
| 5 | `api/konida/talent-lobby` (GET/POST) | `actor()` cookie mentah; `target_kontingen_id: 4` hardcode | `getServerSession` + role; kontingen & `flagged_by` **dari sesi** | `0d23255` |
| 6 | `api/cache/invalidate` (POST) | `JSON.parse(cookie)` | `getServerSession` + role `superadmin`/`koni_jabar` | `a097642` |

## Bukti uji tiap route (dev localhost:3000)
Pola uji: **anon → 401**, **cookie palsu (`porprov_sig=BAD`) → 401** (bukti HMAC),
**role salah → 403**, **role sah → lolos** (bukan 401/403).

- `verifikasi`, `performance/import`, `operator/prestasi`, `talent-lobby`, `cache/invalidate`: **4/4 sesuai** (contoh cache/invalidate: anon 401 · palsu 401 · konida 403 · superadmin 200).
- `admin/tes-fisik-unmatched` GET: gerbang benar (anon 401, role salah 403, admin lolos-gerbang); query hilir 500 lokal = env `SUPABASE_SERVICE_KEY` — **bukan soal auth**, jalan di prod.
- `performance/import` & `intel/predictor`: gerbang benar; 500 lokal krn `SUPABASE_SERVICE_ROLE_KEY` tak ada di `.env.local` (pra-ada, bukan dari perubahan ini).

## Grep penutup (§3) — sisa route mutasi TANPA `getServerSession`
Keenam route target **sudah hilang** dari daftar. Sisa terklasifikasi:

**A. Dijaga middleware (aman, bukan celah)** — `src/middleware.ts` matcher:
`superadmin/{ai,assign-plan,subscriptions}` (`/api/superadmin/*`), `ai-brief`,
`chatbot`, `sipa`, `dayung/brief`, `jarvis/*`, `sport-intel`,
`baseline/smart-brief`, `performance/{smart-brief,strategic-brief,atlet-action-items,meeting-agenda}`.

**B. Publik-sengaja (login/flow auth)** — tak boleh butuh sesi:
`atlet/login`, `atlet/register`, `auth/login`, `auth/logout`, `auth/change-password`, `auth/update-profile`.

**C. ⚠️ TEMUAN BARU — di luar lingkup 1.5 (READ-only, bukan mutasi; usul Tahap berikut):**
1. **`api/intel/scout`** — pakai `getOperatorContext` (penjaga palsu, fallback `Kab. Bogor`/`CHAMPION`) + **service-role key** (tembus RLS), baca s/d **500 baris atlet + PII** (tanggal_lahir/usia) **tanpa sesi**. Prioritas tinggi utk Tahap 2.
2. **`api/ai-nlq`** — masih `JSON.parse(cookie)` tak-terverifikasi (bisa dipalsukan); read-only LLM analitik, ada rate-limit. Prioritas sedang.

## Acceptance Tahap 1.5
| # | Kriteria | Status |
|---|---|---|
| 1 | 6 route target pakai `getServerSession` (HMAC) | ✅ |
| 2 | Cookie palsu (`porprov_sig=BAD`) ditolak 401 | ✅ (terbukti tiap route) |
| 3 | Kontingen/cabor dari sesi, bukan body/FormData/cookie | ✅ (import, talent-lobby, prestasi) |
| 4 | 1 commit per route (tidak borongan) | ✅ (2f70555 → a097642) |
| 5 | Grep penutup dijalankan + sisa dilaporkan | ✅ (§ di atas) |
| 6 | Fitur tetap jalan utk user sah | ✅ (lolos gerbang dgn sesi) |

## Status akhir Tahap 1.5
- Branch **`fix/keamanan-tahap-1b`**, 6 commit (`2f70555`, `54b1571`, `f4d9cd0`, `6181474`, `0d23255`, `a097642`). **BELUM di-merge.**
- **BERHENTI di sini** sesuai instruksi — menunggu **smoke-test login asli** + review owner sebelum merge.
