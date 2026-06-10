'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2, AlertCircle, XCircle, Loader2, RefreshCw, Database,
  HardDrive, Sparkles, Activity, Shield, BarChart3, Clock,
} from 'lucide-react'

export default function HealthCheckClient() {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pentascore/health', { cache: 'no-store' })
      setData(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [autoRefresh])

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
        <div className="text-xs">Loading health check...</div>
      </div>
    )
  }

  const isHealthy = data.status === 'healthy'

  return (
    <div className="space-y-6">
      {/* Overall status */}
      <div className={`rounded-xl border p-5 ${
        isHealthy
          ? 'bg-green-500/10 border-green-500/40'
          : 'bg-red-500/10 border-red-500/40'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isHealthy
              ? <CheckCircle2 size={28} className="text-green-400" />
              : <AlertCircle size={28} className="text-red-400" />}
            <div>
              <div className={`text-2xl font-bold ${isHealthy ? 'text-green-300' : 'text-red-300'}`}>
                {isHealthy ? 'HEALTHY' : 'DEGRADED'}
              </div>
              <div className="text-xs text-slate-400">
                Engine: <code className="text-amber-300">{data.formula_version}</code> ·
                Latency: <strong className="text-white">{data.latency_ms}ms</strong>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="accent-amber-500" />
              Auto-refresh 15s
            </label>
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Refresh
            </button>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 mt-2">
          Last check: {new Date(data.timestamp).toLocaleString('id-ID')}
        </div>
      </div>

      {/* Check grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CheckPanel icon={Database} title="Database" check={data.checks.database}>
          {data.checks.database.latency_ms != null && (
            <div className="text-xs">Latency: <span className="font-mono text-amber-300">{data.checks.database.latency_ms}ms</span></div>
          )}
        </CheckPanel>

        <CheckPanel icon={HardDrive} title="Storage (Supabase)" check={data.checks.storage}>
          <div className="text-xs">Bucket: <code className="text-amber-300">{data.checks.storage.bucket}</code></div>
          {data.checks.storage.hint && (
            <div className="text-[10px] text-amber-300 mt-1 italic">💡 {data.checks.storage.hint}</div>
          )}
        </CheckPanel>

        <CheckPanel icon={Sparkles} title="Formula Engine" check={data.checks.formula_engine}>
          <div className="text-xs space-y-0.5">
            <div>Version: <code className="text-amber-300">{data.checks.formula_engine.version}</code></div>
            <div>Tests: <span className="text-green-400 font-mono">{data.checks.formula_engine.passed}</span> / <span className="text-slate-400 font-mono">{data.checks.formula_engine.total_tests}</span></div>
          </div>
          {data.checks.formula_engine.failures?.length > 0 && (
            <div className="mt-2 text-[10px] text-red-300">
              {data.checks.formula_engine.failures.map((f: any, i: number) => (
                <div key={i}>✗ {f.name}: got {f.actual}, expected {f.expected}</div>
              ))}
            </div>
          )}
        </CheckPanel>

        <CheckPanel icon={BarChart3} title="System Counts" check={data.checks.system_counts}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Tenants: <span className="font-mono text-amber-300">{data.checks.system_counts.tenants ?? 0}</span></div>
            <div>Active: <span className="font-mono text-green-400">{data.checks.system_counts.tenants_active ?? 0}</span></div>
            <div>Events: <span className="font-mono text-amber-300">{data.checks.system_counts.events ?? 0}</span></div>
            <div>Athletes: <span className="font-mono text-amber-300">{data.checks.system_counts.event_athletes ?? 0}</span></div>
            <div className="col-span-2 mt-1">
              Audit entries: <span className="font-mono text-amber-300">{data.checks.system_counts.audit_entries ?? 0}</span>
            </div>
          </div>
        </CheckPanel>
      </div>

      {/* Defense layers */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-3">
          <Shield size={12} /> Defense Layers
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(data.checks.defense_layers).map(([key, status]: any) => (
            <div key={key} className="flex items-center gap-2 p-2 bg-slate-950/40 rounded border border-slate-800">
              <CheckCircle2 size={11} className="text-green-400 shrink-0" />
              <div className="text-[10px] text-slate-300 flex-1">
                <div className="font-bold text-white">{key.replace(/_/g, ' ').toUpperCase()}</div>
                <div className="text-green-400 uppercase">{status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      {data.checks.recent_activity?.latest_5?.length > 0 && (
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-3">
            <Activity size={12} /> Recent Activity (Last 5)
          </h3>
          <div className="space-y-1">
            {data.checks.recent_activity.latest_5.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-slate-950/40 rounded text-xs">
                <Clock size={9} className="text-slate-500" />
                <span className="text-slate-300 font-mono text-[10px]">
                  {new Date(r.created_at).toLocaleString('id-ID', {
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-500/15 text-amber-300">
                  {r.action_type}
                </span>
                <span className="text-slate-400 font-mono">{r.target_table}</span>
                <span className="ml-auto text-slate-500">by {r.actor_username}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckPanel({ icon: Icon, title, check, children }: any) {
  const isOk = check.status === 'ok'
  return (
    <div className={`rounded-xl border p-4 ${
      isOk ? 'bg-slate-900/40 border-slate-800' : 'bg-red-500/5 border-red-500/40'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        {isOk
          ? <CheckCircle2 size={16} className="text-green-400" />
          : <XCircle size={16} className="text-red-400" />}
      </div>
      {check.error && (
        <div className="text-xs text-red-300 mb-2 p-2 bg-red-500/10 rounded">{check.error}</div>
      )}
      {children}
    </div>
  )
}
