'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, AlertCircle, Save, Sparkles, Trophy, Sword,
  Award, RotateCcw, X,
} from 'lucide-react'

const FENCING_DE_POINTS: Record<number, number> = {
  1:250,2:244,3:238,4:236,5:230,6:228,7:226,8:224,
  9:218,10:216,11:214,12:212,13:210,14:208,15:206,16:204,
  17:198,18:196,
}

export default function BracketClient({
  eventId, phases, defaultPhaseId,
}: {
  eventId: string
  phases: any[]
  defaultPhaseId?: string
}) {
  const [phaseId, setPhaseId] = useState<string>(defaultPhaseId ?? phases[0]?.id ?? '')
  const [athletes, setAthletes] = useState<any[]>([])
  const [positions, setPositions] = useState<Record<string, number>>({})
  const [originalPositions, setOriginalPositions] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const currentPhase = phases.find(p => p.id === phaseId)
  const isLocked = !!currentPhase?.is_locked
  const dirty = JSON.stringify(positions) !== JSON.stringify(originalPositions)

  useEffect(() => {
    if (!phaseId || !currentPhase) return
    setLoading(true); setErrorMsg(null)

    Promise.all([
      fetch(`/api/pentascore/athletes?event_id=${eventId}`).then(r => r.json()),
      fetch(`/api/pentascore/phases/${phaseId}/de-results`).then(r => r.json()),
    ]).then(([all, deResults]) => {
      const filtered = (all ?? []).filter((a: any) => a.gender === currentPhase.gender)
      setAthletes(filtered)

      // Pre-populate positions from existing DE results
      const posMap: Record<string, number> = {}
      for (const r of deResults ?? []) {
        if (r.event_athlete_id && r.de_position) {
          posMap[r.event_athlete_id] = r.de_position
        }
      }
      setPositions(posMap)
      setOriginalPositions(posMap)
    }).catch(e => setErrorMsg(e.message)).finally(() => setLoading(false))
  }, [phaseId])

  const setPosition = (eaId: string, pos: number) => {
    if (pos < 1 || pos > 18) return
    setPositions(prev => {
      const next: Record<string, number> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (v !== pos && k !== eaId) next[k] = v
      }
      next[eaId] = pos
      return next
    })
  }

  const clearPosition = (eaId: string) => {
    setPositions(prev => {
      const { [eaId]: _, ...rest } = prev
      return rest
    })
  }

  const resetChanges = () => {
    setPositions(originalPositions)
    setSavedAt(null)
  }

  const save = async () => {
    setSaving(true); setErrorMsg(null); setSavedAt(null)
    try {
      const entries = Object.entries(positions)
      if (!entries.length) throw new Error('No positions assigned')

      const payload = {
        phase_id: phaseId,
        results: entries.map(([eaId, pos]) => ({
          event_athlete_id: eaId,
          de_position: pos,
          status: 'completed',
        })),
      }
      const res = await fetch('/api/pentascore/results/fencing-de', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSavedAt(new Date().toLocaleTimeString())
      setOriginalPositions(positions)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (phases.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
        <AlertCircle size={32} className="mx-auto mb-3 text-slate-500" />
        <div className="text-sm text-slate-400">
          Belum ada phase Semi/Final. DE Bracket hanya tersedia untuk phase tipe Semi atau Final.
        </div>
      </div>
    )
  }

  const positionMap: Record<number, any> = {}
  for (const [eaId, pos] of Object.entries(positions)) {
    const a = athletes.find(x => x.id === eaId)
    if (a) positionMap[pos] = a
  }
  const filled = Object.keys(positions).length

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex items-center gap-3 flex-wrap">
        <select
          value={phaseId}
          onChange={e => setPhaseId(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
        >
          {phases.map(p => (
            <option key={p.id} value={p.id}>
              {p.phase_label} · {p.gender === 'L' ? 'Pria' : 'Wanita'} {p.is_locked ? '🔒' : ''}
            </option>
          ))}
        </select>

        <div className="text-xs text-slate-500 ml-2">
          {filled}/18 positions assigned
          {filled > 0 && (
            <span className="ml-2">· {Object.keys(originalPositions).length} saved</span>
          )}
        </div>

        {dirty && (
          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
            ● Unsaved
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {savedAt && (
            <span className="text-xs text-green-400">✓ Saved at {savedAt}</span>
          )}
          {dirty && (
            <button
              onClick={resetChanges}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition flex items-center gap-1.5"
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || isLocked || !dirty}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save DE Results
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <div className="text-xs">Loading bracket...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Athletes pool */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Sword size={14} /> Athletes Pool ({athletes.length})
              </h3>
              <span className="text-[10px] text-slate-500">
                {athletes.length - filled} unassigned
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Input DE position 1-18 → MP otomatis lookup
            </p>
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {athletes.map(a => {
                const assignedPos = positions[a.id]
                const isAssigned = !!assignedPos
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2 p-2 rounded text-sm transition ${
                      isAssigned
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'bg-slate-900/50 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {a.gender === 'L'
                      ? <span className="text-blue-400 font-bold text-[11px] shrink-0 select-none">♂</span>
                      : <span className="text-pink-400 font-bold text-[11px] shrink-0 select-none">♀</span>}
                    <span className="flex-1 truncate text-white text-sm">{a.nama_lengkap}</span>
                    {a.start_number && (
                      <span className="text-[10px] text-amber-400 font-mono">#{a.start_number}</span>
                    )}
                    {isAssigned && (
                      <span className="text-[10px] text-amber-300 font-mono font-bold">
                        {FENCING_DE_POINTS[assignedPos]}MP
                      </span>
                    )}
                    <input
                      type="number" min="1" max="18"
                      value={assignedPos ?? ''}
                      onChange={e => {
                        const v = parseInt(e.target.value)
                        if (isNaN(v)) clearPosition(a.id)
                        else setPosition(a.id, v)
                      }}
                      disabled={isLocked}
                      placeholder="—"
                      className={`w-12 px-1 py-1 bg-slate-950 border rounded text-center text-xs font-bold focus:outline-none disabled:opacity-50 ${
                        isAssigned
                          ? 'border-amber-500/40 text-amber-300'
                          : 'border-slate-700 text-slate-300 focus:border-amber-500'
                      }`}
                    />
                    {isAssigned && !isLocked && (
                      <button
                        onClick={() => clearPosition(a.id)}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                        title="Clear"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT: SVG Bracket */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy size={14} /> 18-Position Final Bracket
              </h3>
              <span className="text-[10px] text-slate-500">Appendix 2B2</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              MP Points lookup: 250 → 196
            </p>
            <BracketSvg positionMap={positionMap} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
function BracketSvg({ positionMap }: { positionMap: Record<number, any> }) {
  const tiers: { tier: string; positions: number[]; pts: number[]; color: string }[] = [
    { tier: 'GOLD',     positions: [1],        pts: [250], color: '#FBBF24' },
    { tier: 'SILVER',   positions: [2],        pts: [244], color: '#CBD5E1' },
    { tier: 'BRONZE',   positions: [3],        pts: [238], color: '#FB923C' },
    { tier: '4',        positions: [4],        pts: [236], color: '#94A3B8' },
    { tier: 'SF',       positions: [5,6,7,8],  pts: [230,228,226,224], color: '#60A5FA' },
    { tier: 'QF',       positions: [9,10,11,12,13,14,15,16], pts: [218,216,214,212,210,208,206,204], color: '#A78BFA' },
    { tier: 'R32',      positions: [17,18],    pts: [198,196], color: '#94A3B8' },
  ]

  return (
    <div className="overflow-x-auto">
      <div className="space-y-2 min-w-[400px]">
        {tiers.map(({ tier, positions, pts, color }) => (
          <div key={tier} className="rounded border border-slate-800 overflow-hidden">
            <div
              className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800 flex items-center justify-between"
              style={{ color, backgroundColor: `${color}10` }}
            >
              <span className="flex items-center gap-1.5">
                {['GOLD','SILVER','BRONZE'].includes(tier) && <Award size={11} fill={color} />}
                {tier}
              </span>
              <span className="opacity-50">
                pos {positions[0]}{positions.length > 1 ? `-${positions[positions.length-1]}` : ''}
              </span>
            </div>
            <div className="divide-y divide-slate-800">
              {positions.map((pos, i) => {
                const ath = positionMap[pos]
                return (
                  <div
                    key={pos}
                    className={`flex items-center gap-2 px-3 py-2 ${
                      ath ? 'bg-slate-900/40' : 'bg-slate-900/20'
                    }`}
                  >
                    <span className="font-mono text-xs text-slate-500 w-6 text-right">{pos}.</span>
                    {ath ? (
                      <>
                        {ath.gender === 'L'
                          ? <span className="text-blue-400 font-bold text-[10px] shrink-0 select-none">♂</span>
                          : <span className="text-pink-400 font-bold text-[10px] shrink-0 select-none">♀</span>}
                        <span className="text-white text-sm flex-1 truncate">{ath.nama_lengkap}</span>
                        {ath.start_number && (
                          <span className="text-[9px] text-amber-500 font-mono">#{ath.start_number}</span>
                        )}
                      </>
                    ) : (
                      <span className="flex-1 text-xs text-slate-700 italic">— empty —</span>
                    )}
                    <span
                      className="text-xs font-mono font-bold ml-auto"
                      style={{ color }}
                    >
                      {pts[i]} MP
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
