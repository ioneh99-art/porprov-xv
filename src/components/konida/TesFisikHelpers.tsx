'use client'
// src/components/konida/TesFisikHelpers.tsx
// Reusable helpers untuk dashboard biomotorik:
// - useCountUp: animate angka dari 0 ke target
// - Sparkline: mini line chart untuk KPI
// - Gauge: speedometer chart
// - Insight cards utility

import { useEffect, useState, useRef } from 'react'

// ───────────────────────────────────────────────────
// useCountUp: animate number 0 → target dengan easing
// ───────────────────────────────────────────────────
export function useCountUp(target: number, duration = 1500, delay = 0) {
  const [value, setValue] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    const startAnimation = () => {
      startTimeRef.current = performance.now()
      const tick = (now: number) => {
        if (!startTimeRef.current) return
        const elapsed = now - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(target * eased)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setValue(target)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    timeoutId = setTimeout(startAnimation, delay)
    return () => {
      clearTimeout(timeoutId)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay])

  return value
}

// ───────────────────────────────────────────────────
// AnimatedNumber: render <span> dengan countUp
// ───────────────────────────────────────────────────
export function AnimatedNumber({
  value, suffix = '', decimals = 0, delay = 0, duration = 1500,
}: {
  value: number; suffix?: string; decimals?: number; delay?: number; duration?: number
}) {
  const v = useCountUp(value, duration, delay)
  return <>{v.toFixed(decimals)}{suffix}</>
}

// ───────────────────────────────────────────────────
// Sparkline SVG (lightweight, no library)
// ───────────────────────────────────────────────────
export function Sparkline({
  data, color, width = 80, height = 28, strokeWidth = 1.8,
}: {
  data: number[]; color: string; width?: number; height?: number; strokeWidth?: number
}) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  // Gradient fill area
  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      className="opacity-90">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3}/>
          <stop offset="100%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-${color.replace('#', '')})`}/>
      <polyline points={points} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ───────────────────────────────────────────────────
