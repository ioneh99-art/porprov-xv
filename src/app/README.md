# PORPROV XV — Integrasi Data Tes Fisik Kab. Bandung

**Source**: Laporan Tes Biomotorik Atlet Porprov Kab. Bandung 2026 (FPOK UPI)
**Tanggal Tes**: 11 April 2026 (Tahap 3 — final pre-Porprov)
**Total Data**: 402 atlet × ~6.5 item tes = **2,597 data point fisik**

---

## 📦 File Deliverable

```
tes_fisik_kab_bandung_2026.json    # Master JSON (402 atlet + items + metadata)
tes_fisik_atlet.csv                # CSV header (1 row per atlet)
tes_fisik_item.csv                 # CSV detail item tes (1 row per item)
extraction_summary.json            # Statistik agregat

parse_tes_fisik.py                 # Parser PDF → JSON (re-runnable)
match_and_import.py                # Fuzzy match + import ke Supabase

migrations/001_tes_fisik.sql       # Schema 3 tabel + 3 view + RLS

api/atlet/tes-fisik/route.ts       # API athlete portal (own data)
api/konida/tes-fisik/route.ts      # API KONIDA dashboard (aggregate)

app/atlet/profil/fisik/page.tsx              # Athlete view (radar + history + rekomendasi)
app/dashboard/[tenant]/tes-fisik/page.tsx    # KONIDA dashboard (per-cabor insights)
```

---

## 🎯 Insights Real dari Data (siap-tampil di dashboard)

### Rata Capaian per Komponen — Kontingen-wide
| Komponen | Rata Capaian | n |
|---|---|---|
| 🔴 **Balance** | **45.5%** | 282 |
| 🔴 **Agility** | **46.9%** | 205 |
| 🟡 Speed Reaction | 61.7% | 189 |
| 🟢 Aerobic Capacity | 73.2% | 364 |
| 🟢 Power | 75.0% | 267 |
| 🟢 Local Muscle Endurance | 75.5% | 317 |
| 🟢 Core Stability | 81.1% | 362 |
| 🟢 Flexibility | 82.7% | 557 |

**Aksi konkret**: program latihan kontingen perlu fokus berat di **Balance + Agility** — ini bisa di-push ke pelatih lewat sistem notifikasi.

### Top 5 Cabor Fisik Terkuat
1. Dayung (Canoe) — **86.6%** (n=21)
2. Arung Jeram — 85.1% (n=7)
3. OWS (Open Water Swimming) — 83.3% (n=3)
4. Pentathlon — 81.6% (n=5)
5. Renang — 79.3% (n=3)

### 5 Cabor Perlu Perhatian Khusus
1. Menembak — **48.4%** (n=10)
2. Gateball — 54.2% (n=10)
3. Angkat Berat — 54.6% (n=8)
4. Panahan — 56.5% (n=8)
5. Angkat Besi — 57.0% (n=13)

> Catatan: cabor presisi (menembak/panahan) skornya rendah karena tes fisik general tidak optimal mengukur skill cabor mereka. Bisa diberi label "low fitness load" di UI.

### Other
- **38 atlet "DNS"** (tidak hadir tes) — perlu di-follow-up KONIDA
- Gender split: **244 L / 157 P / 1 unknown**
- Distribusi kategori overall: 12 Baik Sekali, 141 Baik, 140 Cukup, 63 Kurang, 8 Kurang Sekali

---

## 🧬 Nilai Tambah untuk Atlet (Athlete Portal)

Setiap atlet di halaman `/atlet/profil/fisik` mendapat:

