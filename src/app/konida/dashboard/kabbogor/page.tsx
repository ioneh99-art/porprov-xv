'use client'
// src/app/konida/dashboard/kabbogor/page.tsx
// War Room Kab. Bogor — "Tegar Beriman" Premium Dashboard
// Aesthetic: Luxury Dark Forest — deep emerald + gold accents, editorial layout

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import {
  Activity, AlertTriangle, Award, BarChart2,
  Building2, CheckCircle, Clock, Medal,
  Navigation, RefreshCw, Shield, Sparkles,
  Target, TrendingDown, TrendingUp,
  Users, Wifi, X, Zap, ChevronRight,
  Leaf, Mountain, Star, Trophy,
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
  atlet: string; venue: string; jam: string
  status: 'live' | 'soon' | 'done'; hasil?: string
}
interface AlertItem {
  id: number; tipe: 'warning' | 'info' | 'success'
  pesan: string; waktu: string; venue?: string
}

// ─── Mock Data Kab. Bogor ─────────────────────────────────
const MOCK_CABORS: CaborWarRoom[] = [
  { id:1, nama:'Atletik',      singkatan:'ATL', total_atlet:42, lolos_kual:39, medali_emas:4, medali_perak:3, medali_perunggu:2, target_emas:6, jadwal_hari_ini:6, laga_live:3, prediksi:'kuat',   trend:'up',     top_atlet:'Deni Firmansyah', status_kesiapan:94 },
  { id:2, nama:'Renang',       singkatan:'RNG', total_atlet:28, lolos_kual:26, medali_emas:3, medali_perak:2, medali_perunggu:3, target_emas:5, jadwal_hari_ini:4, laga_live:2, prediksi:'kuat',   trend:'up',     top_atlet:'Putri Ayu',      status_kesiapan:91 },
  { id:3, nama:'Pencak Silat', singkatan:'SIL', total_atlet:26, lolos_kual:24, medali_emas:3, medali_perak:2, medali_perunggu:1, target_emas:4, jadwal_hari_ini:3, laga_live:1, prediksi:'kuat',   trend:'up',     top_atlet:'Hendra Kurnia',  status_kesiapan:88 },
  { id:4, nama:'Bulu Tangkis', singkatan:'BT',  total_atlet:20, lolos_kual:18, medali_emas:2, medali_perak:2, medali_perunggu:2, target_emas:3, jadwal_hari_ini:2, laga_live:1, prediksi:'kuat',   trend:'stable', top_atlet:'Reza Maulana',   status_kesiapan:86 },
  { id:5, nama:'Karate',       singkatan:'KRT', total_atlet:18, lolos_kual:16, medali_emas:2, medali_perak:1, medali_perunggu:2, target_emas:3, jadwal_hari_ini:2, laga_live:0, prediksi:'kuat',   trend:'up',     top_atlet:'Sri Wahyuni',    status_kesiapan:90 },
  { id:6, nama:'Taekwondo',    singkatan:'TKD', total_atlet:16, lolos_kual:14, medali_emas:1, medali_perak:3, medali_perunggu:2, target_emas:3, jadwal_hari_ini:2, laga_live:1, prediksi:'sedang', trend:'up',     top_atlet:'Andi Saputra',   status_kesiapan:82 },
  { id:7, nama:'Voli',         singkatan:'VOL', total_atlet:24, lolos_kual:24, medali_emas:1, medali_perak:2, medali_perunggu:1, target_emas:2, jadwal_hari_ini:2, laga_live:1, prediksi:'sedang', trend:'stable', top_atlet:'Tim Putra',      status_kesiapan:85 },
  { id:8, nama:'Panahan',      singkatan:'PNH', total_atlet:14, lolos_kual:13, medali_emas:1, medali_perak:1, medali_perunggu:2, target_emas:2, jadwal_hari_ini:1, laga_live:0, prediksi:'sedang', trend:'up',     top_atlet:'Bayu Nugraha',   status_kesiapan:79 },
  { id:9, nama:'Basket',       singkatan:'BSK', total_atlet:22, lolos_kual:20, medali_emas:0, medali_perak:1, medali_perunggu:1, target_emas:1, jadwal_hari_ini:1, laga_live:0, prediksi:'risiko', trend:'down',   top_atlet:'Tim Putra',      status_kesiapan:65, alert:'Persiapan teknis kurang — perlu intensif sebelum laga 16:30' },
  { id:10, nama:'Sepak Bola',  singkatan:'SPB', total_atlet:22, lolos_kual:22, medali_emas:0, medali_perak:0, medali_perunggu:1, target_emas:1, jadwal_hari_ini:1, laga_live:0, prediksi:'risiko', trend:'down',   top_atlet:'Tim U-23',       status_kesiapan:71, alert:'Laga hidup-mati vs Kota Bandung jam 18:00' },
]

