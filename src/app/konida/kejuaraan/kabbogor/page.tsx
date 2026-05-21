'use client'
// src/app/konida/kejuaraan/kabbogor/page.tsx
// Menu Kejuaraan & Track Record (Grouping Cabor & Executive Summary)

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Trophy, Search, TrendingUp, Medal, 
  Calendar, MapPin, ChevronRight, Award, Flame, 
  Crosshair, Zap, Loader2, Users, User, 
  ChevronDown, Star, AlertTriangle
} from 'lucide-react'

// ── INISIALISASI SUPABASE ────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// ── TYPESCRIPT INTERFACES ────────────────────────────────
interface Atlet {
  id: number;
  nama_lengkap: string;
  cabor_nama_raw: string;
  gender: string;
  tgl_lahir: string;
}

interface TrackRecord {
  id: number;
  event: string;
  tahun: number;
  lokasi: string;
  nomor_tanding: string;
  hasil: 'Emas' | 'Perak' | 'Perunggu' | 'Peringkat 4' | 'Peringkat 5';
  catatan_waktu: string;
}

interface PerformanceStats {
  speed: number; power: number; stamina: number; mentality: number; technique: number;
}

// ── DUMMY DATA GENERATOR ─────────────────────────────────
const generateDummyStats = (): PerformanceStats => ({
  speed: Math.floor(Math.random() * 30) + 70,     
  power: Math.floor(Math.random() * 30) + 70,
  stamina: Math.floor(Math.random() * 20) + 80,   
  mentality: Math.floor(Math.random() * 15) + 85, 
  technique: Math.floor(Math.random() * 25) + 75,
})

const EVENT_NAMES = ['Kejuaraan Daerah Jabar', 'Sirkuit Nasional Seri II', 'PON XX Papua', 'Pra-PORPROV Jabar']
const LOCATIONS = ['Bandung', 'Jakarta', 'Jayapura', 'Cirebon']

const generateDummyTrackRecord = (cabor: string): TrackRecord[] => {
  const records: TrackRecord[] = []
  const numEvents = Math.floor(Math.random() * 3) + 1 
  let currentYear = 2025

  for (let i = 0; i < numEvents; i++) {
    const hasilRandom = Math.random()
    let hasil: TrackRecord['hasil'] = 'Peringkat 5'
    if (hasilRandom > 0.8) hasil = 'Emas'
    else if (hasilRandom > 0.6) hasil = 'Perak'
    else if (hasilRandom > 0.4) hasil = 'Perunggu'

    records.push({
      id: i + 1, event: EVENT_NAMES[Math.floor(Math.random() * EVENT_NAMES.length)],
      tahun: currentYear--, lokasi: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      nomor_tanding: `Kategori Utama ${cabor}`, hasil: hasil,
      catatan_waktu: hasil === 'Emas' ? 'Personal Best (PB)' : 'Sesuai Target'
    })
  }
  return records
}

// ── HELPER FUNCTIONS ─────────────────────────────────────
const hitungUmur = (tgl_lahir: string) => {
  if (!tgl_lahir) return '-'
  const diff = Date.now() - new Date(tgl_lahir).getTime()
  return Math.abs(new Date(diff).getUTCFullYear() - 1970)
}

const MEDAL_COLORS = {
  'Emas': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Perak': 'bg-slate-300/20 text-slate-300 border-slate-300/30',
  'Perunggu': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Peringkat 4': 'bg-zinc-800 text-zinc-400 border-zinc-700',
  'Peringkat 5': 'bg-zinc-800 text-zinc-400 border-zinc-700',
}

