'use client'
// src/app/konida/exportpdf/page.tsx
// Menu Export PDF & Data Gateway (Bulk Processing Hub) - Tactical Zinc Theme

import { useState, useMemo } from 'react'
import { 
  FileText, Download, UploadCloud, Database, AlertCircle, 
  CheckCircle2, Loader2, RefreshCw, Sliders, ShieldAlert,
  FileCheck, FileSpreadsheet, ArrowRight
} from 'lucide-react'

// ── TYPESCRIPT INTERFACES ────────────────────────────────
interface QueueTask {
  id: string;
  target: string;
  tipe: 'Export' | 'Import';
  format: 'PDF' | 'EXCEL';
  progress: number;
  status: 'Proses' | 'Selesai' | 'Gagal';
  Estimasi: string;
}

// ── MOCK DATA ANTRIAN DATA MASSAL ────────────────────────
const INITIAL_TASKS: QueueTask[] = [
  { id: 'TASK-004', target: 'Seluruh Database Atlet Kab. Bogor', tipe: 'Export', format: 'PDF', progress: 100, status: 'Selesai', Estimasi: '0 detik' },
  { id: 'TASK-003', target: 'Format Pendaftaran Kolektif Cabor Dayung', tipe: 'Import', format: 'EXCEL', progress: 100, status: 'Selesai', Estimasi: '0 detik' },
  { id: 'TASK-002', target: 'Rekapitulasi Ukuran Sepatu & Baju Kontingen', tipe: 'Export', format: 'EXCEL', progress: 100, status: 'Selesai', Estimasi: '0 detik' },
]

