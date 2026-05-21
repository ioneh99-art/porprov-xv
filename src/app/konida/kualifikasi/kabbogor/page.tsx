'use client'
// src/app/konida/kualifikasi/page.tsx
// Menu Kualifikasi (Kontrol Kuota & Tiket) - Tactical Zinc Theme

import { useState, useMemo, useEffect } from 'react'
import { 
  ShieldAlert, Download, Search, CheckCircle, 
  AlertTriangle, Users, Target, Lock, Unlock, XCircle, Award
} from 'lucide-react'

// ── TYPESCRIPT INTERFACES ────────────────────────────────
interface KuotaCabor {
  id: number;
  cabor: string;
  kuota_maksimal: number;
  lolos_bk: number;
  wildcard: number;
  gagal_bk: number;
}

interface AtletKualifikasi {
  id: number;
  nama_lengkap: string;
  cabor: string;
  nomor_tanding: string;
  status_kualifikasi: 'Lolos BK' | 'Wildcard' | 'Gagal BK' | 'Menunggu Hasil';
  skor_kualifikasi: string;
  peringkat: number;
}

// ── MOCK DATA (Simulasi dari tabel kuota_kualifikasi & kualifikasi_atlet) ──
const MOCK_KUOTA: KuotaCabor[] = [
  { id: 1, cabor: 'Dayung', kuota_maksimal: 12, lolos_bk: 10, wildcard: 2, gagal_bk: 4 },
  { id: 2, cabor: 'Akuatik', kuota_maksimal: 15, lolos_bk: 15, wildcard: 0, gagal_bk: 2 }, // Kuota Penuh (Terkunci)
  { id: 3, cabor: 'Bola Voli', kuota_maksimal: 14, lolos_bk: 14, wildcard: 0, gagal_bk: 0 }, // Kuota Penuh
  { id: 4, cabor: 'Sepak Bola', kuota_maksimal: 22, lolos_bk: 22, wildcard: 0, gagal_bk: 5 }, // Kuota Penuh
  { id: 5, cabor: 'Menembak', kuota_maksimal: 8, lolos_bk: 5, wildcard: 1, gagal_bk: 1 },
  { id: 6, cabor: 'Pencak Silat', kuota_maksimal: 10, lolos_bk: 11, wildcard: 0, gagal_bk: 3 }, // OVER QUOTA (Warning)
]

const MOCK_ATLET_KUALIFIKASI: AtletKualifikasi[] = [
  { id: 101, nama_lengkap: "Deni Firmansyah", cabor: "Dayung", nomor_tanding: "K-1 500m Putra", status_kualifikasi: "Lolos BK", skor_kualifikasi: "01:45.22", peringkat: 1 },
  { id: 102, nama_lengkap: "Putri Ayu", cabor: "Akuatik", nomor_tanding: "100m Gaya Bebas Putri", status_kualifikasi: "Lolos BK", skor_kualifikasi: "00:58.14", peringkat: 2 },
  { id: 103, nama_lengkap: "Budi Santoso", cabor: "Bola Voli", nomor_tanding: "Tim Putra Indoor", status_kualifikasi: "Wildcard", skor_kualifikasi: "-", peringkat: 0 },
  { id: 104, nama_lengkap: "Ahmad Fauzi", cabor: "Menembak", nomor_tanding: "10m Air Rifle Putra", status_kualifikasi: "Gagal BK", skor_kualifikasi: "580.4", peringkat: 15 },
  { id: 105, nama_lengkap: "Galih Purnama", cabor: "Sepak Bola", nomor_tanding: "Tim U-23 Putra", status_kualifikasi: "Menunggu Hasil", skor_kualifikasi: "Tahap Grup", peringkat: 0 },
]

