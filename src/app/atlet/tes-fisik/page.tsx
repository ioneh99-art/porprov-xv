'use client'
// src/app/atlet/tes-fisik/page.tsx
// Profil Tes Fisik (Biomotorik) atlet — radar + history + rekomendasi
// Theme: slate-950 dark + emerald accent (konsisten dgn dashboard atlet)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity, TrendingUp, TrendingDown, Heart, Zap,
  Target, Award, AlertTriangle, ChevronRight, Info,
  Dumbbell, Flame, Wind, Footprints, Move,
  RefreshCw,
} from 'lucide-react'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

// Color palette — sama dengan atlet/dashboard
const C = {
  bg:'#0b0e14', bgCard:'#111827', border:'rgba(255,255,255,0.07)',
  primary:'#ef4444', secondary:'#f97316', accent:'#fbbf24',
  green:'#10b981', blue:'#3b82f6', cyan:'#06b6d4',
  muted:'#64748b', text:'#f1f5f9', emerald:'#10b981',
}

const KATEGORI_COLOR: Record<string, string> = {
  'Baik Sekali':   '#10b981',
  'Baik':          '#3b82f6',
  'Cukup':         '#fbbf24',
  'Kurang':        '#f97316',
  'Kurang Sekali': '#ef4444',
}

const KOMPONEN_ICON: Record<string, any> = {
  Flexibility: Move, Balance: Target, 'Speed Reaction': Zap,
  Speed: Wind, Agility: Footprints, Power: Flame,
  Strength: Dumbbell, 'Local Muscle Endurance': Activity,
  'Core Stability': Heart, 'Aerobic Capacity': Heart,
}

