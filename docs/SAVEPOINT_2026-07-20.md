# SAVEPOINT — Remediasi Keamanan + Fitur Aturan porprov-admin
**Tanggal:** 2026-07-20 · **Status:** semua ter-deploy ke `main` (3 project Vercel) · **Sisa:** smoke-test akun asli

Dokumen ini merangkum SEMUA yang dikerjakan sesi ini — untuk (a) panduan smoke-test, (b) catatan perubahan, (c) rencana ke depan.

---

## 1. Ringkasan eksekutif
Dari audit keamanan → dikerjakan tuntas 3 lapis + cleanup + fitur aturan pertandingan (meniru konsep ISTIMEWA Jabar). Prinsip inti: **semua tulisan data dari browser dipindah ke route server tervalidasi**, dan **aturan pertandingan = konfigurasi (Excel/UI), bukan kode**.

```
Keamanan auth (Jenis 1)              ✅ SELESAI
Integritas data & gerbang (Jenis 3)  ✅ SELESAI
Renovasi RLS 28+ tabel (Jenis 2)     ✅ SELESAI
Cleanup (fungsi/permission)          ✅ SELESAI
Gap-fix (5 tabel + 11 endpoint AI)   ✅ SELESAI
Aturan pertandingan (P1 ISTIMEWA)    ✅ SELESAI
Verifikasi pakai AKUN ASLI           ⚠️ BELUM (tugas berikutnya)
```

---

## 2. Apa yang berubah (per kelompok)

### 2.1 Keamanan Auth (Jenis 1)
- Cookie sesi ditandatangani **HMAC** (`porprov_sig`) — sesi tak bisa dipalsukan. Middleware berhenti percaya cookie `user_level`.
- **Middleware diaktifkan** — dulu `middleware.ts` di root, project pakai `src/` → Next tak pernah menjalankannya. Dipindah ke `src/middleware.ts` (semua proteksi route/tenant routing baru benar-benar hidup).
- Password atlet: **1097 di-hash bcrypt** (dulu plaintext). Fallback plaintext dicabut.
- JWT secret atlet: fail-fast dari env (dulu hardcoded di 6 file).
- **Audit trail nyala** — `writeAudit` terpasang di semua route mutasi (dulu tabel `audit_logs` ada tapi 0 penulisan).

### 2.2 Integritas Data & Gerbang (Jenis 3)
- **Gerbang pembuatan atlet** di server (`/api/atlet/create`): validasi NIK 16 digit, gender, umur wajar, cabor aktif; `kontingen_id` dikunci dari sesi; kuota **mode imbau** (dicatat, tak memblokir — angka kuota belum resmi).
- Impor massal atlet dipindah ke server (`/api/atlet/bulk-create`).
- Cabor_id "drift" **ternyata bukan krisis** — alur inti konsisten di ruang `cabang_olahraga`.
- `is_posted` 108 atlet disinkron.

### 2.3 Renovasi RLS (Jenis 2) — 28+ tabel
Semua tulisan browser dipindah ke route server / RLS diperketat. Baca (SELECT) anon dipertahankan di mana perlu.
- **Keuangan:** `tenants` (tulis→server), `invoices`/`invoice_items` (baca ditutup, service-only).
- **Kompetisi:** `nomor_pertandingan`, `hasil_pertandingan` (+ fix unique index yang bikin upsert lama selalu gagal), `kualifikasi_atlet`, `kuota_kualifikasi`.
- **Data atlet:** `atlet` UPDATE, `atlet_perlengkapan`, `riwayat_kejuaraan`, `riwayat_prestasi`, `venue`.
- **Sweep aman:** 15 tabel diperketat sekaligus.

### 2.4 Cleanup keamanan
- **`update_user_password`** (SECURITY DEFINER, anon bisa ganti password user MANA PUN) → dicabut dari anon. Lubang eskalasi ditutup.
- 26 fungsi di-pin `search_path` (cegah injection).
- Tabel legacy `cabor_master`/`operator_cabor` ditandai mati (user pilih tidak di-drop).

