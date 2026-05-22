'use client'
// src/app/konida/dashboard/kabbogor/page.tsx — v4
// + Peta Sebaran Atlet terintegrasi

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Trophy, Target, TrendingUp, CheckCircle, Clock,
  AlertTriangle, Zap, Shield, ChevronRight, Award,
  RefreshCw, Info, Search, X, Flame, FileText,
  Download, Monitor, Map, Star, Medal,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PRIMARY       = '#065f46'
const ACCENT        = '#00ffaa'
const KONTINGEN_ID  = 1
const KODE_LOKAL    = '3201' // KTP Kab. Bogor

// ── Koordinat asal daerah (dari decode NIK) ───────────────
const ASAL_COORDS: Record<string, [number, number]> = {
  'Kab. Bogor':          [-6.5241, 106.8451],
  'Kota Bogor':          [-6.5934, 106.7892],
  'Kab. Sukabumi':       [-6.9212, 106.9281],
  'Kota Sukabumi':       [-6.9277, 106.9303],
  'Kab. Cianjur':        [-6.8218, 107.1423],
  'Kab. Bandung':        [-7.0315, 107.5250],
  'Kota Bandung':        [-6.9175, 107.6191],
  'Kab. Bandung Barat':  [-6.8400, 107.4900],
  'Kota Cimahi':         [-6.8723, 107.5420],
  'Kab. Garut':          [-7.2134, 107.9091],
  'Kab. Tasikmalaya':    [-7.3250, 108.2201],
  'Kota Tasikmalaya':    [-7.3277, 108.2203],
  'Kab. Ciamis':         [-7.3298, 108.3521],
  'Kota Banjar':         [-7.3700, 108.5400],
  'Kab. Pangandaran':    [-7.6892, 108.6512],
  'Kab. Kuningan':       [-6.9812, 108.4845],
  'Kab. Cirebon':        [-6.7412, 108.5623],
  'Kota Cirebon':        [-6.7063, 108.5570],
  'Kab. Majalengka':     [-6.8367, 108.2423],
  'Kab. Sumedang':       [-6.8572, 107.9234],
  'Kab. Indramayu':      [-6.3276, 108.3214],
  'Kab. Subang':         [-6.5712, 107.7634],
  'Kab. Purwakarta':     [-6.5567, 107.4412],
  'Kab. Karawang':       [-6.3245, 107.3312],
  'Kab. Bekasi':         [-6.3745, 107.1456],
  'Kota Bekasi':         [-6.2381, 107.0024],
  'Kota Depok':          [-6.4025, 106.7942],
  'DKI Jakarta':         [-6.2088, 106.8456],
  'Jawa Tengah':         [-7.1500, 110.1403],
  'Jawa Timur':          [-7.2504, 112.7688],
  'Banten':              [-6.1234, 106.1512],
  'Luar Jawa':           [-6.9000, 107.6500],
}

const CABOR_KATEGORI: Record<string, string> = {
  'Sepak Bola':'Permainan','Bola Basket':'Permainan','Bola Voli':'Permainan',
  'Hockey':'Permainan','Floorball':'Permainan','Rugby':'Permainan','Futsal':'Permainan',
  'Pencak Silat':'Bela Diri','Karate':'Bela Diri','Taekwondo':'Bela Diri',
  'Judo':'Bela Diri','Gulat':'Bela Diri','Tinju':'Bela Diri','Muaythai':'Bela Diri',
  'Atletik':'Atletik','Renang':'Air','Akuatik':'Air','Dayung':'Air','Selam':'Air',
  'Panahan':'Akurasi','Menembak':'Akurasi','Biliar':'Akurasi','Petanque':'Akurasi',
  'Catur':'Mental','Angkat Besi':'Angkat','Angkat Berat':'Angkat','Binaraga':'Angkat',
  'Senam':'Seni','Dancesport':'Seni','Balap Sepeda':'Otomotif','Panjat Tebing':'Alam',
}

interface AtletRaw { status_registrasi:string; gender:string; cabor_nama_raw:string; kode_asal_daerah:string; nama_asal_daerah:string; tgl_lahir:string }
interface CaborStat { nama:string; total:number; putra:number; putri:number; verified:number; kategori:string; emas:number; perak:number; perunggu:number; conversion:number }
interface PinData   { nama:string; kode:string; total:number; putra:number; putri:number; lat:number; lng:number; isLokal:boolean }

// ── Helpers ───────────────────────────────────────────────
function Bar({ value, max, color, h=5 }: {value:number;max:number;color:string;h?:number}) {
  return (
    <div className="rounded-full overflow-hidden" style={{height:h,background:'rgba(255,255,255,0.06)'}}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{width:`${max>0?Math.min(value/max*100,100):0}%`,background:color}}/>
    </div>
  )
}

function LiveClock() {
  const [t, setT] = useState('')
  useEffect(()=>{
    const f=()=>new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setT(f()); const i=setInterval(()=>setT(f()),1000); return()=>clearInterval(i)
  },[])
  return <span className="tabular-nums font-mono font-bold" style={{color:ACCENT}}>{t}</span>
}

