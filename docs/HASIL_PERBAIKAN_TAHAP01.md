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