1. **Radar chart komponen fisik** — visual instan kekuatan & kelemahan
2. **Progress timeline** — Tahap 1 (Okt 2024) → Tahap 2 (Sep 2025) → Tahap 3 (Apr 2026)
3. **BMI status** — Underweight / Normal / Overweight / Obese
4. **Detail tabel** — hasil vs norma vs capaian per item
5. **🎯 Auto-rekomendasi latihan** — komponen terlemah → fokus latihan spesifik:
   - Balance lemah → Stork stand, single-leg drills, balance board
   - Agility lemah → Cone drills, ladder drills, T-test
   - Aerobic lemah → Zone-2 base, HIIT 4×4, fartlek
   - dll (10 komponen ter-cover)

---

## 📊 Nilai Tambah untuk KONIDA (Dashboard)

Halaman `/dashboard/kab-bandung/tes-fisik`:

1. **KPI row**: total atlet, sudah tes, DNS, rata fitness, gender split
2. **Pie chart** distribusi kategori (Baik Sekali → Kurang Sekali)
3. **Bar chart** distribusi BMI
4. **Top 5 / Bottom 5 cabor** — leaderboard fitness antar cabor
5. **Radar chart komponen** kontingen-wide — terlihat instant komponen lemah
6. **Tabel per cabor** dengan distribusi stack bar (visual cepat)

---

## 🔄 SIPA AI Integration (bonus)

Schema yang gua bikin sudah siap di-query SIPA. Contoh prompt yang langsung bisa dijawab:

- "Cabor mana yang VO2Max rata-ratanya di bawah 35?"
- "Atlet siapa saja yang kategori Kurang Sekali dan belum follow-up?"
- "Bandingin profil fisik Dayung vs Pencak Silat"
- "Buatin laporan ringkasan tes fisik buat KONI Provinsi"

SIPA tinggal SELECT dari view `v_tes_fisik_per_cabor` dan `v_tes_fisik_komponen_lemah`.

---

## 🚀 Step-by-step Eksekusi

```bash
# 1. Apply migration
psql $SUPABASE_DB < migrations/001_tes_fisik.sql

# 2. Set env
export SUPABASE_URL="..."
export SUPABASE_SERVICE_KEY="..."
export KONTINGEN_ID_BANDUNG=2   # ganti sesuai ID di DB

# 3. Install dep matcher
pip install supabase rapidfuzz

# 4. Dry run (review match quality)
python3 match_and_import.py --dry-run

# 5. Commit
python3 match_and_import.py --commit

# 6. Review unmatched (manual via SQL atau bikin admin UI):
#    SELECT * FROM atlet_tes_fisik_unmatched WHERE NOT resolved;

# 7. Deploy Next.js routes & pages
# 8. Athlete login via NIK → /atlet/profil/fisik
# 9. KONIDA Kab. Bandung → /dashboard/kab-bandung/tes-fisik
```

---

## ⚠️ Catatan Kualitas Data

- **38 atlet** di PDF asli **tidak punya data tes** (tabel kosong) — sudah di-flag `status_tes='Tidak Hadir'` di schema
- **6 atlet** punya `berat_badan=0, tinggi_badan=0, BMI=#DIV/0!` — masuk database dengan nilai NULL, perlu update manual
- Nama cabor punya banyak variasi (Pencak silat vs Pencak Silat, kempo vs Kempo, Hoki vs Hockey) — sudah dinormalisasi di parser
- Item tes berbeda-beda per cabor (4–10 items) — schema item table fleksibel handle ini

---

## 🛣️ Roadmap Lanjutan

- [ ] **Multi-kontingen scaling** — schema sudah generic, tinggal jalanin parser untuk laporan Kab/Kota lain kalau dapat PDF dari UPI
- [ ] **Historical comparison** — kalau dapat data Tahap 1 (Okt 2024) + Tahap 2 (Sep 2025), bisa show full progress curve
- [ ] **Predictive scoring** — feed ke ML model: prediksi peluang medali berdasarkan fitness profile + cabor norm
- [ ] **Auto-notif pelatih** — kalau atlet asuhannya skor turun > 10% → push notification
- [ ] **Export PDF report** per atlet (kayak laporan UPI tapi auto-generated dari sistem)
