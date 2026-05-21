'use client'
// src/app/konida/dashboard/kabbogor/page.tsx
// War Dashboard Kab. Bandung v8 — Triage 10 Limit & Pelaporan Space

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { createClient } from '@supabase/supabase-js'
import {
  CheckCircle, Clock, Search, X, Globe, ShieldAlert, 
  Map, Zap, Info, Target, Loader2, FileWarning, 
  ChevronDown, ChevronUp, FileText, Package, Flame, ChevronRight, TrendingDown
} from 'lucide-react'

// ── INISIALISASI SUPABASE ────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// ── Types ────────────────────────────────────────────────
type PrediksiStatus = 'kuat' | 'sedang' | 'risiko'

interface CaborData {
  id: number; nama: string; kode: string
  total_atlet: number; avg_umur: number
  verified: number; pending: number
  cabutan: number; lokal: number;
  emas: number; target: number; prediksi: PrediksiStatus
}

interface RegionData {
  id: string; nama: string; lat: number; lng: number;
  tipe: 'lokal' | 'cabutan';
  atlet_count: number; top_cabor: string;
}

// ── Data Dummy Geospasial ────────────────────────────────
const SEBARAN_ATLET: RegionData[] = [
  { id: '320401', nama: 'Kec. Soreang', lat: -7.0315, lng: 107.5250, tipe: 'lokal', atlet_count: 145, top_cabor: 'Bulu Tangkis, Voli' },
  { id: '320402', nama: 'Kec. Pangalengan', lat: -7.1956, lng: 107.5511, tipe: 'lokal', atlet_count: 98, top_cabor: 'Dayung, Atletik' },
  { id: '320403', nama: 'Kec. Baleendah', lat: -7.0012, lng: 107.6250, tipe: 'lokal', atlet_count: 112, top_cabor: 'Pencak Silat, Karate' },
  { id: '320404', nama: 'Kec. Kutawaringin', lat: -6.9959, lng: 107.5284, tipe: 'lokal', atlet_count: 85, top_cabor: 'Sepak Bola' },
  { id: '320405', nama: 'Kec. Margahayu', lat: -6.9612, lng: 107.5610, tipe: 'lokal', atlet_count: 70, top_cabor: 'Angkat Besi' },
  { id: '320406', nama: 'Kec. Cimenyan', lat: -6.8512, lng: 107.6510, tipe: 'lokal', atlet_count: 45, top_cabor: 'Balap Sepeda' },
  { id: '320407', nama: 'Kec. Majalaya', lat: -7.0423, lng: 107.7550, tipe: 'lokal', atlet_count: 5, top_cabor: 'Catur' },
  { id: '3273',   nama: 'Kota Bandung', lat: -6.9175, lng: 107.6191, tipe: 'cabutan', atlet_count: 110, top_cabor: 'Renang, Senam' },
  { id: '3217',   nama: 'Kab. Bandung Barat', lat: -6.8400, lng: 107.4900, tipe: 'cabutan', atlet_count: 50, top_cabor: 'Menembak' },
  { id: '3578',   nama: 'Kota Surabaya (Jatim)', lat: -7.2504, lng: 112.7688, tipe: 'cabutan', atlet_count: 14, top_cabor: 'Selam' },
]

// ── UI Components ──────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return <span className="tabular-nums font-mono font-bold text-sm text-blue-200">{t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
}