export default function TesFisikPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  useEffect(() => {
    fetch('/api/atlet/tes-fisik')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.55s cubic-bezier(0.16,1,0.3,1)' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
  })

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background:C.bg }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor:'rgba(16,185,129,0.2)', borderTopColor:C.emerald }}/>
          <p className="text-emerald-400 font-mono text-xs uppercase tracking-widest">
            Sinkronisasi Data Tes Biomotorik...
          </p>
        </div>
      </div>
    )
  }

  // ── No data state ──
  if (!data?.has_data) {
    return (
      <div className="min-h-screen p-5 lg:p-8" style={{ background:C.bg }}>
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl p-6 lg:p-8"
            style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.25)' }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:'rgba(251,191,36,0.15)' }}>
                <AlertTriangle size={20} style={{ color:C.accent }}/>
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-300 mb-1">Belum Ada Data Tes Fisik</h2>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Data biomotorik kamu belum tercatat di sistem.
                  Hubungi pelatih cabor atau pengurus KONIDA untuk informasi
                  jadwal tes berikutnya.
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  Tes dilaksanakan oleh tim Sport Science FPOK UPI.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const latest = data.sessions[0]
  const insights = data.insights
  const items = latest.items || []

  // Radar data
  const radarData = items.map((i: any) => ({
    komponen: i.komponen.length > 16 ? i.komponen.slice(0, 14) + '…' : i.komponen,
    capaian: i.capaian_persen, fullMark: 100,
  }))

  // History
  const history = [...data.sessions].reverse().map((s: any) => ({
    tahap: `Tahap ${s.tahap}`, persen: s.kesimpulan_persen || 0,
  }))

  const overallColor = KATEGORI_COLOR[insights?.overall_kategori || ''] || C.emerald

  return (
    <div className="min-h-screen text-slate-200" style={{ background:C.bg }}>

      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{ background:'rgba(11,14,20,0.95)', borderColor:C.border }}>
        <div className="px-5 lg:px-8 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.25)' }}>
              <Activity size={18} style={{ color:C.emerald }}/>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm lg:text-base">Profil Tes Biomotorik</h1>
              <div className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">
                Sport Science · FPOK UPI · {latest.tanggal_tes}
              </div>
            </div>
          </div>
          <button onClick={() => window.location.reload()}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
            style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, color:C.muted }}>
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      </header>

      <main className="px-5 lg:px-8 py-6 max-w-[1400px] mx-auto space-y-5">

        {/* EXECUTIVE BRIEF */}
        <div {...ani(0)} className="rounded-2xl p-4 lg:p-5 flex items-start gap-4"
          style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.18)' }}>
          <Info size={18} style={{ color:C.emerald, marginTop:2, flexShrink:0 }}/>
          <div>
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              Ringkasan Kondisi Fisik
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Skor overall <strong style={{ color:overallColor }}>{insights.overall_persen}% — {insights.overall_kategori}</strong>.
              {insights.progress && (
                <> Tren <strong style={{ color: insights.progress.delta>0?C.emerald:insights.progress.delta<0?C.primary:C.muted }}>
                  {insights.progress.direction} {insights.progress.delta>0?'+':''}{insights.progress.delta}%
                </strong> dari tes sebelumnya.</>
              )}
              {' '}Fokus latihan: <strong className="text-orange-400">{insights.weakest_components.map((w:any)=>w.komponen).join(', ')}</strong>.
            </p>
          </div>
        </div>

        {/* KPI ROW */}
        <div {...ani(40)} className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <KpiCard label="Skor Overall" value={`${insights.overall_persen}%`}
            sub={insights.overall_kategori} color={overallColor} icon={Award}/>
          <KpiCard label="BMI" value={latest.bmi?.toFixed(1) || '—'}
            sub={insights.bmi_status?.kategori || '—'}
            color={insights.bmi_status?.color === 'green' ? C.emerald
                  : insights.bmi_status?.color === 'red' ? C.primary
                  : insights.bmi_status?.color === 'orange' ? C.secondary
                  : C.accent}
            icon={Heart}/>
          <KpiCard label="Berat Badan" value={`${latest.berat_badan} kg`} sub="Antropometri" color={C.cyan} icon={Dumbbell}/>
          <KpiCard label="Tinggi Badan" value={`${latest.tinggi_badan} cm`} sub="Antropometri" color={C.cyan} icon={TrendingUp}/>
        </div>

        {/* PROGRESS PILL */}
        {insights.progress && (
          <div {...ani(80)} className="rounded-2xl p-4 lg:p-5 flex items-center justify-between"
            style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}` }}>
            <div className="flex items-center gap-3">
              {insights.progress.delta >= 0
                ? <TrendingUp size={20} style={{ color:C.emerald }}/>
                : <TrendingDown size={20} style={{ color:C.primary }}/>}
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Progress vs Tes Sebelumnya
                </div>
                <div className="text-white text-sm font-semibold mt-0.5">
                  {insights.progress.from_persen}% → {insights.progress.to_persen}%
                  <span className="ml-2 text-xs font-mono"
                    style={{ color: insights.progress.delta>0?C.emerald:insights.progress.delta<0?C.primary:C.muted }}>
                    ({insights.progress.delta>0?'+':''}{insights.progress.delta}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider"
              style={{
                background: insights.progress.delta>0?'rgba(16,185,129,0.12)':insights.progress.delta<0?'rgba(239,68,68,0.12)':'rgba(100,116,139,0.12)',
                color: insights.progress.delta>0?C.emerald:insights.progress.delta<0?C.primary:C.muted,
              }}>
              {insights.progress.direction}
            </div>
          </div>
        )}

        {/* CHARTS GRID */}
        <div className="grid lg:grid-cols-2 gap-4">

          {/* RADAR */}
          <Panel title="Profil Komponen Fisik" icon={Target} delay={120}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)"/>
                <PolarAngleAxis dataKey="komponen" tick={{ fill:'#94a3b8', fontSize:10 }}/>
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill:'#475569', fontSize:9 }}/>
                <Radar name="Capaian" dataKey="capaian"
                  stroke={C.emerald} fill={C.emerald} fillOpacity={0.35} strokeWidth={2}/>
                <Tooltip contentStyle={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:8 }}/>
              </RadarChart>
            </ResponsiveContainer>
          </Panel>

          {/* HISTORY */}
          {history.length > 1 ? (
            <Panel title="Progress Multi-Tahap" icon={TrendingUp} delay={160}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3"/>
                  <XAxis dataKey="tahap" stroke="#94a3b8" tick={{ fontSize:11 }}/>
                  <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize:11 }}/>
                  <Tooltip contentStyle={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:8 }}/>
                  <Line type="monotone" dataKey="persen" stroke={C.emerald} strokeWidth={3}
                    dot={{ fill:C.emerald, r:6, strokeWidth:0 }}
                    activeDot={{ r:8, fill:C.emerald }}/>
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          ) : (
            <Panel title="Komponen Terkuat & Terlemah" icon={Award} delay={160}>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 mb-2">🏆 Top 3 Terkuat</div>
                  {insights.strongest_components.map((s:any, i:number) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-zinc-300">{s.komponen}</span>
                      <span className="text-xs font-bold text-emerald-400">{s.capaian_persen}%</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t" style={{ borderColor:C.border }}>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-orange-400 mb-2">🎯 Top 3 Perlu Latihan</div>
                  {insights.weakest_components.map((s:any, i:number) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-zinc-300">{s.komponen}</span>
                      <span className="text-xs font-bold text-orange-400">{s.capaian_persen}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* DETAIL TABLE */}
        <Panel title="Detail Item Tes" icon={Activity} delay={200}>
          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="text-zinc-500 uppercase tracking-wider text-[10px]"
                  style={{ borderBottom:`1px solid ${C.border}` }}>
                  <th className="text-left p-3 font-semibold">Komponen</th>
                  <th className="text-left p-3 font-semibold">Item Tes</th>
                  <th className="text-right p-3 font-semibold">Hasil</th>
                  <th className="text-right p-3 font-semibold">Norma</th>
                  <th className="text-right p-3 font-semibold">Capaian</th>
                  <th className="text-left p-3 font-semibold">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => {
                  const Icon = KOMPONEN_ICON[it.komponen] || Activity
                  const color = KATEGORI_COLOR[it.kategori] || C.muted
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon size={13} className="text-emerald-400 flex-shrink-0"/>
                          <span className="text-xs font-medium text-zinc-300">{it.komponen}</span>
                        </div>
                      </td>
                      <td className="p-3 text-zinc-400">{it.item_tes}</td>
                      <td className="p-3 text-right font-mono text-white">{it.hasil_nilai} <span className="text-zinc-500">{it.hasil_satuan}</span></td>
                      <td className="p-3 text-right font-mono text-zinc-500">{it.norma_nilai} {it.norma_satuan}</td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-sm" style={{ color }}>{it.capaian_persen}%</span>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                          style={{ background:`${color}1f`, color, border:`1px solid ${color}40` }}>
                          {it.kategori}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* REKOMENDASI */}
        {insights.rekomendasi?.length > 0 && (
          <div {...ani(240)} className="rounded-2xl p-5"
            style={{ background:'rgba(249,115,22,0.05)', border:'1px solid rgba(249,115,22,0.2)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <Target size={16} className="text-orange-400"/>
              <h3 className="text-sm font-bold text-orange-300 uppercase tracking-wider">
                Rekomendasi Latihan Fokus
              </h3>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {insights.rekomendasi.map((r: any, i: number) => {
                const Icon = KOMPONEN_ICON[r.komponen] || Activity
                return (
                  <div key={i} className="rounded-xl p-3.5"
                    style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(249,115,22,0.15)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background:'rgba(249,115,22,0.12)' }}>
                        <Icon size={14} className="text-orange-400"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-widest text-orange-300 font-bold">
                          {r.komponen}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">{r.capaian}% capaian</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-white mb-1.5 line-clamp-2">{r.item}</div>
                    <div className="text-[11px] text-zinc-400 leading-relaxed">{r.fokus}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* FOOTER INFO */}
        <div {...ani(280)} className="text-center pb-6 pt-2">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
            {latest.lembaga_penguji} · Penanggung Jawab: {latest.penanggung_jawab}
          </p>
        </div>
      </main>
    </div>
  )
}

// ── KPI CARD ──
function KpiCard({ label, value, sub, color, icon: Icon }: any) {
  return (
    <div className="rounded-2xl p-4 relative overflow-hidden border"
      style={{ background:C.bgCard, borderColor:C.border }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20"
        style={{ background:color }}/>
      <div className="relative flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background:`${color}1f` }}>
          <Icon size={16} style={{ color }}/>
        </div>
      </div>
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">{label}</div>
        <div className="text-2xl lg:text-3xl font-black mt-1" style={{ color }}>{value}</div>
        {sub && <div className="text-[10px] text-zinc-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ── PANEL ──
function Panel({ title, icon: Icon, children, delay = 0 }: any) {
  const [animIn, setAnimIn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80 + delay); return () => clearTimeout(t) }, [delay])
  return (
    <div className="rounded-2xl p-4 lg:p-5 transition-all"
      style={{
        background:'rgba(255,255,255,0.025)', border:`1px solid ${C.border}`,
        transitionDelay:`${delay}ms`, opacity:animIn?1:0, transform:`translateY(${animIn?0:20}px)`,
      }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} style={{ color:C.emerald }}/>
        <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  )
}
