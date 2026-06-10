'use client'

import { useState, useEffect } from 'react'
import { GitBranch, ArrowRight, RefreshCw, Filter, Calendar, AlertTriangle, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Mutation = {
  id: string
  atletNama: string
  type: 'kontingen' | 'cabor' | 'kategori'
  fromValue: string
  toValue: string
  tanggal: string
  alasan?: string
  status: 'approved' | 'pending' | 'rejected'
}

type MutationStats = {
  totalMutasi: number
  byType: { type: string; count: number }[]
  byMonth: { month: string; count: number }[]
  inflow: number   // masuk ke kontingen kita
  outflow: number  // keluar dari kontingen kita
}

export default function IntelMutationPage() {
  const [mutations, setMutations] = useState<Mutation[]>([])
  const [stats, setStats] = useState<MutationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'kontingen' | 'cabor' | 'kategori'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/intel/mutation')
      if (res.ok) {
        const json = await res.json()
        setMutations(json.mutations ?? [])
        setStats(json.stats ?? null)
      }
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  const filtered = mutations.filter(m => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    return true
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                <GitBranch className="text-teal-400" size={20} />
              </div>
              <h1 className="text-2xl font-bold">Mutation Analytics</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">CHAMPION</span>
            </div>
            <p className="text-slate-400 text-sm">Track perpindahan atlet — kontingen, cabor, kategori</p>
          </div>
          <button onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Total Mutasi</div>
              <div className="text-2xl font-bold">{stats.totalMutasi}</div>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                <ArrowRight size={12} /> Inflow
              </div>
              <div className="text-2xl font-bold text-emerald-300">+{stats.inflow}</div>
              <div className="text-xs text-slate-500">Masuk ke kontingen kita</div>
            </div>
            <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-red-400 mb-1 flex items-center gap-1">
                <ArrowRight size={12} className="rotate-180" /> Outflow
              </div>
              <div className="text-2xl font-bold text-red-300">−{stats.outflow}</div>
              <div className="text-xs text-slate-500">Keluar dari kontingen kita</div>
            </div>
            <div className={`border rounded-xl p-4 ${
              stats.inflow - stats.outflow >= 0 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-red-500/5 border-red-500/30'
            }`}>
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Net</div>
              <div className={`text-2xl font-bold ${
                stats.inflow - stats.outflow >= 0 ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {stats.inflow - stats.outflow >= 0 ? '+' : ''}{stats.inflow - stats.outflow}
              </div>
            </div>
          </div>
        )}

        {/* Chart by month */}
        {stats && stats.byMonth.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Calendar size={14} /> Mutasi per Bulan
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 flex items-center gap-4 flex-wrap">
          <Filter size={14} className="text-slate-400" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Type:</span>
            {(['all', 'kontingen', 'cabor', 'kategori'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded text-xs ${
                  typeFilter === t ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Status:</span>
            {(['all', 'approved', 'pending', 'rejected'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-xs ${
                  statusFilter === s ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-slate-500">{filtered.length} dari {mutations.length}</div>
        </div>

        {/* Mutations table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto animate-spin text-teal-400 mb-2" size={24} />
              <p className="text-slate-400 text-sm">Loading mutation data…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <GitBranch className="mx-auto text-slate-700 mb-3" size={48} />
              <p className="text-slate-500 text-sm">Tidak ada mutasi sesuai filter.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3">Tanggal</th>
                  <th className="text-left px-4 py-3">Atlet</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Perubahan</th>
                  <th className="text-left px-4 py-3">Alasan</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.tanggal}</td>
                    <td className="px-4 py-3 font-medium">{m.atletNama}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        m.type === 'kontingen' ? 'bg-blue-500/20 text-blue-300' :
                        m.type === 'cabor' ? 'bg-violet-500/20 text-violet-300' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-red-300">{m.fromValue}</span>
                        <ArrowRight size={12} className="text-slate-500" />
                        <span className="text-emerald-300">{m.toValue}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{m.alasan ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        m.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' :
                        m.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Note */}
        <div className="mt-4 text-xs text-slate-500 flex items-start gap-2">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>Data mutasi diambil dari table <code className="bg-slate-800 px-1 rounded">mutasi_atlet</code>. Kalau table belum ada, hasil kosong — bikin migration dulu di Supabase.</span>
        </div>
      </div>
    </div>
  )
}
