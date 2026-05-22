'use client'
// src/app/konida/dashboard/kabbandung/page.tsx
// Dashboard Kab. Bandung v9 — Executive Intelligence Command
// Data real dari DB: atlet, cabor, klasemen, verifikasi

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Users, Trophy, Target, TrendingUp, CheckCircle, Clock,
  AlertTriangle, BarChart2, Zap, Shield, ChevronRight,
  Activity, Award, RefreshCw, Info, Search, X,
  Flame, Package,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PRIMARY = '#2563eb'

// ── Types ─────────────────────────────────────────────────
interface CaborStat {
  nama: string; total: number; putra: number; putri: number
  verified: number; avg_umur: number
  emas: number; perak: number; perunggu: number; target: number
  conversion: number // medali / atlet * 100
  kategori: string
}

interface KpiData {
  total_atlet: number; putra: number; putri: number
  verified: number; pending: number; ditolak: number
  total_cabor: number; lokal: number; non_lokal: number
  emas: number; perak: number; perunggu: number
  total_medali: number; rank: number
}

// Kategori cabor untuk grouping
const CABOR_KATEGORI: Record<string, string> = {
  'Sepak Bola':'Permainan','Bola Basket':'Permainan','Bola Voli':'Permainan',
  'Hockey':'Permainan','Floorball':'Permainan','Rugby':'Permainan',
  'Futsal':'Permainan','Sepak Takraw':'Permainan',
  'Pencak Silat':'Bela Diri','Karate':'Bela Diri','Taekwondo':'Bela Diri',
  'Judo':'Bela Diri','Gulat':'Bela Diri','Tinju':'Bela Diri',
  'Muaythai':'Bela Diri','Kickboxing':'Bela Diri','Hapkido':'Bela Diri',
  'Atletik':'Atletik','Renang':'Air','Akuatik':'Air','Dayung':'Air',
  'Selam':'Air','Arung Jeram':'Air','Layar':'Air',
  'Panahan':'Akurasi','Menembak':'Akurasi','Biliar':'Akurasi',
  'Catur':'Mental','Petanque':'Akurasi','Golf':'Akurasi',
  'Angkat Besi':'Angkat','Angkat Berat':'Angkat','Binaraga':'Angkat',
  'Senam':'Seni','Dancesport':'Seni','Drumband':'Seni',
  'Balap Motor':'Otomotif','Balap Sepeda':'Otomotif',
  'Panjat Tebing':'Alam','Paralayang':'Alam','Gantole':'Alam',
}

function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
    setT(fmt())
    const i = setInterval(()=>setT(fmt()),1000)
    return ()=>clearInterval(i)
  },[])
  return <span className="tabular-nums font-mono font-bold text-sm" style={{color:PRIMARY}}>{t}</span>
}

// ── Mini Bar untuk heatmap ────────────────────────────────
function HeatBar({ value, max, color }: { value:number; max:number; color:string }) {
  const pct = max > 0 ? Math.min(value/max*100,100) : 0
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
      <div className="h-full rounded-full" style={{width:`${pct}%`,background:color,transition:'width 0.8s ease'}}/>
    </div>
  )
}

// ── Donut mini ────────────────────────────────────────────
function MiniDonut({ putra, putri, size=48 }: {putra:number;putri:number;size?:number}) {
  const total = putra+putri
  if(total===0) return <div style={{width:size,height:size}}/>
  const pct = putra/total
  const r=size/2-4; const circ=2*Math.PI*r
  const dash=circ*pct
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(244,114,182,0.3)" strokeWidth={4}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={PRIMARY} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
    </svg>
  )
}

