'use client'

// Dashboard Kota Bekasi — Kontingen War Room (FIXED)
// Light theme, layout terkontrol, peta zoom Bekasi, KPI compact
// src/app/konida/dashboard/bekasi/page.tsx

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import Link from 'next/link'
import {
  Activity, AlertTriangle, Award, BarChart2,
  Building2, CheckCircle, Clock, Medal,
  Navigation, RefreshCw, Shield, Sparkles,
  Target, TrendingDown, TrendingUp,
  Users, Wifi, X, Zap, ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────
type PrediksiStatus = 'kuat' | 'sedang' | 'risiko'
type VenueStatus    = 'aktif' | 'siap' | 'masalah' | 'standby' | 'selesai'

interface CaborWarRoom {
  id: number; nama: string; singkatan: string
  total_atlet: number; lolos_kual: number
  medali_emas: number; medali_perak: number; medali_perunggu: number; target_emas: number
  jadwal_hari_ini: number; laga_live: number
  prediksi: PrediksiStatus; trend: 'up' | 'down' | 'stable'
  top_atlet: string; status_kesiapan: number
  alert?: string
}
interface VenuePoint {
  id: number; nama: string; alamat: string
  lat: number; lng: number; status: VenueStatus
  cabor: string; atlet_hadir: number; kapasitas: number
  laga_aktif: number; petugas: number
}
interface LiveEvent {
  id: number; cabor: string; nomor: string
  atlet_bekasi: string; venue: string; jam: string
  status: 'live' | 'soon' | 'done'; hasil?: string
}
interface AlertItem {
  id: number; tipe: 'warning' | 'info' | 'success'
  pesan: string; waktu: string; venue?: string
}

// ─── Mock Data ────────────────────────────────────────────
const MOCK_CABORS: CaborWarRoom[] = [
  { id:1, nama:'Atletik',      singkatan:'ATL', total_atlet:38, lolos_kual:35, medali_emas:3, medali_perak:2, medali_perunggu:3, target_emas:5, jadwal_hari_ini:5, laga_live:2, prediksi:'kuat',   trend:'up',     top_atlet:'Rizky Pratama',  status_kesiapan:92 },
  { id:2, nama:'Renang',       singkatan:'RNG', total_atlet:24, lolos_kual:22, medali_emas:2, medali_perak:4, medali_perunggu:1, target_emas:4, jadwal_hari_ini:3, laga_live:1, prediksi:'kuat',   trend:'up',     top_atlet:'Aldo Setiawan',  status_kesiapan:89 },
  { id:3, nama:'Bulu Tangkis', singkatan:'BT',  total_atlet:18, lolos_kual:16, medali_emas:2, medali_perak:1, medali_perunggu:2, target_emas:3, jadwal_hari_ini:2, laga_live:1, prediksi:'kuat',   trend:'stable', top_atlet:'Kevin Santoso',  status_kesiapan:85 },
  { id:4, nama:'Karate',       singkatan:'KRT', total_atlet:16, lolos_kual:15, medali_emas:2, medali_perak:1, medali_perunggu:1, target_emas:3, jadwal_hari_ini:2, laga_live:0, prediksi:'kuat',   trend:'up',     top_atlet:'Rina Melati',    status_kesiapan:91 },
  { id:5, nama:'Pencak Silat', singkatan:'SIL', total_atlet:22, lolos_kual:19, medali_emas:1, medali_perak:3, medali_perunggu:4, target_emas:3, jadwal_hari_ini:3, laga_live:0, prediksi:'sedang', trend:'stable', top_atlet:'Agus Rahmat',    status_kesiapan:77 },
  { id:6, nama:'Taekwondo',    singkatan:'TKD', total_atlet:14, lolos_kual:13, medali_emas:1, medali_perak:2, medali_perunggu:1, target_emas:2, jadwal_hari_ini:2, laga_live:1, prediksi:'sedang', trend:'up',     top_atlet:'Sari Dewi',      status_kesiapan:80 },
  { id:7, nama:'Voli',         singkatan:'VOL', total_atlet:24, lolos_kual:24, medali_emas:1, medali_perak:1, medali_perunggu:1, target_emas:2, jadwal_hari_ini:2, laga_live:1, prediksi:'sedang', trend:'up',     top_atlet:'Tim Putra',      status_kesiapan:83 },
  { id:8, nama:'Basket',       singkatan:'BSK', total_atlet:20, lolos_kual:18, medali_emas:0, medali_perak:1, medali_perunggu:1, target_emas:1, jadwal_hari_ini:1, laga_live:0, prediksi:'risiko', trend:'down',   top_atlet:'Tim Putri',      status_kesiapan:68, alert:'Perlu warmup intensif sebelum laga 16:00' },
]
const MOCK_VENUES: VenuePoint[] = [
  { id:1,  nama:'Stadion Patriot Candrabhaga', alamat:'Jl. Ahmad Yani, Bekasi Selatan', lat:-6.2383, lng:106.9756, status:'aktif',   cabor:'Atletik',      atlet_hadir:38, kapasitas:500, laga_aktif:2, petugas:24 },
  { id:2,  nama:'Kolam Renang Harapan Indah',  alamat:'Kec. Medan Satria',              lat:-6.2180, lng:106.9550, status:'aktif',   cabor:'Renang',       atlet_hadir:22, kapasitas:300, laga_aktif:1, petugas:18 },
  { id:3,  nama:'GOR Bekasi Cyber Park',       alamat:'Jl. Ir. H. Juanda',              lat:-6.2298, lng:106.9823, status:'masalah', cabor:'Bulu Tangkis', atlet_hadir:16, kapasitas:400, laga_aktif:1, petugas:20 },
  { id:4,  nama:'GOR Sasana Ganesha',          alamat:'Kec. Bekasi Utara',              lat:-6.2050, lng:106.9912, status:'siap',    cabor:'Voli',         atlet_hadir:24, kapasitas:350, laga_aktif:0, petugas:16 },
  { id:5,  nama:'Lapangan Silat Bekasi',       alamat:'Kec. Jatiasih',                  lat:-6.2812, lng:106.9634, status:'siap',    cabor:'Pencak Silat', atlet_hadir:19, kapasitas:250, laga_aktif:0, petugas:14 },
  { id:6,  nama:'Hall Basket Summarecon',      alamat:'Summarecon Bekasi',              lat:-6.2456, lng:107.0034, status:'standby', cabor:'Basket',       atlet_hadir:18, kapasitas:280, laga_aktif:0, petugas:12 },
  { id:7,  nama:'Dojo Karate Bekasi',          alamat:'Kec. Rawalumbu',                 lat:-6.2634, lng:106.9912, status:'siap',    cabor:'Karate',       atlet_hadir:15, kapasitas:180, laga_aktif:0, petugas:10 },
  { id:8,  nama:'Hall Taekwondo Klaster I',    alamat:'Kec. Bekasi Selatan',            lat:-6.2512, lng:106.9845, status:'aktif',   cabor:'Taekwondo',    atlet_hadir:13, kapasitas:200, laga_aktif:1, petugas:13 },
  { id:9,  nama:'GOR Multiguna Bekasi',        alamat:'Kec. Bantargebang',              lat:-6.3012, lng:107.0156, status:'standby', cabor:'Tenis Meja',   atlet_hadir:0,  kapasitas:150, laga_aktif:0, petugas:8  },
  { id:10, nama:'Lapangan Panahan Patriot',    alamat:'Kompleks Stadion Patriot',       lat:-6.2401, lng:106.9801, status:'aktif',   cabor:'Panahan',      atlet_hadir:12, kapasitas:180, laga_aktif:1, petugas:10 },
]
const MOCK_LIVE: LiveEvent[] = [
  { id:1, cabor:'Atletik',   nomor:'100m Putra Final',      atlet_bekasi:'Rizky Pratama', venue:'Stadion Patriot',     jam:'14:30', status:'live', hasil:'Heat 3' },
  { id:2, cabor:'Renang',    nomor:'100m Gaya Bebas L',     atlet_bekasi:'Aldo Setiawan', venue:'Kolam Harapan Indah', jam:'14:45', status:'live', hasil:'Lap 4' },
  { id:3, cabor:'Taekwondo', nomor:'Kelas 63kg Final',      atlet_bekasi:'Sari Dewi',     venue:'Hall Taekwondo',      jam:'15:00', status:'live' },
  { id:4, cabor:'BT',        nomor:'Tunggal Putra SF',      atlet_bekasi:'Kevin Santoso', venue:'GOR Cyber Park',      jam:'15:30', status:'soon' },
  { id:5, cabor:'Voli',      nomor:'Putri Pool A vs Bogor', atlet_bekasi:'Tim Putri',     venue:'GOR Ganesha',         jam:'16:00', status:'soon' },
  { id:6, cabor:'Karate',    nomor:'Kata Putri Final',      atlet_bekasi:'Rina Melati',   venue:'Dojo Karate',         jam:'13:00', status:'done', hasil:'🥇 EMAS' },
  { id:7, cabor:'Atletik',   nomor:'400m Putri SF',         atlet_bekasi:'Maya Sari',     venue:'Stadion Patriot',     jam:'12:30', status:'done', hasil:'🥈 PERAK' },
]
const MOCK_ALERTS: AlertItem[] = [
  { id:1, tipe:'success', pesan:'🥇 EMAS — Rina Melati · Karate Kata Putri',             waktu:'13:05', venue:'Dojo Karate' },
  { id:2, tipe:'info',    pesan:'Rizky Pratama lolos ke Final 100m — start 14:30',         waktu:'12:48', venue:'Stadion Patriot' },
  { id:3, tipe:'warning', pesan:'Sound system GOR Cyber Park gangguan — teknisi dikirim',  waktu:'12:30', venue:'GOR Cyber Park' },
  { id:4, tipe:'success', pesan:'🥈 PERAK — Maya Sari · Atletik 400m Putri',              waktu:'12:35', venue:'Stadion Patriot' },

]

// ─── Config ───────────────────────────────────────────────
const PREDIKSI_CONF: Record<PrediksiStatus, { label:string; color:string; bg:string; border:string; bar:string }> = {
  kuat:   { label:'Kuat',   color:'text-green-700',  bg:'bg-green-50',  border:'border-green-200', bar:'bg-green-500'  },
  sedang: { label:'Sedang', color:'text-orange-700', bg:'bg-orange-50', border:'border-orange-200',bar:'bg-orange-400' },
  risiko: { label:'Risiko', color:'text-red-700',    bg:'bg-red-50',    border:'border-red-200',   bar:'bg-red-500'    },
}
const VENUE_HEX: Record<VenueStatus,string> = {
  aktif:'#4caf50', siap:'#2196f3', masalah:'#f44336', standby:'#ff9800', selesai:'#9e9e9e',
}

// ─── Live Clock ───────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(i) }, [])
  return <span className="tabular-nums font-bold text-[#3c4858] tracking-widest text-sm">
    {t.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
  </span>
}

// ─── Peta — zoom Bekasi, height fix ──────────────────────
function PetaKontingen({ venues, onSelect }: { venues:VenuePoint[]; onSelect:(id:number)=>void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap|null>(null)

  useEffect(()=>{
    let cancelled = false
    async function init(){
      if(!mapRef.current) return
      const L = (await import('leaflet')).default
      // @ts-ignore
      await import('leaflet/dist/leaflet.css')
      if(cancelled||!mapRef.current) return
      if(mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null}
      const c = mapRef.current as HTMLDivElement & {_leaflet_id?:number}
      if(c._leaflet_id) c._leaflet_id=undefined

      // ✅ Center & zoom ke BEKASI bukan Jawa Barat
      const map = L.map(mapRef.current,{
        center:[-6.2383, 106.9756],   // Stadion Patriot Bekasi
        zoom:13,                        // zoom pas untuk kota Bekasi
        zoomControl:true,
        scrollWheelZoom:false,          // disable scroll agar ga ganggu scroll halaman
      })
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map)

      venues.forEach(v=>{
        const hex = VENUE_HEX[v.status]
        const isLive = v.laga_aktif > 0
        const radius = isLive ? 13 : v.status==='masalah' ? 12 : 9

        const marker = L.circleMarker([v.lat,v.lng],{
          radius, fillColor:hex, color:'#ffffff', weight:2, opacity:1, fillOpacity:0.92,
        }).addTo(map)

        const pct = v.kapasitas>0 ? Math.round((v.atlet_hadir/v.kapasitas)*100) : 0
        marker.bindPopup(`
          <div style="font-family:'Segoe UI',sans-serif;min-width:200px;padding:2px">
            <div style="font-size:10px;font-weight:800;color:${hex};letter-spacing:1px;text-transform:uppercase;margin-bottom:5px">
              ● ${v.status.toUpperCase()}${v.laga_aktif>0?' · '+v.laga_aktif+' LIVE':''}
            </div>
            <div style="font-weight:700;font-size:12px;color:#3c4858;margin-bottom:2px">${v.nama}</div>
            <div style="font-size:10px;color:#aaa;margin-bottom:8px">${v.alamat}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:10px;background:#f8f9fa;border-radius:6px;padding:7px">
              <div><span style="color:#999">Cabor</span><br/><b style="color:#3c4858">${v.cabor}</b></div>
              <div><span style="color:#999">Petugas</span><br/><b style="color:#3c4858">${v.petugas}</b></div>
              <div><span style="color:#999">Atlet</span><br/><b style="color:${hex}">${v.atlet_hadir}/${v.kapasitas}</b></div>
              <div><span style="color:#999">Kapasitas</span><br/><b style="color:#3c4858">${pct}%</b></div>
            </div>
          </div>`,{className:'popup-light'})
        marker.on('click',()=>onSelect(v.id))
      })
    }
    void init()
    return ()=>{
      cancelled=true
      if(mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null}
    }
  },[venues])

  return (
    <div className="w-full h-full relative">
      <style>{`
        .popup-light .leaflet-popup-content-wrapper{box-shadow:0 8px 25px rgba(0,0,0,0.12);border-radius:10px;border:1px solid #f1f5f9;}
        .popup-light .leaflet-popup-content{margin:12px 13px;}
        .popup-light .leaflet-popup-tip{background:white;}
        .leaflet-container{background:#f0f4f8;}
        .leaflet-control-zoom{border:none!important;box-shadow:0 2px 8px rgba(0,0,0,0.1)!important;border-radius:8px!important;overflow:hidden;}
        .leaflet-control-zoom a{border:none!important;color:#3c4858!important;font-weight:bold;}
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}

// ─── Cabor Rank Card (compact) ────────────────────────────
function CaborRankCard({ c, rank, isSelected, onClick }:{
  c:CaborWarRoom; rank:number; isSelected:boolean; onClick:()=>void
}) {
  const pred = PREDIKSI_CONF[c.prediksi]
  const pct = c.target_emas>0 ? Math.min(Math.round((c.medali_emas/c.target_emas)*100),100) : 0
  const kualPct = c.total_atlet>0 ? Math.round((c.lolos_kual/c.total_atlet)*100) : 0

  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl border cursor-pointer transition-all overflow-hidden ${
        isSelected ? 'border-[#E84E0F] shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
      }`}>
      {/* Top accent */}
      <div className={`h-1 ${pred.bar}`} />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
              rank===1?'bg-yellow-100 text-yellow-700':rank===2?'bg-gray-100 text-gray-600':rank===3?'bg-orange-50 text-orange-600':'bg-gray-50 text-gray-400'
            }`}>
              {rank<=3 ? ['🥇','🥈','🥉'][rank-1] : rank}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#3c4858] text-sm">{c.nama}</span>
                {c.laga_live>0 && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold animate-pulse">LIVE</span>}
              </div>
              <div className="text-[10px] text-gray-400">{c.top_atlet}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${pred.bg} ${pred.color} ${pred.border}`}>{pred.label}</span>
            {c.trend==='up'     && <TrendingUp size={12} className="text-green-500"/>}
            {c.trend==='down'   && <TrendingDown size={12} className="text-red-500"/>}
            {c.trend==='stable' && <Activity size={12} className="text-gray-400"/>}
          </div>
        </div>

        {/* Medali */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex gap-1.5 text-sm font-bold">
            <span className="text-yellow-600">🥇{c.medali_emas}</span>
            <span className="text-gray-400">🥈{c.medali_perak}</span>
            <span className="text-orange-500">🥉{c.medali_perunggu}</span>
          </div>
          <span className="text-[10px] text-gray-400 ml-auto">{c.medali_emas+c.medali_perak+c.medali_perunggu} total</span>
        </div>

        {/* Target bar */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>Target Emas</span>
            <span className="font-bold text-[#3c4858]">{c.medali_emas}/{c.target_emas}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct>=100?'bg-green-500':pct>=60?'bg-yellow-400':'bg-red-400'}`}
              style={{width:`${pct}%`}} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-1 pt-2.5 border-t border-gray-50">
          {[
            {label:'Atlet',    value:c.total_atlet,          color:'text-blue-600'  },
            {label:'Lolos',    value:`${kualPct}%`,          color:'text-green-600' },
            {label:'Hari Ini', value:c.jadwal_hari_ini,      color:'text-orange-600'},
            {label:'Siap',     value:`${c.status_kesiapan}%`,color:'text-purple-600'},
          ].map(s=>(
            <div key={s.label} className="text-center">
              <div className={`text-xs font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alert inline */}
        {c.alert && (
          <div className="mt-2.5 flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
            <AlertTriangle size={10} className="text-red-500 flex-shrink-0 mt-0.5"/>
            <span className="text-[10px] text-red-600">{c.alert}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────
export default function DashboardBekasiKontingen() {
  const [selectedVenueId, setSelectedVenueId] = useState<number|null>(null)
  const [selectedCabor, setSelectedCabor] = useState<CaborWarRoom|null>(null)
  const [animIn, setAnimIn] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([])

  useEffect(()=>{const t=setTimeout(()=>setAnimIn(true),100);return()=>clearTimeout(t)},[])

  const totals = useMemo(()=>({
    atlet:    MOCK_CABORS.reduce((a,c)=>a+c.total_atlet,0),
    emas:     MOCK_CABORS.reduce((a,c)=>a+c.medali_emas,0),
    perak:    MOCK_CABORS.reduce((a,c)=>a+c.medali_perak,0),
    perunggu: MOCK_CABORS.reduce((a,c)=>a+c.medali_perunggu,0),
    target:   MOCK_CABORS.reduce((a,c)=>a+c.target_emas,0),
    live:     MOCK_CABORS.reduce((a,c)=>a+c.laga_live,0),
    venueAktif:   MOCK_VENUES.filter(v=>v.status==='aktif').length,
    venueMasalah: MOCK_VENUES.filter(v=>v.status==='masalah').length,
    petugas:  MOCK_VENUES.reduce((a,v)=>a+v.petugas,0),
  }),[])

  // Sorted: kuat dulu, lalu emas desc
  const rankedCabors = useMemo(()=>[...MOCK_CABORS].sort((a,b)=>{
    const o={kuat:0,sedang:1,risiko:2}
    if(o[a.prediksi]!==o[b.prediksi]) return o[a.prediksi]-o[b.prediksi]
    return b.medali_emas-a.medali_emas
  }),[])

  const selectedVenue = MOCK_VENUES.find(v=>v.id===selectedVenueId)
  const activeAlerts = MOCK_ALERTS.filter(a=>!dismissedAlerts.includes(a.id))

  const ani = (d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.6s cubic-bezier(0.16,1,0.3,1)'},
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  return (
    <div className="min-h-screen bg-[#eeeeee] p-6 font-sans space-y-5">

      {/* ─── Header ─── */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-white shadow-md flex items-center justify-center border border-gray-100">
              <img src="/logos/bekasi.png" alt="Bekasi" className="w-9 h-9 object-contain"
                onError={e=>{const el=e.target as HTMLImageElement;el.style.display='none';const p=el.parentElement;if(p)p.innerHTML='<span class="text-[#E84E0F] font-black text-xs">BKS</span>'}} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#eeeeee] animate-pulse"/>
          </div>
          <div>
            <div className="text-[10px] font-black text-[#E84E0F] uppercase tracking-[3px] mb-0.5">Kontingen · PORPROV XV</div>
            <h1 className="text-xl font-light text-[#3c4858] tracking-wide">War Room Kota Bekasi</h1>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>
              <span>{totals.atlet} atlet · {MOCK_CABORS.length} cabor · {totals.venueAktif} venue aktif</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totals.venueMasalah>0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              <AlertTriangle size={13} className="text-red-500"/>
              <span className="text-xs font-bold text-red-600">{totals.venueMasalah} Venue Masalah</span>
            </div>
          )}
          <div className="bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 border border-gray-100">
            <Clock size={13} className="text-gray-400"/> <LiveClock/>
          </div>
          <button className="bg-white hover:bg-gray-50 px-3 py-1.5 rounded-full shadow-sm text-sm text-[#3c4858] flex items-center gap-1.5 border border-gray-100">
            <RefreshCw size={13}/> Refresh
          </button>
        </div>
      </div>

      {/* ─── Alert Stream horizontal ─── */}
      {activeAlerts.length>0 && (
        <div {...ani(20)} className="flex gap-2.5 overflow-x-auto pb-0.5 scrollbar-none">
          {activeAlerts.map(al=>(
            <div key={al.id} className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border flex-shrink-0 shadow-sm text-xs ${
              al.tipe==='success' ? 'bg-green-50 border-green-200'
              : al.tipe==='warning' ? 'bg-orange-50 border-orange-200'
              : 'bg-blue-50 border-blue-200'
            }`}>
              {al.tipe==='success' && <CheckCircle size={13} className="text-green-600 flex-shrink-0"/>}
              {al.tipe==='warning' && <AlertTriangle size={13} className="text-orange-500 flex-shrink-0"/>}
              {al.tipe==='info'    && <Sparkles size={13} className="text-blue-500 flex-shrink-0"/>}
              <div>
                <div className={`font-semibold ${al.tipe==='success'?'text-green-800':al.tipe==='warning'?'text-orange-800':'text-blue-800'}`}>{al.pesan}</div>
                <div className="text-[10px] text-gray-400">{al.waktu} · {al.venue}</div>
              </div>
              <button onClick={()=>setDismissedAlerts(p=>[...p,al.id])} className="ml-1 text-gray-300 hover:text-gray-500 flex-shrink-0">
                <X size={12}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── KPI — 3 kolom × 2 baris (6 card, semua kelihatan) ─── */}
      <div {...ani(40)} className="grid grid-cols-3 gap-4">
        {[
          { label:'Total Atlet',   value:totals.atlet,                          icon:Users,        gradient:'from-blue-500 to-blue-400',    shadow:'shadow-blue-500/30',   sub:`${MOCK_CABORS.length} cabor` },
          { label:'🥇 Medali Emas', value:totals.emas,                           icon:Medal,        gradient:'from-yellow-500 to-orange-400', shadow:'shadow-yellow-500/30', sub:`target ${totals.target}` },
          { label:'Total Medali',  value:totals.emas+totals.perak+totals.perunggu, icon:Award,     gradient:'from-orange-500 to-orange-400', shadow:'shadow-orange-500/30', sub:'🥇🥈🥉 gabungan' },
          { label:'Live Sekarang', value:totals.live,                            icon:Activity,     gradient:'from-red-500 to-red-400',      shadow:'shadow-red-500/30',    sub:'laga berlangsung' },
          { label:'Venue Aktif',   value:totals.venueAktif,                      icon:Building2,    gradient:'from-green-500 to-green-400',  shadow:'shadow-green-500/30',  sub:`${MOCK_VENUES.length} total` },
          { label:'Total Petugas', value:totals.petugas,                         icon:Shield,       gradient:'from-purple-500 to-purple-400',shadow:'shadow-purple-500/30', sub:'di lapangan' },
        ].map(c=>(
          <div key={c.label} className="relative bg-white rounded-xl shadow-md p-4 pt-8">
            <div className={`absolute -top-5 left-4 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${c.gradient} ${c.shadow}`}>
              <c.icon size={22} className="text-white"/>
            </div>
            <div className="text-right">
              <p className="text-xs font-light text-[#999] mb-0.5">{c.label}</p>
              <h4 className="text-2xl font-light text-[#3c4858]">{c.value}</h4>
              <p className="text-[10px] text-gray-400">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── PETA + Right Panel (height fix, tidak overflow) ─── */}
      <div {...ani(70)} className="grid grid-cols-3 gap-5">

        {/* ═══ PETA col-span-2 — height 420px fix ═══ */}
        <div className="col-span-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col" style={{height:420}}>

          {/* Map Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Navigation size={15} className="text-white"/>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm flex items-center gap-2">
                  Peta Taktis Operasional
                  <span className="flex items-center gap-1 text-[9px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                    <Wifi size={8}/> LIVE
                  </span>
                </h3>
                <p className="text-cyan-100 text-[10px]">{MOCK_VENUES.length} titik venue · Kota Bekasi</p>
              </div>
            </div>
            {/* Status pills */}
            <div className="flex items-center gap-1.5">
              {[
                {label:'Aktif',   hex:'#4caf50', n:MOCK_VENUES.filter(v=>v.status==='aktif').length},
                {label:'Siap',    hex:'#2196f3', n:MOCK_VENUES.filter(v=>v.status==='siap').length},
                {label:'Standby', hex:'#ff9800', n:MOCK_VENUES.filter(v=>v.status==='standby').length},
                {label:'Masalah', hex:'#f44336', n:MOCK_VENUES.filter(v=>v.status==='masalah').length},
              ].map(s=>(
                <div key={s.label} className="flex items-center gap-1 bg-white/15 border border-white/20 rounded-lg px-2 py-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:s.hex}}/>
                  <span className="text-[9px] text-white font-medium">{s.n} {s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map body — flex-1 agar memenuhi sisa tinggi tanpa overflow */}
          <div className="flex-1 relative min-h-0">
            <PetaKontingen venues={MOCK_VENUES} onSelect={setSelectedVenueId}/>

            {/* Legend kiri bawah */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 border border-gray-100 shadow-md rounded-xl px-3 py-2.5">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status Venue</div>
              {[
                {label:'Aktif — Pertandingan berjalan', hex:'#4caf50'},
                {label:'Siap — Menunggu laga',          hex:'#2196f3'},
                {label:'Standby',                       hex:'#ff9800'},
                {label:'Masalah — Perlu tindakan',      hex:'#f44336'},
              ].map(s=>(
                <div key={s.label} className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.hex}}/>
                  <span className="text-[9px] text-gray-500">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Stats kanan atas */}
            <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
              {[
                {icon:Users,    value:`${totals.petugas} petugas`,      color:'text-gray-600'},
                {icon:Activity, value:`${totals.live} laga live`,        color:'text-red-500'},
                {icon:Building2,value:`${totals.venueAktif} venue aktif`,color:'text-green-600'},
              ].map((s,i)=>(
                <div key={i} className="bg-white/90 border border-gray-100 shadow-sm rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
                  <s.icon size={11} className={s.color}/>
                  <span className={`text-[10px] font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Venue detail strip */}
          {selectedVenue && (
            <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{background:VENUE_HEX[selectedVenue.status]}}/>
                <span className="text-sm font-semibold text-[#3c4858]">{selectedVenue.nama}</span>
                <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{selectedVenue.cabor}</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Atlet: <b className="text-[#3c4858]">{selectedVenue.atlet_hadir}</b></span>
                <span>Petugas: <b className="text-[#3c4858]">{selectedVenue.petugas}</b></span>
                <span>Kapasitas: <b className="text-[#3c4858]">{Math.round((selectedVenue.atlet_hadir/selectedVenue.kapasitas)*100)}%</b></span>
                <span>Laga aktif: <b className={selectedVenue.laga_aktif>0?'text-red-500':'text-gray-400'}>{selectedVenue.laga_aktif}</b></span>
              </div>
              <button onClick={()=>setSelectedVenueId(null)} className="ml-auto text-gray-300 hover:text-gray-500">
                <X size={13}/>
              </button>
            </div>
          )}
        </div>

        {/* ─── Right: Live Events + Alert Stream ─── */}
        <div className="flex flex-col gap-4" style={{height:420}}>

          {/* Live Events */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col" style={{flex:'1.5'}}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
                <span className="text-white font-semibold text-sm">Live Events</span>
              </div>
              <span className="text-[9px] text-red-100 font-bold bg-white/20 px-2 py-0.5 rounded-full">
                {MOCK_LIVE.filter(l=>l.status==='live').length} LIVE
              </span>
            </div>
            <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
              {MOCK_LIVE.map(ev=>(
                <div key={ev.id} className={`px-4 py-2.5 ${ev.status==='live'?'bg-red-50/30':ev.status==='done'?'opacity-55':''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{ev.cabor}</span>
                        {ev.status==='live' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded font-bold">LIVE</span>}
                        {ev.status==='soon' && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 rounded font-bold">SOON</span>}
                        {ev.status==='done' && <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 rounded font-bold">DONE</span>}
                      </div>
                      <div className="text-xs font-medium text-[#3c4858] truncate">{ev.nomor}</div>
                      <div className="text-[10px] text-gray-400">{ev.atlet_bekasi}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-gray-400 font-mono">{ev.jam}</div>
                      {ev.hasil && <div className="text-[10px] font-bold text-green-600">{ev.hasil}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Stream */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col" style={{flex:'1'}}>
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
              <Zap size={13} className="text-yellow-500"/>
              <span className="text-sm font-semibold text-[#3c4858]">Alert Stream</span>
              <span className="ml-auto text-[10px] text-gray-400">{MOCK_ALERTS.length} notif</span>
            </div>
            <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
              {MOCK_ALERTS.map(al=>(
                <div key={al.id} className={`px-4 py-2.5 flex items-start gap-2.5 ${al.tipe==='warning'?'bg-orange-50/30':al.tipe==='success'?'bg-green-50/20':''}`}>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${al.tipe==='success'?'bg-green-100':al.tipe==='warning'?'bg-orange-100':'bg-blue-100'}`}>
                    {al.tipe==='success' && <CheckCircle size={11} className="text-green-600"/>}
                    {al.tipe==='warning' && <AlertTriangle size={11} className="text-orange-500"/>}
                    {al.tipe==='info'    && <Sparkles size={11} className="text-blue-500"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#3c4858] leading-relaxed">{al.pesan}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">{al.waktu} · {al.venue}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Cabor Ranking 4×2 — di bawah peta, semua kelihatan ─── */}
      <div {...ani(110)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#3c4858] flex items-center gap-2">
            <BarChart2 size={15} className="text-[#E84E0F]"/> Ranking Cabor Prioritas
          </h3>
          <div className="flex gap-2 text-xs">
            {[
              {label:'Kuat',   color:'text-green-600',  bg:'bg-green-50',  border:'border-green-200', n:MOCK_CABORS.filter(c=>c.prediksi==='kuat').length},
              {label:'Sedang', color:'text-orange-600', bg:'bg-orange-50', border:'border-orange-200',n:MOCK_CABORS.filter(c=>c.prediksi==='sedang').length},
              {label:'Risiko', color:'text-red-600',    bg:'bg-red-50',    border:'border-red-200',   n:MOCK_CABORS.filter(c=>c.prediksi==='risiko').length},
            ].map(s=>(
              <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${s.bg} ${s.border}`}>
                <span className={`font-bold ${s.color}`}>{s.n}</span>
                <span className={s.color}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {rankedCabors.map((c,i)=>(
            <div key={c.id}
              style={{transitionDelay:`${110+i*25}ms`,transition:'all 0.6s ease'}}
              className={animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4'}>
              <CaborRankCard c={c} rank={i+1}
                isSelected={selectedCabor?.id===c.id}
                onClick={()=>setSelectedCabor(p=>p?.id===c.id?null:c)}/>
            </div>
          ))}
        </div>

        {/* Detail expand */}
        {selectedCabor && (
          <div className="mt-4 bg-white rounded-xl border border-[#E84E0F]/30 shadow-sm p-4 flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-semibold text-[#3c4858]">{selectedCabor.nama}</h4>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${PREDIKSI_CONF[selectedCabor.prediksi].bg} ${PREDIKSI_CONF[selectedCabor.prediksi].color} ${PREDIKSI_CONF[selectedCabor.prediksi].border}`}>
                  {PREDIKSI_CONF[selectedCabor.prediksi].label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${PREDIKSI_CONF[selectedCabor.prediksi].bar}`}
                    style={{width:`${Math.min((selectedCabor.medali_emas/selectedCabor.target_emas)*100,100)}%`}}/>
                </div>
                <span className="text-xs font-bold text-gray-600">{selectedCabor.medali_emas}/{selectedCabor.target_emas} emas</span>
              </div>
            </div>
            <div className="flex gap-5 text-center">
              {[
                {label:'Atlet',    value:selectedCabor.total_atlet,        color:'text-blue-600'},
                {label:'Lolos',    value:selectedCabor.lolos_kual,         color:'text-green-600'},
                {label:'Hari Ini', value:selectedCabor.jadwal_hari_ini,    color:'text-orange-600'},
                {label:'Siap %',   value:`${selectedCabor.status_kesiapan}%`, color:'text-purple-600'},
              ].map(s=>(
                <div key={s.label}>
                  <div className={`text-lg font-light ${s.color}`}>{s.value}</div>
                  <div className="text-[9px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setSelectedCabor(null)} className="text-gray-300 hover:text-gray-500 ml-2">
              <X size={15}/>
            </button>
          </div>
        )}
      </div>

    </div>
  )
}