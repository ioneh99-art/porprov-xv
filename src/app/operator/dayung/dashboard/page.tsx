'use client'
// src/app/operator/dayung/dashboard/page.tsx
// Performance Dashboard Dayung — mengadopsi tema/alur/sistem dashboard KONIDA Kab. Bandung,
// di-scope ke data atlet Dayung (cabor_id=147, kontingen_id=4). ACCENT #38bdf8.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Trophy, Activity, CheckCircle, RefreshCw, Waves, Gauge, Clock } from 'lucide-react'
import { HealthIndexGauge, CriticalAlertsCard, buildAlertsFromData } from '@/components/konida/DashboardHelpers'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const ACCENT = '#38bdf8'
const PRIMARY = '#075985'
const PORPROV = new Date('2026-11-07')

function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setT(f()); const i = setInterval(() => setT(f()), 1000); return () => clearInterval(i)
  }, [])
  return <span className="tabular-nums font-mono font-bold tracking-wider" style={{ color: ACCENT }}>{t}</span>
}

const RATINGS = [
  { key: '⭐ ELITE', label: 'ELITE', color: '#fbbf24' },
  { key: '✅ READY', label: 'READY', color: '#34d399' },
  { key: '🟡 NEEDS WORK', label: 'NEEDS WORK', color: '#facc15' },
  { key: '🔴 SUB-PAR', label: 'SUB-PAR', color: '#fb923c' },
  { key: '🚨 KRITIS', label: 'KRITIS', color: '#f87171' },
]

