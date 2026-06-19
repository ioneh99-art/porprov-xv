'use client'
// src/app/konida/performance/kabbandung/page.tsx
// Performance Center — Strategic overview + cabor cards, styled to match dashboard/warroom

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  BarChart3, Search, RefreshCw, Users, Activity, Award,
  AlertCircle, Info, X, Zap, TrendingUp, Clock,
  AlertTriangle, Trophy,
} from 'lucide-react'
import { PerformanceCaborCard, type PerformanceCaborData } from '@/components/konida/performance/PerformanceCaborCard'
import { hasBaselineData } from '@/lib/performance/cabor-accent-map'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID = 4
const ACCENT       = '#38bdf8'
const BASE_PATH    = '/konida/performance/kabbandung'

const CABOR_LABEL: Record<number, string> = { 10: 'Atletik', 148: 'Akuatik' }

// ── Team-event detection ─────────────────────────────────
const TEAM_KW = ['routine', 'free combination', 'team technical', 'team free']
const isTeamEv = (n: string) => TEAM_KW.some(k => n.toLowerCase().includes(k))

// ── Atletik event category ───────────────────────────────
const LONG_EV   = new Set(['5000 M', '10000 M', 'Marathon', '20 Km Jalan Cepat'])
const MID_EV    = new Set(['800 M', '1500 M'])
const SPRINT_EV = new Set(['100 M', '200 M', '400 M'])
function inferAtletikDesc(evs: string[], gender: string) {
  const g   = gender === 'L' ? 'Pa' : gender === 'P' ? 'Pi' : ''
  const cat: string[] = []
  if (evs.some(e => LONG_EV.has(e)))   cat.push('long distance')
  if (evs.some(e => MID_EV.has(e)))    cat.push('middle distance')
  if (evs.some(e => SPRINT_EV.has(e))) cat.push('sprint')
  if (evs.some(e => e.toLowerCase().includes('lompat') || e.toLowerCase().includes('lempar'))) cat.push('field')
  if (evs.some(e => e.includes('Estafet'))) cat.push('estafet')
  const base = cat.length ? cat.join(' + ') : 'nomor lainnya'
  return `${base}${g ? ' ' + g : ''}`
}

// ── Medal classifier ─────────────────────────────────────
function classifyTarget(t: string | null | undefined) {
  if (!t) return { emas: 0, perak: 0, perunggu: 0, range: 0 }
  const u = t.toUpperCase().trim()
  if (u.includes('/'))        return { emas: 0, perak: 0, perunggu: 0, range: 1 }
  if (u.includes('EMAS'))     return { emas: 1, perak: 0, perunggu: 0, range: 0 }
  if (u.includes('PERAK'))    return { emas: 0, perak: 1, perunggu: 0, range: 0 }
  if (u.includes('PERUNGGU')) return { emas: 0, perak: 0, perunggu: 1, range: 0 }
  return { emas: 0, perak: 0, perunggu: 0, range: 0 }
}

// ── Types ────────────────────────────────────────────────
type SourceFilter = 'all' | 'baseline' | 'medal' | 'both'
type GenderFilter = 'Semua' | 'L' | 'P'

interface AtletDB {
  id: number; nama_lengkap: string; cabor_nama_raw: string
  gender: string; status_registrasi: string
}

interface BaselineRow {
  atlet_id:           number
  gap_percentage:     number | null
  target_medali_text: string | null
  cabor_id:           number | null
  event_name:         string | null
  sub_cabor:          string | null
  imported_from:      string | null
  sumber_data:        string | null
  gender:             string | null
}

interface RiwayatRow {
  id: number; atlet_id: number; hasil: string
  level_event: string; tahun: number; is_demo: boolean; submission_status?: string
}

interface Contributor {
  atlet_id: number; nama_display: string
  cabor_nama: string; sub_desc: string
  emas: number; perak: number; perunggu: number; range: number; total: number
  is_team: boolean
}

interface CaborStat {
  cabor_id: number; cabor_nama: string
  atlet_count: number; nomor_count: number
  emas: number; perak: number; perunggu: number; range: number; total: number
}

const LEVEL_RANK: Record<string, number> = {
  'Internasional': 5, 'Nasional': 4, 'Provinsi': 3, 'Kabupaten': 2, 'Lokal': 1,
}

// ── Live clock ───────────────────────────────────────────
function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setT(fmt())
    const i = setInterval(() => setT(fmt()), 1000)
    return () => clearInterval(i)
  }, [])
  return <span className="tabular-nums font-mono font-bold tracking-wider" style={{ color: ACCENT }}>{t}</span>
}

