'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { BarChart3, RefreshCw, Award, TrendingUp, Users } from 'lucide-react'

type KontingenRow = {
  kontingen: string
  emas: number
  perak: number
  perunggu: number
  total: number
  totalAtlet: number
  isCurrent: boolean
}

export default function AnalyticsComparePage() {
  const [rows, setRows] = useState<KontingenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'medali' | 'efisiensi' | 'radar'>('medali')
  const [currentKontingen, setCurrentKontingen] = useState<string>('')

  useEffect(() => {
    loadCompare()
  }, [])

  const loadCompare = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/analytics/compare')
      if (res.ok) {
        const json = await res.json()
        setRows(json.rows ?? [])
        setCurrentKontingen(json.currentKontingen ?? '')
      }
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Sort by total medali desc
  const sortedByMedali = [...rows].sort((a, b) => b.total - a.total)
  const currentRank = sortedByMedali.findIndex(r => r.isCurrent) + 1

  // Efisiensi = total medali / total atlet
  const sortedByEfisiensi = [...rows]
    .map(r => ({ ...r, efisiensi: r.totalAtlet > 0 ? (r.total / r.totalAtlet) * 100 : 0 }))
    .sort((a, b) => b.efisiensi - a.efisiensi)

  // Radar data (top 5 + current)
  const top5 = sortedByMedali.slice(0, 5)
  const radarData = ['emas', 'perak', 'perunggu', 'totalAtlet'].map(metric => {
    const point: any = { metric: metric === 'totalAtlet' ? 'Atlet' : metric }
    top5.forEach(k => {
      point[k.kontingen] = metric === 'totalAtlet' ? k.totalAtlet : (k as any)[metric]
    })
    return point
  })

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <BarChart3 className="text-cyan-400" size={20} />
              </div>
              <h1 className="text-2xl font-bold">Comparative Analysis</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">PRO</span>
            </div>
            <p className="text-slate-400 text-sm">
              Benchmark kontingen lo ({currentKontingen || '—'}) vs kontingen lain di PORPROV XV
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['medali', 'efisiensi', 'radar'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                  view === v
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {v === 'radar' ? 'Radar Top 5' : v}
              </button>
            ))}
            <button onClick={loadCompare} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Position card */}
        {currentRank > 0 && (
          <div className="mb-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-center gap-4">
            <div className="text-4xl font-bold text-cyan-300">#{currentRank}</div>
            <div className="flex-1">
              <div className="font-semibold">{currentKontingen}</div>
              <div className="text-sm text-slate-400">
                Posisi dari {rows.length} kontingen · {sortedByMedali[currentRank - 1]?.total ?? 0} medali total
              </div>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Gap ke #1: <span className="text-white font-semibold">{(sortedByMedali[0]?.total ?? 0) - (sortedByMedali[currentRank - 1]?.total ?? 0)} medali</span></div>
              {currentRank > 1 && (
                <div>Gap ke #{currentRank - 1}: <span className="text-white font-semibold">{(sortedByMedali[currentRank - 2]?.total ?? 0) - (sortedByMedali[currentRank - 1]?.total ?? 0)} medali</span></div>
              )}
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          {loading ? (
            <div className="h-80 flex items-center justify-center text-slate-500">
              <RefreshCw className="animate-spin" size={20} />
            </div>
          ) : view === 'medali' ? (
            <>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Award size={14} /> Total Medali per Kontingen
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={sortedByMedali} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="kontingen" type="category" stroke="#64748b" fontSize={11} width={120} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {sortedByMedali.map((row, i) => (
                      <Cell key={i} fill={row.isCurrent ? '#06b6d4' : '#475569'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : view === 'efisiensi' ? (
            <>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={14} /> Efisiensi (Medali per 100 Atlet)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={sortedByEfisiensi} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis dataKey="kontingen" type="category" stroke="#64748b" fontSize={11} width={120} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    formatter={(v: any) => `${Number(v).toFixed(2)}%`}
                  />
                  <Bar dataKey="efisiensi" radius={[0, 6, 6, 0]}>
                    {sortedByEfisiensi.map((row, i) => (
                      <Cell key={i} fill={row.isCurrent ? '#06b6d4' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Users size={14} /> Radar Comparison — Top 5
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                  <PolarRadiusAxis stroke="#475569" fontSize={10} />
                  {top5.map((k, i) => (
                    <Radar
                      key={k.kontingen}
                      name={k.kontingen}
                      dataKey={k.kontingen}
                      stroke={k.isCurrent ? '#06b6d4' : ['#a78bfa', '#f472b6', '#fbbf24', '#10b981', '#64748b'][i]}
                      fill={k.isCurrent ? '#06b6d4' : ['#a78bfa', '#f472b6', '#fbbf24', '#10b981', '#64748b'][i]}
                      fillOpacity={0.15}
                      strokeWidth={k.isCurrent ? 2 : 1}
                    />
                  ))}
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
              <tr>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Kontingen</th>
                <th className="text-right px-4 py-3">🥇 Emas</th>
                <th className="text-right px-4 py-3">🥈 Perak</th>
                <th className="text-right px-4 py-3">🥉 Perunggu</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Atlet</th>
                <th className="text-right px-4 py-3">Efisiensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedByMedali.map((row, i) => (
                <tr key={row.kontingen} className={row.isCurrent ? 'bg-cyan-500/10' : 'hover:bg-slate-800/30'}>
                  <td className="px-4 py-3 font-mono text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {row.kontingen}
                    {row.isCurrent && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">YOU</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-300">{row.emas}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{row.perak}</td>
                  <td className="px-4 py-3 text-right text-orange-300">{row.perunggu}</td>
                  <td className="px-4 py-3 text-right font-semibold">{row.total}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{row.totalAtlet}</td>
                  <td className="px-4 py-3 text-right text-emerald-300">
                    {row.totalAtlet > 0 ? `${((row.total / row.totalAtlet) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
