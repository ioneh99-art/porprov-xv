'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import { TrendingUp, Calendar, RefreshCw, Download, Trophy } from 'lucide-react'

type TrendPoint = {
  month: string
  emas: number
  perak: number
  perunggu: number
  total: number
}

type Filter = '3M' | '6M' | '12M' | 'ALL'

export default function AnalyticsTrendsPage() {
  const [data, setData] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('12M')
  const [cabor, setCabor] = useState<string>('')

  useEffect(() => {
    loadTrends()
  }, [filter])

  const loadTrends = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/trends?range=${filter}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.points ?? [])
        setCabor(json.cabor ?? '')
      } else {
        setData([])
      }
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = () => {
    if (!data.length) return
    const csv = [
      'month,emas,perak,perunggu,total',
      ...data.map(d => `${d.month},${d.emas},${d.perak},${d.perunggu},${d.total}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trends_${cabor || 'cabor'}_${filter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalEmas = data.reduce((s, d) => s + d.emas, 0)
  const totalPerak = data.reduce((s, d) => s + d.perak, 0)
  const totalPerunggu = data.reduce((s, d) => s + d.perunggu, 0)
  const grandTotal = totalEmas + totalPerak + totalPerunggu

  // Compute trend direction
  const recentAvg = data.slice(-3).reduce((s, d) => s + d.total, 0) / 3
  const earlierAvg = data.slice(0, 3).reduce((s, d) => s + d.total, 0) / 3
  const trendPct = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <TrendingUp className="text-emerald-400" size={20} />
              </div>
              <h1 className="text-2xl font-bold">Performance Trends</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">PRO</span>
            </div>
            <p className="text-slate-400 text-sm">
              Trend medali cabor {cabor || '—'} dari waktu ke waktu · sumber: kejuaraan_atlet
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['3M', '6M', '12M', 'ALL'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  filter === f
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={loadTrends}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={downloadCSV}
              disabled={!data.length}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-50"
              title="Download CSV"
            >
              <Download size={14} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Total Medali" value={grandTotal} icon={<Trophy size={14} />} color="emerald" />
          <SummaryCard label="🥇 Emas" value={totalEmas} color="amber" />
          <SummaryCard label="🥈 Perak" value={totalPerak} color="slate" />
          <SummaryCard label="🥉 Perunggu" value={totalPerunggu} color="orange" />
        </div>

        {/* Trend indicator */}
        {data.length > 0 && (
          <div className={`mb-4 px-4 py-3 rounded-lg border flex items-center gap-3 ${
            trendPct >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
          }`}>
            <TrendingUp size={16} className={trendPct >= 0 ? 'text-emerald-400' : 'text-red-400 rotate-180'} />
            <div className="text-sm">
              <span className="font-medium">
                {trendPct >= 0 ? 'Trending up' : 'Trending down'} {Math.abs(trendPct).toFixed(1)}%
              </span>
              <span className="text-slate-400 ml-2">
                (rata-rata 3 bulan terakhir vs 3 bulan awal periode)
              </span>
            </div>
          </div>
        )}

        {/* Main chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar size={14} /> Medali per Bulan
          </h3>
          {loading ? (
            <div className="h-80 flex items-center justify-center text-slate-500">
              <RefreshCw className="animate-spin" size={20} />
            </div>
          ) : data.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-slate-500 text-sm">
              Belum ada data untuk periode ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="emasG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="perakG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="perungguG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Area type="monotone" dataKey="emas" stroke="#fbbf24" fill="url(#emasG)" strokeWidth={2} />
                <Area type="monotone" dataKey="perak" stroke="#94a3b8" fill="url(#perakG)" strokeWidth={2} />
                <Area type="monotone" dataKey="perunggu" stroke="#f97316" fill="url(#perungguG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Total trend line */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-4">Total Medali — Cumulative Trend</h3>
          {data.length > 0 && (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon?: React.ReactNode; color: 'emerald' | 'amber' | 'slate' | 'orange' }) {
  const colors = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
    slate: 'border-slate-500/30 bg-slate-500/5 text-slate-300',
    orange: 'border-orange-500/30 bg-orange-500/5 text-orange-400',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1 opacity-80">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}
