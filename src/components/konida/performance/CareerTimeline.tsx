'use client'
// src/components/konida/performance/CareerTimeline.tsx
// Horizontal scrollable career timeline visualization untuk atlet dossier
// Marker dot per event, colored by medal type, hover shows tooltip

import { useState, useMemo } from 'react'
import { Trophy, Calendar } from 'lucide-react'

export interface PrestasiEvent {
  id:            number
  event:         string
  tahun:         number
  lokasi:        string
  nomor_tanding: string
  hasil:         'Emas' | 'Perak' | 'Perunggu' | 'Juara 4' | 'Peserta'
  level_event:   'Internasional' | 'Nasional' | 'Provinsi' | 'Kabupaten' | 'Lokal'
  is_demo:       boolean
  submitted_by?: string
}

const HASIL_COLOR: Record<string, string> = {
  'Emas':     '#fbbf24',
  'Perak':    '#cbd5e1',
  'Perunggu': '#cd7f32',
  'Juara 4':  '#6b7280',
  'Peserta':  '#475569',
}

const HASIL_SIZE: Record<string, number> = {
  'Emas':     14,
  'Perak':    12,
  'Perunggu': 11,
  'Juara 4':  8,
  'Peserta':  6,
}

const LEVEL_RANK: Record<string, number> = {
  'Internasional': 5,
  'Nasional':      4,
  'Provinsi':      3,
  'Kabupaten':     2,
  'Lokal':         1,
}

interface Props {
  events:      PrestasiEvent[]
  accent:      string         // cabor accent color
  startYear?:  number          // override timeline start
  endYear?:    number          // override timeline end
}

