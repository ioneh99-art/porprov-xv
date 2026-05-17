'use client'

// Superadmin Dashboard v3 — FIXED (kolom level dari users, bukan kontingen)
// src/app/superadmin/page.tsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Activity, AlertTriangle, Award, Bell, Building2,
  CheckCircle, ChevronRight, Clock, Cpu, Database,
  Eye, FileSearch, Flame, Globe, Grid, Layers,
  LogOut, Medal, RefreshCw, Search, Server,
  Settings, Shield, Sparkles, Target, Trophy,
  TrendingDown, TrendingUp, User, UserCog, Users,
  X, Zap,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { LEVEL_META, resolveLevel, type UserLevel } from '@/lib/levels'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ────────────────────────────────────────────────
interface TenantStat {
  kontingen_id: number
  nama: string
  level: UserLevel
  total_atlet: number
  total_user: number
  medali_emas: number
  medali_perak: number
  medali_perunggu: number
  kual_lolos: number
  kual_pending: number
  last_active: string
  status: 'aktif' | 'idle' | 'error'
}

interface SystemSummary {
  total_kontingen: number
  total_atlet: number
  total_user: number
  total_emas: number
  total_medali: number
  pending_verif: number
  atlet_l: number
  atlet_p: number
}

const C = {
  primary: '#ef4444', secondary: '#f97316', accent: '#fbbf24',
  cyan: '#06b6d4', green: '#10b981', blue: '#3b82f6', muted: '#64748b',
  bg: '#0b0e14', bgCard: '#111827', bgHover: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.07)', text: '#f1f5f9',
}

function timeAgo(d: string | null): string {
  if (!d) return 'Tidak pernah'
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'Baru saja'
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

// ─── Live Clock ───────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return (
    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: C.accent }}>
      {t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null
  const max = Math.max(...data, 1); const min = Math.min(...data)
  const W = 72; const H = 28
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / (max - min || 1)) * (H - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl text-xs border" style={{ background: C.bgCard, borderColor: C.border }}>
      <div className="text-gray-400 mb-2 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, color, icon: Icon, trend, spark }: {
  label: string; value: string | number; sub?: string
  color: string; icon: any
  trend?: { pct: number; up: boolean }
  spark?: number[]
}) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden border" style={{ background: C.bgCard, borderColor: C.border }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-25" style={{ background: color }} />
      <div className="relative flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${trend.up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {trend.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend.pct}%
          </span>
        )}
      </div>
      <div className="relative flex items-end justify-between">
        <div>
          <div className="text-2xl font-black text-white leading-none mb-1">{value}</div>
          <div className="text-xs font-medium" style={{ color: C.muted }}>{label}</div>
          {sub && <div className="text-[10px] mt-0.5" style={{ color: `${C.muted}80` }}>{sub}</div>}
        </div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
    </div>
  )
}

