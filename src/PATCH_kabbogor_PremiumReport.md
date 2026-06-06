# 🔧 PATCH: Tambah Card Tes Biomotorik di Premium Report Kab. Bogor

File yang diedit: **`src/app/konida/Premiumreport/kabbogor/page.tsx`**

Strategy: **3 perubahan kecil** — gak rewrite file, cuma tambah 1 card + 1 import + 1 data fetch.

---

## 1️⃣ Tambah Import di Bagian Atas

Cari baris import lucide-react (sekitar line 7-12), tambahin `Activity` & `ChevronRight`:

**SEBELUM:**
```tsx
import {
  Download, FileCheck, Coins, Printer, Loader2,
  Database, ShieldCheck, CheckCircle2, Trophy,
  Users, Award, FileText, RefreshCw, Info,
  Star, AlertTriangle, Zap,
} from 'lucide-react'
```

**SESUDAH:**
```tsx
import {
  Download, FileCheck, Coins, Printer, Loader2,
  Database, ShieldCheck, CheckCircle2, Trophy,
  Users, Award, FileText, RefreshCw, Info,
  Star, AlertTriangle, Zap, Activity, ChevronRight,   // ← ditambah
} from 'lucide-react'

import Link from 'next/link'   // ← ditambah (kalau belum ada)
```

---

## 2️⃣ Tambah State + Fetch Data Tes Fisik

Cari baris `const [jurналLS, setJurnalLS] = useState...` (sekitar line 43), tambahin di bawahnya:

```tsx
// ── Tes Biomotorik (data 660 atlet Kab. Bogor) ──
const [tesFisikSummary, setTesFisikSummary] = useState<{
  hadir: number; total: number; avg: number; top: string; worst: string;
}|null>(null)

useEffect(() => {
  fetch(`/api/konida/tes-fisik?kontingen_id=${KONTINGEN_ID}`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      if (d) setTesFisikSummary({
        hadir: d.summary?.hadir || 0,
        total: d.summary?.total_atlet || 0,
        avg:   d.summary?.avg_fitness_persen || 0,
        top:   d.top_cabor?.[0]?.cabor_nama || '—',
        worst: d.komponen_overall?.[0]?.komponen || '—',
      })
    })
}, [])
```

---

## 3️⃣ Tambah Card #4 (Tes Biomotorik) di Grid Export

Cari blok `<div {...ani(40)} className="grid grid-cols-3 gap-5">` (sekitar line 384).

**UBAH GRID dari 3 kolom jadi 4 kolom**:

**SEBELUM:**
```tsx
<div {...ani(40)} className="grid grid-cols-3 gap-5">
```

**SESUDAH:**
```tsx
<div {...ani(40)} className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
```

Lalu cari closing `</div>` dari card terakhir (Sertifikat, sekitar line 539-540, sebelum `<div {...ani(100)}` yang Info roadmap). Tambah card baru di SITU, **SEBELUM** closing `</div>` grid:

```tsx
          {/* ──── CARD 4: TES BIOMOTORIK ──── */}
          <Link href="/konida/Premiumreport/kabbogor/tes-fisik"
            className="rounded-2xl p-5 flex flex-col relative overflow-hidden group transition-all hover:scale-[1.02]"
            style={{
              background:'linear-gradient(135deg, rgba(6,95,70,0.15) 0%, rgba(255,255,255,0.03) 100%)',
              border:'1px solid rgba(6,95,70,0.4)',
              boxShadow:'0 0 30px rgba(6,95,70,0.15)',
            }}>
            <div className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background:'linear-gradient(90deg,transparent,#065f46,transparent)' }}/>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:'rgba(6,95,70,0.25)', border:'1px solid rgba(6,95,70,0.4)' }}>
                <Activity size={22} style={{ color:'#10b981' }}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-zinc-100">Tes Biomotorik</h3>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background:'rgba(74,222,128,0.15)', color:'#4ade80' }}>UPI · LIVE</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    tesFisikSummary ? `${tesFisikSummary.hadir} tes` : '—',
                    tesFisikSummary ? `${tesFisikSummary.avg}% avg` : '—',
                  ].map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background:'rgba(6,95,70,0.15)', color:'#10b981' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed flex-1 mb-4">
              Laporan kondisi fisik atlet kontingen dari Sport Science FPOK UPI.
              Analisis 10 komponen biomotorik: Flexibility, Power, Aerobic, Speed, Strength, dll.
            </p>

            {tesFisikSummary && (
              <div className="rounded-xl p-3 mb-4 space-y-1.5"
                style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(6,95,70,0.2)' }}>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">Cabor Terkuat</span>
                  <span className="font-bold text-emerald-400 truncate ml-2 max-w-[110px]">{tesFisikSummary.top}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-zinc-500">Komponen Terlemah</span>
                  <span className="font-bold text-orange-400 truncate ml-2 max-w-[110px]">{tesFisikSummary.worst}</span>
                </div>
              </div>
            )}

            <div className="w-full py-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
              style={{ background:'rgba(6,95,70,0.2)', border:'1px solid rgba(6,95,70,0.45)', color:'#10b981' }}>
              <FileText size={14}/> LIHAT DETAIL LAPORAN
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-1"/>
            </div>
          </Link>
```

---

## ✅ Verifikasi

Setelah patch:
1. Buka `/konida/Premiumreport/kabbogor` — harus muncul card ke-4 (Tes Biomotorik) hijau di grid
2. Klik card → navigate ke `/konida/Premiumreport/kabbogor/tes-fisik` (detail page)
3. Card SPJ Bonus, Buku Hasil, Sertifikat — TIDAK BERUBAH (semua functionality existing aman)

## ⚠️ Catatan

- Card ke-4 ini bakal nampilin "—" sampai `/api/konida/tes-fisik` endpoint kepasang & data udah di-import
- Tes endpoint dulu pakai curl: `curl http://localhost:3000/api/konida/tes-fisik?kontingen_id=1`
- Kalau response 401/403, cek env `SUPABASE_SERVICE_KEY`
