# 🚀 PORPROV XV — Tes Biomotorik Integration (v2)

**Target: Demo Senin** · Kab. Bogor & Kab. Bandung

---

## 📦 Bundle Contents

```
porprov_tes_fisik_v2/
├── migrations/
│   └── 001_tes_fisik.sql                                    [APPLIED ✓]
├── scripts/
│   ├── import_master_atlet.py                               [Step 1]
│   ├── match_and_import_v3.py                               [Step 2]
│   └── data/                                                [taro 0rekap.xlsx + tes_fisik JSON di sini]
├── app/
│   ├── api/
│   │   ├── atlet/tes-fisik/route.ts                         [Step 3 - athlete API]
│   │   └── konida/tes-fisik/route.ts                        [Step 3 - KONIDA API]
│   ├── atlet/tes-fisik/page.tsx                             [Step 4 - athlete UI]
│   └── konida/Premiumreport/
│       ├── kabbandung/page.tsx                              [Step 5a - NEW]
│       ├── kabbandung/tes-fisik/page.tsx                    [Step 5b - NEW]
│       └── kabbogor/tes-fisik/page.tsx                      [Step 5c - NEW]
├── components/
│   ├── atlet/AtletSidebar.tsx                               [Step 6 - replace existing]
│   └── konida/TesFisikDetailReport.tsx                      [Step 7 - NEW shared]
└── PATCH_kabbogor_PremiumReport.md                          [Step 8 - 3 small edits]
```

---

## 🛣️ Execution Sequence (Sabtu + Minggu = Senin Ready)

### 🧹 PRE-STEP — Cleanup file lama yang salah

```powershell
# Hapus file lama gua yang salah path
Remove-Item -Recurse -Force C:\porprov-xv\app\app -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "C:\porprov-xv\app\dashboard\[tenant]\tes-fisik" -ErrorAction SilentlyContinue
```

---

### ⚡ STEP 1 — Import 1.097 Master Atlet (30 menit, Sabtu pagi)

```powershell
# 1.1 Setup folder
mkdir C:\porprov-xv\scripts -ErrorAction SilentlyContinue
mkdir C:\porprov-xv\scripts\data -ErrorAction SilentlyContinue

# 1.2 Copy script + data
Copy-Item ".\porprov_tes_fisik_v2\scripts\import_master_atlet.py"   C:\porprov-xv\scripts\
Copy-Item "<path-ke-rekap>\0rekap.xlsx"                              C:\porprov-xv\scripts\data\

# 1.3 Install deps
pip install supabase bcrypt pandas openpyxl

# 1.4 Set env (kalau session baru)
cd C:\porprov-xv\scripts
$env:SUPABASE_URL="https://<asli>.supabase.co"
$env:SUPABASE_SERVICE_KEY="<service_role_rotated>"
$env:KONTINGEN_ID_BANDUNG="4"

# 1.5 Dry-run (preview)
python import_master_atlet.py --dry-run

# 1.6 Kalau preview OK, eksekusi
python import_master_atlet.py --commit
```

**Expected hasil**: 1.092 inserted + 5 updated (sample existing) = 1.097 atlet total di kontingen_id=4.

**Sanity check di Supabase**:
```sql
SELECT COUNT(*) FROM atlet WHERE kontingen_id = 4;
-- Expected: ~1097

SELECT COUNT(*) FROM atlet WHERE kontingen_id = 4 AND tgl_lahir IS NOT NULL;
-- Expected: ~1097 (semua dapat tgl lahir dari NIK)
```

---

### ⚡ STEP 2 — Import 365 Tes Fisik + Linking (30 menit)

```powershell
# 2.1 Copy script + data
Copy-Item ".\porprov_tes_fisik_v2\scripts\match_and_import_v3.py"   C:\porprov-xv\scripts\
Copy-Item "<path>\tes_fisik_kab_bandung_2026.json"                    C:\porprov-xv\scripts\data\
Copy-Item "<path>\Analisis_Pemetaan_Data_Atlet.xlsx"                  C:\porprov-xv\scripts\data\

# 2.2 Dry-run
python match_and_import_v3.py --dry-run

# 2.3 Commit (kalau auto-match > 85%)
python match_and_import_v3.py --commit
```

**Expected**: 350+ auto-match dari 365 tes (excel_exact + excel_suggestion + direct_exact + fuzzy_auto).

