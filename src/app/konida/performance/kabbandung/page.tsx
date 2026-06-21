'use client'
// src/app/konida/performance/kabbandung/page.tsx
// Performance Center — Strategic overview + cabor cards, styled to match dashboard/warroom

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  BarChart3, Search, RefreshCw, Users, Activity, Award,
  AlertCircle, Info, X, Zap, TrendingUp, Clock,
  AlertTriangle, Trophy, Upload, ChevronRight,
  Sparkles, Loader2, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { PerformanceCaborCard, type PerformanceCaborData } from '@/components/konida/performance/PerformanceCaborCard'
import { hasBaselineData, caborToSlug } from '@/lib/performance/cabor-accent-map'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID = 4
const ACCENT       = '#38bdf8'
const BASE_PATH    = '/konida/performance/kabbandung'

const CABOR_LABEL: Record<number, string> = {
  10:  'Atletik',
  7:   'Akuatik - Renang',
  148: 'Akuatik',
  54:  'Angkat Berat',
}

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
  metric_type:        string | null
  weight_class:       string | null
}

interface RiwayatRow {
  id: number; atlet_id: number; hasil: string
  level_event: string; tahun: number; is_demo: boolean; submission_status?: string
}

interface Contributor {
  atlet_id: number; nama_display: string
  cabor_nama: string; cabor_id: number; sub_desc: string
  emas: number; perak: number; perunggu: number; range: number; total: number
  is_team: boolean
}

interface StrategicBrief {
  skor_kesiapan: number
  ringkasan: string
  kekuatan_utama: string
  top_line_projection?: Array<{ cabor: string; atlet: number; target_coach: string; realistic: string; confidence: string }>
  prioritas: Array<{ no: number; judul: string; detail: string; dampak: 'tinggi'|'sedang'|'rendah'; deadline?: string }>
  peluang_emas: Array<{ cabor: string; potensi: string; gap_status: string; rekomendasi: string }>
  area_risiko:  Array<{ cabor: string; masalah: string; intervensi: string }>
  pesan_pelatih: string
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

  // Strategic Brief state
  const [briefOpen,    setBriefOpen]    = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [brief,        setBrief]        = useState<StrategicBrief | null>(null)
  const [briefError,   setBriefError]   = useState<string | null>(null)

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
                .select('atlet_id,gap_percentage,target_medali_text,cabor_id,event_name,sub_cabor,imported_from,sumber_data,gender,metric_type,weight_class')
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

  // ── Overview: semua rows baseline (proyeksi medali semua cabor) ──
  const oRows = useMemo(() => baseline, [baseline])

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
  // Merge cabor IDs yang merupakan cabor yang sama (Akuatik - Renang → Akuatik)
  const CABOR_ID_MERGE: Record<number, number> = { 7: 148 }
  const normCaborId = (id: number) => CABOR_ID_MERGE[id] ?? id

