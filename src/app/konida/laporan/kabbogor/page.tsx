'use client'
// src/app/konida/laporan/page.tsx
// Menu Laporan Terpadu (Administrative & Logistics) - Tactical Zinc Theme

import { useState, useMemo } from 'react'
import { 
  FileText, Download, Printer, Shirt, Users, 
  CreditCard, ShieldCheck, ChevronRight, FileSearch,
  PieChart, BarChart, Loader2, CheckCircle
} from 'lucide-react'

// ── TYPESCRIPT INTERFACES ────────────────────────────────
interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'Admin' | 'Logistik' | 'Keuangan' | 'Audit';
  lastGenerated: string;
}

// ── MOCK DATA LAPORAN ───────────────────────────────────
const REPORTS: ReportCard[] = [
  { id: 'sk-kontingen', title: 'Rekapitulasi SK Kontingen', description: 'Daftar seluruh atlet dan pelatih lolos verifikasi untuk lampiran SK Bupati.', icon: Users, category: 'Admin', lastGenerated: '24 Mei 2026' },
  { id: 'logistik-apparel', title: 'RAB Logistik & Apparel', description: 'Rekapitulasi ukuran kemeja, jaket, dan sepatu seluruh anggota kontingen.', icon: Shirt, category: 'Logistik', lastGenerated: '22 Mei 2026' },
  { id: 'distribusi-bonus', title: 'Daftar Rekening & Keuangan', description: 'Data bank dan nomor rekening atlet untuk keperluan uang saku dan bonus.', icon: CreditCard, category: 'Keuangan', lastGenerated: '20 Mei 2026' },
  { id: 'audit-nik', title: 'Laporan Integritas NIK', description: 'Analisa persentase atlet asli Kabupaten Bogor vs atlet luar wilayah.', icon: ShieldCheck, category: 'Audit', lastGenerated: 'Sekarang' },
]

export default function PageLaporan() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'Semua' | 'Admin' | 'Logistik' | 'Keuangan' | 'Audit'>('Semua')

  const handleGenerate = (id: string) => {
    setGenerating(id)
    setTimeout(() => {
      setGenerating(null)
      alert(`Laporan ${id} berhasil di-generate dan siap di-download (Simulasi).`)
    }, 2000)
  }

  const filteredReports = REPORTS.filter(r => activeTab === 'Semua' || r.category === activeTab)

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"/>

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 p-6 shadow-md">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <FileSearch className="text-emerald-500" size={28}/> Pusat Laporan Kontingen
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">Otomatisasi Dokumen & Rekapitulasi Data Terintegrasi</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-zinc-950 rounded-lg border border-zinc-800 p-1">
              {['Semua', 'Admin', 'Logistik', 'Keuangan', 'Audit'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === tab ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-8">
        
        {/* ── SECTION 1: QUICK ANALYTICS PREVIEW ──────────────── */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col shadow-lg">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><PieChart size={14}/> Status Dokumen</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">92% Lengkap</span>
             </div>
             <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-emerald-500 w-[92%]"/>
             </div>
             <p className="text-xs text-zinc-500">Hampir seluruh atlet telah melengkapi berkas administrasi.</p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col shadow-lg">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><BarChart size={14}/> Kesiapan Logistik</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 font-mono">65% Terdata</span>
             </div>
             <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-amber-500 w-[65%]"/>
             </div>
             <p className="text-xs text-zinc-500">Ukuran apparel beberapa cabor baru masih dalam tahap pengumpulan.</p>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between shadow-lg">
             <div>
                <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Update Terakhir Laporan</div>
                <div className="text-xl font-bold text-white tracking-tight">H-32 Menuju PORPROV</div>
                <div className="text-[10px] text-emerald-600 font-mono mt-1">Sinkronisasi data otomatis aktif</div>
             </div>
             <CheckCircle size={40} className="text-emerald-500/40"/>
          </div>
        </div>

        {/* ── SECTION 2: REPORT CARDS GRID ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReports.map((report) => {
            const Icon = report.icon
            const isGenerating = generating === report.id

            return (
              <div 
                key={report.id} 
                className="group relative bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300 shadow-lg flex items-start gap-6 overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <Icon size={120} />
                </div>

                <div className={`p-4 rounded-xl bg-zinc-950 border border-zinc-800 group-hover:border-emerald-500/30 transition-colors`}>
                  <Icon size={32} className="text-emerald-500"/>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[2px]">{report.category}</span>
                    <span className="text-[10px] font-mono text-zinc-600 italic">Terakhir: {report.lastGenerated}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{report.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-6">{report.description}</p>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleGenerate(report.id)}
                      disabled={isGenerating}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${isGenerating ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'}`}
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                      {isGenerating ? 'GENERATING...' : 'DOWNLOAD EXCEL'}
                    </button>
                    <button className="px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all">
                      <Printer size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── SECTION 3: QUICK VIEW LOG ───────────────────────── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 shadow-xl">
           <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={14}/> Log Aktivitas Dokumen</h2>
           <div className="space-y-3">
              {[
                { time: '10:45', user: 'Admin Bogor', action: 'Generate SK Kontingen', status: 'Success' },
                { time: '09:12', user: 'Admin Bogor', action: 'Update Data Ukuran Kemeja', status: 'Success' },
                { time: 'Kemarin', user: 'Sistem', action: 'Sinkronisasi NIK Pusat', status: 'Success' },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] font-mono p-2 border-b border-zinc-800/50">
                  <div className="flex gap-4">
                    <span className="text-zinc-600">{log.time}</span>
                    <span className="text-emerald-500 font-bold">{log.user}</span>
                    <span className="text-zinc-300">{log.action}</span>
                  </div>
                  <span className="text-emerald-400 bg-emerald-500/10 px-1.5 rounded">{log.status}</span>
                </div>
              ))}
           </div>
        </div>

      </main>
    </div>
  )
}