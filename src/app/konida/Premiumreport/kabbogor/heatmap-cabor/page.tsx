'use client'
// src/app/konida/Premiumreport/kabbogor/heatmap-cabor/page.tsx
// Heatmap Cabor × Komponen Fisik — Kab. Bogor

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Activity, Target, RefreshCw, AlertTriangle, Info,
  X, Users, TrendingUp, TrendingDown, Minus, ChevronRight, BarChart2,
  Search, Eye,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { Heatmap } from '@/components/konida/TesFisikHelpers'
import AthleteDetailDrawer from '@/components/konida/AthleteDetailDrawer'

const KATEGORI_COLOR: Record<string, string> = {
  'Baik Sekali':   '#10b981',
  'Baik':          '#3b82f6',
  'Cukup':         '#fbbf24',
  'Kurang':        '#f97316',
  'Kurang Sekali': '#ef4444',
}

// Dark select — fixes white-on-white option text on all browsers
const SELECT_STYLE: React.CSSProperties = {
  background:  '#0f172a',
  border:      '1px solid rgba(255,255,255,0.1)',
  color:       '#e2e8f0',
  colorScheme: 'dark',
}
const OPTION_STYLE: React.CSSProperties = {
  background: '#0f172a',
  color:      '#e2e8f0',
}

const PRIMARY = '#065f46'
const BACK    = '/konida/Premiumreport/kabbogor'

// ── Helpers ──────────────────────────────────────────────
function getZone(val: number): { label: string; color: string; bg: string } {
  if (val >= 80) return { label: 'Sangat Baik',  color: '#10b981', bg: 'rgba(16,185,129,0.12)'  }
  if (val >= 65) return { label: 'Baik',          color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  }
  if (val >= 50) return { label: 'Cukup',         color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  }
  if (val >= 35) return { label: 'Kurang',        color: '#f97316', bg: 'rgba(249,115,22,0.12)'  }
  return              { label: 'Sangat Kurang', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   }
}

// ── Detail Panel ─────────────────────────────────────────
interface Selected {
  cabor:    string
  komponen: string
  val:      number
}

