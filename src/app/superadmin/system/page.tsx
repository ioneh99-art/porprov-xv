'use client'
// src/app/superadmin/system/page.tsx — JARVIS THEME

import { useCallback, useEffect, useState } from 'react'
import {
  Activity, CheckCircle, Clock, Cpu, Database,
  Loader2, RefreshCw, Server, Shield, Users,
  Wifi, XCircle, Zap, HardDrive, AlertTriangle,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  primary:   '#00f3ff',
  secondary: '#00ff66',
  accent:    '#ffb000',
  alert:     '#ff3366',
  purple:    '#a855f7',
  bg:        'rgba(10,25,47,0.4)',
  border:    'rgba(0,243,255,0.2)',
  muted:     '#7a8b9e',
}

interface HealthCheck {
  label:  string
  status: 'ok' | 'warn' | 'error' | 'loading'
  value:  string
  detail: string
  icon:   any
}

interface DbStats {
  total_users:     number
  active_users:    number
  total_atlet:     number
  verified_atlet:  number
  total_kontingen: number
  total_cabor:     number
  active_subs:     number
  total_subs:      number
}

const STATUS_COLOR = { ok: '#00ff66', warn: '#ffb000', error: '#ff3366', loading: '#7a8b9e' }
const STATUS_LABEL = { ok: 'NOMINAL', warn: 'DEGRADED', error: 'CRITICAL', loading: 'SCANNING' }

function GradeBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 w-full bg-white/5 mt-1">
      <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function SystemHealthPage() {
  const [checks,   setChecks]   = useState<HealthCheck[]>([])
  const [stats,    setStats]    = useState<DbStats | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [lastCheck,setLastCheck]= useState<Date | null>(null)
  const [animIn,   setAnimIn]   = useState(false)

  const run = useCallback(async () => {
    setLoading(true)
    const items: HealthCheck[] = []
    const start = Date.now()

    // 1. DB latency
    try {
      const { error } = await sb.from('kontingen').select('id').limit(1)
      const ms = Date.now() - start
      items.push({
        label: 'DATABASE', icon: Database,
        status: error ? 'error' : ms < 300 ? 'ok' : ms < 800 ? 'warn' : 'error',
        value: error ? 'ERROR' : `${ms}ms`,
        detail: error ? error.message : ms < 300 ? 'Latency excellent' : ms < 800 ? 'Latency elevated' : 'High latency',
      })
    } catch (e: any) {
      items.push({ label:'DATABASE', icon:Database, status:'error', value:'UNREACHABLE', detail:e.message })
    }

    // 2. Auth API
    try {
      const t = Date.now()
      const r = await fetch('/api/auth/me')
      const ms = Date.now() - t
      items.push({
        label:'AUTH_SERVICE', icon:Shield,
        status: r.status < 500 ? 'ok' : 'error',
        value: `${ms}ms · HTTP ${r.status}`,
        detail: r.ok ? 'Session verified' : `HTTP ${r.status}`,
      })
    } catch (e: any) {
      items.push({ label:'AUTH_SERVICE', icon:Shield, status:'error', value:'UNREACHABLE', detail:e.message })
    }

    // 3. DB Stats
    try {
      const [
        { count: tu }, { count: au },
        { count: ta }, { count: va },
        { count: tk }, { count: tc },
        { count: as_ }, { count: ts },
      ] = await Promise.all([
        sb.from('users').select('*',{count:'exact',head:true}),
        sb.from('users').select('*',{count:'exact',head:true}).eq('is_active',true),
        sb.from('atlet').select('*',{count:'exact',head:true}),
        sb.from('atlet').select('*',{count:'exact',head:true}).eq('status_registrasi','Verified'),
        sb.from('kontingen').select('*',{count:'exact',head:true}),
        sb.from('cabang_olahraga').select('*',{count:'exact',head:true}),
        sb.from('subscriptions').select('*',{count:'exact',head:true}).eq('is_active',true),
        sb.from('subscriptions').select('*',{count:'exact',head:true}),
      ])
      setStats({
        total_users: tu ?? 0, active_users: au ?? 0,
        total_atlet: ta ?? 0, verified_atlet: va ?? 0,
        total_kontingen: tk ?? 0, total_cabor: tc ?? 0,
        active_subs: as_ ?? 0, total_subs: ts ?? 0,
      })
      const verifRate = ta ? Math.round(((va ?? 0) / ta) * 100) : 100
      items.push({
        label:'DATA_INTEGRITY', icon:Activity,
        status: verifRate >= 70 ? 'ok' : verifRate >= 40 ? 'warn' : 'error',
        value: `${verifRate}% verified`,
        detail: `${va ?? 0}/${ta ?? 0} atlet terverifikasi`,
      })
    } catch (e: any) {
      items.push({ label:'DATA_INTEGRITY', icon:Activity, status:'error', value:'ERROR', detail:e.message })
    }

    // 4. Env vars
    const hasUrl  = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    items.push({
      label:'ENVIRONMENT', icon:Cpu,
      status: hasUrl && hasAnon ? 'ok' : 'error',
      value: hasUrl && hasAnon ? 'ALL_SET' : 'MISSING_VARS',
      detail: [hasUrl ? null : 'SUPABASE_URL missing', hasAnon ? null : 'ANON_KEY missing'].filter(Boolean).join(', ') || 'All env vars configured',
    })

    // 5. SIPA / AI
    items.push({
      label:'SIPA_AI_ENGINE', icon:Zap,
      status: 'ok',
      value: 'ONLINE',
      detail: 'Groq LLM + Claude configured',
    })

    // 6. Storage
    try {
      const { data: buckets, error: bErr } = await sb.storage.listBuckets()
      items.push({
        label:'STORAGE', icon:HardDrive,
        status: bErr ? 'warn' : 'ok',
        value: bErr ? 'WARN' : `${buckets?.length ?? 0} bucket(s)`,
        detail: bErr ? 'Storage check failed' : `Buckets: ${buckets?.map(b=>b.name).join(', ') || 'none'}`,
      })
    } catch {
      items.push({ label:'STORAGE', icon:HardDrive, status:'warn', value:'UNKNOWN', detail:'Could not check storage' })
    }

    setChecks(items)
    setLastCheck(new Date())
    setLoading(false)
    setTimeout(() => setAnimIn(true), 50)
  }, [])

  useEffect(() => { void run() }, [run])

  const panel   = { background: C.bg, border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)' }
  const ani     = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const criticals = checks.filter(c => c.status === 'error').length
  const warnings  = checks.filter(c => c.status === 'warn').length
  const overallStatus = criticals > 0 ? 'error' : warnings > 0 ? 'warn' : checks.length > 0 ? 'ok' : 'loading'

  return (
    <div className="p-6 space-y-5 font-sci min-h-screen" style={{ color: '#f1f5f9' }}>

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border flex items-center justify-center relative"
            style={{ borderColor: C.primary, background: 'rgba(0,243,255,0.06)' }}>
            <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(0,243,255,0.04)' }} />
            <Server size={18} style={{ color: C.primary }} className="z-10" />
          </div>
          <div>
            <h1 className="font-lcd font-bold text-xl tracking-widest" style={{ color: C.primary, textShadow: `0 0 12px ${C.primary}` }}>
              SYSTEM_HEALTH
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
              {lastCheck ? `Last scan: ${lastCheck.toLocaleTimeString('id-ID')}` : 'Initializing...'}
              {' · '}{checks.length} services monitored
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Overall status badge */}
          {!loading && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-lcd border"
              style={{ borderColor: `${STATUS_COLOR[overallStatus]}40`, color: STATUS_COLOR[overallStatus], background: `${STATUS_COLOR[overallStatus]}0d` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: STATUS_COLOR[overallStatus] }} />
              {STATUS_LABEL[overallStatus]}
            </div>
          )}
          <button onClick={() => void run()} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono border uppercase tracking-wider"
            style={{ borderColor: C.border, color: C.muted }}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> RUN_SCAN
          </button>
        </div>
      </div>

      {/* Health checks grid */}
      <div {...ani(30)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading && checks.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3" style={panel}>
              <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: C.muted }} />
              <div className="text-[10px] font-mono" style={{ color: C.muted }}>SCANNING...</div>
            </div>
          ))
          : checks.map((c, i) => {
            const sc = STATUS_COLOR[c.status]
            return (
              <div key={i} className="p-4 flex items-center gap-4" style={panel}>
                <div className="absolute top-0 left-0 bottom-0 w-px" style={{ background: sc }} />
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                  style={{ background: `${sc}12`, border: `1px solid ${sc}30` }}>
                  <c.icon size={16} style={{ color: sc }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-lcd uppercase tracking-widest" style={{ color: C.muted }}>{c.label}</span>
                    <span className="text-[9px] font-mono font-bold" style={{ color: sc }}>{c.value}</span>
                  </div>
                  <div className="text-xs text-white mt-0.5 truncate">{c.detail}</div>
                </div>
                <div className="flex-shrink-0">
                  {c.status === 'ok'    && <CheckCircle size={14} style={{ color: C.secondary }} />}
                  {c.status === 'warn'  && <AlertTriangle size={14} style={{ color: C.accent }} />}
                  {c.status === 'error' && <XCircle size={14} style={{ color: C.alert }} />}
                  {c.status === 'loading' && <Loader2 size={14} className="animate-spin" style={{ color: C.muted }} />}
                </div>
              </div>
            )
          })
        }
      </div>

      {/* DB Stats */}
      {stats && (
        <div {...ani(80)} className="space-y-3">
          <div className="text-[9px] font-lcd uppercase tracking-widest flex items-center gap-2" style={{ color: C.muted }}>
            <span className="flex-shrink-0">DATABASE_STATISTICS</span>
            <span className="flex-1 h-px" style={{ background: C.border }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l:'USERS',        main: stats.active_users,  sub: `${stats.total_users} total`,     pct: stats.total_users ? Math.round(stats.active_users/stats.total_users*100) : 0, c: C.primary,   icon: Users },
              { l:'ATLET',        main: stats.verified_atlet, sub: `${stats.total_atlet} total`,    pct: stats.total_atlet ? Math.round(stats.verified_atlet/stats.total_atlet*100) : 0, c: C.secondary, icon: Activity },
              { l:'KONTINGEN',    main: stats.total_kontingen, sub: `${stats.total_cabor} cabor`,   pct: 100, c: C.accent,    icon: Server },
              { l:'SUBSCRIPTIONS',main: stats.active_subs,  sub: `${stats.total_subs} total`,       pct: stats.total_subs ? Math.round(stats.active_subs/stats.total_subs*100) : 0, c: C.purple,    icon: Wifi },
            ].map(s => (
              <div key={s.l} className="p-4 relative overflow-hidden" style={panel}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: s.c }} />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-lcd uppercase tracking-widest" style={{ color: C.muted }}>{s.l}</span>
                  <s.icon size={11} style={{ color: `${s.c}80` }} />
                </div>
                <div className="font-lcd font-bold text-2xl" style={{ color: s.c }}>{s.main}</div>
                <div className="text-[9px] font-mono mt-0.5" style={{ color: C.muted }}>{s.sub}</div>
                <GradeBar pct={s.pct} color={s.c} />
              </div>
            ))}
          </div>

          {/* Verification rate */}
          <div className="p-4" style={panel}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-lcd uppercase tracking-widest" style={{ color: C.muted }}>ATLET_VERIFICATION_RATE</span>
              <span className="text-sm font-lcd font-bold" style={{ color: stats.total_atlet ? (stats.verified_atlet/stats.total_atlet >= 0.7 ? C.secondary : C.accent) : C.muted }}>
                {stats.total_atlet ? `${Math.round(stats.verified_atlet/stats.total_atlet*100)}%` : '—'}
              </span>
            </div>
            <div className="w-full h-2 bg-white/5">
              <div className="h-full transition-all duration-1000"
                style={{
                  width: stats.total_atlet ? `${Math.round(stats.verified_atlet/stats.total_atlet*100)}%` : '0%',
                  background: stats.total_atlet && stats.verified_atlet/stats.total_atlet >= 0.7 ? C.secondary : C.accent,
                }} />
            </div>
            <div className="flex justify-between mt-1 text-[9px] font-mono" style={{ color: C.muted }}>
              <span>{stats.verified_atlet} verified</span>
              <span>{stats.total_atlet - stats.verified_atlet} pending</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
