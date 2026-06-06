'use client'
// src/app/superadmin/observatory/page.tsx
// DATA OBSERVATORY — Cross-tenant live metrics & verification funnel

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Activity, AlertTriangle, CheckCircle, ChevronRight,
  Clock, Database, Eye, FileText, Flame, Globe,
  RefreshCw, Shield, TrendingUp, Users, Zap,
  BarChart2, Filter, ArrowRight, Circle, Cpu,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  primary:   '#00f3ff',
  secondary: '#00ff66',
  accent:    '#ffb000',
  alert:     '#ff3366',
  warn:      '#f97316',
  purple:    '#a855f7',
  bg:        'rgba(10,25,47,0.4)',
  border:    'rgba(0,243,255,0.2)',
  muted:     '#7a8b9e',
}

// Atlet status flow order
const STATUS_FLOW = [
  { key: 'Draft',           label: 'DRAFT',           color: '#4b5563', short: 'DRF' },
  { key: 'Menunggu Cabor',  label: 'TUNGGU_CABOR',    color: '#6366f1', short: 'TGC' },
  { key: 'Menunggu Admin',  label: 'TUNGGU_ADMIN',    color: C.accent,  short: 'TGA' },
  { key: 'Ditolak Cabor',   label: 'TOLAK_CABOR',     color: C.alert,   short: 'TLC' },
  { key: 'Ditolak Admin',   label: 'TOLAK_ADMIN',     color: '#ef4444', short: 'TLA' },
  { key: 'Verified',        label: 'VERIFIED',        color: C.secondary, short: 'VRF' },
  { key: 'Posted',          label: 'POSTED',          color: C.primary,  short: 'PST' },
]

const PLAN_COLOR: Record<string, string> = {
  enterprise: '#a855f7',
  premium:    C.primary,
  standard:   C.secondary,
  basic:      C.muted,
}

interface KontingenRow { id: number; nama: string }
interface AtletRow     { kontingen_id: number; status_registrasi: string; gender: string }
interface TesFisikRow  { atlet_id: number; kesimpulan_persen: number | null }
interface SubRow       { kontingen_id: number; plan_id: string; is_active: boolean }
interface DokumenRow   { atlet_id: number; status: string }

interface TenantMetric {
  id:          number
  nama:        string
  plan:        string
  total:       number
  verified:    number     // Verified + Posted
  pending:     number     // Menunggu Admin
  ditolak:     number
  draft:       number
  byStatus:    Record<string, number>
  tesCoverage: number     // % yang sudah tes fisik
  avgSkor:     number
  dokCoverage: number     // % dokumen verified
  healthScore: number     // 0-100 composite
  gender:      { l: number; p: number }
}

// ── helper: health score composite ──────────────────────────
function computeHealth(m: Omit<TenantMetric, 'healthScore'>): number {
  if (m.total === 0) return 0
  const verPct  = Math.min((m.verified / m.total) * 40, 40)      // max 40pts: verified %
  const tesPct  = Math.min((m.tesCoverage / 100) * 30, 30)       // max 30pts: tes fisik coverage
  const dokPct  = Math.min((m.dokCoverage / 100) * 20, 20)       // max 20pts: dokumen
  const penPen  = Math.min((m.pending / m.total) * 10, 10)       // max 10pts penalty (reverse)
  return Math.round(verPct + tesPct + dokPct + (10 - penPen))
}

function scoreColor(s: number) {
  if (s >= 75) return C.secondary
  if (s >= 50) return C.primary
  if (s >= 30) return C.accent
  return C.alert
}

