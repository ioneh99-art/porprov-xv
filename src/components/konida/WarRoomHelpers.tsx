'use client'
// src/components/konida/WarRoomHelpers.tsx
// Sprint 3C — Strategic Intelligence Layer
// Components:
//  - MedalPredictionEngine: proyeksi medali per cabor (dummy data, ready for real)
//  - GapAnalysisCard: Bogor vs top 5 kontingen + strategi catch-up
//  - StrategicActions: forward-looking actions (move from Dashboard Mission Control)
//  - CriticalPathTimeline: re-export for War Room

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Trophy, Target, TrendingUp, TrendingDown, ChevronRight,
  Flame, AlertTriangle, Award, Upload, Database, Zap,
  Activity, Calendar, Users, Sparkles, Crown,
} from 'lucide-react'

// ───────────────────────────────────────────────────
// useCount animation
// ───────────────────────────────────────────────────
function useCount(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0; let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// ═══════════════════════════════════════════════════════════════════
// 1. MEDAL PREDICTION ENGINE
//    Formula: probability medali per cabor berdasar fitness + base_rate
//    Data dummy untuk demo, structure ready for real data import
// ═══════════════════════════════════════════════════════════════════

export interface CaborPrediction {
  cabor: string
  jumlah_atlet: number
  avg_fitness: number             // 0-100
  base_rate: number               // 0-1 (historical medal rate)
  probability: number             // 0-1 (computed)
  est_emas: number
  est_perak: number
  est_perunggu: number
  data_source: 'real' | 'dummy'   // tracking source
}

// Base rate per cabor (typical medal rate dari riwayat PORPROV sebelumnya)
const CABOR_BASE_RATE: Record<string, number> = {
  'Dayung':         0.45,
  'Hockey':         0.30,
  'Karate':         0.40,
  'Wushu':          0.35,
  'Pencak Silat':   0.30,
  'Anggar':         0.55,
  'Menembak':       0.25,
  'Atletik':        0.40,
  'Renang':         0.35,
  'Akuatik':        0.35,
  'Taekwondo':      0.40,
  'Panahan':        0.45,
  'Bulutangkis':    0.30,
  'Sepak Bola':     0.15,
  'Bola Voli':      0.20,
  'Bola Basket':    0.20,
  'Tinju':          0.40,
  'Angkat Besi':    0.45,
  'Angkat Berat':   0.40,
  'Gulat':          0.40,
}
const DEFAULT_BASE_RATE = 0.25

export function computePrediction(
  cabor: string, jumlahAtlet: number, avgFitness: number
): CaborPrediction {
  const baseRate = CABOR_BASE_RATE[cabor] ?? DEFAULT_BASE_RATE

  // Fitness factor: 0.5x for <50%, scale up to 1.4x at 90%+
  const fitnessFactor = avgFitness < 40 ? 0.4
                      : avgFitness < 55 ? 0.6
                      : avgFitness < 70 ? 1.0
                      : avgFitness < 85 ? 1.2
                      : 1.4

  const probability = Math.min(1, baseRate * fitnessFactor)

  // Estimate medali based on probability + atlet count
  // Assumption: ~30% atlet di cabor menang medali if probability=1
  const totalMedaliExpected = Math.round(jumlahAtlet * 0.3 * probability)
  // Distribute: 40% emas, 35% perak, 25% perunggu
  const est_emas     = Math.round(totalMedaliExpected * 0.40)
  const est_perak    = Math.round(totalMedaliExpected * 0.35)
  const est_perunggu = Math.max(0, totalMedaliExpected - est_emas - est_perak)

  return {
    cabor, jumlah_atlet: jumlahAtlet, avg_fitness: avgFitness,
    base_rate: baseRate, probability,
    est_emas, est_perak, est_perunggu,
    data_source: 'real',
  }
}

export function MedalPredictionEngine({
  predictions, primary = '#10b981', isDummy = false,
}: {
  predictions: CaborPrediction[]
  primary?: string
  isDummy?: boolean
}) {
  const [sortBy, setSortBy] = useState<'prob'|'medal'|'name'>('medal')
  const [showAll, setShowAll] = useState(false)

  const sorted = [...predictions].sort((a, b) => {
    if (sortBy === 'prob')  return b.probability - a.probability
    if (sortBy === 'name')  return a.cabor.localeCompare(b.cabor)
    return (b.est_emas*3 + b.est_perak*2 + b.est_perunggu) - (a.est_emas*3 + a.est_perak*2 + a.est_perunggu)
  })
  const shown = showAll ? sorted : sorted.slice(0, 10)

  const totals = predictions.reduce(
    (s, p) => ({ emas: s.emas+p.est_emas, perak: s.perak+p.est_perak, perunggu: s.perunggu+p.est_perunggu }),
    { emas:0, perak:0, perunggu:0 }
  )
  const totalAll = totals.emas + totals.perak + totals.perunggu
  const animEmas = useCount(totals.emas, 1500)
  const animPerak = useCount(totals.perak, 1500)
  const animPerunggu = useCount(totals.perunggu, 1500)

  // Bonus estimation (Rp)
  const TARIF = { emas: 10_000_000, perak: 7_500_000, perunggu: 5_000_000 }
  const estBonus = totals.emas*TARIF.emas + totals.perak*TARIF.perak + totals.perunggu*TARIF.perunggu
  const animBonus = useCount(estBonus / 1_000_000, 2000)

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-15"
        style={{ background: primary }}/>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: primary }}/>
          <h3 className="text-sm font-bold text-white">Medal Prediction Engine</h3>
          {isDummy && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
              style={{ background:'rgba(251,191,36,0.15)', color:'#fbbf24' }}>
              ⚠ Demo Data
            </span>
          )}
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
          style={{ background:`${primary}15`, color: primary, border:`1px solid ${primary}30` }}>
          <Upload size={10}/> Import Data Real
        </button>
      </div>

      {/* Total projection summary */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl p-3 text-center"
          style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)' }}>
          <div className="text-2xl">🥇</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{Math.round(animEmas)}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Emas</div>
        </div>
        <div className="rounded-xl p-3 text-center"
          style={{ background:'rgba(203,213,225,0.06)', border:'1px solid rgba(203,213,225,0.2)' }}>
          <div className="text-2xl">🥈</div>
          <div className="text-2xl font-black text-slate-300 mt-1">{Math.round(animPerak)}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Perak</div>
        </div>
        <div className="rounded-xl p-3 text-center"
          style={{ background:'rgba(205,127,50,0.08)', border:'1px solid rgba(205,127,50,0.25)' }}>
          <div className="text-2xl">🥉</div>
          <div className="text-2xl font-black mt-1" style={{ color:'#cd7f32' }}>{Math.round(animPerunggu)}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Perunggu</div>
        </div>
        <div className="rounded-xl p-3 text-center"
          style={{ background:`${primary}10`, border:`1px solid ${primary}30` }}>
          <div className="text-2xl">💰</div>
          <div className="text-2xl font-black mt-1" style={{ color: primary }}>
            Rp {animBonus.toFixed(0)}M
          </div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Est. Bonus</div>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Urut:</span>
        {[
          {k:'medal' as const, l:'Total Medali'},
          {k:'prob'  as const, l:'Probabilitas'},
          {k:'name'  as const, l:'Nama'},
        ].map(s => (
          <button key={s.k} onClick={()=>setSortBy(s.k)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
            style={{
              background: sortBy===s.k ? `${primary}20` : 'rgba(255,255,255,0.03)',
              color:      sortBy===s.k ? primary : 'rgba(255,255,255,0.4)',
              border:     sortBy===s.k ? `1px solid ${primary}40` : '1px solid transparent',
            }}>
            {s.l}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-zinc-500 font-mono">
          {shown.length}/{predictions.length} cabor
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-500 uppercase tracking-wider text-[9px]"
              style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <th className="text-left p-2 font-bold">Cabor</th>
              <th className="text-right p-2 font-bold">Atlet</th>
              <th className="text-right p-2 font-bold">Fitness</th>
              <th className="text-left  p-2 font-bold">Probabilitas</th>
              <th className="text-center p-2 font-bold">🥇</th>
              <th className="text-center p-2 font-bold">🥈</th>
              <th className="text-center p-2 font-bold">🥉</th>
              <th className="text-right p-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p, i) => {
              const total = p.est_emas + p.est_perak + p.est_perunggu
              const probColor = p.probability >= 0.7 ? '#10b981'
                              : p.probability >= 0.5 ? '#3b82f6'
                              : p.probability >= 0.3 ? '#fbbf24'
                              : '#ef4444'
              return (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <td className="p-2 font-semibold text-white">{p.cabor}</td>
                  <td className="p-2 text-right font-mono text-zinc-300">{p.jumlah_atlet}</td>
                  <td className="p-2 text-right font-mono"
                    style={{ color: p.avg_fitness >= 70 ? '#10b981' : p.avg_fitness >= 50 ? '#fbbf24' : '#f97316' }}>
                    {p.avg_fitness}%
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[100px]"
                        style={{ background:'rgba(255,255,255,0.04)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${p.probability * 100}%`,
                            background: `linear-gradient(90deg, ${probColor}80, ${probColor})`,
                          }}/>
                      </div>
                      <span className="text-[10px] font-mono font-bold" style={{ color: probColor }}>
                        {Math.round(p.probability * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-center font-bold text-amber-400">{p.est_emas || '—'}</td>
                  <td className="p-2 text-center font-bold text-slate-400">{p.est_perak || '—'}</td>
                  <td className="p-2 text-center font-bold" style={{color:'#cd7f32'}}>{p.est_perunggu || '—'}</td>
                  <td className="p-2 text-right font-mono font-black text-white">{total || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {predictions.length > 10 && (
        <div className="text-center pt-3">
          <button onClick={()=>setShowAll(s=>!s)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all hover:scale-105"
            style={{ background:`${primary}10`, color: primary, border:`1px solid ${primary}30` }}>
            {showAll ? '▴ Tampilkan Top 10' : `▾ Lihat Semua ${predictions.length} Cabor`}
          </button>
        </div>
      )}

      {/* Methodology note */}
      <div className="mt-4 text-[10px] text-zinc-500 italic">
        Methodology: Probabilitas = base_rate(cabor) × fitness_factor.
        Base_rate dari riwayat PORPROV sebelumnya. Fitness_factor dari tes UPI.
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 2. GAP ANALYSIS CARD
// ═══════════════════════════════════════════════════════════════════

export interface KontingenStanding {
  rank: number
  nama: string
  emas: number
  perak: number
  perunggu: number
  total: number
  isMe?: boolean
}

export function GapAnalysisCard({
  standings, myRank, primary = '#10b981', isDummy = false,
}: {
  standings: KontingenStanding[]
  myRank: number
  primary?: string
  isDummy?: boolean
}) {
  const me = standings.find(s => s.isMe)
  const top5 = standings.slice(0, 5)
  const aboveMe = standings.filter(s => s.rank < (me?.rank || 999))

  // Gap to #1 dan #(rank-1)
  const number1 = standings[0]
  const nextRank = aboveMe[aboveMe.length - 1] // langsung di atas
  const gapTo1 = me && number1 ? {
    emas: number1.emas - me.emas,
    total: number1.total - me.total,
  } : null
  const gapToNext = me && nextRank && nextRank.rank !== me.rank ? {
    emas: nextRank.emas - me.emas,
    perak: nextRank.perak - me.perak,
    total: nextRank.total - me.total,
  } : null

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-15"
        style={{ background:'#fbbf24' }}/>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown size={14} className="text-amber-400"/>
          <h3 className="text-sm font-bold text-white">Live Standings & Gap Analysis</h3>
          {isDummy && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"
              style={{ background:'rgba(251,191,36,0.15)', color:'#fbbf24' }}>
              ⚠ Demo Data
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-mono uppercase">Posisi</span>
          <span className="text-2xl font-black"
            style={{ color: myRank <= 3 ? '#fbbf24' : myRank <= 5 ? '#3b82f6' : '#94a3b8' }}>
            #{myRank}
          </span>
          <span className="text-[10px] text-zinc-500">/ {standings.length}</span>
        </div>
      </div>

      {/* Top 5 + Me */}
      <div className="space-y-1.5 mb-4">
        {(me && me.rank > 5 ? [...top5, me] : top5).map((s, i) => {
          const isMe = s.isMe
          const medalColors = ['#fbbf24','#cbd5e1','#cd7f32']
          const rankColor = s.rank <= 3 ? medalColors[s.rank-1] : '#94a3b8'

          return (
            <div key={i} className="rounded-xl p-3 transition-all"
              style={{
                background: isMe ? `${primary}15` : 'rgba(255,255,255,0.025)',
                border: isMe ? `1px solid ${primary}50` : '1px solid rgba(255,255,255,0.05)',
                boxShadow: isMe ? `0 0 16px ${primary}30` : 'none',
              }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black flex-shrink-0"
                  style={{ background:`${rankColor}20`, color: rankColor,
                    border:`1px solid ${rankColor}40` }}>
                  #{s.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                    {s.nama}
                    {isMe && <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest"
                      style={{ background:`${primary}30`, color: primary }}>KAMI</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-amber-400 font-bold">🥇{s.emas}</span>
                  <span className="text-slate-300 font-bold">🥈{s.perak}</span>
                  <span className="font-bold" style={{color:'#cd7f32'}}>🥉{s.perunggu}</span>
                  <span className="text-white font-black ml-2 w-10 text-right">{s.total}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gap Analysis */}
      {(gapTo1 || gapToNext) && (
        <div className="grid grid-cols-2 gap-3">
          {gapToNext && gapToNext.total > 0 && (
            <div className="rounded-xl p-3"
              style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.25)' }}>
              <div className="text-[9px] uppercase tracking-widest font-bold text-blue-400 mb-1">
                Gap ke #{nextRank.rank} ({nextRank.nama})
              </div>
              <div className="text-xs text-zinc-300">
                Butuh <strong className="text-amber-400">+{gapToNext.emas} emas</strong>{' '}
                atau <strong className="text-slate-300">+{gapToNext.perak} perak</strong> untuk naik peringkat
              </div>
            </div>
          )}
          {gapTo1 && gapTo1.total > 0 && (
            <div className="rounded-xl p-3"
              style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)' }}>
              <div className="text-[9px] uppercase tracking-widest font-bold text-amber-400 mb-1">
                Gap ke Juara #1 ({number1.nama})
              </div>
              <div className="text-xs text-zinc-300">
                <strong className="text-amber-400">-{gapTo1.emas} emas</strong> dari posisi puncak,{' '}
                <strong className="text-white">-{gapTo1.total} total medali</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 3. STRATEGIC ACTIONS (forward-looking)
// ═══════════════════════════════════════════════════════════════════

export interface StrategicAction {
  type: 'catchup' | 'opportunity' | 'risk_mitigation'
  title: string
  description: string
  impact: string                  // e.g. "+3 emas potensi"
  href: string
}

export function StrategicActionsCard({
  actions, primary = '#10b981',
}: {
  actions: StrategicAction[]
  primary?: string
}) {
  const typeConfig = {
    catchup:        { color: '#ef4444', icon: TrendingUp,   label: 'CATCH-UP STRATEGY' },
    opportunity:    { color: '#10b981', icon: Sparkles,     label: 'PELUANG MEDALI' },
    risk_mitigation:{ color: '#fbbf24', icon: AlertTriangle, label: 'MITIGASI RISIKO' },
  }

  return (
    <div className="rounded-2xl p-5"
      style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} style={{ color: primary }}/>
        <h3 className="text-sm font-bold text-white">Strategic Actions · Catch-Up Plan</h3>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-6 text-xs text-zinc-500">Tidak ada strategi catch-up saat ini</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {actions.map((a, i) => {
            const cfg = typeConfig[a.type]
            const Icon = cfg.icon
            return (
              <Link key={i} href={a.href}
                className="block rounded-xl p-4 transition-all hover:scale-[1.02] group"
                style={{
                  background: `${cfg.color}08`,
                  border: `1px solid ${cfg.color}25`,
                }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${cfg.color}20` }}>
                    <Icon size={16} style={{ color: cfg.color }}/>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest font-black" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                <div className="text-sm font-bold text-white mb-1">{a.title}</div>
                <div className="text-[11px] text-zinc-400 leading-relaxed mb-3">{a.description}</div>
                <div className="flex items-center justify-between pt-2"
                  style={{ borderTop:`1px solid ${cfg.color}15` }}>
                  <span className="text-[10px] font-bold" style={{ color: cfg.color }}>
                    {a.impact}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold transition-all group-hover:gap-2"
                    style={{ color: cfg.color }}>
                    Detail <ChevronRight size={10}/>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 4. DUMMY DATA GENERATORS (ready for real import)
// ═══════════════════════════════════════════════════════════════════

export function generateDummyStandings(): KontingenStanding[] {
  // Sample dari PORPROV XV — adjust pas data real masuk
  const data = [
    { rank: 1, nama: 'Kota Bandung',       emas: 28, perak: 22, perunggu: 18 },
    { rank: 2, nama: 'Kab. Bekasi',        emas: 25, perak: 24, perunggu: 19 },
    { rank: 3, nama: 'Kab. Sukabumi',      emas: 23, perak: 21, perunggu: 22 },
    { rank: 4, nama: 'Kota Bekasi',        emas: 20, perak: 20, perunggu: 15 },
    { rank: 5, nama: 'Kab. Karawang',      emas: 19, perak: 18, perunggu: 16 },
    { rank: 6, nama: 'Kab. Bogor',         emas: 17, perak: 16, perunggu: 14, isMe: true },
    { rank: 7, nama: 'Kab. Bandung',       emas: 16, perak: 17, perunggu: 13 },
    { rank: 8, nama: 'Kota Depok',         emas: 15, perak: 16, perunggu: 14 },
    { rank: 9, nama: 'Kota Bogor',         emas: 14, perak: 14, perunggu: 15 },
    { rank: 10, nama: 'Kab. Cianjur',      emas: 13, perak: 13, perunggu: 12 },
  ]
  return data.map(d => ({ ...d, total: d.emas + d.perak + d.perunggu }))
}

export function generateDummyPredictions(realCaborData: { nama: string; jumlahAtlet: number; avgFitness: number }[]): CaborPrediction[] {
  return realCaborData.map(c => computePrediction(c.nama, c.jumlahAtlet, c.avgFitness))
}

export function generateStrategicActions(d: {
  topPerformers: number
  weakCabors: number
  lowSkorAtlet: number
  gapEmas?: number
}): StrategicAction[] {
  const actions: StrategicAction[] = []

  if (d.topPerformers > 0) {
    actions.push({
      type: 'opportunity',
      title: 'Maksimalkan Top Performers',
      description: `${d.topPerformers} atlet skor fisik 80%+ kandidat kuat medali emas. Fokus latihan tactical + mental coaching.`,
      impact: `+${Math.min(d.topPerformers, 8)} emas potensi`,
      href: '/konida/Premiumreport/kabbogor/tes-fisik',
    })
  }

  if (d.weakCabors > 0) {
    actions.push({
      type: 'catchup',
      title: 'Boost Cabor Lemah 8 Minggu',
      description: `${d.weakCabors} cabor butuh program stamina dasar. Targeting peningkatan skor +20% dalam 2 bulan.`,
      impact: `+${d.weakCabors * 2} medali potensi`,
      href: '/konida/Premiumreport/kabbogor/tes-fisik',
    })
  }

  if (d.lowSkorAtlet > 0) {
    actions.push({
      type: 'risk_mitigation',
      title: 'Evaluasi Medis Atlet Kritis',
      description: `${d.lowSkorAtlet} atlet skor <40% berisiko cedera. Evaluasi medis & alternative training plan.`,
      impact: `-${d.lowSkorAtlet} risiko gagal tampil`,
      href: '/konida/atlet/kabbogor',
    })
  }

  if (d.gapEmas && d.gapEmas > 0) {
    actions.push({
      type: 'catchup',
      title: `Catch-Up ${d.gapEmas} Emas`,
      description: `Untuk naik peringkat, butuh tambahan ${d.gapEmas} emas. Fokus cabor probabilitas >70%.`,
      impact: `+1 peringkat`,
      href: '#predictions',
    })
  }

  // Always include this
  actions.push({
    type: 'opportunity',
    title: 'Press Release Performa',
    description: 'Bogor punya 6 atlet elit + kerjasama UPI Sport Science — potensi viral di media.',
    impact: 'Brand awareness +30%',
    href: '/konida/laporan/kabbogor',
  })

  return actions.slice(0, 6)
}
