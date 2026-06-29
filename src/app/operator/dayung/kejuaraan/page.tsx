'use client'
// Track Record — Rekam Jejak Prestasi Kompetisi Kab. Bandung
// Semua cabor, data hasil kompetisi nyata, diverifikasi operator

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Trophy, Search, RefreshCw, Award, CheckCircle, Clock,
} from 'lucide-react'
import { KejuaraanCaborCard, type CaborKejuaraanData } from '@/components/konida/kejuaraan/KejuaraanCaborCard'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID = 4
const CABOR_ID     = 147   // Dayung (cabor_id di cabang_olahraga)
const ACCENT       = '#f59e0b'
const BASE_PATH    = '/operator/dayung/kejuaraan'

type FilterStatus = 'all' | 'verified' | 'pending'
type FilterGender = 'Semua' | 'L' | 'P'

interface AtletDB {
  id:                number
  nama_lengkap:      string
  cabor_nama_raw:    string
  gender:            string
  status_registrasi: string
}

interface RiwayatPrestasi {
  id:                 number
  atlet_id:           number
  event:              string
  tahun:              number
  hasil:              'Emas' | 'Perak' | 'Perunggu' | 'Juara 4' | 'Peserta'
  level_event:        'Internasional' | 'Nasional' | 'Provinsi' | 'Kabupaten' | 'Lokal'
  is_demo:            boolean
  submitted_by?:      string
  submission_status?: string
}

const LEVEL_RANK: Record<string, number> = {
  'Internasional': 5, 'Nasional': 4, 'Provinsi': 3, 'Kabupaten': 2, 'Lokal': 1,
}

