'use client'
// src/app/superadmin/logs/page.tsx
// AUDIT TRAIL — semua aksi user + system, filterable, searchable

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  AlertTriangle, CheckCircle, ChevronDown, Download,
  FileText, Filter, Info, Loader2, RefreshCw,
  Search, Shield, XCircle, Zap,
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
  purple:    '#a855f7',
  bg:        'rgba(10,25,47,0.4)',
  border:    'rgba(0,243,255,0.2)',
  muted:     '#7a8b9e',
}

const SEV_COLOR = { critical: C.alert, warning: C.accent, info: C.primary }
const SEV_ICON  = {
  critical: <XCircle      size={10} />,
  warning:  <AlertTriangle size={10} />,
  info:     <Info         size={10} />,
}

const ACTION_COLOR: Record<string, string> = {
  LOGIN:            C.secondary,
  LOGOUT:           C.muted,
  UPDATE_ATLET:     C.primary,
  CREATE_ATLET:     C.secondary,
  DELETE_ATLET:     C.alert,
  APPROVE_ATLET:    C.secondary,
  REJECT_ATLET:     C.alert,
  APPROVE_DOKUMEN:  C.secondary,
  REJECT_DOKUMEN:   C.alert,
  UPDATE_TENANT:    C.purple,
  UPDATE_PLAN:      C.purple,
  DELETE_USER:      C.alert,
  CREATE_USER:      C.secondary,
  EXPORT_DATA:      C.accent,
  GENERATE_REPORT:  C.accent,
  RUN_AI_BRIEF:     C.accent,
}

interface AuditLog {
  id:           number
  created_at:   string
  actor_email:  string | null
  actor_role:   string | null
  kontingen_id: number | null
  action:       string
  resource:     string | null
  resource_id:  string | null
  payload:      any
  ip_address:   string | null
  severity:     'info' | 'warning' | 'critical'
}

