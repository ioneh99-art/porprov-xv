# PORPROV XV Admin Dashboard

Sistem Manajemen Atlet PORPROV XV Jawa Barat 2026.

## Tech Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Recharts** (grafik)
- **Lucide React** (icons)

## Cara Menjalankan

### 1. Install dependencies
```bash
npm install
```

### 2. Jalankan development server
```bash
npm run dev
```

### 3. Buka di browser
```
http://localhost:3000
```

## Struktur Project
```
src/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx        ← layout dengan sidebar
│   │   ├── page.tsx          ← halaman dashboard utama
│   │   └── atlet/
│   │       └── page.tsx      ← halaman daftar atlet
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── Sidebar.tsx           ← sidebar navigasi
└── lib/
    └── data.ts               ← data mock (nanti diganti Supabase)
```

## Halaman yang Tersedia
- `/dashboard` — Dashboard utama (KPI, chart, tabel, aktivitas)
- `/dashboard/atlet` — Daftar atlet dengan search & filter

## Next Steps (Roadmap)
1. Koneksi ke Supabase (database PostgreSQL)
2. Halaman login dengan role Admin / KONIDA
3. Form tambah/edit atlet (upload dokumen)
4. Halaman Disiplin & Laporan
5. Dashboard User KONIDA (tampilan terbatas per kontingen)
