'use client'
// src/app/konida/dashboard/kabbandung/page.tsx
// War Dashboard Kab. Bandung — Premium Tactical Bento Grid (Midnight Blue Theme)
// Terintegrasi Real-Time dengan Supabase (v_cabor_profil & atlet)

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { createClient } from '@supabase/supabase-js'
import {
  Activity, AlertTriangle, Award, BarChart2, Building2,
  CheckCircle, Clock, Navigation, RefreshCw,
  Sparkles, TrendingDown, TrendingUp, Users, X, Zap,
  Trophy, Target, Search, Crosshair, Loader2
} from 'lucide-react'

// ── INISIALISASI SUPABASE ────────────────────────────────
// Pastikan variabel ini ada di file .env.local lo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// ── Types ────────────────────────────────────────────────
type PrediksiStatus = 'kuat' | 'sedang' | 'risiko'
type VenueStatus    = 'aktif' | 'siap' | 'masalah' | 'standby'

// Interface disesuaikan dengan output v_cabor_profil
interface CaborData {
  id: number; 
  nama: string; 
  kode: string;
  total_atlet: number; 
  atlet_putra: number;
  atlet_putri: number;
  avg_umur: number;
  verified: number;
  pending: number;
  // Fallback untuk UI yang belum ada di View DB
  emas: number; perak: number; perunggu: number; target: number;
  prediksi: PrediksiStatus; top_atlet: string; kesiapan: number; alert?: string; live: number;
}

interface VenueData {
  id: number; nama: string; alamat: string
  lat: number; lng: number; status: VenueStatus
  cabor: string; atlet: number; kapasitas: number; live: number; petugas: number
}

interface LiveEvent {
  id: number; cabor: string; nomor: string
  atlet: string; venue: string; jam: string
  status: 'live'|'soon'|'done'; hasil?: string
}

// ── Data Dummy (Untuk Tabel yang belum ada di DB) ────────
const VENUES: VenueData[] = [
  { id:1,  nama:'Stadion Si Jalak Harupat', alamat:'Kutawaringin', lat:-6.9959, lng:107.5284, status:'aktif',   cabor:'Sepak Bola/Atletik', atlet:115, kapasitas:600, live:2, petugas:35 },
  { id:2,  nama:'Danau Situ Cileunca',      alamat:'Pangalengan',  lat:-7.1956, lng:107.5511, status:'aktif',   cabor:'Dayung',             atlet:72,  kapasitas:250, live:1, petugas:25 },
  { id:3,  nama:'GOR Sabilulungan',         alamat:'Soreang',      lat:-7.0315, lng:107.5250, status:'aktif',   cabor:'Bulu Tangkis/Voli',  atlet:66,  kapasitas:400, live:1, petugas:20 },
  { id:4,  nama:'SOR Ciateul',              alamat:'Baleendah',    lat:-7.0012, lng:107.6250, status:'siap',    cabor:'Pencak Silat',       atlet:40,  kapasitas:300, live:0, petugas:18 },
  { id:5,  nama:'Kolam Renang Jalak',       alamat:'Kutawaringin', lat:-6.9940, lng:107.5290, status:'aktif',   cabor:'Akuatik',            atlet:58,  kapasitas:350, live:1, petugas:22 },
  { id:6,  nama:'GOR Cikancung',            alamat:'Cikancung',    lat:-7.0512, lng:107.8012, status:'siap',    cabor:'Senam',              atlet:24,  kapasitas:200, live:0, petugas:12 },
  { id:7,  nama:'Venue BMX Cimenyan',       alamat:'Cimenyan',     lat:-6.8512, lng:107.6510, status:'masalah', cabor:'Balap Sepeda',       atlet:25,  kapasitas:150, live:0, petugas:15 },
  { id:8,  nama:'Hall Angkat Besi Margahayu',alamat:'Margahayu',   lat:-6.9612, lng:107.5610, status:'aktif',   cabor:'Angkat Besi',        atlet:45,  kapasitas:200, live:1, petugas:14 },
]