**Sanity check**:
```sql
SELECT COUNT(*) FROM atlet_tes_fisik WHERE kontingen_id = 4 AND tahap = 3;
-- Expected: ~330-360

SELECT COUNT(*) FROM atlet_tes_fisik_item;
-- Expected: ~2300-2500

SELECT * FROM v_tes_fisik_per_cabor WHERE kontingen_id = 4 ORDER BY rata_kesimpulan DESC LIMIT 5;
-- Expected: Top 5 cabor by fitness
```

---

### ⚡ STEP 3 — Deploy API Routes (10 menit)

```powershell
# 3.1 Copy API athlete (OVERWRITE existing yang gua kasih kemarin — pattern auth salah)
Copy-Item ".\porprov_tes_fisik_v2\app\api\atlet\tes-fisik\route.ts" `
          "C:\porprov-xv\app\api\atlet\tes-fisik\route.ts" -Force

# 3.2 Copy API KONIDA
mkdir "C:\porprov-xv\app\api\konida\tes-fisik" -ErrorAction SilentlyContinue
Copy-Item ".\porprov_tes_fisik_v2\app\api\konida\tes-fisik\route.ts" `
          "C:\porprov-xv\app\api\konida\tes-fisik\route.ts" -Force

# 3.3 Test (run Next.js dev)
npm run dev
# Buka: http://localhost:3000/api/konida/tes-fisik?kontingen_id=4
# Expected: JSON dengan summary + per_cabor + komponen_overall
```

⚠️ **Pastikan env-mu punya**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ATLET_JWT_SECRET` (sesuai sistem athlete login existing)

---

### ⚡ STEP 4 — Athlete Sub-page (15 menit)

```powershell
# 4.1 Copy page atlet/tes-fisik
mkdir "C:\porprov-xv\app\atlet\tes-fisik" -ErrorAction SilentlyContinue
Copy-Item ".\porprov_tes_fisik_v2\app\atlet\tes-fisik\page.tsx" `
          "C:\porprov-xv\app\atlet\tes-fisik\page.tsx" -Force

# 4.2 REPLACE AtletSidebar (ada nav item "Tes Fisik" tambahan)
Copy-Item ".\porprov_tes_fisik_v2\components\atlet\AtletSidebar.tsx" `
          "C:\porprov-xv\components\atlet\AtletSidebar.tsx" -Force
```

**Test**:
1. Login sebagai atlet (NIK + 4 digit terakhir)
2. Sidebar harus muncul item "Tes Fisik" (icon Activity, di group Administrasi)
3. Klik → harus muncul radar chart + history + rekomendasi

⚠️ **Kalau atlet belum punya data tes fisik**, page bakal tampilkan empty state ("Belum Ada Data Tes Fisik") — itu expected, bukan error.

Untuk testing demo: login pakai atlet yang ada di mapping Excel (182 valid match), pasti dapet data.

---

### ⚡ STEP 5 — KONIDA Premium Report (30 menit)

```powershell
# 5.1 NEW: Premium Report Kab. Bandung
mkdir "C:\porprov-xv\app\konida\Premiumreport\kabbandung" -ErrorAction SilentlyContinue
Copy-Item ".\porprov_tes_fisik_v2\app\konida\Premiumreport\kabbandung\page.tsx" `
          "C:\porprov-xv\app\konida\Premiumreport\kabbandung\page.tsx" -Force

# 5.2 NEW: Sub-page detail Tes Fisik Bandung
mkdir "C:\porprov-xv\app\konida\Premiumreport\kabbandung\tes-fisik" -ErrorAction SilentlyContinue
Copy-Item ".\porprov_tes_fisik_v2\app\konida\Premiumreport\kabbandung\tes-fisik\page.tsx" `
          "C:\porprov-xv\app\konida\Premiumreport\kabbandung\tes-fisik\page.tsx" -Force

# 5.3 NEW: Sub-page detail Tes Fisik Bogor
mkdir "C:\porprov-xv\app\konida\Premiumreport\kabbogor\tes-fisik" -ErrorAction SilentlyContinue
Copy-Item ".\porprov_tes_fisik_v2\app\konida\Premiumreport\kabbogor\tes-fisik\page.tsx" `
          "C:\porprov-xv\app\konida\Premiumreport\kabbogor\tes-fisik\page.tsx" -Force

# 5.4 NEW: Shared component
mkdir "C:\porprov-xv\components\konida" -ErrorAction SilentlyContinue
Copy-Item ".\porprov_tes_fisik_v2\components\konida\TesFisikDetailReport.tsx" `
          "C:\porprov-xv\components\konida\TesFisikDetailReport.tsx" -Force