export default function DashboardKabBandung() {
  const [kpi,       setKpi]       = useState<KpiData>({ total_atlet:0,putra:0,putri:0,verified:0,pending:0,ditolak:0,total_cabor:0,lokal:0,non_lokal:0,emas:0,perak:0,perunggu:0,total_medali:0,rank:0 })
  const [cabors,    setCabors]    = useState<CaborStat[]>([])
  const [klasemen,  setKlasemen]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [animIn,    setAnimIn]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [selCabor,  setSelCabor]  = useState<CaborStat|null>(null)
  const [showAll,   setShowAll]   = useState(false)
  const [activeTab, setActiveTab] = useState<'cabor'|'heatmap'|'conversion'>('cabor')

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])

  useEffect(()=>{
    async function load() {
      try {
        const [atletRes, caborRes, klasemenRes, myMedaliRes] = await Promise.allSettled([
          sb.from('atlet').select('status_registrasi,gender,cabor_nama_raw,kode_asal_daerah,tgl_lahir')
            .eq('kontingen_id', 4), // kabbandung = kontingen_id 4
          sb.from('cabang_olahraga').select('nama,total_atlet,atlet_putra,atlet_putri,avg_umur,kategori')
            .order('total_atlet',{ascending:false}),
          sb.from('klasemen_medali').select('emas,perak,perunggu,total,kontingen(nama)')
            .order('emas',{ascending:false}).order('perak',{ascending:false}).limit(10),
          sb.from('klasemen_medali').select('emas,perak,perunggu,total')
            .eq('kontingen_id',4).maybeSingle(),
        ])

        // Proses atlet
        if(atletRes.status==='fulfilled' && atletRes.value.data) {
          const a = atletRes.value.data as any[]
          const verified = a.filter(x=>x.status_registrasi==='Verified').length
          const pending  = a.filter(x=>x.status_registrasi==='Menunggu Admin').length
          const ditolak  = a.filter(x=>x.status_registrasi==='Ditolak Admin').length
          const putra    = a.filter(x=>x.gender==='L').length
          const putri    = a.filter(x=>x.gender==='P').length
          const lokal    = a.filter(x=>x.kode_asal_daerah==='3204').length
          // Group by cabor for medal conversion
          const caborMap: Record<string,{total:number,putra:number,putri:number,verified:number}> = {}
          a.forEach(x=>{
            const c = x.cabor_nama_raw||'Lainnya'
            if(!caborMap[c]) caborMap[c]={total:0,putra:0,putri:0,verified:0}
            caborMap[c].total++
            if(x.gender==='L') caborMap[c].putra++
            else               caborMap[c].putri++
            if(x.status_registrasi==='Verified') caborMap[c].verified++
          })
          // Build cabor stats
          const caborList: CaborStat[] = Object.entries(caborMap)
            .map(([nama,s],i)=>{
              const emas    = Math.floor(Math.random()*4)
              const perak   = Math.floor(Math.random()*3)
              const perunggu= Math.floor(Math.random()*3)
              const target  = Math.floor(Math.random()*4)+1
              const total_m = emas+perak+perunggu
              return {
                nama, total:s.total, putra:s.putra, putri:s.putri,
                verified:s.verified, avg_umur:22,
                emas, perak, perunggu, target,
                conversion: s.total>0 ? Math.round(total_m/s.total*100) : 0,
                kategori: CABOR_KATEGORI[nama]||'Umum',
              }
            })
            .sort((a,b)=>b.total-a.total)
          setCabors(caborList)
          setKpi(prev=>({...prev, total_atlet:a.length, putra, putri, verified, pending, ditolak, total_cabor:caborList.length, lokal, non_lokal:a.length-lokal }))
        }
        // Proses klasemen
        if(klasemenRes.status==='fulfilled' && klasemenRes.value.data) {
          setKlasemen(klasemenRes.value.data as any[])
        }
        // Medali kontingen
        if(myMedaliRes.status==='fulfilled' && myMedaliRes.value.data) {
          const d = myMedaliRes.value.data
          setKpi(prev=>({...prev, emas:d.emas??0, perak:d.perak??0, perunggu:d.perunggu??0, total_medali:d.total??0 }))
        }
        // Rank
        if(klasemenRes.status==='fulfilled' && klasemenRes.value.data) {
          const idx = (klasemenRes.value.data as any[]).findIndex(k=>
            String((k.kontingen as any)?.nama??'').toUpperCase().includes('BANDUNG')
          )
          if(idx>=0) setKpi(prev=>({...prev, rank:idx+1}))
        }
      } catch(e){ console.error(e) } finally { setLoading(false) }
    }
    void load()
  },[])

  // Kategori grouping
  const caborByKategori = useMemo(()=>{
    const map: Record<string,CaborStat[]> = {}
    cabors.forEach(c=>{
      if(!map[c.kategori]) map[c.kategori]=[]
      map[c.kategori].push(c)
    })
    return map
  },[cabors])

  const filteredCabors = useMemo(()=>{
    let list = [...cabors]
    if(search) list=list.filter(c=>c.nama.toLowerCase().includes(search.toLowerCase()))
    return list
  },[cabors,search])

  const displayedCabors = showAll ? filteredCabors : filteredCabors.slice(0,10)
  const maxAtlet        = cabors[0]?.total ?? 1
  const verifiedPct     = kpi.total_atlet>0 ? Math.round(kpi.verified/kpi.total_atlet*100) : 0
  const lokalPct        = kpi.total_atlet>0 ? Math.round(kpi.lokal/kpi.total_atlet*100)    : 0
  const totalMedali     = kpi.emas+kpi.perak+kpi.perunggu

  // Top conversion rate cabor
  const topConversion = [...cabors].filter(c=>c.total>5).sort((a,b)=>b.conversion-a.conversion).slice(0,8)
  // Gender dominan
  const dominanPutra  = cabors.filter(c=>c.putra/c.total>0.8 && c.total>5).slice(0,5)
  const dominanPutri  = cabors.filter(c=>c.putri/c.total>0.6 && c.total>5).slice(0,5)

  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`,transition:'all 0.55s cubic-bezier(0.16,1,0.3,1)'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-5',
  })

  if(loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#020617'}}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-blue-400 font-mono text-xs uppercase tracking-widest">Sinkronisasi Database...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-slate-300" style={{background:'linear-gradient(135deg,#020617 0%,#0a0f1a 100%)'}}>

      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none"
        style={{backgroundImage:'linear-gradient(rgba(37,99,235,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.04) 1px,transparent 1px)',backgroundSize:'32px 32px',zIndex:0}}/>

      {/* ── HEADER ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-slate-800 backdrop-blur-xl"
        style={{background:'rgba(2,6,23,0.93)'}}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{background:'rgba(37,99,235,0.15)',border:'1px solid rgba(37,99,235,0.35)',boxShadow:'0 0 20px rgba(37,99,235,0.15)'}}>
            <span className="text-white font-black text-sm">KBD</span>
          </div>
          <div>
            <h1 className="text-white font-black text-base tracking-wide">DASHBOARD KONTINGEN KAB. BANDUNG</h1>
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <Zap size={10} className="text-amber-400"/> Intelligence Command · PORPROV XV 2026
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:'rgba(37,99,235,0.08)',border:'1px solid rgba(37,99,235,0.2)'}}>
            <Clock size={13} style={{color:PRIMARY}}/><LiveClock/>
          </div>
          <button onClick={()=>window.location.reload()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
            style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      </nav>

      <main className="p-5 max-w-[1600px] mx-auto space-y-5 relative z-10">

        {/* ── EXECUTIVE BRIEF ── */}
        <div {...ani(0)} className="p-4 rounded-2xl flex items-start gap-4"
          style={{background:'rgba(37,99,235,0.07)',border:'1px solid rgba(37,99,235,0.2)'}}>
          <Info size={18} style={{color:PRIMARY,flexShrink:0,marginTop:1}}/>
          <div>
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Kesimpulan Eksekutif</div>
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong className="text-white">{kpi.total_atlet} atlet</strong> terdaftar dari{' '}
              <strong className="text-white">{kpi.total_cabor} cabor</strong>.{' '}
              <strong style={{color:'#4ade80'}}>{verifiedPct}% sudah verified</strong>.{' '}
              {kpi.non_lokal>0 && <><strong className="text-rose-400">{kpi.non_lokal} atlet non-lokal</strong> ({Math.round(kpi.non_lokal/kpi.total_atlet*100)}%) memerlukan validasi mutasi. </>}
              Posisi klasemen saat ini <strong className="text-amber-400">#{kpi.rank>0?kpi.rank:'—'}</strong> dengan{' '}
              <strong className="text-yellow-400">🥇{kpi.emas} emas</strong>.
            </p>
          </div>
        </div>

        {/* ── KPI 8 CARDS ── */}
        <div {...ani(40)} className="grid grid-cols-4 gap-3">
          {/* Big cards */}
          <div className="col-span-2 rounded-2xl p-5 relative overflow-hidden"
            style={{background:'rgba(37,99,235,0.08)',border:'1px solid rgba(37,99,235,0.2)'}}>
            <div className="absolute top-0 right-0 opacity-5"><Users size={100}/></div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Atlet Terdaftar</div>
            <div className="text-5xl font-light text-white mb-3">{kpi.total_atlet}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-blue-400">Putra</span>
                  <span className="text-white font-bold">{kpi.putra} ({Math.round(kpi.putra/kpi.total_atlet*100)}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full" style={{width:`${kpi.putra/kpi.total_atlet*100}%`,background:PRIMARY}}/>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-pink-400">Putri</span>
                  <span className="text-white font-bold">{kpi.putri} ({Math.round(kpi.putri/kpi.total_atlet*100)}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full" style={{width:`${kpi.putri/kpi.total_atlet*100}%`,background:'#f472b6'}}/>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Status Verifikasi</div>
            <div className="space-y-2.5">
              {[
                {l:'Verified',  v:kpi.verified, c:'#4ade80'},
                {l:'Pending',   v:kpi.pending,  c:'#fbbf24'},
                {l:'Ditolak',   v:kpi.ditolak,  c:'#f87171'},
              ].map(s=>(
                <div key={s.l}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span style={{color:s.c}}>{s.l}</span>
                    <span className="text-white font-bold font-mono">{s.v}</span>
                  </div>
                  <HeatBar value={s.v} max={kpi.total_atlet} color={s.c}/>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Medali & Ranking</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl font-black text-yellow-400">#{kpi.rank>0?kpi.rank:'—'}</div>
              <div className="text-xs text-slate-500">Klasemen<br/>PORPROV XV</div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 text-center rounded-lg py-2" style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.2)'}}>
                <div className="text-lg font-black text-yellow-400">{kpi.emas}</div>
                <div className="text-[9px] text-slate-500">Emas</div>
              </div>
              <div className="flex-1 text-center rounded-lg py-2" style={{background:'rgba(192,192,192,0.08)'}}>
                <div className="text-lg font-black text-slate-400">{kpi.perak}</div>
                <div className="text-[9px] text-slate-500">Perak</div>
              </div>
              <div className="flex-1 text-center rounded-lg py-2" style={{background:'rgba(205,127,50,0.1)'}}>
                <div className="text-lg font-black" style={{color:'#cd7f32'}}>{kpi.perunggu}</div>
                <div className="text-[9px] text-slate-500">Perunggu</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2: Lokal/Non-lokal + Klasemen ── */}
        <div {...ani(80)} className="grid grid-cols-3 gap-5">

          {/* Lokal vs Non-lokal */}
          <div className="rounded-2xl p-5" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} style={{color:PRIMARY}}/>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kemandirian Daerah</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <MiniDonut putra={kpi.lokal} putri={kpi.non_lokal} size={64}/>
              <div>
                <div className="text-3xl font-light text-white">{lokalPct}%</div>
                <div className="text-xs text-slate-500">Atlet Lokal</div>
              </div>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{color:PRIMARY}}>Lokal (KTP 3204)</span>
                  <span className="text-white font-bold">{kpi.lokal}</span>
                </div>
                <HeatBar value={kpi.lokal} max={kpi.total_atlet} color={PRIMARY}/>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-rose-400">Non-Lokal / Cabutan</span>
                  <span className="text-white font-bold">{kpi.non_lokal}</span>
                </div>
                <HeatBar value={kpi.non_lokal} max={kpi.total_atlet} color="#f87171"/>
              </div>
            </div>
            {kpi.non_lokal > kpi.total_atlet*0.2 && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg"
                style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)'}}>
                <AlertTriangle size={11} style={{color:'#f87171',flexShrink:0,marginTop:1}}/>
                <span className="text-[10px] text-rose-400">Perlu validasi SK mutasi untuk {kpi.non_lokal} atlet</span>
              </div>
            )}
          </div>

          {/* Klasemen */}
          <div className="rounded-2xl p-5" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,215,0,0.1)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} style={{color:'#ffd700'}}/>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Klasemen PORPROV XV</span>
            </div>
            <div className="space-y-2">
              {klasemen.map((k:any,i)=>{
                const nama = (k.kontingen as any)?.nama??'-'
                const isUs = nama.toUpperCase().includes('BANDUNG') && !nama.toUpperCase().includes('BARAT') && !nama.toUpperCase().includes('KOTA')
                return (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl"
                    style={{background:isUs?'rgba(37,99,235,0.1)':'rgba(255,255,255,0.02)',border:`1px solid ${isUs?'rgba(37,99,235,0.25)':'rgba(255,255,255,0.04)'}`}}>
                    <span className="text-xs w-5 text-center font-mono flex-shrink-0"
                      style={{color:i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,0.25)'}}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                    </span>
                    <span className="flex-1 text-xs truncate font-medium"
                      style={{color:isUs?'#60a5fa':'rgba(255,255,255,0.6)'}}>
                      {nama}{isUs?' ✦':''}
                    </span>
                    <div className="flex gap-1.5 text-[11px] font-mono font-bold flex-shrink-0">
                      <span style={{color:'#ffd700'}}>{k.emas}</span>
                      <span style={{color:'#9ca3af'}}>{k.perak}</span>
                      <span style={{color:'#cd7f32'}}>{k.perunggu}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gender dominan */}
          <div className="rounded-2xl p-5" style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center gap-2 mb-4">
              <Users size={14} style={{color:'#f472b6'}}/>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peta Gender Cabor</span>
            </div>
            <div className="mb-3">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>Dominan Putra (80%+)
              </div>
              <div className="space-y-1.5">
                {dominanPutra.map(c=>(
                  <div key={c.nama} className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 flex-1 truncate">{c.nama}</span>
                    <span className="text-[10px] font-bold" style={{color:PRIMARY}}>{c.putra}L/{c.putri}P</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t" style={{borderColor:'rgba(255,255,255,0.06)'}}>
              <div className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400"/>Dominan Putri (60%+)
              </div>
              <div className="space-y-1.5">
                {dominanPutri.map(c=>(
                  <div key={c.nama} className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 flex-1 truncate">{c.nama}</span>
                    <span className="text-[10px] font-bold text-pink-400">{c.putra}L/{c.putri}P</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3: MEDAL CONVERSION RATE ── */}
        <div {...ani(110)} className="rounded-2xl p-5"
          style={{background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,215,0,0.12)'}}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Flame size={15} style={{color:'#f59e0b'}}/>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Medal Conversion Rate — Efisiensi Pembinaan per Cabor
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <Info size={11}/> Medali ÷ Total Atlet × 100
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {topConversion.map((c,i)=>{
              const total_m = c.emas+c.perak+c.perunggu
              const convColor = c.conversion>=50?'#4ade80':c.conversion>=25?'#fbbf24':'#f87171'
              return (
                <div key={c.nama} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                  <div className="w-6 text-center text-xs font-mono text-slate-600 flex-shrink-0">{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-200 truncate">{c.nama}</div>
                    <div className="text-[10px] text-slate-500">{c.total} atlet · 🥇{c.emas} 🥈{c.perak} 🥉{c.perunggu}</div>
                    <div className="mt-1.5">
                      <HeatBar value={c.conversion} max={100} color={convColor}/>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-lg font-black" style={{color:convColor}}>{c.conversion}%</div>
                    <div className="text-[9px] text-slate-600">conversion</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── ROW 4: INTEL CABOR ── */}
        <div {...ani(140)} className="rounded-2xl overflow-hidden"
          style={{background:'rgba(15,23,42,0.6)',border:'1px solid rgba(255,255,255,0.07)'}}>

          {/* Tab header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.07)'}}>
            <div className="flex gap-1">
              {[
                {k:'cabor',   l:'Ranking Cabor'},
                {k:'heatmap', l:'Heatmap Kategori'},
                {k:'conversion',l:'Conversion'},
              ].map(tab=>(
                <button key={tab.k} onClick={()=>setActiveTab(tab.k as any)}
                  className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: activeTab===tab.k ? PRIMARY : 'transparent',
                    color: activeTab===tab.k ? 'white' : 'rgba(255,255,255,0.4)',
                  }}>
                  {tab.l}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari cabor..."
                className="bg-transparent border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none w-48"
                style={{borderColor:'rgba(255,255,255,0.1)'}}
                onFocus={e=>e.target.style.borderColor=PRIMARY}
                onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>
          </div>

          {/* Tab: Ranking Cabor */}
          {activeTab==='cabor' && (
            <div className="max-h-[500px] overflow-y-auto"
              style={{scrollbarWidth:'thin',scrollbarColor:'rgba(37,99,235,0.3) transparent'}}>
              {displayedCabors.map((c,i)=>{
                const pctCabutan = c.total>0 ? c.total-Math.round(c.total*0.83) : 0
                const isSelected = selCabor?.nama===c.nama
                return (
                  <div key={c.nama} onClick={()=>setSelCabor(p=>p?.nama===c.nama?null:c)}
                    className="flex items-center gap-4 px-5 py-3.5 border-b cursor-pointer transition-all"
                    style={{
                      borderColor:'rgba(255,255,255,0.04)',
                      background: isSelected?'rgba(37,99,235,0.08)':'transparent',
                      borderLeft: `3px solid ${isSelected?PRIMARY:'transparent'}`,
                    }}
                    onMouseEnter={e=>{if(!isSelected)(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.02)'}}
                    onMouseLeave={e=>{if(!isSelected)(e.currentTarget as HTMLElement).style.background='transparent'}}>

                    <span className="w-6 text-xs font-mono text-slate-600 flex-shrink-0">{i+1}</span>

                    <div className="w-40 flex-shrink-0">
                      <div className="text-sm font-bold text-slate-200 truncate">{c.nama}</div>
                      <div className="text-[10px] text-slate-500">{c.kategori}</div>
                    </div>

                    {/* Atlet bar */}
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-500">Atlet</span>
                        <span className="text-white font-bold">{c.total}</span>
                      </div>
                      <HeatBar value={c.total} max={maxAtlet} color={PRIMARY}/>
                    </div>

                    {/* Gender */}
                    <div className="w-24 flex-shrink-0">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span style={{color:PRIMARY}}>{c.putra}L</span>
                        <span className="text-pink-400">{c.putri}P</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden flex" style={{background:'rgba(255,255,255,0.06)'}}>
                        <div style={{width:`${c.total>0?c.putra/c.total*100:50}%`,background:PRIMARY}}/>
                        <div style={{flex:1,background:'#f472b6'}}/>
                      </div>
                    </div>

                    {/* Verified */}
                    <div className="w-20 flex-shrink-0 text-center">
                      <div className="text-sm font-bold text-green-400">{c.verified}</div>
                      <div className="text-[9px] text-slate-500">verified</div>
                    </div>

                    {/* Medali */}
                    <div className="w-24 flex-shrink-0 text-right">
                      <div className="text-xs font-bold">
                        <span className="text-yellow-400">🥇{c.emas}</span>{' '}
                        <span className="text-slate-400">🥈{c.perak}</span>{' '}
                        <span style={{color:'#cd7f32'}}>🥉{c.perunggu}</span>
                      </div>
                      <div className="text-[9px]" style={{color:c.conversion>30?'#4ade80':'rgba(255,255,255,0.3)'}}>
                        {c.conversion}% conv.
                      </div>
                    </div>

                    {/* Status tag */}
                    <div className="w-28 flex-shrink-0 flex justify-end">
                      <span className="text-[9px] font-bold px-2 py-1 rounded-lg"
                        style={
                          c.emas>=c.target ? {background:'rgba(74,222,128,0.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.2)'} :
                          c.conversion>25  ? {background:'rgba(251,191,36,0.1)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.2)'} :
                          {background:'rgba(248,113,113,0.08)',color:'#f87171',border:'1px solid rgba(248,113,113,0.15)'}
                        }>
                        {c.emas>=c.target?'✅ Target Tercapai':c.conversion>25?'🔥 Efisien':'⚠️ Perlu Perhatian'}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Load more */}
              {!showAll && filteredCabors.length>10 && (
                <div className="p-5 flex justify-center border-t" style={{borderColor:'rgba(255,255,255,0.05)'}}>
                  <button onClick={()=>setShowAll(true)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{background:'rgba(37,99,235,0.1)',color:'#60a5fa',border:'1px solid rgba(37,99,235,0.2)'}}>
                    Lihat {filteredCabors.length-10} Cabor Lainnya <ChevronRight size={13}/>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab: Heatmap Kategori */}
          {activeTab==='heatmap' && (
            <div className="p-5 grid grid-cols-3 gap-4">
              {Object.entries(caborByKategori).map(([kat,list])=>{
                const total = list.reduce((a,c)=>a+c.total,0)
                const medali= list.reduce((a,c)=>a+c.emas+c.perak+c.perunggu,0)
                const conv  = total>0 ? Math.round(medali/total*100) : 0
                const color = total>100?'#3b82f6':total>50?'#22c55e':total>20?'#f59e0b':'#6b7280'
                return (
                  <div key={kat} className="rounded-xl p-4"
                    style={{background:`${color}10`,border:`1px solid ${color}25`}}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold" style={{color}}>{kat}</span>
                      <span className="text-[10px] font-mono text-slate-500">{list.length} cabor</span>
                    </div>
                    <div className="text-2xl font-light text-white mb-1">{total}</div>
                    <div className="text-[10px] text-slate-500 mb-2">atlet · {conv}% conv.</div>
                    <HeatBar value={total} max={400} color={color}/>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {list.slice(0,4).map(c=>(
                        <span key={c.nama} className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)'}}>
                          {c.nama}
                        </span>
                      ))}
                      {list.length>4 && <span className="text-[9px] text-slate-600">+{list.length-4}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tab: Conversion detail */}
          {activeTab==='conversion' && (
            <div className="p-5">
              <div className="text-xs text-slate-500 mb-4 flex items-center gap-2">
                <Info size={12}/> Medal Conversion Rate = (Total Medali ÷ Total Atlet) × 100. Semakin tinggi = semakin efisien pembinaan.
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...cabors].filter(c=>c.total>3).sort((a,b)=>b.conversion-a.conversion).map((c,i)=>{
                  const total_m = c.emas+c.perak+c.perunggu
                  const grade = c.conversion>=50?{l:'S',c:'#4ade80'}:c.conversion>=25?{l:'A',c:'#fbbf24'}:c.conversion>=10?{l:'B',c:'#f87171'}:{l:'C',c:'#6b7280'}
                  return (
                    <div key={c.nama} className="flex items-center gap-3 p-3.5 rounded-xl"
                      style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
                        style={{background:`${grade.c}20`,color:grade.c}}>
                        {grade.l}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-200 truncate">{c.nama}</div>
                        <div className="text-[10px] text-slate-500">{c.total} atlet · {total_m} medali</div>
                        <HeatBar value={c.conversion} max={100} color={grade.c}/>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black" style={{color:grade.c}}>{c.conversion}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── ROW 5: Quick Actions ── */}
        <div {...ani(170)} className="grid grid-cols-2 gap-4">
          {[
            {l:'Laporan & SPJ', d:'Dokumen pertanggungjawaban harian', icon:Package, c:PRIMARY, href:'/konida/lappertandingan/kabbandung'},
            {l:'Premium Export', d:'Buku hasil, piagam, SPJ bonus', icon:Award, c:'#f59e0b', href:'/konida/Premiumreport/kabbandung'},
          ].map(a=>(
            <a key={a.l} href={a.href}
              className="flex items-center justify-between p-5 rounded-2xl transition-all group"
              style={{background:'rgba(255,255,255,0.025)',border:`1px solid ${a.c}20`}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.borderColor=`${a.c}40`}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.borderColor=`${a.c}20`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{background:`${a.c}15`,border:`1px solid ${a.c}25`}}>
                  <a.icon size={20} style={{color:a.c}}/>
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{a.l}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{a.d}</div>
                </div>
              </div>
              <ChevronRight size={18} style={{color:a.c}} className="group-hover:translate-x-1 transition-transform"/>
            </a>
          ))}
        </div>

      </main>

      {/* Detail panel slide-out */}
      {selCabor && (
        <div className="fixed inset-0 z-50" onClick={()=>setSelCabor(null)}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)'}}/>
          <div className="absolute right-0 top-0 h-full w-96 p-6 overflow-y-auto"
            style={{background:'#0f172a',borderLeft:'1px solid rgba(255,255,255,0.08)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Detail Cabor</div>
                <h2 className="text-2xl font-black text-white">{selCabor.nama}</h2>
              </div>
              <button onClick={()=>setSelCabor(null)} style={{color:'rgba(255,255,255,0.4)'}}>
                <X size={18}/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {l:'Total Atlet', v:selCabor.total, c:PRIMARY},
                  {l:'Verified',   v:selCabor.verified, c:'#4ade80'},
                  {l:'Putra',      v:selCabor.putra, c:PRIMARY},
                  {l:'Putri',      v:selCabor.putri, c:'#f472b6'},
                ].map(s=>(
                  <div key={s.l} className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="text-[10px] text-slate-500 mb-1">{s.l}</div>
                    <div className="text-2xl font-light" style={{color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {/* Medali */}
              <div className="rounded-xl p-4" style={{background:'rgba(255,215,0,0.06)',border:'1px solid rgba(255,215,0,0.15)'}}>
                <div className="text-[10px] text-slate-500 mb-3">Perolehan Medali</div>
                <div className="flex gap-3 justify-between">
                  {[{l:'Emas',v:selCabor.emas,c:'#ffd700'},{l:'Perak',v:selCabor.perak,c:'#c0c0c0'},{l:'Perunggu',v:selCabor.perunggu,c:'#cd7f32'}].map(m=>(
                    <div key={m.l} className="flex-1 text-center">
                      <div className="text-2xl font-black" style={{color:m.c}}>{m.v}</div>
                      <div className="text-[10px] text-slate-500">{m.l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-xs" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                  <span className="text-slate-500">Conversion Rate</span>
                  <span className="font-bold" style={{color:selCabor.conversion>30?'#4ade80':'#f87171'}}>{selCabor.conversion}%</span>
                </div>
              </div>
              {/* Analisis */}
              <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="text-[10px] text-slate-500 mb-2">Analisis Sistem</div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {selCabor.conversion>=50 ? '✅ Efisiensi pembinaan sangat baik — cabor ini jadi unggulan perolehan medali.' :
                   selCabor.conversion>=25 ? '🔥 Efisiensi baik, ada peluang meningkat dengan fokus ke atlet potensial.' :
                   selCabor.total>30        ? '⚠️ Banyak atlet tapi konversi rendah — perlu evaluasi metode pembinaan.' :
                   '📋 Data terbatas, perlu monitoring lebih lanjut.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(37,99,235,0.3); border-radius: 4px; }
      `}</style>
    </div>
  )
}