### 2.5 GAP-FIX (dari review "ada yang kelewat?")
- **5 tabel** masih anon-writable karena sweep awal cuma cek role `public`, luput role `{anon,authenticated}`: `atlet_biomotor`, `atlet_lift_test`, `atlet_mutation_history`, `ps_results_fencing_bonus`, `pentathlon_config` (dirouting ke server). **Ditutup.**
- **11 endpoint LLM tanpa auth** (jarvis/chat, chatbot, sipa, ai-brief, sport-intel, dayung/brief, + 5 brief performance) → risiko tagihan API AI membengkak. **Dijaga middleware wajib-login.**

### 2.6 Fitur Aturan Pertandingan (P1 — konsep ISTIMEWA)
Gerbang eligibilitas atlet→nomor (`src/lib/eligibility.ts`, nempel di `/api/operator/kualifikasi`):
- **Gender cocok** (KERAS: nomor L/P wajib cocok; OPEN/MIX bebas).
- **Umur** relatif tanggal event (1 Sep 2026), **maks peserta/kontingen**, **maks nomor/atlet** — semua "enforce bila diisi".
- **Gerbang fase waktu** (`src/lib/phases.ts`): aksi ditolak di luar jendela waktu; tanpa fase = tidak dikunci.
- Semua config-driven — **bisa diisi siapa pun tanpa ubah kode** (kelebihan utama).

---

## 3. Halaman & fitur BARU yang kamu punya sekarang
| Halaman/Fitur | URL | Fungsi |
|---|---|---|
| Impor aturan massal | `/superadmin/aturan-nomor` | Export Excel → isi umur/tim → upload → set ratusan nomor sekaligus |
| Admin Fase | `/superadmin/fase` | Atur jendela waktu tiap tahap (pendaftaran/verifikasi/kualifikasi/kompetisi) |
| Laporan kompetitif | `/superadmin/laporan-kompetitif` | Tandai nomor < 4 kontingen (perlu ditinjau) |
| Edit aturan per nomor | halaman operator "Nomor" → tombol ✏️ | Set umur/tim 1 nomor cepat |
| Log audit | `/superadmin/logs` | Jejak aksi sensitif (siapa ubah apa) |

---

## 4. ✅ CHECKLIST SMOKE-TEST (pakai akun asli — tugas berikutnya)
Login tiap peran, pastikan alur jalan mulus (semua ini sudah teruji pakai cookie buatan, tapi belum pakai login asli):

**Sebagai KONIDA (kabupaten):**
- [ ] Login → dashboard tenant kebuka (bukan salah page)
- [ ] Tambah atlet baru → tersimpan (Draft)
- [ ] Edit data atlet → tersimpan
- [ ] Verifikasi/tolak atlet → status berubah
- [ ] Impor atlet massal (Excel) → masuk
- [ ] Isi perlengkapan/dokumen atlet → tersimpan
- [ ] Input riwayat prestasi → tersimpan

**Sebagai OPERATOR CABOR:**
- [ ] Login → lihat atlet cabornya
- [ ] Tambah/edit nomor pertandingan → tersimpan
- [ ] **Set aturan nomor (umur/tim) via tombol ✏️** → tersimpan
- [ ] Daftar atlet ke nomor (kualifikasi) → **coba atlet gender salah → HARUS ditolak**
- [ ] Input hasil pertandingan → tersimpan
- [ ] Verifikasi kejuaraan → status berubah

**Sebagai SUPERADMIN:**
- [ ] Login → kelola tenant (tambah/edit/hapus) → jalan
- [ ] Buka `/superadmin/fase` → tambah fase → coba set fase pendaftaran TUTUP → **pendaftaran atlet HARUS ditolak**
- [ ] Buka `/superadmin/laporan-kompetitif` → lihat nomor < 4 kontingen
- [ ] Buka `/superadmin/aturan-nomor` → export → isi → upload → cek ke-set
- [ ] Buka `/superadmin/logs` → lihat jejak audit

**Sebagai ATLET (portal):**
- [ ] Login portal → lihat data sendiri
- [ ] Upload dokumen / input data → tersimpan

> Kalau ADA yang gagal, catat: **halaman apa, aksi apa, pesan error apa** → kasih ke sesi berikutnya, langsung didiagnosa.

---

