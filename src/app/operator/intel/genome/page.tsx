'use client'

import { useState, useEffect } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { Dna, Search, Sparkles, User, Award, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'

type Atlet = {
  id: string
  nama: string
  nik?: string
  cabor: string
  kontingen: string
  jenis_kelamin?: string
  usia?: number
}

type Genome = {
  atlet: Atlet
  attributes: {
    label: string
    value: number
    max: number
    pctile?: number
  }[]
  totalMedali: number
  emasCount: number
  consistency: number  // 0-100
  aiInsight?: string
}

export default function IntelGenomePage() {
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Atlet[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Atlet | null>(null)
  const [genome, setGenome] = useState<Genome | null>(null)
  const [loadingGenome, setLoadingGenome] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)

  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([])
      return
    }
    const t = setTimeout(() => doSearch(), 300)
    return () => clearTimeout(t)
  }, [search])

  const doSearch = async () => {
    setSearching(true)
    try {
      const res = await fetch(`/api/intel/genome?q=${encodeURIComponent(search)}`)
      if (res.ok) {
        const json = await res.json()
        setSearchResults(json.atlet ?? [])
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const selectAtlet = async (a: Atlet) => {
    setSelected(a)
    setSearch('')
    setSearchResults([])
    setLoadingGenome(true)
    setGenome(null)
    try {
      const res = await fetch(`/api/intel/genome?atletId=${encodeURIComponent(a.id)}`)
      if (res.ok) {
        const json = await res.json()
        setGenome(json)
      }
    } catch {
      // noop
    } finally {
      setLoadingGenome(false)
    }
  }

  const requestAIInsight = async () => {
    if (!genome) return
    setAiThinking(true)
    try {
      const prompt = `Analisis atlet berikut sebagai sport scientist. Beri 3-5 kalimat insight strategis tentang profile-nya:

Nama: ${genome.atlet.nama}
Cabor: ${genome.atlet.cabor}
Kontingen: ${genome.atlet.kontingen}
${genome.atlet.usia ? `Usia: ${genome.atlet.usia}` : ''}

Performance:
- Total medali: ${genome.totalMedali}
- Medali emas: ${genome.emasCount}
- Consistency score: ${genome.consistency}/100

Atribut:
${genome.attributes.map(a => `- ${a.label}: ${a.value}/${a.max}${a.pctile ? ` (top ${100 - a.pctile}%)` : ''}`).join('\n')}

Fokus: kekuatan utama, area improvement, dan rekomendasi training prioritas. Tone ringkas-tactical, bahasa Indonesia.`

      const res = await fetch('/api/sport-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          useClaudeModel: false,  // Groq cukup
        })
      })
      const data = await res.json()
      setGenome(g => g ? { ...g, aiInsight: data.content ?? data.message ?? '—' } : null)
    } catch (err: any) {
      setGenome(g => g ? { ...g, aiInsight: `Error: ${err.message}` } : null)
    } finally {
      setAiThinking(false)
    }
  }

  const radarData = genome?.attributes.map(a => ({
    metric: a.label,
    value: (a.value / a.max) * 100,
  })) ?? []

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg">
              <Dna className="text-fuchsia-400" size={20} />
            </div>
            <h1 className="text-2xl font-bold">Athlete Genome</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">ELITE</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">⚡ Groq</span>
          </div>
          <p className="text-slate-400 text-sm">DNA performa atlet: 6 dimensi atribut, percentile ranking, AI insight</p>
        </div>

        {/* Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 relative">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atlet… (min 2 char)"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500"
            />
            {searching && <RefreshCw size={14} className="animate-spin text-slate-400" />}
          </div>

          {/* Dropdown results */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-10">
              {searchResults.map(a => (
                <button
                  key={a.id}
                  onClick={() => selectAtlet(a)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0 transition"
                >
                  <div className="text-sm font-medium">{a.nama}</div>
                  <div className="text-xs text-slate-500">{a.cabor} · {a.kontingen}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Genome view */}
        {!selected ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <Dna className="mx-auto text-slate-700 mb-3" size={48} />
            <h3 className="text-lg font-semibold mb-1">Pilih atlet dulu</h3>
            <p className="text-slate-500 text-sm">Cari nama di kotak atas, lalu klik untuk lihat DNA performa.</p>
          </div>
        ) : loadingGenome ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <RefreshCw className="mx-auto animate-spin text-fuchsia-400 mb-3" size={32} />
            <p className="text-slate-400 text-sm">Memuat genome data…</p>
          </div>
        ) : genome ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-violet-500/30 border border-fuchsia-500/40 flex items-center justify-center">
                  <User size={28} className="text-fuchsia-300" />
                </div>
                <div>
                  <div className="font-bold text-lg">{genome.atlet.nama}</div>
                  <div className="text-xs text-slate-400">{genome.atlet.cabor}</div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <DataRow label="Kontingen" value={genome.atlet.kontingen} />
                <DataRow label="Jenis Kelamin" value={genome.atlet.jenis_kelamin ?? '—'} />
                <DataRow label="Usia" value={genome.atlet.usia ? `${genome.atlet.usia} thn` : '—'} />
                <DataRow label="Total Medali" value={genome.totalMedali.toString()} icon={<Award size={12} />} />
                <DataRow label="Medali Emas" value={genome.emasCount.toString()} />
                <DataRow label="Consistency Score" value={`${genome.consistency}/100`} icon={<TrendingUp size={12} />} />
              </div>

              <button
                onClick={requestAIInsight}
                disabled={aiThinking}
                className="mt-4 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-sm font-medium flex items-center justify-center gap-2"
              >
                {aiThinking ? (
                  <><RefreshCw size={14} className="animate-spin" /> AI thinking…</>
                ) : (
                  <><Sparkles size={14} /> Request AI Insight</>
                )}
              </button>
            </div>

            {/* Radar chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:col-span-2">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Dna size={14} className="text-fuchsia-400" /> Performance DNA — 6 Dimensi
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
                  <PolarRadiusAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                  <Radar dataKey="value" stroke="#d946ef" fill="#d946ef" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                    formatter={(v: any) => `${Number(v).toFixed(0)}%`}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Attribute breakdown */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {genome.attributes.map(a => (
                  <div key={a.label} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{a.label}</span>
                      {a.pctile !== undefined && (
                        <span className="text-[10px] text-fuchsia-300">
                          {a.pctile >= 80 ? 'TOP' : a.pctile >= 50 ? 'AVG+' : 'BELOW'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">{a.value}</span>
                      <span className="text-xs text-slate-500">/{a.max}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500"
                        style={{ width: `${(a.value / a.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insight */}
            {genome.aiInsight && (
              <div className="lg:col-span-3 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">AI Sport Scientist Insight</span>
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-200">{genome.aiInsight}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <AlertCircle className="mx-auto text-slate-700 mb-3" size={32} />
            <p className="text-slate-500 text-sm">Gagal load data atlet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function DataRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
      <span className="text-xs text-slate-500 flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}