export default function PageKualifikasi() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua')

  // Global KPI Calculation
  const kpi = useMemo(() => {
    let totalKuota = 0; let totalLolos = 0; let totalWildcard = 0;
    MOCK_KUOTA.forEach(c => {
      totalKuota += c.kuota_maksimal;
      totalLolos += c.lolos_bk;
      totalWildcard += c.wildcard;
    })
    return { totalKuota, totalTerpakai: totalLolos + totalWildcard, sisa: totalKuota - (totalLolos + totalWildcard) }
  }, [])

  // Filter Table
  const filteredAtlet = useMemo(() => {
    return MOCK_ATLET_KUALIFIKASI.filter(a => {
      const matchSearch = a.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || a.cabor.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'Semua' || a.status_kualifikasi === filterStatus
      return matchSearch && matchStatus
    })
  }, [search, filterStatus])

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"/>

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 p-6">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Target className="text-emerald-500" size={28}/> Kontrol Kuota & Kualifikasi
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">Sistem Eliminasi & Manajemen Tiket Babak Kualifikasi (BK)</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold transition-colors">
            <Download size={14} className="text-emerald-400"/> Export SK Kontingen
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-6">
        
        {/* ── KPI KUOTA GLOBAL ────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center shadow-lg">
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono mb-2 flex items-center gap-2"><Users size={14}/> Batas Kuota Kontingen</div>
            <div className="text-4xl font-light text-white">{kpi.totalKuota} <span className="text-sm text-zinc-600 font-mono">Atlet</span></div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center shadow-lg">
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono mb-2 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400"/> Tiket Terpakai (Lolos + Wildcard)</div>
            <div className="text-4xl font-light text-emerald-400">{kpi.totalTerpakai} <span className="text-sm text-emerald-900 font-mono">Tiket</span></div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center shadow-lg">
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono mb-2 flex items-center gap-2"><Unlock size={14} className="text-amber-500"/> Sisa Kuota Tersedia</div>
            <div className="text-4xl font-light text-amber-500">{kpi.sisa} <span className="text-sm text-amber-900 font-mono">Slot</span></div>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500/50"/>
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono mb-2 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500"/> Peringatan Kuota</div>
            <div className="text-4xl font-light text-rose-500">{MOCK_KUOTA.filter(c => (c.lolos_bk + c.wildcard) > c.kuota_maksimal).length} <span className="text-sm text-rose-900 font-mono">Cabor</span></div>
            <div className="mt-2 text-[9px] text-rose-400 font-mono uppercase bg-rose-500/10 px-2 py-1 rounded inline-block w-max">Melebihi Batas Maksimal</div>
          </div>
        </div>

        {/* ── PROGRESS BAR KUOTA PER CABOR ────────────────────── */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-5 uppercase tracking-widest">
            <Award className="text-emerald-500" size={16}/> Monitor Kuota Cabor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_KUOTA.map((c) => {
              const terpakai = c.lolos_bk + c.wildcard;
              const pct = (terpakai / c.kuota_maksimal) * 100;
              const isOver = terpakai > c.kuota_maksimal;
              const isFull = terpakai === c.kuota_maksimal;

              let barColor = 'bg-emerald-500';
              let bgColor = 'bg-emerald-500/10';
              let borderColor = 'border-emerald-500/20';
              let icon = <Unlock size={14} className="text-emerald-400"/>;

              if (isOver) {
                barColor = 'bg-rose-500'; bgColor = 'bg-rose-500/10'; borderColor = 'border-rose-500/30';
                icon = <AlertTriangle size={14} className="text-rose-500"/>;
              } else if (isFull) {
                barColor = 'bg-amber-500'; bgColor = 'bg-amber-500/10'; borderColor = 'border-amber-500/30';
                icon = <Lock size={14} className="text-amber-500"/>;
              }

              return (
                <div key={c.id} className={`p-4 rounded-xl border ${borderColor} ${bgColor} transition-all`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-bold text-zinc-100">{c.cabor}</div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-950/50 border border-zinc-800 text-[10px] font-mono">
                      {icon} {isOver ? 'OVER' : isFull ? 'LOCKED' : 'OPEN'}
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs font-mono mb-1.5 text-zinc-400">
                    <span>Terpakai: <strong className="text-white">{terpakai}</strong></span>
                    <span>Max: <strong className="text-white">{c.kuota_maksimal}</strong></span>
                  </div>
                  
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 mb-3">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }}/>
                  </div>

                  <div className="flex gap-2 text-[9px] font-mono text-zinc-500 uppercase">
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">Lolos BK: {c.lolos_bk}</span>
                    {c.wildcard > 0 && <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">Wildcard: {c.wildcard}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── TABEL ELIMINASI ATLET ─────────────────────────────── */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
              <ShieldAlert className="text-blue-500" size={16}/> Daftar Eliminasi Atlet
            </h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                <input 
                  type="text" placeholder="Cari Atlet / Cabor..." value={search} onChange={e=>setSearch(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 outline-none w-56 font-mono"
                />
              </div>
              <div className="flex bg-zinc-950 rounded-lg border border-zinc-800 p-0.5">
                {['Semua', 'Lolos BK', 'Wildcard', 'Gagal BK', 'Menunggu Hasil'].map(f => (
                  <button key={f} onClick={()=>setFilterStatus(f)}
                    className={`px-3 py-1 text-[10px] font-mono uppercase rounded-md transition-colors ${filterStatus===f ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-zinc-800/50 rounded-lg overflow-hidden bg-zinc-950/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800 text-[9px] uppercase tracking-widest text-zinc-500">
                  <th className="p-3 font-bold w-12 text-center">ID</th>
                  <th className="p-3 font-bold">Nama Atlet</th>
                  <th className="p-3 font-bold">Cabor & Nomor Tanding</th>
                  <th className="p-3 font-bold text-center">Peringkat / Skor</th>
                  <th className="p-3 font-bold text-center">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredAtlet.map(a => {
                  let badgeColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
                  if (a.status_kualifikasi === 'Lolos BK') badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  if (a.status_kualifikasi === 'Wildcard') badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  if (a.status_kualifikasi === 'Gagal BK') badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                  if (a.status_kualifikasi === 'Menunggu Hasil') badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                  return (
                    <tr key={a.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3 text-center text-[11px] font-mono text-zinc-600">{a.id}</td>
                      <td className="p-3 font-bold text-sm text-zinc-200">{a.nama_lengkap}</td>
                      <td className="p-3">
                        <div className="font-bold text-zinc-300">{a.cabor}</div>
                        <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{a.nomor_tanding}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-sm font-bold text-white">{a.peringkat > 0 ? `#${a.peringkat}` : '-'}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{a.skor_kualifikasi}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                          {a.status_kualifikasi}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredAtlet.length === 0 && (
              <div className="p-8 text-center text-zinc-600 font-mono text-sm">Tidak ada data atlet di babak kualifikasi.</div>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}