// Gauge (speedometer half-circle)
// ───────────────────────────────────────────────────
export function Gauge({
  value, max = 100, size = 200, primary = '#10b981', label,
}: {
  value: number; max?: number; size?: number; primary?: string; label?: string
}) {
  const animated = useCountUp(value, 2000)
  const radius = size / 2 - 12
  const cx = size / 2
  const cy = size / 2
  const circumference = Math.PI * radius   // half circle
  const progress = Math.min(animated / max, 1)
  const strokeOffset = circumference * (1 - progress)

  // Color by zone
  const color = value >= 80 ? '#10b981'
              : value >= 60 ? '#3b82f6'
              : value >= 40 ? '#fbbf24'
              : '#ef4444'

  // Needle angle (-90deg = left, 90deg = right)
  const needleAngle = -90 + progress * 180

  return (
    <div className="relative inline-block" style={{ width: size, height: size / 2 + 30 }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={`M 12 ${cy} A ${radius} ${radius} 0 0 1 ${size - 12} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={16}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M 12 ${cy} A ${radius} ${radius} 0 0 1 ${size - 12} ${cy}`}
          fill="none" stroke={color} strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.5s ease' }}
        />
        {/* Center pivot */}
        <circle cx={cx} cy={cy} r={4} fill={color}/>
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={cx + Math.cos((needleAngle * Math.PI) / 180) * (radius - 8)}
          y2={cy + Math.sin((needleAngle * Math.PI) / 180) * (radius - 8)}
          stroke={color} strokeWidth={3} strokeLinecap="round"
        />
        {/* Min/Max labels */}
        <text x="12" y={cy + 22} fill="#64748b" fontSize="10" textAnchor="middle">0</text>
        <text x={size - 12} y={cy + 22} fill="#64748b" fontSize="10" textAnchor="middle">{max}</text>
      </svg>
      {/* Center value */}
      <div className="absolute top-1/2 left-0 right-0 text-center" style={{ transform: 'translateY(-30%)' }}>
        <div className="text-3xl font-black" style={{ color }}>
          {Math.round(animated)}<span className="text-sm">%</span>
        </div>
        {label && <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mt-1">{label}</div>}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────
// FuturisticDonut: Animated donut with center stats + active hover
// ───────────────────────────────────────────────────
export function FuturisticDonut({
  data, primary, total, size = 240,
}: {
  data: Array<{ name: string; value: number; color: string }>
  primary: string
  total: number
  size?: number
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const filtered = data.filter(d => d.value > 0)
  const sum = filtered.reduce((a, b) => a + b.value, 0) || 1

  const radius = size / 2 - 16
  const innerRadius = radius * 0.62
  const cx = size / 2
  const cy = size / 2

  let cumulative = -Math.PI / 2  // start from top

  const segments = filtered.map((d, i) => {
    const portion = d.value / sum
    const angle = portion * Math.PI * 2
    const startAngle = cumulative
    const endAngle = cumulative + angle
    cumulative += angle

    // Active state: explode slightly outward
    const isActive = activeIdx === i
    const explodeOffset = isActive ? 6 : 0
    const midAngle = (startAngle + endAngle) / 2
    const explodeX = Math.cos(midAngle) * explodeOffset
    const explodeY = Math.sin(midAngle) * explodeOffset

    // SVG arc path
    const x1 = cx + Math.cos(startAngle) * radius
    const y1 = cy + Math.sin(startAngle) * radius
    const x2 = cx + Math.cos(endAngle) * radius
    const y2 = cy + Math.sin(endAngle) * radius
    const x3 = cx + Math.cos(endAngle) * innerRadius
    const y3 = cy + Math.sin(endAngle) * innerRadius
    const x4 = cx + Math.cos(startAngle) * innerRadius
    const y4 = cy + Math.sin(startAngle) * innerRadius
    const largeArc = angle > Math.PI ? 1 : 0

    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ')

    return { d, path, portion, midAngle, explodeX, explodeY, isActive, i }
  })

  const activeData = activeIdx != null ? filtered[activeIdx] : null

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: 'visible' }}>
          {/* Outer glow ring */}
          <defs>
            {segments.map((s, i) => (
              <filter key={i} id={`glow-${i}`}>
                <feGaussianBlur stdDeviation="4"/>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            ))}
          </defs>

          {/* Background dim ring */}
          <circle cx={cx} cy={cy} r={radius + 4} fill="none"
            stroke="rgba(255,255,255,0.03)" strokeWidth={1}/>

          {segments.map((s, i) => (
            <g key={i}
              transform={`translate(${s.explodeX} ${s.explodeY})`}
              style={{ transition: 'transform 0.3s ease', cursor: 'pointer' }}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}>
              <path d={s.path}
                fill={s.d.color}
                opacity={mounted ? (activeIdx == null || activeIdx === i ? 1 : 0.35) : 0}
                style={{
                  transition: 'opacity 0.4s ease',
                  filter: s.isActive ? `drop-shadow(0 0 14px ${s.d.color}aa)` : 'none',
                  transformOrigin: `${cx}px ${cy}px`,
                }}/>
            </g>
          ))}
        </svg>

        {/* Center info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {activeData ? (
            <>
              <div className="text-3xl font-black" style={{ color: activeData.color }}>
                <AnimatedNumber value={activeData.value} duration={500}/>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-bold mt-1" style={{ color: activeData.color }}>
                {activeData.name}
              </div>
              <div className="text-[9px] text-zinc-500 mt-0.5">
                {Math.round((activeData.value / sum) * 100)}% dari total
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-black text-white">
                <AnimatedNumber value={total} duration={1500}/>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">
                Total Atlet
              </div>
              <div className="text-[9px] text-zinc-600 mt-0.5">hover segment</div>
            </>
          )}
        </div>
      </div>

      {/* Legend bars */}
      <div className="w-full mt-4 space-y-1.5">
        {filtered.map((d, i) => {
          const pct = (d.value / sum) * 100
          const isActive = activeIdx === i
          return (
            <div key={i}
              className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all"
              style={{
                background: isActive ? `${d.color}15` : 'transparent',
              }}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}>
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: d.color, boxShadow: `0 0 8px ${d.color}80` }}/>
              <span className="text-[11px] font-medium text-zinc-300 w-24 truncate">{d.name}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="h-full rounded-full"
                  style={{
                    width: mounted ? `${pct}%` : 0,
                    background: `linear-gradient(90deg, ${d.color}80, ${d.color})`,
                    transition: `width 1s ease ${i * 100}ms`,
                    boxShadow: isActive ? `0 0 8px ${d.color}80` : 'none',
                  }}/>
              </div>
              <span className="text-[11px] font-mono font-bold w-12 text-right" style={{ color: d.color }}>
                {d.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────
// FuturisticBars: Animated bars with gradient + glow + hover card
// ───────────────────────────────────────────────────
export function FuturisticBars({
  data, primary, height = 240,
}: {
  data: Array<{ name: string; value: number; color: string }>
  primary: string
  height?: number
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const maxValue = Math.max(...data.map(d => d.value), 1)

  // Icons per BMI category
  const ICONS: Record<string, string> = {
    Underweight: '🥬',
    Normal: '✅',
    Overweight: '⚠️',
    Obese: '🔴',
    Unknown: '❓',
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Grid lines (subtle horizontal) */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pt-4">
        {[100, 75, 50, 25, 0].map(v => (
          <div key={v} className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-700 font-mono w-8 text-right">
              {Math.round((maxValue * v) / 100)}
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }}/>
          </div>
        ))}
      </div>

      {/* Bars container */}
      <div className="absolute inset-0 flex items-end justify-around pl-10 pr-4 pb-12 pt-4 gap-2">
        {data.map((d, i) => {
          const heightPct = (d.value / maxValue) * 100
          const isActive = activeIdx === i

          return (
            <div key={i}
              className="flex-1 flex flex-col items-center gap-2 relative h-full"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}>

              {/* Value label */}
              <div className="absolute -top-2 text-[11px] font-black"
                style={{
                  color: isActive ? d.color : '#fff',
                  textShadow: isActive ? `0 0 8px ${d.color}` : 'none',
                  transition: 'all 0.3s',
                }}>
                <AnimatedNumber value={d.value} duration={1200} delay={i * 80}/>
              </div>

              {/* The bar */}
              <div className="flex-1 w-full flex items-end justify-center pt-6">
                <div className="w-full max-w-[60px] rounded-t-xl relative cursor-pointer transition-all"
                  style={{
                    height: mounted ? `${heightPct}%` : '0%',
                    background: `linear-gradient(180deg, ${d.color}30 0%, ${d.color} 100%)`,
                    border: `1px solid ${d.color}80`,
                    boxShadow: isActive
                      ? `0 0 20px ${d.color}60, inset 0 0 16px ${d.color}40`
                      : `0 0 8px ${d.color}30`,
                    transition: `height 1.2s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms, box-shadow 0.3s, transform 0.3s`,
                    transform: isActive ? 'scaleY(1.04)' : 'scaleY(1)',
                    transformOrigin: 'bottom',
                  }}>

                  {/* Top glow accent */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3/4 h-1 rounded-full blur-sm"
                    style={{ background: d.color, opacity: isActive ? 1 : 0.6 }}/>

                  {/* Inner highlight (glass effect) */}
                  <div className="absolute inset-x-1 top-1 h-1/3 rounded-t-lg"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.15), transparent)',
                    }}/>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-10 right-4 flex justify-around gap-2">
        {data.map((d, i) => {
          const isActive = activeIdx === i
          return (
            <div key={i} className="flex-1 flex flex-col items-center"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}>
              <div className="text-lg mb-1">{ICONS[d.name] || '📊'}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider transition-colors"
                style={{ color: isActive ? d.color : '#94a3b8' }}>
                {d.name}
              </div>
            </div>
          )
        })}
      </div>

      {/* Active hover card */}
      {activeIdx != null && (
        <div className="absolute top-0 right-0 rounded-xl px-3 py-2 pointer-events-none"
          style={{
            background: `${data[activeIdx].color}20`,
            border: `1px solid ${data[activeIdx].color}50`,
            backdropFilter: 'blur(8px)',
          }}>
          <div className="text-[9px] uppercase tracking-widest font-bold"
            style={{ color: data[activeIdx].color }}>
            {data[activeIdx].name}
          </div>
          <div className="text-lg font-black text-white">{data[activeIdx].value} atlet</div>
        </div>
      )}
    </div>
  )
}

export function Heatmap({
  cabors, komponen_per_cabor, primary, onCellClick,
}: {
  cabors: any[]
  komponen_per_cabor: any[]
  primary: string
  onCellClick?: (cabor: string, komponen: string) => void
}) {
  // Group komponen per cabor → matrix
  const allKomponen = Array.from(new Set(komponen_per_cabor.map((k: any) => k.komponen))).sort()

  // Build matrix
  const matrix: Record<string, Record<string, number>> = {}
  komponen_per_cabor.forEach((k: any) => {
    if (!matrix[k.cabor_nama]) matrix[k.cabor_nama] = {}
    matrix[k.cabor_nama][k.komponen] = k.rata_capaian
  })

  // Top cabor (limit display)
  const sortedCabors = [...cabors]
    .filter(c => c.jumlah_atlet_tes >= 2)
    .sort((a, b) => (b.rata_kesimpulan || 0) - (a.rata_kesimpulan || 0))

  const getColor = (val: number) => {
    if (val >= 80) return '#10b981'  // emerald
    if (val >= 65) return '#3b82f6'  // blue
    if (val >= 50) return '#fbbf24'  // yellow
    if (val >= 35) return '#f97316'  // orange
    return '#ef4444'                 // red
  }

  const getOpacity = (val: number) => {
    return 0.3 + (Math.min(val, 100) / 100) * 0.7
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 p-2 text-left text-zinc-500 uppercase tracking-wider font-semibold"
              style={{ background: 'rgba(2,9,21,0.9)', minWidth: 160 }}>
              Cabor
            </th>
            {allKomponen.map(k => (
              <th key={k} className="p-2 text-zinc-500 uppercase tracking-wider font-semibold"
                style={{ minWidth: 60, writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 80 }}>
                {k}
              </th>
            ))}
            <th className="p-2 text-zinc-400 uppercase tracking-wider font-semibold text-right" style={{ minWidth: 60 }}>
              Avg
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedCabors.map((c, i) => {
            const row = matrix[c.cabor_nama] || {}
            const vals = Object.values(row).filter(v => v != null) as number[]
            const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
            return (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="sticky left-0 z-10 p-2 font-semibold text-white text-xs"
                  style={{ background: 'rgba(2,9,21,0.9)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 font-mono">{i + 1}</span>
                    <span className="truncate" style={{ maxWidth: 120 }}>{c.cabor_nama}</span>
                  </div>
                  <div className="text-[9px] text-zinc-500 font-normal">{c.jumlah_atlet_tes} atlet</div>
                </td>
                {allKomponen.map(k => {
                  const val = row[k]
                  return (
                    <td key={k} className="p-1 text-center"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {val != null ? (
                        <button
                          onClick={() => onCellClick?.(c.cabor_nama, k)}
                          className="w-full h-8 rounded font-bold text-[10px] transition-all hover:scale-110 hover:z-20 relative"
                          style={{
                            background: `${getColor(val)}${Math.round(getOpacity(val) * 255).toString(16).padStart(2, '0')}`,
                            color: val >= 50 ? '#fff' : '#1f2937',
                            border: `1px solid ${getColor(val)}40`,
                          }}>
                          {Math.round(val)}
                        </button>
                      ) : (
                        <div className="w-full h-8 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}/>
                      )}
                    </td>
                  )
                })}
                <td className="p-2 text-right font-bold font-mono"
                  style={{
                    color: getColor(avg),
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                  {Math.round(avg)}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-end gap-3 mt-3 text-[10px] text-zinc-500">
        <span>Legend:</span>
        {[
          { lbl: '<35',   c: '#ef4444' },
          { lbl: '35-50', c: '#f97316' },
          { lbl: '50-65', c: '#fbbf24' },
          { lbl: '65-80', c: '#3b82f6' },
          { lbl: '80+',   c: '#10b981' },
        ].map(l => (
          <span key={l.lbl} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: l.c, opacity: 0.7 }}/>
            {l.lbl}
          </span>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────
// Insight Generator — analyze data, return narrative cards
// ───────────────────────────────────────────────────
export function generateInsights(data: any): Array<{
  type: 'warning' | 'success' | 'info'
  icon: string
  title: string
  message: string
  action?: string
}> {
  const insights: any[] = []
  const summary = data.summary
  const perCabor = data.per_cabor || []
  const komponenOverall = data.komponen_overall || []

  // Insight 1: Performance overview
  if (summary?.avg_fitness_persen != null) {
    const avg = summary.avg_fitness_persen
    if (avg >= 75) {
      insights.push({
        type: 'success',
        icon: '🏆',
        title: 'PRESTASI KONTINGEN',
        message: `Rata-rata fitness ${avg}% — di atas standar Jabar (rata 65%). Kontingen siap kompetisi.`,
        action: 'Pertahankan program latihan saat ini',
      })
    } else if (avg >= 60) {
      insights.push({
        type: 'info',
        icon: '📊',
        title: 'KONDISI STABIL',
        message: `Rata-rata fitness ${avg}% — kategori Baik. Bandingkan dengan rata-rata Jabar Q1 (65%).`,
        action: 'Fokus tingkatkan ke level Baik Sekali',
      })
    } else {
      insights.push({
        type: 'warning',
        icon: '🚨',
        title: 'PERLU INTERVENSI',
        message: `Rata-rata fitness ${avg}% — di bawah standar. Perlu program peningkatan menyeluruh.`,
        action: 'Setup program latihan 12 minggu',
      })
    }
  }

  // Insight 2: Cabor terlemah
  const lowCabors = perCabor
    .filter((c: any) => c.jumlah_atlet_tes >= 3 && (c.rata_kesimpulan || 0) < 55)
    .sort((a: any, b: any) => (a.rata_kesimpulan || 0) - (b.rata_kesimpulan || 0))
    .slice(0, 3)

  if (lowCabors.length > 0) {
    const names = lowCabors.map((c: any) => c.cabor_nama).join(', ')
    const avgScore = Math.round(
      lowCabors.reduce((sum: number, c: any) => sum + (c.rata_kesimpulan || 0), 0) / lowCabors.length
    )
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: `${lowCabors.length} CABOR PRIORITAS`,
      message: `${names} punya rata-rata ${avgScore}% — perlu program stamina dasar.`,
      action: 'Program latihan 8 minggu, target naik ke 70%',
    })
  }

  // Insight 3: Cabor terkuat
  const topCabor = [...perCabor]
    .filter((c: any) => c.jumlah_atlet_tes >= 3)
    .sort((a: any, b: any) => (b.rata_kesimpulan || 0) - (a.rata_kesimpulan || 0))[0]

  if (topCabor) {
    insights.push({
      type: 'success',
      icon: '⭐',
      title: 'TOP PERFORMER',
      message: `${topCabor.cabor_nama} unggul dengan ${topCabor.rata_kesimpulan}% (${topCabor.jumlah_atlet_tes} atlet).`,
      action: 'Kandidat kuat untuk medali emas',
    })
  }

  // Insight 4: Komponen terlemah
  if (komponenOverall.length >= 2) {
    const weak = komponenOverall[0]
    const strong = komponenOverall[komponenOverall.length - 1]
    insights.push({
      type: 'info',
      icon: '🎯',
      title: 'FOKUS LATIHAN',
      message: `Komponen ${weak.komponen} (${weak.rata_capaian}%) jadi titik lemah, sedangkan ${strong.komponen} (${strong.rata_capaian}%) jadi kekuatan.`,
      action: `Alokasikan 40% waktu latihan ke ${weak.komponen}`,
    })
  }

  // Insight 5: Participation rate
  if (summary?.participation_rate != null && summary.participation_rate < 90) {
    insights.push({
      type: 'warning',
      icon: '📋',
      title: 'FOLLOW-UP PERLU',
      message: `${summary.dns} atlet DNS (tidak hadir tes). Participation rate ${summary.participation_rate}%.`,
      action: 'Jadwalkan tes susulan dalam 2 minggu',
    })
  }

  return insights
}

// ───────────────────────────────────────────────────
// Insight Card Component
// ───────────────────────────────────────────────────
export function InsightCard({ insight, delay = 0 }: { insight: any; delay?: number }) {
  const [animIn, setAnimIn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 100 + delay)
    return () => clearTimeout(t)
  }, [delay])

  const colors = {
    warning: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', accent: '#f97316' },
    success: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', accent: '#10b981' },
    info:    { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', accent: '#3b82f6' },
  }
  const c = colors[insight.type as keyof typeof colors] || colors.info

  return (
    <div
      className={`rounded-xl p-4 transition-all duration-500 ${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{insight.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-black mb-1"
            style={{ color: c.accent }}>
            {insight.title}
          </div>
          <p className="text-xs text-zinc-200 mb-2 leading-relaxed">
            {insight.message}
          </p>
          {insight.action && (
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <span style={{ color: c.accent }}>→</span>
              <span>{insight.action}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
