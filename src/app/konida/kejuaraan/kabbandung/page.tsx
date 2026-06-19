'use client'
// src/app/konida/kejuaraan/kabbandung/page.tsx — v4 (Landing page)
// Mirrors baseline performance landing pattern
// KPI strip + cabor cards grid + filter chips

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Trophy, Search, RefreshCw, Users, Award,
  AlertCircle, Info, X,
} from 'lucide-react'
import { KejuaraanCaborCard, type CaborKejuaraanData } from '@/components/konida/kejuaraan/KejuaraanCaborCard'
import { hasBaselineData } from '@/lib/kejuaraan/cabor-accent-map'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID    = 4
const ACCENT          = '#38bdf8'
const BASE_PATH       = '/konida/kejuaraan/kabbandung'
const ALLOWED_CABORS  = ['Atletik', 'Akuatik'] as const

type FilterType   = 'all' | 'real' | 'demo' | 'pending'
type FilterGender = 'Semua' | 'L' | 'P'

interface AtletDB {
  id:                 number
  nama_lengkap:       string
  cabor_nama_raw:     string
  gender:             string
  status_registrasi:  string
}

interface RiwayatPrestasi {
  id:                  number
  atlet_id:            number
  event:               string
  tahun:               number
  hasil:               'Emas' | 'Perak' | 'Perunggu' | 'Juara 4' | 'Peserta'
  level_event:         'Internasional' | 'Nasional' | 'Provinsi' | 'Kabupaten' | 'Lokal'
  is_demo:             boolean
  submitted_by?:       string
  submission_status?:  string
}

const LEVEL_RANK: Record<string, number> = {
  'Internasional': 5,
  'Nasional':      4,
  'Provinsi':      3,
  'Kabupaten':     2,
  'Lokal':         1,
}

