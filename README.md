# 🏅 Pentathlon Module — PORPROV XV Jabar 2026

Module khusus Operator Cabor Modern Pentathlon. Format LA 2028 UIPM (Riding → Obstacle).

---

## 📁 Struktur File

```
src/
├── lib/
│   └── pentathlon-scoring.ts          ← Formula UIPM converter (Fencing/Swimming/Obstacle/Laser Run → poin)
│
└── app/
    └── operator/
        └── pentathlon/                ← FOLDER BARU
            ├── layout.tsx             ← Sub-nav + route guard (cuma op.pentathlon + admin)
            ├── page.tsx               ← Dashboard (KPI + 12 nomor breakdown)
            ├── input/page.tsx         ← BULK INPUT: 1 atlet = 1 row, 4 disiplin + auto-calc Individual
            ├── lineup/page.tsx        ← BULK REGISTER: 1 klik = daftar ke 5 nomor sekaligus
            └── klasemen/page.tsx      ← LIVE KLASEMEN: ranking auto-refresh 30 detik, podium top 3
```

---

## 🚀 Cara Install di Windows (C:\porprov-xv)

1. **Copy semua file** dari folder ini ke `C:\porprov-xv\src\` dengan struktur yang sama persis
2. **Restart dev server**: `cd C:\porprov-xv && npm run dev`
3. **Login** sebagai `op.pentathlon` (atau admin) → akses URL: `http://localhost:3000/operator/pentathlon`

---

## ✅ Flow Penggunaan (Operator MPI)

### **Tahap 1: Lineup Atlet** (`/operator/pentathlon/lineup`)
- Pilih gender tab (Putra/Putri)
- Klik "Daftarkan" per atlet → otomatis daftar ke 5 nomor (Individual + Fencing + Swimming + Obstacle + Laser Run)
- Atau klik "Daftarkan Semua" untuk bulk register seluruh atlet Verified

### **Tahap 2: Input Skor** (`/operator/pentathlon/input`)
- Pilih gender tab
- Input data MENTAH per atlet:
  - **Fencing**: jumlah wins + total matches (round-robin)
  - **Swimming**: waktu finish (format `mm:ss.cc` atau detik)
  - **Obstacle**: waktu finish
  - **Laser Run**: waktu finish total
- Total poin + Rank + Medali **AUTO-CALCULATE** real-time
- Klik "Simpan Semua" → tersimpan ke 5 nomor sekaligus per atlet

### **Tahap 3: Klasemen Live** (`/operator/pentathlon/klasemen`)
- Podium top 3 + tabel lengkap
- Auto-refresh setiap 30 detik
- Export CSV per gender

---

## 🧮 Formula UIPM (Configurable)

Edit `src/lib/pentathlon-scoring.ts` → constant `UIPM_BASELINES`:

```typescript
fencing  : 70% wins   = 250 pts  (±6 per W/L)
swimming : 2:30.00    = 250 pts  (±1 per 0.33s)
obstacle : 70.0 sec   = 300 pts  (±1 per 0.33s)
laser_run: 11:00.00   = 600 pts  (±1 per 0.33s)  [no handicap for MVP]
```

**Update setelah konfirmasi MPI Jabar:**
- Baseline time/wins
- Points per match/per detik
- Aktifkan handicap start Laser Run (perlu refactor schema)

---

## 🗃️ Schema Database (existing)

Module ini **gak butuh migration**. Pakai tabel existing:
- `nomor_pertandingan` (12 nomor Pentathlon udah ada, ID 3053-3064)
- `kualifikasi_atlet` (untuk lineup)
- `hasil_pertandingan` (untuk skor + medali)

**Strategi penyimpanan skor:**
- `hasil_pertandingan.nilai` untuk disiplin (Fencing/Swimming/Obstacle/Laser Run) = **poin terkonversi UIPM**
- `hasil_pertandingan.nilai` untuk Individual = **total combined points**
- `hasil_pertandingan.medali` untuk Individual = auto-assign emas/perak/perunggu (top 3 ranking)
- Disiplin nomor: `medali = 'none'` (gak dimedalikan terpisah)

**⚠️ LIMITATION TAHAP 1:** Data mentah (waktu, victories) **gak disimpan** ke DB. Operator harus input ulang dari mentah kalau mau edit skor. Untuk audit trail full, perlu schema migration (tambah kolom `nilai_mentah JSONB`).

---

## 🎨 Design Decisions

- **Color accent**: Yellow/Gold (Pentathlon = medali multi-disiplin)
- **Sub-navigation**: Tabs di atas, gak ganti sidebar (consistency)
- **Auto-rank**: Top 3 langsung dapat medali Individual saat poin > 0
- **Gender split**: Tab Putra/Putri (atlet Pentathlon selalu single-gender per nomor)
- **Format LA 2028**: Riding sudah diganti Obstacle di database (UPDATE ID 3058 + 3064)

---

## 🟡 Catatan untuk Iterasi Berikutnya (TAHAP 2)

1. **Konfirmasi MPI Jabar** soal formula scoring (baseline mungkin beda dari UIPM official)
2. **Handicap start Laser Run** kalau MPI mau full UIPM compliance
3. **Relay support** (2 nomor: Relay Putra + Relay Putri — sekarang masih manual via `/operator/hasil`)
4. **Data mentah audit trail** — schema migration untuk simpan waktu/victories asli
5. **Update OperatorSidebar.tsx** untuk tampilin menu "🏅 Pentathlon" conditional kalau user adalah op.pentathlon
6. **Klasemen kontingen integration** — 12 medali Pentathlon harus masuk ke klasemen total
7. **Refactor jadi pattern reusable** buat cabor combined-scoring lain (Senam, Loncat Indah, Triathlon)

---

## 🐛 Troubleshooting

| Error | Solusi |
|---|---|
| `Nomor pertandingan Putra/Putri belum lengkap` saat save | Cek di Supabase, pastikan nomor Pentathlon (Individual/Fencing/Swimming/Obstacle/Laser Run) untuk gender tersebut udah ada + status `Approved` |
| Sidebar gak muncul menu Pentathlon | Update `OperatorSidebar.tsx`, tambah link conditional. Atau langsung akses URL `/operator/pentathlon` |
| `redirect('/operator/dashboard')` terus | User bukan operator pentathlon. Cek `cabor_nama` di session — harus match regex `/pentathlon/i` |
| Klasemen kosong padahal udah input | Auto-refresh delay 30 detik. Klik "Reload" manual atau tunggu cycle berikutnya |

---

**Dibuat untuk:** Iwan / PORPROV XV Jabar 2026
**Format:** LA 2028 UIPM (Riding → Obstacle)
**Status:** TAHAP 1 — Scaffolding (formula placeholder, perlu konfirmasi MPI Jabar untuk fine-tuning)