  const oCaborStats = useMemo<CaborStat[]>(() => {
    const map = new Map<number, CaborStat>()
    const aSet: Record<number, Set<number>> = {}
    const nSet: Record<number, Set<string>> = {}
    oRows.forEach(r => {
      if (!r.cabor_id) return
      const cid = normCaborId(r.cabor_id)
      const nm  = CABOR_LABEL[cid] || CABOR_LABEL[r.cabor_id] || `Cabor ${cid}`
      if (!map.has(cid)) map.set(cid, { cabor_id: cid, cabor_nama: nm, atlet_count: 0, nomor_count: 0, emas: 0, perak: 0, perunggu: 0, range: 0, total: 0 })
      const s = map.get(cid)!
      const c = classifyTarget(r.target_medali_text)
      s.emas += c.emas; s.perak += c.perak; s.perunggu += c.perunggu; s.range += c.range
      s.total += c.emas + c.perak + c.perunggu + c.range;
      (aSet[cid] = aSet[cid] || new Set()).add(r.atlet_id);
      (nSet[cid] = nSet[cid] || new Set()).add(r.event_name || '')
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
        cabor_nama:   CABOR_LABEL[normCaborId(a.cabor_id)] || CABOR_LABEL[a.cabor_id] || `Cabor ${a.cabor_id}`,
        cabor_id:     normCaborId(a.cabor_id),
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
      atletIds:     Set<number>
      atletBaseline: Set<number>
      atletMedal:   Set<number>
      gaps:         number[]
      medals:       RiwayatRow[]
      baselineCount: number
      targetEmas:   number
      targetPerak:  number
      targetPerunggu: number
      nomors:       Set<string>
      kelasBerat:   Set<string>
      topAtletsMap: Map<number, { name: string; emas: number; total: number }>
    }> = {}

    const normCabor = (nama: string) => {
      const n = nama.toLowerCase()
      if (n.includes('akuatik')) return 'Akuatik'
      return nama
    }

    filteredAtlets.forEach(a => {
      const cabor = normCabor(a.cabor_nama_raw || 'Lainnya')
      atletIdToCabor[a.id] = cabor
      if (!map[cabor]) map[cabor] = {
        atletIds: new Set(), atletBaseline: new Set(), atletMedal: new Set(),
        gaps: [], medals: [], baselineCount: 0,
        targetEmas: 0, targetPerak: 0, targetPerunggu: 0,
        nomors: new Set(), kelasBerat: new Set(), topAtletsMap: new Map(),
      }
      map[cabor].atletIds.add(a.id)
    })

    baseline.forEach(b => {
      const cabor = atletIdToCabor[b.atlet_id]
      if (!cabor || !map[cabor]) return
      const d = map[cabor]
      d.atletBaseline.add(b.atlet_id)
      d.baselineCount++
      if (b.gap_percentage !== null) d.gaps.push(Number(b.gap_percentage))
      if (b.event_name) d.nomors.add(b.event_name)
      if (b.weight_class) d.kelasBerat.add(b.weight_class)
      const c = classifyTarget(b.target_medali_text)
      d.targetEmas += c.emas; d.targetPerak += c.perak; d.targetPerunggu += c.perunggu
      // Track per-atlet emas count for top list
      if (c.emas > 0 || c.perak > 0 || c.perunggu > 0) {
        const db = atletMap.get(b.atlet_id)
        const name = db?.nama_lengkap?.split(' ')[0] || ''
        if (name) {
          if (!d.topAtletsMap.has(b.atlet_id)) d.topAtletsMap.set(b.atlet_id, { name, emas: 0, total: 0 })
          const agg = d.topAtletsMap.get(b.atlet_id)!
          agg.emas += c.emas; agg.total += c.emas + c.perak + c.perunggu
        }
      }
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
      const validGaps  = d.gaps.filter(g => g !== null)
      const avgGap     = validGaps.length > 0 ? validGaps.reduce((s, g) => s + g, 0) / validGaps.length : null
      const gapMin     = validGaps.length > 0 ? Math.min(...validGaps) : null
      const gapMax     = validGaps.length > 0 ? Math.max(...validGaps) : null
      const topAtletNames = Array.from(d.topAtletsMap.values())
        .sort((a, b) => b.emas !== a.emas ? b.emas - a.emas : b.total - a.total)
        .slice(0, 3).map(t => t.name)
      return {
        nama, atletTotal: d.atletIds.size, atletWithBaseline: d.atletBaseline.size,
        atletWithMedal: d.atletMedal.size, baselineEvents: d.baselineCount,
        avgGap, gapMin, gapMax, totalMedals: realRecs, emas, perak, perunggu, topLevel, yearRange,
        realRecords: realRecs, demoRecords: demoRecs, pendingRecords: pendRecs,
        targetEmas: d.targetEmas, targetPerak: d.targetPerak, targetPerunggu: d.targetPerunggu,
        nomorCount: d.nomors.size, kelasBeratCount: d.kelasBerat.size, topAtletNames,
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
  }, [filteredAtlets, baseline, riwayat, fSource, atletMap])

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

  // ── Strategic Brief generator ────────────────────────────
  async function generateBrief() {
    if (briefOpen && brief) { setBriefOpen(false); return }
    setBriefOpen(true)
    setBriefLoading(true)
    setBriefError(null)

    const payload = {
      kpi: {
        totalAtlet:          atlets.length,
        atletDenganBaseline: new Set(baseline.map(b => b.atlet_id)).size,
        targetEmas:          oKpi.emas,
        targetPerak:         oKpi.perak,
        targetPerunggu:      oKpi.perunggu,
        rataGapPersen:       baseline.length > 0
          ? parseFloat((baseline.reduce((s, b) => s + (b.gap_percentage || 0), 0) / baseline.length).toFixed(1))
          : null,
      },
      cabors: caborAggregates
        .filter(c => c.baselineEvents > 0 || c.totalMedals > 0)
        .map(c => ({
          nama:           c.nama,
          totalAtlet:     c.atletTotal,
          avgGap:         c.avgGap,
          targetEmas:     c.emas,
          targetPerak:    c.perak,
          targetPerunggu: c.perunggu,
          baselineEvents: c.baselineEvents,
        })),
      topKontributor: oContributors.slice(0, 5).map(c => ({
        nama:     c.nama_display,
        cabor:    c.cabor_nama,
        emas:     c.emas,
        perak:    c.perak,
        perunggu: c.perunggu,
      })),
    }

    try {
      const res  = await fetch('/api/performance/strategic-brief', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBrief(data)
    } catch (e) {
      setBriefError(e instanceof Error ? e.message : 'Gagal generate brief')
    } finally {
      setBriefLoading(false)
    }
  }

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
            <Link href={`${BASE_PATH}/agenda`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border"
              style={{ background: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.30)', color: '#34d399' }}>
              📋 Meeting Agenda
            </Link>
            <Link href={`${BASE_PATH}/import`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border"
              style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)', color: '#a5b4fc' }}>
              <Upload size={11}/> Import Data
            </Link>
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
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mb-4">
                Analisis ilmiah berbasis data — seberapa jauh atlet Kab. Bandung dari rekor PORPROV,
                siapa yang paling siap meraih emas, dan di mana pelatih perlu intervensi sebelum PORPROV XV 2026.
              </p>
              <button onClick={generateBrief} disabled={briefLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                style={{ background: briefOpen && brief ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }}>
                {briefLoading
                  ? <><Loader2 size={14} className="animate-spin"/> Menganalisa data...</>
                  : briefOpen && brief
                  ? <><ChevronDown size={14}/> Tutup Strategic Brief</>
                  : <><Sparkles size={14}/> Generate Strategic Brief</>}
              </button>
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

        {/* ════ TOP-LINE PROJECTION (static, computed) ════ */}
        {(() => {
          const rows = caborAggregates.filter(c => c.baselineEvents > 0 || c.targetEmas + c.targetPerak + c.targetPerunggu > 0)
          if (rows.length === 0) return null
          const totalAtlet = rows.reduce((s, c) => s + c.atletTotal, 0)
          const totalMedal = oKpi.emas + oKpi.perak + oKpi.perunggu

          // Row accent color per cabor
          const rowAccent = (nama: string) => {
            if (nama === 'Akuatik') return { bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.12)' }
            if (nama === 'Angkat Berat') return { bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.10)' }
            if (nama === 'Atletik') return { bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.10)' }
            return { bg: 'transparent', border: 'rgba(255,255,255,0.04)' }
          }

          // Bottom-line takeaways from data
          const takeaways: string[] = []
          const topCabor = [...rows].sort((a, b) => b.targetEmas - a.targetEmas)[0]
          if (topCabor && topCabor.targetEmas > 0)
            takeaways.push(`Pertahankan ${topCabor.nama} sebagai backbone — ${topCabor.targetEmas} target emas`)
          const abRow = rows.find(r => r.nama === 'Angkat Berat')
          if (abRow && (abRow.targetEmas + abRow.targetPerak + abRow.targetPerunggu) > 0)
            takeaways.push(`Elevate Angkat Berat dari Hidden Gem ke prioritas kontingen`)
          const zeroEmas = rows.filter(r => r.targetEmas === 0 && (r.targetPerak + r.targetPerunggu) > 0)
          zeroEmas.forEach(r => takeaways.push(`Reset ekspektasi ${r.nama} — 0 target emas, fokus ke Perak/Perunggu`))
          if (rows.some(r => r.avgGap !== null && Math.abs(r.avgGap) <= 3))
            takeaways.push(`Calibrate pesaing analysis menjelang kualifikasi 2025`)
          takeaways.push(`Update data atlet baru & verifikasi rekor pesaing tiap cabor`)

          return (
            <div {...ani(5)} className="rounded-2xl overflow-hidden"
              style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>

              {/* Card header */}
              <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-black text-white tracking-tight">
                      PORPROV XV 2026 — Kab. Bandung
                    </h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Strategic medal projection · {rows.length}-cabor synthesis
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                    <span>{totalAtlet} atlet</span>
                    <span className="w-px h-3 bg-zinc-800"/>
                    <span className="font-bold" style={{ color: '#fbbf24' }}>
                      {oKpi.emas}🥇 {oKpi.perak}🥈 {oKpi.perunggu}🥉
                    </span>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="px-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 px-4 py-3">
                  Top-line projection
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-zinc-500">
                      <th className="text-left px-4 pb-2">Cabor</th>
                      <th className="text-center px-3 pb-2">Atlet</th>
                      <th className="text-center px-3 pb-2">Target (E/P/B)</th>
                      <th className="text-center px-3 pb-2">Avg Gap</th>
                      <th className="text-center px-3 pb-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px]">
                    {rows.map(c => {
                      const hasTarget = c.targetEmas + c.targetPerak + c.targetPerunggu > 0
                      const targetStr = hasTarget ? `${c.targetEmas}/${c.targetPerak}/${c.targetPerunggu}` : '—'
                      const conf = c.baselineEvents >= 5 && c.avgGap !== null ? 'HIGH'
                               : c.baselineEvents >= 2 ? 'MIXED' : 'LOW'
                      const confColor = conf === 'HIGH' ? '#10b981' : conf === 'MIXED' ? '#f59e0b' : '#6b7280'
                      const gap = c.avgGap !== null ? Math.abs(c.avgGap) : null
                      const gapColor = gap === null ? '#64748b'
                        : gap <= 3 ? '#10b981' : gap <= 7 ? '#06b6d4' : gap <= 12 ? '#f59e0b' : '#ef4444'
                      const ra = rowAccent(c.nama)
                      return (
                        <tr key={c.nama} className="rounded-xl transition-all"
                          style={{ background: ra.bg }}>
                          <td className="px-4 py-3.5 font-bold text-white rounded-l-xl">{c.nama}</td>
                          <td className="px-3 py-3.5 text-center text-zinc-300 tabular-nums">{c.atletTotal}</td>
                          <td className="px-3 py-3.5 text-center">
                            {hasTarget ? (
                              <span className="font-black text-white tabular-nums tracking-tight">
                                {c.targetEmas > 0 && <span style={{ color: '#fbbf24' }}>{c.targetEmas}</span>}
                                {c.targetEmas > 0 && <span className="text-zinc-600">/</span>}
                                {c.targetPerak > 0 && <span style={{ color: '#cbd5e1' }}>{c.targetPerak}</span>}
                                {c.targetPerak > 0 && <span className="text-zinc-600">/</span>}
                                {c.targetPerunggu > 0 && <span style={{ color: '#cd7f32' }}>{c.targetPerunggu}</span>}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-600 font-medium">0 listed</span>
                            )}
                          </td>
                          <td className="px-3 py-3.5 text-center tabular-nums">
                            {gap !== null
                              ? <span className="font-bold" style={{ color: gapColor }}>{gap.toFixed(1)}%</span>
                              : <span className="text-zinc-700 text-[10px]">—</span>}
                          </td>
                          <td className="px-3 py-3.5 text-center rounded-r-xl">
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                              style={{ background: `${confColor}18`, color: confColor, border: `1px solid ${confColor}35` }}>
                              {conf}
                            </span>
                          </td>
                        </tr>
                      )
                    })}

                    {/* TOTAL row */}
                    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <td className="px-4 py-3.5 font-black text-zinc-300">TOTAL</td>
                      <td className="px-3 py-3.5 text-center font-black text-white tabular-nums">
                        {totalAtlet} atlet
                      </td>
                      <td className="px-3 py-3.5 text-center font-black text-white tabular-nums">
                        <span style={{ color: '#fbbf24' }}>{oKpi.emas}</span>
                        <span className="text-zinc-600">/</span>
                        <span style={{ color: '#cbd5e1' }}>{oKpi.perak}</span>
                        <span className="text-zinc-600">/</span>
                        <span style={{ color: '#cd7f32' }}>{oKpi.perunggu}</span>
                        <span className="text-zinc-600 font-normal text-[10px] ml-1">= {totalMedal}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center text-zinc-700">—</td>
                      <td className="px-3 py-3.5 text-center text-zinc-700">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom-line */}
              {takeaways.length > 0 && (
                <div className="px-6 py-5 border-t mt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3">
                    Bottom-line untuk leadership
                  </div>
                  <ol className="space-y-1.5">
                    {takeaways.slice(0, 5).map((t, i) => (
                      <li key={i} className="flex gap-2.5 text-[12px]">
                        <span className="text-zinc-600 shrink-0 font-bold tabular-nums w-4">{i + 1}.</span>
                        <span className="text-zinc-300 leading-snug">{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )
        })()}

        {/* ════ STRATEGIC BRIEF (AI) ════ */}
        {briefOpen && (
          <div {...ani(0)} className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.20)' }}>

            {/* Header strip */}
            <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.08)' }}>
              <Sparkles size={13} style={{ color: '#818cf8' }}/>
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#818cf8' }}>
                AI Strategic Brief — Claude
              </span>
              <span className="ml-auto text-[10px] text-zinc-600">Berdasarkan data performa real-time</span>
            </div>

            {briefLoading && (
              <div className="flex items-center gap-3 py-12 justify-center">
                <Loader2 size={20} className="animate-spin" style={{ color: '#818cf8' }}/>
                <span className="text-sm text-zinc-400">Claude menganalisa data performa kontingen...</span>
              </div>
            )}

            {briefError && (
              <div className="p-5 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle size={14}/> {briefError}
              </div>
            )}

            {!briefLoading && brief && (
              <div className="p-5 space-y-5">

                {/* ── Top-line projection table ── */}
                {brief.top_line_projection && brief.top_line_projection.length > 0 && (
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">
                      Top-line projection · PORPROV XV 2026
                    </div>
                    <div className="rounded-2xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.30)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th className="text-left px-4 py-2.5 font-bold text-zinc-400">Cabor</th>
                            <th className="text-center px-3 py-2.5 font-bold text-zinc-400">Atlet</th>
                            <th className="text-center px-3 py-2.5 font-bold text-zinc-400">Target coach</th>
                            <th className="text-center px-3 py-2.5 font-bold text-zinc-400">Realistic</th>
                            <th className="text-center px-3 py-2.5 font-bold text-zinc-400">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {brief.top_line_projection.map((row: { cabor: string; atlet: number; target_coach: string; realistic: string; confidence: string }, i: number) => {
                            const confColor = row.confidence === 'HIGH' ? '#10b981' : row.confidence === 'LOW' ? '#ef4444' : '#f59e0b'
                            return (
                              <tr key={i} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                <td className="px-4 py-3 font-bold text-white">{row.cabor}</td>
                                <td className="px-3 py-3 text-center text-zinc-400 tabular-nums">{row.atlet}</td>
                                <td className="px-3 py-3 text-center font-mono text-zinc-300">{row.target_coach}</td>
                                <td className="px-3 py-3 text-center font-mono font-bold text-white">{row.realistic}</td>
                                <td className="px-3 py-3 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                    style={{ background: `${confColor}18`, color: confColor, border: `1px solid ${confColor}30` }}>
                                    {row.confidence}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                          {/* TOTAL row */}
                          <tr className="border-t" style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.20)' }}>
                            <td className="px-4 py-3 font-black text-zinc-300">TOTAL</td>
                            <td className="px-3 py-3 text-center font-black text-white tabular-nums">
                              {brief.top_line_projection.reduce((s: number, r: { atlet: number }) => s + (r.atlet || 0), 0)} atlet
                            </td>
                            <td className="px-3 py-3 text-center text-zinc-600">—</td>
                            <td className="px-3 py-3 text-center text-zinc-600">—</td>
                            <td className="px-3 py-3 text-center text-zinc-600">—</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {/* Bottom-line bullets */}
                    {brief.prioritas && brief.prioritas.length > 0 && (
                      <div className="mt-3 px-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1.5">
                          Bottom-line untuk leadership
                        </div>
                        <ol className="space-y-1">
                          {brief.prioritas.map((p: { no: number; judul: string; detail: string }) => (
                            <li key={p.no} className="flex gap-2 text-[11px]">
                              <span className="text-zinc-600 shrink-0 font-bold tabular-nums">{p.no}.</span>
                              <span className="text-zinc-300">
                                <span className="font-bold">{p.judul}</span>
                                {p.detail ? <span className="text-zinc-500 ml-1">— {p.detail}</span> : null}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Score + Ringkasan */}
                <div className="flex items-start gap-5 flex-wrap">
                  <div className="text-center shrink-0 rounded-2xl px-5 py-3"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-4xl font-black tabular-nums" style={{
                      color: brief.skor_kesiapan >= 70 ? '#10b981' : brief.skor_kesiapan >= 50 ? '#f59e0b' : '#ef4444'
                    }}>
                      {brief.skor_kesiapan}
                    </div>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-widest mt-0.5">Skor Kesiapan</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white mb-1.5">{brief.kekuatan_utama}</div>
                    <div className="text-sm text-zinc-400 leading-relaxed">{brief.ringkasan}</div>
                  </div>
                </div>

                {/* Prioritas Strategis */}
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2.5 font-bold">
                    Prioritas Strategis
                  </div>
                  <div className="space-y-2">
                    {brief.prioritas.map(p => {
                      const dc = p.dampak === 'tinggi' ? '#ef4444' : p.dampak === 'sedang' ? '#f59e0b' : '#10b981'
                      return (
                        <div key={p.no} className="flex gap-3 rounded-xl p-3.5"
                          style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                            style={{ background: `${dc}18`, color: dc, border: `1px solid ${dc}30` }}>
                            {p.no}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">{p.judul}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                                style={{ background: `${dc}15`, color: dc, border: `1px solid ${dc}25` }}>
                                {p.dampak}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{p.detail}</div>
                            {p.deadline && (
                              <div className="text-[10px] text-zinc-700 mt-1.5">⏰ {p.deadline}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Peluang Emas + Area Risiko */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-amber-500 mb-2.5 font-bold">
                      🥇 Peluang Emas
                    </div>
                    <div className="space-y-2">
                      {brief.peluang_emas.map((p, i) => (
                        <div key={i} className="rounded-xl p-3"
                          style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
                          <div className="text-xs font-bold text-amber-300">{p.cabor} · {p.potensi}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{p.gap_status}</div>
                          <div className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">→ {p.rekomendasi}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-red-500 mb-2.5 font-bold">
                      ⚠ Area Risiko
                    </div>
                    <div className="space-y-2">
                      {brief.area_risiko.map((r, i) => (
                        <div key={i} className="rounded-xl p-3"
                          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <div className="text-xs font-bold text-red-400">{r.cabor}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{r.masalah}</div>
                          <div className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">→ {r.intervensi}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pesan Pelatih */}
                <div className="rounded-xl p-4 text-center"
                  style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5">Pesan untuk Para Pelatih</div>
                  <div className="text-sm text-indigo-200 italic leading-relaxed">"{brief.pesan_pelatih}"</div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ════ PERFORMANCE CENTER — Cabor Cards ════ */}
        <div {...ani(20)} className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(2,10,20,0.65)', border: `1px solid ${ACCENT}18` }}>

          {/* Header */}
          <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
            style={{ background: 'rgba(0,0,0,0.30)', borderColor: `${ACCENT}12` }}>
            <div>
              <div className="text-sm font-black text-white">Performance Center — Kab. Bandung</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">PORPROV XV 2026 · Real-time aggregation</div>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full tabular-nums"
              style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>
              {gKpi.atletTotal} atlet
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* KPI strip */}
            {oRows.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { l: 'Total target', v: oKpi.emas + oKpi.perak + oKpi.perunggu, c: '#94a3b8' },
                  { l: 'Emas',         v: oKpi.emas,                               c: '#f59e0b' },
                  { l: 'Perak',        v: oKpi.perak,                              c: '#94a3b8' },
                  { l: 'Perunggu',     v: oKpi.perunggu,                           c: '#fb923c' },
                ] as const).map(s => (
                  <div key={s.l} className="rounded-xl px-4 py-3 text-center"
                    style={{ background: `${s.c}09`, border: `1px solid ${s.c}20` }}>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">{s.l}</div>
                    <div className="text-2xl font-black tabular-nums" style={{ color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}

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

            {/* Label + filter */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cabor cards</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {([
                  { k: 'all',      l: 'Semua',             c: ACCENT    },
                  { k: 'baseline', l: 'Ada Baseline',      c: '#f97316' },
                  { k: 'medal',    l: 'Ada Medali',        c: '#fbbf24' },
                  { k: 'both',     l: 'Baseline + Medali', c: '#10b981' },
                ] as const).map(f => {
                  const active = fSource === f.k
                  return (
                    <button key={f.k} onClick={() => setFSource(f.k)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
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
            </div>

            {/* Cabor grid */}
            {(() => {
              const withData = caborAggregates.filter(c => c.baselineEvents > 0 || c.totalMedals > 0)
              if (withData.length === 0) return (
                <div className="py-16 text-center rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="text-3xl mb-3">🏆</div>
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

        {/* ════ STRATEGIC OVERVIEW ════ */}
        {oRows.length > 0 && (
          <div {...ani(30)} className="rounded-3xl overflow-hidden relative"
            style={{ background: 'rgba(2,10,20,0.65)', border: `1px solid ${ACCENT}18` }}>

            <div className="px-5 py-3 flex items-center gap-3 border-b flex-wrap"
              style={{ background: 'rgba(0,0,0,0.30)', borderColor: `${ACCENT}12` }}>
              <Trophy size={11} style={{ color: ACCENT }}/>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: ACCENT }}>
                Strategic Overview
              </span>
              <span className="h-3 w-px bg-white/10"/>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
                Distribusi Target · Proyeksi Baseline 2022
              </span>
            </div>

            <div className="p-5 space-y-5">

              {/* Insight strategis */}
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
                      title={`${c.cabor_nama}: 0 emas, target perlu validasi`}
                      body={`${c.cabor_nama} punya ${c.total} target medali tapi 0 proyeksi emas — dominated lawan berdasarkan data 2022. ${c.perak} target perak perlu validasi manual pelatih.`}/>
                  ))}
                  <div className="flex items-start gap-1.5 text-[10px] text-zinc-700 px-1">
                    <Info size={10} className="shrink-0 mt-0.5"/>
                    <span>Proyeksi berdasarkan data baseline 2022. Angkat Berat & cabor lain menyusul saat data kualifikasi 2025 masuk.</span>
                  </div>
                </div>
              )}

              {/* Distribusi per cabor + Top kontributor */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {oCaborStats.length > 0 && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="px-4 py-2.5 border-b"
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
  const href  = `/konida/performance/kabbandung/${caborToSlug(c.cabor_nama)}/${c.atlet_id}`
  return (
    <Link href={href}
      className={`grid grid-cols-[28px_1fr_auto] gap-2 items-center px-4 py-2.5 transition-colors cursor-pointer
        ${isFirst ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-white/[0.04]'}
        ${rank > 1 ? 'border-t' : ''}`}
      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
        style={{ background: `${rankC}15`, color: rankC, border: `1px solid ${rankC}30` }}>
        {isFirst
          ? <span className={`transition-opacity ${pulse ? 'opacity-100' : 'opacity-50'}`}>★</span>
          : rank}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
          {c.nama_display}
        </div>
        <div className="text-[10px] text-zinc-600 truncate">{c.cabor_nama}{c.sub_desc ? ` · ${c.sub_desc}` : ''}</div>
      </div>
      <div className="flex gap-1 shrink-0 items-center">
        {c.emas     > 0 && <MPill v={c.emas}     l="E"   c="#f59e0b" bg="#f59e0b"/>}
        {c.perak    > 0 && <MPill v={c.perak}    l="S"   c="#94a3b8" bg="#94a3b8"/>}
        {c.perunggu > 0 && <MPill v={c.perunggu} l="B"   c="#fb7185" bg="#fb7185"/>}
        {c.range    > 0 && <MPill v={c.range}    l="S/B" c="#fb923c" bg="#fb923c"/>}
        <ChevronRight size={10} className="text-zinc-700 ml-0.5"/>
      </div>
    </Link>
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