// ── Peta Sebaran Atlet ────────────────────────────────────
function PetaSebaranAtlet({ pins }: { pins: PinData[] }) {
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap|null>(null)

  useEffect(()=>{
    let cancelled = false
    async function init() {
      if (!mapDiv.current || pins.length === 0) return
      const L = (await import('leaflet')).default
      // @ts-ignore
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapDiv.current) return
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      const el = mapDiv.current as any
      if (el._leaflet_id) el._leaflet_id = undefined

      const map = L.map(mapDiv.current, {
        center: [-6.8, 107.4], zoom: 8,
        zoomControl: true, scrollWheelZoom: false, attributionControl: false,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map)

      const maxTotal = Math.max(...pins.map(p=>p.total), 1)

      pins.forEach(pin => {
        const color  = pin.isLokal ? ACCENT : '#f87171'
        const radius = Math.max(7, Math.min(pin.total / maxTotal * 28, 22))

        // Glow ring
        L.circleMarker([pin.lat, pin.lng], {
          radius: radius+10, fillColor:color, color:color, weight:0, opacity:0, fillOpacity:0.1,
        }).addTo(map)

        // Main dot
        L.circleMarker([pin.lat, pin.lng], {
          radius, fillColor:color, color:'#020d06', weight:2, opacity:1, fillOpacity:0.88,
        }).addTo(map).bindPopup(`
          <div style="font-family:system-ui;min-width:190px;padding:4px">
            <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
              ${pin.isLokal ? '● ATLET LOKAL' : '⚠ NON-LOKAL / CABUTAN'}
            </div>
            <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:8px">${pin.nama}</div>
            <div style="background:#0a0f1a;border-radius:8px;padding:8px;border:1px solid #1e293b">
              <div style="display:flex;justify-content:space-between;font-size:12px;padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid #1e293b">
                <span style="color:#6b7280">Total Atlet</span>
                <b style="color:#fff;font-size:15px">${pin.total}</b>
              </div>
              <div style="display:flex;gap:16px;font-size:11px">
                <span style="color:${ACCENT}">⚡ ${pin.putra} Putra</span>
                <span style="color:#f472b6">♀ ${pin.putri} Putri</span>
              </div>
            </div>
          </div>
        `, { className:'porprov-popup' })
      })

      // Legend
      const LegendControl = L.Control.extend({
        onAdd() {
          const d = L.DomUtil.create('div')
          d.innerHTML = `
            <div style="background:rgba(2,13,6,0.92);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;backdrop-filter:blur(8px)">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-family:system-ui;font-size:11px;color:#d1d5db">
                <div style="width:10px;height:10px;border-radius:50%;background:${ACCENT};box-shadow:0 0 6px ${ACCENT}80"></div> Atlet Lokal
              </div>
              <div style="display:flex;align-items:center;gap:8px;font-family:system-ui;font-size:11px;color:#d1d5db">
                <div style="width:10px;height:10px;border-radius:50%;background:#f87171;box-shadow:0 0 6px #f8717180"></div> Non-Lokal
              </div>
            </div>`
          return d
        }
      })
new LegendControl({ position: 'bottomright' }).addTo(map)
    }
    void init()
    return () => { cancelled=true; if(mapRef.current){mapRef.current.remove();mapRef.current=null} }
  }, [pins])

  return (
    <>
      <style>{`
        .porprov-popup .leaflet-popup-content-wrapper{background:#0a0f1a;border-radius:12px;border:1px solid #1e293b;box-shadow:0 15px 35px rgba(0,0,0,0.9)}
        .porprov-popup .leaflet-popup-content{margin:12px}
        .porprov-popup .leaflet-popup-tip{background:#0a0f1a}
        .leaflet-container{background:#020d06;font-family:system-ui}
        .leaflet-control-zoom{border:1px solid rgba(255,255,255,0.1)!important;border-radius:8px!important;overflow:hidden}
        .leaflet-control-zoom a{background:rgba(2,13,6,0.9)!important;color:#9ca3af!important;border-color:rgba(255,255,255,0.08)!important}
        .leaflet-control-zoom a:hover{background:rgba(0,255,170,0.1)!important;color:${ACCENT}!important}
      `}</style>
      <div ref={mapDiv} style={{width:'100%',height:'100%',background:'#020d06'}}/>
    </>
  )
}

