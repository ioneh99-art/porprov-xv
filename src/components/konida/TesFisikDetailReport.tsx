'use client'
// src/components/konida/TesFisikDetailReport.tsx
// Shared component buat detail laporan Tes Biomotorik di Premium Report
// Pakai parametric primary color sesuai tenant (Bogor=green, Bandung=biru)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity, ArrowLeft, Users, Target, Award, AlertTriangle,
  Heart, TrendingUp, ChevronRight, RefreshCw, Info,
  Trophy, Flame, Wind, Move, Dumbbell, Zap, Footprints,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  AnimatedNumber, Sparkline, Gauge, Heatmap,
  FuturisticDonut, FuturisticBars,
  generateInsights, InsightCard,
} from './TesFisikHelpers'

const KATEGORI_COLOR: Record<string,string> = {
  'Baik Sekali':   '#10b981',
  'Baik':          '#3b82f6',
  'Cukup':         '#fbbf24',
  'Kurang':        '#f97316',
  'Kurang Sekali': '#ef4444',
}

const BMI_COLOR: Record<string,string> = {
  underweight:'#fbbf24', normal:'#10b981',
  overweight:'#f97316', obese:'#ef4444', unknown:'#475569',
}

const KOMPONEN_ICON: Record<string,any> = {
  Flexibility: Move, Balance: Target, 'Speed Reaction': Zap,
  Speed: Wind, Agility: Footprints, Power: Flame,
  Strength: Dumbbell, 'Local Muscle Endurance': Activity,
  'Core Stability': Heart, 'Aerobic Capacity': Heart,
}

interface Props {
  kontingenId: number
  tenantName: string         // 'Kab. Bogor' / 'Kab. Bandung'
  tenantSlug: string         // 'kabbogor' / 'kabbandung'
  primary: string            // hex color
  backHref: string           // /konida/Premiumreport/kabbogor
  caborFilter?: string       // opsional: scope ke 1 cabor (mis. 'Dayung')
}