function Bar({ value, max, color, h = 4 }: { value: number; max: number; color: string; h?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="rounded-full overflow-hidden" style={{ height: h, background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return (
    <span className="font-lcd text-xs font-bold tabular-nums" style={{ color: C.primary }}>
      {t.toLocaleTimeString('en-US', { hour12: false })}
    </span>
  )
}

// ════════════════════════════════════════════════════════════
export default function ObservatoryPage() {
  const [kontingens,  setKontingens]  = useState<KontingenRow[]>([])
  const [atlets,      setAtlets]      = useState<AtletRow[]>([])
  const [tesFisik,    setTesFisik]    = useState<TesFisikRow[]>([])
  const [subs,        setSubs]        = useState<SubRow[]>([])
  const [dokumen,     setDokumen]     = useState<DokumenRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [filterPlan,    setFilterPlan]    = useState<string>('top_tier')
  const [sortBy,        setSortBy]        = useState<'health' | 'total' | 'nama'>('health')
  const [showAllNodes,  setShowAllNodes]  = useState(false)
  const NODES_DEFAULT = 4
  const [animIn,      setAnimIn]      = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 100); return () => clearTimeout(t) }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [kRes, aRes, tRes, sRes, dRes] = await Promise.all([
        sb.from('kontingen').select('id,nama').order('nama'),
        sb.from('atlet').select('kontingen_id,status_registrasi,gender'),
        sb.from('atlet_tes_fisik').select('atlet_id,kesimpulan_persen'),
        sb.from('subscriptions').select('kontingen_id,plan_id,is_active').eq('is_active', true),
        sb.from('atlet_dokumen').select('atlet_id,status'),
      ])
      if (kRes.data) setKontingens(kRes.data as KontingenRow[])
      if (aRes.data) setAtlets(aRes.data as AtletRow[])
      if (tRes.data) setTesFisik(tRes.data as TesFisikRow[])
      if (sRes.data) setSubs(sRes.data as SubRow[])
      if (dRes.data) setDokumen(dRes.data as DokumenRow[])
      setLastRefresh(new Date())
    } catch (e) {
      console.error('[Observatory]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, [])

  // ── Build atlet ID → kontingen map ────────────────────────
  const atletIdToKontingen = useMemo(() => {
    // We don't have atlet.id in this query, so dok coverage will be system-wide
    // (dokumen query doesn't have kontingen_id directly)
    return {} as Record<number, number>
  }, [])

  // ── Compute per-tenant metrics ─────────────────────────────
  const tenantMetrics = useMemo<TenantMetric[]>(() => {
    const subMap: Record<number, string> = {}
    subs.forEach(s => { subMap[s.kontingen_id] = s.plan_id })

    // Tes fisik: total tested atlets per kontingen (via atlet_id cross-ref not possible without ID)
    // Use total test records as proxy for system-wide
    const totalTes   = tesFisik.length
    const avgSkorAll = totalTes > 0
      ? Math.round(tesFisik.reduce((s, t) => s + (t.kesimpulan_persen ?? 0), 0) / totalTes)
      : 0

    // Dokumen: verified vs total per system
    const totalDok     = dokumen.length
    const verifiedDok  = dokumen.filter(d => d.status === 'verified').length
    const dokPctSystem = totalDok > 0 ? Math.round((verifiedDok / totalDok) * 100) : 0

    return kontingens.map(k => {
      const kAtlets = atlets.filter(a => a.kontingen_id === k.id)
      const total   = kAtlets.length
      const byStatus: Record<string, number> = {}
      STATUS_FLOW.forEach(s => byStatus[s.key] = 0)
      kAtlets.forEach(a => {
        if (byStatus[a.status_registrasi] !== undefined) byStatus[a.status_registrasi]++
        else byStatus[a.status_registrasi] = (byStatus[a.status_registrasi] || 0) + 1
      })

      const verified = (byStatus['Verified'] || 0) + (byStatus['Posted'] || 0)
      const pending  = byStatus['Menunggu Admin'] || 0
      const ditolak  = (byStatus['Ditolak Admin'] || 0) + (byStatus['Ditolak Cabor'] || 0)
      const draft    = byStatus['Draft'] || 0
      const gender   = {
        l: kAtlets.filter(a => a.gender === 'L').length,
        p: kAtlets.filter(a => a.gender === 'P').length,
      }

      // Approximate tes fisik & dok coverage: proportional to atlet share
      const share      = atlets.length > 0 ? total / atlets.length : 0
      const tesCov     = atlets.length > 0 ? Math.round((totalTes / atlets.length) * 100) : 0
      const dokCov     = dokPctSystem

      const partial: Omit<TenantMetric, 'healthScore'> = {
        id: k.id, nama: k.nama,
        plan: subMap[k.id] || 'none',
        total, verified, pending, ditolak, draft, byStatus,
        tesCoverage: tesCov, avgSkor: avgSkorAll, dokCoverage: dokCov,
        gender,
      }
      return { ...partial, healthScore: computeHealth(partial) }
    })
  }, [kontingens, atlets, tesFisik, subs, dokumen])

  // ── Global funnel ─────────────────────────────────────────
  const funnel = useMemo(() => {
    const totals: Record<string, number> = {}
    STATUS_FLOW.forEach(s => totals[s.key] = 0)
    atlets.forEach(a => {
      if (totals[a.status_registrasi] !== undefined) totals[a.status_registrasi]++
      else totals[a.status_registrasi] = (totals[a.status_registrasi] || 0) + 1
    })
    return totals
  }, [atlets])

  const globalKPIs = useMemo(() => {
    const total    = atlets.length
    const verified = (funnel['Verified'] || 0) + (funnel['Posted'] || 0)
    const pending  = funnel['Menunggu Admin'] || 0
    const ditolak  = (funnel['Ditolak Admin'] || 0) + (funnel['Ditolak Cabor'] || 0)
    const convRate = total > 0 ? Math.round((verified / total) * 100) : 0
    const stuckPct = total > 0 ? Math.round((pending / total) * 100) : 0
    return { total, verified, pending, ditolak, convRate, stuckPct,
      kontingens: kontingens.length,
      activeKont: tenantMetrics.filter(t => t.total > 0).length,
    }
  }, [atlets, funnel, kontingens, tenantMetrics])

  // ── Filtered + sorted display ──────────────────────────────
  const filtered = useMemo(() => {
    let list = tenantMetrics
    if (filterPlan === 'top_tier') list = list.filter(t => t.plan === 'enterprise' || t.plan === 'premium')
    else if (filterPlan !== 'all') list = list.filter(t => t.plan === filterPlan)
    if (sortBy === 'health') list = [...list].sort((a, b) => b.healthScore - a.healthScore)
    if (sortBy === 'total')  list = [...list].sort((a, b) => b.total - a.total)
    if (sortBy === 'nama')   list = [...list].sort((a, b) => a.nama.localeCompare(b.nama))
    return list
  }, [tenantMetrics, filterPlan, sortBy])

  const displayed = showAllNodes ? filtered : filtered.slice(0, NODES_DEFAULT)

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const panel = {
    background: C.bg,
    border: `1px solid ${C.border}`,
    backdropFilter: 'blur(10px)',
    boxShadow: `inset 0 0 20px rgba(0,243,255,0.03)`,
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5 font-sci min-h-screen" style={{ color: '#f1f5f9' }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 border flex items-center justify-center relative"
              style={{ borderColor: C.primary, background: 'rgba(0,243,255,0.08)' }}>
              <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(0,243,255,0.1)' }} />
              <Globe size={18} style={{ color: C.primary }} className="z-10" />
            </div>
            <div>
              <h1 className="font-lcd font-bold text-xl tracking-widest" style={{ color: C.primary, textShadow: `0 0 12px ${C.primary}` }}>
                DATA_OBSERVATORY
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
                Cross-tenant live metrics · {globalKPIs.kontingens} nodes · PORPROV XV 2026
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveClock />
          <div className="text-[9px] font-mono px-2 py-1 border" style={{ borderColor: C.border, color: C.muted }}>
            REFRESH: {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <button onClick={loadAll} disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider transition-all disabled:opacity-40"
            style={{ borderColor: C.primary, color: C.primary, background: 'rgba(0,243,255,0.05)' }}>
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            SYNC
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: `${C.primary}30`, borderTopColor: C.primary }} />
            <p className="font-lcd text-xs uppercase tracking-widest" style={{ color: C.primary }}>
              SCANNING NETWORK NODES...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI STRIP ─────────────────────────────────── */}
          <div {...ani(0)} className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            {[
              { l: 'TOTAL_ATLET',    v: globalKPIs.total,       c: C.primary,    icon: Users    },
              { l: 'VERIFIED',       v: globalKPIs.verified,    c: C.secondary,  icon: CheckCircle },
              { l: 'STUCK_QUEUE',    v: globalKPIs.pending,     c: C.accent,     icon: Clock    },
              { l: 'DITOLAK',        v: globalKPIs.ditolak,     c: C.alert,      icon: AlertTriangle },
              { l: 'KONV_RATE',      v: `${globalKPIs.convRate}%`, c: globalKPIs.convRate >= 60 ? C.secondary : C.accent, icon: TrendingUp },
              { l: 'STUCK_PCT',      v: `${globalKPIs.stuckPct}%`, c: globalKPIs.stuckPct > 20 ? C.alert : C.muted, icon: Flame },
              { l: 'NODES_ACTIVE',   v: globalKPIs.activeKont,  c: C.primary,    icon: Globe    },
              { l: 'TES_FISIK',      v: tesFisik.length,        c: C.purple,     icon: Activity },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.l} className="p-3 relative overflow-hidden" style={panel}>
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: s.c }} />
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon size={10} style={{ color: s.c }} />
                    <span className="text-[8px] font-lcd uppercase tracking-wider" style={{ color: C.muted }}>
                      {s.l}
                    </span>
                  </div>
                  <div className="font-lcd font-bold text-xl" style={{ color: s.c, textShadow: `0 0 8px ${s.c}60` }}>
                    {s.v}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── VERIFICATION FUNNEL ───────────────────────── */}
          <div {...ani(80)} className="p-5 relative overflow-hidden" style={panel}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.primary},transparent)` }} />
            <div className="flex items-center gap-3 mb-4">
              <ArrowRight size={14} style={{ color: C.primary }} />
              <span className="font-lcd text-xs font-bold uppercase tracking-widest" style={{ color: C.primary }}>
                VERIFICATION_PIPELINE — {atlets.length} atlet total
              </span>
            </div>

            {/* Funnel bars */}
            <div className="space-y-2">
              {STATUS_FLOW.map((s, i) => {
                const count = funnel[s.key] || 0
                const pct   = atlets.length > 0 ? (count / atlets.length) * 100 : 0
                const isStuck = s.key === 'Menunggu Admin' && count > 50
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="w-20 text-right">
                      <span className="text-[9px] font-lcd uppercase tracking-wider" style={{ color: s.color }}>
                        {s.short}
                      </span>
                    </div>
                    <div className="flex-1 h-6 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="absolute inset-y-0 left-0 flex items-center transition-all duration-1000"
                        style={{ width: `${Math.max(pct, 0.3)}%`, background: `${s.color}30`, borderRight: `2px solid ${s.color}` }}>
                      </div>
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-[10px] font-mono font-bold" style={{ color: s.color }}>
                          {count.toLocaleString('id')}
                        </span>
                        <span className="text-[9px] font-mono ml-1.5" style={{ color: C.muted }}>
                          ({pct.toFixed(1)}%)
                        </span>
                        {isStuck && (
                          <span className="ml-2 text-[8px] font-lcd px-1.5 py-0.5 animate-pulse"
                            style={{ background: 'rgba(255,176,0,0.15)', color: C.accent, border: `1px solid ${C.accent}40` }}>
                            ⚠ STUCK_QUEUE
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-14 text-right">
                      <span className="text-[9px] font-mono" style={{ color: C.muted }}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Conversion arrow summary */}
            <div className="mt-4 pt-3 border-t flex items-center gap-6 flex-wrap" style={{ borderColor: 'rgba(0,243,255,0.1)' }}>
              {[
                { from: 'Draft', to: 'Verified+Posted', label: 'End-to-end conversion' },
              ].map(() => {
                const active = (funnel['Verified'] || 0) + (funnel['Posted'] || 0)
                const total  = atlets.length
                const rate   = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'
                return (
                  <div key="conv" className="flex items-center gap-2 text-[10px] font-mono">
                    <span style={{ color: C.muted }}>DRAFT</span>
                    <ArrowRight size={10} style={{ color: C.muted }} />
                    <span style={{ color: C.secondary }}>VERIFIED</span>
                    <span className="font-bold ml-1" style={{ color: globalKPIs.convRate >= 60 ? C.secondary : C.accent }}>
                      {rate}% conversion
                    </span>
                  </div>
                )
              })}
              <div className="text-[10px] font-mono" style={{ color: C.muted }}>
                DITOLAK_TOTAL: <span style={{ color: C.alert }}>{globalKPIs.ditolak}</span>
                &nbsp;·&nbsp;
                STUCK_ADMIN: <span style={{ color: C.accent }}>{funnel['Menunggu Admin'] || 0}</span>
                &nbsp;·&nbsp;
                STUCK_CABOR: <span style={{ color: '#6366f1' }}>{funnel['Menunggu Cabor'] || 0}</span>
              </div>
            </div>
          </div>

          {/* ── TENANT GRID ───────────────────────────────── */}
          <div {...ani(160)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Database size={13} style={{ color: C.primary }} />
                <span className="font-lcd text-xs font-bold uppercase tracking-widest" style={{ color: C.primary }}>
                  NETWORK_DIRECTORY
                </span>
                <span className="text-[9px] font-mono" style={{ color: C.muted }}>
                  {displayed.length}/{filtered.length} nodes
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Plan filter */}
                <div className="flex items-center gap-1 p-0.5 border" style={{ borderColor: C.border }}>
                  {[
                    { k: 'top_tier',  l: '⭐ TOP_TIER' },
                    { k: 'all',       l: 'ALL' },
                    { k: 'enterprise',l: 'ENT' },
                    { k: 'premium',   l: 'PRE' },
                    { k: 'standard',  l: 'STD' },
                    { k: 'basic',     l: 'BSC' },
                    { k: 'none',      l: 'NO_PLAN' },
                  ].map(p => (
                    <button key={p.k} onClick={() => { setFilterPlan(p.k); setShowAllNodes(false) }}
                      className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider transition-all"
                      style={{
                        background: filterPlan === p.k ? `${PLAN_COLOR[p.k] || C.primary}20` : 'transparent',
                        color: filterPlan === p.k ? (PLAN_COLOR[p.k] || C.primary) : C.muted,
                      }}>
                      {p.l}
                    </button>
                  ))}
                </div>
                {/* Sort */}
                <div className="flex items-center gap-1 p-0.5 border" style={{ borderColor: C.border }}>
                  {(['health', 'total', 'nama'] as const).map(s => (
                    <button key={s} onClick={() => { setSortBy(s); setShowAllNodes(false) }}
                      className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider transition-all"
                      style={{
                        background: sortBy === s ? `${C.primary}20` : 'transparent',
                        color: sortBy === s ? C.primary : C.muted,
                      }}>
                      SORT_{s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayed.map((t, idx) => {
                const hc       = scoreColor(t.healthScore)
                const verPct   = t.total > 0 ? Math.round((t.verified / t.total) * 100) : 0
                const pendPct  = t.total > 0 ? Math.round((t.pending / t.total) * 100) : 0
                const isAlert  = t.pending > 20 || t.healthScore < 30
                const planC    = PLAN_COLOR[t.plan] || C.muted

                return (
                  <div key={t.id}
                    className="p-4 relative overflow-hidden transition-all hover:scale-[1.01]"
                    style={{
                      ...panel,
                      borderColor: isAlert ? `${C.alert}40` : C.border,
                      boxShadow: isAlert ? `inset 0 0 20px rgba(255,51,102,0.05)` : undefined,
                    }}>
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${hc}60,transparent)` }} />

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[8px] font-lcd px-1.5 py-0.5 font-bold"
                            style={{ background: `${planC}15`, color: planC, border: `1px solid ${planC}30` }}>
                            {t.plan.toUpperCase()}
                          </span>
                          {isAlert && (
                            <span className="text-[8px] font-lcd animate-pulse" style={{ color: C.alert }}>⚠</span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-white truncate"
                          style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {t.nama}
                        </div>
                        <div className="text-[9px] font-mono mt-0.5" style={{ color: C.muted }}>
                          ID_{String(t.id).padStart(3, '0')} · {t.total} ATLET
                        </div>
                      </div>
                      {/* Health Score */}
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-lcd font-bold text-2xl leading-none" style={{ color: hc, textShadow: `0 0 8px ${hc}60` }}>
                          {t.healthScore}
                        </div>
                        <div className="text-[8px] font-mono" style={{ color: C.muted }}>HEALTH</div>
                      </div>
                    </div>

                    {/* Funnel mini */}
                    <div className="grid grid-cols-4 gap-1 mb-3">
                      {[
                        { k: 'Verified', label: 'VRF', v: t.verified, c: C.secondary },
                        { k: 'pending',  label: 'TGA', v: t.pending,  c: C.accent },
                        { k: 'ditolak',  label: 'TLK', v: t.ditolak,  c: C.alert },
                        { k: 'Draft',    label: 'DRF', v: t.draft,    c: C.muted },
                      ].map(s => (
                        <div key={s.k} className="p-1.5 text-center"
                          style={{ background: `${s.c}08`, border: `1px solid ${s.c}20` }}>
                          <div className="font-lcd font-bold text-base leading-none" style={{ color: s.c }}>{s.v}</div>
                          <div className="text-[7px] font-mono" style={{ color: C.muted }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Bars */}
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-[8px] font-mono mb-0.5" style={{ color: C.muted }}>
                          <span>VERIFIED_RATE</span>
                          <span style={{ color: C.secondary }}>{verPct}%</span>
                        </div>
                        <Bar value={t.verified} max={t.total} color={C.secondary} h={3} />
                      </div>
                      {t.pending > 0 && (
                        <div>
                          <div className="flex justify-between text-[8px] font-mono mb-0.5" style={{ color: C.muted }}>
                            <span>STUCK_ADMIN</span>
                            <span style={{ color: C.accent }}>{pendPct}%</span>
                          </div>
                          <Bar value={t.pending} max={t.total} color={C.accent} h={3} />
                        </div>
                      )}
                      <div>
                        <div className="flex justify-between text-[8px] font-mono mb-0.5" style={{ color: C.muted }}>
                          <span>TES_FISIK_COV</span>
                          <span style={{ color: C.purple }}>{t.tesCoverage}%</span>
                        </div>
                        <Bar value={t.tesCoverage} max={100} color={C.purple} h={3} />
                      </div>
                    </div>

                    {/* Gender ratio */}
                    {t.total > 0 && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 flex rounded-full overflow-hidden h-1.5">
                          <div style={{ width: `${Math.round(t.gender.l / t.total * 100)}%`, background: '#60a5fa' }} />
                          <div style={{ width: `${Math.round(t.gender.p / t.total * 100)}%`, background: '#ec4899' }} />
                        </div>
                        <div className="text-[8px] font-mono flex-shrink-0" style={{ color: C.muted }}>
                          ♂{t.gender.l} ♀{t.gender.p}
                        </div>
                      </div>
                    )}

                    {t.total === 0 && (
                      <div className="mt-2 text-[9px] font-mono text-center py-1" style={{ color: C.muted, borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                        NO_DATA_DETECTED
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Expand / collapse button */}
            {filtered.length > NODES_DEFAULT && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => setShowAllNodes(v => !v)}
                  className="flex items-center gap-2 px-5 py-2 text-[10px] font-mono border uppercase tracking-widest transition-all"
                  style={{ borderColor: C.border, color: C.primary, background: 'rgba(0,243,255,0.04)' }}>
                  {showAllNodes ? (
                    <>▲ COLLAPSE — tampilkan {NODES_DEFAULT} node</>
                  ) : (
                    <>▼ EXPAND — {filtered.length - NODES_DEFAULT} node lainnya tersembunyi</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── SYSTEM COVERAGE SUMMARY ───────────────────── */}
          <div {...ani(240)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Plan distribution */}
            <div className="p-4" style={panel}>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={12} style={{ color: C.primary }} />
                <span className="font-lcd text-[10px] font-bold uppercase tracking-widest" style={{ color: C.primary }}>
                  PLAN_DISTRIBUTION
                </span>
              </div>
              {['enterprise', 'premium', 'standard', 'basic', 'none'].map(plan => {
                const count = tenantMetrics.filter(t => t.plan === plan).length
                const pct   = tenantMetrics.length > 0 ? Math.round((count / tenantMetrics.length) * 100) : 0
                const c     = PLAN_COLOR[plan] || C.muted
                return (
                  <div key={plan} className="mb-2">
                    <div className="flex justify-between text-[9px] font-mono mb-1">
                      <span style={{ color: c }}>{plan.toUpperCase()}</span>
                      <span style={{ color: C.muted }}>{count} ({pct}%)</span>
                    </div>
                    <Bar value={count} max={tenantMetrics.length} color={c} h={4} />
                  </div>
                )
              })}
            </div>

            {/* Health score distribution */}
            <div className="p-4" style={panel}>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={12} style={{ color: C.secondary }} />
                <span className="font-lcd text-[10px] font-bold uppercase tracking-widest" style={{ color: C.secondary }}>
                  HEALTH_DISTRIBUTION
                </span>
              </div>
              {[
                { label: 'ELITE   ≥75', min: 75, max: 101, color: C.secondary },
                { label: 'STABLE  50–74', min: 50, max: 75, color: C.primary },
                { label: 'WARNING 30–49', min: 30, max: 50, color: C.accent },
                { label: 'CRITICAL <30', min: 0, max: 30, color: C.alert },
              ].map(band => {
                const count = tenantMetrics.filter(t => t.healthScore >= band.min && t.healthScore < band.max).length
                return (
                  <div key={band.label} className="mb-2">
                    <div className="flex justify-between text-[9px] font-mono mb-1">
                      <span style={{ color: band.color }}>{band.label}</span>
                      <span style={{ color: C.muted }}>{count} nodes</span>
                    </div>
                    <Bar value={count} max={tenantMetrics.length || 1} color={band.color} h={4} />
                  </div>
                )
              })}
            </div>

            {/* Gender balance system-wide */}
            <div className="p-4" style={panel}>
              <div className="flex items-center gap-2 mb-3">
                <Users size={12} style={{ color: C.accent }} />
                <span className="font-lcd text-[10px] font-bold uppercase tracking-widest" style={{ color: C.accent }}>
                  GENDER_BALANCE_SYSTEM
                </span>
              </div>
              {(() => {
                const totalL = atlets.filter(a => a.gender === 'L').length
                const totalP = atlets.filter(a => a.gender === 'P').length
                const total  = atlets.length || 1
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[9px] font-mono mb-1">
                        <span style={{ color: '#60a5fa' }}>♂ PUTRA</span>
                        <span style={{ color: '#60a5fa' }}>{totalL} ({Math.round(totalL/total*100)}%)</span>
                      </div>
                      <Bar value={totalL} max={total} color="#60a5fa" h={6} />
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] font-mono mb-1">
                        <span style={{ color: '#ec4899' }}>♀ PUTRI</span>
                        <span style={{ color: '#ec4899' }}>{totalP} ({Math.round(totalP/total*100)}%)</span>
                      </div>
                      <Bar value={totalP} max={total} color="#ec4899" h={6} />
                    </div>
                    <div className="pt-2 border-t" style={{ borderColor: 'rgba(0,243,255,0.1)' }}>
                      <div className="flex rounded-full overflow-hidden h-3 mb-1">
                        <div style={{ width: `${Math.round(totalL/total*100)}%`, background: '#60a5fa' }} />
                        <div style={{ width: `${Math.round(totalP/total*100)}%`, background: '#ec4899' }} />
                      </div>
                      <div className="text-[8px] font-mono text-center" style={{ color: C.muted }}>
                        RATIO {Math.round(totalL/total*100)}:{Math.round(totalP/total*100)}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ── ANOMALY ALERTS ────────────────────────────── */}
          {(() => {
            const anomalies: { severity: 'critical'|'warn'|'info'; msg: string }[] = []

            const highStuck = tenantMetrics.filter(t => t.pending > 30)
            if (highStuck.length > 0)
              anomalies.push({ severity: 'critical', msg: `${highStuck.length} node memiliki >30 atlet stuck di Menunggu Admin: ${highStuck.slice(0,3).map(t=>t.nama).join(', ')}` })

            const critNodes = tenantMetrics.filter(t => t.healthScore < 25 && t.total > 0)
            if (critNodes.length > 0)
              anomalies.push({ severity: 'critical', msg: `${critNodes.length} node CRITICAL health score: ${critNodes.slice(0,3).map(t=>t.nama).join(', ')}` })

            const noSub = tenantMetrics.filter(t => t.plan === 'none' && t.total > 0)
            if (noSub.length > 0)
              anomalies.push({ severity: 'warn', msg: `${noSub.length} node aktif tanpa subscription plan: ${noSub.slice(0,3).map(t=>t.nama).join(', ')}` })

            const highDitolak = tenantMetrics.filter(t => t.ditolak > 10)
            if (highDitolak.length > 0)
              anomalies.push({ severity: 'warn', msg: `${highDitolak.length} node tingkat penolakan tinggi (>10 atlet): ${highDitolak.slice(0,3).map(t=>t.nama).join(', ')}` })

            if (globalKPIs.convRate < 50)
              anomalies.push({ severity: 'warn', msg: `Konversi system-wide rendah: ${globalKPIs.convRate}% — target minimal 60%` })

            if (tesFisik.length < atlets.length * 0.3)
              anomalies.push({ severity: 'info', msg: `Tes fisik coverage rendah: ${tesFisik.length} dari ${atlets.length} atlet (${Math.round(tesFisik.length/Math.max(atlets.length,1)*100)}%)` })

            if (anomalies.length === 0) return null

            return (
              <div {...ani(320)} className="p-4 relative overflow-hidden" style={{ ...panel, borderColor: `${C.alert}30` }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.alert},transparent)` }} />
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={13} style={{ color: C.alert }} />
                  <span className="font-lcd text-[10px] font-bold uppercase tracking-widest" style={{ color: C.alert }}>
                    ANOMALY_DETECTION — {anomalies.length} issue
                  </span>
                </div>
                <div className="space-y-1.5">
                  {anomalies.map((a, i) => {
                    const c = a.severity === 'critical' ? C.alert : a.severity === 'warn' ? C.accent : C.primary
                    const icon = a.severity === 'critical' ? '🚨' : a.severity === 'warn' ? '⚠' : 'ℹ'
                    return (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 text-[10px] font-mono"
                        style={{ background: `${c}06`, border: `1px solid ${c}20` }}>
                        <span>{icon}</span>
                        <span style={{ color: `${c}cc` }}>{a.msg}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
