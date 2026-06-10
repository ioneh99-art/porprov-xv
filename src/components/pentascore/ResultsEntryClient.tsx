'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sword, Waves, Mountain, Target, Save, Loader2, AlertCircle, CheckCircle2,
  RotateCcw, Sparkles, Lock,
} from 'lucide-react'

type Phase = any
type Discipline = 'fencing' | 'swimming' | 'obstacle' | 'laserrun'

const DISCIPLINES: { key: Discipline; label: string; icon: any; color: string }[] = [
  { key: 'fencing',  label: 'Fencing',   icon: Sword,    color: 'red' },
  { key: 'swimming', label: 'Swimming',  icon: Waves,    color: 'blue' },
  { key: 'obstacle', label: 'Obstacle',  icon: Mountain, color: 'green' },
  { key: 'laserrun', label: 'Laser Run', icon: Target,   color: 'amber' },
]

export default function ResultsEntryClient({
  eventId, event, phases, defaultPhaseId, defaultGroupId, defaultDiscipline,
}: {
  eventId: string
  event: any
  phases: Phase[]
  defaultPhaseId?: string
  defaultGroupId?: string
  defaultDiscipline?: string
}) {
  const router = useRouter()
  const [phaseId, setPhaseId] = useState<string>(defaultPhaseId ?? phases[0]?.id ?? '')
  const [groupId, setGroupId] = useState<string>(defaultGroupId ?? '')
  const [discipline, setDiscipline] = useState<Discipline>(
    (defaultDiscipline as Discipline) ?? 'fencing'
  )

  const currentPhase = phases.find(p => p.id === phaseId)
  const isQuali = currentPhase?.phase_type === 'quali'
  const isLocked = !!currentPhase?.is_locked

  // Reset group when phase changes
  useEffect(() => {
    if (!isQuali) setGroupId('')
    else if (!groupId && currentPhase?.ps_groups?.length) {
      setGroupId(currentPhase.ps_groups[0].id)
    }
  }, [phaseId, isQuali])

  if (phases.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
        <AlertCircle size={32} className="mx-auto mb-3 text-slate-500" />
        <div className="text-sm text-slate-400 mb-3">
          Belum ada phase configured. Setup phases dulu.
        </div>
        <a
          href={`/operator/pentascore/events/${eventId}/phases`}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg inline-flex items-center gap-2 transition"
        >
          → Phases Setup
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Phase">
            <select
              value={phaseId}
              onChange={e => setPhaseId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
            >
              {phases.map(p => (
                <option key={p.id} value={p.id}>
                  {p.phase_label} · {p.gender === 'L' ? 'Pria' : 'Wanita'} {p.is_locked ? '🔒' : ''}
                </option>
              ))}
            </select>
          </Field>
          {isQuali && currentPhase?.ps_groups?.length > 0 && (
            <Field label="Group">
              <select
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {currentPhase.ps_groups
                  .sort((a: any, b: any) => a.sort_order - b.sort_order)
                  .map((g: any) => (
                    <option key={g.id} value={g.id}>Group {g.group_label}</option>
                  ))}
              </select>
            </Field>
          )}
          <Field label="Status">
            <div className={`px-3 py-2 rounded border text-sm flex items-center gap-2 ${
              isLocked
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-green-500/10 border-green-500/30 text-green-300'
            }`}>
              {isLocked ? <Lock size={12} /> : <CheckCircle2 size={12} />}
              {isLocked ? 'Phase Locked (read-only)' : 'Phase Open for input'}
            </div>
          </Field>
        </div>
      </div>

      {/* Discipline tabs */}
      <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-800 rounded-lg p-1 overflow-x-auto">
        {DISCIPLINES.map(d => {
          const Icon = d.icon
          const active = discipline === d.key
          return (
            <button
              key={d.key}
              onClick={() => setDiscipline(d.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded font-bold text-xs uppercase transition whitespace-nowrap ${
                active
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
            >
              <Icon size={13} />
              {d.label}
            </button>
          )
        })}
      </div>

      {/* Discipline-specific input panel */}
      {discipline === 'fencing' ? (
        isQuali
          ? <FencingRankingInput phaseId={phaseId} groupId={groupId} locked={isLocked} key={groupId} />
          : <FencingDEInput phaseId={phaseId} locked={isLocked} key={phaseId} />
      ) : (
        <TimeDisciplineInput
          phaseId={phaseId}
          discipline={discipline}
          locked={isLocked}
          key={`${phaseId}-${discipline}`}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FENCING RANKING ROUND (Quali) INPUT
// ════════════════════════════════════════════════════════════════════
function FencingRankingInput({ phaseId, groupId, locked }: any) {
  const [athletes, setAthletes] = useState<any[]>([])
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  // Load group athletes + existing results
  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/pentascore/phases/${phaseId}/groups`).then(r => r.json()),
    ]).then(([groups]) => {
      const g = groups.find((x: any) => x.id === groupId)
      if (g) {
        const list = (g.ps_group_athletes ?? [])
          .map((ga: any) => ga.ps_event_athletes)
          .filter(Boolean)
          .sort((a: any, b: any) => (a.start_number ?? 999) - (b.start_number ?? 999))
        setAthletes(list)
      }
    }).finally(() => setLoading(false))
  }, [phaseId, groupId])

  const totalBouts = Math.max(0, athletes.length - 1)
  const inRange = totalBouts >= 19 && totalBouts <= 60

  const updateResult = (eaId: string, field: string, value: any) => {
    setResults(prev => ({
      ...prev,
      [eaId]: { ...prev[eaId], [field]: value },
    }))
  }

  const submit = async () => {
    setSaving(true); setErrorMsg(null); setSuccessCount(null)
    try {
      const payload = {
        group_id: groupId,
        results: Object.entries(results).map(([eaId, r]: any) => ({
          event_athlete_id: eaId,
          victories: parseInt(r.victories) || 0,
          defeats:   parseInt(r.defeats) || 0,
          red_cards: parseInt(r.red_cards) || 0,
          black_card: !!r.black_card,
        })),
      }
      if (payload.results.length === 0) {
        throw new Error('No results entered')
      }
      const res = await fetch('/api/pentascore/results/fencing-ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSuccessCount(json.success_count)
      if (json.error_count > 0) {
        setErrorMsg(`${json.error_count} row(s) gagal: ${json.errors.map((e: any) => e.error).join(', ')}`)
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (!groupId) return <Hint>Pilih group untuk input Fencing Ranking Round</Hint>
  if (athletes.length === 0) return <Hint>Group ini belum ada atlet. Assign via Phases setup.</Hint>

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Sword size={14} /> Fencing Ranking Round
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {athletes.length} atlet · {totalBouts} bouts per athlete (round-robin)
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded border text-xs font-bold ${
          inRange
            ? 'bg-green-500/10 border-green-500/30 text-green-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {inRange ? '✓ Within Appendix 2B1 range' : `✗ Out of range (need 19-60 bouts)`}
        </div>
      </div>

      {/* Input table */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Atlet</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-20">V</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-20">D</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-24">Red Card</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-24">Black</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-amber-400 uppercase w-24">MP Pts (preview)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {athletes.map(a => {
              const r = results[a.id] ?? {}
              const v = parseInt(r.victories) || 0
              const d = parseInt(r.defeats) || 0
              const rc = parseInt(r.red_cards) || 0
              const bc = !!r.black_card
              const computedPts = bc ? 0 : computeFencingRanking(v, totalBouts, rc)
              const sumValid = (v + d === totalBouts)
              return (
                <tr key={a.id} className={!sumValid && (v || d) ? 'bg-red-500/5' : ''}>
                  <td className="px-3 py-2">
                    <div className="text-white text-sm font-medium">{a.nama_lengkap}</div>
                    <div className="text-[10px] text-slate-500">
                      {a.start_number && <span className="text-amber-400 mr-2">#{a.start_number}</span>}
                      {a.uipm_id}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0" max={totalBouts}
                      value={r.victories ?? ''}
                      onChange={e => updateResult(a.id, 'victories', e.target.value)}
                      disabled={locked}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-center text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0" max={totalBouts}
                      value={r.defeats ?? ''}
                      onChange={e => updateResult(a.id, 'defeats', e.target.value)}
                      disabled={locked}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-center text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0" max="10"
                      value={r.red_cards ?? ''}
                      onChange={e => updateResult(a.id, 'red_cards', e.target.value)}
                      disabled={locked}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-center text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={bc}
                      onChange={e => updateResult(a.id, 'black_card', e.target.checked)}
                      disabled={locked}
                      className="accent-red-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(v || d) && sumValid ? (
                      <span className={`text-sm font-bold font-mono ${bc ? 'text-red-400' : 'text-amber-300'}`}>
                        {computedPts}
                      </span>
                    ) : (
                      <span className="text-slate-700 text-xs">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <ActionFooter
        locked={locked}
        saving={saving}
        errorMsg={errorMsg}
        successCount={successCount}
        onSubmit={submit}
        submitLabel={`Save ${Object.keys(results).length} Results`}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FENCING DE INPUT (Semi/Final)
// ════════════════════════════════════════════════════════════════════
function FencingDEInput({ phaseId, locked }: any) {
  const [athletes, setAthletes] = useState<any[]>([])
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  useEffect(() => {
    if (!phaseId) return
    setLoading(true)
    // Get phase to find event_id + gender
    fetch(`/api/pentascore/events/${phaseId.split('/')[0]}/phases`).then(() => {})
    // Simpler: fetch standings (which has athletes) or direct enrolled atlet via phase
    fetch(`/api/pentascore/athletes?event_id=${getEventIdFromHash()}`).then(r => r.json()).then((data: any[]) => {
      setAthletes(data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [phaseId])

  const submit = async () => {
    setSaving(true); setErrorMsg(null); setSuccessCount(null)
    try {
      const entries = Object.entries(results).filter(([_, r]: any) => r.de_position)
      if (!entries.length) throw new Error('No DE positions entered')
      const payload = {
        phase_id: phaseId,
        results: entries.map(([eaId, r]: any) => ({
          event_athlete_id: eaId,
          de_position:      parseInt(r.de_position),
          seeding_position: r.seeding_position ? parseInt(r.seeding_position) : undefined,
          seeding_victories:r.seeding_victories ? parseInt(r.seeding_victories) : undefined,
          seeding_defeats:  r.seeding_defeats ? parseInt(r.seeding_defeats) : undefined,
          status:           r.status ?? 'completed',
        })),
      }
      const res = await fetch('/api/pentascore/results/fencing-de', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSuccessCount(json.success_count)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 space-y-4">
      <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
        <Sword size={14} /> Fencing Direct Elimination
      </h3>
      <p className="text-xs text-slate-400">
        Input DE position (1-18). MP points di-lookup dari Appendix 2B2.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Atlet</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-amber-400 uppercase w-24">DE Position</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-24">Seeding #</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-16">V</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-16">D</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-amber-400 uppercase w-24">MP Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {athletes.map(a => {
              const r = results[a.id] ?? {}
              const pos = parseInt(r.de_position) || 0
              const pts = pos >= 1 && pos <= 18 ? FENCING_DE_LOOKUP[pos] : null
              return (
                <tr key={a.id}>
                  <td className="px-3 py-2 text-white">{a.nama_lengkap}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="1" max="18"
                      value={r.de_position ?? ''}
                      onChange={e => setResults(p => ({ ...p, [a.id]: { ...p[a.id], de_position: e.target.value } }))}
                      disabled={locked}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-amber-300 text-center text-sm font-bold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="1" max="36"
                      value={r.seeding_position ?? ''}
                      onChange={e => setResults(p => ({ ...p, [a.id]: { ...p[a.id], seeding_position: e.target.value } }))}
                      disabled={locked}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-center text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0"
                      value={r.seeding_victories ?? ''}
                      onChange={e => setResults(p => ({ ...p, [a.id]: { ...p[a.id], seeding_victories: e.target.value } }))}
                      disabled={locked}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-center text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0"
                      value={r.seeding_defeats ?? ''}
                      onChange={e => setResults(p => ({ ...p, [a.id]: { ...p[a.id], seeding_defeats: e.target.value } }))}
                      disabled={locked}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-center text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-amber-300 font-mono font-bold">
                    {pts ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ActionFooter
        locked={locked}
        saving={saving}
        errorMsg={errorMsg}
        successCount={successCount}
        onSubmit={submit}
        submitLabel={`Save DE Results`}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// TIME DISCIPLINE INPUT (Swimming/Obstacle/LaserRun)
// ════════════════════════════════════════════════════════════════════
function TimeDisciplineInput({ phaseId, discipline, locked }: any) {
  const [athletes, setAthletes] = useState<any[]>([])
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  useEffect(() => {
    if (!phaseId) return
    setLoading(true)
    fetch(`/api/pentascore/athletes?event_id=${getEventIdFromHash()}`).then(r => r.json()).then((data: any[]) => {
      setAthletes(data ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [phaseId])

  const submit = async () => {
    setSaving(true); setErrorMsg(null); setSuccessCount(null)
    try {
      const entries = Object.entries(results).filter(([_, r]: any) => r.time_str || r.status)
      if (!entries.length) throw new Error('No times entered')
      const payload = {
        phase_id: phaseId,
        discipline,
        results: entries.map(([eaId, r]: any) => ({
          event_athlete_id: eaId,
          time_str:         r.time_str || undefined,
          penalty_points:   r.penalty_points ? parseInt(r.penalty_points) : 0,
          status:           r.status ?? 'completed',
        })),
      }
      const res = await fetch('/api/pentascore/results/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSuccessCount(json.success_count)
      if (json.error_count > 0) {
        setErrorMsg(`${json.error_count} row(s) gagal: ${json.errors.map((e: any) => e.error).join(', ')}`)
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  const DiscIcon = DISCIPLINES.find(d => d.key === discipline)!.icon
  const discLabel = DISCIPLINES.find(d => d.key === discipline)!.label

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
          <DiscIcon size={14} /> {discLabel}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Format waktu: MM:SS.cc (e.g. 02:14.56) · Penalty di-deduct dari MP pts otomatis
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Atlet</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-amber-400 uppercase w-32">Time (MM:SS.cc)</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-24">Penalty</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase w-24">Status</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-amber-400 uppercase w-24">MP Pts (preview)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {athletes.map(a => {
              const r = results[a.id] ?? {}
              const centis = parseTimeStr(r.time_str ?? '')
              const penalty = parseInt(r.penalty_points) || 0
              const status = r.status ?? 'completed'
              let pts: number | null = null
              if (status === 'completed' && centis != null) {
                pts = Math.max(0, computeTimePts(discipline, centis) - penalty)
              }
              return (
                <tr key={a.id}>
                  <td className="px-3 py-2 text-white">
                    {a.nama_lengkap}
                    {a.start_number && <span className="text-amber-400 ml-2 text-xs font-mono">#{a.start_number}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      placeholder="00:00.00"
                      value={r.time_str ?? ''}
                      onChange={e => setResults(p => ({ ...p, [a.id]: { ...p[a.id], time_str: e.target.value } }))}
                      disabled={locked || status !== 'completed'}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-amber-300 text-center text-sm font-mono focus:outline-none focus:border-amber-500 disabled:opacity-30"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min="0"
                      placeholder="0"
                      value={r.penalty_points ?? ''}
                      onChange={e => setResults(p => ({ ...p, [a.id]: { ...p[a.id], penalty_points: e.target.value } }))}
                      disabled={locked}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-white text-center text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.status ?? 'completed'}
                      onChange={e => setResults(p => ({ ...p, [a.id]: { ...p[a.id], status: e.target.value } }))}
                      disabled={locked}
                      className="w-full px-1 py-1 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    >
                      <option value="completed">OK</option>
                      <option value="dnf">DNF</option>
                      <option value="dns">DNS</option>
                      <option value="el">EL</option>
                      <option value="dsq">DSQ</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center font-mono font-bold">
                    {pts != null ? (
                      <span className="text-amber-300">{pts}</span>
                    ) : status !== 'completed' ? (
                      <span className="text-red-400">{status.toUpperCase()} (0)</span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ActionFooter
        locked={locked}
        saving={saving}
        errorMsg={errorMsg}
        successCount={successCount}
        onSubmit={submit}
        submitLabel={`Save ${discLabel} Times`}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Helpers (client-side mirror of pentascore_v1)
// ─────────────────────────────────────────────────────────────────
const FENCING_RANKING_TABLE: Record<number, [number, number]> = {
  19:[13,8],20:[14,8],21:[15,8],22:[15,8],23:[16,7],24:[17,7],25:[18,7],26:[18,7],27:[19,7],28:[20,7],
  29:[20,7],30:[21,6],31:[22,6],32:[22,6],33:[23,6],34:[24,5],35:[25,5],36:[25,5],37:[26,5],38:[27,5],
  39:[27,5],40:[28,4],41:[29,4],42:[29,4],43:[30,4],44:[31,4],45:[32,4],46:[32,4],47:[33,4],48:[34,3],
  49:[34,3],50:[35,3],51:[36,3],52:[36,3],53:[37,3],54:[38,3],55:[39,3],56:[39,3],57:[40,3],58:[41,3],
  59:[41,3],60:[42,3],
}
const FENCING_DE_LOOKUP: Record<number, number> = {
  1:250,2:244,3:238,4:236,5:230,6:228,7:226,8:224,9:218,10:216,11:214,12:212,13:210,14:208,15:206,16:204,17:198,18:196,
}
function computeFencingRanking(v: number, totalBouts: number, redCards: number) {
  const entry = FENCING_RANKING_TABLE[totalBouts]
  if (!entry) return 0
  return 250 + (v - entry[0]) * entry[1] - redCards * 10
}
function computeTimePts(disc: Discipline, centis: number) {
  if (disc === 'swimming') return 600 - Math.floor((5 * centis) / 100)
  if (disc === 'obstacle') return Math.floor((44596 - 3 * centis) / 100)
  if (disc === 'laserrun') return 1300 - Math.floor(centis / 100)
  return 0
}
function parseTimeStr(s: string): number | null {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\.(\d{2})$/)
  if (!m) return null
  return parseInt(m[1]) * 6000 + parseInt(m[2]) * 100 + parseInt(m[3])
}
function getEventIdFromHash(): string {
  if (typeof window === 'undefined') return ''
  const m = window.location.pathname.match(/\/events\/([0-9a-f-]+)/)
  return m?.[1] ?? ''
}

// ─────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ActionFooter({ locked, saving, errorMsg, successCount, onSubmit, submitLabel }: any) {
  return (
    <>
      {errorMsg && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}
      {successCount != null && (
        <div className="p-3 rounded bg-green-500/10 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={14} /> Berhasil simpan <strong>{successCount}</strong> result(s)
        </div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Sparkles size={11} className="text-amber-500" />
          Auto-computed with <code className="text-amber-300">uipm-2026-v1</code>
        </div>
        <button
          onClick={onSubmit}
          disabled={saving || locked}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {locked ? 'Phase Locked' : submitLabel}
        </button>
      </div>
    </>
  )
}

function Loading() {
  return (
    <div className="text-center py-12 text-slate-500">
      <Loader2 size={24} className="animate-spin mx-auto" />
      <div className="text-xs mt-2">Loading...</div>
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-8 text-slate-500 bg-slate-900/30 rounded border border-dashed border-slate-700">
      {children}
    </div>
  )
}