const LIVE_EVENTS: LiveEvent[] = [
  { id:1, cabor:'Angkat Besi', nomor:'61kg Putra Final',     atlet:'Asep Sunandar', venue:'Hall Margahayu',  jam:'14:30', status:'live', hasil:'Rekor Baru!' },
  { id:2, cabor:'Dayung',      nomor:'TBR 1000m Campuran',   atlet:'Tim KBD',       venue:'Situ Cileunca',   jam:'14:45', status:'live' },
  { id:3, cabor:'Akuatik',     nomor:'200m Gaya Punggung',   atlet:'Neng Yeni',     venue:'Kolam Jalak',     jam:'15:00', status:'live' },
  { id:4, cabor:'Pencak Silat',nomor:'Kelas C Putra',        atlet:'Rizky R.',      venue:'SOR Ciateul',     jam:'15:30', status:'soon' },
  { id:5, cabor:'Bola Voli',   nomor:'Grup A vs KBB',        atlet:'Tim Putra',     venue:'GOR Sabilulungan',jam:'16:00', status:'soon' },
  { id:6, cabor:'Sepak Bola',  nomor:'Penyisihan Grup',      atlet:'Tim U-23',      venue:'Si Jalak Harupat',jam:'13:00', status:'done', hasil:'🥇 MENANG 2-0' },
  { id:7, cabor:'Catur',       nomor:'Catur Cepat Papan 1',  atlet:'Dadang Subur',  venue:'SOR Ciateul',     jam:'12:00', status:'done', hasil:'🥈 PERAK' },
]

const ALERTS = [
  { id:1, tipe:'success' as const, pesan:'🥇 Tim Sepak Bola MENANG 2-0 vs Kota Bandung!', waktu:'14:45', venue:'Si Jalak Harupat' },
  { id:2, tipe:'success' as const, pesan:'🥇 EMAS & REKOR — Asep Sunandar · Angkat Besi 61kg', waktu:'14:50', venue:'Hall Margahayu' },
  { id:3, tipe:'info'    as const, pesan:'Cuaca mendung di Pangalengan, lomba dayung tetap berjalan', waktu:'14:30', venue:'Situ Cileunca' },
  { id:4, tipe:'warning' as const, pesan:'Genangan air di lintasan BMX akibat hujan semalam', waktu:'11:30', venue:'Venue BMX Cimenyan' },
]

// Tema Kab. Bandung: Blue & Amber
const PRED_CFG = {
  kuat:   { label:'Kuat',   bar:'bg-blue-500',  text:'text-blue-400',  bg:'bg-blue-900/30',  border:'border-blue-500/30' },
  sedang: { label:'Sedang', bar:'bg-amber-500', text:'text-amber-400', bg:'bg-amber-900/30', border:'border-amber-500/30'   },
  risiko: { label:'Risiko', bar:'bg-rose-500',  text:'text-rose-400',  bg:'bg-rose-900/30',  border:'border-rose-500/30'    },
}

const VENUE_COLOR: Record<VenueStatus, string> = {
  aktif:'#3b82f6', siap:'#10b981', masalah:'#f43f5e', standby:'#f59e0b'
}