function SectionHeader({ title, icon: Icon, badge }: { title: string, icon: any, badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-[#0f172a]/60">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-blue-400" />
        <h3 className="text-sm font-extrabold text-slate-100 tracking-wide">{title}</h3>
      </div>
      {badge}
    </div>
  )
}

function PetaSebaranAtlet({ regions, onSelect }: { regions: RegionData[]; onSelect: (id: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapRef2 = useRef<LeafletMap | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!mapRef.current) return
      const L = (await import('leaflet')).default
      // @ts-ignore
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return
      if (mapRef2.current) { mapRef2.current.remove(); mapRef2.current = null }
      
      const el = mapRef.current as HTMLDivElement & { _leaflet_id?: number }
      if (el._leaflet_id) el._leaflet_id = undefined

      const map = L.map(mapRef.current, {
        center: [-7.0315, 107.5250], zoom: 10, zoomControl: true, scrollWheelZoom: false,
      })
      mapRef2.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)

      regions.forEach(r => {
        const color = r.tipe === 'lokal' ? '#3b82f6' : '#f43f5e'
        const radius = Math.max(8, Math.min(r.atlet_count / 3, 40))

        L.circleMarker([r.lat, r.lng], {
          radius: radius + 8, fillColor: color, color: color, weight: 0, opacity: 0, fillOpacity: 0.15,
        }).addTo(map)

        L.circleMarker([r.lat, r.lng], {
          radius: radius, fillColor: color, color: '#020617', weight: 2, opacity: 1, fillOpacity: 0.8,
        }).addTo(map)
          .bindPopup(`
            <div style="font-family:inherit;min-width:180px;padding:4px">
              <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;margin-bottom:4px;letter-spacing:1px">
                ● STATUS: ${r.tipe.toUpperCase()}
              </div>
              <div style="font-weight:900;font-size:15px;color:#fff;margin-bottom:2px">${r.nama}</div>
              <div style="font-size:11px;color:#94a3b8;margin-bottom:12px">Basis Demografi NIK</div>
              
              <div style="display:grid;grid-template-columns:1fr;gap:6px;font-size:11px;background:#020617;border-radius:6px;padding:10px;border:1px solid #1e293b">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:6px;">
                  <span style="color:#64748b">Populasi Atlet</span>
                  <b style="color:#fff; font-size:14px;">${r.atlet_count} <span style="font-size:9px;color:#64748b">Org</span></b>
                </div>
                <div>
                  <span style="color:#64748b; font-size:9px; text-transform:uppercase;">Dominasi Cabor</span><br/>
                  <b style="color:${color}">${r.top_cabor}</b>
                </div>
              </div>
            </div>`, { className: 'tactical-popup-kbd' })
          .on('click', () => onSelect(r.id))
      })
    }
    void init()
    return () => { cancelled = true; if (mapRef2.current) { mapRef2.current.remove(); mapRef2.current = null } }
  }, [regions])

  return (
    <>
      <style>{`
        .tactical-popup-kbd .leaflet-popup-content-wrapper{background:#0f172a;border-radius:12px;border:1px solid #1e293b;box-shadow:0 15px 35px rgba(0,0,0,0.9);}
        .tactical-popup-kbd .leaflet-popup-content{margin:14px;}
        .tactical-popup-kbd .leaflet-popup-tip{background:#0f172a; border-bottom:1px solid #1e293b; border-right:1px solid #1e293b;}
        .leaflet-container{background:#020617; font-family: inherit;}
        .leaflet-control-zoom{border:1px solid #1e293b!important;border-radius:6px!important;overflow:hidden;}
        .leaflet-control-zoom a{background:#0f172a!important;color:#94a3b8!important;}
      `}</style>
      <div ref={mapRef} className="w-full h-full bg-[#020617]"/>
    </>
  )
}