## 5. Yang KAMU perlu isi (dari regulasi resmi PORPROV)
Mesin sudah jalan, tinggal data:
1. **Umur min/maks & ukuran tim per nomor** → via `/superadmin/aturan-nomor` (Excel) atau tombol ✏️ per nomor.
2. **Tanggal fase** pendaftaran/verifikasi/dll → via `/superadmin/fase`.
3. Sumber angka: **juknis PORPROV XV per cabor** (KONI Jabar / induk cabor). Alternatif: minta data `event_class` (±283 baris) ke vendor ISTIMEWA sebagai auditor.
> Selama belum diisi → **tidak memblokir apa pun** (aman).

---

## 6. Sisa pekerjaan (opsional / ke depan)
| Item | Prioritas | Catatan |
|---|---|---|
| **Smoke-test akun asli** | 🔴 Tinggi | Satu-satunya verifikasi yang belum; lakukan sebelum hari-H |
| Review `atlet_own_kejuaraan` (portal) | 🟡 Rendah | Policy scoped ke NIK; jalur resmi sudah via /api/atlet service-key |
| P1e — satukan 2 sistem kuota jadi 1 bermode | 🟢 Opsional | cabor_kuota + kuota_kualifikasi dua-duanya jalan |
| Migration retroaktif (schema-as-code) | 🟢 Opsional | Dokumentasi; kuota_kualifikasi/nomor_pertandingan tak ada CREATE TABLE |
| Drop tabel legacy cabor_master/operator_cabor | 🟢 Opsional | User pilih biarkan (sudah ditandai mati) |
| P2 polish (tombol "Lupa password?") | 🟢 Opsional | Dead UI, implementasi atau hapus |

---

## 7. Catatan teknis penting (untuk sesi berikutnya)
- **PELAJARAN audit RLS:** filter role HARUS cakup `{anon}` + `{authenticated}`, bukan cuma `{public}` — 5 tabel luput karena ini.
- **Pola per tabel (terbukti mulus):** route server (service key + guard + scope dari sesi + audit) → repoint halaman → migration DROP/ALL→SELECT-only → tes bukti (anon 401, baca 200, route 200).
- **Cara tes tanpa login asli:** mint cookie HMAC sendiri pakai `PORPROV_SESSION_SECRET` (contoh script di scratchpad). Hati-hati `const URL` shadow global fetch → pakai `BASE`.
- Semua migration di `src/app/migrations/019`–`036` (sudah diterapkan live via Supabase).
- Detail lengkap juga di memori: `porprov-security-remediation`, `istimewa-porprov-benchmark`.

---

## 8. Daftar commit sesi ini (dari lama → baru)
```
facd9d2 HMAC sesi + middleware stop percaya user_level (1.1)
012cbed cabut fallback plaintext (1.5) + JWT fail-fast (1.6)
25e43c1 guard route sensitif users/superadmin (1.3)
3d5a0c4 AKTIFKAN middleware (pindah ke src/)
4ae63ee + 0b57bb9 hash password atlet bcrypt + bulk 1097
4d89b6a hotfix level3 akses dashboard tenant
d6e9e09 audit trail (2.4)
8f4fa74 + 137b61a gerbang atlet server + kuota imbau
af29116 Fase A cleanup
873e78d + 6befe93 Fase B (bulk import server + cabut insert-anon atlet)
4470122 J2-1 sweep 15 tabel
9f5c367 J2-2 keuangan
d7d6e50/f9a6175/a68ae96/05f260f J2-3 kompetisi (nomor/hasil/kualifikasi/kuota)
18e13bc/153fd38/cf63963 J2-4 data atlet
d8d19f8 J2-5 venue (Jenis 2 SELESAI)
f264d93 cleanup (update_user_password + search_path)
1f8742a/7f38284 P1 eligibilitas + UI aturan
2d9ccf6 P1f fase
7bb8b65 P1g laporan kompetitif
6dd2497 impor massal aturan (Excel)
2794ac3 GAP-FIX 5 tabel anon-write
1cd0881 GAP-FIX 11 endpoint LLM auth
```

**Semua di branch `main`, ter-deploy. Aman berhenti di sini.** 🎯
