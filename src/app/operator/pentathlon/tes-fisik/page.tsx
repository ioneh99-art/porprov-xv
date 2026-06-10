'use client'
// src/app/operator/pentathlon/tes-fisik/page.tsx
// Laporan Tes Biomotorik Operator Pentathlon
// Design: mirror Kab. Bandung Premium Report, amber/yellow accent

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity, ArrowLeft, Users, Target, Award, AlertTriangle,
  Heart, ChevronRight, ChevronDown, RefreshCw, Info, Trophy,
  Dumbbell, Zap, Wind, Footprints, Move, Flame,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  AnimatedNumber, Gauge, FuturisticDonut, FuturisticBars, InsightCard,
} from '@/components/konida/TesFisikHelpers'
import React from 'react'

const PRIMARY = '#f59e0b'

const KATEGORI_COLOR: Record<string, string> = {
  'Baik Sekali':   '#10b981',
  'Baik':          '#3b82f6',
  'Cukup':         '#fbbf24',
  'Kurang':        '#f97316',
  'Kurang Sekali': '#ef4444',
}

const BMI_COLOR: Record<string, string> = {
  underweight: '#fbbf24', normal: '#10b981',
  overweight: '#f97316', obese: '#ef4444', unknown: '#475569',
}

const KOMPONEN_ICON: Record<string, any> = {
  Flexibility: Move, Balance: Target, 'Speed Reaction': Zap,
  Speed: Wind, Agility: Footprints, Power: Flame,
  Strength: Dumbbell, 'Local Muscle Endurance': Activity,
  'Core Stability': Heart, 'Aerobic Capacity': Heart,
}

function buildInsights(data: any) {
  const ins: any[] = []
  const sm = data.summary || {}
  const komps: any[] = data.komponen_overall || []

  if (sm.avg_fitness_persen > 0) {
    const avg = sm.avg_fitness_persen
    if (avg >= 75) {
      ins.push({ type: 'success', icon: '🏆', title: 'TIM SIAP TANDING',
        message: `Rata-rata fitness ${avg}% — di atas standar. Pentathlon Jabar siap kompetisi Porprov.`,
        action: 'Pertahankan intensitas menjelang event' })
    } else if (avg >= 60) {
      ins.push({ type: 'info', icon: '📊', title: 'KONDISI STABIL',
        message: `Rata-rata fitness ${avg}% — kategori Baik. Ada ruang optimasi menjelang kompetisi.`,
        action: 'Target peningkatan ke 75% sebelum Porprov' })
    } else {
      ins.push({ type: 'warning', icon: '🚨', title: 'PERLU INTERVENSI',
        message: `Rata-rata fitness ${avg}% — di bawah standar. Intensifikasi program latihan diperlukan.`,
        action: 'Setup program khusus 8–12 minggu' })
    }
  }

  if (sm.dns > 0) {
    ins.push({ type: 'warning', icon: '📋', title: 'ATLET BELUM TES',
      message: `${sm.dns} dari ${sm.total_atlet} atlet belum mengikuti tes biomotorik (${100 - (sm.participation_rate || 0)}% absen).`,
      action: 'Jadwalkan tes susulan segera ke FPOK UPI' })
  } else if (sm.hadir === sm.total_atlet && sm.total_atlet > 0) {
    ins.push({ type: 'success', icon: '✅', title: 'PARTISIPASI 100%',
      message: `Semua ${sm.total_atlet} atlet pentathlon sudah mengikuti tes biomotorik.`,
      action: 'Data lengkap siap analisis program latihan' })
  }

  if (komps.length >= 1) {
    const weak = komps[0]
    const strong = komps[komps.length - 1]
    ins.push({ type: 'info', icon: '🎯', title: 'FOKUS PROGRAM',
      message: `${weak.komponen} (${weak.rata_capaian}%) terlemah. ${strong.komponen} (${strong.rata_capaian}%) terkuat. Pentathlon butuh all-around.`,
      action: `Prioritaskan 40% sesi ke ${weak.komponen}` })
  }

  if (sm.gender?.L > 0 && sm.gender?.P > 0) {
    ins.push({ type: 'info', icon: '⚡', title: 'KOMPOSISI TIM',
      message: `${sm.gender.L} Putra · ${sm.gender.P} Putri. 5 disiplin pentathlon butuh kondisi fisik all-round.`,
      action: 'Rancang program per gender sesuai kelemahan dominan' })
  }

  return ins.slice(0, 4)
}