// ── UI Components ──────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return <span className="tabular-nums font-mono font-bold text-sm text-blue-200">
    {t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
  </span>
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

// ── Peta Besar Kab. Bandung (Dark Mode CartoDB) ────────────
function PetaBesar({ venues, onSelect }: { venues: VenueData[]; onSelect: (id: number) => void }) {
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
        center: [-7.0315, 107.5250], zoom: 11, zoomControl: true, scrollWheelZoom: false,
      })
      mapRef2.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)

      venues.forEach(v => {
        const color = VENUE_COLOR[v.status]
        const isLive = v.live > 0

        if (isLive) {
          L.circleMarker([v.lat, v.lng], {
            radius: 24, fillColor: color, color: color, weight: 1, opacity: 0.8, fillOpacity: 0.15,
          }).addTo(map)
        }

        L.circleMarker([v.lat, v.lng], {
          radius: isLive ? 10 : 7, fillColor: color, color: '#020617', weight: 2, opacity: 1, fillOpacity: 1,
        }).addTo(map)
          .bindPopup(`
            <div style="font-family:inherit;min-width:200px;padding:4px">
              <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;margin-bottom:4px;letter-spacing:1px">
                ● ${v.status}${v.live > 0 ? ' · ' + v.live + ' LIVE' : ''}
              </div>
              <div style="font-weight:800;font-size:14px;color:#fff;margin-bottom:2px">${v.nama}</div>
              <div style="font-size:11px;color:#94a3b8;margin-bottom:12px">${v.alamat}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;background:#020617;border-radius:6px;padding:8px;border:1px solid #1e293b">
                <div><span style="color:#64748b">Cabor</span><br/><b style="color:#e2e8f0">${v.cabor}</b></div>
                <div><span style="color:#64748b">Petugas</span><br/><b style="color:#e2e8f0">${v.petugas}</b></div>
                <div><span style="color:#64748b">Atlet</span><br/><b style="color:${color}">${v.atlet}/${v.kapasitas}</b></div>
                <div><span style="color:#64748b">Load</span><br/><b style="color:#e2e8f0">${Math.round(v.atlet / v.kapasitas * 100)}%</b></div>
              </div>
            </div>`, { className: 'tactical-popup-kbd' })
          .on('click', () => onSelect(v.id))
      })
    }
    void init()
    return () => {
      cancelled = true
      if (mapRef2.current) { mapRef2.current.remove(); mapRef2.current = null }
    }
  }, [venues])

  return (
    <>
      <style>{`
        /* Tactical Popup for Midnight Theme */
        .tactical-popup-kbd .leaflet-popup-content-wrapper{background:#0f172a;border-radius:8px;border:1px solid #1e293b;box-shadow:0 10px 30px rgba(0,0,0,0.8);}
        .tactical-popup-kbd .leaflet-popup-content{margin:12px;}
        .tactical-popup-kbd .leaflet-popup-tip{background:#0f172a; border-bottom:1px solid #1e293b; border-right:1px solid #1e293b;}
        .leaflet-container{background:#020617; font-family: inherit;}
        .leaflet-control-zoom{border:1px solid #1e293b!important;box-shadow:0 4px 15px rgba(0,0,0,0.5)!important;border-radius:6px!important;overflow:hidden;}
        .leaflet-control-zoom a{background:#0f172a!important;color:#94a3b8!important;transition:all 0.2s;}
        .leaflet-control-zoom a:hover{background:#1e293b!important;color:#fff!important;}
      `}</style>
      <div ref={mapRef} className="w-full h-full bg-[#020617]"/>
    </>
  )
}