// ── MAIN COMPONENT ───────────────────────────────────────
export default function PageKejuaraanAtlet() {
  const [dataAtlet, setDataAtlet] = useState<(Atlet & { stats: PerformanceStats, history: TrackRecord[], isElite: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedAtlet, setSelectedAtlet] = useState<(Atlet & { stats: PerformanceStats, history: TrackRecord[], isElite: boolean }) | null>(null)
  const [expandedCabor, setExpandedCabor] = useState<string | null>(null)

  // Fetch Data & Generate Enrichment
  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('atlet')
          .select('id, nama_lengkap, cabor_nama_raw, gender, tgl_lahir')
          .eq('status_registrasi', 'Verified') 
          .limit(100) 

        if (error) throw error

        if (data) {
          const enrichedData = data.map(a => {
            const history = generateDummyTrackRecord(a.cabor_nama_raw || 'Umum')
            const isElite = history.some(h => h.hasil === 'Emas') // Syarat atlet prioritas: Punya medali Emas
            return { ...a, stats: generateDummyStats(), history, isElite }
          })
          setDataAtlet(enrichedData)
          if (enrichedData.length > 0) {
            setSelectedAtlet(enrichedData[0])
            setExpandedCabor(enrichedData[0].cabor_nama_raw || 'Umum')
          }
        }
      } catch (error) { console.error("Error fetching:", error) } 
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  // 1. Hitung Kesimpulan (Executive Summary) di atas page
  const kpi = useMemo(() => {
    let totalEmas = 0; let totalPerak = 0; let atletPrioritas = 0;
    const caborTally: Record<string, number> = {}

    dataAtlet.forEach(a => {
      if (a.isElite) atletPrioritas++
      a.history.forEach(h => {
        if (h.hasil === 'Emas') {
          totalEmas++
          const cabor = a.cabor_nama_raw || 'Umum'
          caborTally[cabor] = (caborTally[cabor] || 0) + 1
        }
        if (h.hasil === 'Perak') totalPerak++
      })
    })

    // Cari Cabor penyumbang emas terbanyak
    let topCabor = 'Belum Ada'
    let maxEmas = 0
    Object.entries(caborTally).forEach(([cabor, count]) => {
      if (count > maxEmas) { maxEmas = count; topCabor = cabor }
    })

    return { totalEmas, totalPerak, atletPrioritas, topCabor, maxEmas }
  }, [dataAtlet])

  // 2. Grouping per Cabor & Sorting (Elit di atas)
  const groupedAtlet = useMemo(() => {
    let filtered = dataAtlet
    if (search) {
      filtered = dataAtlet.filter(a => a.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || (a.cabor_nama_raw && a.cabor_nama_raw.toLowerCase().includes(search.toLowerCase())))
    }

    const groups: Record<string, typeof dataAtlet> = {}
    filtered.forEach(a => {
      const cabor = a.cabor_nama_raw || 'Umum'
      if (!groups[cabor]) groups[cabor] = []
      groups[cabor].push(a)
    })

    // Sort atlet di dalam tiap grup: Yang "Elit" (punya medali emas) ditaruh di atas
    Object.keys(groups).forEach(cabor => {
      groups[cabor].sort((a, b) => (a.isElite === b.isElite) ? 0 : a.isElite ? -1 : 1)
    })

    return groups
  }, [dataAtlet, search])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-emerald-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-mono text-xs tracking-widest uppercase">Menganalisa Riwayat Prestasi...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans relative flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a15_1px,transparent_1px),linear-gradient(to_bottom,#27272a15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"/>

      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 p-6 shadow-md">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Trophy className="text-emerald-500" size={28}/> Basis Data Prestasi Atlet
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">Sistem Pemetaan Kekuatan & Riwayat Medali (APMS)</p>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input 
              type="text" placeholder="Cari Nama / Cabor..." value={search} onChange={e=>setSearch(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 focus:border-emerald-500 outline-none w-72 font-mono transition-colors"
            />
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 flex flex-col gap-6">
        
        {/* ── EXECUTIVE SUMMARY (ALERT & KESIMPULAN) ──────────── */}
        <div className="grid grid-cols-4 gap-4">
          {/* Card 1: Alert Info */}
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4 flex gap-3 items-start col-span-1 shadow-lg">
            <AlertTriangle className="text-emerald-400 mt-1 flex-shrink-0" size={20}/>
            <div>
              <h3 className="text-emerald-400 font-bold text-sm mb-1">Status Kekuatan Daerah</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Menampilkan rekam jejak atlet. Sistem otomatis menandai <strong>Atlet Prioritas (Elit)</strong> berdasarkan raihan medali emas pada event resmi sebelumnya.
              </p>
            </div>
          </div>

          {/* Card 2: Atlet Prioritas */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden">
            <Flame className="absolute -right-4 -bottom-4 text-zinc-800/50" size={80}/>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Total Atlet Elit / Prioritas</div>
            <div className="text-3xl font-light text-white">{kpi.atletPrioritas} <span className="text-sm text-zinc-500">Atlet</span></div>
            <div className="text-[10px] text-amber-500 font-bold mt-1 uppercase">Telah di-mapping sistem</div>
          </div>

          {/* Card 3: Histori Medali */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Akumulasi Medali Historis</div>
            <div className="flex items-end gap-3">
              <div><span className="text-3xl font-light text-amber-400">{kpi.totalEmas}</span> <span className="text-[10px] text-amber-500 uppercase font-bold">Emas</span></div>
              <div className="mb-1"><span className="text-xl font-light text-slate-300">{kpi.totalPerak}</span> <span className="text-[10px] text-slate-400 uppercase font-bold">Perak</span></div>
            </div>
          </div>

          {/* Card 4: Cabor Unggulan */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Cabor Penyumbang Terbesar</div>
            <div className="text-xl font-bold text-emerald-400 truncate">{kpi.topCabor}</div>
            <div className="text-[10px] text-zinc-400 mt-1"><strong className="text-white">{kpi.maxEmas} Medali Emas</strong> tercatat di sistem.</div>
          </div>
        </div>

        {/* ── MASTER-DETAIL AREA ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          
          {/* LEFT PANE: MASTER LIST ATLET (GROUPED BY CABOR) */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-lg h-full">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-2">
                <Award size={14} className="text-emerald-500"/> Mapping Atlet per Cabor
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              {Object.entries(groupedAtlet).map(([cabor, atlets]) => {
                const isExpanded = expandedCabor === cabor
                const eliteCount = atlets.filter(a => a.isElite).length

                return (
                  <div key={cabor} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/30">
                    {/* Cabor Header */}
                    <div 
                      className="p-3 bg-zinc-900/80 flex items-center justify-between cursor-pointer hover:bg-zinc-800/80 transition-colors"
                      onClick={() => setExpandedCabor(isExpanded ? null : cabor)}
                    >
                      <div>
                        <div className="font-bold text-sm text-zinc-200">{cabor}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{atlets.length} Terdata {eliteCount > 0 && `• ${eliteCount} Prioritas`}</div>
                      </div>
                      <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-180 text-emerald-500' : ''}`}/>
                    </div>

                    {/* Cabor Atlet List */}
                    {isExpanded && (
                      <div className="p-2 space-y-1 bg-zinc-950/50">
                        {atlets.map(a => (
                          <div 
                            key={a.id} onClick={() => setSelectedAtlet(a)}
                            className={`p-2.5 rounded-lg cursor-pointer transition-all border flex items-center justify-between group ${selectedAtlet?.id === a.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-transparent border-transparent hover:bg-zinc-800/50'}`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Indikator Prioritas / Non-Prioritas */}
                              {a.isElite ? (
                                <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center border border-amber-500/30"><Flame size={12} className="text-amber-500"/></div>
                              ) : (
                                <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center border border-zinc-700"><User size={12} className="text-zinc-500"/></div>
                              )}
                              
                              <div>
                                <div className={`font-bold text-xs ${selectedAtlet?.id === a.id ? 'text-emerald-400' : a.isElite ? 'text-amber-100' : 'text-zinc-300'}`}>
                                  {a.nama_lengkap}
                                </div>
                                {a.isElite && <div className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">Prioritas</div>}
                              </div>
                            </div>
                            <ChevronRight size={14} className={`${selectedAtlet?.id === a.id ? 'text-emerald-500' : 'text-zinc-700 opacity-0 group-hover:opacity-100'}`}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {Object.keys(groupedAtlet).length === 0 && (
                <div className="text-center p-8 text-zinc-600 font-mono text-xs">Data tidak ditemukan.</div>
              )}
            </div>
          </div>

          {/* RIGHT PANE: DOSSIER PRESTASI (Sama seperti sebelumnya) */}
          <div className="col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-lg h-full relative">
            {selectedAtlet ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                
                {/* Profile Header */}
                <div className="relative p-6 border-b border-zinc-800 bg-zinc-950/50 overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5"><Award size={120} className="text-emerald-500"/></div>
                  <div className="relative z-10 flex gap-5 items-center">
                    <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center shadow-xl ${selectedAtlet.isElite ? 'bg-amber-500/10 border-amber-500/50' : 'bg-zinc-800 border-zinc-700'}`}>
                      {selectedAtlet.isElite ? <Flame size={32} className="text-amber-500"/> : <User size={32} className="text-zinc-500"/>}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-black text-white">{selectedAtlet.nama_lengkap}</h2>
                        {selectedAtlet.isElite && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold uppercase rounded flex items-center gap-1">
                            <Star size={10}/> Atlet Elit Prioritas
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5"><Crosshair size={12} className="text-emerald-500"/> Cabor: <strong className="text-zinc-200">{selectedAtlet.cabor_nama_raw}</strong></span>
                        <span>Usia: <strong className="text-zinc-200">{hitungUmur(selectedAtlet.tgl_lahir)} Thn</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* KIRI: Matriks Performa */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Medal size={14}/> Rekapitulasi Medali</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {['Emas', 'Perak', 'Perunggu'].map((m) => {
                          const count = selectedAtlet.history.filter(h => h.hasil === m).length
                          const colors = m === 'Emas' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : m === 'Perak' ? 'bg-slate-300/10 border-slate-300/30 text-slate-300' : 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                          return (
                            <div key={m} className={`p-3 rounded-xl border flex flex-col items-center justify-center ${colors}`}>
                              <div className="text-2xl font-light mb-1">{count}</div>
                              <div className="text-[9px] uppercase font-bold tracking-wider">{m}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14}/> Indeks Kinerja Atlet</h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Kecepatan (Speed)', val: selectedAtlet.stats.speed },
                          { label: 'Kekuatan (Power)', val: selectedAtlet.stats.power },
                          { label: 'Daya Tahan (Stamina)', val: selectedAtlet.stats.stamina },
                          { label: 'Mental Tanding', val: selectedAtlet.stats.mentality },
                        ].map(stat => (
                          <div key={stat.label}>
                            <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                              <span>{stat.label}</span>
                              <span className="text-emerald-400 font-bold">{stat.val}/100</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stat.val}%` }}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* KANAN: Timeline Event */}
                  <div>
                    <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14}/> Riwayat Kompetisi Resmi</h3>
                    <div className="relative border-l border-zinc-800 ml-3 space-y-4">
                      {selectedAtlet.history.map((hist) => {
                        const colorClass = MEDAL_COLORS[hist.hasil] || MEDAL_COLORS['Peringkat 5']
                        return (
                          <div key={hist.id} className="relative pl-5">
                            <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-[#09090b] ${hist.hasil === 'Emas' ? 'bg-amber-500' : 'bg-emerald-500'}`}/>
                            <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="text-xs font-bold text-zinc-100">{hist.event}</div>
                                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5 flex items-center gap-2">
                                    <span className="flex items-center gap-1"><Calendar size={8}/> {hist.tahun}</span>
                                    <span className="flex items-center gap-1"><MapPin size={8}/> {hist.lokasi}</span>
                                  </div>
                                </div>
                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${colorClass}`}>
                                  {hist.hasil}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                <Trophy size={48} className="mb-4 opacity-20"/>
                <p className="font-mono text-sm">Pilih atlet untuk melihat rekam jejak prestasinya.</p>
              </div>
            )}
          </div>

        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
      `}</style>
    </div>
  )
}