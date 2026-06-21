'use client'
// src/components/konida/performance/PerformanceBaselineSection.tsx
// Riwayat performa baseline + prediksi medali PER-EVENT (FIX P0-2)

import { useMemo } from 'react'
import { Trophy, Target, AlertCircle } from 'lucide-react'
import { aggregateMedalForecast, gapTier, GAP_TIER_COLOR, GAP_TIER_LABEL, type EventProbability } from '@/lib/performance/medal-predictor'

interface BaselineEvent {
  id:                 number
  event_name:         string
  is_relay:           boolean
  waktu_terbaik:      string | null
  rekor_porprov:      string | null
  gap_percentage:     number | null
  target_medali:      string | null
  pesaing:            string | null
  medal_probability?: { emas: number; perak: number; perunggu: number } | null
  metric_type?:       string | null
  weight_class?:      string | null
}

interface Props {
  events: BaselineEvent[]
  accent: string
}

export function PerformanceBaselineSection({ events, accent }: Props) {
  const forecast = useMemo(() => aggregateMedalForecast(
    events.map(e => ({
      event_name:        e.event_name,
      is_relay:          e.is_relay,
      gap_percentage:    e.gap_percentage,
      medal_probability: e.medal_probability,
    }))
  ), [events])
  
  const perfWithSec = useMemo(() => events, [events])
  
  // Consistency stats
  const validGaps = events.filter(e => e.gap_percentage !== null).map(e => Number(e.gap_percentage))
  const avgGap   = validGaps.length ? validGaps.reduce((s, g) => s + g, 0) / validGaps.length : null
  const gapVar   = validGaps.length > 1
    ? Math.sqrt(validGaps.reduce((s, g) => s + Math.pow(g - avgGap!, 2), 0) / validGaps.length)
    : null
  
  if (events.length === 0) {
    return (
      <div className="rounded-2xl p-6 bg-slate-900/40 border border-slate-800 text-center">
        <Trophy size={36} className="mx-auto mb-3 text-slate-700"/>
        <div className="text-sm text-slate-400 mb-1">Belum ada data baseline</div>
        <div className="text-[11px] text-slate-600">Baseline performance saat ini tersedia untuk Atletik & Akuatik.</div>
      </div>
    )
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      
      {/* ── Riwayat Performa Baseline ── */}
      <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-3">
          Riwayat Performa <span className="text-[11px] font-normal text-slate-500">(Baseline 2022)</span>
        </h3>
        {/* ── Compact table view ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 text-slate-500 font-semibold">Event</th>
                <th className="text-right py-2 text-slate-500 font-semibold pr-3">PB</th>
                <th className="text-right py-2 text-slate-500 font-semibold pr-3">Gap%</th>
                <th className="text-right py-2 text-slate-500 font-semibold">Target</th>
              </tr>
            </thead>
            <tbody>
              {perfWithSec.map(p => {
                const tier  = gapTier(p.gap_percentage)
                const color = GAP_TIER_COLOR[tier]
                const isLift = p.metric_type === 'multi_lift'
                const pbDisplay = isLift
                  ? (p.waktu_terbaik ? `${p.waktu_terbaik} kg` : '—')
                  : (p.waktu_terbaik || '—')
                const targetMedal = p.target_medali?.toUpperCase()
                const medalColor = targetMedal?.includes('EMAS')     ? '#fbbf24'
                                 : targetMedal?.includes('PERAK')    ? '#cbd5e1'
                                 : targetMedal?.includes('PERUNGGU') ? '#cd7f32'
                                 : '#475569'
                const medalLabel = targetMedal?.includes('EMAS')     ? '🥇 Emas'
                                 : targetMedal?.includes('PERAK')    ? '🥈 Perak'
                                 : targetMedal?.includes('PERUNGGU') ? '🥉 Perunggu'
                                 : targetMedal && targetMedal !== '-' ? targetMedal : null
                return (
                  <tr key={p.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 text-slate-200 font-medium">
                      {p.event_name}{p.is_relay ? ' 🤝' : ''}
                      {p.weight_class && (
                        <span className="ml-1.5 text-[9px] text-slate-600 font-mono">{p.weight_class}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right pr-3 font-mono text-slate-300 tabular-nums">
                      {isLift ? (
                        <span className="font-bold text-white">{pbDisplay}</span>
                      ) : pbDisplay}
                    </td>
                    <td className="py-2.5 text-right pr-3 tabular-nums">
                      {p.gap_percentage !== null
                        ? <span className="font-bold" style={{ color }}>
                            {Number(p.gap_percentage) > 0 ? '+' : ''}{Number(p.gap_percentage).toFixed(1)}%
                          </span>
                        : <span className="text-[9px] px-1.5 py-0.5 rounded-full border"
                            style={{ background: 'rgba(71,85,105,0.3)', color: '#64748b', borderColor: 'rgba(71,85,105,0.4)' }}>
                            n/a
                          </span>}
                    </td>
                    <td className="py-2.5 text-right">
                      {medalLabel ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: `${medalColor}18`, color: medalColor, border: `1px solid ${medalColor}30` }}>
                          {medalLabel}
                        </span>
                      ) : (
                        p.pesaing
                          ? <span className="text-[9px] text-slate-600 truncate max-w-[120px] block text-right">
                              {p.pesaing.split(',')[0]}
                            </span>
                          : <span className="text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Consistency indicator */}
        {gapVar !== null && validGaps.length >= 2 ? (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Konsistensi {validGaps.length} event</span>
            <span className="font-bold" style={{ color: gapVar < 3 ? '#22c55e' : gapVar < 7 ? '#f59e0b' : '#ef4444' }}>
              {gapVar < 3 ? '✓ Konsisten' : gapVar < 7 ? '~ Cukup' : '⚠ Bervariasi'}
              <span className="text-slate-600 font-normal ml-1">(σ {gapVar.toFixed(1)})</span>
            </span>
          </div>
        ) : validGaps.length === 1 ? (
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-600 text-center">
            Data 1 event saja — butuh ≥2 event untuk analisa konsistensi
          </div>
        ) : null}
      </div>
      
      {/* ── Prediksi Medali Per Event (FIX P0-2) ── */}
      <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Target size={15} style={{ color: accent }}/> Prediksi Medali per Event
        </h3>
        <p className="text-[10px] text-slate-600 mb-4">Probabilitas per nomor tanding (bukan agregat)</p>
        
        {forecast.by_event.length === 0 || forecast.by_event.every(e => e.best_prob === 0) ? (
          <div className="py-6 text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-xs text-slate-500">Tidak ada data waktu/rekor untuk estimasi.</div>
            <div className="text-[10px] text-slate-600 mt-1">Lihat Smart Brief untuk analisa kualitatif.</div>
          </div>
        ) : (
          <>
            {/* Best event highlight */}
            {forecast.best_event && forecast.best_event.best_prob > 0 && (
              <div className="rounded-xl p-3 mb-3"
                style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accent }}>🎯 Peluang Tertinggi</span>
                </div>
                <div className="text-sm font-bold text-white">{forecast.best_event.event_name}{forecast.best_event.is_relay ? ' 🤝' : ''}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {forecast.best_event.best_medal && (
                    <span className="font-bold" style={{ 
                      color: forecast.best_event.best_medal === 'emas' ? '#fbbf24' 
                           : forecast.best_event.best_medal === 'perak' ? '#cbd5e1' 
                           : '#cd7f32'
                    }}>
                      {forecast.best_event.best_medal === 'emas' ? '🥇 Emas' : forecast.best_event.best_medal === 'perak' ? '🥈 Perak' : '🥉 Perunggu'}
                    </span>
                  )} {forecast.best_event.best_prob}%
                </div>
              </div>
            )}
            
            {/* Per-event breakdown */}
            <div className="space-y-3">
              {forecast.by_event.map((ev, idx) => (
                <EventProbCard key={idx} ev={ev}/>
              ))}
            </div>
            
            {/* Aggregate expected */}
            {(forecast.expected_medals.emas + forecast.expected_medals.perak + forecast.expected_medals.perunggu) > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                  <AlertCircle size={10}/> Ekspektasi medali (sum probabilitas)
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-800/50 py-2">
                    <div className="text-lg font-black tabular-nums" style={{ color: '#fbbf24' }}>{forecast.expected_medals.emas.toFixed(1)}</div>
                    <div className="text-[9px] text-slate-600">🥇 expected</div>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 py-2">
                    <div className="text-lg font-black tabular-nums" style={{ color: '#cbd5e1' }}>{forecast.expected_medals.perak.toFixed(1)}</div>
                    <div className="text-[9px] text-slate-600">🥈 expected</div>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 py-2">
                    <div className="text-lg font-black tabular-nums" style={{ color: '#cd7f32' }}>{forecast.expected_medals.perunggu.toFixed(1)}</div>
                    <div className="text-[9px] text-slate-600">🥉 expected</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 mt-2 text-center">
                  {forecast.reachable_count} event dengan peluang ≥50%
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EventProbCard({ ev }: { ev: EventProbability }) {
  return (
    <div className="rounded-xl bg-slate-800/30 p-3 border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white font-medium truncate">{ev.event_name}{ev.is_relay ? ' 🤝' : ''}</span>
        {ev.gap !== null && (
          <span className="text-[10px] text-slate-500 shrink-0">gap {ev.gap}%</span>
        )}
      </div>
      <div className="space-y-1.5">
        {(['emas', 'perak', 'perunggu'] as const).map(k => {
          const colors = { emas: '#fbbf24', perak: '#cbd5e1', perunggu: '#cd7f32' }
          const labels = { emas: '🥇', perak: '🥈', perunggu: '🥉' }
          const val = ev.prob[k]
          return (
            <div key={k}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-slate-400">{labels[k]}</span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: colors[k] }}>{val}%</span>
              </div>
              <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${val}%`, background: colors[k], boxShadow: ev.best_medal === k ? `0 0 6px ${colors[k]}80` : 'none' }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