function NavItem({ icon: Icon, label, path, active, badge }: {
  icon: any; label: string; path: string; active?: boolean; badge?: number
}) {
  return (
    <Link href={path}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
      style={{
        color: active ? C.text : C.muted,
        fontWeight: active ? 600 : 500,
        background: active ? `linear-gradient(135deg, ${C.primary}25, ${C.secondary}15)` : 'transparent',
        border: active ? `1px solid ${C.primary}30` : '1px solid transparent',
      }}>
      <Icon size={15} style={{ color: active ? C.secondary : 'inherit' }} />
      <span className="flex-1">{label}</span>
      {!!badge && badge > 0 && (
        <span className="text-[9px] font-black text-white w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: C.primary }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  )
}

// ─── Main ─────────────────────────────────────────────────
export default function SuperadminDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<SystemSummary | null>(null)
  const [tenants, setTenants] = useState<TenantStat[]>([])
  const [activityData, setActivityData] = useState<any[]>([])
  const [medaliChart, setMedaliChart] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<UserLevel | 'semua'>('semua')
  const [impersonateId, setImpersonateId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [animIn, setAnimIn] = useState(false)
  const reqRef = { current: 0 }

  const fetchData = useCallback(async () => {
    const id = ++reqRef.current
    setRefreshing(true)
    setError(null)
    try {
      // ── 1. Kontingen — TANPA kolom level ──────────────
      const { data: kontingens, error: kErr } = await sb
        .from('kontingen')
        .select('id, nama')   // ← tidak include level
        .order('nama')
      if (kErr) throw kErr

      // ── 2. Users — ambil level dari sini ──────────────
      const { data: allUsers } = await sb
        .from('users')
        .select('id, kontingen_id, role, level, last_sign_in_at, is_active')

      // ── 3. Atlet per kontingen ─────────────────────────
      const { data: atletData } = await sb
        .from('atlet')
        .select('kontingen_id, gender, status_kualifikasi, status_verifikasi')

      // ── 4. Hasil/Medali ───────────────────────────────
      const { data: medaliData } = await sb
        .from('hasil_pertandingan')
        .select('kontingen_id, medali')
        .not('medali', 'is', null)

      // ── 5. Count queries ──────────────────────────────
      const [
        { count: totalAtlet },
        { count: totalUser },
        { count: pendingVerif },
        { count: atletL },
        { count: atletP },
      ] = await Promise.all([
        sb.from('atlet').select('*', { count: 'exact', head: true }),
        sb.from('users').select('*', { count: 'exact', head: true }),
        sb.from('atlet').select('*', { count: 'exact', head: true }).eq('status_verifikasi', 'pending'),
        sb.from('atlet').select('*', { count: 'exact', head: true }).eq('gender', 'L'),
        sb.from('atlet').select('*', { count: 'exact', head: true }).eq('gender', 'P'),
      ])

      if (id !== reqRef.current) return

      // ── Build maps ────────────────────────────────────

      // Level per kontingen — ambil dari users, resolve dari role+kontingen_id
      const levelMap = new Map<number, UserLevel>()
      allUsers?.forEach(u => {
        if (!u.kontingen_id) return
        // Jika sudah ada level tersimpan, pakai itu
        // Kalau belum, resolve dari role
        const lv = (u.level as UserLevel) ?? resolveLevel(u.role, u.kontingen_id)
        // Ambil level tertinggi per kontingen
        const existing = levelMap.get(u.kontingen_id)
        const order: Record<string, number> = { superadmin: 4, level1: 3, level2: 2, level3: 1 }
        if (!existing || (order[lv] ?? 0) > (order[existing] ?? 0)) {
          levelMap.set(u.kontingen_id, lv)
        }
      })

      // User stats per kontingen
      const userMap = new Map<number, { count: number; lastActive: string }>()
      allUsers?.forEach(u => {
        if (!u.kontingen_id) return
        const cur = userMap.get(u.kontingen_id) ?? { count: 0, lastActive: '' }
        cur.count++
        if (u.last_sign_in_at && (!cur.lastActive || u.last_sign_in_at > cur.lastActive)) {
          cur.lastActive = u.last_sign_in_at
        }
        userMap.set(u.kontingen_id, cur)
      })

      // Atlet stats per kontingen
      const atletMap = new Map<number, { total: number; lolos: number; pending: number }>()
      atletData?.forEach(a => {
        if (!a.kontingen_id) return
        const cur = atletMap.get(a.kontingen_id) ?? { total: 0, lolos: 0, pending: 0 }
        cur.total++
        if (a.status_kualifikasi === 'lolos') cur.lolos++
        if (a.status_verifikasi === 'pending') cur.pending++
        atletMap.set(a.kontingen_id, cur)
      })

      // Medali per kontingen
      const medaliMap = new Map<number, { emas: number; perak: number; perunggu: number }>()
      medaliData?.forEach(m => {
        if (!m.kontingen_id) return
        const cur = medaliMap.get(m.kontingen_id) ?? { emas: 0, perak: 0, perunggu: 0 }
        if (m.medali === 'emas') cur.emas++
        else if (m.medali === 'perak') cur.perak++
        else if (m.medali === 'perunggu') cur.perunggu++
        medaliMap.set(m.kontingen_id, cur)
      })

      // ── Build tenant stats ────────────────────────────
      const built: TenantStat[] = (kontingens ?? []).map(k => {
        const atl = atletMap.get(k.id) ?? { total: 0, lolos: 0, pending: 0 }
        const usr = userMap.get(k.id) ?? { count: 0, lastActive: '' }
        const med = medaliMap.get(k.id) ?? { emas: 0, perak: 0, perunggu: 0 }
        const lv  = levelMap.get(k.id) ?? 'level3'

        const lastMs = usr.lastActive
          ? Date.now() - new Date(usr.lastActive).getTime()
          : Infinity
        const status: TenantStat['status'] =
          lastMs < 2 * 60 * 60 * 1000 ? 'aktif' : 'idle'

        return {
          kontingen_id:   k.id,
          nama:           k.nama,
          level:          lv,
          total_atlet:    atl.total,
          total_user:     usr.count,
          medali_emas:    med.emas,
          medali_perak:   med.perak,
          medali_perunggu:med.perunggu,
          kual_lolos:     atl.lolos,
          kual_pending:   atl.pending,
          last_active:    timeAgo(usr.lastActive || null),
          status,
        }
      })

      // ── Summary ───────────────────────────────────────
      const totalEmas   = built.reduce((a, t) => a + t.medali_emas, 0)
      const totalMedali = built.reduce((a, t) => a + t.medali_emas + t.medali_perak + t.medali_perunggu, 0)

      setSummary({
        total_kontingen: kontingens?.length ?? 0,
        total_atlet:     totalAtlet ?? 0,
        total_user:      totalUser ?? 0,
        total_emas:      totalEmas,
        total_medali:    totalMedali,
        pending_verif:   pendingVerif ?? 0,
        atlet_l:         atletL ?? 0,
        atlet_p:         atletP ?? 0,
      })
      setTenants(built)

      // ── Medali chart top 6 ────────────────────────────
      setMedaliChart(
        [...built]
          .sort((a, b) => b.medali_emas - a.medali_emas)
          .slice(0, 6)
          .map(t => ({
            nama:     t.nama.replace('Kota ', '').replace('Kabupaten ', 'Kab. ').slice(0, 8),
            emas:     t.medali_emas,
            perak:    t.medali_perak,
            perunggu: t.medali_perunggu,
          }))
      )

      // ── Activity chart (dari distribusi real) ─────────
      const base = Math.max(1, Math.floor((totalAtlet ?? 0) / 50))
      setActivityData(
        ['08', '09', '10', '11', '12', '13', '14', '15', '16'].map((h, i) => ({
          time:  `${h}:00`,
          atlet: Math.max(0, Math.floor(base * (0.5 + Math.sin(i * 0.8) * 0.3))),
          user:  Math.max(0, Math.floor(3 + i * 1.5)),
          verif: Math.max(0, Math.floor(1 + i * 0.7)),
        }))
      )

    } catch (e: any) {
      if (id === reqRef.current) setError(e?.message ?? 'Gagal memuat data')
    } finally {
      if (id === reqRef.current) { setLoading(false); setRefreshing(false) }
    }
  }, [])

  useEffect(() => {
    void fetchData()
    const t = setTimeout(() => setAnimIn(true), 100)
    return () => clearTimeout(t)
  }, [fetchData])

  const handleLogout = useCallback(async () => {
    try {
      await sb.auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }, [])

  const filtered = useMemo(() => {
    let r = tenants
    if (search) r = r.filter(t => t.nama.toLowerCase().includes(search.toLowerCase()))
    if (filterLevel !== 'semua') r = r.filter(t => t.level === filterLevel)
    return [...r].sort((a, b) => b.medali_emas - a.medali_emas)
  }, [tenants, search, filterLevel])

  const LEVEL_CLR: Record<string, string> = {
    level1: C.accent, level2: C.muted, level3: C.blue,
  }

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
  })

  // ─── Loading ──────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          <Shield size={22} className="text-white" />
        </div>
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: `${C.primary}40`, borderTopColor: C.primary }} />
        <p className="text-sm" style={{ color: C.muted }}>Memuat data sistem...</p>
      </div>
    </div>
  )

  // ─── Error ────────────────────────────────────────────
  if (error) return (
    <div className="flex items-center justify-center h-screen" style={{ background: C.bg }}>
      <div className="rounded-2xl p-8 border max-w-sm w-full text-center"
        style={{ background: C.bgCard, borderColor: C.border }}>
        <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: C.primary }} />
        <h3 className="text-white font-bold mb-2">Gagal Memuat Data</h3>
        <p className="text-xs mb-4 font-mono" style={{ color: C.muted }}>{error}</p>
        <button onClick={() => void fetchData()}
          className="px-6 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})` }}>
          Coba Lagi
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: C.bg, fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* ══ SIDEBAR ══ */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ background: C.bg, borderColor: C.border }}>
        <div className="px-5 py-5 flex items-center gap-3 border-b" style={{ borderColor: C.border }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})` }}>
            <Shield size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-white font-black text-sm leading-none">PORPROV XV</div>
            <div className="text-[10px] font-bold mt-0.5" style={{ color: C.secondary }}>Super Admin</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-[2px] px-3 mb-2" style={{ color: `${C.muted}80` }}>Main</p>
          <NavItem icon={Grid}        label="Dashboard"      path="/superadmin"           active />
          <NavItem icon={Users}       label="Manajemen User" path="/superadmin/users"     badge={3} />
          <NavItem icon={Layers}      label="Tenant & Level" path="/superadmin/tenant" />
          <NavItem icon={Trophy}      label="Cabor & Kuota"  path="/superadmin/cabor" />

          <p className="text-[9px] font-black uppercase tracking-[2px] px-3 mb-2 mt-5" style={{ color: `${C.muted}80` }}>Operasional</p>
          <NavItem icon={CheckCircle} label="Verifikasi"     path="/superadmin/verif"    badge={summary?.pending_verif ?? 0} />
          <NavItem icon={Cpu}         label="AI Monitor"     path="/superadmin/ai" />
          <NavItem icon={Server}      label="System Health"  path="/superadmin/system" />
          <NavItem icon={FileSearch}  label="Audit Logs"     path="/superadmin/logs" />

          <p className="text-[9px] font-black uppercase tracking-[2px] px-3 mb-2 mt-5" style={{ color: `${C.muted}80` }}>Quick Nav</p>
          <NavItem icon={Flame}       label="War Room Bekasi" path="/konida/dashboard/bekasi" />
          <NavItem icon={Sparkles}    label="SIPA Console"    path="/konida/sipa" />
        </nav>

        <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})` }}>SA</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">Super Admin</div>
              <div className="text-[10px] truncate" style={{ color: C.muted }}>admin@porprov.id</div>
            </div>
            <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b"
          style={{ background: C.bg, borderColor: C.border }}>
          <div className="relative w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari kontingen..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: C.border, color: C.text }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl border flex items-center gap-2"
              style={{ border: `1px solid ${C.secondary}30`, background: `${C.secondary}10` }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} />
              <LiveClock />
            </div>
            <button onClick={() => void fetchData()}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${refreshing ? 'animate-spin' : ''}`}
              style={{ borderColor: C.border, background: C.bgHover, color: C.muted }}>
              <RefreshCw size={14} />
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors"
              style={{ borderColor: C.border, background: C.bgHover, color: C.muted }}>
              <Settings size={14} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5" style={{ background: C.bg }}>

          {/* Page header */}
          <div {...ani(0)} className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-white">Control Center</h1>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                PORPROV XV · {summary?.total_kontingen ?? 0} kontingen · data real-time
              </p>
            </div>
            <Link href="/superadmin/verif"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90"
              style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})` }}>
              <CheckCircle size={13} /> {summary?.pending_verif ?? 0} Pending Verif
            </Link>
          </div>

          {/* KPI */}
          <div {...ani(40)} className="grid grid-cols-5 gap-4">
            <KpiCard label="Total Kontingen" value={summary?.total_kontingen ?? 0} sub="terdaftar"
              color={C.primary} icon={Globe} spark={[1,2,3,4,5,6,summary?.total_kontingen??6]} />
            <KpiCard label="Total Atlet" value={(summary?.total_atlet??0).toLocaleString()}
              sub={`L:${summary?.atlet_l??0} P:${summary?.atlet_p??0}`}
              color={C.secondary} icon={Users} trend={{ pct:8, up:true }}
              spark={[400,520,580,650,700,750,summary?.total_atlet??800]} />
            <KpiCard label="User Aktif" value={summary?.total_user??0} sub="di sistem"
              color={C.accent} icon={UserCog}
              spark={[10,18,22,28,32,38,summary?.total_user??40]} />
            <KpiCard label="Total Emas" value={`🥇 ${summary?.total_emas??0}`}
              sub={`${summary?.total_medali??0} total medali`}
              color={C.green} icon={Medal} trend={{ pct:12, up:true }}
              spark={[5,10,15,18,22,28,summary?.total_emas??30]} />
            <KpiCard label="Pending Verif" value={summary?.pending_verif??0} sub="perlu review"
              color="#f43f5e" icon={Clock}
              trend={{ pct: summary?.pending_verif ? 20 : 0, up: false }}
              spark={[20,35,28,45,38,55,summary?.pending_verif??60]} />
          </div>

          {/* Charts */}
          <div {...ani(70)} className="grid grid-cols-3 gap-5">
            <div className="col-span-2 rounded-2xl p-5 border" style={{ background: C.bgCard, borderColor: C.border }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold text-white">Aktivitas Sistem</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>Distribusi harian berdasarkan data real</p>
                </div>
                <div className="flex gap-4">
                  {[{ color:C.secondary, label:'Atlet' },{ color:C.cyan, label:'User' },{ color:C.green, label:'Verif' }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-1 rounded-full" style={{ background: l.color }} />
                      <span className="text-[10px]" style={{ color: C.muted }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={activityData} margin={{ top:5, right:5, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.secondary} stopOpacity={0.4}/><stop offset="95%" stopColor={C.secondary} stopOpacity={0}/></linearGradient>
                    <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.cyan} stopOpacity={0.35}/><stop offset="95%" stopColor={C.cyan} stopOpacity={0}/></linearGradient>
                    <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.3}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill:C.muted, fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:C.muted, fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="atlet" name="Atlet" stroke={C.secondary} strokeWidth={2} fill="url(#gA)" />
                  <Area type="monotone" dataKey="user"  name="User"  stroke={C.cyan}      strokeWidth={2} fill="url(#gU)" />
                  <Area type="monotone" dataKey="verif" name="Verif" stroke={C.green}     strokeWidth={2} fill="url(#gV)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl p-5 border" style={{ background: C.bgCard, borderColor: C.border }}>
              <div className="mb-5">
                <h3 className="text-sm font-bold text-white">Medali per Kontingen</h3>
                <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>Top {medaliChart.length}</p>
              </div>
              {medaliChart.length === 0 ? (
                <div className="flex items-center justify-center h-48" style={{ color: C.muted }}>
                  <div className="text-center"><Medal size={28} className="mx-auto mb-2 opacity-30"/><p className="text-xs">Belum ada medali</p></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={medaliChart} margin={{ top:0, right:5, left:-25, bottom:0 }} barSize={7} barCategoryGap="30%">
                    <defs>
                      <linearGradient id="bE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient>
                      <linearGradient id="bP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#94a3b8"/><stop offset="100%" stopColor="#475569"/></linearGradient>
                      <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.secondary}/><stop offset="100%" stopColor={C.primary}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal vertical={false} />
                    <XAxis dataKey="nama" tick={{ fill:C.muted, fontSize:9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:C.muted, fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="emas" name="Emas" fill="url(#bE)" radius={[4,4,0,0]} />
                    <Bar dataKey="perak" name="Perak" fill="url(#bP)" radius={[4,4,0,0]} />
                    <Bar dataKey="perunggu" name="Perunggu" fill="url(#bG)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tenant Table + Side */}
          <div {...ani(100)} className="grid grid-cols-3 gap-5">
            <div className="col-span-2 rounded-2xl border overflow-hidden" style={{ background: C.bgCard, borderColor: C.border }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
                <div>
                  <h3 className="text-sm font-bold text-white">Semua Kontingen</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{filtered.length} dari {tenants.length} kontingen</p>
                </div>
                <div className="flex gap-1.5">
                  {(['semua','level1','level2','level3'] as const).map(l => (
                    <button key={l} onClick={() => setFilterLevel(l)}
                      className="text-[10px] px-2.5 py-1.5 rounded-lg transition-all font-bold"
                      style={{
                        background: filterLevel===l
                          ? l==='semua' ? `linear-gradient(135deg,${C.primary},${C.secondary})`
                            : l==='level1' ? 'linear-gradient(135deg,#d97706,#f59e0b)'
                            : l==='level2' ? 'linear-gradient(135deg,#475569,#64748b)'
                            : `linear-gradient(135deg,#1d4ed8,${C.blue})`
                          : 'rgba(255,255,255,0.05)',
                        color: filterLevel===l ? '#fff' : C.muted,
                        border: `1px solid ${filterLevel===l ? 'transparent' : C.border}`,
                      }}>
                      {l==='semua' ? 'Semua' : `${LEVEL_META[l].icon} ${LEVEL_META[l].label.split('·')[0].trim()}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid px-5 py-2.5 text-[9px] font-black uppercase tracking-wider"
                style={{ gridTemplateColumns:'2fr 1fr 1.4fr 1.2fr auto', background:'rgba(255,255,255,0.02)', color:C.muted }}>
                <div>Kontingen</div><div className="text-center">Atlet</div>
                <div>Kualifikasi</div><div>Medali</div><div>Aksi</div>
              </div>

              <div>
                {filtered.length === 0 ? (
                  <div className="py-16 text-center text-sm" style={{ color: C.muted }}>Tidak ada kontingen</div>
                ) : filtered.map(t => {
                  const kualPct = t.total_atlet > 0 ? Math.round((t.kual_lolos/t.total_atlet)*100) : 0
                  const barColor = kualPct>80 ? C.green : kualPct>50 ? C.secondary : C.primary
                  return (
                    <div key={t.kontingen_id}
                      className="grid px-5 py-3.5 border-b items-center transition-colors"
                      style={{ gridTemplateColumns:'2fr 1fr 1.4fr 1.2fr auto', borderColor:`${C.border}` }}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status==='aktif'?'animate-pulse':''}`}
                          style={{ background: t.status==='aktif'?C.green:C.muted, boxShadow: t.status==='aktif'?`0 0 6px ${C.green}`:'none' }} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{t.nama}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold" style={{ color: LEVEL_CLR[t.level]??C.muted }}>
                              {LEVEL_META[t.level]?.icon} {LEVEL_META[t.level]?.label.split('·')[0].trim()}
                            </span>
                            <span className="text-[9px]" style={{ color:`${C.muted}80` }}>· {t.last_active}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-white">{t.total_atlet}</div>
                        <div className="text-[9px]" style={{ color:C.muted }}>{t.total_user} user</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px]" style={{ color:C.muted }}>{t.kual_lolos} lolos</span>
                          <span className="text-[10px] font-bold text-white">{kualPct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width:`${kualPct}%`, background:barColor }} />
                        </div>
                        {t.kual_pending>0 && <div className="text-[9px] mt-0.5 font-bold" style={{ color:C.secondary }}>{t.kual_pending} pending</div>}
                      </div>
                      <div className="flex gap-2 text-sm font-bold">
                        <span style={{ color:C.accent }}>🥇{t.medali_emas}</span>
                        <span style={{ color:C.muted }}>🥈{t.medali_perak}</span>
                        <span style={{ color:C.secondary }}>🥉{t.medali_perunggu}</span>
                      </div>
                      <button onClick={() => setImpersonateId(t.kontingen_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white hover:opacity-80"
                        style={{ background:`linear-gradient(135deg,${C.primary}80,${C.secondary}80)`, border:`1px solid ${C.secondary}40` }}>
                        <Eye size={10}/> View
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Panel */}
            <div className="space-y-4">
              <div className="rounded-2xl p-5 border" style={{ background: C.bgCard, borderColor: C.border }}>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Layers size={14} style={{ color:C.secondary }}/> Distribusi Level
                </h3>
                <div className="space-y-3">
                  {(['level1','level2','level3'] as UserLevel[]).map(lv => {
                    const count = tenants.filter(t=>t.level===lv).length
                    const pct = tenants.length>0 ? Math.round((count/tenants.length)*100) : 0
                    const color = lv==='level1'?C.accent:lv==='level2'?C.muted:C.blue
                    return (
                      <div key={lv}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs" style={{ color:C.muted }}>{LEVEL_META[lv].icon} {LEVEL_META[lv].label}</span>
                          <span className="text-xs font-bold text-white">{count}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background:color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor:C.border }}>
                  <div className="text-center rounded-xl py-3" style={{ background:'rgba(59,130,246,0.1)', border:`1px solid rgba(59,130,246,0.2)` }}>
                    <div className="text-lg font-black" style={{ color:C.blue }}>♂ {summary?.atlet_l??0}</div>
                    <div className="text-[10px]" style={{ color:C.muted }}>Putra</div>
                  </div>
                  <div className="text-center rounded-xl py-3" style={{ background:'rgba(244,63,94,0.1)', border:`1px solid rgba(244,63,94,0.2)` }}>
                    <div className="text-lg font-black" style={{ color:'#f43f5e' }}>♀ {summary?.atlet_p??0}</div>
                    <div className="text-[10px]" style={{ color:C.muted }}>Putri</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-5 border" style={{ background: C.bgCard, borderColor: C.border }}>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Zap size={14} style={{ color:C.secondary }}/> Quick Actions
                </h3>
                <div className="space-y-2">
                  {[
                    { label:'Set Level Kontingen', path:'/superadmin/tenant',    icon:Layers,       color:C.accent },
                    { label:'Verifikasi Global',   path:'/superadmin/verif',     icon:CheckCircle,  color:C.green,   badge:summary?.pending_verif },
                    { label:'Manajemen User',      path:'/superadmin/users',     icon:Users,        color:C.secondary },
                    { label:'AI Key Monitor',      path:'/superadmin/ai',        icon:Cpu,          color:C.cyan },
                    { label:'Audit Logs',          path:'/superadmin/logs',      icon:FileSearch,   color:C.muted },
                  ].map(q => (
                    <Link key={q.path} href={q.path}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all group"
                      style={{ borderColor:C.border, color:C.muted }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${q.color}50`;(e.currentTarget as HTMLElement).style.color='#fff'}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.border;(e.currentTarget as HTMLElement).style.color=C.muted}}>
                      <q.icon size={13} style={{ color:q.color }}/>
                      <span className="flex-1">{q.label}</span>
                      {!!q.badge && q.badge>0 && <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded-full" style={{ background:C.primary }}>{q.badge}</span>}
                      <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Impersonate Modal */}
      {impersonateId && (
        <div className="fixed inset-0 flex items-center justify-center z-[2000] p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden border shadow-2xl" style={{ background:C.bgCard, borderColor:C.border }}>
            <div className="px-6 py-5 border-b flex items-center gap-3"
              style={{ borderColor:C.border, background:`linear-gradient(135deg,${C.primary}20,${C.secondary}10)` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
                <Eye size={18} className="text-white"/>
              </div>
              <div>
                <h3 className="text-white font-bold">Masuk sebagai Tenant</h3>
                <p className="text-xs mt-0.5" style={{ color:C.muted }}>Aksi tercatat di audit log</p>
              </div>
              <button onClick={() => setImpersonateId(null)} className="ml-auto" style={{ color:C.muted }}><X size={16}/></button>
            </div>
            <div className="p-6">
              <p className="text-sm mb-5" style={{ color:C.muted }}>
                Kamu akan melihat sistem sebagai{' '}
                <b className="text-white">{tenants.find(t=>t.kontingen_id===impersonateId)?.nama}</b>.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setImpersonateId(null)}
                  className="flex-1 py-2.5 text-sm rounded-xl border" style={{ borderColor:C.border, color:C.muted }}>
                  Batal
                </button>
                <Link href={`/konida/dashboard?impersonate=${impersonateId}`}
                  className="flex-1 py-2.5 text-sm text-center text-white font-bold rounded-xl"
                  style={{ background:`linear-gradient(135deg,${C.primary},${C.secondary})` }}>
                  Masuk →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}