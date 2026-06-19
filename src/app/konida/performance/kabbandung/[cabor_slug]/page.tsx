'use client'
// src/app/konida/performance/kabbandung/[cabor_slug]/page.tsx
// Roster per cabor — combined baseline + kejuaraan view

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Search, ChevronRight, ArrowLeft, SlidersHorizontal,
  Trophy, X, Zap, Activity,
} from 'lucide-react'
import { getCaborAccent, getCaborIcon, caborToSlug, slugToCaborName, hasBaselineData } from '@/lib/performance/cabor-accent-map'
import { calculateReadiness, type ReadinessInput } from '@/lib/performance/readiness-score'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID = 4

interface AtletDB {
  id:             number
  nama_lengkap:   string
  cabor_nama_raw: string
  gender:         string
  tgl_lahir:      string
}

interface BaselineRow {
  atlet_id:       number
  event_name:     string
  gap_percentage: number | null
}

interface FitnessRow {
  atlet_id:          number
  tahap:             number
  kesimpulan_persen: number | null
  status_tes:        string | null
}

interface RiwayatRow {
  id:                 number
  atlet_id:           number
  hasil:              string
  level_event:        string
  tahun:              number
  is_demo:            boolean
  submission_status?: string
}

type SortMode = 'readiness' | 'gap' | 'medal_total' | 'medal_emas' | 'level' | 'recent' | 'name'

const LEVEL_RANK: Record<string, number> = {
  'Internasional': 5, 'Nasional': 4, 'Provinsi': 3, 'Kabupaten': 2, 'Lokal': 1,
}

function PillGroup({ options, value, onChange, color }: {
  options: string[]; value: string; onChange: (v: string) => void; color: string
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
          style={value === o
            ? { background: `${color}25`, color, border: `1px solid ${color}60` }
            : { background: 'rgba(30,41,59,0.6)', color: '#64748b', border: '1px solid rgba(71,85,105,0.4)' }
          }>
          {o}
        </button>
      ))}
    </div>
  )
}