// Venues di Kab. Bogor — Cibinong, Bogor, Sentul
const MOCK_VENUES: VenuePoint[] = [
  { id:1,  nama:'Stadion Pakansari',           alamat:'Cibinong, Kab. Bogor',    lat:-6.4862, lng:106.8538, status:'aktif',   cabor:'Atletik',      atlet_hadir:42, kapasitas:600, laga_aktif:3, petugas:28 },
  { id:2,  nama:'GOR Laga Tangkas Cibinong',   alamat:'Cibinong, Kab. Bogor',    lat:-6.4790, lng:106.8580, status:'aktif',   cabor:'Bulu Tangkis', atlet_hadir:20, kapasitas:400, laga_aktif:1, petugas:20 },
  { id:3,  nama:'Kolam Renang Pakansari',      alamat:'Cibinong, Kab. Bogor',    lat:-6.4895, lng:106.8510, status:'aktif',   cabor:'Renang',       atlet_hadir:28, kapasitas:350, laga_aktif:2, petugas:18 },
  { id:4,  nama:'Hall Pencak Silat Sentul',    alamat:'Sentul, Kab. Bogor',      lat:-6.5612, lng:106.8934, status:'siap',    cabor:'Pencak Silat', atlet_hadir:24, kapasitas:300, laga_aktif:0, petugas:16 },
  { id:5,  nama:'Dojo Karate Bogor',           alamat:'Kec. Bogor Barat',        lat:-6.5734, lng:106.7893, status:'siap',    cabor:'Karate',       atlet_hadir:18, kapasitas:200, laga_aktif:0, petugas:14 },
  { id:6,  nama:'Hall Taekwondo Cibinong',     alamat:'Cibinong, Kab. Bogor',    lat:-6.4756, lng:106.8623, status:'aktif',   cabor:'Taekwondo',    atlet_hadir:16, kapasitas:220, laga_aktif:1, petugas:14 },
  { id:7,  nama:'GOR Volly Cibinong',          alamat:'Cibinong, Kab. Bogor',    lat:-6.4823, lng:106.8501, status:'siap',    cabor:'Voli',         atlet_hadir:24, kapasitas:350, laga_aktif:0, petugas:16 },
  { id:8,  nama:'Lapangan Panahan Sentul',     alamat:'Sentul City, Kab. Bogor', lat:-6.5534, lng:106.8867, status:'standby', cabor:'Panahan',      atlet_hadir:13, kapasitas:180, laga_aktif:0, petugas:10 },
  { id:9,  nama:'Hall Basket Cibinong',        alamat:'Cibinong, Kab. Bogor',    lat:-6.4912, lng:106.8645, status:'standby', cabor:'Basket',       atlet_hadir:22, kapasitas:280, laga_aktif:0, petugas:12 },
  { id:10, nama:'Stadion Sepak Bola Pakansari',alamat:'Cibinong, Kab. Bogor',    lat:-6.4834, lng:106.8492, status:'masalah', cabor:'Sepak Bola',   atlet_hadir:22, kapasitas:500, laga_aktif:0, petugas:22, },
]

const MOCK_LIVE: LiveEvent[] = [
  { id:1, cabor:'Atletik',   nomor:'100m Putra Final',       atlet:'Deni Firmansyah', venue:'Stadion Pakansari',   jam:'14:30', status:'live', hasil:'Heat 2' },
  { id:2, cabor:'Renang',    nomor:'200m Gaya Bebas Putri',  atlet:'Putri Ayu',       venue:'Kolam Renang PKS',    jam:'14:45', status:'live', hasil:'Lap 6' },
  { id:3, cabor:'Taekwondo', nomor:'Kelas 67kg Final',       atlet:'Andi Saputra',    venue:'Hall Taekwondo',      jam:'15:00', status:'live' },
  { id:4, cabor:'Silat',     nomor:'Kelas C Putra SF',       atlet:'Hendra Kurnia',   venue:'Hall Silat Sentul',   jam:'15:30', status:'soon' },
  { id:5, cabor:'Voli',      nomor:'Putra Pool A vs Depok',  atlet:'Tim Putra',       venue:'GOR Volly Cibinong',  jam:'16:00', status:'soon' },
  { id:6, cabor:'Atletik',   nomor:'400m Putri Final',       atlet:'Siti Rahayu',     venue:'Stadion Pakansari',   jam:'13:00', status:'done', hasil:'🥇 EMAS' },
  { id:7, cabor:'Karate',    nomor:'Kata Putri Final',       atlet:'Sri Wahyuni',     venue:'Dojo Karate Bogor',   jam:'12:30', status:'done', hasil:'🥇 EMAS' },
  { id:8, cabor:'Renang',    nomor:'100m Dada Putra Final',  atlet:'Bagas Wicaksono', venue:'Kolam Renang PKS',    jam:'11:45', status:'done', hasil:'🥈 PERAK' },
]