export default function TesFisikOperatorPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn]   = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showAll, setShowAll]   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 80)
    return () => clearTimeout(t)
  }, [])

  const load = () => {
    setLoading(true)
    fetch('/api/operator/tes-fisik')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.55s cubic-bezier(0.16,1,0.3,1)' },
    className: `${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`,
  })

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020617' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: `${PRIMARY}20`, borderTopColor: PRIMARY }} />
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: PRIMARY }}>
          Memuat data tes biomotorik pentathlon...
        </p>
      </div>
    </div>
  )

  // ── No data ──
  if (!data || !data.summary || data.summary.total_atlet === 0) return (
    <div className="min-h-screen p-5" style={{ background: '#020617' }}>
      <Link href="/operator/pentathlon"
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-4">
        <ArrowLeft size={14} /> Kembali ke Dashboard Pentathlon
      </Link>
      <div className="rounded-2xl p-6"
        style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-amber-300 mb-1">Belum Ada Data Tes Fisik</h2>
            <p className="text-sm text-zinc-300">
              Data biomotorik atlet pentathlon belum tersedia.
              Hubungi tim Sport Science FPOK UPI untuk koordinasi jadwal tes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const sm = data.summary
  const caborNama: string = data.cabor_nama || 'Pentathlon'
  const insights = buildInsights(data)

  const kategoriData = Object.entries(data.kategori_distribution || {})
    .map(([k, v]) => ({ name: k, value: v as number, color: KATEGORI_COLOR[k] || '#64748b' }))
    .filter(d => d.value > 0)

  const bmiData = Object.entries(data.bmi_distribution || {})
    .map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      value: v as number,
      color: BMI_COLOR[k as string] || '#64748b',
    }))
    .filter(d => d.value > 0)

  const atletList: any[] = data.atlet_list || []
  const atletHadir = atletList.filter(a => a.status_tes === 'Hadir' && a.kesimpulan_persen != null)
  const top5    = atletHadir.slice(0, 5)
  const bottom5 = [...atletHadir].sort((a, b) => (a.kesimpulan_persen ?? 100) - (b.kesimpulan_persen ?? 100)).slice(0, 5)
  const shownAtlet = showAll ? atletList : atletList.slice(0, 15)

  return (
    <div className="min-h-screen text-slate-300 relative overflow-hidden" style={{ background: '#020915' }}>

      {/* Decorative radial glows */}
      <div className="fixed top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle,${PRIMARY},transparent 70%)`, zIndex: 0 }} />
      <div className="fixed bottom-[-150px] right-[-150px] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
        style={{ background: `radial-gradient(circle,${PRIMARY},transparent 70%)`, zIndex: 0 }} />

      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(${PRIMARY}10 1px,transparent 1px),linear-gradient(90deg,${PRIMARY}10 1px,transparent 1px)`,
        backgroundSize: '32px 32px', zIndex: 0,
      }} />

      {/* STICKY HEADER */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-slate-800 backdrop-blur-xl"
        style={{ background: 'rgba(2,6,23,0.93)' }}>
        <div className="flex items-center gap-3">
          <Link href="/operator/pentathlon" className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            <ArrowLeft size={16} className="text-slate-400" />
          </Link>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: `${PRIMARY}15`, border: `1px solid ${PRIMARY}35`, boxShadow: `0 0 20px ${PRIMARY}15` }}>
            <Activity size={18} style={{ color: PRIMARY }} />
          </div>
          <div>
            <h1 className="text-white font-black text-base tracking-wide">LAPORAN TES BIOMOTORIK</h1>
            <div className="text-[10px] font-mono uppercase tracking-widest mt-0.5" style={{ color: PRIMARY }}>
              {caborNama} · Sport Science FPOK UPI · Tahap 3
            </div>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </nav>

      <main className="p-5 max-w-[1600px] mx-auto space-y-5 relative z-10">

        {/* EXECUTIVE BRIEF */}
        <div {...ani(0)} className="rounded-2xl p-4 flex items-start gap-4"
          style={{ background: `${PRIMARY}10`, border: `1px solid ${PRIMARY}30` }}>
          <Info size={18} style={{ color: PRIMARY, flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: PRIMARY }}>
              Kesimpulan Eksekutif
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              <strong className="text-white">{sm.total_atlet} atlet pentathlon</strong> tercatat,{' '}
              <strong style={{ color: '#10b981' }}>{sm.hadir} sudah tes ({sm.participation_rate}%)</strong>
              {sm.dns > 0 && <>, <strong className="text-orange-400">{sm.dns} belum tes</strong></>}.{' '}
              Rata-rata fitness <strong className="text-white">{sm.avg_fitness_persen}%</strong>.
              {data.komponen_overall?.length > 0 && (
                <> Komponen terlemah:{' '}
                  <strong className="text-orange-400">
                    {data.komponen_overall.slice(0, 2).map((k: any) => k.komponen).join(' & ')}
                  </strong> — prioritas program latihan bersama.
                </>
              )}
            </p>
          </div>
        </div>

        {/* AI INSIGHT CARDS */}
        <div {...ani(20)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights.map((ins, i) => (
            <InsightCard key={i} insight={ins} delay={i * 80} />
          ))}
        </div>

        {/* KOMPONEN RADAR */}
        <Panel title="Profil Komponen Fisik (Rata-rata Tim)" icon={Target} delay={40}>
          {(data.komponen_overall || []).length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={data.komponen_overall}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="komponen" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
                  <Radar name="Rata Capaian" dataKey="rata_capaian"
                    stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.35} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
              {data.komponen_overall.length >= 2 && (
                <div className="mt-3 p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  💡 <strong className="text-white">Insight:</strong> Komponen terlemah{' '}
                  <strong className="text-orange-400">{data.komponen_overall[0]?.komponen}</strong> ({data.komponen_overall[0]?.rata_capaian}%),{' '}
                  terkuat <strong className="text-emerald-400">
                    {data.komponen_overall[data.komponen_overall.length - 1]?.komponen}
                  </strong> ({data.komponen_overall[data.komponen_overall.length - 1]?.rata_capaian}%).{' '}
                  Pentathlon butuh keseimbangan semua komponen.
                </div>
              )}
            </>
          )}
        </Panel>

        {/* KPI ROW + GAUGE */}
        <div {...ani(80)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4 flex flex-col items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Gauge value={sm.avg_fitness_persen || 0} primary={PRIMARY} label="Team Health Index" />
            <div className="mt-2 text-[10px] text-zinc-500 uppercase tracking-widest">
              Skor Rata-rata Tim
            </div>
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            <Kpi label="Total Atlet" value={sm.total_atlet} icon={Users} color={PRIMARY}
              spark={[Math.floor(sm.total_atlet * 0.6), Math.floor(sm.total_atlet * 0.8), sm.total_atlet]} />
            <Kpi label="Sudah Tes" value={sm.hadir} sub={`${sm.participation_rate}%`} icon={Trophy} color="#10b981"
              spark={[Math.floor(sm.hadir * 0.5), Math.floor(sm.hadir * 0.8), sm.hadir]} />
            <Kpi label="Belum Tes (DNS)" value={sm.dns} icon={AlertTriangle} color="#f97316" />
            <Kpi label="L / P" value={`${sm.gender.L}/${sm.gender.P}`} icon={Users} color="#06b6d4" />
          </div>
        </div>

        {/* CHARTS ROW */}
        <div {...ani(120)} className="grid lg:grid-cols-2 gap-4">
          <Panel title="Distribusi Kategori Fitness" icon={Award}>
            {kategoriData.length === 0 ? <Empty /> : (
              <FuturisticDonut data={kategoriData} primary={PRIMARY} total={sm.hadir} />
            )}
          </Panel>
          <Panel title="Distribusi BMI" icon={Heart}>
            {bmiData.length === 0 ? <Empty /> : (
              <FuturisticBars data={bmiData} primary={PRIMARY} />
            )}
          </Panel>
        </div>

        {/* TOP & BOTTOM ATHLETES */}
        <div {...ani(140)} className="grid lg:grid-cols-2 gap-4">
          <Panel title="🏆 Top 5 Atlet Fisik Terbaik" icon={Trophy}>
            <div className="space-y-2">
              {top5.length === 0 ? <Empty /> : top5.map((a: any, i: number) => (
                <div key={a.atlet_id} className="flex items-center justify-between rounded-xl p-3"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.15)' }}>#{i + 1}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{a.nama_atlet}</div>
                      <div className="text-[10px] text-zinc-500">
                        {a.jenis_kelamin === 'L' ? 'Putra' : 'Putri'} · {a.kesimpulan_kategori}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    <AnimatedNumber value={a.kesimpulan_persen || 0} suffix="%" delay={i * 100} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="⚠️ 5 Atlet Perlu Perhatian" icon={AlertTriangle}>
            <div className="space-y-2">
              {bottom5.length === 0 ? <Empty /> : bottom5.map((a: any, i: number) => (
                <div key={a.atlet_id} className="flex items-center justify-between rounded-xl p-3"
                  style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(249,115,22,0.15)' }}>⚠{i + 1}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{a.nama_atlet}</div>
                      <div className="text-[10px] text-zinc-500">
                        {a.jenis_kelamin === 'L' ? 'Putra' : 'Putri'} · {a.kesimpulan_kategori}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-orange-400 font-mono">
                    <AnimatedNumber value={a.kesimpulan_persen || 0} suffix="%" delay={i * 100} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* PER-ATLET TABLE — expandable rows */}
        <Panel title={`Detail Per Atlet · ${atletList.length} atlet`} icon={Users} delay={160}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead>
                <tr className="text-zinc-500 uppercase tracking-wider text-[10px]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left p-2.5 font-semibold">#</th>
                  <th className="text-left p-2.5 font-semibold">Nama Atlet</th>
                  <th className="text-center p-2.5 font-semibold">Gender</th>
                  <th className="text-right p-2.5 font-semibold">TB/BB</th>
                  <th className="text-right p-2.5 font-semibold">BMI</th>
                  <th className="text-right p-2.5 font-semibold">Fitness</th>
                  <th className="text-center p-2.5 font-semibold">Kategori</th>
                  <th className="text-center p-2.5 font-semibold">Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {shownAtlet.map((a: any, i: number) => {
                  const isExpanded = expanded[a.atlet_id]
                  const fitColor = a.kesimpulan_persen != null
                    ? a.kesimpulan_persen >= 70 ? '#10b981' : a.kesimpulan_persen >= 50 ? '#fbbf24' : '#f97316'
                    : '#475569'
                  const katColor = KATEGORI_COLOR[a.kesimpulan_kategori || ''] || '#475569'
                  const hasItems = (a.items?.length ?? 0) > 0

                  return (
                    <React.Fragment key={a.atlet_id}>
                      <tr
                        className="hover:bg-white/[0.02] transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: hasItems ? 'pointer' : 'default' }}
                        onClick={() => hasItems && setExpanded(prev => ({ ...prev, [a.atlet_id]: !prev[a.atlet_id] }))}
                      >
                        <td className="p-2.5 text-zinc-500 font-mono">{i + 1}</td>
                        <td className="p-2.5 font-semibold text-white">{a.nama_atlet}</td>
                        <td className="p-2.5 text-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            a.jenis_kelamin === 'L'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-pink-500/20 text-pink-300'
                          }`}>
                            {a.jenis_kelamin === 'L' ? 'L' : 'P'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right text-zinc-400 font-mono text-[11px]">
                          {a.tinggi_badan ? `${a.tinggi_badan}/${a.berat_badan}` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-zinc-300">
                          {a.bmi != null ? Number(a.bmi).toFixed(1) : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold font-mono" style={{ color: fitColor }}>
                          {a.kesimpulan_persen != null ? `${a.kesimpulan_persen}%` : '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          {a.kesimpulan_kategori ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap"
                              style={{ background: `${katColor}20`, color: katColor, border: `1px solid ${katColor}40` }}>
                              {a.kesimpulan_kategori}
                            </span>
                          ) : <span className="text-zinc-600 text-[10px]">—</span>}
                        </td>
                        <td className="p-2.5 text-center">
                          {a.status_tes === 'Hadir'
                            ? <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">✓ Hadir</span>
                            : <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">DNS</span>
                          }
                        </td>
                        <td className="p-2.5 text-center">
                          {hasItems && (isExpanded
                            ? <ChevronDown size={13} className="text-zinc-400 mx-auto" />
                            : <ChevronRight size={13} className="text-zinc-500 mx-auto" />
                          )}
                        </td>
                      </tr>

                      {isExpanded && hasItems && (
                        <tr>
                          <td colSpan={9} className="px-5 py-4"
                            style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: PRIMARY }}>
                              Detail Komponen — {a.nama_atlet}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                              {(a.items as any[]).map((it: any, idx: number) => {
                                const Icon = KOMPONEN_ICON[it.komponen] || Activity
                                const c = KATEGORI_COLOR[it.kategori] || '#64748b'
                                return (
                                  <div key={idx} className="rounded-lg p-3"
                                    style={{ background: `${c}08`, border: `1px solid ${c}25` }}>
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <Icon size={10} style={{ color: c }} />
                                      <span className="text-[9px] font-bold uppercase tracking-wide leading-tight" style={{ color: c }}>
                                        {it.komponen}
                                      </span>
                                    </div>
                                    <div className="text-white font-black text-base font-mono">{it.capaian_persen}%</div>
                                    <div className="h-1 rounded-full overflow-hidden mt-1.5"
                                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                                      <div className="h-full rounded-full"
                                        style={{ width: `${it.capaian_persen}%`, background: c, opacity: 0.8 }} />
                                    </div>
                                    <div className="text-[9px] text-zinc-600 mt-1 leading-tight">{it.item_tes}</div>
                                    {it.hasil_nilai != null && (
                                      <div className="text-[9px] text-zinc-500 font-mono">
                                        {it.hasil_nilai} {it.hasil_satuan} / {it.norma_nilai} {it.norma_satuan}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {atletList.length > 15 && (
            <div className="text-center pt-4">
              <button
                onClick={() => setShowAll(s => !s)}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs rounded-lg hover:bg-white/5 transition font-medium"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${PRIMARY}40`, color: PRIMARY }}>
                {showAll
                  ? 'Tampilkan lebih sedikit'
                  : <>Lihat semua {atletList.length} atlet <ChevronRight size={12} /></>}
              </button>
            </div>
          )}
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

// ── KPI Card ──
function Kpi({ label, value, sub, icon: Icon, color, spark }: any) {
  const isNum   = typeof value === 'number'
  const isStr   = typeof value === 'string'
  const parsed  = isStr && /^\d+%?$/.test(value) ? parseInt(value) : null
  const suffix  = isStr && value.includes('%') ? '%' : ''
  const animate = isNum || parsed != null

  return (
    <div className="rounded-xl p-3 lg:p-4 relative overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full blur-2xl opacity-20" style={{ background: color }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}1f` }}>
            <Icon size={14} style={{ color }} />
          </div>
        </div>
        <div className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">{label}</div>
        <div className="text-xl lg:text-2xl font-black mt-0.5" style={{ color }}>
          {animate
            ? <AnimatedNumber value={(isNum ? value : parsed) as number} suffix={suffix} duration={1500} />
            : value}
        </div>
        {sub && <div className="text-[10px] text-zinc-500">{sub}</div>}
      </div>
    </div>
  )
}

// ── Panel wrapper ──
function Panel({ title, icon: Icon, children, delay = 0 }: any) {
  return (
    <div className="rounded-2xl p-4 lg:p-5"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} style={{ color: PRIMARY }} />
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: PRIMARY }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Empty() {
  return <div className="text-center py-8 text-xs text-zinc-500">Data belum tersedia</div>
}
