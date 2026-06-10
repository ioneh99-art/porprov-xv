'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search, Filter, RefreshCw, Loader2, ChevronDown, ChevronRight,
  Plus, Edit2, Trash2, Lock, Unlock, Sparkles, Upload, Eye,
  AlertCircle, Download, Calendar, User, Database,
} from 'lucide-react'

const ACTION_ICONS: Record<string, any> = {
  create:   Plus,
  update:   Edit2,
  delete:   Trash2,
  lock:     Lock,
  unlock:   Unlock,
  compute:  Sparkles,
  import:   Upload,
  view:     Eye,
}

const ACTION_COLORS: Record<string, string> = {
  create:   'bg-green-500/10 text-green-300 border-green-500/30',
  update:   'bg-blue-500/10 text-blue-300 border-blue-500/30',
  delete:   'bg-red-500/10 text-red-300 border-red-500/30',
  lock:     'bg-amber-500/10 text-amber-300 border-amber-500/30',
  unlock:   'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  compute:  'bg-purple-500/10 text-purple-300 border-purple-500/30',
  import:   'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
}

export default function AuditLogClient({
  tenants, events,
}: {
  tenants: { id: string; slug: string; nama: string; nama_pendek: string | null }[]
  events: { id: string; nama: string; tenant_id: string; tanggal_mulai: string }[]
}) {
  const [rows, setRows] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Filters
  const [tenantId, setTenantId] = useState('')
  const [eventId, setEventId] = useState('')
  const [action, setAction] = useState('')
  const [actor, setActor] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [offset, setOffset] = useState(0)
  const limit = 100

  const filteredEvents = useMemo(
    () => tenantId ? events.filter(e => e.tenant_id === tenantId) : events,
    [tenantId, events]
  )

  const load = async () => {
    setLoading(true); setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (tenantId) params.set('tenant_id', tenantId)
      if (eventId)  params.set('event_id', eventId)
      if (action)   params.set('action', action)
      if (actor)    params.set('actor', actor)
      if (q)        params.set('q', q)
      if (from)     params.set('from', from)
      if (to)       params.set('to', to)
      params.set('limit', String(limit))
      params.set('offset', String(offset))

      const res = await fetch(`/api/pentascore/audit?${params.toString()}`)
      if (!res.ok) throw new Error((await res.json()).error)
      const json = await res.json()
      setRows(json.rows)
      setTotal(json.total)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tenantId, eventId, action, actor, from, to, offset])

  const exportCsv = () => {
    if (!rows.length) return
    const headers = ['created_at','actor','action','target_table','target_id','tenant','event','reason']
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => [
        r.created_at, q1(r.actor_username), r.action_type, r.target_table,
        r.target_id ?? '', q1(r.ps_tenants?.nama_pendek ?? ''), q1(r.ps_events?.nama ?? ''),
        q1(r.reason ?? ''),
      ].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_log_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const q1 = (s: any) => `"${String(s).replace(/"/g, '""')}"`

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select label="Tenant" value={tenantId} onChange={(v: string) => { setTenantId(v); setEventId(''); setOffset(0) }}>
            <option value="">All</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.nama_pendek ?? t.nama}</option>)}
          </Select>
          <Select label="Event" value={eventId} onChange={(v: string) => { setEventId(v); setOffset(0) }}>
            <option value="">All</option>
            {filteredEvents.map(e => <option key={e.id} value={e.id}>{e.nama}</option>)}
          </Select>
          <Select label="Action" value={action} onChange={(v: string) => { setAction(v); setOffset(0) }}>
            <option value="">All</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="lock">Lock</option>
            <option value="unlock">Unlock</option>
            <option value="compute">Compute</option>
            <option value="import">Import</option>
          </Select>
          <TextInput label="Actor (username)" value={actor} onChange={(v: string) => { setActor(v); setOffset(0) }} placeholder="ioneh99..." />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TextInput label="Search (table/ID)" value={q} onChange={(v: string) => { setQ(v); setOffset(0) }} placeholder="ps_events" />
          <TextInput label="From" type="date" value={from} onChange={(v: string) => { setFrom(v); setOffset(0) }} />
          <TextInput label="To" type="date" value={to} onChange={(v: string) => { setTo(v); setOffset(0) }} />
          <div className="flex items-end gap-2">
            <button
              onClick={() => { load() }}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Filter size={12} />}
              Apply
            </button>
            <button
              onClick={() => {
                setTenantId(''); setEventId(''); setAction(''); setActor('')
                setQ(''); setFrom(''); setTo(''); setOffset(0)
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition"
              title="Reset filters"
            >
              Reset
            </button>
            <button
              onClick={exportCsv}
              disabled={!rows.length}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition disabled:opacity-50"
              title="Export CSV"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-slate-400">
          <strong className="text-white">{rows.length}</strong> rows displayed · <strong className="text-amber-300">{total}</strong> total
        </div>
        <div className="text-slate-500">
          Defense Layer <span className="text-amber-300 font-bold">L3</span> · Immutable trail
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Database size={32} className="mx-auto mb-3 opacity-40" />
            <div className="text-sm">No audit entries match current filters</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="w-8 px-2"></th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Time</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Action</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Target</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Actor</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Scope</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((r: any) => {
                  const Icon = ACTION_ICONS[r.action_type] || Database
                  const isOpen = expanded[r.id]
                  return (
                    <>
                      <tr
                        key={r.id}
                        className="hover:bg-slate-800/30 transition cursor-pointer"
                        onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}
                      >
                        <td className="px-2 py-2">
                          {isOpen
                            ? <ChevronDown size={12} className="text-slate-500" />
                            : <ChevronRight size={12} className="text-slate-500" />}
                        </td>
                        <td className="px-3 py-2 text-slate-300 font-mono text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString('id-ID', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${ACTION_COLORS[r.action_type] ?? 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                            <Icon size={9} /> {r.action_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          <div className="font-mono text-xs">{r.target_table}</div>
                          {r.target_id && (
                            <div className="text-[9px] text-slate-600 font-mono truncate max-w-[160px]">
                              {r.target_id.slice(0, 8)}...{r.target_id.slice(-4)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                            <User size={10} className="text-slate-500" />
                            {r.actor_username}
                          </div>
                          {r.actor_role && (
                            <div className="text-[10px] text-slate-500 uppercase">{r.actor_role}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[10px]">
                          {r.ps_tenants && <div className="text-amber-400">{r.ps_tenants.nama_pendek ?? r.ps_tenants.slug}</div>}
                          {r.ps_events && <div className="text-slate-400 truncate max-w-[160px]">{r.ps_events.nama}</div>}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-slate-400 italic max-w-[200px] truncate">
                          {r.reason}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${r.id}-expanded`} className="bg-slate-950/40">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <JsonPanel label="Old Values" data={r.old_values} />
                              <JsonPanel label="New Values" data={r.new_values} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition disabled:opacity-50"
          >
            ← Previous
          </button>
          <div className="text-slate-500">
            Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
          </div>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function Select({ label, value, onChange, children }: any) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-amber-500"
      >
        {children}
      </select>
    </div>
  )
}

function TextInput({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-amber-500"
      />
    </div>
  )
}

function JsonPanel({ label, data }: { label: string; data: any }) {
  if (!data) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
        <div className="text-xs text-slate-700 italic p-2 bg-slate-950/60 rounded border border-slate-800">— null —</div>
      </div>
    )
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <pre className="text-[10px] text-slate-300 p-3 bg-slate-950/60 rounded border border-slate-800 overflow-x-auto max-h-60 overflow-y-auto font-mono whitespace-pre-wrap">
{JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