function DetailPanel({
  selected, data, onClose,
}: {
  selected: Selected | null
  data: any
  onClose: () => void
}) {
  const visible = !!selected

  if (!selected) return (
    <div className="fixed inset-y-0 right-0 z-50 w-[360px] pointer-events-none"
      style={{ transform:'translateX(100%)', transition:'transform 0.35s cubic-bezier(0.16,1,0.3,1)' }}/>
  )

  const zone = getZone(selected.val)

  // All komponen for this cabor (from komponen_per_cabor)
  const caborKomponen: any[] = (data?.komponen_per_cabor || [])
    .filter((k: any) => k.cabor_nama === selected.cabor)
    .sort((a: any, b: any) => (b.rata_capaian ?? 0) - (a.rata_capaian ?? 0))

  // Overall average for the selected komponen
  const kontigenAvg: number = (data?.komponen_overall || [])
    .find((k: any) => k.komponen === selected.komponen)?.rata_capaian ?? 0

  // Cabor meta (jumlah_atlet_tes, rata_kesimpulan)
  const caborMeta: any = (data?.per_cabor || [])
    .find((c: any) => c.cabor_nama === selected.cabor) ?? {}

  const delta = selected.val - kontigenAvg
  const DeltaIcon = delta > 2 ? TrendingUp : delta < -2 ? TrendingDown : Minus
  const deltaColor = delta > 2 ? '#10b981' : delta < -2 ? '#ef4444' : '#fbbf24'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ transition:'opacity 0.3s' }}
      />

      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-[360px] flex flex-col overflow-hidden"
        style={{
          background: '#030e0a',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          transform: 'translateX(0)',
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b"
          style={{ borderColor:'rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.3)' }}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: zone.bg, color: zone.color, border:`1px solid ${zone.color}30` }}>
                {zone.label}
              </span>
            </div>
            <h2 className="text-base font-black text-white leading-tight">{selected.cabor}</h2>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: PRIMARY }}>
              Komponen: {selected.komponen}
            </p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0 mt-0.5">
            <X size={15} className="text-zinc-400"/>
          </button>
        </div>

        {/* Scroll body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
          style={{ scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.1) transparent' }}>

          {/* Big score */}
          <div className="rounded-2xl p-5 text-center relative overflow-hidden"
            style={{ background: zone.bg, border:`1px solid ${zone.color}25` }}>
            <div className="absolute inset-0 opacity-5"
              style={{ background:`radial-gradient(circle at center, ${zone.color}, transparent 70%)` }}/>
            <div className="text-6xl font-black mb-1" style={{ color: zone.color }}>
              {selected.val}
            </div>
            <div className="text-xs text-zinc-400 font-mono">% rata-rata capaian</div>

            {/* Delta vs kontingen */}
            {kontigenAvg > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <DeltaIcon size={13} style={{ color: deltaColor }}/>
                <span className="text-xs font-bold" style={{ color: deltaColor }}>
                  {delta > 0 ? '+' : ''}{Math.round(delta)}%
                </span>
                <span className="text-[11px] text-zinc-500">
                  vs rata-rata kontingen ({Math.round(kontigenAvg)}%)
                </span>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 text-center"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <Users size={14} className="mx-auto mb-1.5 text-zinc-500"/>
              <div className="text-lg font-black text-white">{caborMeta.jumlah_atlet_tes ?? '—'}</div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Atlet Dites</div>
            </div>
            <div className="rounded-xl p-3 text-center"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <BarChart2 size={14} className="mx-auto mb-1.5 text-zinc-500"/>
              <div className="text-lg font-black" style={{ color: getZone(caborMeta.rata_kesimpulan ?? 0).color }}>
                {caborMeta.rata_kesimpulan ?? '—'}{caborMeta.rata_kesimpulan != null ? '%' : ''}
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Rata Cabor</div>
            </div>
          </div>

          {/* Komponen breakdown for this cabor */}
          {caborKomponen.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target size={12} style={{ color: PRIMARY }}/>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: PRIMARY }}>
                  Semua Komponen — {selected.cabor}
                </span>
              </div>
              <div className="space-y-2.5">
                {caborKomponen.map((k: any) => {
                  const z = getZone(k.rata_capaian ?? 0)
                  const isSelected = k.komponen === selected.komponen
                  // Get kontingen overall avg for this komponen
                  const kAvg = (data?.komponen_overall || [])
                    .find((o: any) => o.komponen === k.komponen)?.rata_capaian ?? 0
                  return (
                    <div key={k.komponen}
                      className="rounded-xl p-3 transition-all"
                      style={{
                        background: isSelected ? `${z.color}10` : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${isSelected ? `${z.color}35` : 'rgba(255,255,255,0.07)'}`,
                      }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <ChevronRight size={11} style={{ color: z.color, flexShrink:0 }}/>
                          )}
                          <span className="text-xs font-bold" style={{ color: isSelected ? z.color : 'rgba(255,255,255,0.7)' }}>
                            {k.komponen}
                          </span>
                        </div>
                        <span className="text-xs font-black font-mono" style={{ color: z.color }}>
                          {Math.round(k.rata_capaian ?? 0)}%
                        </span>
                      </div>
                      {/* Bar + kontingen avg marker */}
                      <div className="relative h-2 rounded-full overflow-hidden"
                        style={{ background:'rgba(255,255,255,0.06)' }}>
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                          style={{ width:`${k.rata_capaian ?? 0}%`, background: z.color, opacity: 0.8 }}/>
                        {/* Kontingen avg marker */}
                        {kAvg > 0 && (
                          <div className="absolute inset-y-0 w-0.5 rounded"
                            style={{ left:`${kAvg}%`, background:'rgba(255,255,255,0.5)' }}/>
                        )}
                      </div>
                      {kAvg > 0 && (
                        <div className="mt-1 flex items-center gap-1">
                          <div className="w-2 h-0.5 rounded" style={{ background:'rgba(255,255,255,0.4)' }}/>
                          <span className="text-[9px] text-zinc-600">
                            Rata kontingen: {Math.round(kAvg)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cabor comparison — where does this score rank among all cabor for this komponen */}
          <CaborRankPanel
            selectedCabor={selected.cabor}
            komponen={selected.komponen}
            selectedVal={selected.val}
            komponen_per_cabor={data?.komponen_per_cabor || []}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t text-center"
          style={{ borderColor:'rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.2)' }}>
          <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
            FPOK UPI · Sport Science Lab · Tahap 3
          </p>
        </div>
      </div>
    </>
  )
}

// Rank panel: shows where the selected cabor ranks for this komponen
function CaborRankPanel({
  selectedCabor, komponen, selectedVal, komponen_per_cabor,
}: {
  selectedCabor: string; komponen: string; selectedVal: number; komponen_per_cabor: any[]
}) {
  const peers = komponen_per_cabor
    .filter((k: any) => k.komponen === komponen && k.rata_capaian != null)
    .sort((a: any, b: any) => (b.rata_capaian ?? 0) - (a.rata_capaian ?? 0))

  if (peers.length < 2) return null

  const rank = peers.findIndex((p: any) => p.cabor_nama === selectedCabor) + 1

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={12} style={{ color: PRIMARY }}/>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: PRIMARY }}>
          Peringkat Antar Cabor — {komponen}
        </span>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.07)' }}>
        {rank > 0 && (
          <div className="px-3 py-2 text-[11px] font-bold border-b"
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderColor: 'rgba(255,255,255,0.07)',
              color: rank <= 3 ? '#fbbf24' : 'rgba(255,255,255,0.5)',
            }}>
            Peringkat #{rank} dari {peers.length} cabor
          </div>
        )}
        <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.08) transparent' }}>
          {peers.map((p: any, i: number) => {
            const isMe = p.cabor_nama === selectedCabor
            const z = getZone(p.rata_capaian ?? 0)
            return (
              <div key={p.cabor_nama}
                className="flex items-center gap-3 px-3 py-2 border-b last:border-0"
                style={{
                  borderColor: 'rgba(255,255,255,0.04)',
                  background: isMe ? `${z.color}08` : 'transparent',
                }}>
                <span className="text-[10px] font-mono w-5 text-right flex-shrink-0"
                  style={{ color: i < 3 ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate font-medium"
                    style={{ color: isMe ? z.color : 'rgba(255,255,255,0.6)', fontWeight: isMe ? 700 : 400 }}>
                    {isMe && '› '}{p.cabor_nama}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full"
                      style={{ width:`${p.rata_capaian ?? 0}%`, background: z.color, opacity: isMe ? 1 : 0.5 }}/>
                  </div>
                  <span className="text-[10px] font-bold font-mono w-8 text-right" style={{ color: z.color }}>
                    {Math.round(p.rata_capaian ?? 0)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════
export default function HeatmapCaborPage() {
  const [data,     setData]     = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [animIn,   setAnimIn]   = useState(false)
  const [selected, setSelected] = useState<Selected | null>(null)

  // Daftar atlet state
  const [searchQuery,    setSearchQuery]    = useState('')
  const [filterKategori, setFilterKategori] = useState('all')
  const [filterCabor,    setFilterCabor]    = useState('all')
  const [pageSize,       setPageSize]       = useState(10)
  const [selectedAtletId, setSelectedAtletId] = useState<number | null>(null)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  useEffect(() => {
    fetch('/api/konida/tes-fisik?kontingen_id=1')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Close panel on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleCellClick = useCallback((cabor: string, komponen: string) => {
    const kData = (data?.komponen_per_cabor || [])
      .find((k: any) => k.cabor_nama === cabor && k.komponen === komponen)
    const val = kData?.rata_capaian ?? 0
    setSelected({ cabor, komponen, val: Math.round(val) })
  }, [data])

  const ani = (d = 0) => ({
    style: { transitionDelay:`${d}ms`, transition:'all 0.55s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#020617' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor:`${PRIMARY}20`, borderTopColor:PRIMARY }}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color:PRIMARY }}>
          Memuat data heatmap...
        </p>
      </div>
    </div>
  )

  if (!data || !data.summary || data.summary.total_atlet === 0) return (
    <div className="min-h-screen p-5" style={{ background:'#020617' }}>
      <Link href={BACK} className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-4">
        <ArrowLeft size={14}/> Kembali
      </Link>
      <div className="rounded-2xl p-6"
        style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.25)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5"/>
          <div>
            <h2 className="text-base font-bold text-amber-300 mb-1">Belum Ada Data Tes Fisik</h2>
            <p className="text-sm text-zinc-300">Data biomotorik Kab. Bogor belum tersedia. Hubungi tim UPI Sport Science.</p>
          </div>
        </div>
      </div>
    </div>
  )

  const komponen = data.komponen_overall || []

  return (
    <div className="min-h-screen text-slate-300" style={{ background:'#020915' }}>

      {/* Glows */}
      <div className="fixed top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background:`radial-gradient(circle,${PRIMARY},transparent 70%)`, zIndex:0 }}/>
      <div className="fixed bottom-[-150px] right-[-150px] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
        style={{ background:`radial-gradient(circle,${PRIMARY},transparent 70%)`, zIndex:0 }}/>
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage:`linear-gradient(${PRIMARY}10 1px,transparent 1px),linear-gradient(90deg,${PRIMARY}10 1px,transparent 1px)`,
        backgroundSize:'32px 32px', zIndex:0,
      }}/>

      {/* HEADER */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-slate-800 backdrop-blur-xl"
        style={{ background:'rgba(2,6,23,0.93)' }}>
        <div className="flex items-center gap-3">
          <Link href={BACK} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <ArrowLeft size={16} className="text-slate-400"/>
          </Link>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background:`${PRIMARY}15`, border:`1px solid ${PRIMARY}35`, boxShadow:`0 0 20px ${PRIMARY}15` }}>
            <Activity size={18} style={{ color:PRIMARY }}/>
          </div>
          <div>
            <h1 className="text-white font-black text-base tracking-wide">HEATMAP CABOR × KOMPONEN FISIK</h1>
            <div className="text-[10px] font-mono uppercase tracking-widest mt-0.5" style={{ color:PRIMARY }}>
              Kab. Bogor · Sport Science FPOK UPI · Klik sel untuk detail
            </div>
          </div>
        </div>
        <button onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)' }}>
          <RefreshCw size={12}/> Refresh
        </button>
      </nav>

      <main className="p-5 max-w-[1600px] mx-auto space-y-5 relative z-10"
        style={{ paddingRight: selected ? '380px' : undefined, transition:'padding 0.35s ease' }}>

        {/* ── 1. PROFIL KOMPONEN FISIK (RADAR) ── */}
        <div {...ani(0)}>
          <Panel title="Profil Komponen Fisik — Rata-rata Kontingen" icon={Target} primary={PRIMARY}>
            {komponen.length === 0 ? <Empty/> : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Radar */}
                  <div className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={komponen} outerRadius="75%">
                        <PolarGrid stroke="rgba(255,255,255,0.07)"/>
                        <PolarAngleAxis dataKey="komponen" tick={{ fill:'#94a3b8', fontSize:12, fontWeight:600 }}/>
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill:'#475569', fontSize:9 }}/>
                        <Radar name="Rata Capaian" dataKey="rata_capaian"
                          stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.3} strokeWidth={2.5}/>
                        <Tooltip
                          formatter={(v: any) => [`${v}%`, 'Rata Capaian']}
                          contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:8, fontSize:12 }}/>
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Komponen ranking bars */}
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color:PRIMARY }}>
                      Ranking Komponen
                    </div>
                    {[...komponen]
                      .sort((a: any, b: any) => (b.rata_capaian ?? 0) - (a.rata_capaian ?? 0))
                      .map((k: any, i: number) => {
                        const pct = k.rata_capaian ?? 0
                        const { color } = getZone(pct)
                        return (
                          <div key={k.komponen}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[11px] text-zinc-300 truncate pr-2">{k.komponen}</span>
                              <span className="text-[11px] font-bold font-mono shrink-0" style={{ color }}>{pct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width:`${pct}%`, background: color, transitionDelay:`${i * 60}ms` }}/>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl text-xs"
                  style={{ background:'rgba(0,0,0,0.3)', border:`1px solid rgba(255,255,255,0.06)` }}>
                  <Info size={12} className="inline mr-1.5 text-zinc-400"/>
                  Komponen terlemah:{' '}
                  <strong className="text-orange-400">{komponen[0]?.komponen}</strong> ({komponen[0]?.rata_capaian}%){' '}
                  &{' '}
                  <strong className="text-orange-400">{komponen[1]?.komponen}</strong> ({komponen[1]?.rata_capaian}%).{' '}
                  Terkuat:{' '}
                  <strong className="text-emerald-400">{komponen[komponen.length - 1]?.komponen}</strong> ({komponen[komponen.length - 1]?.rata_capaian}%).
                </div>
              </>
            )}
          </Panel>
        </div>

        {/* ── 2. HEATMAP CABOR × KOMPONEN ── */}
        <div {...ani(120)}>
          <Panel title="Heatmap: Cabor × Komponen Fisik" icon={Activity} primary={PRIMARY}>
            <div className="text-[11px] text-zinc-400 mb-4 flex items-center flex-wrap gap-2">
              <span>Klik sel untuk lihat detail analisis per cabor-komponen.</span>
              {[
                { l:'≥80% Sangat Baik', c:'#10b981' },
                { l:'65–79% Baik',      c:'#3b82f6' },
                { l:'50–64% Cukup',     c:'#fbbf24' },
                { l:'35–49% Kurang',    c:'#f97316' },
                { l:'<35% Sangat Kurang', c:'#ef4444' },
              ].map(s => (
                <span key={s.l} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded" style={{ background:s.c, opacity:0.7 }}/>
                  <span className="text-[10px]">{s.l}</span>
                </span>
              ))}
            </div>
            {(data.per_cabor || []).length === 0 ? <Empty/> : (
              <Heatmap
                cabors={data.per_cabor || []}
                komponen_per_cabor={data.komponen_per_cabor || []}
                primary={PRIMARY}
                onCellClick={handleCellClick}
              />
            )}
          </Panel>
        </div>

        {/* ── 3. DAFTAR ATLET TOP 10 BY SKOR ── */}
        {(() => {
          const list = (data.atlet_list || []) as any[]
          const caborOptions: string[] = Array.from(
            new Set(list.map((a: any) => a.cabor_nama).filter(Boolean))
          ).sort() as string[]

          let filtered = list
          if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter((a: any) =>
              (a.nama_atlet || '').toLowerCase().includes(q) ||
              (a.atlet?.no_ktp || '').includes(q)
            )
          }
          if (filterKategori !== 'all') filtered = filtered.filter((a: any) => a.kesimpulan_kategori === filterKategori)
          if (filterCabor    !== 'all') filtered = filtered.filter((a: any) => a.cabor_nama === filterCabor)
          const shown = filtered.slice(0, pageSize)

          return (
            <div {...ani(240)}>
              <Panel title="Daftar Atlet · Top 10 by Skor" icon={Users} primary={PRIMARY}>
                {list.length === 0 ? <Empty/> : (
                  <>
                    {/* Filter bar */}
                    <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-white/5">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Cari nama atau NIK..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
                          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#fff' }}
                        />
                      </div>
                      <select
                        value={filterKategori}
                        onChange={e => setFilterKategori(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg outline-none"
                        style={SELECT_STYLE}
                      >
                        <option value="all"          style={OPTION_STYLE}>Semua Kategori</option>
                        <option value="Baik Sekali"  style={OPTION_STYLE}>Baik Sekali</option>
                        <option value="Baik"         style={OPTION_STYLE}>Baik</option>
                        <option value="Cukup"        style={OPTION_STYLE}>Cukup</option>
                        <option value="Kurang"       style={OPTION_STYLE}>Kurang</option>
                        <option value="Kurang Sekali"style={OPTION_STYLE}>Kurang Sekali</option>
                      </select>
                      <select
                        value={filterCabor}
                        onChange={e => setFilterCabor(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg outline-none max-w-[200px]"
                        style={SELECT_STYLE}
                      >
                        <option value="all" style={OPTION_STYLE}>Semua Cabor</option>
                        {caborOptions.map(c => (
                          <option key={c} value={c} style={OPTION_STYLE}>{c}</option>
                        ))}
                      </select>
                      <div className="text-xs text-zinc-400 self-center ml-auto">{filtered.length} atlet</div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-zinc-500 uppercase tracking-wider text-[10px]"
                            style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                            <th className="text-left p-2 font-semibold w-10">#</th>
                            <th className="text-left p-2 font-semibold">Nama Atlet</th>
                            <th className="text-left p-2 font-semibold">Cabor</th>
                            <th className="text-center p-2 font-semibold">G</th>
                            <th className="text-right p-2 font-semibold">BMI</th>
                            <th className="text-right p-2 font-semibold">Skor</th>
                            <th className="text-left p-2 font-semibold">Kategori</th>
                            <th className="text-center p-2 font-semibold">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shown.map((a: any, i: number) => (
                            <tr key={a.id}
                              className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                              style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                              onClick={() => a.atlet_id && setSelectedAtletId(a.atlet_id)}>
                              <td className="p-2 text-zinc-500 font-mono">{i + 1}</td>
                              <td className="p-2 font-semibold text-white">{a.nama_atlet}</td>
                              <td className="p-2 text-zinc-300">{a.cabor_nama || '—'}</td>
                              <td className="p-2 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                                  style={{
                                    background: a.jenis_kelamin === 'L' ? 'rgba(59,130,246,0.15)' : 'rgba(236,72,153,0.15)',
                                    color:      a.jenis_kelamin === 'L' ? '#60a5fa'               : '#f472b6',
                                  }}>
                                  {a.jenis_kelamin || '—'}
                                </span>
                              </td>
                              <td className="p-2 text-right font-mono text-zinc-400">
                                {a.bmi ? a.bmi.toFixed(1) : '—'}
                              </td>
                              <td className="p-2 text-right font-bold font-mono"
                                style={{ color: (a.kesimpulan_persen||0) >= 80 ? '#10b981'
                                             : (a.kesimpulan_persen||0) >= 60 ? '#3b82f6'
                                             : (a.kesimpulan_persen||0) >= 40 ? '#fbbf24' : '#f97316' }}>
                                {a.kesimpulan_persen != null ? `${a.kesimpulan_persen}%` : '—'}
                              </td>
                              <td className="p-2">
                                {a.kesimpulan_kategori && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                                    style={{
                                      background: `${KATEGORI_COLOR[a.kesimpulan_kategori] || PRIMARY}20`,
                                      color:      KATEGORI_COLOR[a.kesimpulan_kategori]    || PRIMARY,
                                    }}>
                                    {a.kesimpulan_kategori}
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {a.atlet_id ? (
                                  <button
                                    onClick={e => { e.stopPropagation(); setSelectedAtletId(a.atlet_id) }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold hover:opacity-80 transition"
                                    style={{ background:`${PRIMARY}20`, color: PRIMARY }}>
                                    <Eye size={10}/> Detail
                                  </button>
                                ) : (
                                  <span className="text-zinc-600 text-[10px]">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Expand */}
                    {filtered.length > pageSize && (
                      <div className="text-center pt-4">
                        <button
                          onClick={() => setPageSize(p => p === 10 ? filtered.length : 10)}
                          className="inline-flex items-center gap-2 px-5 py-2 text-xs rounded-lg hover:bg-white/5 transition font-medium"
                          style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${PRIMARY}40`, color: PRIMARY }}>
                          {pageSize === 10
                            ? <>Lihat Semua {filtered.length} Atlet <ChevronRight size={12}/></>
                            : <>Tutup · Tampilkan 10 teratas</>}
                        </button>
                      </div>
                    )}

                    {filtered.length === 0 && (
                      <div className="text-center py-8 text-zinc-500 text-xs">
                        Tidak ada atlet yang cocok dengan filter
                      </div>
                    )}
                  </>
                )}
              </Panel>
            </div>
          )
        })()}

        {/* Footer */}
        <div className="text-center pb-6 pt-2">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            Sumber: Laporan Tes Biomotorik · FPOK Universitas Pendidikan Indonesia
          </p>
        </div>
      </main>

      {/* Slide-in detail panel */}
      <DetailPanel
        selected={selected}
        data={data}
        onClose={() => setSelected(null)}
      />

      {/* Athlete Detail Drawer */}
      <AthleteDetailDrawer
        atletId={selectedAtletId}
        primary={PRIMARY}
        onClose={() => setSelectedAtletId(null)}
      />
    </div>
  )
}

function Panel({ title, icon: Icon, children, primary }: any) {
  return (
    <div className="rounded-2xl p-4 lg:p-5"
      style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} style={{ color: primary }}/>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: primary }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Empty() {
  return <div className="text-center py-10 text-xs text-zinc-500">Data belum tersedia</div>
}
