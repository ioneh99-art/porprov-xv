# BRIEF PERBAIKAN — Tahap 1.5 (Tutup Sisa Route Mutasi Rawan)

**Dibuat:** 2026-08-10
**Untuk:** Claude Code (VS Code), di `/Users/bidang5/Documents/VScode/porprov`
**Prasyarat:** Tahap 1 (`fix/keamanan-tahap-1`) sudah selesai. Kerjakan Tahap 1.5 di branch lanjutan (mis. `fix/keamanan-tahap-1b`) — boleh setelah Tahap 1 di-merge, atau di atasnya.
**Sifat:** perbaikan keamanan berdampak-produksi — verifikasi tiap route, uji, commit per route.

> Ini kelanjutan langsung Tahap 1: 6 route mutasi yang saat audit ditemukan **membaca cookie manual tanpa verifikasi HMAC** (bisa dipalsukan) atau tanpa cek sesi. Semua sudah dikonfirmasi tidak memakai `getServerSession`. Perbaikannya pola sama seperti 1a/1b.

---

## 0. ATURAN MAIN

1. Aplikasi LIVE, **tanpa test** — commit per route, uji tiap langkah, jangan borongan.
2. Pola benar sudah ada: `getServerSession()` (`src/lib/guard.ts`, verifikasi HMAC) dan `requireRole([...])`. **Jangan** pakai `getOperatorContext()` atau `cookies().get('porprov_session')` + `JSON.parse` untuk otorisasi — itu justru yang sedang kita ganti.
3. `kontingen_id`/`cabor_id`/role **selalu diambil dari sesi terverifikasi**, bukan dari body/cookie/header mentah.
4. Jangan sentuh Tahap 2 (pindah baca browser→server, tutup baca `atlet`/`users`) di sini.
5. Ragu soal siapa pemanggil sah sebuah route → cek dulu halaman yang memanggilnya, atau berhenti & tanya. Jangan menebak role.

---

## 1. DAFTAR ROUTE + PERBAIKAN

Status saat ini (terverifikasi 2026-08-10): keenam route mengekspor method mutasi, **0 pemakaian `getServerSession`**, membaca cookie manual.

| Route | Method | Prioritas | Gate yang disarankan |
|---|---|---|---|
| `api/verifikasi/route.ts` | POST, GET | 🔴 **TERTINGGI** | login + role verifikator (lihat §2) |
| `api/performance/import/route.ts` | POST (impor atlet massal) | 🔴 tinggi | login + konida/operator, kontingen dari sesi |
| `api/operator/prestasi/route.ts` | GET, POST, DELETE | 🟠 | login + operator, cabor/kontingen dari sesi |
| `api/admin/tes-fisik-unmatched/route.ts` | GET, POST | 🟠 | login + admin/superadmin |
| `api/konida/talent-lobby/route.ts` | GET, POST | 🟠 | login + konida (POST menandai rekrutmen) |
| `api/cache/invalidate/route.ts` | POST | 🟡 | login + admin/superadmin (atau secret internal) |

**Pola perbaikan (untuk method mutasi POST/PUT/PATCH/DELETE):**
```ts
import { getServerSession } from '@/lib/guard'
// ...
export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // kalau perlu role: if (!['konida','admin','superadmin'].includes(s.role ?? s.level))
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // kontingen_id = s.kontingen_id  (JANGAN dari body)
  ...
}
```
Hapus pembacaan cookie manual (`cookies().get('porprov_session')` + `JSON.parse`) yang lama, ganti dengan `s` dari `getServerSession`.

---

## 2. PERHATIAN KHUSUS — `api/verifikasi` (paling sensitif)

Route ini menggerbang transisi status atlet (Verified/Posted) — gerbang yang menentukan "peserta resmi" (674 vs 1097 di Kab. Bandung). Saat ini ia membaca identitas/role dari cookie manual **tanpa verifikasi HMAC** → **bisa dipalsukan**, artinya seseorang berpotensi memalsukan pengesahan atlet.

**Wajib:**
- Ganti sumber identitas/role ke `getServerSession()`. Role yang dipakai `applyTransition` (`src/lib/atlet-status.ts`) HARUS berasal dari sesi terverifikasi (`s.role`/`s.level`), **bukan** dari cookie/body.
- Pastikan `writeAudit` tetap mencatat `user_id` dari sesi terverifikasi, bukan dari input.
- Cek juga method GET: kalau GET cuma baca (list menunggu verifikasi), minimal wajib login; kalau membocorkan data lintas-kontingen, scope ke `s.kontingen_id`.

**Uji khusus verifikasi:** dengan cookie palsu/tanpa sesi → POST ditolak 401; dengan sesi role rendah → 403; dengan sesi verifikator sah → transisi jalan + audit tercatat dengan user yang benar.

---

## 3. VERIFIKASI / ACCEPTANCE

Per route:
| # | Kriteria | Uji |
|---|---|---|
| 1 | Method mutasi tolak tanpa sesi | panggil tanpa cookie → 401 |
| 2 | Tolak sesi role tidak berhak (bila ada gate role) | 403 |
| 3 | `kontingen_id`/`cabor_id` diambil dari sesi, bukan body | baca kode |
| 4 | Tidak ada lagi `cookies().get('porprov_session')`+`JSON.parse` untuk authz | grep 0 |
| 5 | Alur sah tetap jalan (smoke test login asli) | manual |
| 6 | `verifikasi`: audit mencatat user dari sesi terverifikasi | cek 1 transisi |

**Grep penutup:** cari route mutasi lain yang masih lolos — file di `src/app/api/**` yang mengekspor `POST/PUT/PATCH/DELETE` tapi tak menyebut `getServerSession`. Laporkan sisa (harusnya tinggal yang memang publik-sengaja, mis. login, webhook ber-secret).

---

## 4. YANG TIDAK BOLEH

- Jangan pindah baca browser→server / tutup baca `atlet`/`users` (Tahap 2).
- Jangan pakai `getOperatorContext()` untuk gate.
- Jangan ambil `kontingen_id`/role dari body/cookie mentah.
- Jangan commit borongan — pisah per route.
- Jangan merge tanpa smoke-test login asli.

---

## 5. URUTAN & PENUTUP

1. Branch `fix/keamanan-tahap-1b`.
2. `verifikasi` dulu (paling sensitif) → uji → commit.
3. `performance/import` → `operator/prestasi` → `admin/tes-fisik-unmatched` → `konida/talent-lobby` → `cache/invalidate`, satu per satu, uji + commit.
4. Grep penutup (§3).
5. Update laporan `docs/HASIL_PERBAIKAN_TAHAP01.md` (atau file baru) dengan hasil + sisa temuan.
6. **BERHENTI. Smoke-test login asli.** Tunjukkan ke owner sebelum merge. Tahap 2 tetap terpisah.

> Sumber: laporan Tahap 1 Claude Code + audit 2026-08-10. Konteks lengkap di `docs/BRIEF_PERBAIKAN_TAHAP01.md`.
