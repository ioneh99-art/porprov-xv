'use client'
// src/components/konida/performance/PerformanceFitnessCard.tsx
// Tren tes fisik per tahap dengan tiered scoring (P1-10 fix)

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface FitnessRecord {
  tahap:                number
  kesimpulan_persen:    number | null
  kesimpulan_kategori?: string | null
  bmi?:                 number | null
  berat_badan?:         number | null
  tinggi_badan?:        number | null
  tanggal_tes?:         string | null
  status_tes?:          string | null
}

interface Props {
  fitData: FitnessRecord[]
  accent:  string
}

// Tiered colors instead of cliff at 70%
function fitnessTierColor(persen: number | null | undefined): string {
  if (persen === null || persen === undefined) return '#6b7280'
  if (persen >= 85) return '#22c55e'    // green — excellent
  if (persen >= 75) return '#10b981'    // emerald — baik
  if (persen >= 60) return '#f59e0b'    // amber — perlu ditingkatkan
  return '#ef4444'                       // red — kritis
}

function fitnessTierLabel(persen: number | null | undefined): string {
  if (persen === null || persen === undefined) return 'belum tes'
  if (persen >= 85) return 'Excellent'
  if (persen >= 75) return 'Baik'
  if (persen >= 60) return 'Perlu ↑'
  return 'Kritis'
}

export function PerformanceFitnessCard({ fitData, accent }: Props) {
  const fitPerTahap = [1, 2, 3].map(t => fitData.find(f => f.tahap === t) ?? null)
  const latestFit   = fitData.length ? fitData[fitData.length - 1] : null
  
  const fitTrend = fitPerTahap.filter(Boolean).length >= 2
    ? (() => {
        const vals = fitPerTahap.filter(Boolean).map((f: any) => f.kesimpulan_persen)
        const delta = vals[vals.length - 1] - vals[0]
        return delta > 3 ? 'naik' : delta < -3 ? 'turun' : 'stabil'
      })()
    : null
  
  const TrendIcon = fitTrend === 'naik' ? TrendingUp : fitTrend === 'turun' ? TrendingDown : Minus
  const trendColor = fitTrend === 'naik' ? '#22c55e' : fitTrend === 'turun' ? '#ef4444' : '#94a3b8'
  
  return (
    <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendIcon size={14} style={{ color: trendColor }}/>
          <h3 className="text-sm font-bold text-white">Tren Tes Fisik</h3>
        </div>
        {fitTrend && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: trendColor, background: `${trendColor}15`, border: `1px solid ${trendColor}30` }}>
            {fitTrend === 'naik' ? '↑ Naik' : fitTrend === 'turun' ? '↓ Turun' : '→ Stabil'}
          </span>
        )}
      </div>
      
      {fitPerTahap.some(Boolean) ? (
        <div className="space-y-3">
          {fitPerTahap.map((f, i) => {
            const color = f ? fitnessTierColor(f.kesimpulan_persen) : '#374151'
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500">Tahap {i + 1}</span>
                  <div className="flex items-center gap-2">
                    {f && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                        {fitnessTierLabel(f.kesimpulan_persen)}
                      </span>
                    )}
                    <span className="font-bold tabular-nums" style={{ color }}>
                      {f ? `${f.kesimpulan_persen}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  {f && f.kesimpulan_persen !== null && (
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${f.kesimpulan_persen}%`, background: color }}/>
                  )}
                </div>
              </div>
            )
          })}
          
          {latestFit?.bmi && (
            <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
              <span className="text-slate-500">BMI</span>
              <span className="font-bold text-slate-300 tabular-nums">
                {latestFit.bmi} <span className="text-slate-600 font-normal">· {latestFit.berat_badan}kg / {latestFit.tinggi_badan}cm</span>
              </span>
            </div>
          )}
          
          {latestFit?.tanggal_tes && (
            <div className="text-[10px] text-slate-600 text-center pt-1">
              Terakhir: {new Date(latestFit.tanggal_tes).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center text-[11px] text-slate-600">Belum ada data tes fisik untuk atlet ini.</div>
      )}
    </div>
  )
}