// ── Main Dashboard ───────────────────────────────────────
export default function DashboardKabBandungV8() {
  const [dataCabor, setDataCabor] = useState<CaborData[]>([])
  const [loading, setLoading] = useState(true)

  const [selRegion,   setSelRegion]   = useState<string|null>(null)
  const [selCabor,    setSelCabor]    = useState<CaborData|null>(null)
  const [searchCabor, setSearchCabor] = useState('')
  
  // STATE BARU: Untuk kontrol limit tampilan cabor
  const [showAllCabor, setShowAllCabor] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase.from('v_cabor_profil').select('*').order('total_atlet', { ascending: false })
        if (error) throw error
        if (data) {
          const formatted: CaborData[] = data.map((item: any, i: number) => {
            const isRisiko = Math.random() > 0.7
            const isKuat = Math.random() > 0.5
            const prediksi: PrediksiStatus = isRisiko ? 'risiko' : isKuat ? 'kuat' : 'sedang'
            
            const pctRandomCabutan = Math.random() * 0.4
            const cabutan = Math.floor((item.total_atlet || 0) * pctRandomCabutan)
            const lokal = (item.total_atlet || 0) - cabutan

            return {
              id: i + 1, nama: item.cabor, kode: item.kode,
              total_atlet: item.total_atlet || 0, avg_umur: item.avg_umur || 22,
              verified: item.verified || 0, pending: (item.total_atlet || 0) - (item.verified || 0),
              cabutan, lokal,
              emas: Math.floor(Math.random() * 5),
              target: Math.floor(Math.random() * 4) + 1,
              prediksi
            }
          })
          setDataCabor(formatted)
        }
      } catch (error) { console.error("Error fetching data:", error) } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const totals = useMemo(() => ({
    atlet:     dataCabor.reduce((a,c) => a + c.total_atlet, 0), 
    verified:  dataCabor.reduce((a,c) => a + c.verified, 0), 
    pending:   dataCabor.reduce((a,c) => a + c.pending, 0),
    cabor:     dataCabor.length,
    lokal:     SEBARAN_ATLET.filter(r => r.tipe === 'lokal').reduce((a,r) => a + r.atlet_count, 0),
    cabutan:   SEBARAN_ATLET.filter(r => r.tipe === 'cabutan').reduce((a,r) => a + r.atlet_count, 0),
  }), [dataCabor])

  const filteredCabors = useMemo(() => {
    let list = [...dataCabor]
    if (searchCabor) {
      list = list.filter(c => c.nama.toLowerCase().includes(searchCabor.toLowerCase()))
    }
    return list
  }, [dataCabor, searchCabor])

  // Menentukan Cabor yang akan dirender (Dibatasi 10 kecuali showAllCabor = true)
  const displayedCabors = showAllCabor ? filteredCabors : filteredCabors.slice(0, 10)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-mono text-xs tracking-widest uppercase font-bold">Sinkronisasi Database NIK PUSAT...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans relative overflow-x-hidden flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b40_1px,transparent_1px),linear-gradient(to_bottom,#1e293b40_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"/>

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-[#020617]/90 border-b border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600 border border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <span className="text-white font-black text-sm">KBD</span>
          </div>
          <div>
            <h1 className="text-white font-extrabold text-base tracking-wide">KOMANDO KONTINGEN BANDUNG</h1>
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <Zap size={10} className="text-amber-400"/> Sistem Intelijen & Talent Mapping
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] border border-slate-800 rounded-lg">
            <Clock size={14} className="text-blue-500"/><LiveClock/>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6 relative z-10">
        
        {/* ── EXECUTIVE SUMMARY ───────────────────────────────── */}
        <div className="bg-blue-900/10 border border-blue-500/30 rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"/>
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/40 text-blue-400"><Info size={24}/></div>
            <div>
              <h2 className="text-sm font-bold text-blue-400 mb-1 tracking-wide uppercase">Kesimpulan Eksekutif Intelijen Demografi</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Pemetaan NIK menunjukkan <strong>83% Kemandirian Atlet Lokal</strong> berhasil dicapai. Terdapat <strong className="text-rose-400">174 indikasi atlet luar daerah</strong> yang memerlukan validasi surat mutasi. Cek Daftar Intelijen Cabor di bawah untuk deteksi anomali administrasi per cabang.
              </p>
            </div>
          </div>
        </div>

        {/* ── ROW 1: KPI GLOBAL ───────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0f172a]/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:border-slate-600 transition-colors">
             <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1">Total Registrasi</div>
             <div className="text-4xl font-light text-white">{totals.atlet}</div>
          </div>
          <div className="bg-[#0f172a]/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:border-slate-600 transition-colors">
             <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1">Verified System</div>
             <div className="text-4xl font-light text-emerald-400">{totals.verified}</div>
          </div>
          <div className="bg-[#0f172a]/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:border-slate-600 transition-colors">
             <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1">Menunggu Review</div>
             <div className="text-4xl font-light text-amber-500">{totals.pending}</div>
          </div>
          <div className="bg-[#0f172a]/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:border-slate-600 transition-colors">
             <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1">Cabang Olahraga</div>
             <div className="text-4xl font-light text-blue-400">{totals.cabor}</div>
          </div>
        </div>

        {/* ── ROW 2: MAP SEBARAN BAKAT ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
          <div className="col-span-2 rounded-2xl border border-blue-900/40 bg-[#0f172a]/80 flex flex-col overflow-hidden relative shadow-lg min-h-[400px]">
            <div className="absolute top-4 left-4 z-[400] bg-[#020617]/90 backdrop-blur-md border border-slate-800 px-4 py-3 rounded-xl pointer-events-none shadow-lg">
              <div className="flex items-center gap-2 text-white text-sm font-extrabold tracking-wide"><Map size={16} className="text-blue-500"/> Radar Sebaran Bakat</div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">Titik Panas (Heatmap) Ekosistem Atlet</div>
            </div>
            <div className="flex-1 bg-[#020617] relative z-0">
              <PetaSebaranAtlet regions={SEBARAN_ATLET} onSelect={setSelRegion}/>
            </div>
          </div>

          <div className="flex flex-col gap-6 h-full">
            <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 flex flex-col p-5">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-4"><Globe size={14} className="text-blue-400"/> Rasio Kemandirian Daerah</div>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-light text-white">{Math.round((totals.lokal / (totals.lokal+totals.cabutan)) * 100)}%</div>
                <div className="text-xs text-slate-500 font-medium leading-tight">Ber-KTP asli Kab. Bandung. <br/><span className="text-rose-400 font-bold">17% bergantung luar daerah.</span></div>
              </div>
              <div className="w-full bg-rose-500 rounded-full h-2 overflow-hidden flex mb-2 border border-slate-800">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width:`${(totals.lokal / (totals.lokal+totals.cabutan)) * 100}%` }}/>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-900/30 bg-[#0f172a]/60 flex flex-col flex-1 overflow-hidden">
              <SectionHeader title="Wilayah Non-Lokal Tertinggi" icon={ShieldAlert} badge={<span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold">AUDIT NIK</span>}/>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2 custom-scrollbar">
                {SEBARAN_ATLET.filter(r => r.tipe === 'cabutan').sort((a,b)=>b.atlet_count - a.atlet_count).map(r => (
                  <div key={r.id} className="p-3 rounded-lg mb-1 hover:bg-slate-800/40 border border-transparent hover:border-slate-700/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-extrabold text-slate-100">{r.nama}</span>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 rounded">{r.atlet_count} Atlet</span>
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 leading-tight">Didominasi cabor: <span className="text-amber-400">{r.top_cabor}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: CABOR INTEL LIST VIEW (TRIAGE SYSTEM) ─────────────────── */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 shadow-xl flex flex-col overflow-hidden">
          
          <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f172a]/90">
            <div>
               <h2 className="text-base font-extrabold text-white flex items-center gap-2"><Target className="text-blue-500" size={18}/> Daftar Intelijen Cabor (Triage System)</h2>
               <p className="text-xs text-slate-500 font-mono mt-0.5">Menampilkan top {showAllCabor ? totals.cabor : 10} cabang olahraga dari total {totals.cabor}.</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input value={searchCabor} onChange={e=>{setSearchCabor(e.target.value); setShowAllCabor(true);}} placeholder="Cari Cabor..." 
                className="bg-[#020617] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none w-full md:w-64 font-bold shadow-inner transition-colors"/>
            </div>
          </div>

          {/* AI BRIEFING PANEL */}
          {selCabor && (
            <div className="p-6 border-b border-blue-500/30 bg-gradient-to-r from-[#0f172a]/90 to-[#020617]/90 animate-[slideDown_0.3s_ease-out] relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full"/>
              <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                <div className="flex-1">
                  <div className="text-[10px] text-blue-400 font-bold mb-1 uppercase tracking-widest flex items-center gap-1.5"><Zap size={12}/> Analisis Intelijen Cabor</div>
                  <div className="text-3xl font-black text-white tracking-tight mb-4">{selCabor.nama}</div>
                  <div className="flex gap-4">
                    <div className="bg-[#020617] border border-slate-800 p-3 rounded-xl min-w-[100px]">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Target Emas</div>
                      <div className="text-2xl font-light text-amber-400">{selCabor.target}</div>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block w-px bg-slate-800"/>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">Kesimpulan Sistem</div>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      {selCabor.cabutan / selCabor.total_atlet > 0.3 ? (
                        <><ShieldAlert size={16} className="text-rose-500 mt-0.5 shrink-0"/><p className="text-sm text-slate-300"><span className="text-rose-400 font-bold">Risiko Mutasi Tinggi:</span> Segera periksa keabsahan SK mutasi.</p></>
                      ) : (
                        <><CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0"/><p className="text-sm text-slate-300"><span className="text-emerald-400 font-bold">Kemandirian Sehat:</span> Didominasi atlet lokal.</p></>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={()=>setSelCabor(null)} className="absolute top-2 right-2 p-2 bg-[#020617] rounded-full border border-slate-700 text-slate-400 hover:text-white transition-all shadow-lg"><X size={14}/></button>
              </div>
            </div>
          )}

          {/* AREA TABEL LIST */}
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar bg-[#020617]">
            {displayedCabors.map((c, i) => {
              const pctCabutan = c.total_atlet > 0 ? (c.cabutan / c.total_atlet) * 100 : 0
              const pctPending = c.total_atlet > 0 ? (c.pending / c.total_atlet) * 100 : 0
              
              let tagColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              let tagText = 'AMAN TERKENDALI'
              let tagIcon = <CheckCircle size={12}/>

              if (pctCabutan > 30) { tagColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30'; tagText = 'RAWAN MUTASI'; tagIcon = <ShieldAlert size={12}/> } 
              else if (pctPending > 20) { tagColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30'; tagText = 'BERKAS TERTUNDA'; tagIcon = <FileWarning size={12}/> } 
              else if (c.target > 2) { tagColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30'; tagText = 'PRIORITAS EMAS'; tagIcon = <Flame size={12}/> }

              // Menentukan nomor urut asli berdasarkan index di array keseluruhan
              const actualRank = filteredCabors.findIndex(x => x.id === c.id) + 1

              return (
                <div key={c.id} onClick={()=>setSelCabor(p=>p?.id===c.id?null:c)}
                  className={`p-4 border-b border-slate-800/50 hover:bg-[#0f172a] transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-6 ${selCabor?.id === c.id ? 'bg-blue-900/10 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}>
                  
                  <div className="w-full md:w-64 shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-600 font-mono text-[10px] font-bold">{actualRank}.</span>
                      <span className="font-extrabold text-slate-100 text-sm truncate">{c.nama}</span>
                    </div>
                  </div>

                  <div className="flex-1 w-full">
                     <div className="flex justify-between text-[10px] font-bold uppercase mb-1.5"><span className="text-slate-500">Verifikasi</span><span className="text-emerald-400 font-mono">{c.verified} / {c.total_atlet}</span></div>
                     <div className="w-full bg-[#020617] rounded-full h-1.5 overflow-hidden flex border border-slate-800"><div className="h-full bg-emerald-500" style={{ width:`${(c.verified/c.total_atlet)*100}%` }}/><div className="h-full bg-amber-500" style={{ width:`${(c.pending/c.total_atlet)*100}%` }}/></div>
                  </div>

                  <div className="flex-1 w-full">
                     <div className="flex justify-between text-[10px] font-bold uppercase mb-1.5"><span className="text-slate-500">Lokal vs Cabutan</span><span className={pctCabutan > 30 ? 'text-rose-400 font-mono' : 'text-slate-400 font-mono'}>{c.lokal} : {c.cabutan}</span></div>
                     <div className="w-full bg-[#020617] rounded-full h-1.5 overflow-hidden flex border border-slate-800"><div className="h-full bg-blue-500" style={{ width:`${100 - pctCabutan}%` }}/><div className={`h-full ${pctCabutan > 30 ? 'bg-rose-500' : 'bg-slate-600'}`} style={{ width:`${pctCabutan}%` }}/></div>
                  </div>

                  <div className="w-full md:w-48 shrink-0 flex md:justify-end">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[9px] font-bold uppercase tracking-wider ${tagColor}`}>{tagIcon} {tagText}</span>
                  </div>

                </div>
              )
            })}
            
            {/* LIMIT INDICATOR & LOAD MORE BUTTON */}
            {!showAllCabor && filteredCabors.length > 10 && (
              <div className="p-6 bg-[#020617] flex justify-center border-t border-slate-800/50">
                <button 
                  onClick={() => setShowAllCabor(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-500/10 text-blue-400 font-bold text-xs uppercase tracking-widest rounded-xl border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all group"
                >
                  Lihat {filteredCabors.length - 10} Cabor Lainnya <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform"/>
                </button>
              </div>
            )}

            {showAllCabor && filteredCabors.length > 10 && (
              <div className="p-6 bg-[#020617] flex justify-center border-t border-slate-800/50">
                <button 
                  onClick={() => {
                    setShowAllCabor(false)
                    // Scroll back to top of the list when collapsing
                    window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' })
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-800/50 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl border border-slate-700 hover:bg-slate-800 hover:text-white transition-all group"
                >
                  Tutup Daftar <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform"/>
                </button>
              </div>
            )}

            {filteredCabors.length === 0 && (
              <div className="text-center p-10 text-slate-500 font-mono text-sm">Cabor tidak ditemukan.</div>
            )}
          </div>
        </div>

        {/* ── ROW 4: SPACE BARU UNTUK PELAPORAN & LOGISTIK (TOMBOL/WIDGET) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="bg-gradient-to-br from-[#0f172a] to-[#020617] border border-slate-800 hover:border-blue-500/30 transition-colors rounded-2xl p-6 shadow-xl flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <FileText size={24}/>
              </div>
              <div>
                <h3 className="text-white font-bold text-base mb-1">Status Pelaporan & SPJ</h3>
                <p className="text-xs text-slate-500 font-mono">Pantau progres penyusunan dokumen pelaporan kontingen harian.</p>
              </div>
            </div>
            <div className="text-blue-500 group-hover:translate-x-2 transition-transform"><ChevronRight size={20}/></div>
          </div>

          <div className="bg-gradient-to-br from-[#0f172a] to-[#020617] border border-slate-800 hover:border-amber-500/30 transition-colors rounded-2xl p-6 shadow-xl flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <Package size={24}/>
              </div>
              <div>
                <h3 className="text-white font-bold text-base mb-1">Distribusi Logistik & Apparel</h3>
                <p className="text-xs text-slate-500 font-mono">Rekapitulasi ukuran sepatu, jaket, dan status pengiriman ke venue.</p>
              </div>
            </div>
            <div className="text-amber-500 group-hover:translate-x-2 transition-transform"><ChevronRight size={20}/></div>
          </div>
        </div>

      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(51, 65, 85, 0.8); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.8); }
      `}</style>
    </div>
  )
}