// ── Cabor Card (Bento Box Style) ─────────────────────────
function CaborCard({ c, rank, selected, onClick }: {
  c: CaborData; rank: number; selected: boolean; onClick: () => void
}) {
  const pred = PRED_CFG[c.prediksi] || PRED_CFG['sedang'] // Fallback
  const pct  = c.target > 0 ? Math.min(Math.round(c.emas / c.target * 100), 100) : 0

  return (
    <div onClick={onClick}
      className={`relative p-4 rounded-xl border bg-[#0f172a]/60 backdrop-blur-sm transition-all duration-200 cursor-pointer hover:bg-[#1e293b]/60 ${
        selected ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500' : 'border-slate-800 hover:border-blue-500/50'
      }`}>
      
      {/* Top Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-slate-500 font-mono text-xs font-bold w-4">{rank}.</span>
            <span className="font-extrabold text-slate-100 text-sm truncate">{c.nama}</span>
            {c.live > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"/>}
          </div>
          <div className="text-[11px] text-slate-400 pl-6 flex items-center gap-1 font-medium">
            <Users size={12}/> {c.total_atlet} Atlet terdaftar
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${pred.bg} ${pred.text} ${pred.border}`}>
          {pred.label}
        </div>
      </div>

      {/* Profil Data Asli Database */}
      <div className="pl-6">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1.5 font-bold">
          <span>Putra: {c.atlet_putra}</span>
          <span>Putri: {c.atlet_putri}</span>
        </div>
        <div className="w-full bg-rose-500/20 rounded-full h-1.5 mb-3 overflow-hidden border border-slate-800/50 flex">
          <div className="h-full bg-blue-500" style={{ width:`${(c.atlet_putra / c.total_atlet) * 100}%` }}/>
        </div>

        <div className="flex justify-between items-end border-t border-slate-800 pt-2">
          <div>
             <div className="text-[9px] text-slate-500 uppercase font-bold">Verified</div>
             <div className="font-mono text-emerald-400 font-bold text-xs">{c.verified}</div>
          </div>
          <div className="text-right">
             <div className="text-[9px] text-slate-500 uppercase font-bold">Rata Usia</div>
             <div className="font-mono text-amber-400 font-bold text-xs">{Math.round(c.avg_umur)} thn</div>
          </div>
        </div>
      </div>

      {/* Alert Ribbon */}
      {c.alert && (
        <div className="absolute top-0 right-0 left-0 h-0.5 bg-rose-500/50 rounded-t-xl"/>
      )}
    </div>
  )
}

