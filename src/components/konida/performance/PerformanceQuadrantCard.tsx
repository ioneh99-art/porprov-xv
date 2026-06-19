'use client'
// src/components/konida/performance/PerformanceQuadrantCard.tsx
// Kuadran kesiapan based on combined readiness score + breakdown

import { Activity } from 'lucide-react'
import { calculateReadiness, readinessTierConfig, type ReadinessInput } from '@/lib/performance/readiness-score'

interface Props {
  input:  ReadinessInput
  accent: string
}

export function PerformanceQuadrantCard({ input, accent }: Props) {
  const r = calculateReadiness(input)
  const cfg = readinessTierConfig(r.tier)
  
  return (
    <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} style={{ color: accent }}/>
        <h3 className="text-sm font-bold text-white">Kuadran Kesiapan</h3>
      </div>
      
      {/* Main tier display */}
      <div className="rounded-xl p-4 text-center mb-3"
        style={{ background: `${r.tierColor}14`, border: `1px solid ${r.tierColor}30` }}>
        <div className="text-2xl font-black tabular-nums mb-0.5" style={{ color: r.tierColor }}>
          {r.score}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">readiness score</div>
        <div className="text-xl font-black" style={{ color: r.tierColor }}>{r.tierLabel}</div>
        <div className="text-[10px] text-slate-500 mt-1">{cfg.desc}</div>
      </div>
      
      {/* Breakdown */}
      <div className="space-y-2 text-[11px]">
        {[
          { label: 'Fisik (tes fisik)',    val: r.breakdown.fitness,   weight: r.weights.fitness,   has: r.hasData.fitness },
          { label: 'Teknik (avg gap)',     val: r.breakdown.technical, weight: r.weights.technical, has: r.hasData.technical },
          { label: 'Karier (medal/level)', val: r.breakdown.career,    weight: r.weights.career,    has: r.hasData.career },
        ].map(d => (
          <div key={d.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500">
                {d.label}
                {!d.has && <span className="ml-1 text-slate-700">(belum)</span>}
              </span>
              <div className="flex items-center gap-2">
                {d.has && d.weight > 0 && (
                  <span className="text-[9px] text-slate-600 tabular-nums">×{(d.weight * 100).toFixed(0)}%</span>
                )}
                <span className="font-bold tabular-nums" style={{ 
                  color: d.has ? (d.val >= 75 ? '#22c55e' : d.val >= 50 ? '#f59e0b' : '#ef4444') : '#6b7280' 
                }}>
                  {d.has ? d.val : '—'}
                </span>
              </div>
            </div>
            <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
              {d.has && (
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ 
                    width: `${d.val}%`,
                    background: d.val >= 75 ? '#22c55e' : d.val >= 50 ? '#f59e0b' : '#ef4444',
                    opacity: 0.7,
                  }}/>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Data sufficiency note */}
      {(!r.hasData.fitness || !r.hasData.technical || !r.hasData.career) && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-600 text-center">
          {[
            !r.hasData.fitness && 'tes fisik',
            !r.hasData.technical && 'baseline',
            !r.hasData.career && 'kejuaraan',
          ].filter(Boolean).length === 3
            ? 'Belum ada data untuk asesmen lengkap'
            : `Lengkapi data ${[
                !r.hasData.fitness && 'tes fisik',
                !r.hasData.technical && 'baseline',
                !r.hasData.career && 'riwayat kejuaraan',
              ].filter(Boolean).join(' / ')} untuk asesmen lebih akurat`}
        </div>
      )}
    </div>
  )
}