export function CareerTimeline({ events, accent, startYear, endYear }: Props) {
  const [hoveredEvent, setHoveredEvent] = useState<PrestasiEvent | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  
  const { yearRange, eventsByYear } = useMemo(() => {
    if (events.length === 0) {
      const now = new Date().getFullYear()
      return { yearRange: [now - 5, now] as [number, number], eventsByYear: new Map<number, PrestasiEvent[]>() }
    }
    const years = events.map(e => e.tahun)
    const minY = startYear ?? Math.min(...years)
    const maxY = endYear ?? Math.max(...years, new Date().getFullYear())
    const range: [number, number] = [minY, maxY]
    
    const byYear = new Map<number, PrestasiEvent[]>()
    events.forEach(e => {
      if (!byYear.has(e.tahun)) byYear.set(e.tahun, [])
      byYear.get(e.tahun)!.push(e)
    })
    // Sort each year's events by level rank desc, then hasil priority
    byYear.forEach((evts) => {
      evts.sort((a, b) => {
        const rankDiff = (LEVEL_RANK[b.level_event] || 0) - (LEVEL_RANK[a.level_event] || 0)
        if (rankDiff !== 0) return rankDiff
        const hasilOrder = ['Emas', 'Perak', 'Perunggu', 'Juara 4', 'Peserta']
        return hasilOrder.indexOf(a.hasil) - hasilOrder.indexOf(b.hasil)
      })
    })
    return { yearRange: range, eventsByYear: byYear }
  }, [events, startYear, endYear])
  
  const [minYear, maxYear] = yearRange
  const totalYears = maxYear - minYear + 1
  
  // Empty state
  if (events.length === 0) {
    return (
      <div className="rounded-xl bg-slate-800/30 p-8 text-center">
        <Trophy size={32} className="mx-auto mb-3 text-slate-700"/>
        <div className="text-sm text-slate-500 mb-1">Belum ada timeline prestasi</div>
        <div className="text-[11px] text-slate-600">
          Tambah prestasi via tombol di atas untuk mulai membangun timeline
        </div>
      </div>
    )
  }
  
  // Build year array
  const years = Array.from({ length: totalYears }, (_, i) => minYear + i)
  
  // Aggregate medal per year per level
  const yearStats = years.map(y => {
    const evts = eventsByYear.get(y) || []
    return {
      year: y,
      events: evts,
      emas:     evts.filter(e => e.hasil === 'Emas').length,
      perak:    evts.filter(e => e.hasil === 'Perak').length,
      perunggu: evts.filter(e => e.hasil === 'Perunggu').length,
      topLevel: evts.reduce<string | null>((top, e) => {
        if (!top) return e.level_event
        return (LEVEL_RANK[e.level_event] > LEVEL_RANK[top]) ? e.level_event : top
      }, null),
    }
  })
  
  // Compute year column width (min 80px, grows for short ranges)
  const colWidth = Math.max(80, Math.min(140, 900 / totalYears))
  
  return (
    <div className="relative">
      {/* Scroll container */}
      <div className="overflow-x-auto rounded-xl bg-slate-900/50 border border-slate-800"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${accent}25 transparent` }}>
        <div className="relative px-4 pt-8 pb-12" style={{ minWidth: totalYears * colWidth + 40 }}>
          
          {/* Horizontal axis line */}
          <div className="absolute left-4 right-4 top-1/2 h-px"
            style={{ background: 'rgba(255,255,255,0.08)' }}/>
          
          {/* Year columns with events */}
          <div className="relative grid items-center"
            style={{ gridTemplateColumns: `repeat(${totalYears}, ${colWidth}px)` }}>
            
            {yearStats.map((ys) => (
              <div key={ys.year} className="relative flex flex-col items-center" style={{ minHeight: 120 }}>
                
                {/* Year label (top) */}
                <div className="absolute -top-2 text-[10px] font-bold tabular-nums"
                  style={{ color: ys.events.length > 0 ? accent : 'rgba(255,255,255,0.2)' }}>
                  {ys.year}
                </div>
                
                {/* Event markers — stacked vertically */}
                {ys.events.length > 0 && (
                  <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
                    {ys.events.slice(0, 3).map((evt) => {
                      const size = HASIL_SIZE[evt.hasil] || 8
                      const color = HASIL_COLOR[evt.hasil] || '#475569'
                      return (
                        <button key={evt.id}
                          onMouseEnter={(e) => {
                            setHoveredEvent(evt)
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            const parentRect = (e.currentTarget.closest('.relative.overflow-x-auto') as HTMLElement)?.getBoundingClientRect()
                            if (parentRect) {
                              setTooltipPos({
                                x: rect.left - parentRect.left + rect.width / 2,
                                y: rect.top - parentRect.top,
                              })
                            }
                          }}
                          onMouseLeave={() => setHoveredEvent(null)}
                          className="rounded-full transition-all hover:scale-150 hover:z-10 relative"
                          style={{
                            width:  size,
                            height: size,
                            background: color,
                            border: evt.is_demo ? `1.5px dashed rgba(255,255,255,0.4)` : `1.5px solid rgba(0,0,0,0.3)`,
                            boxShadow: `0 0 8px ${color}40`,
                          }}
                          aria-label={`${evt.event} ${evt.tahun} — ${evt.hasil}`}/>
                      )
                    })}
                    {ys.events.length > 3 && (
                      <div className="text-[9px] text-slate-500 font-bold tabular-nums">
                        +{ys.events.length - 3}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Year aggregate label (bottom) */}
                {ys.events.length > 0 && (ys.emas + ys.perak + ys.perunggu) > 0 && (
                  <div className="absolute bottom-0 flex gap-1 items-center">
                    {ys.emas > 0     && <span className="text-[9px] text-yellow-400 tabular-nums">🥇{ys.emas}</span>}
                    {ys.perak > 0    && <span className="text-[9px] text-slate-300 tabular-nums">🥈{ys.perak}</span>}
                    {ys.perunggu > 0 && <span className="text-[9px] text-amber-500 tabular-nums">🥉{ys.perunggu}</span>}
                  </div>
                )}
                
                {/* Empty year marker */}
                {ys.events.length === 0 && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.08)' }}/>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Tooltip */}
        {hoveredEvent && (
          <div className="absolute z-20 pointer-events-none rounded-xl p-3 shadow-2xl"
            style={{
              left: tooltipPos.x,
              top:  tooltipPos.y - 8,
              transform: 'translate(-50%, -100%)',
              background: 'rgba(15,23,42,0.98)',
              border: `1px solid ${HASIL_COLOR[hoveredEvent.hasil]}40`,
              minWidth: 220,
              maxWidth: 280,
            }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                style={{ background: `${HASIL_COLOR[hoveredEvent.hasil]}20`, color: HASIL_COLOR[hoveredEvent.hasil] }}>
                {hoveredEvent.hasil === 'Emas' ? '🥇' : hoveredEvent.hasil === 'Perak' ? '🥈' : hoveredEvent.hasil === 'Perunggu' ? '🥉' : '—'} {hoveredEvent.hasil}
              </span>
              {hoveredEvent.is_demo && (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-black"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                  DEMO
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-white">{hoveredEvent.event}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{hoveredEvent.nomor_tanding}</div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
              <Calendar size={10}/> {hoveredEvent.tahun} · {hoveredEvent.lokasi}
            </div>
            <div className="text-[10px] text-slate-600 mt-1">{hoveredEvent.level_event}</div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#fbbf24', boxShadow: '0 0 6px #fbbf2440' }}/>
          Emas
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#cbd5e1', boxShadow: '0 0 6px #cbd5e140' }}/>
          Perak
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#cd7f32', boxShadow: '0 0 6px #cd7f3240' }}/>
          Perunggu
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#475569' }}/>
          Peserta/4
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-white/40" style={{ background: 'transparent' }}/>
          Demo data
        </div>
      </div>
    </div>
  )
}
