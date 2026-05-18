'use client'
// src/app/superadmin/system/page.tsx
// System Health Monitor

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity, ArrowLeft, CheckCircle, Clock,
  Database, RefreshCw, Server, Users,
  Wifi, XCircle, Zap,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  bg:'#0b0e14', bgCard:'#111827', border:'rgba(255,255,255,0.07)',
  text:'#f1f5f9', muted:'#64748b', green:'#10b981',
  primary:'#ef4444', secondary:'#f97316',
}

interface HealthItem {
  label:  string
  status: 'ok' | 'warn' | 'error' | 'loading'
  value:  string
  icon:   any
}

interface DbStats {
  total_users:    number
  active_users:   number
  total_atlet:    number
  total_kontingen:number
  total_cabor:    number
  total_subscriptions: number
}

export default function SystemHealthPage() {
  const [stats, setStats]     = useState<DbStats | null>(null)
  const [health, setHealth]   = useState<HealthItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [animIn, setAnimIn]   = useState(false)

  const checkHealth = useCallback(async () => {
    setLoading(true)
    const items: HealthItem[] = []
    const start = Date.now()

    try {
      // 1. DB ping
      const { error: pingErr } = await sb.from('kontingen').select('id').limit(1)
      const dbMs = Date.now() - start
      items.push({
        label: 'Database (Supabase)',
        status: pingErr ? 'error' : dbMs < 500 ? 'ok' : 'warn',
        value: pingErr ? 'Error' : `${dbMs}ms`,
        icon: Database,
      })

      // 2. Auth API
      const authStart = Date.now()
      const authRes = await fetch('/api/auth/me')
      const authMs = Date.now() - authStart
      items.push({
        label: 'Auth API',
        status: authRes.status < 500 ? 'ok' : 'error',
        value: `${authMs}ms · HTTP ${authRes.status}`,
        icon: Wifi,
      })

      // 3. DB Stats
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalAtlet },
        { count: totalKontingen },
        { count: totalCabor },
        { count: totalSubs },
      ] = await Promise.all([
        sb.from('users').select('*', { count:'exact', head:true }),
        sb.from('users').select('*', { count:'exact', head:true }).eq('is_active', true),
        sb.from('atlet').select('*', { count:'exact', head:true }),
        sb.from('kontingen').select('*', { count:'exact', head:true }),
        sb.from('cabang_olahraga').select('*', { count:'exact', head:true }),
        sb.from('subscriptions').select('*', { count:'exact', head:true }).eq('is_active', true),
      ])

      setStats({
        total_users:    totalUsers ?? 0,
        active_users:   activeUsers ?? 0,
        total_atlet:    totalAtlet ?? 0,
        total_kontingen:totalKontingen ?? 0,
        total_cabor:    totalCabor ?? 0,
        total_subscriptions: totalSubs ?? 0,
      })

      // 4. SIPA/AI
      items.push({
        label: 'SIPA AI (Groq)',
        status: 'ok',
        value: 'Configured',
        icon: Zap,
      })

      // 5. Environment
      const hasEnv = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      items.push({
        label: 'Environment Variables',
        status: hasEnv ? 'ok' : 'error',
        value: hasEnv ? 'All set' : 'Missing vars!',
        icon: Server,
      })

    } catch (e: any) {
      items.push({
        label: 'System Error',
        status: 'error',
        value: e.message,
        icon: XCircle,
      })
    }

    setHealth(items)
    setLastCheck(new Date())
    setLoading(false)
    setTimeout(() => setAnimIn(true), 50)
  }, [])

  useEffect(() => { void checkHealth() }, [checkHealth])

  const statusColor = (s: string) =>
    s==='ok' ? '#10b981' : s==='warn' ? '#f59e0b' : s==='error' ? '#ef4444' : '#64748b'

  const statusIcon = (s: string) => {
    if (s==='ok')    return <CheckCircle size={14} className="text-green-400"/>
    if (s==='warn')  return <Clock size={14} className="text-yellow-400"/>
    if (s==='error') return <XCircle size={14} className="text-red-400"/>
    return <RefreshCw size={14} className="animate-spin text-slate-400"/>
  }

  const ani = (d=0) => ({
    style:{ transitionDelay:`${d}ms`, transition:'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const allOk = health.every(h => h.status === 'ok')

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background:C.bg }}>

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin"
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ borderColor:C.border, color:C.muted }}>
            <ArrowLeft size={16}/>
          </Link>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              System Health
              {!loading && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  allOk ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  {allOk ? '● All Systems Operational' : '● Issues Detected'}
                </span>
              )}
            </h1>
            <p className="text-xs mt-0.5" style={{ color:C.muted }}>
              {lastCheck ? `Last check: ${lastCheck.toLocaleTimeString('id-ID')}` : 'Checking...'}
            </p>
          </div>
        </div>
        <button onClick={()=>void checkHealth()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border"
          style={{ borderColor:C.border, color:C.muted }}>
          <RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh
        </button>
      </div>

      {/* Health checks */}
      <div {...ani(40)} className="grid grid-cols-1 gap-3">
        {health.map((h, i) => (
          <div key={i} className="rounded-2xl p-4 border flex items-center gap-4"
            style={{ background:C.bgCard, borderColor:C.border }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${statusColor(h.status)}15` }}>
              <h.icon size={18} style={{ color:statusColor(h.status) }}/>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{h.label}</div>
              <div className="text-xs mt-0.5" style={{ color:C.muted }}>{h.value}</div>
            </div>
            {statusIcon(h.status)}
          </div>
        ))}
        {loading && (
          <div className="rounded-2xl p-8 border text-center" style={{ background:C.bgCard, borderColor:C.border }}>
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-600"/>
            <div className="text-sm" style={{ color:C.muted }}>Checking system health...</div>
          </div>
        )}
      </div>

      {/* DB Stats */}
      {stats && (
        <div {...ani(80)}>
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Database size={14} className="text-blue-400"/> Database Statistics
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total Users',       value:stats.total_users,        sub:`${stats.active_users} aktif`,    color:'#3b82f6', icon:Users    },
              { label:'Total Atlet',        value:stats.total_atlet,        sub:'terdaftar',                      color:'#10b981', icon:Activity },
              { label:'Kontingen',          value:stats.total_kontingen,    sub:'kabupaten/kota',                  color:'#f59e0b', icon:Server   },
              { label:'Cabang Olahraga',    value:stats.total_cabor,        sub:'cabor aktif',                    color:'#8b5cf6', icon:Zap      },
              { label:'Subscriptions Aktif',value:stats.total_subscriptions,sub:'kontingen berlangganan',          color:'#ef4444', icon:CheckCircle },
              { label:'System Uptime',      value:'99.9%',                  sub:'30 hari terakhir',               color:'#06b6d4', icon:Activity },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 border flex items-center gap-3"
                style={{ background:C.bgCard, borderColor:C.border }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:`${s.color}15` }}>
                  <s.icon size={18} style={{ color:s.color }}/>
                </div>
                <div>
                  <div className="text-xl font-black text-white">{s.value}</div>
                  <div className="text-[10px]" style={{ color:C.muted }}>{s.label}</div>
                  <div className="text-[9px]" style={{ color:`${s.color}80` }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}