export default function TesFisikDetailReport({
  kontingenId, tenantName, tenantSlug, primary, backHref, caborFilter,
}: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn] = useState(false)

  // ── Collapse state ──
  const [showAllCabor, setShowAllCabor] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  useEffect(() => {
    const url = `/api/konida/tes-fisik?kontingen_id=${kontingenId}` + (caborFilter ? `&cabor=${encodeURIComponent(caborFilter)}` : '')
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kontingenId, caborFilter])

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.55s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background:'#020617' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: `${primary}20`, borderTopColor: primary }}/>
          <p className="font-mono text-xs uppercase tracking-widest" style={{ color: primary }}>
            Memuat data tes biomotorik...
          </p>
        </div>
      </div>
    )
  }

  if (!data || !data.summary || data.summary.total_atlet === 0) {
    return (
      <div className="min-h-screen p-5" style={{ background:'#020617' }}>
        <Link href={backHref}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-4">
          <ArrowLeft size={14}/> Kembali ke Premium Report
        </Link>
        <div className="rounded-2xl p-6"
          style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.25)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <div>
              <h2 className="text-base font-bold text-amber-300 mb-1">Belum Ada Data Tes Fisik</h2>
              <p className="text-sm text-zinc-300">
                Data biomotorik {tenantName} belum tersedia di sistem.
                Hubungi tim UPI Sport Science untuk koordinasi.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const sm = data.summary
  const kategoriData = Object.entries(data.kategori_distribution).map(([k, v]) => ({
    name: k, value: v as number, color: KATEGORI_COLOR[k] || '#64748b',
  })).filter(d => d.value > 0)

  const bmiData = Object.entries(data.bmi_distribution).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v as number, color: BMI_COLOR[k as string],
  })).filter(d => d.value > 0)

  return (
    <div className="min-h-screen text-slate-300 relative overflow-hidden" style={{ background:'#020915' }}>

      {/* Decorative radial glows — match login atlet vibe */}
      <div className="fixed top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background:`radial-gradient(circle,${primary},transparent 70%)`, zIndex:0 }}/>
      <div className="fixed bottom-[-150px] right-[-150px] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
        style={{ background:`radial-gradient(circle,${primary},transparent 70%)`, zIndex:0 }}/>

      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage:`linear-gradient(${primary}10 1px,transparent 1px),linear-gradient(90deg,${primary}10 1px,transparent 1px)`,
        backgroundSize:'32px 32px', zIndex:0,
      }}/>

      {/* HEADER */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-slate-800 backdrop-blur-xl"
        style={{ background:'rgba(2,6,23,0.93)' }}>
        <div className="flex items-center gap-3">
          <Link href={backHref} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <ArrowLeft size={16} className="text-slate-400"/>
          </Link>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background:`${primary}15`, border:`1px solid ${primary}35`, boxShadow:`0 0 20px ${primary}15` }}>
            <Activity size={18} style={{ color: primary }}/>
          </div>
          <div>
            <h1 className="text-white font-black text-base tracking-wide">LAPORAN TES BIOMOTORIK</h1>
            <div className="text-[10px] font-mono uppercase tracking-widest mt-0.5" style={{ color: primary }}>
              {tenantName} · Sport Science FPOK UPI · Tahap 3
            </div>
          </div>
        </div>
        <button onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)' }}>
          <RefreshCw size={12}/> Refresh
        </button>
      </nav>

      <main className="p-5 max-w-[1600px] mx-auto space-y-5 relative z-10">

        {/* EXECUTIVE BRIEF */}
        <div {...ani(0)} className="rounded-2xl p-4 flex items-start gap-4"
          style={{ background:`${primary}10`, border:`1px solid ${primary}30` }}>
          <Info size={18} style={{ color: primary, flexShrink:0, marginTop:1 }}/>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: primary }}>Kesimpulan Eksekutif</div>
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong className="text-white">{sm.total_atlet} atlet</strong> tercatat,{' '}
              <strong style={{ color:'#10b981' }}>{sm.hadir} sudah tes ({sm.participation_rate}%)</strong>,{' '}
              {sm.dns > 0 && <><strong className="text-orange-400">{sm.dns} DNS</strong> perlu di-follow-up. </>}
              Rata-rata fitness <strong className="text-white">{sm.avg_fitness_persen}%</strong>.{' '}
              Komponen terlemah kontingen: <strong className="text-orange-400">
                {data.komponen_overall.slice(0, 2).map((k: any) => k.komponen).join(' & ')}
              </strong> — prioritas program latihan bersama.
            </p>
          </div>
        </div>

        {/* AI INSIGHT CARDS — auto-generated narrative */}
        <div {...ani(20)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {generateInsights(data).slice(0, 6).map((ins, i) => (
            <InsightCard key={i} insight={ins} delay={i * 80}/>
          ))}
        </div>

        {/* KOMPONEN RADAR */}
        <Panel title="Profil Komponen Fisik (Rata-rata Kontingen)" icon={Target} primary={primary} delay={40}>
          {(data.komponen_overall || []).length === 0 ? <Empty/> : (
            <>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={data.komponen_overall}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)"/>
                  <PolarAngleAxis dataKey="komponen" tick={{ fill:'#94a3b8', fontSize:11 }}/>
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill:'#475569', fontSize:9 }}/>
                  <Radar name="Rata Capaian" dataKey="rata_capaian"
                    stroke={primary} fill={primary} fillOpacity={0.35} strokeWidth={2}/>
                  <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:8 }}/>
                </RadarChart>
              </ResponsiveContainer>
              <div className="mt-3 p-3 rounded-xl text-xs"
                style={{ background:'rgba(0,0,0,0.3)', border:`1px solid rgba(255,255,255,0.06)` }}>
                💡 <strong className="text-white">Insight:</strong> Komponen{' '}
                <strong className="text-orange-400">{data.komponen_overall[0]?.komponen}</strong> ({data.komponen_overall[0]?.rata_capaian}%){' '}
                dan <strong className="text-orange-400">{data.komponen_overall[1]?.komponen}</strong> ({data.komponen_overall[1]?.rata_capaian}%){' '}
                jadi prioritas program latihan kontingen. Komponen terkuat:{' '}
                <strong className="text-emerald-400">{data.komponen_overall[data.komponen_overall.length-1]?.komponen}</strong>.
              </div>
            </>
          )}
        </Panel>

        {/* KPI ROW + GAUGE */}
        <div {...ani(80)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gauge speedometer */}
          <div className="rounded-2xl p-4 flex flex-col items-center justify-center"
            style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <Gauge value={sm.avg_fitness_persen || 0} primary={primary} label="Kontingen Health Index"/>
            <div className="mt-2 text-[10px] text-zinc-500 uppercase tracking-widest">
              Skor Rata-rata Kontingen
            </div>
          </div>

          {/* KPI grid 2x2 */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            <Kpi label="Total Atlet" value={sm.total_atlet} icon={Users} color={primary}
              spark={[Math.floor(sm.total_atlet*0.6), Math.floor(sm.total_atlet*0.75), Math.floor(sm.total_atlet*0.85), Math.floor(sm.total_atlet*0.95), sm.total_atlet]}/>
            <Kpi label="Sudah Tes" value={sm.hadir} sub={`${sm.participation_rate}%`}
              icon={Trophy} color="#10b981"
              spark={[Math.floor(sm.hadir*0.5), Math.floor(sm.hadir*0.7), Math.floor(sm.hadir*0.85), Math.floor(sm.hadir*0.95), sm.hadir]}/>
            <Kpi label="Belum Tes (DNS)" value={sm.dns} icon={AlertTriangle} color="#f97316"/>
            <Kpi label="L / P" value={`${sm.gender.L}/${sm.gender.P}`} icon={Users} color="#06b6d4"/>
          </div>
        </div>

        {/* CHARTS GRID 1 — FUTURISTIC */}
        <div {...ani(120)} className="grid lg:grid-cols-2 gap-4">

          {/* Kategori — Futuristic Donut */}
          <Panel title="Distribusi Kategori Fitness" icon={Award} primary={primary}>
            {kategoriData.length === 0 ? <Empty/> : (
              <FuturisticDonut data={kategoriData} primary={primary} total={sm.hadir}/>
            )}
          </Panel>

          {/* BMI — Futuristic Bars */}
          <Panel title="Distribusi BMI" icon={Heart} primary={primary}>
            {bmiData.length === 0 ? <Empty/> : (
              <FuturisticBars data={bmiData} primary={primary}/>
            )}
          </Panel>
        </div>

        {/* TOP & BOTTOM CABOR */}
        <div {...ani(120)} className="grid lg:grid-cols-2 gap-4">
          <Panel title="🏆 Top 5 Cabor Fisik Terkuat" icon={Trophy} primary={primary}>
            <div className="space-y-2">
              {(data.top_cabor || []).length === 0 ? <Empty/> :
                data.top_cabor.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-xl p-3"
                    style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0"
                        style={{ background:'rgba(16,185,129,0.15)' }}>#{i+1}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{c.cabor_nama}</div>
                        <div className="text-[10px] text-zinc-500">{c.jumlah_atlet_tes} atlet · {c.rata_bmi || '—'} BMI rata</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      <AnimatedNumber value={c.rata_kesimpulan || 0} suffix="%" delay={i * 100}/>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>

          <Panel title="⚠️ 5 Cabor Perlu Perhatian" icon={AlertTriangle} primary={primary}>
            <div className="space-y-2">
              {(data.bottom_cabor || []).length === 0 ? <Empty/> :
                data.bottom_cabor.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-xl p-3"
                    style={{ background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0"
                        style={{ background:'rgba(249,115,22,0.15)' }}>#{i+1}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{c.cabor_nama}</div>
                        <div className="text-[10px] text-zinc-500">{c.jumlah_atlet_tes} hadir · {c.jumlah_atlet_dns} DNS</div>
                      </div>
                    </div>
                    <div className="text-2xl font-black text-orange-400 font-mono">
                      <AnimatedNumber value={c.rata_kesimpulan || 0} suffix="%" delay={i * 100}/>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>
        </div>

        {/* TABLE PER CABOR */}
        <Panel title="Detail per Cabor · Top 10" icon={Users} primary={primary} delay={160}>
          {(() => {
            const sortedCabor = (data.per_cabor || []).sort((a:any,b:any)=>(b.rata_kesimpulan||0)-(a.rata_kesimpulan||0))
            const totalCabor = sortedCabor.length
            const shownCabor = showAllCabor ? sortedCabor : sortedCabor.slice(0, 10)

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs lg:text-sm">
                    <thead>
                      <tr className="text-zinc-500 uppercase tracking-wider text-[10px]"
                        style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                        <th className="text-left p-2.5 font-semibold">#</th>
                        <th className="text-left p-2.5 font-semibold">Cabor</th>
                        <th className="text-right p-2.5 font-semibold">Hadir</th>
                        <th className="text-right p-2.5 font-semibold">DNS</th>
                        <th className="text-right p-2.5 font-semibold">Rata Fitness</th>
                        <th className="text-right p-2.5 font-semibold">Rata BMI</th>
                        <th className="text-center p-2.5 font-semibold">Distribusi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownCabor.map((c: any, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors"
                          style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                          <td className="p-2.5 text-zinc-500 font-mono">{i + 1}</td>
                          <td className="p-2.5 font-semibold text-white">{c.cabor_nama}</td>
                          <td className="p-2.5 text-right text-zinc-300 font-mono">{c.jumlah_atlet_tes}</td>
                          <td className="p-2.5 text-right font-mono"
                            style={{ color: c.jumlah_atlet_dns > 0 ? '#f97316' : '#475569' }}>
                            {c.jumlah_atlet_dns}
                          </td>
                          <td className="p-2.5 text-right font-bold font-mono"
                            style={{ color: (c.rata_kesimpulan||0) >= 70 ? '#10b981' :
                                    (c.rata_kesimpulan||0) >= 50 ? '#fbbf24' : '#f97316' }}>
                            {c.rata_kesimpulan || '—'}%
                          </td>
                          <td className="p-2.5 text-right font-mono text-zinc-400">{c.rata_bmi || '—'}</td>
                          <td className="p-2.5">
                            <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background:'rgba(255,255,255,0.04)' }}>
                              {c.n_baik_sekali > 0 && <div style={{flex:c.n_baik_sekali, background:KATEGORI_COLOR['Baik Sekali']}}/>}
                              {c.n_baik > 0          && <div style={{flex:c.n_baik,         background:KATEGORI_COLOR['Baik']}}/>}
                              {c.n_cukup > 0         && <div style={{flex:c.n_cukup,        background:KATEGORI_COLOR['Cukup']}}/>}
                              {c.n_kurang > 0        && <div style={{flex:c.n_kurang,       background:KATEGORI_COLOR['Kurang']}}/>}
                              {c.n_kurang_sekali > 0 && <div style={{flex:c.n_kurang_sekali,background:KATEGORI_COLOR['Kurang Sekali']}}/>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Expand button */}
                {totalCabor > 10 && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => setShowAllCabor(s => !s)}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs rounded-lg hover:bg-white/5 transition font-medium"
                      style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${primary}40`, color: primary }}
                    >
                      {showAllCabor
                        ? <>Tutup Detail · Tampilkan 10 teratas</>
                        : <>Lihat Semua {totalCabor} Cabor <ChevronRight size={12}/></>
                      }
                    </button>
                  </div>
                )}
              </>
            )
          })()}
        </Panel>

        {/* FOOTER */}
        <div className="text-center pb-6 pt-2">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            Sumber: Laporan Tes Biomotorik Atlet Porprov · FPOK Universitas Pendidikan Indonesia
          </p>
        </div>
      </main>

    </div>
  )
}

// ── KPI ──
function Kpi({ label, value, sub, icon: Icon, color, spark }: any) {
  // Detect if value is numeric or string
  const numeric = typeof value === 'number' ? value : null
  const stringValue = typeof value === 'string' ? value : null
  // Try parsing string value (e.g. "69%" → 69, "134/115" → keep as string)
  const parsedNum = stringValue && /^\d+%?$/.test(stringValue)
    ? parseInt(stringValue) : null
  const suffix = stringValue && stringValue.includes('%') ? '%' : ''
  const showAnim = numeric != null || parsedNum != null

  return (
    <div className="rounded-xl p-3 lg:p-4 relative overflow-hidden"
      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
      <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full blur-2xl opacity-20" style={{ background: color }}/>
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:`${color}1f` }}>
            <Icon size={14} style={{ color }}/>
          </div>
          {spark && spark.length > 0 && (
            <Sparkline data={spark} color={color} width={70} height={24}/>
          )}
        </div>
        <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">{label}</div>
        <div className="text-xl lg:text-2xl font-black mt-0.5" style={{ color }}>
          {showAnim
            ? <AnimatedNumber value={(numeric ?? parsedNum) as number} suffix={suffix} duration={1500}/>
            : stringValue}
        </div>
        {sub && <div className="text-[10px] text-zinc-500">{sub}</div>}
      </div>
    </div>
  )
}

// ── PANEL ──
function Panel({ title, icon: Icon, children, primary, delay = 0 }: any) {
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
  return (
    <div className="text-center py-8 text-xs text-zinc-500">
      Data belum tersedia
    </div>
  )
}