export default function KejuaraanLandingPage() {
  const [atlets,     setAtlets]     = useState<AtletDB[]>([])
  const [allRecords, setAllRecords] = useState<RiwayatPrestasi[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterGender, setFilterGender] = useState<FilterGender>('Semua')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  useEffect(() => {
    async function load() {
      try {
        // Fetch atlet dulu agar bisa filter riwayat hanya untuk kontingen ini
        const atletData: AtletDB[] = await (async () => {
          let all: AtletDB[] = []
          for (let p = 0; ; p++) {
            const { data } = await sb.from('atlet')
              .select('id,nama_lengkap,cabor_nama_raw,gender,status_registrasi')
              .eq('kontingen_id', KONTINGEN_ID)
                .eq('cabor_id', CABOR_ID)
              .in('status_registrasi', ['Verified', 'Posted'])
              .order('cabor_nama_raw', { ascending: true })
              .range(p * 1000, (p + 1) * 1000 - 1)
            if (!data || data.length === 0) break
            all = all.concat(data as AtletDB[])
            if (data.length < 1000) break
          }
          return all
        })()

        setAtlets(atletData)

        // Fetch semua riwayat_prestasi dengan pagination (Supabase default limit 1000)
        // Filter ke atlet kontingen ini dilakukan client-side untuk hindari URL terlalu panjang
        const atletIdSet = new Set(atletData.map(a => a.id))
        let allRecords: RiwayatPrestasi[] = []
        for (let p = 0; ; p++) {
          const { data } = await sb.from('riwayat_prestasi')
            .select('id,atlet_id,event,tahun,hasil,level_event,is_demo,submitted_by,submission_status')
            .order('tahun', { ascending: false })
            .range(p * 1000, (p + 1) * 1000 - 1)
          if (!data || data.length === 0) break
          allRecords = allRecords.concat((data as RiwayatPrestasi[]).filter(r => atletIdSet.has(r.atlet_id)))
          if (data.length < 1000) break
        }
        setAllRecords(allRecords)
      } catch (e) {
        console.error('[Kejuaraan] Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

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

  const recordsByAtlet = useMemo(() => {
    const map: Record<number, RiwayatPrestasi[]> = {}
    allRecords.forEach(r => {
      if (filterStatus === 'verified' && r.submission_status === 'pending') return
      if (filterStatus === 'pending'  && r.submission_status !== 'pending') return
      if (!map[r.atlet_id]) map[r.atlet_id] = []
      map[r.atlet_id].push(r)
    })
    return map
  }, [allRecords, filterStatus])

  const caborAggregates = useMemo<CaborKejuaraanData[]>(() => {
    const caborMap: Record<string, { atletIds: Set<number>; records: RiwayatPrestasi[] }> = {}

    // Semua atlet masuk ke caborMap (termasuk yang belum ada records)
    filteredAtlets.forEach(a => {
      const cabor = a.cabor_nama_raw?.trim() || 'Lainnya'
      if (!caborMap[cabor]) caborMap[cabor] = { atletIds: new Set(), records: [] }
      const rs = recordsByAtlet[a.id] || []
      if (rs.length > 0) {
        caborMap[cabor].atletIds.add(a.id)
        caborMap[cabor].records.push(...rs)
      }
    })

    return Object.entries(caborMap).filter(([, d]) => d.records.length > 0).map(([nama, d]) => {
      const records  = d.records
      const emas     = records.filter(r => r.hasil === 'Emas').length
      const perak    = records.filter(r => r.hasil === 'Perak').length
      const perunggu = records.filter(r => r.hasil === 'Perunggu').length
      const pending  = records.filter(r => r.submission_status === 'pending').length
      const verified = records.filter(r => r.submission_status !== 'pending').length

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
        topLevel, yearRange,
        realRecords:    verified,
        demoRecords:    0,
        pendingRecords: pending,
      }
    }).sort((a, b) => {
      const aM = a.emas * 3 + a.perak * 2 + a.perunggu
      const bM = b.emas * 3 + b.perak * 2 + b.perunggu
      if (aM !== bM) return bM - aM
      return b.totalRecords - a.totalRecords
    })
  }, [filteredAtlets, recordsByAtlet])

  const kpi = useMemo(() => {
    const flat: RiwayatPrestasi[] = Object.values(recordsByAtlet).flat()
    const caborDenganData  = caborAggregates.filter(c => c.totalRecords > 0).length
    const atletDenganRekam = Object.keys(recordsByAtlet).filter(k => (recordsByAtlet[Number(k)] || []).length > 0).length
    return {
      caborDenganData,
      atletDenganRekam,
      total:    flat.length,
      emas:     flat.filter(r => r.hasil === 'Emas').length,
      perak:    flat.filter(r => r.hasil === 'Perak').length,
      perunggu: flat.filter(r => r.hasil === 'Perunggu').length,
      pending:  flat.filter(r => r.submission_status === 'pending').length,
      topLevel: flat.reduce<string | null>((top, r) => {
        if (!top) return r.level_event
        return (LEVEL_RANK[r.level_event] || 0) > (LEVEL_RANK[top] || 0) ? r.level_event : top
      }, null),
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
          Memuat Track Record...
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col"
      style={{ background: 'linear-gradient(135deg,#020a14 0%,#020c18 100%)' }}>

      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`, backgroundSize: '24px 24px', zIndex: 0 }}/>

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ background: 'rgba(2,10,20,0.95)', borderColor: `${ACCENT}15` }}>
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30` }}>
              <Trophy size={20} style={{ color: ACCENT }}/>
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">Track Record Prestasi</h1>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Rekam jejak kompetisi resmi · Kab. Bandung · PORPROV XV 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {([{ v: 'Semua', l: 'Semua' }, { v: 'L', l: 'Putra' }, { v: 'P', l: 'Putri' }] as const).map(g => (
                <button key={g.v} onClick={() => setFilterGender(g.v as FilterGender)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: filterGender === g.v ? `${ACCENT}18` : 'rgba(255,255,255,0.04)',
                    color:      filterGender === g.v ? ACCENT : 'rgba(255,255,255,0.3)',
                    border:     filterGender === g.v ? `1px solid ${ACCENT}30` : '1px solid rgba(255,255,255,0.08)',
                  }}>
                  {g.l}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama / cabor..."
                className="bg-transparent border rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 outline-none w-44"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}/>
            </div>
            <button onClick={() => window.location.reload()}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
              <RefreshCw size={13}/>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* ── HERO IDENTITY ── */}
        <div {...ani(0)} className="rounded-2xl p-6"
          style={{ background: `linear-gradient(135deg, ${ACCENT}08 0%, rgba(2,10,20,0) 100%)`, border: `1px solid ${ACCENT}20` }}>
          <div className="flex items-start justify-between flex-wrap gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} style={{ color: ACCENT }}/>
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: ACCENT }}>
                  Track Record
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Rekam Jejak Prestasi Kompetisi
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                Dokumentasi hasil nyata atlet Kab. Bandung di kejuaraan resmi —
                mulai tingkat Kabupaten hingga Internasional. Data ini menjadi bukti prestasi
                dan dasar seleksi kontingen PORPROV XV 2026.
              </p>
            </div>

            {/* Summary chips */}
            <div className="flex gap-3 flex-wrap shrink-0">
              <div className="rounded-xl px-5 py-3 text-center"
                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <div className="text-3xl font-black text-yellow-400 tabular-nums">
                  {kpi.emas + kpi.perak + kpi.perunggu}
                </div>
                <div className="text-[10px] text-yellow-400/60 mt-0.5 uppercase tracking-wider">Total Medali</div>
              </div>
              <div className="rounded-xl px-5 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-3xl font-black text-white tabular-nums">{kpi.caborDenganData}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">Cabor Aktif</div>
              </div>
              <div className="rounded-xl px-5 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-3xl font-black text-white tabular-nums">{kpi.atletDenganRekam}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">Atlet Berprestasi</div>
              </div>
              {kpi.topLevel && (
                <div className="rounded-xl px-5 py-3 text-center"
                  style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <div className="text-sm font-black text-purple-300 leading-tight">{kpi.topLevel}</div>
                  <div className="text-[10px] text-purple-400/60 mt-0.5 uppercase tracking-wider">Level Tertinggi</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MEDAL STRIP ── */}
        <div {...ani(60)} className="grid grid-cols-3 gap-3">
          {[
            { emoji: '🥇', label: 'Emas',     val: kpi.emas,     color: '#fbbf24', bg: 'rgba(251,191,36,0.06)'  },
            { emoji: '🥈', label: 'Perak',    val: kpi.perak,    color: '#cbd5e1', bg: 'rgba(203,213,225,0.06)' },
            { emoji: '🥉', label: 'Perunggu', val: kpi.perunggu, color: '#cd7f32', bg: 'rgba(205,127,50,0.06)'  },
          ].map(m => (
            <div key={m.label} className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: m.bg, border: `1px solid ${m.color}20` }}>
              <span className="text-4xl">{m.emoji}</span>
              <div>
                <div className="text-4xl font-black tabular-nums" style={{ color: m.color }}>{m.val}</div>
                <div className="text-xs text-zinc-500 mt-0.5">Medali {m.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── STATUS FILTER ── */}
        <div {...ani(80)} className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Tampilkan</span>
          {([
            { k: 'all',      l: 'Semua Records',         icon: Award,       c: ACCENT    },
            { k: 'verified', l: 'Terverifikasi',          icon: CheckCircle, c: '#22c55e' },
            { k: 'pending',  l: `Menunggu Verifikasi${kpi.pending > 0 ? ` · ${kpi.pending}` : ''}`,
                                                          icon: Clock,       c: '#60a5fa' },
          ] as const).map(f => {
            const active = filterStatus === f.k
            const Icon   = f.icon
            return (
              <button key={f.k} onClick={() => setFilterStatus(f.k)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: active ? `${f.c}15` : 'rgba(255,255,255,0.03)',
                  color:      active ? f.c : 'rgba(255,255,255,0.35)',
                  border:     `1px solid ${active ? f.c + '40' : 'rgba(255,255,255,0.07)'}`,
                }}>
                <Icon size={11}/>
                {f.l}
              </button>
            )
          })}
        </div>

        {/* ── CABOR GRID ── */}
        {caborAggregates.length === 0 ? (
          <div {...ani(100)} className="py-24 text-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Trophy size={48} className="mx-auto mb-4 text-zinc-700"/>
            <div className="text-zinc-400 text-sm font-semibold">Belum ada data prestasi</div>
            <div className="text-zinc-600 text-xs mt-1">Tambah rekam jejak lewat dossier atlet</div>
          </div>
        ) : (
          <div {...ani(100)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caborAggregates.map(c => (
              <KejuaraanCaborCard key={c.nama} cabor={c} basePath={BASE_PATH}/>
            ))}
          </div>
        )}

        {/* ── FOOTER NOTE ── */}
        <p {...ani(120)} className="text-center text-[11px] text-zinc-700 py-3">
          Track Record = hasil kompetisi nyata yang sudah terdokumentasi ·
          Berbeda dari proyeksi di modul Performance
        </p>

      </main>
    </div>
  )
}