// ── Main component ────────────────────────────────────────
export default function PerformancePage() {
  const [atlets,   setAtlets]   = useState<AtletDB[]>([])
  const [baseline, setBaseline] = useState<BaselineRow[]>([])
  const [riwayat,  setRiwayat]  = useState<RiwayatRow[]>([])
  const [loading,  setLoading]  = useState(true)

  const [search,      setSearch]      = useState('')
  const [fGender,     setFGender]     = useState<GenderFilter>('Semua')
  const [fSource,    setFSource]    = useState<SourceFilter>('all')
  const [showBanner, setShowBanner] = useState(true)
  const [animIn,     setAnimIn]     = useState(false)
  const [pulse,       setPulse]       = useState(true)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80);    return () => clearTimeout(t) }, [])
  useEffect(() => { const i = setInterval(() => setPulse(p => !p), 800); return () => clearInterval(i) }, [])

  const ani = (d = 0) => ({
    style:     { transitionDelay: `${d}ms`, transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)' },
    className: `${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`,
  })

  useEffect(() => {
    async function load() {
      try {
        const [atletRes, baselineRes, riwayatRes] = await Promise.all([
          (async () => {
            let all: AtletDB[] = []
            for (let p = 0; ; p++) {
              const { data } = await sb.from('atlet')
                .select('id,nama_lengkap,cabor_nama_raw,gender,status_registrasi')
                .eq('kontingen_id', KONTINGEN_ID)
                .in('status_registrasi', ['Verified', 'Posted'])
                .range(p * 1000, (p + 1) * 1000 - 1)
              if (!data?.length) break
              all = all.concat(data as AtletDB[])
              if (data.length < 1000) break
            }
            return all
          })(),
          (async () => {
            let all: BaselineRow[] = []
            for (let p = 0; ; p++) {
              const { data } = await sb.from('atlet_baseline_performance')
                .select('atlet_id,gap_percentage,target_medali_text,cabor_id,event_name,sub_cabor,imported_from,sumber_data,gender')
                .range(p * 1000, (p + 1) * 1000 - 1)
              if (!data?.length) break
              all = all.concat(data as BaselineRow[])
              if (data.length < 1000) break
            }
            return all
          })(),
          sb.from('riwayat_prestasi')
            .select('id,atlet_id,hasil,level_event,tahun,is_demo,submission_status'),
        ])

        setAtlets(atletRes)
        setBaseline(baselineRes)
        if (riwayatRes.data) setRiwayat(riwayatRes.data as RiwayatRow[])
      } catch (e) { console.error('[Performance] load:', e) }
      finally { setLoading(false) }
    }
    void load()
  }, [])

  // ── atlet lookup map ─────────────────────────────────────
  const atletMap = useMemo(() => {
    const m = new Map<number, AtletDB>()
    atlets.forEach(a => m.set(a.id, a))
    return m
  }, [atlets])

  // ── Overview: rows from excel import only ────────────────
  const oRows = useMemo(
    () => baseline.filter(b => b.sumber_data === 'excel_porprov_2022'),
    [baseline],
  )

  // ── Overview KPI ─────────────────────────────────────────
  const oKpi = useMemo(() => {
    const aSet = new Set<number>(), nSet = new Set<string>()
    let emas = 0, perak = 0, perunggu = 0, range = 0
    oRows.forEach(r => {
      aSet.add(r.atlet_id)
      nSet.add(`${r.cabor_id}::${r.event_name}`)
      const c = classifyTarget(r.target_medali_text)
      emas += c.emas; perak += c.perak; perunggu += c.perunggu; range += c.range
    })
    return { atlet: aSet.size, nomor: nSet.size, emas, perak, perunggu, range }
  }, [oRows])

  // ── Overview distribusi per cabor ─────────────────────────
  const oCaborStats = useMemo<CaborStat[]>(() => {
    const map = new Map<number, CaborStat>()
    const aSet: Record<number, Set<number>> = {}
    const nSet: Record<number, Set<string>> = {}
    oRows.forEach(r => {
      if (!r.cabor_id) return
      const nm = CABOR_LABEL[r.cabor_id] || `Cabor ${r.cabor_id}`
      if (!map.has(r.cabor_id)) map.set(r.cabor_id, { cabor_id: r.cabor_id, cabor_nama: nm, atlet_count: 0, nomor_count: 0, emas: 0, perak: 0, perunggu: 0, range: 0, total: 0 })
      const s = map.get(r.cabor_id)!
      const c = classifyTarget(r.target_medali_text)
      s.emas += c.emas; s.perak += c.perak; s.perunggu += c.perunggu; s.range += c.range
      s.total += c.emas + c.perak + c.perunggu + c.range;
      (aSet[r.cabor_id] = aSet[r.cabor_id] || new Set()).add(r.atlet_id);
      (nSet[r.cabor_id] = nSet[r.cabor_id] || new Set()).add(r.event_name || '')
    })
    map.forEach(s => { s.atlet_count = aSet[s.cabor_id]?.size || 0; s.nomor_count = nSet[s.cabor_id]?.size || 0 })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [oRows])

  // ── Overview contributors (with team grouping) ────────────
  const oContributors = useMemo<Contributor[]>(() => {
    interface Agg {
      atlet_id: number; gender: string; cabor_id: number
      sub_cabors: Set<string>; event_names: string[]
      emas: number; perak: number; perunggu: number; range: number; total: number
      has_team: boolean; _teamSize?: number
    }
    const map = new Map<number, Agg>()
    oRows.forEach(r => {
      if (!map.has(r.atlet_id)) map.set(r.atlet_id, {
        atlet_id: r.atlet_id, gender: r.gender || '', cabor_id: r.cabor_id || 0,
        sub_cabors: new Set(), event_names: [],
        emas: 0, perak: 0, perunggu: 0, range: 0, total: 0, has_team: false,
      })
      const a = map.get(r.atlet_id)!
      const c = classifyTarget(r.target_medali_text)
      a.emas += c.emas; a.perak += c.perak; a.perunggu += c.perunggu; a.range += c.range
      a.total += c.emas + c.perak + c.perunggu + c.range
      if (r.sub_cabor) a.sub_cabors.add(r.sub_cabor)
      if (r.event_name && !a.event_names.includes(r.event_name)) a.event_names.push(r.event_name)
      if (r.event_name && isTeamEv(r.event_name)) a.has_team = true
    })

    const absorbed = new Set<number>()
    map.forEach(a => {
      if (!a.has_team || a.total === 0) return
      const leaderEvs = a.event_names.filter(isTeamEv)
      const teammates = new Set<number>()
      oRows.forEach(r => { if (r.atlet_id !== a.atlet_id && r.event_name && leaderEvs.includes(r.event_name)) teammates.add(r.atlet_id) })
      teammates.forEach(id => absorbed.add(id))
      a._teamSize = teammates.size + 1
    })

    const result: Contributor[] = []
    map.forEach(a => {
      if (absorbed.has(a.atlet_id) || a.total === 0) return
      const db       = atletMap.get(a.atlet_id)
      const nama     = db?.nama_lengkap || `Atlet ${a.atlet_id}`
      const teamSize = a._teamSize || 1
      const isTeam   = a.has_team && teamSize > 1
      const subs     = Array.from(a.sub_cabors).map(s => s.toLowerCase())
      result.push({
        atlet_id:     a.atlet_id,
        nama_display: isTeam ? `${nama.split(' ')[0]} & ${teamSize - 1} lainnya` : nama,
        cabor_nama:   CABOR_LABEL[a.cabor_id] || `Cabor ${a.cabor_id}`,
        sub_desc:     a.cabor_id === 10 ? inferAtletikDesc(a.event_names, a.gender)
                     : isTeam ? 'renang artistik'
                     : subs.join(' + '),
        emas: a.emas, perak: a.perak, perunggu: a.perunggu, range: a.range, total: a.total,
        is_team: isTeam,
      })
    })
    return result.sort((a, b) =>
      b.emas !== a.emas ? b.emas - a.emas :
      b.perak !== a.perak ? b.perak - a.perak :
      b.perunggu !== a.perunggu ? b.perunggu - a.perunggu :
      b.range - a.range,
    )
  }, [oRows, atletMap])

  const importedFiles = useMemo(() => {
    const s = new Set<string>()
    oRows.forEach(r => { if (r.imported_from) s.add(r.imported_from) })
    return Array.from(s)
  }, [oRows])

  // ── Performance section ───────────────────────────────────
  const filteredAtlets = useMemo(() => {
    let list = atlets
    if (fGender !== 'Semua') list = list.filter(a => a.gender === fGender)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.nama_lengkap.toLowerCase().includes(q) || (a.cabor_nama_raw || '').toLowerCase().includes(q))
    }
    return list
  }, [atlets, fGender, search])

  const caborAggregates = useMemo<PerformanceCaborData[]>(() => {
    const atletIdToCabor: Record<number, string> = {}
    const map: Record<string, {
      atletIds: Set<number>; atletBaseline: Set<number>; atletMedal: Set<number>
      gaps: number[]; medals: RiwayatRow[]; baselineCount: number
    }> = {}

    filteredAtlets.forEach(a => {
      const cabor = a.cabor_nama_raw || 'Lainnya'
      atletIdToCabor[a.id] = cabor
      if (!map[cabor]) map[cabor] = { atletIds: new Set(), atletBaseline: new Set(), atletMedal: new Set(), gaps: [], medals: [], baselineCount: 0 }
      map[cabor].atletIds.add(a.id)
    })

    baseline.forEach(b => {
      const cabor = atletIdToCabor[b.atlet_id]
      if (!cabor || !map[cabor]) return
      map[cabor].atletBaseline.add(b.atlet_id)
      map[cabor].baselineCount++
      if (b.gap_percentage !== null) map[cabor].gaps.push(Math.abs(b.gap_percentage))
    })

    riwayat.forEach(r => {
      const cabor = atletIdToCabor[r.atlet_id]
      if (!cabor || !map[cabor]) return
      if (r.submission_status === 'rejected') return
      map[cabor].medals.push(r)
      if (!r.is_demo && r.submission_status !== 'pending') map[cabor].atletMedal.add(r.atlet_id)
    })

    let aggs = Object.entries(map).map(([nama, d]) => {
      const medals   = d.medals
      const emas     = medals.filter(r => r.hasil === 'Emas'     && !r.is_demo && r.submission_status !== 'pending').length
      const perak    = medals.filter(r => r.hasil === 'Perak'    && !r.is_demo && r.submission_status !== 'pending').length
      const perunggu = medals.filter(r => r.hasil === 'Perunggu' && !r.is_demo && r.submission_status !== 'pending').length
      const realRecs = medals.filter(r => !r.is_demo && r.submission_status !== 'rejected').length
      const demoRecs = medals.filter(r => r.is_demo).length
      const pendRecs = medals.filter(r => r.submission_status === 'pending').length
      const topLevel = medals.reduce<string | null>((top, r) => {
        if (r.is_demo || r.submission_status !== 'verified') return top
        if (!top) return r.level_event
        return (LEVEL_RANK[r.level_event] || 0) > (LEVEL_RANK[top] || 0) ? r.level_event : top
      }, null)
      const validYears = medals.filter(r => !r.is_demo && r.submission_status === 'verified').map(r => r.tahun).filter(Boolean)
      const yearRange  = validYears.length > 0 ? { from: Math.min(...validYears), to: Math.max(...validYears) } : null
      const avgGap     = d.gaps.length > 0 ? d.gaps.reduce((s, g) => s + g, 0) / d.gaps.length : null
      return {
        nama, atletTotal: d.atletIds.size, atletWithBaseline: d.atletBaseline.size,
        atletWithMedal: d.atletMedal.size, baselineEvents: d.baselineCount,
        avgGap, totalMedals: realRecs, emas, perak, perunggu, topLevel, yearRange,
        realRecords: realRecs, demoRecords: demoRecs, pendingRecords: pendRecs,
      }
    })

    if (fSource !== 'all') {
      aggs = aggs.filter(c => {
        const hB = c.baselineEvents > 0, hM = c.totalMedals > 0
        if (fSource === 'baseline') return hB
        if (fSource === 'medal')    return hM
        if (fSource === 'both')     return hB && hM
        return false
      })
    }

    aggs.sort((a, b) => {
      const aH = hasBaselineData(a.nama) ? 1 : 0
      const bH = hasBaselineData(b.nama) ? 1 : 0
      if (aH !== bH) return bH - aH
      return (b.baselineEvents + b.totalMedals) - (a.baselineEvents + a.totalMedals)
    })
    return aggs
  }, [filteredAtlets, baseline, riwayat, fSource])

  const gKpi = useMemo(() => {
    const real = riwayat.filter(r => !r.is_demo && r.submission_status === 'verified')
    return {
      atletTotal:  filteredAtlets.length,
      caborTotal:  new Set(filteredAtlets.map(a => a.cabor_nama_raw)).size,
      baselineEvs: baseline.length,
      totalMedals: real.length,
    }
  }, [filteredAtlets, baseline, riwayat])

  const emasC     = oContributors.filter(c => c.emas > 0)
  const noEmasCab = oCaborStats.filter(c => c.emas === 0 && c.total > 0)
  const topEmasCab = oCaborStats.find(c => c.emas > 0)

  // ── Loading ───────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020a14]">
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: `${ACCENT}20`, borderTopColor: ACCENT, boxShadow: `0 0 30px ${ACCENT}20` }}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>Memuat Performance Center...</p>
        <p className="text-[10px] mt-2 text-zinc-500">Kab. Bandung · PORPROV XV 2026</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans selection:bg-[#38bdf8]/30"
      style={{ background: 'linear-gradient(145deg, #02060f 0%, #04121f 100%)' }}>

      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none opacity-30 mix-blend-overlay" style={{
        zIndex: 0,
        backgroundImage: `linear-gradient(${ACCENT}06 1px,transparent 1px),linear-gradient(90deg,${ACCENT}06 1px,transparent 1px)`,
        backgroundSize: '60px 60px',
      }}/>
      {/* Radial glow */}
      <div className="fixed pointer-events-none" style={{
        top: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: '100vw', height: '80vh',
        background: `radial-gradient(ellipse, ${ACCENT}07 0%, transparent 60%)`,
        zIndex: 0,
      }}/>

      {/* ════ HEADER ════ */}
      <header className="sticky top-0 z-50 px-6 py-4 backdrop-blur-xl border-b shadow-lg shadow-black/20"
        style={{ background: 'rgba(2,10,20,0.85)', borderColor: `${ACCENT}15` }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40`, boxShadow: `0 0 20px ${ACCENT}20` }}>
              <BarChart3 size={18} style={{ color: ACCENT }}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">PERFORMANCE CENTER</h1>
              <p className="text-[11px] font-mono uppercase tracking-widest mt-0.5" style={{ color: `${ACCENT}90` }}>
                <Zap size={9} className="inline text-amber-400 mr-1"/>Kab. Bandung · PORPROV XV 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Gender filter */}
            <div className="flex gap-1">
              {(['Semua', 'L', 'P'] as GenderFilter[]).map(g => {
                const active = fGender === g
                return (
                  <button key={g} onClick={() => setFGender(g)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? `${ACCENT}18` : 'rgba(255,255,255,0.04)',
                      color:      active ? ACCENT : 'rgba(255,255,255,0.35)',
                      border:     `1px solid ${active ? ACCENT + '30' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    {g === 'Semua' ? 'Semua' : g === 'L' ? 'Putra' : 'Putri'}
                  </button>
                )
              })}
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama / cabor..."
                className="bg-transparent border rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 outline-none w-44"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}/>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <Clock size={13} style={{ color: ACCENT }}/><LiveClock/>
            </div>
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border text-zinc-300 hover:text-white hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <RefreshCw size={11}/> Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 relative z-10">

        {/* ════ HERO IDENTITY ════ */}
        <div {...ani(0)} className="rounded-2xl p-6"
          style={{ background: `linear-gradient(135deg, ${ACCENT}08 0%, rgba(2,10,20,0) 100%)`, border: `1px solid ${ACCENT}18` }}>
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} style={{ color: ACCENT }}/>
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
                  Intelligence Center
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Peta Jalan Menuju Medali</h2>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                Analisis ilmiah berbasis data — seberapa jauh atlet Kab. Bandung dari rekor PORPROV,
                siapa yang paling siap meraih emas, dan di mana pelatih perlu intervensi sebelum PORPROV XV 2026.
              </p>
            </div>

            {/* Gap% legend */}
            <div className="rounded-xl p-4 shrink-0"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2.5 font-bold">
                GAP% — Jarak ke Rekor PORPROV
              </div>
              {[
                { range: '≤ 3%',  label: 'Peluang Emas',       color: '#10b981' },
                { range: '3–7%',  label: 'Peluang Perak',      color: '#06b6d4' },
                { range: '7–12%', label: 'Peluang Perunggu',   color: '#f59e0b' },
                { range: '> 12%', label: 'Perlu Kerja Keras',  color: '#ef4444' },
              ].map(g => (
                <div key={g.range} className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color }}/>
                  <span className="text-[10px] font-mono font-bold w-12" style={{ color: g.color }}>{g.range}</span>
                  <span className="text-[10px] text-zinc-500">{g.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════ STRATEGIC OVERVIEW ════ */}
        {oRows.length > 0 && (
          <div {...ani(0)} className="rounded-3xl overflow-hidden relative"
            style={{ background: 'rgba(2,10,20,0.65)', border: `1px solid ${ACCENT}18` }}>

            {/* Section header bar */}
            <div className="px-5 py-3 flex items-center gap-3 border-b"
              style={{ background: 'rgba(0,0,0,0.30)', borderColor: `${ACCENT}12` }}>
              <Trophy size={11} style={{ color: ACCENT }}/>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: ACCENT }}>
                Strategic Overview
              </span>
              <span className="h-3 w-px bg-white/10"/>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
                Proyeksi Medali Berdasarkan Data Baseline 2022 · Diperbarui Menjelang PORPROV XV
              </span>
              {importedFiles.length > 0 && (
                <>
                  <span className="h-3 w-px bg-white/10 hidden sm:block"/>
                  <span className="text-[9px] font-mono text-zinc-700 hidden sm:block">
                    {importedFiles.join(' · ')}
                  </span>
                </>
              )}
            </div>

            <div className="p-5 space-y-5">

              {/* ── Insight strategis (selalu tampil) ── */}
              {(oKpi.emas > 0 || noEmasCab.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <Zap size={10} className="text-amber-400"/>
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Insight Strategis</span>
                  </div>
                  {oKpi.emas > 0 && topEmasCab && (
                    <OInsight tone="success" icon={<TrendingUp size={13}/>}
                      title={`Kekuatan: ${topEmasCab.cabor_nama.toLowerCase()}`}
                      body={buildKekuatan(oContributors, oKpi.emas, topEmasCab.cabor_nama)}/>
                  )}
                  {oKpi.emas > 0 && emasC.length <= 4 && (
                    <OInsight tone="warning" icon={<AlertTriangle size={13}/>}
                      title={`Risk: konsentrasi ${emasC.length} atlet`}
                      body={buildRisk(emasC, oKpi.emas)}/>
                  )}
                  {noEmasCab.map(c => (
                    <OInsight key={c.cabor_id} tone="danger" icon={<AlertCircle size={13}/>}
                      title={`${c.cabor_nama}: 0 emas, target perak perlu review`}
                      body={`Cabor ${c.cabor_nama} punya ${c.total} target medali tapi 0 emas — dominated lawan. ${c.perak} target perak perlu validasi manual pelatih.`}/>
                  ))}
                  <div className="flex items-start gap-1.5 text-[10px] text-zinc-700 px-1">
                    <Info size={10} className="shrink-0 mt-0.5"/>
                    <span>Proyeksi berdasarkan data baseline 2022. Angkat Berat & cabor lain menyusul saat data kualifikasi 2025 masuk.</span>
                  </div>
                </div>
              )}

              {/* ── Target KPI strip ── */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {([
                  { l: 'Atlet',       v: oKpi.atlet,    c: ACCENT,    sub: 'terdata' },
                  { l: 'Nomor Diisi', v: oKpi.nomor,    c: '#94a3b8', sub: 'event' },
                  { l: 'Emas',        v: oKpi.emas,     c: '#f59e0b', sub: 'target' },
                  { l: 'Perak',       v: oKpi.perak,    c: '#94a3b8', sub: 'target' },
                  { l: 'Perunggu',    v: oKpi.perunggu, c: '#fb923c', sub: 'target' },
                  { l: 'Range S/B',   v: oKpi.range,    c: '#a78bfa', sub: 'fleksibel' },
                ] as const).map(s => (
                  <div key={s.l} className="rounded-xl px-3 py-2.5 relative overflow-hidden"
                    style={{ background: `${s.c}09`, border: `1px solid ${s.c}22` }}>
                    <div className="absolute top-0 left-0 bottom-0 w-[2px] rounded-full"
                      style={{ background: s.c }}/>
                    <div className="pl-1">
                      <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: `${s.c}99` }}>{s.l}</div>
                      <div className="text-2xl font-black leading-none tabular-nums mt-0.5" style={{ color: s.c }}>{s.v}</div>
                      <div className="text-[9px] text-zinc-600 mt-0.5">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Distribusi per cabor + Top kontributor (side by side on larger screens) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {oCaborStats.length > 0 && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="px-4 py-2.5 border-b flex items-center gap-2"
                      style={{ background: 'rgba(0,0,0,0.20)', borderColor: 'rgba(255,255,255,0.05)' }}>
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Distribusi target per cabor</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {oCaborStats.map(s => <OCaborCell key={s.cabor_id} stat={s}/>)}
                    </div>
                  </div>
                )}

                {oContributors.length > 0 && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="px-4 py-2.5 border-b flex items-center gap-2"
                      style={{ background: 'rgba(0,0,0,0.20)', borderColor: 'rgba(255,255,255,0.05)' }}>
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Top kontributor target medali</span>
                      <span className="ml-auto text-[9px] text-zinc-700 font-mono">{oContributors.length} atlet/tim</span>
                    </div>
                    <div>
                      {oContributors.slice(0, 8).map((c, i) => (
                        <OContribRow key={c.atlet_id} rank={i + 1} c={c} isFirst={i === 0} pulse={pulse}/>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ════ PERFORMA ATLET PER CABOR ════ */}
        <div {...ani(30)}>

          {/* Section header */}
          <div className="rounded-3xl overflow-hidden"
            style={{ background: 'rgba(2,10,20,0.65)', border: `1px solid ${ACCENT}18` }}>
            <div className="px-5 py-3 flex items-center gap-3 border-b flex-wrap"
              style={{ background: 'rgba(0,0,0,0.30)', borderColor: `${ACCENT}12` }}>
              <Activity size={11} style={{ color: ACCENT }}/>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: ACCENT }}>
                Performa Atlet
              </span>
              <span className="h-3 w-px bg-white/10"/>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
                Per Cabor Olahraga
              </span>
              <div className="ml-auto flex items-center gap-3 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1"><Users size={10}/> {gKpi.atletTotal}</span>
                <span className="flex items-center gap-1"><Activity size={10}/> {gKpi.caborTotal} cabor</span>
                <span className="flex items-center gap-1"><Zap size={10}/> {gKpi.baselineEvs} baseline</span>
                {gKpi.totalMedals > 0 && <span className="flex items-center gap-1"><Award size={10}/> {gKpi.totalMedals} medali</span>}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Info banner */}
              {showBanner && gKpi.totalMedals === 0 && baseline.length > 0 && (
                <div className="px-4 py-3 rounded-2xl flex items-start gap-3 relative"
                  style={{ background: `${ACCENT}07`, border: `1px solid ${ACCENT}15` }}>
                  <div className="p-1.5 rounded-full shrink-0" style={{ background: `${ACCENT}12` }}>
                    <Info size={13} style={{ color: ACCENT }}/>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed flex-1">
                    Baseline PORPROV 2022 sudah dimuat.{' '}
                    <span style={{ color: ACCENT }}>Data kejuaraan</span> bisa ditambah via dossier atlet.
                  </p>
                  <button onClick={() => setShowBanner(false)} className="opacity-40 hover:opacity-100 transition-opacity shrink-0">
                    <X size={13} style={{ color: ACCENT }}/>
                  </button>
                </div>
              )}

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {([
                  { k: 'all',      l: 'Semua',              c: ACCENT    },
                  { k: 'baseline', l: 'Ada Baseline',       c: '#f97316' },
                  { k: 'medal',    l: 'Ada Medali',         c: '#fbbf24' },
                  { k: 'both',     l: 'Baseline + Medali',  c: '#10b981' },
                ] as const).map(f => {
                  const active = fSource === f.k
                  return (
                    <button key={f.k} onClick={() => setFSource(f.k)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                      style={{
                        background: active ? `${f.c}15` : 'rgba(255,255,255,0.03)',
                        color:      active ? f.c : 'rgba(255,255,255,0.3)',
                        border:     `1px solid ${active ? f.c + '35' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {f.l}
                    </button>
                  )
                })}
              </div>

              {/* Cabor grid — tampilkan yang punya baseline ATAU data prestasi */}
              {(() => {
                const withData = caborAggregates.filter(c => c.baselineEvents > 0 || c.totalMedals > 0)
                if (withData.length === 0) return (
                  <div className="py-16 text-center rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Activity size={36} className="mx-auto mb-3 text-zinc-700"/>
                    <div className="text-zinc-500 text-sm">Belum ada data baseline cabor</div>
                  </div>
                )
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {withData.map(c => <PerformanceCaborCard key={c.nama} cabor={c} basePath={BASE_PATH}/>)}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Overview sub-components ───────────────────────────────

function OCaborCell({ stat }: { stat: CaborStat }) {
  const maxV = Math.max(stat.emas, stat.perak, stat.perunggu, stat.range, 1)
  const bars = [
    { l: 'Emas',     v: stat.emas,     c: '#f59e0b' },
    { l: 'Perak',    v: stat.perak,    c: '#94a3b8' },
    { l: 'Perunggu', v: stat.perunggu, c: '#fb7185' },
    ...(stat.range > 0 ? [{ l: 'S/B', v: stat.range, c: '#fb923c' }] : []),
  ]
  return (
    <div className="p-4" style={{ background: 'rgba(2,10,20,0.60)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={11} className="text-zinc-600"/>
        <span className="text-xs font-bold text-white">{stat.cabor_nama}</span>
        <span className="ml-auto text-[9px] text-zinc-600 font-mono">{stat.atlet_count}a · {stat.nomor_count}n</span>
      </div>
      <div className="space-y-2">
        {bars.map(b => (
          <div key={b.l} className="grid grid-cols-[52px_1fr_20px] gap-2 items-center">
            <span className="text-[10px] font-medium" style={{ color: `${b.c}cc` }}>{b.l}</span>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (b.v / maxV) * 100)}%`, background: b.c }}/>
            </div>
            <span className="text-xs font-black text-right tabular-nums" style={{ color: b.c }}>{b.v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2.5 border-t flex justify-between text-[10px]"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <span className="text-zinc-600">Total target</span>
        <span className="font-black text-white">{stat.total} medali</span>
      </div>
    </div>
  )
}

function OContribRow({ rank, c, isFirst, pulse }: { rank: number; c: Contributor; isFirst: boolean; pulse: boolean }) {
  const rankC = isFirst ? '#f59e0b' : rank <= 3 ? '#94a3b8' : '#3f3f46'
  return (
    <div className={`grid grid-cols-[28px_1fr_auto] gap-2 items-center px-4 py-2.5 transition-colors
      ${isFirst ? 'bg-amber-500/5 hover:bg-amber-500/8' : 'hover:bg-white/[0.02]'}
      ${rank > 1 ? 'border-t' : ''}`}
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
        style={{ background: `${rankC}15`, color: rankC, border: `1px solid ${rankC}30` }}>
        {isFirst
          ? <span className={`transition-opacity ${pulse ? 'opacity-100' : 'opacity-50'}`}>★</span>
          : rank}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white truncate">{c.nama_display}</div>
        <div className="text-[10px] text-zinc-600 truncate">{c.cabor_nama}{c.sub_desc ? ` · ${c.sub_desc}` : ''}</div>
      </div>
      <div className="flex gap-1 shrink-0">
        {c.emas     > 0 && <MPill v={c.emas}     l="E"   c="#f59e0b" bg="#f59e0b"/>}
        {c.perak    > 0 && <MPill v={c.perak}    l="S"   c="#94a3b8" bg="#94a3b8"/>}
        {c.perunggu > 0 && <MPill v={c.perunggu} l="B"   c="#fb7185" bg="#fb7185"/>}
        {c.range    > 0 && <MPill v={c.range}    l="S/B" c="#fb923c" bg="#fb923c"/>}
      </div>
    </div>
  )
}

function MPill({ v, l, c, bg }: { v: number; l: string; c: string; bg: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-black tabular-nums"
      style={{ background: `${bg}18`, color: c, border: `1px solid ${bg}30` }}>
      {v}{l}
    </span>
  )
}

function OInsight({ tone, icon, title, body }: { tone: 'success' | 'warning' | 'danger'; icon: React.ReactNode; title: string; body: string }) {
  const s = {
    success: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.20)', ic: '#34d399', tc: '#6ee7b7' },
    warning: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.20)', ic: '#fbbf24', tc: '#fcd34d' },
    danger:  { bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.20)',  ic: '#f87171', tc: '#fca5a5' },
  }[tone]
  return (
    <div className="rounded-xl px-4 py-3 flex gap-3"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="shrink-0 mt-0.5" style={{ color: s.ic }}>{icon}</span>
      <div>
        <div className="text-xs font-bold mb-0.5" style={{ color: s.tc }}>{title}</div>
        <div className="text-[11px] text-zinc-400 leading-relaxed">{body}</div>
      </div>
    </div>
  )
}

function buildKekuatan(cs: Contributor[], total: number, topCabor: string): string {
  const ow   = cs.filter(c => c.emas > 0 && c.sub_desc.includes('open water'))
  const pool = cs.filter(c => c.emas > 0 && c.sub_desc.includes('pool'))
  const art  = cs.filter(c => c.emas > 0 && c.sub_desc.includes('artistik'))
  const atl  = cs.filter(c => c.emas > 0 && c.cabor_nama === 'Atletik')
  const parts: string[] = []
  if (ow.length)   parts.push(`${ow.length} dari open water (${ow.slice(0, 2).map(c => c.nama_display.split(' ')[0]).join(', ')})`)
  if (pool.length) parts.push(`${pool.length} dari pool`)
  if (art.length)  parts.push(`${art.length} dari artistik`)
  if (atl.length)  parts.push(`${atl.length} dari Atletik`)
  return `${total} target emas: ${parts.join(', ')}. ${topCabor} adalah backbone medali kontingen.`
}

function buildRisk(emas: Contributor[], total: number): string {
  const names = emas.slice(0, 4).map(c => c.nama_display.split(' ')[0]).join(', ')
  return `${total} target emas tergantung ${emas.length} atlet/tim (${names}). Kalau salah satu cedera atau gak start, potential emas turun drastis — perlu backup plan.`
}
