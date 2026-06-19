'use client'
// src/components/konida/performance/PerformanceAgeCard.tsx
// FIX P0-1: Prioritas DB cabang_olahraga values, fallback ke hardcoded map

import { TrendingUp } from 'lucide-react'
import { getPeakAgeWindow } from '@/lib/performance/cabor-accent-map'

interface Props {
  age:        number | null
  caborNama:  string | null
  caborInfo?: { min_umur?: number; avg_umur?: number; max_umur?: number } | null
  accent:     string
}

export function PerformanceAgeCard({ age, caborNama, caborInfo, accent }: Props) {
  // FIXED P0-1: Use DB values first, hardcoded as fallback
  const peakWindow = getPeakAgeWindow(caborNama, caborInfo || undefined)
  
  const ageStatus = age && peakWindow
    ? age < peakWindow.min ? 'berkembang'
    : age > peakWindow.max ? 'senior'
    : 'prime'
    : null
  
  const dataSource = caborInfo?.min_umur && caborInfo?.max_umur
    ? 'cabor-db'
    : peakWindow ? 'fallback-map' : 'none'
  
  return (
    <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} style={{ color: accent }}/>
        <h3 className="text-sm font-bold text-white">Faktor Usia</h3>
        {dataSource === 'cabor-db' && (
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
            DB
          </span>
        )}
        {dataSource === 'fallback-map' && (
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
            Estimasi
          </span>
        )}
      </div>
      
      {age === null ? (
        <div className="py-4 text-center text-[11px] text-slate-600">Tanggal lahir tidak tersedia.</div>
      ) : (
        <>
          <div className="text-center mb-4">
            <div className="text-4xl font-black text-white tabular-nums">{age}</div>
            <div className="text-[11px] text-slate-500 mt-1">tahun saat PORPROV XV</div>
            <div className="text-[10px] text-slate-600">Nov 2026</div>
          </div>
          
          {peakWindow ? (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="tabular-nums">{peakWindow.min} thn</span>
                  <span className="text-slate-400 font-semibold truncate px-1">Window Puncak</span>
                  <span className="tabular-nums">{peakWindow.max} thn</span>
                </div>
                
                {/* Visual window bar — wider range */}
                <div className="relative h-3 rounded-full bg-slate-800 overflow-visible">
                  {/* Peak window highlight */}
                  <div className="absolute h-full rounded-full"
                    style={{
                      left:  `${Math.max(0, ((peakWindow.min - 14) / (40 - 14)) * 100)}%`,
                      width: `${((peakWindow.max - peakWindow.min) / (40 - 14)) * 100}%`,
                      background: `${accent}30`,
                      border:     `1px solid ${accent}50`,
                    }}/>
                  {/* Avg marker */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/30"
                    style={{ left: `${((peakWindow.avg - 14) / (40 - 14)) * 100}%` }}/>
                  {/* Athlete position */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white"
                    style={{
                      left: `${Math.min(95, Math.max(5, ((age - 14) / (40 - 14)) * 100))}%`,
                      transform: 'translate(-50%,-50%)',
                      background: ageStatus === 'prime' ? '#22c55e' : ageStatus === 'berkembang' ? '#3b82f6' : '#f59e0b',
                    }}/>
                </div>
              </div>
              
              {/* Status pill */}
              <div className="rounded-xl px-3 py-2 text-center mt-3"
                style={{
                  background: ageStatus === 'prime' ? '#22c55e14' : ageStatus === 'berkembang' ? '#3b82f614' : '#f59e0b14',
                  border:     `1px solid ${ageStatus === 'prime' ? '#22c55e30' : ageStatus === 'berkembang' ? '#3b82f630' : '#f59e0b30'}`,
                }}>
                <div className="text-xs font-bold"
                  style={{ color: ageStatus === 'prime' ? '#22c55e' : ageStatus === 'berkembang' ? '#3b82f6' : '#f59e0b' }}>
                  {ageStatus === 'prime' ? '✓ Usia Puncak' : ageStatus === 'berkembang' ? '↗ Berkembang' : '↘ Melewati Puncak'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {ageStatus === 'prime' ? `Dalam window ${peakWindow.min}–${peakWindow.max} thn`
                    : ageStatus === 'berkembang' ? `Puncak dalam ${peakWindow.min - age} thn lagi`
                    : `${age - peakWindow.max} thn dari batas atas window`}
                </div>
              </div>
              
              <div className="mt-3 flex justify-between text-[11px]">
                <span className="text-slate-500">Avg cabor</span>
                <span className="text-slate-300 font-bold tabular-nums">{peakWindow.avg} thn</span>
              </div>
              
              <div className="mt-2 text-[10px] text-slate-600 text-center italic">{peakWindow.label}</div>
            </>
          ) : (
            <div className="py-3 text-center text-[11px] text-slate-600">
              Window puncak usia untuk cabor ini belum di-mapping.
            </div>
          )}
        </>
      )}
    </div>
  )
}