```

---

### ⚡ STEP 6 — Patch Premium Report Kab. Bogor (15 menit)

Baca file `PATCH_kabbogor_PremiumReport.md` yang ada di bundle ini. Apply **3 perubahan kecil**:

1. **Tambah import**: `Activity, ChevronRight` + `Link`
2. **Tambah state**: `tesFisikSummary` + fetch
3. **Ubah grid**: `grid-cols-3` → `grid md:grid-cols-2 lg:grid-cols-4`
4. **Tambah card #4** Tes Biomotorik di akhir grid (sebelum closing `</div>`)

Detail lengkap dengan copy-paste blocks ada di PATCH_kabbogor_PremiumReport.md.

---

### ⚡ STEP 7 — End-to-End Testing (1 jam)

#### Athlete Portal:
- [ ] Login pakai NIK atlet (contoh: `3204092408830008`, pwd: `0008`)
- [ ] Sidebar muncul nav "Tes Fisik"
- [ ] Klik → masuk halaman tes fisik
- [ ] Radar chart muncul dengan data komponen
- [ ] Detail table tampil 6-10 items
- [ ] Rekomendasi latihan muncul di bawah

#### KONIDA Kab. Bandung:
- [ ] `/konida/Premiumreport/kabbandung` → 4 cards (Tes Biomotorik featured biru)
- [ ] Klik card Tes Biomotorik → detail page muncul
- [ ] KPI row tampil 5 angka real
- [ ] Pie chart kategori + Bar BMI tampil
- [ ] Top 5 + Bottom 5 cabor leaderboard
- [ ] Radar komponen kontingen-wide
- [ ] Tabel per cabor lengkap

#### KONIDA Kab. Bogor (kalau ada data):
- [ ] `/konida/Premiumreport/kabbogor` → 4 cards (Tes Biomotorik tambahan)
- [ ] Card existing (SPJ/Buku/Sertifikat) **tetap berfungsi normal**

---

## 🎬 Talking Points Demo Senin

### Opening (KONIDA Kab. Bandung):
> "Premium Report KONIDA — ada 4 tools eksekutif untuk kontingen.
> Yang baru: integrasi data Tes Biomotorik dari Sport Science UPI."

### Demo Tes Fisik (highlight):
> "1.097 atlet Kab. Bandung sudah masuk sistem dengan NIK valid.
> 365 sudah ikut tes biomotorik tahap 3 di Si Jalak Harupat April 2026.
>
> Sistem otomatis hitung:
> - Top 5 cabor fisik terkuat
> - Komponen lemah kontingen → buat program latihan
> - 38 atlet DNS → to-do follow-up untuk pelatih"

### Demo Athlete Portal:
> "Tiap atlet bisa login NIK + 4 digit terakhir.
> Langsung lihat profil fisik sendiri:
> - Radar chart 10 komponen biomotorik
> - Progress dari tahap 1, 2, 3
> - Rekomendasi latihan spesifik per komponen yang lemah"

### Closing:
> "Pattern sama persis bisa di-deploy ke 27 kontingen lain di Jawa Barat
> begitu data tes fisik mereka tersedia. Multi-tenant white-label ready."

---

## ⚠️ Known Limitations (Honest dalam Demo)

- **Kab. Bogor data tes fisik**: Belum tersedia di PDF UPI yang ada. Card-nya akan tampil "—" sampai data masuk. **Mention sebagai roadmap, bukan kekurangan.**
- **Premium Report Kab. Bandung — SPJ Bonus/Buku Hasil/Sertifikat**: Placeholder dulu. Sprint berikutnya tinggal port dari template Kab. Bogor. Fungsi Tes Biomotorik fully working.
- **Athlete portal**: Login NIK atlet **belum ditest end-to-end** dengan password bcrypt default. Test dulu Sabtu malam, jangan Minggu malam.

---

## 🆘 Troubleshooting

| Masalah | Solusi |
|---|---|
| `Pool atlet kontingen=4 kosong` | Step 1 belum jalan. Re-run import_master_atlet.py --commit |
| API tes-fisik return 401 | Cek env `SUPABASE_SERVICE_KEY` (bukan anon key) di Next.js |
| Atlet login tapi data kosong | Cek `atlet_tes_fisik.atlet_id` apakah ke-link. Re-run matcher |
| `cabang_olahraga` not found warning | OK, bukan blocker. Fallback ke `cabor_nama_raw` text |
| Type error TSX di build | Pastikan `lucide-react`, `recharts` versi sama dengan existing project |

---

🔥 **GASS! Senin sukses bos!**
