'use client'
// src/app/konida/kejuaraan/kabbandung/[cabor_slug]/[atlet_id]/page.tsx
// Atlet detail dossier — career history visualization
// 6 sections: profile / aggregate / timeline / records list / level breakdown / source

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowLeft, Trophy, Plus, Calendar, MapPin, Award,
  CheckCircle, AlertCircle, Clock, FileText, ExternalLink,
  Flame, User, Globe, Building2, Flag,
} from 'lucide-react'
import { getCaborAccent, getCaborIcon, caborToSlug, slugToCaborName, hasBaselineData } from '@/lib/kejuaraan/cabor-accent-map'
import { CareerTimeline, type PrestasiEvent } from '@/components/konida/kejuaraan/CareerTimeline'
import { PrestasiInputForm } from '@/components/konida/kejuaraan/PrestasiInputForm'

// Kejuaraan slug → Baseline slug (baseline punya naming berbeda untuk Akuatik)
const BASELINE_SLUG_MAP: Record<string, string> = {
  'atletik': 'atletik',
  'akuatik': 'akuatik-renang',
  'renang':  'akuatik-renang',
}
const IS_BASELINE_SLUG = (s: string) => Object.keys(BASELINE_SLUG_MAP).includes(s)

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface AtletDB {
  id:                 number
  nama_lengkap:       string
  cabor_nama_raw:     string
  gender:             string
  tgl_lahir:          string
  kode_asal_daerah:   string
  nama_asal_daerah:   string
  status_registrasi:  string
  no_registrasi_koni: number | null
}

interface RiwayatPrestasi {
  id:                  number
  atlet_id:            number
  event:               string
  tahun:               number
  lokasi:              string
  nomor_tanding:       string
  hasil:               'Emas' | 'Perak' | 'Perunggu' | 'Juara 4' | 'Peserta'
  catatan:             string
  level_event:         'Internasional' | 'Nasional' | 'Provinsi' | 'Kabupaten' | 'Lokal'
  is_demo:             boolean
  submitted_by?:       string
  submission_status?:  'pending' | 'verified' | 'rejected'
  verified_at?:        string
  source_document_url?:string
  created_at:          string
}