const MOCK_ALERTS: AlertItem[] = [
  { id:1, tipe:'success', pesan:'🥇 EMAS — Sri Wahyuni · Karate Kata Putri — LUAR BIASA!',         waktu:'12:35', venue:'Dojo Karate' },
  { id:2, tipe:'success', pesan:'🥇 EMAS — Siti Rahayu · Atletik 400m Putri — JUARA!',             waktu:'13:05', venue:'Stadion Pakansari' },
  { id:3, tipe:'info',    pesan:'Deni Firmansyah lolos ke Final 100m — persiapan start 14:30',      waktu:'13:48', venue:'Stadion Pakansari' },
  { id:4, tipe:'warning', pesan:'Rumput Stadion Sepak Bola kondisi kurang ideal — lapor ke KONI',   waktu:'12:30', venue:'Stadion Pakansari (Sepbola)' },
  { id:5, tipe:'success', pesan:'🥈 PERAK — Bagas Wicaksono · Renang 100m Dada Putra',             waktu:'11:50', venue:'Kolam Renang PKS' },
]

// ─── Config ───────────────────────────────────────────────
const PRIMARY   = '#065f46'
const PRIMARY_LT= '#d1fae5'
const GOLD      = '#d97706'
const GOLD_LT   = '#fef3c7'

const PREDIKSI_CONF: Record<PrediksiStatus, {label:string;color:string;bg:string;border:string;bar:string}> = {
  kuat:   { label:'Kuat',   color:'#065f46', bg:'#f0fdf4', border:'#bbf7d0', bar:'bg-emerald-600' },
  sedang: { label:'Sedang', color:'#92400e', bg:'#fffbeb', border:'#fde68a', bar:'bg-amber-500'   },
  risiko: { label:'Risiko', color:'#991b1b', bg:'#fef2f2', border:'#fecaca', bar:'bg-red-500'     },
}
const VENUE_HEX: Record<VenueStatus,string> = {
  aktif:'#059669', siap:'#2563eb', masalah:'#dc2626', standby:'#d97706', selesai:'#9ca3af',
}

// ─── Live Clock ───────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(()=>setT(new Date()),1000); return ()=>clearInterval(i) }, [])
  return (
    <span className="tabular-nums font-bold tracking-widest text-sm" style={{color:PRIMARY}}>
      {t.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
    </span>
  )
}

