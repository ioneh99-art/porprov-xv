'use client'
// src/app/superadmin/page.tsx — JARVIS COMMAND CENTER THEME

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  AlertTriangle, Award, Brain, Building2, CheckCircle, ChevronRight,
  Eye, FileSearch, FileText, Globe, Layers, Medal, RefreshCw, Search,
  Shield, ShieldCheck, Target, TrendingDown, TrendingUp,
  UserCog, Users, X, Zap, Terminal, Activity
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { LEVEL_META, resolveLevel, type UserLevel } from '@/lib/levels'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types (TIDAK ADA YANG DIUBAH)
interface TenantStat {
  kontingen_id:    number; nama: string; level: UserLevel
  total_atlet:     number; total_user: number
  medali_emas:     number; medali_perak: number; medali_perunggu: number
  kual_lolos:      number; kual_pending: number
  last_active:     string; status: 'aktif' | 'idle'
}

interface SystemSummary {
  total_kontingen: number; total_atlet: number; total_user: number
  total_emas:      number; total_medali: number
  pending_verif:   number; atlet_l: number; atlet_p: number
}

// JARVIS PALETTE
const C = {
  primary: '#00f3ff', secondary: '#00ff66', accent: '#ffb000', alert: '#ff3366',
  cyan: '#00f3ff', green: '#00ff66', blue: '#00ccff', muted: '#7a8b9e',
  bg: 'transparent', bgCard: 'rgba(10, 25, 47, 0.4)', border: 'rgba(0, 243, 255, 0.2)', text: '#f1f5f9',
}