export default function DayungExecutiveDashboard() {
  const [atlet, setAtlet] = useState<any[]>([])
  const [disiplin, setDisiplin] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  const load = async () => {
    setLoading(true)
    const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
    const caborId = me?.cabor_id ?? 147, kontingenId = me?.kontingen_id ?? 4
    const { data: a } = await sb.from('atlet')
      .select('id,nama_lengkap,gender,status_registrasi,status_verifikasi,tes_fisik_persen,tes_fisik_rating,tes_fisik_status')
      .eq('cabor_id', caborId).eq('kontingen_id', kontingenId)
    setAtlet(a ?? [])
    const { data: nomor } = await sb.from('nomor_pertandingan').select('disiplin:disiplin_id(nama)').eq('cabor_id', caborId)
    const dc: Record<string, number> = {}
    for (const n of (nomor ?? []) as any[]) { const d = n.disiplin?.nama ?? 'Lainnya'; dc[d] = (dc[d] || 0) + 1 }
    setDisiplin(dc); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const m = useMemo(() => {
    const total = atlet.length
    const verified = atlet.filter(a => ['Verified', 'Posted'].includes(a.status_registrasi)).length
    const putra = atlet.filter(a => a.gender === 'L').length
    const putri = atlet.filter(a => a.gender === 'P').length
    const tested = atlet.filter(a => a.tes_fisik_rating).length
    const scored = atlet.filter(a => a.tes_fisik_persen != null)
    const avg = scored.length ? Math.round(scored.reduce((s, a) => s + a.tes_fisik_persen, 0) / scored.length) : 0
    const coverage = total ? Math.round(tested / total * 100) : 0
    const verifPct = total ? Math.round(verified / total * 100) : 0
    const ratingDist: Record<string, number> = {}
    for (const r of RATINGS) ratingDist[r.key] = atlet.filter(a => a.tes_fisik_rating === r.key).length
    const kritis = ratingDist['🚨 KRITIS'] ?? 0
    const pending = atlet.filter(a => a.status_registrasi === 'Menunggu Admin').length
    const dns = total - tested
    const top = scored.slice().sort((a, b) => b.tes_fisik_persen - a.tes_fisik_persen).slice(0, 10)
    return { total, verified, putra, putri, tested, avg, coverage, verifPct, ratingDist, kritis, pending, dns, top }
  }, [atlet])

  const days = Math.max(0, Math.ceil((PORPROV.getTime() - Date.now()) / 86400000))
  const alerts = useMemo(() => buildAlertsFromData({
    pendingVerifikasi: m.pending, dnsAtlet: m.dns, lowSkorAtlet: m.kritis,
    daysToEvent: days, lockedNik: 0, cabors_lemah_count: m.avg > 0 && m.avg < 55 ? 1 : 0,
  }), [m, days])

  const dims = [
    { label: 'Coverage Tes', score: m.coverage, weight: 0.3 },
    { label: 'Avg Fisik', score: m.avg, weight: 0.4 },
    { label: 'Verifikasi', score: m.verifPct, weight: 0.3 },
  ]

  const ani = (d = 0) => ({ style: { transitionDelay: `${d}ms`, transition: 'all .7s cubic-bezier(.16,1,.3,1)' }, className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6' })

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      <div className="fixed inset-0 pointer-events-none opacity-30 mix-blend-overlay" style={{ zIndex: 0, backgroundImage: `linear-gradient(${ACCENT}06 1px,transparent 1px),linear-gradient(90deg,${ACCENT}06 1px,transparent 1px)`, backgroundSize: '56px 56px' }} />

      {/* Header */}
      <div className="relative flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}><Waves size={20} style={{ color: ACCENT }} /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">DASHBOARD DAYUNG</h1>
            <div className="text-[11px] text-slate-500">Kab. Bandung · PORPROV XV 2026 · <LiveClock /></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold tabular-nums" style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>H-{days} PORPROV</span>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh</button>
        </div>
      </div>

      {/* KPI strip */}
      <div {...ani(10)} className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { l: 'Total Atlet', v: m.total, icon: Users, c: ACCENT },
          { l: 'Verified', v: m.verified, icon: CheckCircle, c: '#34d399' },
          { l: 'Putra', v: m.putra, icon: Users, c: '#38bdf8' },
          { l: 'Putri', v: m.putri, icon: Users, c: '#f472b6' },
          { l: 'Sudah Tes', v: `${m.coverage}%`, icon: Activity, c: '#fbbf24' },
          { l: 'Avg Fisik', v: `${m.avg}%`, icon: Gauge, c: '#a855f7' },
        ].map(k => (
          <div key={k.l} className="rounded-2xl p-3.5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-1.5 mb-1"><k.icon size={12} style={{ color: k.c }} /><span className="text-[9px] uppercase tracking-wider text-slate-500">{k.l}</span></div>
            <div className="text-2xl font-black text-white tabular-nums">{loading ? '—' : k.v}</div>
          </div>
        ))}
      </div>

      {/* Health gauge + Alerts */}
      <div {...ani(25)} className="relative grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="rounded-2xl p-5 flex flex-col items-center justify-center" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: ACCENT }}>Cabor Health Index</div>
          <HealthIndexGauge dimensions={dims} primary={ACCENT} size={220} />
        </div>
        <CriticalAlertsCard alerts={alerts} primary={ACCENT} maxShow={4} title="Alert Persiapan Dayung" />
      </div>

      {/* Rating distribution + Top performers */}
      <div {...ani(40)} className="relative grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-sm font-bold text-white mb-3">Distribusi Rating Fisik</h3>
          {m.tested === 0 ? <div className="text-xs text-slate-600">Belum ada data tes fisik.</div> : (
            <div className="space-y-2.5">
              {RATINGS.map(r => {
                const v = m.ratingDist[r.key] ?? 0, pct = m.tested ? Math.round(v / m.tested * 100) : 0
                return (
                  <div key={r.key}>
                    <div className="flex justify-between text-[11px] mb-1"><span className="text-slate-400">{r.label}</span><span className="text-slate-500">{v} · {pct}%</span></div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} /></div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: PRIMARY }}>Nomor per Disiplin</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(disiplin).sort((a, b) => b[1] - a[1]).map(([d, c]) => (
                <span key={d} className="text-[11px] px-2 py-1 rounded-lg bg-slate-800/50 text-slate-300">{d} <b className="text-sky-300">{c}</b></span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-3"><Trophy size={14} style={{ color: ACCENT }} /><h3 className="text-sm font-bold text-white">Top 10 Kesiapan Fisik</h3></div>
          {m.top.length === 0 ? <div className="text-xs text-slate-600">Belum ada data.</div> : (
            <div className="space-y-1.5">
              {m.top.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 text-xs">
                  <span className="w-6 text-center font-black text-slate-600">{i + 1}</span>
                  <span className="flex-1 text-slate-200 truncate">{a.nama_lengkap}</span>
                  <span className="text-slate-500">{a.gender === 'L' ? 'Pa' : 'Pi'}</span>
                  <span className="font-mono font-bold w-12 text-right" style={{ color: ACCENT }}>{a.tes_fisik_persen}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
