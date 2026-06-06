'use client'
// src/app/atlet/dashboard/page.tsx — v4
// Theme: slate-950 dark navy (sama kayak superadmin)
// Fitur: KPI + Sparkline + Charts + Jadwal + Bonus + Kejuaraan

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Trophy, Clock, CheckCircle, Plus, User,
  Medal, AlertTriangle, ChevronRight, Shield,
  MapPin, Wallet, Calendar, TrendingUp,
  TrendingDown, Edit3, CreditCard, Shirt,
  Target, Star, RefreshCw, Zap,
} from 'lucide-react'

// ── Color palette (sama kayak superadmin) ──────────────────
const C = {
  bg:'#0b0e14', bgCard:'#111827', border:'rgba(255,255,255,0.07)',
  primary:'#ef4444', secondary:'#f97316', accent:'#fbbf24',
  green:'#10b981', blue:'#3b82f6', cyan:'#06b6d4',
  muted:'#64748b', text:'#f1f5f9',
  emerald:'#10b981',
}

const TARIF = { emas:10_000_000, perak:7_500_000, perunggu:5_000_000 }
const fmtRp = (n:number) => 'Rp '+n.toLocaleString('id-ID')

// ── Interfaces ─────────────────────────────────────────────
interface AtletData {
  id:number; nama_lengkap:string; no_ktp:string
  cabor_nama_raw:string; status_registrasi:string
  gender:string; nama_asal_daerah:string
  ukuran_kemeja:string; ukuran_celana:string; ukuran_sepatu:string
  nama_bank:string; no_rekening:string
  no_registrasi_koni:number; login_count:number
  is_public:boolean; kontingen_id:number
}
interface Kejuaraan {
  id:string; nama_kejuaraan:string; tingkat:string
  tahun:number; nomor_lomba:string; hasil:string; status:string
}