interface Kontingen { id: number; nama: string }

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1)  return 'baru saja'
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ══════════════════════════════════════════════════════════
export default function LogsPage() {
  const [logs,       setLogs]       = useState<AuditLog[]>([])
  const [kontingens, setKontingens] = useState<Kontingen[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [sevFilter,  setSevFilter]  = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page,       setPage]       = useState(0)
  const [expanded,   setExpanded]   = useState<number | null>(null)
  const [animIn,     setAnimIn]     = useState(false)

  const PAGE_SIZE = 50

  useEffect(() => { setTimeout(() => setAnimIn(true), 80) }, [])

  async function load() {
    setLoading(true)
    const [lRes, kRes] = await Promise.all([
      sb.from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      sb.from('kontingen').select('id,nama'),
    ])
    if (lRes.data)  setLogs(lRes.data as AuditLog[])
    if (kRes.data)  setKontingens(kRes.data)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (sevFilter !== 'all' && l.severity !== sevFilter) return false
      if (roleFilter !== 'all' && l.actor_role !== roleFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (l.actor_email || '').toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.resource || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, sevFilter, roleFilter, search])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // Stats
  const critCount = logs.filter(l => l.severity === 'critical').length
  const warnCount = logs.filter(l => l.severity === 'warning').length
  const roles     = Array.from(new Set(logs.map(l => l.actor_role).filter(Boolean)))

  // Export CSV
  function exportCsv() {
    const header = ['created_at','actor_email','actor_role','action','resource','resource_id','severity','ip_address']
    const rows = filtered.map(l => header.map(h => (l as any)[h] ?? '').join(','))
    const csv  = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const panel = { background: C.bg, border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)' }
  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  return (
    <div className="p-6 space-y-5 font-sci min-h-screen" style={{ color: '#f1f5f9' }}>

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border flex items-center justify-center relative"
            style={{ borderColor: C.accent, background: 'rgba(255,176,0,0.08)' }}>
            <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(255,176,0,0.06)' }} />
            <FileText size={18} style={{ color: C.accent }} className="z-10" />
          </div>
          <div>
            <h1 className="font-lcd font-bold text-xl tracking-widest" style={{ color: C.accent, textShadow: `0 0 12px ${C.accent}` }}>
              AUDIT_TRAIL
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
              {logs.length} log entries · {critCount} critical · {warnCount} warning
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-mono border uppercase tracking-wider"
            style={{ borderColor: C.border, color: C.muted }}>
            <Download size={11} /> CSV
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono border uppercase tracking-wider disabled:opacity-40"
            style={{ borderColor: C.accent, color: C.accent, background: 'rgba(255,176,0,0.06)' }}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            REFRESH
          </button>
        </div>
      </div>

      {/* Stats */}
      <div {...ani(40)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'TOTAL_LOGS',   v: logs.length,   c: C.primary   },
          { l: 'CRITICAL',     v: critCount,      c: C.alert     },
          { l: 'WARNING',      v: warnCount,      c: C.accent    },
          { l: 'ACTORS',       v: new Set(logs.map(l=>l.actor_email).filter(Boolean)).size, c: C.purple },
        ].map(s => (
          <div key={s.l} className="p-3 relative" style={panel}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: s.c }} />
            <div className="text-[8px] font-lcd uppercase tracking-wider mb-1" style={{ color: C.muted }}>{s.l}</div>
            <div className="font-lcd font-bold text-2xl" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div {...ani(80)} className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 border px-3 py-1.5 flex-1 min-w-48"
          style={{ borderColor: C.border }}>
          <Search size={11} style={{ color: C.muted }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Cari email / action / resource..."
            className="bg-transparent text-xs font-mono text-white outline-none flex-1"
            style={{ minWidth: 0 }} />
        </div>
        {/* Severity filter */}
        <select value={sevFilter} onChange={e => { setSevFilter(e.target.value); setPage(0) }}
          className="bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
          style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
          <option value="all" style={{ background: '#0a192f' }}>Semua severity</option>
          <option value="critical" style={{ background: '#0a192f' }}>Critical</option>
          <option value="warning"  style={{ background: '#0a192f' }}>Warning</option>
          <option value="info"     style={{ background: '#0a192f' }}>Info</option>
        </select>
        {/* Role filter */}
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0) }}
          className="bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
          style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
          <option value="all" style={{ background: '#0a192f' }}>Semua role</option>
          {roles.map(r => <option key={r} value={r!} style={{ background: '#0a192f' }}>{r}</option>)}
        </select>
        <span className="text-[9px] font-mono" style={{ color: C.muted }}>
          {filtered.length} hasil
        </span>
      </div>

      {/* No-table notice */}
      {!loading && logs.length === 0 && (
        <div {...ani(100)} className="p-8 text-center" style={panel}>
          <FileText size={32} className="mx-auto mb-3 opacity-30" style={{ color: C.accent }} />
          <div className="font-lcd text-sm mb-2" style={{ color: C.accent }}>AUDIT_TABLE_EMPTY</div>
          <div className="text-xs font-mono" style={{ color: C.muted }}>
            Jalankan migration <code className="text-white">003_audit_logs.sql</code> di Supabase SQL Editor,<br/>
            kemudian hubungkan aksi-aksi server action ke fungsi <code className="text-white">insertAuditLog()</code>
          </div>
        </div>
      )}

      {/* Log table */}
      {!loading && logs.length > 0 && (
        <div {...ani(100)} style={panel}>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b" style={{ borderColor: C.border }}>
                  {['SEV','TIMESTAMP','ACTOR','ROLE','ACTION','RESOURCE','IP'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] uppercase tracking-widest"
                      style={{ color: C.muted }}>{h}</th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {paged.map(log => {
                  const sevC   = SEV_COLOR[log.severity]
                  const actC   = ACTION_COLOR[log.action] || C.primary
                  const isOpen = expanded === log.id
                  return (
                    <>
                      <tr key={log.id}
                        className="border-b cursor-pointer transition-colors"
                        style={{ borderColor: 'rgba(0,243,255,0.05)', background: isOpen ? 'rgba(0,243,255,0.04)' : 'transparent' }}
                        onClick={() => setExpanded(isOpen ? null : log.id)}>
                        <td className="px-4 py-2.5">
                          <span style={{ color: sevC }}>{SEV_ICON[log.severity]}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div style={{ color: 'rgba(255,255,255,0.6)' }}>{formatTs(log.created_at)}</div>
                          <div className="text-[9px]" style={{ color: C.muted }}>{timeAgo(log.created_at)}</div>
                        </td>
                        <td className="px-4 py-2.5 max-w-[140px] truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                          {log.actor_email || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-1.5 py-0.5 text-[9px]"
                            style={{ background: 'rgba(255,255,255,0.05)', color: C.muted }}>
                            {log.actor_role || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-bold" style={{ color: actC }}>{log.action}</span>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {log.resource || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-[9px]" style={{ color: C.muted }}>
                          {log.ip_address || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <ChevronDown size={12} style={{ color: C.muted, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </td>
                      </tr>
                      {isOpen && log.payload && (
                        <tr key={`${log.id}-detail`} style={{ background: 'rgba(0,243,255,0.02)' }}>
                          <td colSpan={8} className="px-6 py-3">
                            <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: C.muted }}>PAYLOAD</div>
                            <pre className="text-[10px] font-mono p-3 rounded overflow-x-auto"
                              style={{ background: 'rgba(0,0,0,0.4)', color: C.primary, maxHeight: 160 }}>
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: C.border }}>
              <span className="text-[9px] font-mono" style={{ color: C.muted }}>
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i)}
                    className="w-7 h-7 text-[10px] font-mono border transition-all"
                    style={{
                      borderColor: page === i ? C.accent : C.border,
                      color: page === i ? C.accent : C.muted,
                      background: page === i ? 'rgba(255,176,0,0.1)' : 'transparent',
                    }}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
