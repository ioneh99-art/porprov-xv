'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GripVertical, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'

type Athlete = {
  ga_id: string       // group_athlete id
  ea_id: string       // event_athlete id
  nama_lengkap: string
  gender: string
  start_number: number | null
}

type Group = {
  id: string
  group_label: string
  athletes: Athlete[]
}

/**
 * Native HTML5 drag-and-drop. No library deps.
 * Drop atlet ke target group → PUT API → optimistic update.
 */
export default function GroupReorderClient({
  initialGroups, phaseId, phaseLocked,
}: {
  initialGroups: Group[]
  phaseId: string
  phaseLocked: boolean
}) {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>(initialGroups)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overGroupId, setOverGroupId] = useState<string | null>(null)
  const [moving, setMoving] = useState<Record<string, boolean>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [movedCount, setMovedCount] = useState(0)

  const handleDragStart = (e: React.DragEvent, ga_id: string) => {
    if (phaseLocked) { e.preventDefault(); return }
    setDraggedId(ga_id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', ga_id)
  }

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverGroupId(groupId)
  }

  const handleDragLeave = () => {
    setOverGroupId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()
    setOverGroupId(null)
    if (!draggedId || phaseLocked) return

    // Find source
    let source: Athlete | null = null
    let sourceGroupId = ''
    for (const g of groups) {
      const a = g.athletes.find(a => a.ga_id === draggedId)
      if (a) { source = a; sourceGroupId = g.id; break }
    }
    if (!source || sourceGroupId === targetGroupId) return

    setMoving(m => ({ ...m, [draggedId]: true }))
    setErrorMsg(null)

    // Optimistic UI update
    const prevGroups = groups
    setGroups(prev => prev.map(g => {
      if (g.id === sourceGroupId) return { ...g, athletes: g.athletes.filter(a => a.ga_id !== draggedId) }
      if (g.id === targetGroupId) return { ...g, athletes: [...g.athletes, source!] }
      return g
    }))

    try {
      const res = await fetch(`/api/pentascore/group-athletes/${draggedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_group_id: targetGroupId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMovedCount(c => c + 1)
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
      setGroups(prevGroups)  // rollback
    } finally {
      setMoving(m => ({ ...m, [draggedId!]: false }))
      setDraggedId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 flex items-center gap-3 flex-wrap">
        <div className="text-xs text-slate-400">
          <strong className="text-white">{groups.length}</strong> groups · drag <GripVertical size={11} className="inline mx-0.5 text-slate-500" /> handle untuk pindah atlet
        </div>
        {phaseLocked && (
          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 ml-auto">
            🔒 Phase Locked
          </span>
        )}
        {movedCount > 0 && (
          <span className="text-[10px] text-green-400 flex items-center gap-1 ml-auto">
            <CheckCircle2 size={11} /> {movedCount} moves saved
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {/* Groups grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <div
            key={g.id}
            onDragOver={e => handleDragOver(e, g.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, g.id)}
            className={`rounded-xl border p-3 transition ${
              overGroupId === g.id
                ? 'border-amber-500/50 bg-amber-500/5 scale-[1.01]'
                : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center">
                  {g.group_label}
                </div>
                <div className="text-xs text-slate-400">Group {g.group_label}</div>
              </div>
              <div className="text-[10px] text-slate-500">{g.athletes.length} atlet</div>
            </div>

            <div className="space-y-1 min-h-[80px]">
              {g.athletes.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-600 italic">
                  Drop atlet di sini
                </div>
              ) : g.athletes.map(a => (
                <div
                  key={a.ga_id}
                  draggable={!phaseLocked && !moving[a.ga_id]}
                  onDragStart={e => handleDragStart(e, a.ga_id)}
                  className={`flex items-center gap-2 p-2 rounded text-xs transition cursor-move ${
                    draggedId === a.ga_id
                      ? 'bg-amber-500/20 opacity-50'
                      : 'bg-slate-950/40 hover:bg-slate-900/60'
                  } ${phaseLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <GripVertical size={11} className="text-slate-500 shrink-0" />
                  {a.start_number && (
                    <span className="text-[10px] text-amber-400 font-mono w-6">{a.start_number}</span>
                  )}
                  <span className="flex-1 text-white truncate">{a.nama_lengkap}</span>
                  {a.gender === 'L'
                    ? <span className="text-blue-400 font-bold text-[10px] select-none">♂</span>
                    : <span className="text-pink-400 font-bold text-[10px] select-none">♀</span>}
                  {moving[a.ga_id] && <Loader2 size={10} className="animate-spin text-amber-400" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="text-[10px] text-slate-500 bg-slate-900/30 rounded p-3 border border-slate-800">
        <strong className="text-amber-300">💡 Tips:</strong> Drag-and-drop hanya bekerja antara group dalam same phase.
        Setiap perpindahan tercatat di audit log (Defense L3).
      </div>
    </div>
  )
}