export default function PerformanceRosterPage() {
  const params  = useParams()
  const slug    = String(params.cabor_slug)
  
  const [allCaborNames, setAllCaborNames] = useState<string[]>([])
  const [caborNama,     setCaborNama]     = useState<string | null>(null)
  const [atlets,        setAtlets]        = useState<AtletDB[]>([])
  const [baseline,      setBaseline]      = useState<BaselineRow[]>([])
  const [fitness,       setFitness]       = useState<FitnessRow[]>([])
  const [riwayat,       setRiwayat]       = useState<RiwayatRow[]>([])
  const [loading,       setLoading]       = useState(true)
  
  const [search,        setSearch]        = useState('')
  const [fGender,       setFGender]       = useState('Semua')
  const [fLevel,        setFLevel]        = useState('Semua')
  const [fHasil,        setFHasil]        = useState('Semua')
  const [fHasBaseline,  setFHasBaseline]  = useState('Semua')   // Semua / Ada / Tidak
  const [sortMode,      setSortMode]      = useState<SortMode>('readiness')
  const [showFilters,   setShowFilters]   = useState(false)
  
  useEffect(() => {
    ;(async () => {
      const { data: caborNamesData } = await sb.from('atlet')
        .select('cabor_nama_raw')
        .eq('kontingen_id', KONTINGEN_ID)
      const names = Array.from(new Set((caborNamesData || []).map((r: any) => r.cabor_nama_raw).filter(Boolean))) as string[]
      setAllCaborNames(names)
      
      const resolvedNama = slugToCaborName(slug, names)
      setCaborNama(resolvedNama)
      
      if (!resolvedNama) {
        setLoading(false)
        return
      }
      
      // Load atlets for this cabor
      let allAtlets: any[] = []
      for (let p = 0; ; p++) {
        const { data } = await sb.from('atlet')
          .select('id,nama_lengkap,cabor_nama_raw,gender,tgl_lahir')
          .eq('kontingen_id', KONTINGEN_ID)
          .eq('cabor_nama_raw', resolvedNama)
          .in('status_registrasi', ['Verified', 'Posted'])
          .order('nama_lengkap', { ascending: true })
          .range(p * 1000, (p + 1) * 1000 - 1)
        if (!data || data.length === 0) break
        allAtlets = allAtlets.concat(data)
        if (data.length < 1000) break
      }
      setAtlets(allAtlets as AtletDB[])
      
      const atletIds = allAtlets.map(a => a.id)
      if (atletIds.length > 0) {
        const [bRes, fRes, rRes] = await Promise.all([
          sb.from('atlet_baseline_performance')
            .select('atlet_id,event_name,gap_percentage')
            .in('atlet_id', atletIds),
          sb.from('atlet_tes_fisik')
            .select('atlet_id,tahap,kesimpulan_persen,status_tes')
            .in('atlet_id', atletIds)
            .eq('status_tes', 'Hadir'),
          sb.from('riwayat_prestasi')
            .select('id,atlet_id,hasil,level_event,tahun,is_demo,submission_status')
            .in('atlet_id', atletIds)
            .order('tahun', { ascending: false }),
        ])
        if (bRes.data) setBaseline(bRes.data as BaselineRow[])
        if (fRes.data) setFitness(fRes.data as FitnessRow[])
        if (rRes.data) setRiwayat(rRes.data as RiwayatRow[])
      }
      
      setLoading(false)
    })()
  }, [slug])
  
  const accent = caborNama ? getCaborAccent(caborNama) : '#38bdf8'
  const Icon   = caborNama ? getCaborIcon(caborNama) : Trophy
  
  // Compute per-atlet aggregate + readiness
  const atletRows = useMemo(() => {
    // Group baseline by atlet
    const blByAtlet: Record<number, BaselineRow[]> = {}
    baseline.forEach(b => {
      if (!blByAtlet[b.atlet_id]) blByAtlet[b.atlet_id] = []
      blByAtlet[b.atlet_id].push(b)
    })
    
    // Group fitness by atlet (latest tahap)
    const fitByAtlet: Record<number, FitnessRow> = {}
    fitness.forEach(f => {
      if (!fitByAtlet[f.atlet_id] || f.tahap > fitByAtlet[f.atlet_id].tahap) {
        fitByAtlet[f.atlet_id] = f
      }
    })
    
    // Group riwayat by atlet — apply filters
    const rwByAtlet: Record<number, RiwayatRow[]> = {}
    riwayat.forEach(r => {
      if (fLevel !== 'Semua' && r.level_event !== fLevel) return
      if (fHasil !== 'Semua' && r.hasil !== fHasil) return
      if (r.submission_status === 'rejected') return
      if (!rwByAtlet[r.atlet_id]) rwByAtlet[r.atlet_id] = []
      rwByAtlet[r.atlet_id].push(r)
    })
    
    let list = atlets.filter(a => {
      if (fGender === 'Putra' && a.gender !== 'L') return false
      if (fGender === 'Putri' && a.gender !== 'P') return false
      if (search && !(a.nama_lengkap || '').toLowerCase().includes(search.toLowerCase())) return false
      if (fHasBaseline === 'Ada'   && !blByAtlet[a.id])   return false
      if (fHasBaseline === 'Tidak' && !!blByAtlet[a.id])  return false
      return true
    })
    
    const rows = list.map(a => {
      const bl = blByAtlet[a.id] || []
      const fit = fitByAtlet[a.id] || null
      const rw = rwByAtlet[a.id] || []
      
      const validGaps = bl.filter(b => b.gap_percentage !== null).map(b => Math.abs(b.gap_percentage!))
      const avgGap = validGaps.length > 0 ? validGaps.reduce((s, g) => s + g, 0) / validGaps.length : null
      const bestGap = validGaps.length > 0 ? Math.min(...validGaps) : null
      
      const realRw = rw.filter(r => !r.is_demo && r.submission_status === 'verified')
      const emas     = realRw.filter(r => r.hasil === 'Emas').length
      const perak    = realRw.filter(r => r.hasil === 'Perak').length
      const perunggu = realRw.filter(r => r.hasil === 'Perunggu').length
      const total    = emas + perak + perunggu
      
      const topLevel = realRw.reduce<string | null>((top, r) => {
        if (!top) return r.level_event
        return (LEVEL_RANK[r.level_event] || 0) > (LEVEL_RANK[top] || 0) ? r.level_event : top
      }, null)
      
      const years = realRw.map(r => r.tahun).filter(Boolean)
      const yearRange = years.length > 0 ? { from: Math.min(...years), to: Math.max(...years) } : null
      
      // Readiness score
      const readinessInput: ReadinessInput = {
        fitnessPersen: fit?.kesimpulan_persen ?? null,
        avgGap,
        topLevel,
        totalMedals: total,
        emasCount: emas,
        perakCount: perak,
        perungguCount: perunggu,
      }
      const readiness = calculateReadiness(readinessInput)
      
      return {
        ...a,
        baselineCount: bl.length,
        avgGap, bestGap,
        recordCount: realRw.length,
        emas, perak, perunggu, totalMedal: total,
        topLevel, yearRange,
        readiness,
        fitnessPersen: fit?.kesimpulan_persen ?? null,
      }
    })
    
    // Sort
    rows.sort((a, b) => {
      switch (sortMode) {
        case 'readiness':  return b.readiness.score - a.readiness.score
        case 'gap':        return (a.bestGap ?? 999) - (b.bestGap ?? 999)
        case 'medal_total':return b.totalMedal - a.totalMedal || b.recordCount - a.recordCount
        case 'medal_emas': return b.emas - a.emas || b.totalMedal - a.totalMedal
        case 'name':       return a.nama_lengkap.localeCompare(b.nama_lengkap)
        case 'recent':     return (b.yearRange?.to || 0) - (a.yearRange?.to || 0)
        case 'level':      return (LEVEL_RANK[b.topLevel || ''] || 0) - (LEVEL_RANK[a.topLevel || ''] || 0)
        default:           return 0
      }
    })
    
    return rows
  }, [atlets, baseline, fitness, riwayat, fGender, fLevel, fHasil, fHasBaseline, search, sortMode])
  
  const activeFilterCount = [
    fGender !== 'Semua', fLevel !== 'Semua', fHasil !== 'Semua', fHasBaseline !== 'Semua', search !== '',
  ].filter(Boolean).length
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020a14' }}>
      <div className="text-slate-500 text-sm">Memuat roster...</div>
    </div>
  )
  
  if (!caborNama) return (
    <div className="min-h-screen p-8" style={{ background: '#020a14' }}>
      <div className="max-w-4xl mx-auto text-center py-20">
        <Trophy size={40} className="mx-auto mb-3 text-slate-700"/>
        <h2 className="text-lg font-bold text-slate-300 mb-2">Cabor tidak ditemukan</h2>
        <p className="text-sm text-slate-500 mb-4">Slug: <code className="font-mono text-slate-400">{slug}</code></p>
        <Link href="/konida/performance/kabbandung"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-sky-400 bg-sky-500/10 border border-sky-500/30">
          <ArrowLeft size={14}/> Kembali ke landing
        </Link>
      </div>
    </div>
  )
  
  return (
    <div className="min-h-screen text-zinc-300 font-sans p-6"
      style={{ background: 'linear-gradient(135deg,#020a14 0%,#020c18 100%)' }}>
      
      <div className="max-w-[1600px] mx-auto">
        
        {/* Breadcrumb */}
        <div className="text-xs text-slate-500 mb-2">
          <Link href="/konida/performance/kabbandung" className="hover:text-slate-300">KAB. BANDUNG / Performance</Link>
          <span className="text-slate-700"> / </span>
          <span style={{ color: accent }}>{caborNama}</span>
        </div>
        <Link href="/konida/performance/kabbandung"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4">
          <ArrowLeft size={12}/> Kembali
        </Link>
        
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accent}18`, border: `1px solid ${accent}40` }}>
              <Icon size={22} style={{ color: accent }}/>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h1 className="text-2xl font-black text-white">{caborNama}</h1>
                {hasBaselineData(caborNama) && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                    style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                    <Zap size={9}/> Baseline ready
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {atlets.length} atlet · {baseline.length} record baseline · {riwayat.filter(r => !r.is_demo && r.submission_status === 'verified').length} medali terverifikasi
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none">
              <option value="readiness">Sort: Readiness score</option>
              <option value="gap">Sort: Gap terkecil</option>
              <option value="medal_total">Sort: Total medali</option>
              <option value="medal_emas">Sort: Emas terbanyak</option>
              <option value="level">Sort: Level tertinggi</option>
              <option value="recent">Sort: Paling baru</option>
              <option value="name">Sort: Nama A-Z</option>
            </select>
            
            <button onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
              style={showFilters || activeFilterCount > 0
                ? { background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }
                : { background: 'rgba(30,41,59,0.6)', color: '#94a3b8', border: '1px solid rgba(71,85,105,0.4)' }}>
              <SlidersHorizontal size={13}/>
              Filter
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center"
                  style={{ background: accent, color: '#000' }}>{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>
        
        {/* Filter panel */}
        {showFilters && (
          <div className="mb-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Gender</div>
                <PillGroup options={['Semua', 'Putra', 'Putri']} value={fGender} onChange={setFGender} color={accent}/>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Baseline Data</div>
                <PillGroup options={['Semua', 'Ada', 'Tidak']} value={fHasBaseline} onChange={setFHasBaseline} color={accent}/>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Level Kejuaraan</div>
                <PillGroup options={['Semua', 'Internasional', 'Nasional', 'Provinsi', 'Kabupaten', 'Lokal']}
                  value={fLevel} onChange={setFLevel} color={accent}/>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Hasil</div>
                <PillGroup options={['Semua', 'Emas', 'Perak', 'Perunggu']}
                  value={fHasil} onChange={setFHasil} color={accent}/>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atlet…"
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none w-48"/>
              </div>
              {activeFilterCount > 0 && (
                <button onClick={() => { setFGender('Semua'); setFLevel('Semua'); setFHasil('Semua'); setFHasBaseline('Semua'); setSearch('') }}
                  className="text-[11px] text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1">
                  <X size={11}/> Reset semua
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Result count */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-600">
            {atletRows.length} atlet ·{' '}
            {atletRows.filter(r => r.baselineCount > 0).length} punya baseline ·{' '}
            {atletRows.filter(r => r.recordCount > 0).length} punya medali
          </span>
        </div>
        
        {/* Roster table */}
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <div className="col-span-3">Atlet</div>
            <div className="col-span-2 text-center">Readiness</div>
            <div className="col-span-2 text-center">Baseline Gap</div>
            <div className="col-span-2 text-center">Medali</div>
            <div className="col-span-2">Level Tertinggi</div>
            <div className="col-span-1 text-center">Aksi</div>
          </div>
          
          <div className="divide-y divide-slate-800/70">
            {atletRows.length === 0 ? (
              <div className="py-12 text-center text-slate-600 text-sm">
                Tidak ada atlet sesuai filter.
              </div>
            ) : atletRows.map(r => (
              <Link key={r.id} href={`/konida/performance/kabbandung/${caborToSlug(caborNama)}/${r.id}`}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-900/60 transition-colors group"
                style={{ borderLeft: `2px solid transparent` }}
                onMouseEnter={e => (e.currentTarget.style.borderLeftColor = accent)}
                onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'transparent')}>
                
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <ChevronRight size={13} className="text-slate-700 group-hover:text-slate-300 shrink-0 transition-colors"/>
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate font-medium">{r.nama_lengkap}</div>
                    <div className="text-[10px] text-slate-600">
                      {r.gender === 'L' ? 'Putra' : 'Putri'}
                      {r.fitnessPersen !== null && <span> · fisik {r.fitnessPersen}%</span>}
                    </div>
                  </div>
                </div>
                
                {/* Readiness score */}
                <div className="col-span-2 text-center">
                  {r.readiness.tier !== 'unknown' ? (
                    <div className="inline-flex flex-col items-center">
                      <span className="text-lg font-black tabular-nums" style={{ color: r.readiness.tierColor }}>
                        {r.readiness.score}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${r.readiness.tierColor}15`, color: r.readiness.tierColor, border: `1px solid ${r.readiness.tierColor}30` }}>
                        {r.readiness.tierLabel}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-700">data kurang</span>
                  )}
                </div>
                
                {/* Baseline gap */}
                <div className="col-span-2 text-center">
                  {r.bestGap !== null ? (
                    <>
                      <span className="text-sm font-bold tabular-nums" style={{ 
                        color: r.bestGap <= 3 ? '#10b981' : r.bestGap <= 7 ? '#06b6d4' : r.bestGap <= 12 ? '#f59e0b' : '#ef4444'
                      }}>
                        {r.bestGap.toFixed(1)}%
                      </span>
                      <div className="text-[9px] text-slate-600 mt-0.5">{r.baselineCount} event</div>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-700">—</span>
                  )}
                </div>
                
                {/* Medal breakdown */}
                <div className="col-span-2 text-center">
                  {r.totalMedal > 0 ? (
                    <div>
                      <div className="flex items-center justify-center gap-1.5">
                        {r.emas > 0     && <span className="text-xs font-bold text-yellow-400 tabular-nums">🥇{r.emas}</span>}
                        {r.perak > 0    && <span className="text-xs font-bold text-slate-300 tabular-nums">🥈{r.perak}</span>}
                        {r.perunggu > 0 && <span className="text-xs font-bold text-amber-500 tabular-nums">🥉{r.perunggu}</span>}
                      </div>
                      {r.yearRange && (
                        <div className="text-[9px] text-slate-600 mt-0.5 tabular-nums">
                          {r.yearRange.from === r.yearRange.to ? r.yearRange.from : `${r.yearRange.from}–${r.yearRange.to}`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-700">—</span>
                  )}
                </div>
                
                {/* Top level */}
                <div className="col-span-2 text-xs">
                  {r.topLevel ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                      {r.topLevel}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-700">—</span>
                  )}
                </div>
                
                <div className="col-span-1 text-center">
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">Lihat →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
