'use client'

import { useState, useEffect } from 'react'
import {
  Trophy, Medal, RefreshCw, Download, Loader2, AlertCircle, Sparkles,
  Sword, Waves, Mountain, Target,
} from 'lucide-react'

export default function StandingsClient({
  eventId, event, phases, defaultPhaseId,
}: {
  eventId: string
  event: any
  phases: any[]
  defaultPhaseId?: string
}) {
  const [phaseId, setPhaseId] = useState<string>(defaultPhaseId ?? phases[0]?.id ?? '')
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Load standings
  const load = async () => {
    if (!phaseId) return
    setLoading(true); setErrorMsg(null)
    try {
      const res = await fetch(`/api/pentascore/events/${eventId}/standings?phase_id=${phaseId}`)
      if (!res.ok) throw new Error((await res.json()).error)
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [phaseId])

  // Auto-refresh every 15s if enabled
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [autoRefresh, phaseId])

  const recompute = async () => {
    setLoading(true); setErrorMsg(null)
    try {
      const res = await fetch(`/api/pentascore/events/${eventId}/standings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_id: phaseId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await load()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    if (!data?.standings) return
    const rows = data.standings
    const headers = ['Pos','Nama','UIPM ID','Gender','Negara','Affiliation','Fencing','Swimming','Obstacle','LaserRun','Total MP']
    const csv = [
      headers.join(','),
      ...rows.map((r: any) => [
        r.position, q(r.nama_lengkap), q(r.uipm_id ?? ''), r.gender,
        q(r.negara_code ?? ''), q(r.affiliation_nama ?? ''),
        r.fencing_pts, r.swimming_pts, r.obstacle_pts, r.laserrun_pts, r.total_mp_points,
      ].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `standings_${data.phase?.phase_label?.replace(/\s+/g, '_') ?? 'phase'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const q = (s: any) => `"${String(s).replace(/"/g, '""')}"`

  if (phases.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
        <AlertCircle size={32} className="mx-auto mb-3 text-slate-500" />
        <div className="text-sm text-slate-400">Belum ada phase. Setup dulu.</div>
      </div>
    )
  }

  const standings = data?.standings ?? []
  const currentPhase = phases.find(p => p.id === phaseId)

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={phaseId}
            onChange={e => setPhaseId(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
          >
            {phases.map(p => (
              <option key={p.id} value={p.id}>
                {p.phase_label} · {p.gender === 'L' ? 'Pria' : 'Wanita'}
              </option>
            ))}
          </select>

          {currentPhase && (
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
              currentPhase.is_locked
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-green-500/15 text-green-300 border-green-500/30'
            }`}>
              {currentPhase.is_locked ? '🔒 LOCKED' : 'LIVE'}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="accent-amber-500"
              />
              Auto-refresh 15s
            </label>
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh
            </button>
            <button
              onClick={recompute}
              disabled={loading}
              className="px-3 py-2 bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-bold rounded transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles size={12} /> Materialize
            </button>
            <button
              onClick={exportCsv}
              disabled={!standings.length}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {/* Standings table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        {standings.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Trophy size={32} className="mx-auto mb-3 opacity-50" />
            <div className="text-sm">Belum ada hasil. Input results dulu.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase w-12">#</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Atlet</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Negara</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">
                    <span className="flex items-center justify-end gap-1"><Sword size={10}/> Fencing</span>
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">
                    <span className="flex items-center justify-end gap-1"><Waves size={10}/> Swim</span>
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">
                    <span className="flex items-center justify-end gap-1"><Mountain size={10}/> Obstacle</span>
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">
                    <span className="flex items-center justify-end gap-1"><Target size={10}/> LR</span>
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-amber-400 uppercase">TOTAL MP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {standings.map((r: any, i: number) => {
                  const medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null
                  return (
                    <tr
                      key={r.event_athlete_id}
                      className={
                        medal === 'gold'   ? 'bg-amber-500/5 hover:bg-amber-500/10' :
                        medal === 'silver' ? 'bg-slate-400/5 hover:bg-slate-400/10' :
                        medal === 'bronze' ? 'bg-orange-700/5 hover:bg-orange-700/10' :
                        'hover:bg-slate-800/30'
                      }
                    >
                      <td className="px-3 py-3 text-center">
                        {medal ? (
                          <div className="flex items-center justify-center">
                            <Medal size={16} className={
                              medal === 'gold' ? 'text-amber-400 fill-amber-400/30' :
                              medal === 'silver' ? 'text-slate-300 fill-slate-300/30' :
                              'text-orange-600 fill-orange-600/30'
                            } />
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-sm font-bold">{r.position}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {r.gender === 'L'
                            ? <span className="text-blue-400 font-bold text-[11px] select-none">♂</span>
                            : <span className="text-pink-400 font-bold text-[11px] select-none">♀</span>}
                          <div>
                            <div className="text-white font-semibold">{r.nama_lengkap}</div>
                            <div className="text-[10px] text-slate-500">
                              {r.uipm_id && <span className="font-mono">{r.uipm_id}</span>}
                              {r.start_number && <span className="ml-2 text-amber-400">#{r.start_number}</span>}
                              {r.affiliation_nama && <span className="ml-2">{r.affiliation_nama}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-300 text-xs">{r.negara_code ?? '—'}</td>
                      <td className="px-3 py-3 text-right text-slate-200 font-mono">{r.fencing_pts}</td>
                      <td className="px-3 py-3 text-right text-slate-200 font-mono">{r.swimming_pts}</td>
                      <td className="px-3 py-3 text-right text-slate-200 font-mono">{r.obstacle_pts}</td>
                      <td className="px-3 py-3 text-right text-slate-200 font-mono">{r.laserrun_pts}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`text-base font-bold font-mono ${
                          medal === 'gold'   ? 'text-amber-300' :
                          medal === 'silver' ? 'text-slate-200' :
                          medal === 'bronze' ? 'text-orange-400' :
                          'text-white'
                        }`}>
                          {r.total_mp_points}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {data?.computed_at && (
        <div className="text-center text-[10px] text-slate-500">
          Last computed: {new Date(data.computed_at).toLocaleTimeString()} · Formula <code className="text-amber-300">uipm-2026-v1</code>
        </div>
      )}
    </div>
  )
}
