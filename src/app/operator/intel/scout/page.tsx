'use client'

import { useState } from 'react'
import { Search, Sparkles, RefreshCw, Filter, Star, TrendingUp, Award, ChevronRight } from 'lucide-react'

type ScoutResult = {
  id: string
  nama: string
  cabor: string
  kontingen: string
  usia?: number
  jenisKelamin?: string
  score: number  // 0-100 talent score
  flags: string[]
  highlights: string[]
  rank: number
}

type ScoutCriteria = {
  ageMin: number
  ageMax: number
  gender: 'all' | 'L' | 'P'
  caborFilter: 'mine' | 'all'
  prioritize: 'emerging' | 'consistent' | 'breakthrough'
}

export default function IntelScoutPage() {
  const [criteria, setCriteria] = useState<ScoutCriteria>({
    ageMin: 15,
    ageMax: 25,
    gender: 'all',
    caborFilter: 'mine',
    prioritize: 'emerging',
  })
  const [results, setResults] = useState<ScoutResult[]>([])
  const [loading, setLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<string>('')

  const runScout = async () => {
    setLoading(true)
    setResults([])
    setAiSummary('')
    try {
      const res = await fetch('/api/intel/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria),
      })
      if (res.ok) {
        const json = await res.json()
        setResults(json.results ?? [])
        setAiSummary(json.aiSummary ?? '')
      }
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <Search className="text-rose-400" size={20} />
            </div>
            <h1 className="text-2xl font-bold">Talent Scout AI</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">CHAMPION</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold">🧠 Claude</span>
          </div>
          <p className="text-slate-400 text-sm">AI-ranked talent discovery — emerging, consistent, atau breakthrough athletes</p>
        </div>

        {/* Criteria panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-rose-400" />
            <span className="font-semibold text-sm">Scouting Criteria</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Age range */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Age Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={criteria.ageMin}
                  onChange={e => setCriteria(c => ({ ...c, ageMin: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-slate-500 text-xs">–</span>
                <input
                  type="number"
                  value={criteria.ageMax}
                  onChange={e => setCriteria(c => ({ ...c, ageMax: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Gender</label>
              <select
                value={criteria.gender}
                onChange={e => setCriteria(c => ({ ...c, gender: e.target.value as any }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">Semua</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            {/* Cabor scope */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Scope Cabor</label>
              <select
                value={criteria.caborFilter}
                onChange={e => setCriteria(c => ({ ...c, caborFilter: e.target.value as any }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="mine">Cabor saya saja</option>
                <option value="all">Semua cabor</option>
              </select>
            </div>

            {/* Prioritize */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Prioritize</label>
              <select
                value={criteria.prioritize}
                onChange={e => setCriteria(c => ({ ...c, prioritize: e.target.value as any }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value="emerging">Emerging talent (rising)</option>
                <option value="consistent">Consistent performer</option>
                <option value="breakthrough">Breakthrough candidate</option>
              </select>
            </div>
          </div>

          <button
            onClick={runScout}
            disabled={loading}
            className="mt-4 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <><RefreshCw size={14} className="animate-spin" /> Scouting…</>
            ) : (
              <><Sparkles size={14} /> Run Talent Scout</>
            )}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center mb-6">
            <RefreshCw className="mx-auto animate-spin text-rose-400 mb-2" size={24} />
            <p className="text-slate-400 text-sm">AI lagi rank kandidat dari database…</p>
          </div>
        )}

        {/* AI Summary */}
        {aiSummary && !loading && (
          <div className="bg-gradient-to-br from-rose-500/5 to-pink-500/5 border border-rose-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-rose-400" />
              <span className="text-sm font-semibold text-rose-300">AI Scout Summary</span>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-200">{aiSummary}</div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !loading && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500 mb-2">
              Top {results.length} kandidat · sorted by talent score
            </div>
            {results.map(r => (
              <div
                key={r.id}
                className="bg-slate-900 border border-slate-800 hover:border-rose-500/30 rounded-xl p-4 transition group"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    r.rank === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    r.rank === 2 ? 'bg-slate-400/20 text-slate-200 border border-slate-400/40' :
                    r.rank === 3 ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    #{r.rank}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.nama}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{r.cabor}</span>
                      <span>·</span>
                      <span>{r.kontingen}</span>
                      {r.usia && <><span>·</span><span>{r.usia} thn</span></>}
                      {r.jenisKelamin && <><span>·</span><span>{r.jenisKelamin}</span></>}
                    </div>
                    {/* Flags */}
                    {r.flags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {r.flags.map((f, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-rose-300">{r.score}</div>
                    <div className="text-[10px] text-slate-500 uppercase">talent score</div>
                  </div>

                  <ChevronRight size={16} className="text-slate-500 group-hover:text-rose-300 transition" />
                </div>

                {/* Highlights */}
                {r.highlights.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-2">
                    {r.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                        <Star size={10} className="text-rose-400 mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && !aiSummary && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <Search className="mx-auto text-slate-700 mb-3" size={48} />
            <h3 className="text-lg font-semibold mb-1">Belum ada hasil scout</h3>
            <p className="text-slate-500 text-sm">Atur kriteria di atas, lalu klik <b>Run Talent Scout</b>.</p>
          </div>
        )}
      </div>
    </div>
  )
}
