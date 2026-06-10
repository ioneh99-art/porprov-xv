'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Layers, Users, Trash2, Lock, Unlock, Sparkles,
  Calendar, Zap, AlertCircle, X, ChevronDown, ChevronRight,
  Shuffle, Loader2, Edit2,
} from 'lucide-react'

type Phase = any
type Event_ = any

export default function PhasesSetupClient({
  eventId, event, initialPhases, enrolledCount,
}: {
  eventId: string; event: Event_; initialPhases: Phase[]; enrolledCount: number
}) {
  const router = useRouter()
  const [phases, setPhases] = useState<Phase[]>(initialPhases)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(initialPhases.map(p => [p.id, true]))
  )
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showAutoModal, setShowAutoModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)

  // ─────────────────────────────────────────
  // Auto-generate phases
  // ─────────────────────────────────────────
  const autoGen = async (template: string) => {
    setLoading(true); setErrorMsg(null)
    try {
      const res = await fetch(`/api/pentascore/events/${eventId}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: template, gender_mode: event.gender_mode }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { created } = await res.json()
      setPhases(prev => [...prev, ...created].sort((a, b) => a.sort_order - b.sort_order))
      setShowAutoModal(false)
      router.refresh()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-distribute athletes to groups for a phase
  const autoDistribute = async (phaseId: string, count: number, mode: 'snake' | 'sequential') => {
    setLoading(true); setErrorMsg(null)
    try {
      const res = await fetch(`/api/pentascore/phases/${phaseId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: mode, count }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
      setTimeout(() => window.location.reload(), 200)
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Toggle lock
  const toggleLock = async (phase: Phase) => {
    const isLocking = !phase.is_locked
    let reason: string | undefined
    if (!isLocking) {
      reason = prompt('Unlock requires a reason:') ?? undefined
      if (!reason) return
    }
    try {
      const res = await fetch(`/api/pentascore/phases/${phase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_locked: isLocking, reason }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await res.json()
      setPhases(prev => prev.map(p => p.id === phase.id ? { ...p, ...updated } : p))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const deletePhase = async (phase: Phase) => {
    if (!confirm(`Hapus phase "${phase.phase_label}"? Akan menghapus semua groups + results.`)) return
    try {
      const res = await fetch(`/api/pentascore/phases/${phase.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setPhases(prev => prev.filter(p => p.id !== phase.id))
      router.refresh()
    } catch (e: any) { alert(e.message) }
  }

  // ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatPill icon={Users}   label="Athletes Enrolled" value={enrolledCount} />
        <StatPill icon={Layers}  label="Phases Configured" value={phases.length} />
        <StatPill icon={Lock}    label="Locked"
          value={phases.filter(p => p.is_locked).length}
          color={phases.some(p => p.is_locked) ? 'amber' : 'slate'} />
        <StatPill icon={Sparkles} label="Formula"
          value={event.formula_version ?? '—'} small />
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-slate-400">
          <strong className="text-white">{phases.length}</strong> phases · {enrolledCount} athletes enrolled
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutoModal(true)}
            disabled={loading}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Zap size={12} /> Auto-Generate
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
          >
            <Plus size={12} /> Add Single Phase
          </button>
        </div>
      </div>

      {/* Phases list */}
      <div className="space-y-3">
        {phases.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
            <Layers size={32} className="mx-auto mb-3 text-slate-500" />
            <div className="text-sm text-slate-400 mb-3">Belum ada phase configured</div>
            <button
              onClick={() => setShowAutoModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg inline-flex items-center gap-2 transition"
            >
              <Zap size={14} /> Auto-Generate (Recommended)
            </button>
          </div>
        ) : phases.map(p => (
          <PhaseCard
            key={p.id}
            phase={p}
            expanded={!!expanded[p.id]}
            onToggle={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}
            onLockToggle={() => toggleLock(p)}
            onDelete={() => deletePhase(p)}
            onAutoDistribute={(count: number, mode: 'snake' | 'sequential') => autoDistribute(p.id, count, mode)}
            loading={loading}
          />
        ))}
      </div>

      {/* Auto-generate modal */}
      {showAutoModal && (
        <Modal title="Auto-Generate Phases" onClose={() => setShowAutoModal(false)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Pilih template phase structure. Phases akan dibuat untuk gender mode:
              <strong className="text-amber-300 ml-1">{event.gender_mode === 'both' ? 'Pria + Wanita' : event.gender_mode}</strong>
            </p>
            <TemplateOption
              code="quali_only"
              label="Quali Only"
              desc="1 Quali phase saja (untuk simple ranking event)"
              onClick={() => autoGen('quali_only')}
              loading={loading}
            />
            <TemplateOption
              code="standard"
              label="Standard"
              desc="2 Quali (A, B) + 1 Final (18 atlet) — paling umum"
              onClick={() => autoGen('standard')}
              loading={loading}
              recommended
            />
            <TemplateOption
              code="full"
              label="Full UIPM"
              desc="4 Quali + 2 Semi + 1 Final (sesuai UIPM World Cup)"
              onClick={() => autoGen('full')}
              loading={loading}
            />
          </div>
        </Modal>
      )}

      {showManualModal && (
        <ManualPhaseModal
          eventId={eventId}
          onClose={() => setShowManualModal(false)}
          onCreated={(p: any) => {
            setPhases(prev => [...prev, p].sort((a, b) => a.sort_order - b.sort_order))
            setShowManualModal(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
function PhaseCard({ phase, expanded, onToggle, onLockToggle, onDelete, onAutoDistribute, loading }: any) {
  const groups = phase.ps_groups ?? []
  const totalAssigned = groups.reduce((s: number, g: any) => s + (g.ps_group_athletes?.length ?? 0), 0)
  const [showDistMenu, setShowDistMenu] = useState(false)
  const [distCount, setDistCount] = useState(2)

  const phaseTypeColor = {
    quali: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    semi:  'bg-purple-500/10 border-purple-500/30 text-purple-300',
    final: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  }[phase.phase_type as string] || 'bg-slate-700/50 text-slate-300'

  return (
    <div className={`rounded-xl border bg-slate-900/40 ${phase.is_locked ? 'border-amber-500/30' : 'border-slate-700'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${phaseTypeColor}`}>
            {phase.phase_type}
          </span>
          <div className="text-white font-bold">{phase.phase_label}</div>
          {phase.gender === 'L' ? (
            <span className="inline-flex items-center gap-1 text-blue-300 text-xs">
              <span className="font-bold text-[11px] select-none">♂</span> Pria
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-pink-300 text-xs">
              <span className="font-bold text-[11px] select-none">♀</span> Wanita
            </span>
          )}
          {phase.is_locked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Lock size={9} /> LOCKED
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{groups.length} groups</span>
          <span>{totalAssigned} athletes</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-3">
          {/* Phase actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-slate-500">
              {phase.tanggal && <span>Tanggal: <span className="text-slate-300">{phase.tanggal}</span> · </span>}
              {phase.expected_size && <span>Expected: <span className="text-slate-300">{phase.expected_size}</span></span>}
            </div>
            <div className="flex items-center gap-2">
              {phase.phase_type === 'quali' && !phase.is_locked && (
                <div className="relative">
                  <button
                    onClick={() => setShowDistMenu(s => !s)}
                    className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 text-xs font-bold rounded flex items-center gap-1.5 transition"
                  >
                    <Shuffle size={11} /> Auto-Distribute Athletes
                  </button>
                  {showDistMenu && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 z-10">
                      <div className="text-xs text-slate-400 mb-2">Number of groups:</div>
                      <div className="flex items-center gap-1 mb-3">
                        {[1,2,3,4,5,6].map(n => (
                          <button
                            key={n}
                            onClick={() => setDistCount(n)}
                            className={`w-8 h-8 rounded font-bold text-xs transition ${
                              distCount === n ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >{n}</button>
                        ))}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => { onAutoDistribute(distCount, 'snake'); setShowDistMenu(false) }}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded transition disabled:opacity-50"
                          disabled={loading}
                        >Snake (Balanced)</button>
                        <button
                          onClick={() => { onAutoDistribute(distCount, 'sequential'); setShowDistMenu(false) }}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded transition disabled:opacity-50"
                          disabled={loading}
                        >Sequential (Round Robin)</button>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-2">
                        ⚠ Akan replace existing group assignments
                      </p>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={onLockToggle}
                className={`p-1.5 rounded transition text-xs flex items-center gap-1.5 ${
                  phase.is_locked
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-transparent'
                }`}
                title={phase.is_locked ? 'Unlock' : 'Lock'}
              >
                {phase.is_locked ? <Unlock size={11} /> : <Lock size={11} />}
                <span className="px-1">{phase.is_locked ? 'Unlock' : 'Lock'}</span>
              </button>
              {!phase.is_locked && (
                <button
                  onClick={onDelete}
                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Groups */}
          {groups.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm bg-slate-900/30 rounded border border-dashed border-slate-700">
              No groups yet. {phase.phase_type === 'quali' ? 'Use auto-distribute to assign athletes.' : 'This phase uses direct enrollment without groups.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups.map((g: any) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group }: { group: any }) {
  const athletes = group.ps_group_athletes ?? []
  return (
    <div className="bg-slate-900/60 rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center">
            {group.group_label}
          </div>
          <div className="text-xs text-slate-400">Group {group.group_label}</div>
        </div>
        <div className="text-xs text-slate-500">{athletes.length} atlet</div>
      </div>
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {athletes.length === 0 && <div className="text-xs text-slate-600">Empty</div>}
        {athletes.map((ga: any) => {
          const ea = ga.ps_event_athletes
          return (
            <div key={ga.id} className="text-xs text-slate-300 flex items-center gap-2 py-0.5">
              {ea?.start_number && (
                <span className="text-amber-400 font-mono text-[10px] w-6 text-right">{ea.start_number}</span>
              )}
              <span className="flex-1 truncate">{ea?.nama_lengkap}</span>
              {ea?.gender === 'L'
                ? <span className="text-blue-400 font-bold text-[10px] select-none">♂</span>
                : <span className="text-pink-400 font-bold text-[10px] select-none">♀</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatPill({ icon: Icon, label, value, color = 'slate', small }: any) {
  const colors = {
    slate: 'bg-slate-900/60 border-slate-800 text-white',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
  }
  return (
    <div className={`p-3 rounded-lg border ${colors[color as 'slate'|'amber']}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider mb-1">
        <Icon size={10} /> {label}
      </div>
      <div className={small ? 'text-sm font-mono text-amber-300' : 'text-xl font-bold'}>
        {value}
      </div>
    </div>
  )
}

function TemplateOption({ code, label, desc, onClick, loading, recommended }: any) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full text-left p-4 rounded-lg border transition ${
        recommended
          ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
          : 'bg-slate-900/40 border-slate-700 hover:border-amber-500/30'
      } disabled:opacity-50`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={recommended ? 'text-amber-200 font-bold' : 'text-white font-bold'}>{label}</div>
        {recommended && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-900 font-bold">RECOMMENDED</span>}
      </div>
      <div className="text-xs text-slate-400">{desc}</div>
    </button>
  )
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function ManualPhaseModal({ eventId, onClose, onCreated }: any) {
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    phase_type: 'quali',
    phase_label: 'Quali A',
    gender: 'L',
    tanggal: '',
    waktu_mulai: '',
    expected_size: '',
    sort_order: 99,
  })

  const submit = async () => {
    setSubmitting(true); setErr(null)
    try {
      const res = await fetch(`/api/pentascore/events/${eventId}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expected_size: form.expected_size ? parseInt(form.expected_size) : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      onCreated(data)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Add Single Phase" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select
              value={form.phase_type}
              onChange={e => setForm(f => ({ ...f, phase_type: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="quali">Quali</option>
              <option value="semi">Semi</option>
              <option value="final">Final</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="L">Pria (L)</option>
              <option value="P">Wanita (P)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Label</label>
          <input
            value={form.phase_label}
            onChange={e => setForm(f => ({ ...f, phase_label: e.target.value }))}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
            placeholder="Quali A"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tanggal</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Time</label>
            <input
              type="time"
              value={form.waktu_mulai}
              onChange={e => setForm(f => ({ ...f, waktu_mulai: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Expected Size</label>
            <input
              type="number"
              value={form.expected_size}
              onChange={e => setForm(f => ({ ...f, expected_size: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-amber-500"
              placeholder="18"
            />
          </div>
        </div>
        {err && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {err}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-3 py-2 text-sm text-slate-400 hover:text-white" disabled={submitting}>Cancel</button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded transition disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