// ─── Peta Kab. Bogor ──────────────────────────────────────
function PetaKabBogor({ venues, onSelect }: { venues:VenuePoint[]; onSelect:(id:number)=>void }) {
  const mapRef         = useRef<HTMLDivElement>(null)
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

      // Center Cibinong — pusat olahraga Kab. Bogor
      const map = L.map(mapRef.current,{
        center:[-6.4862, 106.8538],
        zoom:12,
        zoomControl:true,
        scrollWheelZoom:false,
      })
      mapInstanceRef.current = map

      // Tile hijau gelap (stamen toner-lite bersih)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map)

      venues.forEach(v=>{
        const hex    = VENUE_HEX[v.status]
        const isLive = v.laga_aktif > 0
        const radius = isLive ? 14 : v.status==='masalah' ? 12 : 9

        const marker = L.circleMarker([v.lat,v.lng],{
          radius, fillColor:hex, color:'#ffffff', weight:2.5, opacity:1, fillOpacity:0.9,
        }).addTo(map)

        const pct = v.kapasitas>0 ? Math.round((v.atlet_hadir/v.kapasitas)*100) : 0
        marker.bindPopup(`
          <div style="font-family:'Segoe UI',sans-serif;min-width:210px;padding:4px">
            <div style="font-size:9px;font-weight:800;color:${hex};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">
              ● ${v.status.toUpperCase()}${v.laga_aktif>0?' · '+v.laga_aktif+' LIVE':''}
            </div>
            <div style="font-weight:800;font-size:13px;color:#1a1a1a;margin-bottom:2px">${v.nama}</div>
            <div style="font-size:10px;color:#9ca3af;margin-bottom:10px">${v.alamat}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:10px;background:#f8fffe;border-radius:8px;padding:8px;border:1px solid #d1fae5">
              <div><span style="color:#6b7280">Cabor</span><br/><b style="color:#065f46">${v.cabor}</b></div>
              <div><span style="color:#6b7280">Petugas</span><br/><b style="color:#1a1a1a">${v.petugas}</b></div>
              <div><span style="color:#6b7280">Atlet</span><br/><b style="color:${hex}">${v.atlet_hadir}/${v.kapasitas}</b></div>
              <div><span style="color:#6b7280">Kapasitas</span><br/><b style="color:#1a1a1a">${pct}%</b></div>
            </div>
          </div>`,{className:'popup-bogor'})
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
        .popup-bogor .leaflet-popup-content-wrapper{box-shadow:0 12px 30px rgba(6,95,70,0.15);border-radius:12px;border:1px solid #d1fae5;}
        .popup-bogor .leaflet-popup-content{margin:14px 15px;}
        .popup-bogor .leaflet-popup-tip{background:white;}
        .leaflet-container{background:#f0f7f4;}
        .leaflet-control-zoom{border:none!important;box-shadow:0 2px 12px rgba(6,95,70,0.2)!important;border-radius:10px!important;overflow:hidden;}
        .leaflet-control-zoom a{border:none!important;color:#065f46!important;font-weight:bold;}
      `}</style>
      <div ref={mapRef} className="w-full h-full"/>
    </div>
  )
}

// ─── Cabor Card (Kab. Bogor premium style) ───────────────
function CaborCard({ c, rank, isSelected, onClick }:{
  c:CaborWarRoom; rank:number; isSelected:boolean; onClick:()=>void
}) {
  const pred   = PREDIKSI_CONF[c.prediksi]
  const pct    = c.target_emas>0 ? Math.min(Math.round((c.medali_emas/c.target_emas)*100),100) : 0
  const kualPct= c.total_atlet>0 ? Math.round((c.lolos_kual/c.total_atlet)*100) : 0

  return (
    <div onClick={onClick}
      className={`rounded-2xl cursor-pointer transition-all overflow-hidden border-2 ${
        isSelected
          ? 'border-emerald-500 shadow-xl shadow-emerald-100'
          : 'border-transparent shadow-md hover:shadow-xl hover:border-emerald-200'
      }`}
      style={{ background:'white' }}>

      {/* Color accent top */}
      <div className={`h-1.5 ${pred.bar}`}/>

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Rank badge */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
              rank===1?'bg-yellow-100 text-yellow-700':
              rank===2?'bg-slate-100 text-slate-500':
              rank===3?'bg-orange-50 text-orange-500':
              'bg-emerald-50 text-emerald-400'
            }`}>
              {rank<=3 ? ['🥇','🥈','🥉'][rank-1] : rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-sm">{c.nama}</span>
                {c.laga_live>0 &&
                  <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    🔴 LIVE
                  </span>}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{c.top_atlet}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full border"
              style={{ background:pred.bg, color:pred.color, borderColor:pred.border }}>
              {pred.label}
            </span>
            <div className="flex items-center gap-1">
              {c.trend==='up'     && <TrendingUp  size={12} style={{color:'#059669'}}/>}
              {c.trend==='down'   && <TrendingDown size={12} style={{color:'#dc2626'}}/>}
              {c.trend==='stable' && <Activity    size={12} className="text-gray-400"/>}
              <span className="text-[9px] text-gray-400">
                {c.trend==='up'?'naik':c.trend==='down'?'turun':'stabil'}
              </span>
            </div>
          </div>
        </div>

        {/* Medali */}
        <div className="flex items-center gap-1 mb-3 p-2.5 rounded-xl" style={{background:'#f8fffe',border:'1px solid #d1fae5'}}>
          <span className="text-sm font-black text-yellow-600 mr-1">🥇{c.medali_emas}</span>
          <span className="text-sm font-bold text-gray-400">🥈{c.medali_perak}</span>
          <span className="text-sm font-bold text-orange-400 mr-auto">🥉{c.medali_perunggu}</span>
          <span className="text-[10px] text-gray-400">
            {c.medali_emas+c.medali_perak+c.medali_perunggu} total
          </span>
        </div>

        {/* Target progress */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-gray-500">Target Emas</span>
            <span className="font-bold" style={{color:PRIMARY}}>{c.medali_emas}/{c.target_emas}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{background:'#e7f5f0'}}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width:`${pct}%`,
                background: pct>=100
                  ? 'linear-gradient(90deg,#059669,#10b981)'
                  : pct>=60
                    ? 'linear-gradient(90deg,#d97706,#f59e0b)'
                    : 'linear-gradient(90deg,#dc2626,#ef4444)',
              }}/>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-1 pt-2.5 border-t" style={{borderColor:'#ecfdf5'}}>
          {[
            {l:'Atlet',    v:c.total_atlet,          c:'#2563eb'},
            {l:'Lolos',    v:`${kualPct}%`,          c:'#059669'},
            {l:'Hari Ini', v:c.jadwal_hari_ini,      c:'#d97706'},
            {l:'Siap',     v:`${c.status_kesiapan}%`,c:'#7c3aed'},
          ].map(s=>(
            <div key={s.l} className="text-center py-1.5 rounded-lg" style={{background:'#fafafa'}}>
              <div className="text-xs font-bold" style={{color:s.c}}>{s.v}</div>
              <div className="text-[9px] text-gray-400">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Alert */}
        {c.alert && (
          <div className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2" style={{background:'#fef2f2',border:'1px solid #fecaca'}}>
            <AlertTriangle size={11} style={{color:'#dc2626',marginTop:1,flexShrink:0}}/>
            <span style={{fontSize:10,color:'#991b1b'}}>{c.alert}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────
export default function DashboardKabBogor() {
  const [selectedVenueId, setSelectedVenueId] = useState<number|null>(null)
  const [selectedCabor,   setSelectedCabor]   = useState<CaborWarRoom|null>(null)
  const [animIn,          setAnimIn]           = useState(false)
  const [dismissedAlerts, setDismissedAlerts]  = useState<number[]>([])

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  const totals = useMemo(()=>({
    atlet:       MOCK_CABORS.reduce((a,c)=>a+c.total_atlet,0),
    emas:        MOCK_CABORS.reduce((a,c)=>a+c.medali_emas,0),
    perak:       MOCK_CABORS.reduce((a,c)=>a+c.medali_perak,0),
    perunggu:    MOCK_CABORS.reduce((a,c)=>a+c.medali_perunggu,0),
    target:      MOCK_CABORS.reduce((a,c)=>a+c.target_emas,0),
    live:        MOCK_CABORS.reduce((a,c)=>a+c.laga_live,0),
    venueAktif:  MOCK_VENUES.filter(v=>v.status==='aktif').length,
    venueMasalah:MOCK_VENUES.filter(v=>v.status==='masalah').length,
    petugas:     MOCK_VENUES.reduce((a,v)=>a+v.petugas,0),
    lolos:       MOCK_CABORS.reduce((a,c)=>a+c.lolos_kual,0),
  }),[])

  const rankedCabors = useMemo(()=>[...MOCK_CABORS].sort((a,b)=>{
    const o={kuat:0,sedang:1,risiko:2}
    if(o[a.prediksi]!==o[b.prediksi]) return o[a.prediksi]-o[b.prediksi]
    return b.medali_emas-a.medali_emas
  }),[])

  const selectedVenue = MOCK_VENUES.find(v=>v.id===selectedVenueId)
  const activeAlerts  = MOCK_ALERTS.filter(a=>!dismissedAlerts.includes(a.id))

  const ani = (d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.55s cubic-bezier(0.16,1,0.3,1)'},
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
  })

  const totalMedali = totals.emas + totals.perak + totals.perunggu
  const emasProgress = Math.round((totals.emas/totals.target)*100)

  return (
    <div className="min-h-screen p-6 space-y-5 font-sans"
      style={{background:'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f8fafc 100%)'}}>

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2"
              style={{background:'white',borderColor:'#bbf7d0'}}>
              <img src="/logos/kab-bogor.png" alt="Kab. Bogor"
                className="w-10 h-10 object-contain"
                onError={e=>{
                  const el=e.target as HTMLImageElement; el.style.display='none'
                  if(el.parentElement) el.parentElement.innerHTML='<span style="color:#065f46;font-weight:900;font-size:14px">KBR</span>'
                }}/>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white animate-pulse"
              style={{background:'#059669'}}/>
          </div>
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-[3px]"
                style={{color:PRIMARY}}>
                Kontingen · PORPROV XV 2026
              </span>
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold"
                style={{background:GOLD_LT,color:GOLD}}>
                🥇 Premium
              </span>
            </div>
            <h1 className="text-2xl font-light tracking-wide" style={{color:'#1a2e1a'}}>
              War Room <span className="font-bold" style={{color:PRIMARY}}>Kabupaten Bogor</span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#059669'}}/>
              <span>{totals.atlet} atlet · {MOCK_CABORS.length} cabor · {totals.venueAktif} venue aktif · {MOCK_VENUES.length} total venue</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Medal summary pill */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm border"
            style={{background:'white',borderColor:'#d1fae5'}}>
            <span className="text-sm font-black text-yellow-600">🥇{totals.emas}</span>
            <span className="text-sm font-bold text-gray-400">🥈{totals.perak}</span>
            <span className="text-sm font-bold text-orange-400">🥉{totals.perunggu}</span>
            <div className="w-px h-4 bg-gray-200 mx-1"/>
            <span className="text-xs font-bold" style={{color:PRIMARY}}>{totalMedali} total</span>
          </div>

          {totals.venueMasalah>0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border"
              style={{background:'#fef2f2',borderColor:'#fecaca'}}>
              <AlertTriangle size={13} style={{color:'#dc2626'}}/>
              <span className="text-xs font-bold" style={{color:'#dc2626'}}>{totals.venueMasalah} Masalah</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm border"
            style={{background:'white',borderColor:'#d1fae5'}}>
            <Clock size={13} style={{color:PRIMARY}}/>
            <LiveClock/>
          </div>

          <button className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold shadow-sm border transition-all hover:shadow-md"
            style={{background:'white',color:PRIMARY,borderColor:'#d1fae5'}}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>
      </div>

      {/* ─── ALERT STREAM ────────────────────────────────────── */}
      {activeAlerts.length>0 && (
        <div {...ani(20)} className="flex gap-2.5 overflow-x-auto pb-1">
          {activeAlerts.map(al=>(
            <div key={al.id} className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border flex-shrink-0 shadow-sm text-xs"
              style={{
                background: al.tipe==='success'?'#f0fdf4':al.tipe==='warning'?'#fffbeb':'#eff6ff',
                borderColor: al.tipe==='success'?'#bbf7d0':al.tipe==='warning'?'#fde68a':'#bfdbfe',
              }}>
              {al.tipe==='success' && <CheckCircle size={14} style={{color:'#059669',flexShrink:0}}/>}
              {al.tipe==='warning' && <AlertTriangle size={14} style={{color:'#d97706',flexShrink:0}}/>}
              {al.tipe==='info'    && <Sparkles size={14} style={{color:'#2563eb',flexShrink:0}}/>}
              <div>
                <div className="font-semibold" style={{
                  color: al.tipe==='success'?'#065f46':al.tipe==='warning'?'#92400e':'#1e40af'
                }}>{al.pesan}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{al.waktu} · {al.venue}</div>
              </div>
              <button onClick={()=>setDismissedAlerts(p=>[...p,al.id])}
                className="ml-2 text-gray-300 hover:text-gray-500 flex-shrink-0">
                <X size={11}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── KPI 6 CARDS ─────────────────────────────────────── */}
      <div {...ani(40)} className="grid grid-cols-6 gap-4">
        {[
          { label:'Total Atlet',    value:totals.atlet,    icon:Users,    grad:'from-emerald-600 to-emerald-500', sub:`${MOCK_CABORS.length} cabor` },
          { label:'Lolos Kualif.',  value:totals.lolos,    icon:CheckCircle, grad:'from-teal-600 to-teal-500',   sub:`${Math.round(totals.lolos/totals.atlet*100)}% total` },
          { label:'🥇 Medali Emas', value:totals.emas,     icon:Trophy,   grad:'from-amber-500 to-yellow-400',   sub:`target ${totals.target}` },
          { label:'Total Medali',   value:totalMedali,     icon:Award,    grad:'from-orange-500 to-amber-400',   sub:'🥇🥈🥉 gabungan' },
          { label:'Live Sekarang',  value:totals.live,     icon:Activity, grad:'from-red-500 to-rose-400',       sub:'laga berjalan' },
          { label:'Venue Aktif',    value:totals.venueAktif,icon:Building2,grad:'from-cyan-600 to-cyan-500',     sub:`dari ${MOCK_VENUES.length} venue` },
        ].map((c,i)=>(
          <div key={c.label} className="relative rounded-2xl p-4 pt-9 shadow-md border bg-white"
            style={{borderColor:'#e7f5f0'}}>
            <div className={`absolute -top-5 left-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br ${c.grad}`}>
              <c.icon size={20} className="text-white"/>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium text-gray-400 mb-0.5">{c.label}</p>
              <h4 className="text-2xl font-light" style={{color:'#1a2e1a'}}>{c.value}</h4>
              <p className="text-[9px] text-gray-300 mt-0.5">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── PROGRESS BAR EMAS ───────────────────────────────── */}
      <div {...ani(55)} className="rounded-2xl p-5 shadow-md border bg-white flex items-center gap-6"
        style={{borderColor:'#d1fae5'}}>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{background:GOLD_LT}}>
            <Target size={18} style={{color:GOLD}}/>
          </div>
          <div>
            <div className="text-sm font-bold" style={{color:'#1a2e1a'}}>Progress Target Emas</div>
            <div className="text-[10px] text-gray-400">{totals.emas} dari {totals.target} target medali emas</div>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[10px] text-gray-400 mb-2">
            <span>Progress keseluruhan</span>
            <span className="font-bold text-amber-600">{emasProgress}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{background:'#fef3c7'}}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{width:`${emasProgress}%`,background:'linear-gradient(90deg,#d97706,#f59e0b,#fbbf24)'}}/>
          </div>
        </div>
        <div className="flex gap-6 flex-shrink-0 text-center">
          {[
            {v:MOCK_CABORS.filter(c=>c.prediksi==='kuat').length,  l:'Cabor Kuat',   c:'#059669'},
            {v:MOCK_CABORS.filter(c=>c.prediksi==='sedang').length,l:'Cabor Sedang', c:'#d97706'},
            {v:MOCK_CABORS.filter(c=>c.prediksi==='risiko').length,l:'Cabor Risiko', c:'#dc2626'},
          ].map(s=>(
            <div key={s.l}>
              <div className="text-xl font-black" style={{color:s.c}}>{s.v}</div>
              <div className="text-[9px] text-gray-400">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── PETA + RIGHT PANEL ──────────────────────────────── */}
      <div {...ani(70)} className="grid grid-cols-3 gap-5">

        {/* Peta */}
        <div className="col-span-2 rounded-2xl shadow-md border overflow-hidden flex flex-col bg-white"
          style={{height:440,borderColor:'#d1fae5'}}>

          {/* Map header */}
          <div className="px-5 py-3.5 flex items-center justify-between flex-shrink-0"
            style={{background:`linear-gradient(135deg,${PRIMARY},#047857)`}}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{background:'rgba(255,255,255,0.2)'}}>
                <Navigation size={15} className="text-white"/>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  Peta Taktis — Kab. Bogor
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{background:'rgba(255,255,255,0.25)'}}>
                    LIVE
                  </span>
                </h3>
                <p className="text-emerald-200 text-[10px]">{MOCK_VENUES.length} venue · Cibinong–Sentul–Bogor</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {[
                {l:'Aktif',   hex:'#059669', n:MOCK_VENUES.filter(v=>v.status==='aktif').length},
                {l:'Siap',    hex:'#2563eb', n:MOCK_VENUES.filter(v=>v.status==='siap').length},
                {l:'Standby', hex:'#d97706', n:MOCK_VENUES.filter(v=>v.status==='standby').length},
                {l:'Masalah', hex:'#dc2626', n:MOCK_VENUES.filter(v=>v.status==='masalah').length},
              ].map(s=>(
                <div key={s.l} className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)'}}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:s.hex}}/>
                  <span className="text-[9px] text-white font-medium">{s.n} {s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map body */}
          <div className="flex-1 relative min-h-0">
            <PetaKabBogor venues={MOCK_VENUES} onSelect={setSelectedVenueId}/>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[400] rounded-2xl px-3 py-2.5 shadow-md"
              style={{background:'rgba(255,255,255,0.97)',border:'1px solid #d1fae5'}}>
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Status Venue</div>
              {[
                {l:'Aktif — pertandingan berjalan', hex:'#059669'},
                {l:'Siap — menunggu laga',          hex:'#2563eb'},
                {l:'Standby',                       hex:'#d97706'},
                {l:'Masalah — perlu tindakan',      hex:'#dc2626'},
              ].map(s=>(
                <div key={s.l} className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{background:s.hex}}/>
                  <span className="text-[9px] text-gray-500">{s.l}</span>
                </div>
              ))}
            </div>

            {/* Stats overlay kanan atas */}
            <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
              {[
                {icon:Users,    v:`${totals.petugas} petugas`,       c:PRIMARY},
                {icon:Activity, v:`${totals.live} laga live`,         c:'#dc2626'},
                {icon:Building2,v:`${totals.venueAktif} venue aktif`, c:'#059669'},
              ].map((s,i)=>(
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-sm"
                  style={{background:'rgba(255,255,255,0.95)',border:'1px solid #d1fae5'}}>
                  <s.icon size={11} style={{color:s.c}}/>
                  <span className="text-[10px] font-bold" style={{color:s.c}}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Venue detail strip */}
          {selectedVenue && (
            <div className="flex-shrink-0 border-t px-5 py-3 flex items-center gap-4"
              style={{background:'#f0fdf4',borderColor:'#d1fae5'}}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{background:VENUE_HEX[selectedVenue.status]}}/>
                <span className="text-sm font-bold" style={{color:'#1a2e1a'}}>{selectedVenue.nama}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{background:'#d1fae5',color:PRIMARY}}>{selectedVenue.cabor}</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Atlet: <b style={{color:PRIMARY}}>{selectedVenue.atlet_hadir}</b></span>
                <span>Petugas: <b style={{color:'#1a2e1a'}}>{selectedVenue.petugas}</b></span>
                <span>Kapasitas: <b style={{color:'#1a2e1a'}}>{Math.round((selectedVenue.atlet_hadir/selectedVenue.kapasitas)*100)}%</b></span>
                <span>Live: <b style={{color:selectedVenue.laga_aktif>0?'#dc2626':'#9ca3af'}}>{selectedVenue.laga_aktif}</b></span>
              </div>
              <button onClick={()=>setSelectedVenueId(null)} className="ml-auto text-gray-300 hover:text-gray-500">
                <X size={13}/>
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4" style={{height:440}}>

          {/* Live Events */}
          <div className="rounded-2xl shadow-md border overflow-hidden flex flex-col bg-white"
            style={{flex:'1.6',borderColor:'#d1fae5'}}>
            <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 rounded-t-2xl"
              style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)'}}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                <span className="text-white font-semibold text-sm">Live Events</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{background:'rgba(255,255,255,0.25)',color:'white'}}>
                {MOCK_LIVE.filter(l=>l.status==='live').length} LIVE
              </span>
            </div>
            <div className="overflow-y-auto divide-y flex-1" style={{borderColor:'#f0fdf4'}}>
              {MOCK_LIVE.map(ev=>(
                <div key={ev.id} className={`px-4 py-2.5 ${ev.status==='live'?'bg-red-50/40':ev.status==='done'?'opacity-50':''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{ev.cabor}</span>
                        {ev.status==='live' && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold">LIVE</span>}
                        {ev.status==='soon' && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 rounded-full font-bold">SOON</span>}
                        {ev.status==='done' && <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 rounded-full">DONE</span>}
                      </div>
                      <div className="text-xs font-semibold text-gray-800 truncate">{ev.nomor}</div>
                      <div className="text-[10px] text-gray-400">{ev.atlet}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-gray-400 font-mono">{ev.jam}</div>
                      {ev.hasil && <div className="text-[10px] font-black" style={{color:PRIMARY}}>{ev.hasil}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert stream */}
          <div className="rounded-2xl shadow-md border overflow-hidden flex flex-col bg-white"
            style={{flex:'1',borderColor:'#d1fae5'}}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2 flex-shrink-0"
              style={{borderColor:'#e7f5f0'}}>
              <Zap size={13} style={{color:GOLD}}/>
              <span className="text-sm font-semibold" style={{color:'#1a2e1a'}}>Alert Stream</span>
              <span className="ml-auto text-[10px] text-gray-400">{MOCK_ALERTS.length} notif</span>
            </div>
            <div className="overflow-y-auto divide-y flex-1" style={{borderColor:'#f0fdf4'}}>
              {MOCK_ALERTS.map(al=>(
                <div key={al.id} className="px-4 py-2.5 flex items-start gap-2.5"
                  style={{background:al.tipe==='warning'?'#fffbeb50':al.tipe==='success'?'#f0fdf440':''}}>
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{background:al.tipe==='success'?'#d1fae5':al.tipe==='warning'?'#fef3c7':'#dbeafe'}}>
                    {al.tipe==='success' && <CheckCircle size={11} style={{color:'#059669'}}/>}
                    {al.tipe==='warning' && <AlertTriangle size={11} style={{color:'#d97706'}}/>}
                    {al.tipe==='info'    && <Sparkles size={11} style={{color:'#2563eb'}}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-700 leading-relaxed">{al.pesan}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">{al.waktu} · {al.venue}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── CABOR RANKING 2×5 ───────────────────────────────── */}
      <div {...ani(110)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{color:'#1a2e1a'}}>
            <BarChart2 size={15} style={{color:PRIMARY}}/> Ranking {MOCK_CABORS.length} Cabor Olahraga
          </h3>
          <div className="flex gap-2">
            {[
              {l:'Kuat',   c:'#059669', bg:'#f0fdf4', border:'#bbf7d0', n:MOCK_CABORS.filter(c=>c.prediksi==='kuat').length},
              {l:'Sedang', c:'#92400e', bg:'#fffbeb', border:'#fde68a', n:MOCK_CABORS.filter(c=>c.prediksi==='sedang').length},
              {l:'Risiko', c:'#991b1b', bg:'#fef2f2', border:'#fecaca', n:MOCK_CABORS.filter(c=>c.prediksi==='risiko').length},
            ].map(s=>(
              <div key={s.l} className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs"
                style={{background:s.bg,borderColor:s.border,color:s.c}}>
                <span className="font-black">{s.n}</span> <span className="font-medium">{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {rankedCabors.map((c,i)=>(
            <div key={c.id}
              style={{transitionDelay:`${100+i*20}ms`,transition:'all 0.55s ease'}}
              className={animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4'}>
              <CaborCard c={c} rank={i+1}
                isSelected={selectedCabor?.id===c.id}
                onClick={()=>setSelectedCabor(p=>p?.id===c.id?null:c)}/>
            </div>
          ))}
        </div>

        {/* Cabor detail expand */}
        {selectedCabor && (
          <div className="mt-4 rounded-2xl border p-5 flex items-center gap-6 shadow-md"
            style={{background:'white',borderColor:`${PRIMARY}40`}}>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h4 className="font-bold text-gray-800">{selectedCabor.nama}</h4>
                <span className="text-[9px] font-bold px-2.5 py-1 rounded-full border"
                  style={{
                    background:PREDIKSI_CONF[selectedCabor.prediksi].bg,
                    color:PREDIKSI_CONF[selectedCabor.prediksi].color,
                    borderColor:PREDIKSI_CONF[selectedCabor.prediksi].border,
                  }}>
                  {PREDIKSI_CONF[selectedCabor.prediksi].label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{background:'#e7f5f0'}}>
                  <div className={`h-full rounded-full ${PREDIKSI_CONF[selectedCabor.prediksi].bar}`}
                    style={{width:`${Math.min((selectedCabor.medali_emas/selectedCabor.target_emas)*100,100)}%`}}/>
                </div>
                <span className="text-xs font-bold" style={{color:PRIMARY}}>
                  {selectedCabor.medali_emas}/{selectedCabor.target_emas} emas
                </span>
              </div>
            </div>
            <div className="flex gap-6 text-center">
              {[
                {l:'Atlet',    v:selectedCabor.total_atlet,         c:'#2563eb'},
                {l:'Lolos',    v:selectedCabor.lolos_kual,          c:PRIMARY},
                {l:'Hari Ini', v:selectedCabor.jadwal_hari_ini,     c:'#d97706'},
                {l:'Siap %',   v:`${selectedCabor.status_kesiapan}%`,c:'#7c3aed'},
              ].map(s=>(
                <div key={s.l}>
                  <div className="text-2xl font-light" style={{color:s.c}}>{s.v}</div>
                  <div className="text-[9px] text-gray-400">{s.l}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setSelectedCabor(null)} className="text-gray-300 hover:text-gray-400 ml-2">
              <X size={15}/>
            </button>
          </div>
        )}
      </div>

    </div>
  )
}