// ── Main Dashboard ───────────────────────────────────────
export default function DashboardKabBandung() {
  const [dataCabor, setDataCabor] = useState<CaborData[]>([])
  const [loading, setLoading] = useState(true)

  const [selVenue,    setSelVenue]    = useState<number|null>(null)
  const [selCabor,    setSelCabor]    = useState<CaborData|null>(null)
  const [filterCabor, setFilterCabor]= useState<'all'|'kuat'|'sedang'|'risiko'>('all')
  const [searchCabor, setSearchCabor]= useState('')

  // 1. Fetch Data dari Supabase (v_cabor_profil) saat komponen dimuat
  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('v_cabor_profil')
          .select('*')
          .order('total_atlet', { ascending: false })

        if (error) throw error

        if (data) {
          // Mapping data Supabase ke bentuk yang dibutuhkan UI (dengan fallback data dummy)
          const formatted = data.map((item: any, index: number) => ({
            id: index + 1,
            nama: item.cabor,
            kode: item.kode,
            total_atlet: item.total_atlet || 0,
            atlet_putra: item.atlet_putra || 0,
            atlet_putri: item.atlet_putri || 0,
            avg_umur: item.avg_umur || 0,
            verified: item.verified || 0,
            pending: item.pending || 0,
            // Data dummy fallback (karena di DB belum ada table medali)
            emas: 0, perak: 0, perunggu: 0, target: 5,
            prediksi: 'sedang' as PrediksiStatus,
            top_atlet: 'Atlet Unggulan',
            kesiapan: 85,
            live: 0
          }))
          setDataCabor(formatted)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 2. Kalkulasi Totals Real-Time dari State
  const totals = useMemo(() => ({
    atlet:     dataCabor.reduce((a,c) => a + c.total_atlet, 0), 
    verified:  dataCabor.reduce((a,c) => a + c.verified, 0), 
    pending:   dataCabor.reduce((a,c) => a + c.pending, 0),
    emas:      dataCabor.reduce((a,c) => a + c.emas, 0),
    perak:     dataCabor.reduce((a,c) => a + c.perak, 0),
    perunggu:  dataCabor.reduce((a,c) => a + c.perunggu, 0),
    target:    dataCabor.reduce((a,c) => a + c.target, 0),
    live:      dataCabor.reduce((a,c) => a + c.live, 0),
    venueAktif: VENUES.filter(v => v.status==='aktif').length,
    petugas:   VENUES.reduce((a,v) => a+v.petugas, 0),
    cabor:     dataCabor.length,
  }), [dataCabor])

  // 3. Filter Logic
  const filteredCabors = useMemo(() => {
    let list = [...dataCabor].sort((a,b) => b.total_atlet - a.total_atlet)
    if (filterCabor !== 'all') list = list.filter(c => c.prediksi === filterCabor)
    if (searchCabor) list = list.filter(c => c.nama.toLowerCase().includes(searchCabor.toLowerCase()))
    return list
  }, [dataCabor, filterCabor, searchCabor])

  const selVenueData = VENUES.find(v => v.id === selVenue)
  const totalMedali  = totals.emas + totals.perak + totals.perunggu
  const emasProgress = totals.target > 0 ? Math.round(totals.emas / totals.target * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-mono text-sm tracking-widest">MEMUAT DATA KONTINGEN...</p>
      </div>
    )
  }

  return (
    // Midnight Blue Background (#020617)
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans relative">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b40_1px,transparent_1px),linear-gradient(to_bottom,#1e293b40_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"/>
      {/* Glow Ornaments */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none"/>

      {/* ── TOP NAV BAR (Sleek & Thin) ─────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-[#020617]/80 border-b border-slate-800 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0f172a] border border-blue-500/30 shadow-inner">
            <img src="/logos/kab-bandung.png" alt="KBD" className="w-5 h-5 object-contain"
              onError={e=>{const el=e.target as HTMLImageElement; el.style.display='none'}}/>
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm tracking-widest">KOMANDO KONTINGEN BANDUNG</h1>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">PORPROV XV 2026 · LIVE SYNC</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-5 text-xs font-mono font-medium">
            <div className="flex flex-col"><span className="text-slate-500 uppercase">Venue</span><span className="text-blue-400 font-bold">{totals.venueAktif} Aktif</span></div>
            <div className="flex flex-col"><span className="text-slate-500 uppercase">Atlet DB</span><span className="text-slate-200 font-bold">{totals.atlet}</span></div>
          </div>
          <div className="w-px h-8 bg-slate-800"/>
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0f172a] rounded-lg border border-slate-800 shadow-inner">
            <Clock size={14} className="text-blue-500"/><LiveClock/>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT (BENTO GRID) ──────────────────── */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6 relative z-10">
        
        {/* ROW 1: KPI BENTO CARDS */}
        <div className="grid grid-cols-5 gap-4">
          {/* Target Emas (Span 2) */}
          <div className="col-span-2 bg-[#0f172a]/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:bg-[#1e293b]/40 transition-colors shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-white font-extrabold tracking-wide"><Target size={20} className="text-amber-400 drop-shadow-sm"/> Target Medali Emas</div>
              <span className="font-mono text-3xl font-light text-white">{totals.emas}<span className="text-slate-500 text-xl font-medium">/{totals.target}</span></span>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-2 uppercase font-bold tracking-wider"><span>Progress Target</span><span className="text-amber-400">{emasProgress}%</span></div>
              <div className="h-2.5 w-full bg-[#020617] rounded-full overflow-hidden border border-slate-800/50 shadow-inner">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full relative" style={{ width: `${emasProgress}%` }}>
                   <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}/>
                </div>
              </div>
            </div>
          </div>

          {/* Data Cabor DB */}
          <div className="bg-[#0f172a]/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:bg-[#1e293b]/40 transition-colors shadow-lg">
            <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><Award size={14} className="text-blue-400"/> Total Cabor Database</div>
            <div className="text-4xl font-light text-white tracking-tight">{totals.cabor}</div>
            <div className="mt-2.5 flex gap-3 text-xs font-mono font-bold text-slate-400">
               Data Sync Terkini
            </div>
          </div>

          {/* Verifikasi (Real DB) */}
          <div className="bg-[#0f172a]/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 flex flex-col justify-center hover:bg-[#1e293b]/40 transition-colors shadow-lg">
            <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><CheckCircle size={14} className="text-blue-400"/> Verifikasi (DB)</div>
            <div className="text-4xl font-light text-white tracking-tight">{totals.verified}</div>
            <div className="mt-2.5 text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 inline-block w-max">Dari {totals.atlet} Atlet</div>
          </div>

          {/* Quick Alerts */}
          <div className="bg-[#0f172a]/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 flex flex-col hover:bg-[#1e293b]/40 transition-colors shadow-lg">
            <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2"><AlertTriangle size={14} className="text-amber-400"/> Sistem Alert</div>
            <div className="flex-1 flex flex-col justify-center gap-2.5">
              <div className="text-xs text-rose-400 font-medium flex items-start gap-2 leading-tight bg-rose-500/10 px-2 py-1.5 rounded border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 flex-shrink-0 animate-pulse"/> 1 Peringatan Venue
              </div>
              <div className="text-xs text-blue-400 font-medium flex items-start gap-2 leading-tight bg-blue-500/10 px-2 py-1.5 rounded border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0"/> {totals.pending} Draft Pendaftaran
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: MAP & LIVE FEED (Bento Layout) */}
        <div className="grid grid-cols-3 gap-4 h-[500px]">
          
          {/* Tactical Map (Span 2) */}
          <div className="col-span-2 rounded-2xl border border-blue-900/40 bg-[#0f172a]/80 flex flex-col overflow-hidden relative shadow-lg">
            <div className="absolute top-4 left-4 z-[400] bg-[#020617]/90 backdrop-blur-md border border-slate-800 px-4 py-2.5 rounded-xl pointer-events-none shadow-lg">
              <div className="flex items-center gap-2 text-white text-sm font-extrabold tracking-wide"><Crosshair size={16} className="text-blue-500"/> Peta Radar Operasional</div>
              <div className="text-[10px] text-blue-400 font-bold mt-1 uppercase tracking-widest">Wilayah Kab. Bandung</div>
            </div>

            <div className="flex-1 bg-[#020617] relative z-0">
              <PetaBesar venues={VENUES} onSelect={setSelVenue}/>
            </div>

            {/* Map Popup Sidebar Overlay (Appears inside the map area) */}
            {selVenueData && (
              <div className="absolute right-4 top-4 bottom-4 w-72 bg-[#020617]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 z-[400] flex flex-col animate-[slideLeft_0.2s_ease-out] shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-2.5 py-1 rounded text-[9px] font-extrabold uppercase tracking-widest bg-slate-900 border border-slate-800`} style={{ color:VENUE_COLOR[selVenueData.status] }}>
                    {selVenueData.status}
                  </div>
                  <button onClick={()=>setSelVenue(null)} className="text-slate-500 hover:text-white bg-slate-900 p-1 rounded border border-slate-800"><X size={16}/></button>
                </div>
                <h3 className="text-xl font-black text-white leading-tight mb-1.5">{selVenueData.nama}</h3>
                <p className="text-xs text-blue-400/80 font-bold uppercase tracking-wider mb-5">{selVenueData.alamat}</p>
                
                <div className="space-y-3 mt-auto">
                  <div className="bg-[#0f172a] rounded-xl p-3.5 border border-slate-800 shadow-inner">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Cabor Utama</div>
                    <div className="text-sm font-extrabold text-white">{selVenueData.cabor}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0f172a] rounded-xl p-3.5 border border-slate-800 shadow-inner">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Atlet</div>
                      <div className="text-xl font-light text-blue-400">{selVenueData.atlet}</div>
                    </div>
                    <div className="bg-[#0f172a] rounded-xl p-3.5 border border-slate-800 shadow-inner">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Kapasitas</div>
                      <div className="text-xl font-light text-slate-200">{selVenueData.kapasitas}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Live Feed */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 backdrop-blur-sm flex flex-col overflow-hidden shadow-lg">
            <SectionHeader title="Laga Berjalan" icon={Activity} badge={<span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-md text-[9px] tracking-widest font-extrabold animate-pulse">LIVE FEED</span>}/>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2.5">
              {LIVE_EVENTS.map(ev => (
                <div key={ev.id} className={`p-3.5 rounded-xl mb-1 transition-colors hover:bg-slate-800/40 ${ev.status==='live'?'bg-blue-900/10 border border-blue-900/30':ev.status==='done'?'opacity-60':''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">{ev.cabor}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold bg-[#020617] px-2 py-0.5 rounded border border-slate-800">{ev.jam}</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-100 leading-tight mb-2">{ev.nomor}</div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium"><Users size={12}/> {ev.atlet}</span>
                    {ev.hasil && <span className="text-amber-400 font-extrabold text-[9px] tracking-wider uppercase bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">{ev.hasil}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3: CABOR DATA GRID DARI DATABASE */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/60 backdrop-blur-sm p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-3 tracking-wide">
              <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20"><BarChart2 className="text-blue-500" size={18}/></div>
              Matriks Kinerja Cabor (Live DB)
            </h2>
            
            <div className="flex gap-4">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input value={searchCabor} onChange={e=>setSearchCabor(e.target.value)} placeholder="Cari Cabor..." 
                  className="bg-[#020617] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none w-56 shadow-inner"/>
              </div>
              <div className="flex bg-[#020617] rounded-xl border border-slate-800 p-1 shadow-inner">
                {dataCabor.length} Cabor
              </div>
            </div>
          </div>

          {filteredCabors.length === 0 ? (
            <div className="text-center py-10 text-slate-500">Tidak ada data cabor ditemukan.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredCabors.map((c, i) => (
                <CaborCard key={c.id} c={c} rank={i+1} selected={selCabor?.id===c.id} onClick={()=>setSelCabor(p=>p?.id===c.id?null:c)}/>
              ))}
            </div>
          )}

          {/* Detailed Cabor Panel (Appears Below Grid if Selected) */}
          {selCabor && (
            <div className="mt-6 p-6 rounded-2xl border border-blue-500/30 bg-blue-900/10 flex items-center justify-between animate-[slideUp_0.2s_ease-out] shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-[10px] text-blue-400 font-bold mb-1.5 uppercase tracking-widest">Fokus Analitik DB</div>
                  <div className="text-3xl font-black text-white tracking-tight">{selCabor.nama}</div>
                  <div className="text-xs text-slate-400 mt-2 font-mono">Total Daftar: {selCabor.total_atlet} Atlet</div>
                </div>
                <div className="h-12 w-px bg-slate-700"/>
                <div className="flex gap-8">
                  <div className="bg-[#020617] px-5 py-3 rounded-xl border border-slate-800 shadow-inner">
                    <div className="text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-widest">Atlet Diverifikasi</div>
                    <div className="text-2xl font-light text-emerald-400">{selCabor.verified}<span className="text-slate-600 text-base font-medium">/{selCabor.total_atlet}</span></div>
                  </div>
                  <div className="bg-[#020617] px-5 py-3 rounded-xl border border-slate-800 shadow-inner">
                    <div className="text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-widest">Menunggu Admin</div>
                    <div className="text-2xl font-light text-amber-400">{selCabor.pending}</div>
                  </div>
                  <div className="bg-[#020617] px-5 py-3 rounded-xl border border-slate-800 shadow-inner">
                    <div className="text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-widest">Rata-rata Usia DB</div>
                    <div className="text-2xl font-light text-blue-400">{Math.round(selCabor.avg_umur)} Thn</div>
                  </div>
                </div>
              </div>
              <button onClick={()=>setSelCabor(null)} className="p-3 bg-[#020617] rounded-full border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-all"><X size={18}/></button>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}