function timeAgo(d: string | null): string {
  if (!d) return 'NO_DATA'
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'JUST_NOW'
  if (m < 60) return `${m}M_AGO`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}H_AGO`
  return `${Math.floor(h / 24)}D_AGO`
}

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return <span className="font-lcd text-sm font-bold tabular-nums text-glow text-[#00f3ff]">
    {t.toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' })}
  </span>
}

// Cyber Panel CSS
const cyberPanelStyle = {
  background: C.bgCard,
  border: `1px solid ${C.border}`,
  backdropFilter: 'blur(10px)',
  boxShadow: `inset 0 0 20px rgba(0, 243, 255, 0.05)`,
  position: 'relative' as const
}

// Chart Tooltip Sci-Fi
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3 border font-mono text-xs backdrop-blur-md" style={{ background:'rgba(3,7,18,0.9)', borderColor:C.primary, boxShadow:`0 0 15px ${C.primary}40` }}>
      <div className="text-[#00f3ff] mb-2 font-bold uppercase border-b border-[#00f3ff]/30 pb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5" style={{ background:p.color }} />
          <span className="text-slate-400 uppercase">{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, color, icon:Icon }: {
  label:string; value:string|number; sub?:string; color:string; icon:any
}) {
  return (
    <div className="p-5 font-mono" style={cyberPanelStyle}>
      <div className="absolute top-0 right-0 p-2 opacity-20"><Icon size={40} color={color}/></div>
      <div className="relative">
        <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-3xl font-lcd font-bold mb-2" style={{ color, textShadow:`0 0 10px ${color}80` }}>{value}</div>
        {sub && <div className="text-[9px] uppercase" style={{ color:`${color}90` }}>&gt; {sub}</div>}
      </div>
      {/* Ornamen sudut */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: color }}/>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: color }}/>
    </div>
  )
}

// PORPROV XV — 20 Oktober 2026 (target, sesuaikan SK)
const PORPROV_DATE = new Date('2026-10-20T07:00:00+07:00')

function Countdown() {
  const [diff, setDiff] = useState(0)
  useEffect(() => {
    const tick = () => setDiff(Math.max(0, PORPROV_DATE.getTime() - Date.now()))
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [])
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  const unit = (v: number, l: string) => (
    <div className="text-center">
      <div className="font-lcd font-bold text-lg tabular-nums" style={{ color: C.primary }}>{String(v).padStart(2,'0')}</div>
      <div className="text-[8px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>{l}</div>
    </div>
  )
  return (
    <div className="flex items-center gap-3">
      {unit(d,'DAY')}
      <span className="font-lcd text-lg" style={{ color: C.border }}>:</span>
      {unit(h,'HRS')}
      <span className="font-lcd text-lg" style={{ color: C.border }}>:</span>
      {unit(m,'MIN')}
      <span className="font-lcd text-lg" style={{ color: C.border }}>:</span>
      {unit(s,'SEC')}
    </div>
  )
}

const MODULES = [
  { label:'OBSERVATORY',   path:'/superadmin/observatory',  icon:Globe,       color:'#a855f7', desc:'Network health · nodes' },
  { label:'TENANTS_CONFIG',path:'/superadmin/tenants',      icon:Building2,   color:'#a855f7', desc:'Branding · login · plan' },
  { label:'USER_MATRIX',   path:'/superadmin/tenants',      icon:Users,       color:'#00f3ff', desc:'Kelola user di tab USERS' },
  { label:'SUBSCRIPTIONS', path:'/superadmin/subscriptions',icon:Target,      color:'#00f3ff', desc:'Plan · feature flags'    },
  { label:'VERIF_CENTER',  path:'/superadmin/verif',        icon:ShieldCheck, color:'#00ff66', desc:'Bulk approve · reject'   },
  { label:'INTEGRITY',     path:'/superadmin/integrity',    icon:FileSearch,  color:'#00ff66', desc:'Data health · anomaly'   },
  { label:'AI_MONITOR',    path:'/superadmin/ai',           icon:Brain,       color:'#ffb000', desc:'Cost · token · usage'    },
  { label:'AUDIT_LOGS',    path:'/superadmin/logs',         icon:FileText,    color:'#ffb000', desc:'Aksi · history · trail'  },
]

export default function SuperadminDashboard() {
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary]       = useState<SystemSummary|null>(null)
  const [tenants, setTenants]       = useState<TenantStat[]>([])
  const [activityData, setActivityData] = useState<any[]>([])
  const [medaliChart, setMedaliChart]   = useState<any[]>([])
  const [search, setSearch]         = useState('')
  const [filterLevel, setFilterLevel] = useState<UserLevel|'semua'>('semua')
  const [impersonateId, setImpersonateId] = useState<number|null>(null)
  const [error, setError]           = useState<string|null>(null)
  const [animIn, setAnimIn]         = useState(false)
  let reqId = 0

  // FETCH DATA TETAP SAMA
  const fetchData = useCallback(async () => {
    const id = ++reqId
    setRefreshing(true); setError(null)
    try {
      const { data: kontingens } = await sb.from('kontingen').select('id, nama').order('nama')
      const { data: allUsers }   = await sb.from('users').select('id, kontingen_id, role, level, last_sign_in_at, is_active')
      const { data: atletData }  = await sb.from('atlet').select('kontingen_id, gender, status_kualifikasi, status_verifikasi')
      const { data: medaliData } = await sb.from('hasil_pertandingan').select('kontingen_id, medali').not('medali','is',null)

      const [
        { count: totalAtlet }, { count: totalUser }, { count: pendingVerif },
        { count: atletL },     { count: atletP },
      ] = await Promise.all([
        sb.from('atlet').select('*',{count:'exact',head:true}),
        sb.from('users').select('*',{count:'exact',head:true}),
        sb.from('atlet').select('*',{count:'exact',head:true}).eq('status_verifikasi','pending'),
        sb.from('atlet').select('*',{count:'exact',head:true}).eq('gender','L'),
        sb.from('atlet').select('*',{count:'exact',head:true}).eq('gender','P'),
      ])

      if (id !== reqId) return

      const levelMap  = new Map<number, UserLevel>()
      const userMap   = new Map<number, { count:number; lastActive:string }>()
      const atletMap  = new Map<number, { total:number; lolos:number; pending:number }>()
      const medaliMap = new Map<number, { emas:number; perak:number; perunggu:number }>()
      const order: Record<string,number> = { superadmin:4, level1:3, level2:2, level3:1 }

      allUsers?.forEach(u => {
        if (!u.kontingen_id) return
        const lv = (u.level as UserLevel) ?? resolveLevel(u.role, u.kontingen_id)
        const ex = levelMap.get(u.kontingen_id)
        if (!ex || (order[lv]??0) > (order[ex]??0)) levelMap.set(u.kontingen_id, lv)
        const cur = userMap.get(u.kontingen_id) ?? { count:0, lastActive:'' }
        cur.count++
        if (u.last_sign_in_at && (!cur.lastActive || u.last_sign_in_at > cur.lastActive)) cur.lastActive = u.last_sign_in_at
        userMap.set(u.kontingen_id, cur)
      })
      atletData?.forEach(a => {
        if (!a.kontingen_id) return
        const cur = atletMap.get(a.kontingen_id) ?? { total:0, lolos:0, pending:0 }
        cur.total++
        if (a.status_kualifikasi === 'lolos') cur.lolos++
        if (a.status_verifikasi  === 'pending') cur.pending++
        atletMap.set(a.kontingen_id, cur)
      })
      medaliData?.forEach(m => {
        if (!m.kontingen_id) return
        const cur = medaliMap.get(m.kontingen_id) ?? { emas:0, perak:0, perunggu:0 }
        if (m.medali==='emas') cur.emas++
        else if (m.medali==='perak') cur.perak++
        else if (m.medali==='perunggu') cur.perunggu++
        medaliMap.set(m.kontingen_id, cur)
      })

      const built: TenantStat[] = (kontingens??[]).map(k => {
        const atl = atletMap.get(k.id)  ?? { total:0, lolos:0, pending:0 }
        const usr = userMap.get(k.id)   ?? { count:0, lastActive:'' }
        const med = medaliMap.get(k.id) ?? { emas:0, perak:0, perunggu:0 }
        const lv  = levelMap.get(k.id)  ?? 'level3'
        const lastMs = usr.lastActive ? Date.now() - new Date(usr.lastActive).getTime() : Infinity
        return {
          kontingen_id:    k.id,    nama: k.nama, level: lv,
          total_atlet:     atl.total, total_user: usr.count,
          medali_emas:     med.emas, medali_perak: med.perak, medali_perunggu: med.perunggu,
          kual_lolos:      atl.lolos, kual_pending: atl.pending,
          last_active:     timeAgo(usr.lastActive || null),
          status:          lastMs < 2*60*60*1000 ? 'aktif' : 'idle',
        }
      })

      const totalEmas   = built.reduce((a,t) => a+t.medali_emas, 0)
      const totalMedali = built.reduce((a,t) => a+t.medali_emas+t.medali_perak+t.medali_perunggu, 0)

      setSummary({
        total_kontingen: kontingens?.length ?? 0,
        total_atlet: totalAtlet ?? 0, total_user: totalUser ?? 0,
        total_emas: totalEmas, total_medali: totalMedali,
        pending_verif: pendingVerif ?? 0, atlet_l: atletL ?? 0, atlet_p: atletP ?? 0,
      })
      setTenants(built)

      setMedaliChart(
        [...built].sort((a,b)=>b.medali_emas-a.medali_emas).slice(0,6)
          .map(t => ({
            nama: t.nama.replace('Kota ','').replace('Kabupaten ','Kab.').slice(0,8),
            emas: t.medali_emas, perak: t.medali_perak, perunggu: t.medali_perunggu,
          }))
      )

      const base = Math.max(1, Math.floor((totalAtlet??0)/50))
      setActivityData(
        ['08','09','10','11','12','13','14','15','16'].map((h,i) => ({
          time:`${h}:00`,
          atlet: Math.max(0, Math.floor(base*(0.5+Math.sin(i*0.8)*0.3))),
          user:  Math.max(0, Math.floor(3+i*1.5)),
          verif: Math.max(0, Math.floor(1+i*0.7)),
        }))
      )
    } catch (e:any) {
      if (id === reqId) setError(e?.message ?? 'Gagal memuat data')
    } finally {
      if (id === reqId) { setLoading(false); setRefreshing(false) }
    }
  }, [])

  useEffect(() => {
    void fetchData()
    const t = setTimeout(() => setAnimIn(true), 100)
    return () => clearTimeout(t)
  }, [fetchData])

  const filtered = useMemo(() => {
    let r = tenants
    if (search) r = r.filter(t => t.nama.toLowerCase().includes(search.toLowerCase()))
    if (filterLevel !== 'semua') r = r.filter(t => t.level === filterLevel)
    return [...r].sort((a,b) => b.medali_emas - a.medali_emas)
  }, [tenants, search, filterLevel])

  const LEVEL_CLR: Record<string,string> = {
    level1:C.accent, level2:C.muted, level3:C.blue,
  }

  const ani = (d=0) => ({
    style:{ transitionDelay:`${d}ms`, transition:'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
  })

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="text-center font-lcd">
        <div className="w-12 h-12 border-2 border-[#00f3ff]/20 border-t-[#00f3ff] rounded-full animate-spin mx-auto mb-4" style={{boxShadow: '0 0 15px rgba(0, 243, 255, 0.5)'}}/>
        <p className="text-[#00f3ff] text-xs uppercase tracking-widest text-glow">INITIALIZING DASHBOARD_HQ...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="p-8 border max-w-sm w-full text-center" style={{ ...cyberPanelStyle, borderColor: C.alert }}>
        <AlertTriangle size={32} className="mx-auto mb-3" style={{ color:C.alert }}/>
        <h3 className="text-white font-lcd mb-2">SYSTEM_ERROR</h3>
        <p className="text-xs mb-4 font-mono" style={{ color:C.muted }}>{error}</p>
        <button onClick={()=>void fetchData()}
          className="px-6 py-2 text-sm font-lcd tracking-widest text-black bg-[#ff3366] hover:bg-white transition-colors">
          REBOOT_SEQUENCE
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6 min-h-screen">

      {/* Topbar */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:C.primary }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="QUERY_KONTINGEN..."
            className="w-full pl-9 pr-4 py-2 text-xs font-mono border outline-none bg-slate-900/50 focus:border-[#00f3ff] transition-colors"
            style={{ borderColor:C.border, color:C.primary }}/>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 border flex items-center gap-2 bg-[#00f3ff]/5"
            style={{ borderColor:C.border }}>
            <div className="w-2 h-2 bg-[#00f3ff] animate-pulse"/>
            <LiveClock/>
          </div>
          <button onClick={()=>void fetchData()}
            className="w-10 h-10 flex items-center justify-center border text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black transition-colors"
            style={{ borderColor:C.border }}>
            <RefreshCw size={16} className={refreshing?'animate-spin':''}/>
          </button>
        </div>
      </div>

      {/* Page title + action */}
      <div {...ani(20)} className="flex items-center justify-between border-b border-[#00f3ff]/20 pb-4">
        <div>
          <h1 className="text-2xl font-lcd font-bold text-white text-glow">GLOBAL_COMMAND_CENTER</h1>
          <p className="text-[11px] font-mono mt-1 uppercase" style={{ color:C.muted }}>
            NETWORK_NODES: {summary?.total_kontingen??0} | LIVE_TELEMETRY: ACTIVE
          </p>
        </div>
        <Link href="/superadmin/verif"
          className="flex items-center gap-2 px-4 py-2 text-xs font-lcd tracking-widest bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366] hover:bg-[#ff3366] hover:text-white transition-colors">
          <CheckCircle size={14}/> {summary?.pending_verif??0} PENDING_APPROVAL
        </Link>
      </div>

      {/* PORPROV countdown + Command Hub */}
      <div {...ani(35)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Countdown */}
        <div className="p-4 relative overflow-hidden" style={cyberPanelStyle}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,${C.primary},${C.secondary})` }} />
          <div className="text-[9px] font-lcd uppercase tracking-widest mb-2" style={{ color: C.muted }}>
            ⚡ PORPROV_XV — COUNTDOWN
          </div>
          <Countdown />
          <div className="text-[8px] font-mono mt-2" style={{ color: C.muted }}>Target: 20 Oktober 2026</div>
        </div>
        {/* Quick module grid */}
        <div className="lg:col-span-2 grid grid-cols-4 gap-2">
          {MODULES.map(m => (
            <Link key={m.path} href={m.path}
              className="p-3 flex flex-col gap-1.5 border transition-all hover:scale-[1.02] group"
              style={{ ...cyberPanelStyle, borderColor: `${m.color}20` }}>
              <div className="flex items-center gap-1.5">
                <m.icon size={12} style={{ color: m.color }} />
                <span className="text-[8px] font-lcd uppercase tracking-wider font-bold" style={{ color: m.color }}>{m.label}</span>
              </div>
              <div className="text-[7px] font-mono" style={{ color: C.muted }}>{m.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div {...ani(40)} className="grid grid-cols-5 gap-4">
        <KpiCard label="Network Nodes" value={summary?.total_kontingen??0} sub="Registered" color={C.primary} icon={Globe} />
        <KpiCard label="Total Assets" value={(summary?.total_atlet??0).toLocaleString()} sub={`M:${summary?.atlet_l??0} F:${summary?.atlet_p??0}`} color={C.secondary} icon={Users} />
        <KpiCard label="Active Users" value={summary?.total_user??0} sub="System Wide" color={C.blue} icon={UserCog} />
        <KpiCard label="Gold Yield" value={summary?.total_emas??0} sub={`${summary?.total_medali??0} Total Medals`} color={C.accent} icon={Medal} />
        <KpiCard label="Critical Verif" value={summary?.pending_verif??0} sub="Action Required" color={C.alert} icon={AlertTriangle} />
      </div>

      {/* Charts */}
      <div {...ani(70)} className="grid grid-cols-3 gap-4">
        <div className="col-span-2 p-5" style={cyberPanelStyle}>
          <div className="flex items-center justify-between mb-5 border-b border-[#00f3ff]/20 pb-2">
            <div>
              <h3 className="text-sm font-lcd font-bold text-[#00f3ff] uppercase">System Activity Matrix</h3>
            </div>
            <div className="flex gap-4 font-mono text-[10px] uppercase">
              {[{color:C.secondary,label:'Asset_Sync'},{color:C.cyan,label:'User_Login'},{color:C.green,label:'Verif_Log'}].map(l=>(
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2" style={{ background:l.color }}/>
                  <span style={{ color:C.text }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityData} margin={{ top:5, right:5, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.secondary} stopOpacity={0.4}/><stop offset="95%" stopColor={C.secondary} stopOpacity={0}/></linearGradient>
                <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.cyan} stopOpacity={0.35}/><stop offset="95%" stopColor={C.cyan} stopOpacity={0}/></linearGradient>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.3}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,243,255,0.1)"/>
              <XAxis dataKey="time" tick={{ fill:C.muted, fontSize:10, fontFamily:'monospace' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:C.muted, fontSize:10, fontFamily:'monospace' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip/>}/>
              <Area type="monotone" dataKey="atlet" name="Asset_Sync" stroke={C.secondary} strokeWidth={2} fill="url(#gA)"/>
              <Area type="monotone" dataKey="user"  name="User_Login"  stroke={C.cyan}      strokeWidth={2} fill="url(#gU)"/>
              <Area type="monotone" dataKey="verif" name="Verif_Log" stroke={C.green}     strokeWidth={2} fill="url(#gV)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="p-5" style={cyberPanelStyle}>
          <div className="mb-5 border-b border-[#00f3ff]/20 pb-2">
            <h3 className="text-sm font-lcd font-bold text-[#ffb000] uppercase">Medal Distribution</h3>
            <p className="text-[10px] font-mono mt-0.5 uppercase" style={{ color:C.muted }}>Top {medaliChart.length} Nodes</p>
          </div>
          {medaliChart.length === 0 ? (
            <div className="flex items-center justify-center h-48 font-mono text-xs" style={{ color:C.muted }}>
                NO_DATA_DETECTED
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={medaliChart} margin={{ top:0, right:5, left:-25, bottom:0 }} barSize={10}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,243,255,0.1)" horizontal vertical={false}/>
                <XAxis dataKey="nama" tick={{ fill:C.muted, fontSize:9, fontFamily:'monospace' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:C.muted, fontSize:10, fontFamily:'monospace' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Bar dataKey="emas"     name="Gold"     fill="#ffb000" radius={[2,2,0,0]}/>
                <Bar dataKey="perak"    name="Silver"    fill="#94a3b8" radius={[2,2,0,0]}/>
                <Bar dataKey="perunggu" name="Bronze" fill="#cd7f32" radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tenant Table + Side Panel */}
      <div {...ani(100)} className="grid grid-cols-3 gap-4">
        <div className="col-span-2 overflow-hidden" style={cyberPanelStyle}>
          
          <div className="px-5 py-4 border-b flex items-center justify-between bg-[#00f3ff]/5" style={{ borderColor:C.border }}>
            <div>
              <h3 className="text-sm font-lcd font-bold text-white uppercase tracking-wider">Network Directory</h3>
              <p className="text-[10px] font-mono mt-0.5 uppercase" style={{ color:C.muted }}>Filtering {filtered.length} / {tenants.length} Nodes</p>
            </div>
            <div className="flex gap-2">
              {(['semua','level1','level2','level3'] as const).map(l => (
                <button key={l} onClick={()=>setFilterLevel(l)}
                  className="text-[10px] px-3 py-1 font-lcd uppercase tracking-widest transition-colors border"
                  style={{
                    background: filterLevel===l ? 'rgba(0, 243, 255, 0.15)' : 'transparent',
                    color: filterLevel===l ? '#00f3ff' : C.muted,
                    borderColor: filterLevel===l ? '#00f3ff' : 'transparent',
                  }}>
                  {l==='semua' ? 'ALL_NODES' : LEVEL_META[l]?.label?.split('·')[0]?.trim()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid px-5 py-3 text-[10px] font-lcd font-bold uppercase tracking-widest border-b"
            style={{ gridTemplateColumns:'2fr 1fr 1.4fr 1.2fr auto', background:'rgba(0,243,255,0.05)', color:C.primary, borderColor:C.border }}>
            <div>Node_Name</div><div className="text-center">Assets</div>
            <div>Qual_Status</div><div>Acquisition</div><div>Protocol</div>
          </div>

          <div className="max-h-[500px] overflow-y-auto font-mono">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color:C.muted }}> NO_NODES_FOUND</div>
            ) : filtered.map(t => {
              const kualPct = t.total_atlet > 0 ? Math.round((t.kual_lolos/t.total_atlet)*100) : 0
              const barColor = kualPct>80 ? C.green : kualPct>50 ? C.accent : C.alert
              return (
                <div key={t.kontingen_id}
                  className="grid px-5 py-4 border-b items-center transition-colors hover:bg-[#00f3ff]/5"
                  style={{ gridTemplateColumns:'2fr 1fr 1.4fr 1.2fr auto', borderColor:'rgba(0,243,255,0.1)' }}>

                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 flex-shrink-0 ${t.status==='aktif'?'animate-ping':''}`}
                      style={{ background:t.status==='aktif'?C.green:C.muted }}/>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate font-lcd tracking-wider">{t.nama}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-black/50 border border-slate-700" style={{ color:LEVEL_CLR[t.level]??C.muted }}>
                          {LEVEL_META[t.level]?.label?.split('·')[0]?.trim()}
                        </span>
                        <span className="text-[9px] uppercase" style={{ color:C.muted }}>_LOG: {t.last_active}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm font-bold text-[#00f3ff]">{t.total_atlet}</div>
                    <div className="text-[9px] uppercase" style={{ color:C.muted }}>{t.total_user} usr</div>
                  </div>

                  <div className="pr-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] uppercase" style={{ color:C.muted }}>{t.kual_lolos} Pass</span>
                      <span className="text-[10px] font-bold text-white">{kualPct}%</span>
                    </div>
                    <div className="h-1 bg-slate-800/50">
                      <div className="h-full" style={{ width:`${kualPct}%`, background:barColor, boxShadow:`0 0 5px ${barColor}` }}/>
                    </div>
                    {t.kual_pending>0 && <div className="text-[9px] mt-1 font-bold uppercase" style={{ color:C.accent }}>! {t.kual_pending} PNDG</div>}
                  </div>

                  <div className="flex gap-2 text-sm font-bold font-lcd">
                    <span style={{ color:C.accent }}>{t.medali_emas}</span>
                    <span style={{ color:C.muted }}>{t.medali_perak}</span>
                    <span style={{ color:'#cd7f32' }}>{t.medali_perunggu}</span>
                  </div>

                  <button onClick={()=>setImpersonateId(t.kontingen_id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-lcd font-bold text-black bg-[#00f3ff] hover:bg-white transition-colors uppercase">
                    <Eye size={12}/> OVERRIDE
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          <div className="p-5" style={cyberPanelStyle}>
            <h3 className="text-sm font-lcd font-bold text-[#00f3ff] mb-4 flex items-center gap-2 uppercase border-b border-[#00f3ff]/20 pb-2">
              <Layers size={14}/> Level Distribution
            </h3>
            <div className="space-y-4 font-mono">
              {(['level1','level2','level3'] as UserLevel[]).map(lv => {
                const count = tenants.filter(t=>t.level===lv).length
                const pct   = tenants.length > 0 ? Math.round((count/tenants.length)*100) : 0
                const color = lv==='level1' ? C.accent : lv==='level2' ? C.muted : C.blue
                return (
                  <div key={lv}>
                    <div className="flex items-center justify-between mb-1.5 uppercase">
                      <span className="text-[10px] font-bold" style={{ color }}>{LEVEL_META[lv]?.label}</span>
                      <span className="text-xs font-bold text-white">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800/50">
                      <div className="h-full" style={{ width:`${pct}%`, background:color, boxShadow:`0 0 5px ${color}` }}/>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="mt-5 pt-5 border-t border-[#00f3ff]/20 grid grid-cols-2 gap-3 font-mono">
              <div className="text-center p-3 border border-[#00ccff]/30 bg-[#00ccff]/5">
                <div className="text-lg font-lcd font-bold" style={{ color:C.blue }}>M: {summary?.atlet_l??0}</div>
                <div className="text-[9px] uppercase" style={{ color:C.muted }}>Male Assets</div>
              </div>
              <div className="text-center p-3 border border-[#ff00ff]/30 bg-[#ff00ff]/5">
                <div className="text-lg font-lcd font-bold" style={{ color:'#ff00ff' }}>F: {summary?.atlet_p??0}</div>
                <div className="text-[9px] uppercase" style={{ color:C.muted }}>Female Assets</div>
              </div>
            </div>
          </div>

          <div className="p-5" style={cyberPanelStyle}>
            <h3 className="text-sm font-lcd font-bold text-[#00ff66] mb-4 flex items-center gap-2 uppercase border-b border-[#00ff66]/20 pb-2">
              <Terminal size={14}/> Executable Actions
            </h3>
            <div className="space-y-2 font-mono">
              {[
                { label:'VERIF_CENTER',    path:'/superadmin/verif',         icon:ShieldCheck, color:C.green,   badge:summary?.pending_verif },
                { label:'INTEGRITY_SCAN',  path:'/superadmin/integrity',     icon:FileSearch,  color:C.secondary },
                { label:'OBSERVATORY',     path:'/superadmin/observatory',   icon:Globe,       color:'#a855f7' },
                { label:'TENANTS_CONFIG',  path:'/superadmin/tenants',       icon:Building2,   color:'#a855f7' },
                { label:'AI_MONITOR',      path:'/superadmin/ai',            icon:Brain,       color:C.accent  },
                { label:'AUDIT_TRAIL',     path:'/superadmin/logs',          icon:FileText,    color:C.accent  },
                { label:'USER_MATRIX',     path:'/superadmin/tenants',       icon:Users,       color:C.secondary },
                { label:'SUBSCRIPTIONS',   path:'/superadmin/subscriptions', icon:Target,      color:C.cyan    },
              ].map(q => (
                <Link key={q.path} href={q.path}
                  className="flex items-center gap-3 px-3 py-2 text-xs border transition-colors hover:bg-slate-800"
                  style={{ borderColor:C.border, color:q.color }}>
                  <q.icon size={13}/>
                  <span className="flex-1 uppercase">{q.label}</span>
                  {!!q.badge && q.badge>0 && <span className="text-[9px] font-bold text-black bg-[#ff3366] px-1.5 py-0.5">{q.badge}</span>}
                  <ChevronRight size={11} className="text-slate-500"/>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Impersonate Modal Sci-Fi */}
      {impersonateId && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4 bg-black/80 backdrop-blur-sm font-mono">
          <div className="w-full max-w-sm border shadow-[0_0_30px_rgba(0,243,255,0.2)]" style={{ background:'rgba(3,7,18,0.95)', borderColor:C.primary }}>
            <div className="px-6 py-4 border-b flex items-center gap-3 bg-[#00f3ff]/10" style={{ borderColor:C.primary }}>
              <div className="w-8 h-8 flex items-center justify-center bg-[#00f3ff] text-black">
                <Eye size={18}/>
              </div>
              <div>
                <h3 className="text-[#00f3ff] font-lcd font-bold uppercase tracking-wider">OVERRIDE_PROTOCOL</h3>
                <p className="text-[9px] mt-0.5 text-[#00f3ff]/70 uppercase">Action will be logged in audit trail</p>
              </div>
              <button onClick={()=>setImpersonateId(null)} className="ml-auto text-[#00f3ff] hover:text-[#ff3366]"><X size={16}/></button>
            </div>
            <div className="p-6">
              <p className="text-xs mb-6 text-slate-300 uppercase leading-relaxed">
                {'>'} Executing identity override.<br/>
                {'>'} Target Node: <b className="text-[#00ff66]">{tenants.find(t=>t.kontingen_id===impersonateId)?.nama}</b>.<br/>
                {'>'} Proceed with caution.
              </p>
              <div className="flex gap-3 font-lcd tracking-widest text-xs">
                <button onClick={()=>setImpersonateId(null)}
                  className="flex-1 py-2 border text-slate-400 hover:text-white hover:bg-slate-800 transition-colors" style={{ borderColor:C.border }}>
                  ABORT
                </button>
                <Link href={`/konida/dashboard?impersonate=${impersonateId}`}
                  className="flex-1 py-2 text-center text-black font-bold bg-[#00f3ff] hover:bg-white transition-colors">
                  EXECUTE &gt;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}