export default function PageDataGateway() {
  const [tasks, setTasks] = useState<QueueTask[]>(INITIAL_TASKS)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Jalur Pintas Export Massal
  const triggerBatchExport = (id: string, target: string, format: 'PDF' | 'EXCEL') => {
    setIsProcessing(id)
    
    // Tambah task baru ke antrian dengan status proses
    const newTask: QueueTask = {
      id: `TASK-00${tasks.length + 1}`,
      target,
      tipe: 'Export',
      format,
      progress: 10,
      status: 'Proses',
      Estimasi: 'Menghitung...'
    }
    setTasks(prev => [newTask, ...prev])

    // Simulasi Progress Jalur Tol Data
    let currentProgress = 10
    const interval = setInterval(() => {
      currentProgress += 30
      setTasks(prev => prev.map(t => t.id === newTask.id ? { 
        ...t, 
        progress: Math.min(currentProgress, 100),
        status: currentProgress >= 100 ? 'Selesai' : 'Proses',
        Estimasi: currentProgress >= 100 ? '0 detik' : 'Mengekstrak...'
      } : t))

      if (currentProgress >= 100) {
        clearInterval(interval)
        setIsProcessing(null)
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"/>

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 p-6 shadow-md">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Database className="text-emerald-500" size={28}/> Jalur Tol Data & Export PDF
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">Shortcut Sinkronisasi Massal & Generator Dokumen Kontingen</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono">
            <RefreshCw size={12} className="text-emerald-400 animate-spin"/> ENGINE STATUS: ONLINE
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-6">
        
        {/* ── BAGIAN 1: EXECUTIVE ALERT / SUMMARY (BIAR INFORMATIF) ── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-lg">
          {/* Kolom Info Utama */}
          <div className="flex gap-3 items-start col-span-1 md:border-r border-zinc-800 pr-4">
            <ShieldAlert className="text-emerald-500 mt-0.5 flex-shrink-0" size={20}/>
            <div>
              <h3 className="text-white font-bold text-sm mb-1">Pusat Gateway Data</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Menu ini dirancang sebagai **Shortcut Bypass**. Digunakan untuk memotong birokrasi input manual jika ada data eksternal berskala besar masuk ke sistem.
              </p>
            </div>
          </div>

          {/* KPI Status Sinkronisasi */}
          <div className="flex flex-col justify-center px-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Kapasitas Maksimal Pemrosesan</div>
            <div className="text-2xl font-bold text-white tracking-tight">50,000 <span className="text-xs text-zinc-500 font-mono">Baris Data / Detik</span></div>
            <div className="text-[9px] text-emerald-400 font-bold mt-1 uppercase">Optimasi Database Aktif</div>
          </div>

          {/* Status Antrian */}
          <div className="flex flex-col justify-center px-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Integritas File Keluaran</div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">100% Verified</div>
            <div className="text-[9px] text-zinc-500 font-mono mt-1">Sesuai Standar Formasi KONI Jawa Barat</div>
          </div>
        </div>

        {/* ── BAGIAN 2: DATA GATEWAY OPERATIONS (DETAIL ATAS) ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* JALUR 1: BULK INGESTION (SHORTCUT INPUT MASSAL VIA EXCEL) */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono mb-4">
                <UploadCloud size={16} className="text-emerald-500"/> Jalur Tol Input (Bulk Ingestion)
              </div>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                Punya data susulan 500 atlet dari pengurus pusat? Jangan ketik satu-satu. Jatuhkan file Excel resmi KONI di bawah ini, sistem akan otomatis memecah data dan memasukkannya ke cabor masing-masing.
              </p>
            </div>

            {/* Simulated Dropzone */}
            <div 
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all ${dragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); alert('File Excel terdeteksi! Memulai ekstraksi data shortcut...') }}
            >
              <FileSpreadsheet size={40} className="text-zinc-600 mb-3 group-hover:text-emerald-500"/>
              <div className="text-sm font-bold text-zinc-300 mb-1">Seret & Lepas File Excel Registrasi</div>
              <div className="text-[10px] font-mono text-zinc-600">Mendukung format .XLSX / .CSV standar KONI Jabar</div>
            </div>
          </div>

          {/* JALUR 2: BATCH GENERATOR (SHORTCUT EXPORT PRINTING) */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono mb-4">
                <Sliders size={16} className="text-blue-500"/> Jalur Cepat Cetak (Batch Generator)
              </div>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                Butuh cetak seluruh dokumen fisik kontingen Kabupaten Bogor untuk keperluan pendaftaran fisik di Provinsi? Gunakan tombol *shortcut* di bawah untuk memproses ribuan data sekaligus.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={() => triggerBatchExport('EXP-ALL', 'Cetak Buku Kontingen Lengkap', 'PDF')}
                disabled={isProcessing !== null}
                className="w-full flex items-center justify-between p-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20"><FileText size={16}/></div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-zinc-200 group-hover:text-white">Batch Export Seluruh Dokumen Atlet (PDF)</div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Menggabungkan KTP, KK, & Pas Foto menjadi 1 Buku Kontingen</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-zinc-600 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1"/>
              </button>

              <button 
                onClick={() => triggerBatchExport('EXP-XLS', 'Cetak Database Verifikasi Atlet', 'EXCEL')}
                disabled={isProcessing !== null}
                className="w-full flex items-center justify-between p-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20"><FileSpreadsheet size={16}/></div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-zinc-200 group-hover:text-white">Master Dump Database Atlet (Excel)</div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Ekspor seluruh baris tabel atlet, logistik, dan rekening finansial</div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-zinc-600 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1"/>
              </button>
            </div>
          </div>

        </div>

        {/* ── BAGIAN 3: INTERACTIVE CONSOLE / PROCESSING LOGS (DETAIL BAWAH) ── */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileCheck size={14}/> Monitor Antrian & Log Aktivitas Engine
          </h2>

          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/50">
            <div className="p-3 bg-zinc-900 border-b border-zinc-800 grid grid-cols-5 text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
              <div className="col-span-2">Target Data / Operasi</div>
              <div className="text-center">Format</div>
              <div className="text-center">Status Pemrosesan</div>
              <div className="text-right">Sisa Waktu</div>
            </div>

            <div className="divide-y divide-zinc-800/50">
              {tasks.map(t => (
                <div key={t.id} className="p-4 grid grid-cols-1 md:grid-cols-5 items-center text-xs font-mono">
                  
                  {/* Target Description */}
                  <div className="col-span-2">
                    <div className="font-bold text-zinc-200 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${t.tipe === 'Export' ? 'bg-blue-500' : 'bg-amber-500'}`}/>
                      [{t.id}] {t.target}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1 uppercase">Aksi: {t.tipe} Massal</div>
                  </div>

                  {/* Format Badge */}
                  <div className="text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${t.format === 'PDF' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {t.format}
                    </span>
                  </div>

                  {/* Progress / Status */}
                  <div className="flex flex-col items-center px-4">
                    {t.status === 'Proses' ? (
                      <div className="w-full space-y-1.5 flex flex-col items-center">
                        <div className="flex justify-between w-full text-[10px] text-zinc-500">
                          <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin text-blue-400"/> Memproses...</span>
                          <span>{t.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${t.progress}%` }}/>
                        </div>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 text-[10px] font-bold uppercase">
                        <CheckCircle2 size={12}/> COMPLETED
                      </span>
                    )}
                  </div>

                  {/* Estimated Time Remaining */}
                  <div className="text-right text-zinc-500 font-bold">
                    {t.Estimasi}
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}