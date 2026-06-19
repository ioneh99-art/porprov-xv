'use client'
// src/app/konida/kejuaraan/kabbandung/[cabor_slug]/page.tsx
// Roster page: list atlet di cabor tertentu, sortable + filterable
// Mirrors baseline performance roster pattern

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  Search, ChevronRight, ArrowLeft, SlidersHorizontal,
  Trophy, Calendar, Filter, X,
} from 'lucide-react'
import { getCaborAccent, getCaborIcon, caborToSlug, slugToCaborName } from '@/lib/kejuaraan/cabor-accent-map'

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

interface RiwayatPrestasi {
  id:                 number
  atlet_id:           number
  event:              string
  tahun:              number
  hasil:              string
  level_event:        string
  is_demo:            boolean
  submission_status?: string
}

type SortMode = 'medal_total' | 'medal_emas' | 'name' | 'recent' | 'level'

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

export default function KejuaraanRosterPage() {
  const params  = useParams()
  const slug    = String(params.cabor_slug)
  
  const [allCaborNames, setAllCaborNames] = useState<string[]>([])
  const [caborNama, setCaborNama] = useState<string | null>(null)
  const [atlets,    setAtlets]    = useState<AtletDB[]>([])
  const [records,   setRecords]   = useState<RiwayatPrestasi[]>([])
  const [loading,   setLoading]   = useState(true)
  
  const [search,         setSearch]         = useState('')
  const [fGender,        setFGender]        = useState('Semua')
  const [fLevel,         setFLevel]         = useState('Semua')
  const [fHasil,         setFHasil]         = useState('Semua')
  const [fSource,        setFSource]        = useState('Semua')
  const [sortMode,       setSortMode]       = useState<SortMode>('medal_total')
  const [showFilters,    setShowFilters]    = useState(false)
  
  useEffect(() => {
    ;(async () => {
      // First pass: get all cabor names for slug resolution
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
      
      // Load atlets + records for this cabor
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
      
      // Records for atlets in this cabor
      const atletIds = allAtlets.map(a => a.id)
      if (atletIds.length > 0) {
        const { data: rData } = await sb.from('riwayat_prestasi')
          .select('id,atlet_id,event,tahun,hasil,level_event,is_demo,submission_status')
          .in('atlet_id', atletIds)
          .order('tahun', { ascending: false })
        setRecords((rData || []) as RiwayatPrestasi[])
      }
      
      setLoading(false)
    })()
  }, [slug])
  
  const accent = caborNama ? getCaborAccent(caborNama) : '#38bdf8'
  const Icon   = caborNama ? getCaborIcon(caborNama) : Trophy
  
  // Filter records based on filters
  const filteredRecordsByAtlet = useMemo(() => {
    const map: Record<number, RiwayatPrestasi[]> = {}
    records.forEach(r => {
      if (fLevel !== 'Semua' && r.level_event !== fLevel) return
      if (fHasil !== 'Semua' && r.hasil !== fHasil) return
      if (fSource === 'Terverifikasi'       && r.submission_status === 'pending') return
      if (fSource === 'Menunggu Verifikasi' && r.submission_status !== 'pending') return
      if (!map[r.atlet_id]) map[r.atlet_id] = []
      map[r.atlet_id].push(r)
    })
    return map
  }, [records, fLevel, fHasil, fSource])
  
  // Atlet rows dengan medal aggregate
  const atletRows = useMemo(() => {
    let list = atlets.filter(a => {
      if (fGender === 'Putra' && a.gender !== 'L') return false
      if (fGender === 'Putri' && a.gender !== 'P') return false
      if (search && !(a.nama_lengkap || '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    
    const rows = list.map(a => {
      const rs = filteredRecordsByAtlet[a.id] || []
      const emas     = rs.filter(r => r.hasil === 'Emas').length
      const perak    = rs.filter(r => r.hasil === 'Perak').length
      const perunggu = rs.filter(r => r.hasil === 'Perunggu').length
      const total    = emas + perak + perunggu
      const topLevel = rs.reduce<string | null>((top, r) => {
        if (!top) return r.level_event
        return (LEVEL_RANK[r.level_event] || 0) > (LEVEL_RANK[top] || 0) ? r.level_event : top
      }, null)
      const years = rs.map(r => r.tahun).filter(Boolean)
      const yearRange = years.length > 0
        ? { from: Math.min(...years), to: Math.max(...years) }
        : null
      
      return { ...a, records: rs, recordCount: rs.length, emas, perak, perunggu, totalMedal: total, topLevel, yearRange }
    })
    
    // Sort
    rows.sort((a, b) => {
      switch (sortMode) {
        case 'medal_total': return b.totalMedal - a.totalMedal || b.recordCount - a.recordCount
        case 'medal_emas':  return b.emas - a.emas || b.totalMedal - a.totalMedal
        case 'name':        return a.nama_lengkap.localeCompare(b.nama_lengkap)
        case 'recent':      return (b.yearRange?.to || 0) - (a.yearRange?.to || 0)
        case 'level':       return (LEVEL_RANK[b.topLevel || ''] || 0) - (LEVEL_RANK[a.topLevel || ''] || 0)
        default:            return 0
      }
    })
    
    return rows
  }, [atlets, filteredRecordsByAtlet, fGender, search, sortMode])
  
  const activeFilterCount = [
    fGender !== 'Semua', fLevel !== 'Semua', fHasil !== 'Semua', fSource !== 'Semua', search !== '',
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
        <Link href="/konida/kejuaraan/kabbandung"
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
          <Link href="/konida/kejuaraan/kabbandung" className="hover:text-slate-300">KAB. BANDUNG / Kejuaraan</Link>
          <span className="text-slate-700"> / </span>
          <span style={{ color: accent }}>{caborNama}</span>
        </div>
        <Link href="/konida/kejuaraan/kabbandung"
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
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-2xl font-black text-white">{caborNama}</h1>
              </div>
              <p className="text-xs text-slate-500">
                {atlets.length} atlet · {records.length} records prestasi
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sort */}
            <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none">
              <option value="medal_total">Sort: Total medali</option>
              <option value="medal_emas">Sort: Emas terbanyak</option>
              <option value="level">Sort: Level tertinggi</option>
              <option value="recent">Sort: Paling baru</option>
              <option value="name">Sort: Nama A-Z</option>
            </select>
            
            {/* Filter */}
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
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Level Event</div>
                <PillGroup options={['Semua', 'Internasional', 'Nasional', 'Provinsi', 'Kabupaten', 'Lokal']}
                  value={fLevel} onChange={setFLevel} color={accent}/>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Hasil</div>
                <PillGroup options={['Semua', 'Emas', 'Perak', 'Perunggu', 'Juara 4', 'Peserta']}
                  value={fHasil} onChange={setFHasil} color={accent}/>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Status</div>
                <PillGroup options={['Semua', 'Terverifikasi', 'Menunggu Verifikasi']}
                  value={fSource} onChange={setFSource} color={accent}/>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atlet…"
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none w-48"/>
              </div>
              {activeFilterCount > 0 && (
                <button onClick={() => { setFGender('Semua'); setFLevel('Semua'); setFHasil('Semua'); setFSource('Semua'); setSearch('') }}
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
            {atletRows.length} atlet · {atletRows.filter(r => r.recordCount > 0).length} ada records
          </span>
        </div>
        
        {/* Roster table */}
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <div className="col-span-4">Atlet</div>
            <div className="col-span-3 text-center">Medal</div>
            <div className="col-span-2 text-center">Records</div>
            <div className="col-span-2">Level Tertinggi</div>
            <div className="col-span-1 text-center">Aksi</div>
          </div>
          
          <div className="divide-y divide-slate-800/70">
            {atletRows.length === 0 ? (
              <div className="py-12 text-center text-slate-600 text-sm">
                Tidak ada atlet sesuai filter.
              </div>
            ) : atletRows.map(r => (
              <Link key={r.id} href={`/konida/kejuaraan/kabbandung/${caborToSlug(caborNama)}/${r.id}`}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-900/60 transition-colors group"
                style={{ borderLeft: `2px solid transparent` }}
                onMouseEnter={e => (e.currentTarget.style.borderLeftColor = accent)}
                onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'transparent')}>
                
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <ChevronRight size={13} className="text-slate-700 group-hover:text-slate-300 shrink-0 transition-colors"/>
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate font-medium flex items-center gap-1.5">
                      {r.nama_lengkap}
                      {r.totalMedal === 0 && (
                        <span className="text-[8px] text-slate-700">·</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {r.gender === 'L' ? 'Putra' : 'Putri'}
                    </div>
                  </div>
                </div>
                
                <div className="col-span-3 text-center">
                  {r.totalMedal > 0 ? (
                    <div className="flex items-center justify-center gap-2">
                      {r.emas > 0     && <span className="text-xs font-bold text-yellow-400 tabular-nums">🥇{r.emas}</span>}
                      {r.perak > 0    && <span className="text-xs font-bold text-slate-300 tabular-nums">🥈{r.perak}</span>}
                      {r.perunggu > 0 && <span className="text-xs font-bold text-amber-500 tabular-nums">🥉{r.perunggu}</span>}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-700">—</span>
                  )}
                </div>
                
                <div className="col-span-2 text-center text-xs">
                  {r.recordCount > 0 ? (
                    <>
                      <span className="text-slate-300 font-bold tabular-nums">{r.recordCount}</span>
                      {r.yearRange && (
                        <div className="text-[9px] text-slate-600 mt-0.5 tabular-nums">
                          {r.yearRange.from === r.yearRange.to ? r.yearRange.from : `${r.yearRange.from}–${r.yearRange.to}`}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-700">belum ada</span>
                  )}
                </div>
                
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
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">
                    Lihat →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