// ── Main Dashboard ────────────────────────────────────────
export default function DashboardKabBogor() {
  const [atlets,    setAtlets]    = useState<AtletRaw[]>([])
  const [cabors,    setCabors]    = useState<CaborStat[]>([])
  const [klasemen,  setKlasemen]  = useState<any[]>([])
  const [myMedali,  setMyMedali]  = useState({emas:0,perak:0,perunggu:0,total:0})
  const [pins,      setPins]      = useState<PinData[]>([])
  const [loading,   setLoading]   = useState(true)
  const [animIn,    setAnimIn]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [selCabor,  setSelCabor]  = useState<CaborStat|null>(null)
  const [activeTab, setActiveTab] = useState<'ranking'|'heatmap'|'conversion'|'gender'>('ranking')
  const [showAll,   setShowAll]   = useState(false)

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(()=>{
    async function load() {
      const [a, k, m] = await Promise.allSettled([
        sb.from('atlet')
          .select('status_registrasi,gender,cabor_nama_raw,kode_asal_daerah,nama_asal_daerah,tgl_lahir')
          .eq('kontingen_id', KONTINGEN_ID),
        sb.from('klasemen_medali').select('emas,perak,perunggu,total,kontingen(nama)')
          .order('emas',{ascending:false}).order('perak',{ascending:false}).limit(10),
        sb.from('klasemen_medali').select('emas,perak,perunggu,total')
          .eq('kontingen_id', KONTINGEN_ID).maybeSingle(),
      ])

      if (a.status==='fulfilled' && a.value.data) {
        const data = a.value.data as AtletRaw[]
        setAtlets(data)

        // ── Build cabor stats ──
        const cmap: Record<string,{total:number,putra:number,putri:number,verified:number}> = {}
        data.forEach(x=>{
          const c = x.cabor_nama_raw||'Lainnya'
          if(!cmap[c]) cmap[c]={total:0,putra:0,putri:0,verified:0}
          cmap[c].total++
          if(x.gender==='L') cmap[c].putra++; else cmap[c].putri++
          if(x.status_registrasi==='Verified') cmap[c].verified++
        })
        const MEDALI: Record<string,{e:number,p:number,pg:number}> = {
          'Hockey':{e:1,p:0,pg:0},'Dayung':{e:2,p:1,pg:1},'Atletik':{e:3,p:1,pg:0},
          'Taekwondo':{e:2,p:0,pg:1},'Karate':{e:1,p:2,pg:0},'Renang':{e:0,p:1,pg:2},
          'Menembak':{e:1,p:1,pg:1},'Panahan':{e:0,p:1,pg:1},'Pencak Silat':{e:1,p:0,pg:2},
        }
        const clist: CaborStat[] = Object.entries(cmap).map(([nama,s])=>{
          const med = MEDALI[nama]??{e:0,p:0,pg:0}
          const tm  = med.e+med.p+med.pg
          return { nama, total:s.total, putra:s.putra, putri:s.putri, verified:s.verified,
            kategori:CABOR_KATEGORI[nama]||'Umum', emas:med.e, perak:med.p, perunggu:med.pg,
            conversion:s.total>0?Math.round(tm/s.total*100):0 }
        }).sort((a,b)=>b.total-a.total)
        setCabors(clist)

        // ── Build peta pins ──
        const asalMap: Record<string,{total:number,putra:number,putri:number,kode:string}> = {}
        data.forEach(x=>{
          const key = x.nama_asal_daerah||'Tidak Diketahui'
          if(!asalMap[key]) asalMap[key]={total:0,putra:0,putri:0,kode:x.kode_asal_daerah||''}
          asalMap[key].total++
          if(x.gender==='L') asalMap[key].putra++; else asalMap[key].putri++
        })
        const pinsData: PinData[] = Object.entries(asalMap)
          .map(([nama,s])=>{
            const coords = ASAL_COORDS[nama]
            if (!coords) return null
            return {
              nama, kode:s.kode, total:s.total, putra:s.putra, putri:s.putri,
              lat:coords[0], lng:coords[1],
              isLokal: s.kode.startsWith(KODE_LOKAL),
            }
          })
          .filter(Boolean) as PinData[]
        setPins(pinsData)
      }

      if (k.status==='fulfilled' && k.value.data) setKlasemen(k.value.data as any[])
      if (m.status==='fulfilled' && m.value.data) {
        const d = m.value.data
        setMyMedali({emas:d.emas??0,perak:d.perak??0,perunggu:d.perunggu??0,total:d.total??0})
      }
      setLoading(false)
    }
    void load()
  },[])

  const kpi = useMemo(()=>{
    const total    = atlets.length
    const putra    = atlets.filter(a=>a.gender==='L').length
    const putri    = atlets.filter(a=>a.gender==='P').length
    const verified = atlets.filter(a=>a.status_registrasi==='Verified').length
    const pending  = atlets.filter(a=>a.status_registrasi==='Menunggu Admin').length
    const ditolak  = atlets.filter(a=>a.status_registrasi==='Ditolak Admin').length
    const lokal    = atlets.filter(a=>a.kode_asal_daerah?.startsWith(KODE_LOKAL)).length
    const nonLokal = total-lokal
    const myRank   = klasemen.findIndex(k=>String((k.kontingen as any)?.nama??'').includes('Bogor'))+1
    return { total,putra,putri,verified,pending,ditolak,lokal,nonLokal,
      vpct:total>0?Math.round(verified/total*100):0,
      lpct:total>0?Math.round(lokal/total*100):0,
      myRank }
  },[atlets,klasemen])

  const byKategori = useMemo(()=>{
    const m:Record<string,{total:number,medali:number,list:string[]}>={}
    cabors.forEach(c=>{
      if(!m[c.kategori])m[c.kategori]={total:0,medali:0,list:[]}
      m[c.kategori].total+=c.total; m[c.kategori].medali+=c.emas+c.perak+c.perunggu; m[c.kategori].list.push(c.nama)
    })
    return Object.entries(m).sort((a,b)=>b[1].total-a[1].total)
  },[cabors])

  const topConv    = useMemo(()=>[...cabors].filter(c=>c.total>3).sort((a,b)=>b.conversion-a.conversion).slice(0,10),[cabors])
  const domPutra   = useMemo(()=>cabors.filter(c=>c.total>3&&c.putra/c.total>0.8).slice(0,5),[cabors])
  const domPutri   = useMemo(()=>cabors.filter(c=>c.total>3&&c.putri/c.total>0.6).slice(0,5),[cabors])
  const filtered   = useMemo(()=>search?cabors.filter(c=>c.nama.toLowerCase().includes(search.toLowerCase())):cabors,[cabors,search])
  const displayed  = showAll?filtered:filtered.slice(0,12)
  const maxAtlet   = cabors[0]?.total??1

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.55s cubic-bezier(0.16,1,0.3,1)'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-5',
  })

  if(loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#020d06'}}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{borderColor:`${ACCENT}20`,borderTopColor:ACCENT}}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{color:ACCENT}}>Memuat Data...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300" style={{background:'linear-gradient(135deg,#020d06 0%,#040f08 100%)'}}>
      <div className="fixed inset-0 pointer-events-none"
        style={{backgroundImage:`linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`,backgroundSize:'32px 32px',zIndex:0}}/>

      {/* ── HEADER ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b backdrop-blur-xl"
        style={{background:'rgba(2,13,6,0.93)',borderColor:`${ACCENT}12`}}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{background:`${PRIMARY}40`,border:`1px solid ${ACCENT}30`,boxShadow:`0 0 20px ${ACCENT}10`}}>
            <span className="text-white font-black text-sm">KB</span>
          </div>
          <div>
            <h1 className="text-white font-black text-base tracking-wide">DASHBOARD KAB. BOGOR</h1>
            <div className="text-[10px] font-mono uppercase tracking-widest mt-0.5 flex items-center gap-1.5" style={{color:ACCENT}}>
              <Zap size={10} className="text-amber-400"/> Intelligence Command · PORPROV XV 2026
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{background:`${ACCENT}08`,border:`1px solid ${ACCENT}20`}}>
            <Clock size={13} style={{color:ACCENT}}/><LiveClock/>
          </div>
          <button onClick={()=>window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      </nav>

      <main className="p-5 max-w-[1600px] mx-auto space-y-5 relative z-10">

        {/* ── EXECUTIVE BRIEF ── */}
        <div {...ani(0)} className="p-4 rounded-2xl flex items-start gap-4"
          style={{background:`${ACCENT}05`,border:`1px solid ${ACCENT}15`}}>
          <Info size={18} style={{color:ACCENT,flexShrink:0,marginTop:1}}/>
          <p className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-white">{kpi.total.toLocaleString('id')} atlet</strong> dari{' '}
            <strong className="text-white">{cabors.length} cabor</strong> ·{' '}
            <strong style={{color:'#4ade80'}}>{kpi.vpct}% verified</strong>
            {kpi.pending>0 && <> · <strong className="text-amber-400">{kpi.pending} pending</strong></>} ·{' '}
            {kpi.nonLokal>0 && <><strong className="text-rose-400">{kpi.nonLokal} atlet non-lokal</strong> ({Math.round(kpi.nonLokal/kpi.total*100)}%) · </>}
            Ranking <strong className="text-amber-400">#{kpi.myRank>0?kpi.myRank:'—'}</strong> ·{' '}
            <strong className="text-yellow-400">🥇{myMedali.emas} 🥈{myMedali.perak} 🥉{myMedali.perunggu}</strong>
          </p>
        </div>

        {/* ── KPI CARDS ── */}
        <div {...ani(40)} className="grid grid-cols-4 gap-3">
          {/* Total atlet */}
          <div className="col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{background:`${ACCENT}06`,border:`1px solid ${ACCENT}18`}}>
            <div className="absolute top-0 right-0 opacity-[0.03]"><Users size={120}/></div>
            <Users size={16} style={{color:ACCENT}} className="mb-2"/>
            <div className="text-5xl font-light text-white mb-3">{kpi.total.toLocaleString('id')}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Total Atlet Terdaftar · {cabors.length} Cabor</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{color:ACCENT}}>Putra {kpi.putra}</span>
                  <span className="text-white font-bold">{Math.round(kpi.putra/kpi.total*100)}%</span>
                </div>
                <Bar value={kpi.putra} max={kpi.total} color={ACCENT}/>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-pink-400">Putri {kpi.putri}</span>
                  <span className="text-white font-bold">{Math.round(kpi.putri/kpi.total*100)}%</span>
                </div>
                <Bar value={kpi.putri} max={kpi.total} color="#f472b6"/>
              </div>
            </div>
          </div>

          {/* Verifikasi */}
          <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <CheckCircle size={15} className="text-green-400 mb-2"/>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Status Verifikasi</div>
            {[{l:'Verified',v:kpi.verified,c:'#4ade80'},{l:'Pending',v:kpi.pending,c:'#fbbf24'},{l:'Ditolak',v:kpi.ditolak,c:'#f87171'}].map(s=>(
              <div key={s.l} className="mb-2.5">
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{color:s.c}}>{s.l}</span>
                  <span className="text-white font-mono font-bold">{s.v}</span>
                </div>
                <Bar value={s.v} max={kpi.total} color={s.c}/>
              </div>
            ))}
            <div className="text-[10px] text-zinc-500 mt-1">Progress: <span className="font-bold text-green-400">{kpi.vpct}%</span></div>
          </div>

          {/* Medali */}
          <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,215,0,0.12)'}}>
            <Trophy size={15} className="text-yellow-400 mb-2"/>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Medali & Ranking</div>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl font-black text-yellow-400">#{kpi.myRank>0?kpi.myRank:'—'}</div>
              <div className="text-xs text-zinc-500">Klasemen<br/>PORPROV XV</div>
            </div>
            <div className="flex gap-1.5">
              {[{l:'Emas',v:myMedali.emas,c:'#ffd700'},{l:'Perak',v:myMedali.perak,c:'#c0c0c0'},{l:'Perunggu',v:myMedali.perunggu,c:'#cd7f32'}].map(m=>(
                <div key={m.l} className="flex-1 text-center rounded-xl py-2"
                  style={{background:`${m.c}12`,border:`1px solid ${m.c}25`}}>
                  <div className="text-xl font-black" style={{color:m.c}}>{m.v}</div>
                  <div className="text-[9px] text-zinc-600">{m.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── PETA + KLASEMEN + TARGET ── */}
        <div {...ani(80)} className="grid grid-cols-3 gap-5">

          {/* PETA SEBARAN ATLET — col-span-2 */}
          <div className="col-span-2 rounded-2xl overflow-hidden relative"
              style={{border:`1px solid ${ACCENT}15`,height:380}}>

            {/* Overlay label */}
            <div className="absolute top-4 left-4 z-[400] pointer-events-none"
              style={{background:'rgba(2,13,6,0.9)',border:`1px solid ${ACCENT}25`,borderRadius:12,padding:'10px 14px',backdropFilter:'blur(8px)'}}>
              <div className="flex items-center gap-2 text-white text-sm font-bold">
                <Map size={15} style={{color:ACCENT}}/> Radar Sebaran Atlet
              </div>
              <div className="text-[10px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                {pins.filter(p=>p.isLokal).reduce((a,p)=>a+p.total,0)} lokal ·{' '}
                {pins.filter(p=>!p.isLokal).reduce((a,p)=>a+p.total,0)} non-lokal ·{' '}
                {pins.length} daerah asal
              </div>
            </div>

            {/* Stats overlay kanan atas */}
            <div className="absolute top-4 right-4 z-[400] pointer-events-none flex gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{background:'rgba(0,255,170,0.15)',border:`1px solid ${ACCENT}30`}}>
                <div className="w-2 h-2 rounded-full" style={{background:ACCENT}}/>
                <span className="text-[10px] font-bold" style={{color:ACCENT}}>
                  {kpi.lpct}% Lokal
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.25)'}}>
                <div className="w-2 h-2 rounded-full bg-red-400"/>
                <span className="text-[10px] font-bold text-red-400">
                  {kpi.nonLokal} Non-Lokal
                </span>
              </div>
            </div>

            <PetaSebaranAtlet pins={pins}/>
          </div>

          {/* Klasemen + Target */}
          <div className="space-y-4">

            {/* Klasemen */}
            <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,215,0,0.1)'}}>
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={13} style={{color:'#ffd700'}}/>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Klasemen PORPROV XV</span>
              </div>
              <div className="space-y-1.5">
                {klasemen.map((k:any,i)=>{
                  const nama = (k.kontingen as any)?.nama??'-'
                  const isUs = nama.toUpperCase().includes('KAB. BOGOR')||nama.includes('Kab. Bogor')
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-xl"
                      style={{background:isUs?`${ACCENT}08`:'rgba(255,255,255,0.02)',border:`1px solid ${isUs?`${ACCENT}20`:'rgba(255,255,255,0.04)'}`}}>
                      <span className="text-xs w-5 text-center font-mono flex-shrink-0"
                        style={{color:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,0.2)'}}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                      </span>
                      <span className="flex-1 text-xs font-medium truncate"
                        style={{color:isUs?ACCENT:'rgba(255,255,255,0.55)'}}>
                        {nama}{isUs?' ✦':''}
                      </span>
                      <div className="flex gap-1 text-[10px] font-mono font-bold flex-shrink-0">
                        <span style={{color:'#ffd700'}}>{k.emas}</span>
                        <span style={{color:'#9ca3af'}}>{k.perak}</span>
                        <span style={{color:'#cd7f32'}}>{k.perunggu}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Target */}
            <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.025)',border:`1px solid ${ACCENT}12`}}>
              <div className="flex items-center gap-2 mb-3">
                <Target size={13} style={{color:ACCENT}}/>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Target vs Realisasi</span>
              </div>
              {[
                {l:'Emas',    v:myMedali.emas,     t:50, c:'#ffd700'},
                {l:'Perak',   v:myMedali.perak,    t:40, c:'#c0c0c0'},
                {l:'Perunggu',v:myMedali.perunggu, t:30, c:'#cd7f32'},
              ].map(m=>(
                <div key={m.l} className="mb-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span style={{color:m.c}} className="font-bold">{m.l}</span>
                    <span className="text-zinc-400 font-mono">{m.v}/{m.t} ({Math.round(m.v/m.t*100)}%)</span>
                  </div>
                  <Bar value={m.v} max={m.t} color={m.c} h={6}/>
                </div>
              ))}
              <div className="pt-3 border-t flex justify-between text-xs" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                <span className="text-zinc-500">Global Conversion</span>
                <span className="font-black" style={{color:ACCENT}}>
                  {kpi.total>0?Math.round(myMedali.total/kpi.total*100):0}%
                </span>
              </div>
            </div>

            {/* Kemandirian */}
            <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={13} style={{color:ACCENT}}/>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Kemandirian</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <div className="text-4xl font-light text-white">{kpi.lpct}%</div>
                <div className="text-xs text-zinc-500">Atlet Lokal</div>
              </div>
              <Bar value={kpi.lokal} max={kpi.total} color={ACCENT} h={6}/>
              <div className="flex justify-between text-[10px] mt-2">
                <span style={{color:ACCENT}}>{kpi.lokal} lokal</span>
                <span className="text-rose-400">{kpi.nonLokal} non-lokal</span>
              </div>
              {kpi.nonLokal>kpi.total*0.15 && (
                <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg"
                  style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)'}}>
                  <AlertTriangle size={10} style={{color:'#f87171',flexShrink:0,marginTop:1}}/>
                  <span className="text-[9px] text-rose-400">Perlu validasi SK mutasi</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── INTEL CABOR (tabs) ── */}
        <div {...ani(120)} className="rounded-2xl overflow-hidden"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)'}}>

          <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.07)'}}>
            <div className="flex gap-1">
              {[
                {k:'ranking',   l:'🏆 Ranking'},
                {k:'heatmap',   l:'🗂 Heatmap'},
                {k:'conversion',l:'🔥 Conversion'},
                {k:'gender',    l:'👥 Gender'},
              ].map(tab=>(
                <button key={tab.k} onClick={()=>setActiveTab(tab.k as any)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: activeTab===tab.k?`${ACCENT}18`:'transparent',
                    color:      activeTab===tab.k?ACCENT:'rgba(255,255,255,0.3)',
                    border:     activeTab===tab.k?`1px solid ${ACCENT}30`:'1px solid transparent',
                  }}>
                  {tab.l}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Cari cabor..."
                className="bg-transparent border rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 outline-none w-44"
                style={{borderColor:'rgba(255,255,255,0.1)'}}
                onFocus={e=>e.target.style.borderColor=ACCENT}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>
          </div>

          {/* Ranking tab */}
          {activeTab==='ranking' && (
            <div className="max-h-[480px] overflow-y-auto" style={{scrollbarWidth:'thin',scrollbarColor:`${ACCENT}25 transparent`}}>
              {displayed.map((c,i)=>{
                const isSelected = selCabor?.nama===c.nama
                const convColor  = c.conversion>=30?'#4ade80':c.conversion>=15?'#fbbf24':'rgba(255,255,255,0.2)'
                return (
                  <div key={c.nama}
                    onClick={()=>setSelCabor(p=>p?.nama===c.nama?null:c)}
                    className="flex items-center gap-4 px-5 py-3.5 border-b cursor-pointer transition-all"
                    style={{borderColor:'rgba(255,255,255,0.04)',background:isSelected?`${ACCENT}06`:'transparent',borderLeft:`3px solid ${isSelected?ACCENT:'transparent'}`}}
                    onMouseEnter={e=>{if(!isSelected)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}}
                    onMouseLeave={e=>{if(!isSelected)(e.currentTarget as HTMLElement).style.background='transparent'}}>
                    <span className="w-5 text-[10px] font-mono text-zinc-600 flex-shrink-0">{i+1}</span>
                    <div className="w-36 flex-shrink-0">
                      <div className="text-sm font-bold text-zinc-200 truncate">{c.nama}</div>
                      <div className="text-[9px] text-zinc-600">{c.kategori}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-zinc-500">Atlet</span>
                        <span className="text-white font-bold">{c.total}</span>
                      </div>
                      <Bar value={c.total} max={maxAtlet} color={ACCENT}/>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span style={{color:ACCENT}} className="font-mono">{c.putra}L</span>
                        <span className="text-pink-400 font-mono">{c.putri}P</span>
                      </div>
                      <div className="h-1.5 rounded-full flex overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                        <div style={{width:`${c.total>0?c.putra/c.total*100:50}%`,background:ACCENT}}/>
                        <div style={{flex:1,background:'#f472b6'}}/>
                      </div>
                    </div>
                    <div className="w-16 text-center flex-shrink-0">
                      <div className="text-sm font-bold text-green-400">{c.verified}</div>
                      <div className="text-[9px] text-zinc-600">verified</div>
                    </div>
                    <div className="w-24 flex-shrink-0 text-right">
                      <div className="text-xs font-bold">
                        <span className="text-yellow-400">🥇{c.emas}</span>{' '}
                        <span className="text-zinc-400">🥈{c.perak}</span>{' '}
                        <span style={{color:'#cd7f32'}}>🥉{c.perunggu}</span>
                      </div>
                      <div className="text-[9px] font-bold" style={{color:convColor}}>{c.conversion}% conv.</div>
                    </div>
                    <div className="w-28 flex-shrink-0 flex justify-end">
                      <span className="text-[9px] font-bold px-2 py-1 rounded-lg"
                        style={c.emas>0?{background:`${ACCENT}12`,color:ACCENT,border:`1px solid ${ACCENT}25`}
                          :c.conversion>15?{background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.2)'}
                          :{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.07)'}}>
                        {c.emas>0?'✅ Medali':c.conversion>15?'🔥 Efisien':'📋 Monitor'}
                      </span>
                    </div>
                  </div>
                )
              })}
              {!showAll && filtered.length>12 && (
                <div className="p-4 flex justify-center border-t" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                  <button onClick={()=>setShowAll(true)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold"
                    style={{background:`${ACCENT}10`,color:ACCENT,border:`1px solid ${ACCENT}20`}}>
                    Lihat {filtered.length-12} lainnya <ChevronRight size={13}/>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Heatmap tab */}
          {activeTab==='heatmap' && (
            <div className="p-5 grid grid-cols-4 gap-3">
              {byKategori.map(([kat,d])=>{
                const pct = d.total>0?Math.round(d.medali/d.total*100):0
                const col = d.total>150?ACCENT:d.total>80?'#ffd700':d.total>30?'#f59e0b':'#6b7280'
                return (
                  <div key={kat} className="rounded-xl p-4"
                    style={{background:`${col}08`,border:`1px solid ${col}20`}}>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-bold" style={{color:col}}>{kat}</span>
                      <span className="text-[9px] text-zinc-600">{d.list.length} cabor</span>
                    </div>
                    <div className="text-3xl font-light text-white mb-1">{d.total}</div>
                    <div className="text-[10px] text-zinc-500 mb-2">atlet</div>
                    <Bar value={d.total} max={400} color={col}/>
                    <div className="text-[9px] mt-2" style={{color:col}}>{d.medali} medali · {pct}% conv.</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.list.slice(0,3).map(c=>(
                        <span key={c} className="text-[8px] px-1.5 py-0.5 rounded"
                          style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.3)'}}>{c}</span>
                      ))}
                      {d.list.length>3 && <span className="text-[8px] text-zinc-600">+{d.list.length-3}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Conversion tab */}
          {activeTab==='conversion' && (
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-5 p-3 rounded-xl"
                style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <Info size={12}/>
                <span><strong style={{color:ACCENT}}>Medal Conversion Rate</strong> = Total Medali ÷ Total Atlet × 100. KPI efisiensi pembinaan favorit KONI.</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {topConv.map((c)=>{
                  const tm = c.emas+c.perak+c.perunggu
                  const g  = c.conversion>=50?{l:'S',c:'#4ade80'}:c.conversion>=25?{l:'A',c:'#fbbf24'}:c.conversion>=10?{l:'B',c:'#f87171'}:{l:'C',c:'#6b7280'}
                  return (
                    <div key={c.nama} className="flex items-center gap-3 p-4 rounded-xl"
                      style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                        style={{background:`${g.c}20`,color:g.c}}>{g.l}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-zinc-200 mb-0.5">{c.nama}</div>
                        <div className="text-[10px] text-zinc-500">{c.total} atlet · 🥇{c.emas} 🥈{c.perak} 🥉{c.perunggu}</div>
                        <Bar value={c.conversion} max={100} color={g.c} h={4}/>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black" style={{color:g.c}}>{c.conversion}%</div>
                        <div className="text-[9px] text-zinc-600">{tm} medali</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Gender tab */}
          {activeTab==='gender' && (
            <div className="p-5 grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full" style={{background:ACCENT}}/>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Dominan Putra (80%+)</span>
                </div>
                <div className="space-y-2.5">
                  {domPutra.map(c=>(
                    <div key={c.nama} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${ACCENT}12`}}>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-zinc-200">{c.nama}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{c.putra}L / {c.putri}P</div>
                        <div className="h-1.5 rounded-full flex overflow-hidden mt-1.5" style={{background:'rgba(255,255,255,0.06)'}}>
                          <div style={{width:`${c.putra/c.total*100}%`,background:ACCENT}}/>
                          <div style={{flex:1,background:'#f472b6'}}/>
                        </div>
                      </div>
                      <div className="text-lg font-black flex-shrink-0" style={{color:ACCENT}}>{Math.round(c.putra/c.total*100)}%</div>
                    </div>
                  ))}
                  {domPutra.length===0 && <div className="text-xs text-zinc-600 text-center py-4">Data belum cukup</div>}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-pink-400"/>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Dominan Putri (60%+)</span>
                </div>
                <div className="space-y-2.5">
                  {domPutri.map(c=>(
                    <div key={c.nama} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(244,114,182,0.12)'}}>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-zinc-200">{c.nama}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{c.putra}L / {c.putri}P</div>
                        <div className="h-1.5 rounded-full flex overflow-hidden mt-1.5" style={{background:'rgba(255,255,255,0.06)'}}>
                          <div style={{width:`${c.putra/c.total*100}%`,background:ACCENT}}/>
                          <div style={{flex:1,background:'#f472b6'}}/>
                        </div>
                      </div>
                      <div className="text-lg font-black text-pink-400 flex-shrink-0">{Math.round(c.putri/c.total*100)}%</div>
                    </div>
                  ))}
                  {domPutri.length===0 && <div className="text-xs text-zinc-600 text-center py-4">Data belum cukup</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div {...ani(160)} className="grid grid-cols-3 gap-4">
          {[
            {l:'War Room',       d:'Pemantauan laga & prediksi medali live', icon:Monitor,  c:ACCENT,    href:'/konida/warroom/kabbogor'},
            {l:'Lap. Harian',    d:'Jurnal hasil pertandingan per hari',     icon:FileText, c:'#60a5fa', href:'/konida/lappertandingan/kabbogor'},
            {l:'Premium Report', d:'SPJ bonus, buku hasil, piagam juara',   icon:Download, c:'#f59e0b', href:'/konida/Premiumreport/kabbogor'},
          ].map(a=>(
            <a key={a.l} href={a.href}
              className="flex items-center justify-between p-5 rounded-2xl transition-all group"
              style={{background:'rgba(255,255,255,0.025)',border:`1px solid ${a.c}18`}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor=`${a.c}40`}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor=`${a.c}18`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{background:`${a.c}12`,border:`1px solid ${a.c}20`}}>
                  <a.icon size={20} style={{color:a.c}}/>
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{a.l}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{a.d}</div>
                </div>
              </div>
              <ChevronRight size={16} style={{color:a.c}} className="group-hover:translate-x-1 transition-transform"/>
            </a>
          ))}
        </div>
      </main>

      {/* ── SLIDE-OUT DETAIL CABOR ── */}
      {selCabor && (
        <div className="fixed inset-0 z-50" onClick={()=>setSelCabor(null)}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}/>
          <div className="absolute right-0 top-0 h-full w-96 overflow-y-auto"
            style={{background:'#040f08',borderLeft:`1px solid ${ACCENT}20`}}
            onClick={e=>e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{color:ACCENT}}>Detail Cabor</div>
                  <h2 className="text-2xl font-black text-white">{selCabor.nama}</h2>
                  <div className="text-xs text-zinc-500 mt-0.5">{selCabor.kategori}</div>
                </div>
                <button onClick={()=>setSelCabor(null)} style={{color:'rgba(255,255,255,0.3)'}}>
                  <X size={18}/>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[{l:'Total Atlet',v:selCabor.total,c:ACCENT},{l:'Verified',v:selCabor.verified,c:'#4ade80'},{l:'Putra',v:selCabor.putra,c:ACCENT},{l:'Putri',v:selCabor.putri,c:'#f472b6'}].map(s=>(
                  <div key={s.l} className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                    <div className="text-[10px] text-zinc-500 mb-1">{s.l}</div>
                    <div className="text-2xl font-light" style={{color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4 mb-3" style={{background:'rgba(255,215,0,0.06)',border:'1px solid rgba(255,215,0,0.15)'}}>
                <div className="text-[10px] text-zinc-500 mb-3">Perolehan Medali</div>
                <div className="flex gap-3">
                  {[{l:'Emas',v:selCabor.emas,c:'#ffd700'},{l:'Perak',v:selCabor.perak,c:'#c0c0c0'},{l:'Perunggu',v:selCabor.perunggu,c:'#cd7f32'}].map(m=>(
                    <div key={m.l} className="flex-1 text-center">
                      <div className="text-2xl font-black" style={{color:m.c}}>{m.v}</div>
                      <div className="text-[10px] text-zinc-500">{m.l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-xs" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                  <span className="text-zinc-500">Conversion Rate</span>
                  <span className="font-bold" style={{color:selCabor.conversion>=25?'#4ade80':'#f87171'}}>{selCabor.conversion}%</span>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="text-[10px] text-zinc-500 mb-2">Analisis</div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selCabor.conversion>=50?'✅ Efisiensi sangat baik — cabor unggulan medali.'
                  :selCabor.conversion>=25?'🔥 Efisiensi baik, ada peluang meningkat.'
                  :selCabor.total>30?'⚠️ Banyak atlet tapi konversi rendah — evaluasi pembinaan.'
                  :'📋 Data terbatas, perlu monitoring.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${ACCENT}30;border-radius:4px}
      `}</style>
    </div>
  )
}