// ── Mini sparkline (sama kayak superadmin) ──────────────────
function Sparkline({ data, color }: { data:number[]; color:string }) {
  if (!data.length) return null
  const max=Math.max(...data,1), min=Math.min(...data)
  const W=72, H=28
  const pts=data.map((v,i)=>{
    const x=(i/(data.length-1))*W
    const y=H-((v-min)/(max-min||1))*(H-4)-2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── KPI Card (style superadmin) ─────────────────────────────
function KpiCard({ label, value, sub, color, icon:Icon, trend, spark, small=false }:{
  label:string; value:string|number; sub?:string; color:string; icon:any
  trend?:{pct:number;up:boolean}; spark?:number[]; small?:boolean
}) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden border"
      style={{ background:C.bgCard, borderColor:C.border }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20"
        style={{ background:color }}/>
      <div className="relative flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background:`${color}20` }}>
          <Icon size={18} style={{ color }}/>
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${
            trend.up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {trend.up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
            {trend.pct}%
          </span>
        )}
      </div>
      <div className="relative flex items-end justify-between">
        <div>
          <div className={`font-black text-white leading-none mb-1 ${small?'text-base':'text-2xl'}`}>
            {value}
          </div>
          <div className="text-xs font-medium" style={{ color:C.muted }}>{label}</div>
          {sub && <div className="text-[10px] mt-0.5" style={{ color:`${C.muted}80` }}>{sub}</div>}
        </div>
        {spark && <Sparkline data={spark} color={color}/>}
      </div>
    </div>
  )
}

// ── Tooltip chart ───────────────────────────────────────────
function ChartTip({ active, payload, label }:any) {
  if (!active||!payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 shadow-2xl text-xs border"
      style={{ background:C.bgCard, borderColor:C.border }}>
      <div className="mb-1.5 font-medium" style={{ color:C.muted }}>{label}</div>
      {payload.map((p:any) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background:p.color }}/>
          <span style={{ color:C.muted }}>{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const STATUS_STYLE:Record<string,{bg:string;text:string;border:string}> = {
  'Verified':       {bg:'rgba(16,185,129,0.1)', text:'#10b981',border:'rgba(16,185,129,0.25)'},
  'Posted':         {bg:'rgba(59,130,246,0.1)', text:'#3b82f6',border:'rgba(59,130,246,0.25)'},
  'Menunggu Admin': {bg:'rgba(245,158,11,0.1)', text:'#f59e0b',border:'rgba(245,158,11,0.25)'},
  'Menunggu KONIDA':{bg:'rgba(245,158,11,0.1)', text:'#f59e0b',border:'rgba(245,158,11,0.25)'},
  'Ditolak Admin':  {bg:'rgba(239,68,68,0.1)',  text:'#ef4444',border:'rgba(239,68,68,0.25)'},
}
const TINGKAT_STYLE:Record<string,{bg:string;text:string}> = {
  'internasional':{bg:'rgba(167,139,250,0.1)',text:'#a78bfa'},
  'nasional':     {bg:'rgba(59,130,246,0.1)', text:'#3b82f6'},
  'provinsi':     {bg:'rgba(16,185,129,0.1)', text:'#10b981'},
  'kab_kota':     {bg:'rgba(100,116,139,0.1)',text:'#64748b'},
}

export default function AtletDashboard() {
  const router = useRouter()
  const [me,        setMe]        = useState<AtletData|null>(null)
  const [kejuaraan, setKejuaraan] = useState<Kejuaraan[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [editData,  setEditData]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [animIn,    setAnimIn]    = useState(false)
  // edit fields
  const [kemeja,    setKemeja]    = useState('')
  const [celana,    setCelana]    = useState('')
  const [sepatu,    setSepatu]    = useState('')
  const [bank,      setBank]      = useState('')
  const [rekening,  setRekening]  = useState('')

  const loadAll = useCallback(async (refresh=false) => {
    if (refresh) setRefreshing(true)
    try {
      const [meRes, kejRes] = await Promise.all([
        fetch('/api/atlet/me'),
        fetch('/api/atlet/kejuaraan'),
      ])
      if (!meRes.ok) { router.push('/atlet/login'); return }
      const [meData, kejData] = await Promise.all([meRes.json(), kejRes.json()])
      setMe(meData)
      setKejuaraan(Array.isArray(kejData)?kejData:[])
      setKemeja(meData.ukuran_kemeja||'')
      setCelana(meData.ukuran_celana||'')
      setSepatu(meData.ukuran_sepatu||'')
      setBank(meData.nama_bank||'')
      setRekening(meData.no_rekening||'')
      setTimeout(()=>setAnimIn(true), 100)
    } catch { router.push('/atlet/login') }
    finally { setLoading(false); setRefreshing(false) }
  }, [router])

  useEffect(() => { loadAll() }, [loadAll])

  async function saveData() {
    setSaving(true)
    await fetch('/api/atlet/update',{
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ukuran_kemeja:kemeja,ukuran_celana:celana,ukuran_sepatu:sepatu,nama_bank:bank,no_rekening:rekening}),
    })
    setSaving(false); setSaved(true); setEditData(false)
    setTimeout(()=>setSaved(false),3000)
    loadAll()
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen" style={{background:C.bg}}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{borderColor:`${C.emerald}30`,borderTopColor:C.emerald}}/>
        <p className="text-sm" style={{color:C.muted}}>Memuat data atlet...</p>
      </div>
    </div>
  )
  if (!me) return null

  // Kalkulasi
  const kelFields = [!!me.no_ktp,!!me.ukuran_kemeja,!!me.ukuran_sepatu,!!(me.nama_bank&&me.no_rekening),!!me.no_registrasi_koni]
  const pct = Math.round(kelFields.filter(Boolean).length/kelFields.length*100)
  const kej_verified = kejuaraan.filter(k=>k.status==='Verified')
  const emas     = kej_verified.filter(k=>/emas|juara\s*1|gold/i.test(k.hasil)).length
  const perak    = kej_verified.filter(k=>/perak|juara\s*2|silver/i.test(k.hasil)).length
  const perunggu = kej_verified.filter(k=>/perunggu|juara\s*3|bronze/i.test(k.hasil)).length
  const totalBonus = emas*TARIF.emas+perak*TARIF.perak+perunggu*TARIF.perunggu
  const pending  = kejuaraan.filter(k=>k.status.startsWith('Menunggu')).length
  const hMenuju  = Math.max(0,Math.ceil((new Date('2026-11-07').getTime()-Date.now())/86400000))

  // Trend data chart (simulasi progress login)
  const progressData = [
    {hari:'Sen',kelengkapan:pct-15<0?0:pct-15,kejuaraan:Math.max(0,kejuaraan.length-2)},
    {hari:'Sel',kelengkapan:pct-10<0?0:pct-10,kejuaraan:Math.max(0,kejuaraan.length-1)},
    {hari:'Rab',kelengkapan:pct-5<0?0:pct-5,  kejuaraan:Math.max(0,kejuaraan.length-1)},
    {hari:'Kam',kelengkapan:pct,               kejuaraan:kejuaraan.length},
    {hari:'Jum',kelengkapan:pct,               kejuaraan:kej_verified.length},
  ]

  const ani = (d=0) => ({
    style:{transitionDelay:`${d}ms`,transition:'all 0.5s ease'},
    className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4',
  })

  const inp = "w-full px-3 py-2 rounded-lg text-xs text-slate-200 outline-none transition-all bg-slate-800 border border-slate-700 placeholder-slate-600"

  return (
    <div className="p-6 space-y-5 min-h-screen" style={{background:C.bg}}>

      {/* ── TOPBAR ── */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{color:C.text}}>
            Halo, {me.nama_lengkap.split(' ')[0]}! 👋
          </h1>
          <p className="text-xs mt-0.5" style={{color:C.muted}}>
            {me.cabor_nama_raw} · {me.gender==='L'?'Putra':'Putri'} · {me.nama_asal_daerah||'Kab. Bogor'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {me.status_registrasi && (()=>{
            const s=STATUS_STYLE[me.status_registrasi]||STATUS_STYLE['Menunggu Admin']
            return (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{background:s.bg,color:s.text,border:`1px solid ${s.border}`}}>
                {me.status_registrasi}
              </span>
            )
          })()}
          <button onClick={()=>loadAll(true)}
            className="w-8 h-8 rounded-xl flex items-center justify-center border transition-all"
            style={{borderColor:C.border,color:C.muted}}>
            <RefreshCw size={13} className={refreshing?'animate-spin':''}/>
          </button>
        </div>
      </div>

      {/* ── WARNING kelengkapan ── */}
      {pct < 100 && (
        <div {...ani(20)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{background:'rgba(245,158,11,0.05)',borderColor:'rgba(245,158,11,0.2)'}}>
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0"/>
          <div className="text-xs text-amber-300 flex-1">
            Data {pct}% lengkap — lengkapi rekening untuk pencairan bonus medali PORPROV XV.
          </div>
          <button onClick={()=>setEditData(true)}
            className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
            Lengkapi <ChevronRight size={10}/>
          </button>
        </div>
      )}

      {/* ── KPI CARDS (style superadmin) ── */}
      <div {...ani(40)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Kejuaraan" value={kejuaraan.length}
          sub="diinput"     color={C.accent}    icon={Trophy}
          spark={[1,2,2,kejuaraan.length-1,kejuaraan.length]}/>
        <KpiCard label="Terverifikasi"   value={kej_verified.length}
          sub="oleh KONIDA" color={C.green}     icon={CheckCircle}
          trend={kej_verified.length>0?{pct:Math.round(kej_verified.length/Math.max(1,kejuaraan.length)*100),up:true}:undefined}/>
        <KpiCard label="Menunggu Review" value={pending}
          sub="proses verif" color={pending>0?C.secondary:C.muted} icon={Clock}/>
        <KpiCard label="Estimasi Bonus"  value={totalBonus>0?fmtRp(totalBonus):'Rp 0'}
          sub="dari medali verified" color={C.blue} icon={Wallet} small/>
      </div>

      {/* ── CHART + JADWAL ── */}
      <div {...ani(70)} className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Area Chart progress */}
        <div className="lg:col-span-2 rounded-2xl p-5 border"
          style={{background:C.bgCard,borderColor:C.border}}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{color:C.text}}>Progress Profil Minggu Ini</h3>
              <p className="text-[10px] mt-0.5" style={{color:C.muted}}>Kelengkapan data & kejuaraan</p>
            </div>
            <div className="flex gap-3">
              {[{color:C.green,label:'Kelengkapan'},{color:C.blue,label:'Kejuaraan'}].map(l=>(
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-1 rounded-full" style={{background:l.color}}/>
                  <span className="text-[10px]" style={{color:C.muted}}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={progressData} margin={{top:5,right:5,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="gK" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.green} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gJ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.blue} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="hari" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="kelengkapan" name="Kelengkapan(%)"
                stroke={C.green} strokeWidth={2} fill="url(#gK)"/>
              <Area type="monotone" dataKey="kejuaraan"   name="Kejuaraan"
                stroke={C.blue}  strokeWidth={2} fill="url(#gJ)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Jadwal + Countdown */}
        <div className="rounded-2xl p-5 border flex flex-col"
          style={{background:C.bgCard,borderColor:C.border}}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} style={{color:C.accent}}/>
            <div>
              <h3 className="text-sm font-bold" style={{color:C.text}}>Jadwal Tanding</h3>
              <p className="text-[10px]" style={{color:C.muted}}>PORPROV XV 2026</p>
            </div>
          </div>
          {/* Countdown */}
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <div className="text-5xl font-black mb-2" style={{color:C.accent}}>
              H-{hMenuju}
            </div>
            <div className="text-sm font-bold mb-1" style={{color:C.text}}>
              {hMenuju===0 ? '🎉 HARI INI!' : 'Menuju PORPROV XV'}
            </div>
            <div className="text-xs mb-4" style={{color:C.muted}}>7–20 November 2026 · Jawa Barat</div>
            <div className="w-full px-4 py-3 rounded-xl text-center"
              style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
              <div className="text-[10px]" style={{color:C.muted}}>Cabor kamu</div>
              <div className="text-sm font-bold mt-0.5" style={{color:C.accent}}>{me.cabor_nama_raw}</div>
            </div>
          </div>
          <Link href="/atlet/jadwal"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all mt-2"
            style={{background:'rgba(251,191,36,0.1)',color:C.accent,border:'1px solid rgba(251,191,36,0.2)'}}>
            Lihat Jadwal Lengkap <ChevronRight size={12}/>
          </Link>
        </div>
      </div>

      {/* ── BONUS + KELENGKAPAN ── */}
      <div {...ani(100)} className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Status Bonus */}
        <div className="rounded-2xl p-5 border" style={{background:C.bgCard,borderColor:C.border}}>
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={15} style={{color:C.blue}}/>
            <div>
              <h3 className="text-sm font-bold" style={{color:C.text}}>Status Bonus Medali</h3>
              <p className="text-[10px]" style={{color:C.muted}}>Berdasarkan kejuaraan terverifikasi</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              {label:'🥇 Emas',     jml:emas,     tarif:TARIF.emas,     color:'#f5c518'},
              {label:'🥈 Perak',    jml:perak,    tarif:TARIF.perak,    color:'#cbd5e1'},
              {label:'🥉 Perunggu', jml:perunggu, tarif:TARIF.perunggu, color:'#cd7f32'},
            ].map(m=>(
              <div key={m.label} className="p-3 rounded-xl text-center border"
                style={{background:`${m.color}08`,borderColor:`${m.color}20`}}>
                <div className="text-sm font-black mb-0.5" style={{color:m.color}}>{m.jml}×</div>
                <div className="text-[9px] mb-1" style={{color:C.muted}}>{m.label}</div>
                <div className="text-[10px] font-bold text-white">{fmtRp(m.jml*m.tarif)}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border"
            style={{background:'rgba(59,130,246,0.05)',borderColor:'rgba(59,130,246,0.15)'}}>
            <div>
              <div className="text-xs" style={{color:C.muted}}>Total Estimasi</div>
              <div className="text-[10px]" style={{color:`${C.muted}80`}}>Sesuai SK Bupati</div>
            </div>
            <div className="text-xl font-black" style={{color:C.blue}}>{fmtRp(totalBonus)}</div>
          </div>
          {!me.no_rekening && (
            <div className="mt-3 flex items-center gap-2 text-xs" style={{color:C.accent}}>
              <AlertTriangle size={11}/>
              Rekening belum diisi — bonus tidak bisa dicairkan!
              <button onClick={()=>setEditData(true)} className="underline font-bold">Isi</button>
            </div>
          )}
        </div>

        {/* Kelengkapan + Edit */}
        <div className="rounded-2xl p-5 border" style={{background:C.bgCard,borderColor:C.border}}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} style={{color:C.green}}/>
              <div>
                <h3 className="text-sm font-bold" style={{color:C.text}}>Kelengkapan Data</h3>
                <p className="text-[10px]" style={{color:C.muted}}>{pct}% lengkap</p>
              </div>
            </div>
            <button onClick={()=>setEditData(e=>!e)}
              className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all"
              style={{
                background:editData?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.04)',
                color:editData?C.green:C.muted,
                borderColor:editData?'rgba(16,185,129,0.3)':C.border,
              }}>
              <Edit3 size={10}/>{editData?'Batal':'Edit'}
            </button>
          </div>
          {/* Progress */}
          <div className="h-2 rounded-full mb-4" style={{background:'rgba(255,255,255,0.08)'}}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{width:`${pct}%`,background:pct===100?C.green:C.accent}}/>
          </div>
          {/* Checklist */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              {label:'NIK/KTP',       ok:!!me.no_ktp,                        icon:Shield},
              {label:'Ukuran Kemeja', ok:!!me.ukuran_kemeja,                 icon:Shirt},
              {label:'Ukuran Sepatu', ok:!!me.ukuran_sepatu,                 icon:Target},
              {label:'Rekening Bank', ok:!!(me.nama_bank&&me.no_rekening),   icon:CreditCard},
              {label:'No. Reg KONI',  ok:!!me.no_registrasi_koni,            icon:Star},
            ].map(f=>(
              <div key={f.label} className="flex items-center gap-2 text-xs">
                <f.icon size={11} style={{color:f.ok?C.green:C.accent,flexShrink:0}}/>
                <span style={{color:f.ok?C.muted:'#fde68a'}}>{f.label}</span>
              </div>
            ))}
          </div>
          {/* Edit form */}
          {editData && (
            <div className="space-y-2 pt-3" style={{borderTop:`1px solid ${C.border}`}}>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={{color:C.muted}}>Kemeja</label>
                  <select value={kemeja} onChange={e=>setKemeja(e.target.value)} className={inp}>
                    <option value="">-</option>
                    {['S','M','L','XL','XXL','XXXL'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={{color:C.muted}}>Celana</label>
                  <input value={celana} onChange={e=>setCelana(e.target.value)}
                    placeholder="S/M/L" className={inp}/>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={{color:C.muted}}>Sepatu</label>
                  <input type="number" value={sepatu} onChange={e=>setSepatu(e.target.value)}
                    placeholder="38" className={inp}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={{color:C.muted}}>Bank</label>
                  <input value={bank} onChange={e=>setBank(e.target.value)}
                    placeholder="BRI/BNI/Mandiri" className={inp}/>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={{color:C.muted}}>No. Rekening</label>
                  <input value={rekening} onChange={e=>setRekening(e.target.value)}
                    placeholder="0123456789" className={inp}/>
                </div>
              </div>
              <button onClick={saveData} disabled={saving}
                className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                style={{background:`linear-gradient(135deg,${C.green},#059669)`}}>
                {saving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Menyimpan...</> : '💾 Simpan Data'}
              </button>
              {saved && <div className="text-center text-emerald-400 text-xs">✅ Data berhasil disimpan!</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── RIWAYAT KEJUARAAN ── */}
      <div {...ani(130)} className="rounded-2xl border overflow-hidden"
        style={{background:C.bgCard,borderColor:C.border}}>
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{borderColor:C.border}}>
          <div>
            <h3 className="text-sm font-bold" style={{color:C.text}}>Riwayat Kejuaraan</h3>
            <p className="text-[10px] mt-0.5" style={{color:C.muted}}>
              {kejuaraan.length} kejuaraan · {kej_verified.length} terverifikasi
            </p>
          </div>
          <Link href="/atlet/kejuaraan/tambah"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{background:`linear-gradient(135deg,${C.primary},${C.secondary})`}}>
            <Plus size={12}/> Tambah
          </Link>
        </div>

        {kejuaraan.length===0 ? (
          <div className="py-12 text-center">
            <Trophy size={32} className="mx-auto mb-3 opacity-20" style={{color:C.muted}}/>
            <div className="text-sm font-medium" style={{color:C.muted}}>Belum ada kejuaraan</div>
            <div className="text-xs mt-1" style={{color:`${C.muted}60`}}>
              Tambahkan prestasi untuk diverifikasi KONIDA
            </div>
          </div>
        ) : (
          <div>
            {/* Header tabel */}
            <div className="grid px-5 py-2.5 text-[9px] font-black uppercase tracking-wider"
              style={{gridTemplateColumns:'2fr 1fr 1fr auto',background:'rgba(255,255,255,0.02)',color:C.muted}}>
              <div>Kejuaraan</div><div>Nomor</div><div>Hasil</div><div>Status</div>
            </div>
            {kejuaraan.slice(0,6).map((k,i)=>{
              const ts=TINGKAT_STYLE[k.tingkat]||TINGKAT_STYLE.kab_kota
              const ss=STATUS_STYLE[k.status]||STATUS_STYLE['Menunggu Admin']
              return (
                <div key={k.id}
                  className="grid px-5 py-3 border-b items-center transition-colors"
                  style={{gridTemplateColumns:'2fr 1fr 1fr auto',borderColor:C.border}}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate" style={{color:C.text}}>
                        {k.nama_kejuaraan}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{background:ts.bg,color:ts.text}}>
                        {k.tingkat.replace('_','/')}
                      </span>
                    </div>
                    <div className="text-[10px]" style={{color:C.muted}}>{k.tahun}</div>
                  </div>
                  <div className="text-xs" style={{color:C.muted}}>{k.nomor_lomba}</div>
                  <div className="text-xs font-semibold" style={{color:C.text}}>{k.hasil}</div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{background:ss.bg,color:ss.text,border:`1px solid ${ss.border}`}}>
                    {k.status.replace('Menunggu ','').replace('Ditolak Admin','Ditolak')}
                  </span>
                </div>
              )
            })}
            {kejuaraan.length>6 && (
              <div className="px-5 py-3 text-center" style={{borderTop:`1px solid ${C.border}`}}>
                <Link href="/atlet/kejuaraan"
                  className="text-xs font-bold flex items-center justify-center gap-1"
                  style={{color:C.green}}>
                  Lihat {kejuaraan.length-6} lainnya <ChevronRight size={12}/>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div {...ani(160)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 pb-4">
        {[
          {href:'/atlet/profil',    icon:User,     label:'Edit Profil',     sub:'Apparel & rekening',    color:C.green},
          {href:'/atlet/bonus',     icon:Wallet,   label:'Detail Bonus',    sub:'SPJ & estimasi',        color:C.blue},
          {href:'/atlet/dokumen',   icon:Shield,   label:'Dokumen Resmi',   sub:'Sertifikat & piagam',   color:C.accent},
          {href:'/atlet/idcard',    icon:Zap,      label:'ID Card Digital', sub:'QR code resmi',         color:C.secondary},
        ].map(q=>(
          <Link key={q.href} href={q.href}
            className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.02] group"
            style={{background:C.bgCard,borderColor:C.border}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{background:`${q.color}15`}}>
              <q.icon size={16} style={{color:q.color}}/>
            </div>
            <div>
              <div className="text-xs font-bold" style={{color:C.text}}>{q.label}</div>
              <div className="text-[10px]" style={{color:C.muted}}>{q.sub}</div>
            </div>
            <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
              style={{color:C.muted}}/>
          </Link>
        ))}
      </div>

    </div>
  )
}