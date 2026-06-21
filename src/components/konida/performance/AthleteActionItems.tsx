'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, ChevronDown } from 'lucide-react'

interface ActionItem {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  judul: string
  cabor_context: string
  owner: string
}

interface Props {
  atletId:    number
  atletNama:  string
  cabor:      string
  baseline:   unknown[]
  accent:     string
}

const PRIORITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'CRITICAL — minggu ini' },
  HIGH:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', label: 'HIGH — 2 minggu' },
  MEDIUM:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', label: 'MEDIUM — 1 bulan' },
}

export function AthleteActionItems({ atletId, atletNama, cabor, baseline, accent }: Props) {
  const [items, setItems]   = useState<ActionItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [open, setOpen]     = useState(false)

  async function generate() {
    if (open && items) { setOpen(false); return }
    setOpen(true)
    if (items) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/performance/atlet-action-items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ atletId, atletNama, cabor, baseline }),
      })
      const data = await res.json()
      if (data.action_items) setItems(data.action_items)
      else setError(data.error || 'Gagal generate action items')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const grouped = items
    ? (['CRITICAL', 'HIGH', 'MEDIUM'] as const).map(p => ({
        priority: p,
        items: items.filter(i => i.priority === p),
      })).filter(g => g.items.length > 0)
    : []

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>

      <button onClick={generate}
        className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/5">
        <AlertTriangle size={14} className="text-red-400 shrink-0"/>
        <span className="text-sm font-bold text-white flex-1">Action Items</span>
        {loading
          ? <Loader2 size={13} className="animate-spin text-zinc-500"/>
          : <ChevronDown size={13} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}/>}
      </button>

      {open && (
        <div className="border-t border-red-500/10 px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-400 py-4 justify-center">
              <Loader2 size={16} className="animate-spin" style={{ color: accent }}/>
              Claude menganalisa situasi atlet...
            </div>
          )}
          {error && (
            <div className="text-xs text-red-400">{error}</div>
          )}
          {!loading && grouped.map(g => {
            const cfg = PRIORITY_CONFIG[g.priority]
            return (
              <div key={g.priority}>
                <div className="text-[9px] font-black uppercase tracking-widest mb-2"
                  style={{ color: cfg.color }}>
                  {cfg.label}
                </div>
                <div className="space-y-2">
                  {g.items.map((item, i) => (
                    <div key={i} className="rounded-xl px-4 py-3 flex gap-3"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                        style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white leading-relaxed">{item.judul}</div>
                        {item.cabor_context && (
                          <div className="text-[10px] text-zinc-500 mt-0.5">{item.cabor_context}</div>
                        )}
                        {item.owner && (
                          <div className="text-[10px] mt-1.5" style={{ color: cfg.color }}>
                            Owner: {item.owner}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
