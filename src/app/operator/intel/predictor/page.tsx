'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Trophy, Sparkles, RefreshCw, TrendingUp, Target, AlertTriangle } from 'lucide-react'

type Prediction = {
  cabor: string
  kontingen: string
  baselineYear: string
  predictedEmas: { low: number; mid: number; high: number }
  predictedPerak: { low: number; mid: number; high: number }
  predictedPerunggu: { low: number; mid: number; high: number }
  confidence: number  // 0-100
  factors: { name: string; weight: number; impact: 'positive' | 'negative' | 'neutral' }[]
  rationale: string
  generatedAt: string
}

export default function IntelPredictorPage() {
  const [target, setTarget] = useState<'PORPROV_XV' | 'PON_2028' | 'SEAGAMES_2027'>('PORPROV_XV')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)

  const runPredictor = async () => {
    setLoading(true)
    setPrediction(null)
    try {
      const res = await fetch('/api/intel/predictor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      if (res.ok) {
        const json = await res.json()
        setPrediction(json)
      }
    } catch (err) {
      // noop
    } finally {
      setLoading(false)
    }
  }

  const chartData = prediction ? [
    { medali: 'Emas', low: prediction.predictedEmas.low, mid: prediction.predictedEmas.mid, high: prediction.predictedEmas.high, fill: '#fbbf24' },
    { medali: 'Perak', low: prediction.predictedPerak.low, mid: prediction.predictedPerak.mid, high: prediction.predictedPerak.high, fill: '#94a3b8' },
    { medali: 'Perunggu', low: prediction.predictedPerunggu.low, mid: prediction.predictedPerunggu.mid, high: prediction.predictedPerunggu.high, fill: '#f97316' },
  ] : []

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Trophy className="text-amber-400" size={20} />
            </div>
            <h1 className="text-2xl font-bold">Medal Predictor</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">ELITE</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold">🧠 Claude</span>
          </div>
          <p className="text-slate-400 text-sm">Prediksi medali berbasis historical data + AI projection model</p>
        </div>

        {/* Target selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-amber-400" />
            <span className="text-sm">Target event:</span>
            <div className="flex gap-1">
              {([
                { id: 'PORPROV_XV', label: 'PORPROV XV (2026)' },
                { id: 'SEAGAMES_2027', label: 'SEA Games 2027' },
                { id: 'PON_2028', label: 'PON 2028' },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTarget(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    target === t.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={runPredictor}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-sm font-semibold flex items-center gap-2 text-slate-950"
          >
            {loading ? (
              <><RefreshCw size={14} className="animate-spin" /> Predicting…</>
            ) : (
              <><Sparkles size={14} /> {prediction ? 'Re-run Predictor' : 'Run Predictor'}</>
            )}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <RefreshCw className="mx-auto animate-spin text-amber-400 mb-3" size={32} />
            <p className="text-slate-400 text-sm">AI lagi nyusun model prediksi…</p>
            <p className="text-slate-600 text-xs mt-1">~15-25 detik · Claude Sonnet 4.5</p>
          </div>
        )}

        {/* Prediction result */}
        {prediction && !loading && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-amber-400 mb-1">🥇 Emas (range)</div>
                <div className="text-2xl font-bold">{prediction.predictedEmas.mid}</div>
                <div className="text-xs text-slate-400">
                  {prediction.predictedEmas.low}–{prediction.predictedEmas.high}
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/10 border border-slate-500/30 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-slate-300 mb-1">🥈 Perak</div>
                <div className="text-2xl font-bold">{prediction.predictedPerak.mid}</div>
                <div className="text-xs text-slate-400">
                  {prediction.predictedPerak.low}–{prediction.predictedPerak.high}
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-orange-400 mb-1">🥉 Perunggu</div>
                <div className="text-2xl font-bold">{prediction.predictedPerunggu.mid}</div>
                <div className="text-xs text-slate-400">
                  {prediction.predictedPerunggu.low}–{prediction.predictedPerunggu.high}
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wider text-violet-400 mb-1">Confidence</div>
                <div className="text-2xl font-bold">{prediction.confidence}%</div>
                <div className="text-xs text-slate-400">
                  {prediction.confidence >= 75 ? 'High' : prediction.confidence >= 50 ? 'Medium' : 'Low'}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold mb-4">Range Prediksi (Low / Mid / High)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="medali" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Bar dataKey="low" name="Low estimate" fill="#475569" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mid" name="Mid estimate" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="high" name="High estimate" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Factors */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={14} /> Key Factors
              </h3>
              <div className="space-y-2">
                {prediction.factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-800/30 rounded-lg p-3">
                    <div className={`w-1 h-8 rounded-full ${
                      f.impact === 'positive' ? 'bg-emerald-400' : f.impact === 'negative' ? 'bg-red-400' : 'bg-slate-500'
                    }`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{f.name}</div>
                    </div>
                    <div className="text-xs">
                      <span className={`px-2 py-0.5 rounded ${
                        f.impact === 'positive' ? 'bg-emerald-500/20 text-emerald-300' :
                        f.impact === 'negative' ? 'bg-red-500/20 text-red-300' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        weight {f.weight}/10
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rationale */}
            <div className="bg-gradient-to-br from-violet-500/5 to-blue-500/5 border border-violet-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-violet-400" />
                <span className="text-sm font-semibold text-violet-300">AI Rationale</span>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-200">{prediction.rationale}</div>
            </div>

            <div className="text-xs text-slate-500 text-center">
              <AlertTriangle size={12} className="inline mr-1" />
              Prediksi adalah projection statistik + AI inference, bukan jaminan. Generated: {prediction.generatedAt}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!prediction && !loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <Trophy className="mx-auto text-slate-700 mb-3" size={48} />
            <h3 className="text-lg font-semibold mb-1">Belum ada prediksi</h3>
            <p className="text-slate-500 text-sm">Klik <b>Run Predictor</b> untuk request model prediksi medali untuk target event yang dipilih.</p>
          </div>
        )}
      </div>
    </div>
  )
}