const HASIL_CFG: Record<string, { bg: string; color: string; emoji: string }> = {
  'Emas':     { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', emoji: '🥇' },
  'Perak':    { bg: 'rgba(203,213,225,0.1)', color: '#cbd5e1', emoji: '🥈' },
  'Perunggu': { bg: 'rgba(205,127,50,0.1)',  color: '#cd7f32', emoji: '🥉' },
  'Juara 4':  { bg: 'rgba(255,255,255,0.04)', color: '#6b7280', emoji: '4️⃣' },
  'Peserta':  { bg: 'rgba(255,255,255,0.04)', color: '#4b5563', emoji: '—'  },
}

const LEVEL_CFG: Record<string, { color: string; icon: any }> = {
  'Internasional': { color: '#a855f7', icon: Globe },
  'Nasional':      { color: '#3b82f6', icon: Flag },
  'Provinsi':      { color: '#0ea5e9', icon: Building2 },
  'Kabupaten':     { color: '#f59e0b', icon: Building2 },
  'Lokal':         { color: '#6b7280', icon: MapPin },
}

const initials = (n: string) => (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

function hitungUmur(tgl: string): number | null {
  if (!tgl) return null
  return Math.floor((Date.now() - new Date(tgl).getTime()) / (365.25 * 24 * 3600 * 1000))
}

export default function KejuaraanAtletDossierPage() {
  const params = useParams()
  const router = useRouter()
  const slug    = String(params.cabor_slug)
  const atletId = Number(params.atlet_id)
  
  const [atlet,        setAtlet]        = useState<AtletDB | null>(null)
  const [records,      setRecords]      = useState<RiwayatPrestasi[]>([])
  const [allCaborNames,setAllCaborNames]= useState<string[]>([])
  const [baselinePerf, setBaselinePerf] = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [filterLevel,  setFilterLevel]  = useState<string>('Semua')
  const [filterSource, setFilterSource] = useState<string>('Semua')
  
  useEffect(() => {
    async function load() {
      const [atletRes, recordsRes, caborRes] = await Promise.all([
        sb.from('atlet').select('*').eq('id', atletId).single(),
        sb.from('riwayat_prestasi').select('*').eq('atlet_id', atletId).order('tahun', { ascending: false }),
        sb.from('atlet').select('cabor_nama_raw').eq('kontingen_id', 4),
      ])

      if (atletRes.data)   setAtlet(atletRes.data as AtletDB)
      if (recordsRes.data) setRecords(recordsRes.data as RiwayatPrestasi[])
      const names = Array.from(new Set((caborRes.data || []).map((r: any) => r.cabor_nama_raw).filter(Boolean))) as string[]
      setAllCaborNames(names)

      if (IS_BASELINE_SLUG(slug)) {
        const { data: bData } = await sb.from('atlet_baseline_performance')
          .select('event_name, gap_percentage, target_medali, medal_probability, waktu_terbaik')
          .eq('atlet_id', atletId)
          .order('gap_percentage', { ascending: true, nullsFirst: false })
        setBaselinePerf(bData || [])
      }

      setLoading(false)
    }
    void load()
  }, [atletId, slug])
  
  const caborNama = useMemo(() => slugToCaborName(slug, allCaborNames) || atlet?.cabor_nama_raw || null, [slug, allCaborNames, atlet])
  const accent    = caborNama ? getCaborAccent(caborNama) : '#38bdf8'
  const Icon      = caborNama ? getCaborIcon(caborNama) : Trophy
  
  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterLevel !== 'Semua' && r.level_event !== filterLevel) return false
      if (filterSource === 'Real'    && (r.is_demo || r.submission_status === 'rejected')) return false
      if (filterSource === 'Demo'    && !r.is_demo) return false
      if (filterSource === 'Pending' && r.submission_status !== 'pending') return false
      return true
    })
  }, [records, filterLevel, filterSource])
  
  // Aggregate stats
  const stats = useMemo(() => {
    const total = records.length
    const emas     = records.filter(r => r.hasil === 'Emas').length
    const perak    = records.filter(r => r.hasil === 'Perak').length
    const perunggu = records.filter(r => r.hasil === 'Perunggu').length
    const real     = records.filter(r => !r.is_demo && r.submission_status !== 'rejected').length
    const demo     = records.filter(r => r.is_demo).length
    const pending  = records.filter(r => r.submission_status === 'pending').length
    
    // Level breakdown
    const levelBreakdown: Record<string, number> = {}
    records.forEach(r => {
      levelBreakdown[r.level_event] = (levelBreakdown[r.level_event] || 0) + 1
    })
    
    // Year range
    const years = records.map(r => r.tahun).filter(Boolean)
    const yearRange = years.length > 0
      ? { from: Math.min(...years), to: Math.max(...years) }
      : null
    
    return { total, emas, perak, perunggu, real, demo, pending, levelBreakdown, yearRange }
  }, [records])
  
  const age = atlet ? hitungUmur(atlet.tgl_lahir) : null
  
  // Refresh after form submit
  function refresh() {
    setLoading(true)
    sb.from('riwayat_prestasi').select('*').eq('atlet_id', atletId).order('tahun', { ascending: false })
      .then(({ data }) => {
        if (data) setRecords(data as RiwayatPrestasi[])
        setLoading(false)
      })
  }
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020a14' }}>
      <div className="text-slate-500 text-sm">Memuat profil atlet...</div>
    </div>
  )
  
  if (!atlet) return (
    <div className="min-h-screen p-8" style={{ background: '#020a14' }}>
      <div className="max-w-4xl mx-auto text-center py-20">
        <User size={40} className="mx-auto mb-3 text-slate-700"/>
        <h2 className="text-lg font-bold text-slate-300 mb-2">Atlet tidak ditemukan</h2>
        <Link href="/konida/kejuaraan/kabbandung"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-sky-400 bg-sky-500/10 border border-sky-500/30 mt-3">
          <ArrowLeft size={14}/> Kembali ke landing
        </Link>
      </div>
    </div>
  )
  
  const isElite = stats.emas > 0
  const isLokal = atlet.kode_asal_daerah?.startsWith('3204') ?? null
  
  // Convert to PrestasiEvent for timeline
  const timelineEvents: PrestasiEvent[] = filteredRecords.map(r => ({
    id:            r.id,
    event:         r.event,
    tahun:         r.tahun,
    lokasi:        r.lokasi,
    nomor_tanding: r.nomor_tanding,
    hasil:         r.hasil,
    level_event:   r.level_event,
    is_demo:       r.is_demo,
    submitted_by:  r.submitted_by,
  }))
  
  const totalLevels = Object.values(stats.levelBreakdown).reduce((s, v) => s + v, 0) || 1
  
  return (
    <div className="min-h-screen text-zinc-300 font-sans p-6 max-w-5xl mx-auto"
      style={{ background: 'linear-gradient(135deg,#020a14 0%,#020c18 100%)' }}>
      
      {/* Breadcrumb */}
      <div className="text-xs text-slate-500 mb-2">
        <Link href="/konida/kejuaraan/kabbandung" className="hover:text-slate-300">Kejuaraan</Link>
        <span className="text-slate-700"> / </span>
        <Link href={`/konida/kejuaraan/kabbandung/${slug}`} className="hover:text-slate-300">{caborNama}</Link>
        <span className="text-slate-700"> / </span>
        <span style={{ color: accent }}>{atlet.nama_lengkap}</span>
      </div>
      <Link href={`/konida/kejuaraan/kabbandung/${slug}`}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4">
        <ArrowLeft size={12}/> Kembali ke roster
      </Link>
      
      {/* ── Profile Header ── */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden border border-slate-800"
        style={{ background: `linear-gradient(135deg, ${accent}12 0%, rgba(15,23,42,0.9) 60%)` }}>
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, transform: 'translate(-30%,-30%)' }}/>
        <div className="relative flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0"
            style={{
              background: isElite ? 'rgba(251,191,36,0.15)' : `${accent}28`,
              border:     `2px solid ${isElite ? 'rgba(251,191,36,0.5)' : accent + '60'}`,
              boxShadow:  isElite ? '0 0 24px rgba(251,191,36,0.2)' : 'none',
            }}>
            {isElite ? <Flame size={26} style={{ color: '#fbbf24' }}/> : initials(atlet.nama_lengkap)}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl font-black text-white">{atlet.nama_lengkap}</h1>
              {isElite && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-black"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                  🔥 ELITE
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
              <Icon size={11} style={{ color: accent }}/>
              {caborNama} · {atlet.gender === 'L' ? 'Putra' : 'Putri'} · {atlet.nama_asal_daerah}
              {age && <span> · {age} thn</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full border"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.25)' }}>
                {atlet.status_registrasi}
              </span>
              {isLokal !== null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.04)', color: isLokal ? '#22c55e' : '#f97316', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {isLokal ? '📍 Lokal' : '🔀 Non-lokal'}
                </span>
              )}
              {atlet.no_registrasi_koni && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                  style={{ background: 'rgba(56,189,248,0.06)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.2)' }}>
                  KONI #{atlet.no_registrasi_koni}
                </span>
              )}
              {hasBaselineData(caborNama || '') && (
                <Link href={`/konida/performance/kabbandung/${slug}/${atletId}`}
                  className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 hover:opacity-80"
                  style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                  📊 Lihat Performance <ExternalLink size={9}/>
                </Link>
              )}
            </div>
          </div>
          
          {/* Tambah prestasi button */}
          <button onClick={() => setShowAddForm(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
            <Plus size={13}/> Tambah Prestasi
          </button>
        </div>
      </div>
      
      {/* ── Row 1: Aggregate Stats + Level Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        
        {/* Aggregate medal stats */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} style={{ color: accent }}/>
            <h3 className="text-sm font-bold text-white">Rekap Medali</h3>
            {stats.total > 0 && (
              <span className="ml-auto text-[10px] text-slate-500">{stats.total} records</span>
            )}
          </div>
          
          {stats.total === 0 ? (
            <div className="py-8 text-center">
              <Trophy size={32} className="mx-auto mb-2 text-slate-700"/>
              <div className="text-xs text-slate-500 mb-1">Belum ada record prestasi</div>
              <div className="text-[10px] text-slate-600">Klik "Tambah Prestasi" untuk mulai</div>
            </div>
          ) : (
            <>
              {/* Medal cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { l: 'Emas', v: stats.emas, c: '#fbbf24', e: '🥇' },
                  { l: 'Perak', v: stats.perak, c: '#cbd5e1', e: '🥈' },
                  { l: 'Perunggu', v: stats.perunggu, c: '#cd7f32', e: '🥉' },
                ].map(m => (
                  <div key={m.l} className="text-center rounded-xl py-3"
                    style={{ background: `${m.c}10`, border: `1px solid ${m.c}25` }}>
                    <div className="text-lg">{m.e}</div>
                    <div className="text-2xl font-black tabular-nums" style={{ color: m.c }}>{m.v}</div>
                    <div className="text-[9px] text-slate-600">{m.l}</div>
                  </div>
                ))}
              </div>
              
              {/* Year range */}
              {stats.yearRange && (
                <div className="rounded-lg bg-slate-800/50 px-3 py-2 text-[11px] text-slate-400 flex items-center gap-2">
                  <Calendar size={12} style={{ color: accent }}/>
                  Career span: <span className="font-bold text-slate-200 tabular-nums">
                    {stats.yearRange.from === stats.yearRange.to 
                      ? stats.yearRange.from 
                      : `${stats.yearRange.from}–${stats.yearRange.to} (${stats.yearRange.to - stats.yearRange.from + 1} thn)`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Level breakdown */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Award size={14} style={{ color: accent }}/>
            <h3 className="text-sm font-bold text-white">Distribusi Level Event</h3>
          </div>
          
          {Object.keys(stats.levelBreakdown).length === 0 ? (
            <div className="py-8 text-center">
              <Award size={32} className="mx-auto mb-2 text-slate-700"/>
              <div className="text-xs text-slate-500">Belum ada data level</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {['Internasional', 'Nasional', 'Provinsi', 'Kabupaten', 'Lokal'].map(level => {
                const count = stats.levelBreakdown[level] || 0
                if (count === 0) return null
                const pct = Math.round((count / totalLevels) * 100)
                const cfg = LEVEL_CFG[level]
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400">{level}</span>
                      <span className="font-bold tabular-nums" style={{ color: cfg.color }}>
                        {count} <span className="text-slate-600 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: cfg.color }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* ── Row 2: Career Timeline ── */}
      <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: accent }}/>
            <h3 className="text-sm font-bold text-white">Timeline Karier</h3>
          </div>
          
          {/* Inline filters */}
          <div className="flex items-center gap-2">
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none">
              <option value="Semua">Semua level</option>
              <option value="Internasional">Internasional</option>
              <option value="Nasional">Nasional</option>
              <option value="Provinsi">Provinsi</option>
              <option value="Kabupaten">Kabupaten</option>
              <option value="Lokal">Lokal</option>
            </select>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 outline-none">
              <option value="Semua">Semua sumber</option>
              <option value="Real">Real</option>
              <option value="Demo">Demo</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
        
        <CareerTimeline events={timelineEvents} accent={accent}/>
      </div>
      
      {/* ── Row 3: Riwayat Prestasi List ── */}
      <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: accent }}/>
            <h3 className="text-sm font-bold text-white">Detail Riwayat Prestasi</h3>
          </div>
          <span className="text-[10px] text-slate-500">{filteredRecords.length} records</span>
        </div>
        
        {filteredRecords.length === 0 ? (
          <div className="py-8 text-center">
            <FileText size={32} className="mx-auto mb-2 text-slate-700"/>
            <div className="text-xs text-slate-500 mb-1">Belum ada record sesuai filter</div>
            <div className="text-[10px] text-slate-600">Klik "Tambah Prestasi" di atas untuk mulai</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecords.map(r => {
              const hCfg = HASIL_CFG[r.hasil] || HASIL_CFG['Peserta']
              const lCfg = LEVEL_CFG[r.level_event] || LEVEL_CFG['Lokal']
              const sourceLabel = 
                r.submission_status === 'pending' ? 'Pending verifikasi' :
                r.submission_status === 'rejected' ? 'Ditolak' :
                r.is_demo ? 'Demo data' :
                r.submitted_by === 'atlet' ? 'Self-reported (verified)' :
                r.submitted_by === 'admin' ? 'Admin input (verified)' :
                r.submitted_by === 'import' ? 'Bulk import (verified)' :
                'Verified'
              return (
                <div key={r.id} className="rounded-xl bg-slate-800/30 border border-slate-800 p-3">
                  <div className="flex items-start gap-3">
                    {/* Medal indicator */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base"
                      style={{ background: hCfg.bg, border: `1px solid ${hCfg.color}30` }}>
                      {hCfg.emoji}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm font-bold text-white truncate">{r.event}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: hCfg.bg, color: hCfg.color, border: `1px solid ${hCfg.color}30` }}>
                            {r.hasil}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: `${lCfg.color}10`, color: lCfg.color, border: `1px solid ${lCfg.color}25` }}>
                            {r.level_event}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {r.nomor_tanding} · {r.lokasi}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-600 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 tabular-nums">
                          <Calendar size={9}/> {r.tahun}
                        </span>
                        <span className="flex items-center gap-1">
                          {r.submission_status === 'pending' ? <Clock size={9} className="text-blue-400"/> 
                           : r.submission_status === 'rejected' ? <AlertCircle size={9} className="text-red-400"/>
                           : r.is_demo ? <AlertCircle size={9} className="text-amber-400"/>
                           : <CheckCircle size={9} className="text-emerald-400"/>}
                          {sourceLabel}
                        </span>
                        {r.source_document_url && (
                          <a href={r.source_document_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                            <ExternalLink size={9}/> Bukti dokumen
                          </a>
                        )}
                      </div>
                      {r.catatan && (
                        <div className="text-[11px] text-slate-500 mt-1.5 italic">
                          "{r.catatan}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      {/* ── Baseline Snapshot (Atletik / Akuatik only) ── */}
      {baselinePerf.length > 0 && (() => {
        const best = baselinePerf.reduce((acc: any, p: any) => {
          const mp = p.medal_probability || {}
          return { emas: Math.max(acc.emas, mp.emas || 0), perak: Math.max(acc.perak, mp.perak || 0), perunggu: Math.max(acc.perunggu, mp.perunggu || 0) }
        }, { emas: 0, perak: 0, perunggu: 0 })
        return (
          <div className="rounded-2xl p-5 bg-slate-900/70 border mb-4"
            style={{ borderColor: `${accent}30` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span style={{ color: accent }}>📊</span>
                <h3 className="text-sm font-bold text-white">Baseline PORPROV 2022</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">Data historis</span>
              </div>
              <Link href={`/konida/performance/kabbandung/${slug}/${atletId}`}
                className="text-[10px] flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: accent }}>
                Buka Performance <ExternalLink size={10}/>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Event targets */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Target per Event</div>
                {baselinePerf.slice(0, 4).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px] rounded-lg px-3 py-2 bg-slate-800/40">
                    <span className="text-slate-300 truncate mr-2">{p.event_name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.gap_percentage !== null && (
                        <span className="font-mono tabular-nums text-[10px]"
                          style={{ color: Math.abs(p.gap_percentage) <= 3 ? '#22c55e' : Math.abs(p.gap_percentage) <= 7 ? '#f59e0b' : '#ef4444' }}>
                          {p.gap_percentage}%
                        </span>
                      )}
                      {p.target_medali && p.target_medali !== '-' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                          {p.target_medali.replace('Berpeluang ', '')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {baselinePerf.length > 4 && (
                  <div className="text-[10px] text-slate-600 px-3">+{baselinePerf.length - 4} event lainnya</div>
                )}
              </div>
              {/* Medal probability */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Probabilitas Medali</div>
                <div className="space-y-2">
                  {([['emas','🥇','#fbbf24'],['perak','🥈','#cbd5e1'],['perunggu','🥉','#cd7f32']] as const).map(([k,e,c]) => (
                    best[k] > 0 ? (
                      <div key={k}>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400">{e} {k.charAt(0).toUpperCase()+k.slice(1)}</span>
                          <span className="font-black tabular-nums" style={{ color: c }}>{best[k]}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${best[k]}%`, background: c }}/>
                        </div>
                      </div>
                    ) : null
                  ))}
                  {best.emas === 0 && best.perak === 0 && best.perunggu === 0 && (
                    <div className="text-[11px] text-slate-600">Tidak ada estimasi probabilitas</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Add Prestasi Modal */}
      {showAddForm && (
        <PrestasiInputForm
          atletId={atletId}
          atletNama={atlet.nama_lengkap}
          caborNama={caborNama || ''}
          accent={accent}
          onClose={() => setShowAddForm(false)}
          onSuccess={refresh}
          submittedBy="admin"
        />
      )}
    </div>
  )
}