export default function KejuaraanLandingPage() {
  const [atlets,     setAtlets]     = useState<AtletDB[]>([])
  const [allRecords, setAllRecords] = useState<RiwayatPrestasi[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterGender, setFilterGender] = useState<FilterGender>('Semua')
  const [filterType,   setFilterType]   = useState<FilterType>('all')
  const [showDemoBanner, setShowDemoBanner] = useState(true)
  const [animIn, setAnimIn] = useState(false)
  
  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])
  
  useEffect(() => {
    async function load() {
      try {
        const [atletRes, riwayatRes] = await Promise.all([
          (async () => {
            let all: any[] = []
            for (let p = 0; ; p++) {
              const { data, error } = await sb.from('atlet')
                .select('id,nama_lengkap,cabor_nama_raw,gender,status_registrasi')
                .eq('kontingen_id', KONTINGEN_ID)
                .in('status_registrasi', ['Verified', 'Posted'])
                .in('cabor_nama_raw', ALLOWED_CABORS)
                .order('cabor_nama_raw', { ascending: true })
                .range(p * 1000, (p + 1) * 1000 - 1)
              if (error) return { data: null, error }
              if (!data || data.length === 0) break
              all = all.concat(data)
              if (data.length < 1000) break
            }
            return { data: all, error: null }
          })(),
          sb.from('riwayat_prestasi')
            .select('id,atlet_id,event,tahun,hasil,level_event,is_demo,submitted_by,submission_status')
            .order('tahun', { ascending: false }),
        ])
        
        if (atletRes.data)   setAtlets(atletRes.data as AtletDB[])
        if (riwayatRes.data) setAllRecords(riwayatRes.data as RiwayatPrestasi[])
      } catch (e) {
        console.error('[Kejuaraan Landing] Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])
  
  // Filter atlets by gender + search
  const filteredAtlets = useMemo(() => {
    let list = atlets
    if (filterGender !== 'Semua') list = list.filter(a => a.gender === filterGender)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.nama_lengkap.toLowerCase().includes(q) ||
        (a.cabor_nama_raw || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [atlets, search, filterGender])
  
  // Records map per atlet
  const recordsByAtlet = useMemo(() => {
    const map: Record<number, RiwayatPrestasi[]> = {}
    allRecords.forEach(r => {
      if (filterType === 'real'    && (r.is_demo || r.submission_status === 'rejected')) return
      if (filterType === 'demo'    && !r.is_demo) return
      if (filterType === 'pending' && r.submission_status !== 'pending') return
      if (!map[r.atlet_id]) map[r.atlet_id] = []
      map[r.atlet_id].push(r)
    })
    return map
  }, [allRecords, filterType])
  
  // Aggregate per cabor
  const caborAggregates = useMemo<CaborKejuaraanData[]>(() => {
    const caborMap: Record<string, { atletIds: Set<number>; records: RiwayatPrestasi[] }> = {}
    
    filteredAtlets.forEach(a => {
      const cabor = a.cabor_nama_raw || 'Lainnya'
      if (!caborMap[cabor]) caborMap[cabor] = { atletIds: new Set(), records: [] }
      const rs = recordsByAtlet[a.id] || []
      if (rs.length > 0) {
        caborMap[cabor].atletIds.add(a.id)
        caborMap[cabor].records.push(...rs)
      }
    })
    
    // Also include cabors that have atlets but no records (for empty state display)
    filteredAtlets.forEach(a => {
      const cabor = a.cabor_nama_raw || 'Lainnya'
      if (!caborMap[cabor]) caborMap[cabor] = { atletIds: new Set(), records: [] }
    })
    
    return Object.entries(caborMap).map(([nama, d]) => {
      const records = d.records
      const emas     = records.filter(r => r.hasil === 'Emas').length
      const perak    = records.filter(r => r.hasil === 'Perak').length
      const perunggu = records.filter(r => r.hasil === 'Perunggu').length
      const realRecords    = records.filter(r => !r.is_demo && r.submission_status !== 'rejected').length
      const demoRecords    = records.filter(r => r.is_demo).length
      const pendingRecords = records.filter(r => r.submission_status === 'pending').length
      
      const topLevel = records.reduce<string | null>((top, r) => {
        if (!top) return r.level_event
        return (LEVEL_RANK[r.level_event] || 0) > (LEVEL_RANK[top] || 0) ? r.level_event : top
      }, null)
      
      const years = records.map(r => r.tahun).filter(Boolean)
      const yearRange = years.length > 0
        ? { from: Math.min(...years), to: Math.max(...years) }
        : null
      
      return {
        nama,
        atletCount:     d.atletIds.size,
        totalRecords:   records.length,
        emas, perak, perunggu,
        topLevel,
        yearRange,
        realRecords, demoRecords, pendingRecords,
      }
    }).sort((a, b) => {
      // Baseline cabors first, then by total records desc
      const aB = hasBaselineData(a.nama) ? 1 : 0
      const bB = hasBaselineData(b.nama) ? 1 : 0
      if (aB !== bB) return bB - aB
      return b.totalRecords - a.totalRecords
    })
  }, [filteredAtlets, recordsByAtlet])
  
  // Top-level KPI
  const kpi = useMemo(() => {
    const flatRecords: RiwayatPrestasi[] = []
    Object.values(recordsByAtlet).forEach(arr => flatRecords.push(...arr))
    
    const atletDenganRekam = Object.keys(recordsByAtlet).filter(k => (recordsByAtlet[Number(k)] || []).length > 0).length
    const cabors = new Set(caborAggregates.filter(c => c.totalRecords > 0).map(c => c.nama)).size
    
    return {
      cabors,
      atletDenganRekam,
      totalRecords: flatRecords.length,
      emas:     flatRecords.filter(r => r.hasil === 'Emas').length,
      perak:    flatRecords.filter(r => r.hasil === 'Perak').length,
      perunggu: flatRecords.filter(r => r.hasil === 'Perunggu').length,
      realPct: flatRecords.length > 0
        ? Math.round((flatRecords.filter(r => !r.is_demo).length / flatRecords.length) * 100)
        : 0,
      pending: flatRecords.filter(r => r.submission_status === 'pending').length,
    }
  }, [recordsByAtlet, caborAggregates])
  
  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020a14' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: `${ACCENT}20`, borderTopColor: ACCENT }}/>
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
          Memuat Basis Data Prestasi...
        </p>
      </div>
    </div>
  )
  
  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col"
      style={{ background: 'linear-gradient(135deg,#020a14 0%,#020c18 100%)' }}>
      
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`, backgroundSize: '24px 24px', zIndex: 0 }}/>
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{ background: 'rgba(2,10,20,0.95)', borderColor: `${ACCENT}12` }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}25` }}>
              <Trophy size={20} style={{ color: ACCENT }}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Basis Data Prestasi Atlet</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {kpi.totalRecords} records · {kpi.atletDenganRekam} atlet · Atletik & Akuatik · Kab. Bandung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {[{ v: 'Semua', l: 'Semua' }, { v: 'L', l: '⚡ Putra' }, { v: 'P', l: '♀ Putri' }].map(g => (
                <button key={g.v} onClick={() => setFilterGender(g.v as any)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: filterGender === g.v ? `${ACCENT}18` : 'rgba(255,255,255,0.04)',
                    color:      filterGender === g.v ? ACCENT : 'rgba(255,255,255,0.35)',
                    border:     filterGender === g.v ? `1px solid ${ACCENT}25` : '1px solid rgba(255,255,255,0.08)',
                  }}>
                  {g.l}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama / cabor..."
                className="bg-transparent border rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none w-48"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}/>
            </div>
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={11}/>
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">
        
        {/* Deprecation banner */}
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)' }}>
          <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-amber-300 mb-0.5">Halaman ini akan digantikan</div>
            <div className="text-[11px] text-amber-200/70">
              Pindah ke <strong>Performance Center</strong> — modul baru yang menggabungkan baseline + kejuaraan + kesiapan atlet dalam satu tampilan.
            </div>
          </div>
          <Link href="/konida/performance/kabbandung"
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' }}>
            Buka Performance →
          </Link>
        </div>

        {/* Demo banner */}
        {showDemoBanner && kpi.realPct < 50 && kpi.totalRecords > 0 && (
          <div {...ani(0)} className="rounded-2xl p-4 flex items-start gap-3 relative"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.20)' }}>
            <Info size={18} style={{ color: '#fbbf24' }} className="shrink-0 mt-0.5"/>
            <div className="flex-1">
              <div className="text-sm font-bold text-amber-300 mb-0.5">Data sebagian besar masih demo</div>
              <div className="text-[11px] text-amber-200/70">
                {kpi.realPct}% real, sisanya demo. Atlet bisa input prestasi sendiri lewat Portal Atlet, atau admin tambah via tombol "+ Tambah Prestasi" di dossier atlet.
              </div>
            </div>
            <button onClick={() => setShowDemoBanner(false)}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0">
              <X size={14} className="text-amber-200/50"/>
            </button>
          </div>
        )}
        
        {/* KPI Strip */}
        <div {...ani(10)} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { l: 'Cabor',     sub: 'punya data',   v: kpi.cabors,           c: ACCENT,    icon: Trophy  },
            { l: 'Atlet',     sub: 'punya record', v: kpi.atletDenganRekam, c: '#a855f7', icon: Users   },
            { l: 'Records',   sub: 'total event',  v: kpi.totalRecords,     c: '#10b981', icon: Award   },
            { l: 'Emas',      sub: 'medali',       v: kpi.emas,             c: '#fbbf24', emoji: '🥇'   },
            { l: 'Perak',     sub: 'medali',       v: kpi.perak,            c: '#cbd5e1', emoji: '🥈'   },
            { l: 'Perunggu',  sub: 'medali',       v: kpi.perunggu,         c: '#cd7f32', emoji: '🥉'   },
            { l: 'Pending',   sub: 'butuh verify', v: kpi.pending,          c: '#60a5fa', icon: AlertCircle },
          ].map((k: any) => (
            <div key={k.l} className="rounded-2xl p-3 bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-1.5 mb-1.5">
                {k.icon ? <k.icon size={11} style={{ color: k.c }}/> : <span className="text-[11px]">{k.emoji}</span>}
                <span className="text-[9px] uppercase tracking-wider text-slate-500">{k.l}</span>
              </div>
              <div className="text-2xl font-black text-white tabular-nums">{k.v}</div>
              <div className="text-[9px] text-slate-600 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>
        
        {/* Source filter pills */}
        <div {...ani(20)} className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sumber Data</span>
          {([
            { k: 'all',     l: `Semua (${kpi.totalRecords})`,                                          c: ACCENT     },
            { k: 'real',    l: `Real (${allRecords.filter(r => !r.is_demo && r.submission_status !== 'rejected').length})`, c: '#22c55e'  },
            { k: 'demo',    l: `Demo (${allRecords.filter(r => r.is_demo).length})`,                  c: '#fbbf24'  },
            { k: 'pending', l: `Pending (${allRecords.filter(r => r.submission_status === 'pending').length})`, c: '#60a5fa' },
          ] as const).map(f => {
            const active = filterType === f.k
            return (
              <button key={f.k} onClick={() => setFilterType(f.k as FilterType)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: active ? `${f.c}15` : 'rgba(255,255,255,0.03)',
                  color:      active ? f.c : 'rgba(255,255,255,0.4)',
                  border:     `1px solid ${active ? f.c + '40' : 'rgba(255,255,255,0.06)'}`,
                }}>
                {f.l}
              </button>
            )
          })}
        </div>
        
        {/* Cabor grid */}
        {caborAggregates.length === 0 ? (
          <div {...ani(30)} className="py-20 text-center rounded-2xl bg-slate-900/30 border border-slate-800">
            <Trophy size={40} className="mx-auto mb-3 text-slate-700"/>
            <div className="text-slate-400 text-sm">Tidak ada cabor sesuai filter</div>
            <div className="text-slate-600 text-xs mt-1">Coba ubah filter gender atau search</div>
          </div>
        ) : (
          <div {...ani(30)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caborAggregates.map(c => (
              <KejuaraanCaborCard key={c.nama} cabor={c} basePath={BASE_PATH}/>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
