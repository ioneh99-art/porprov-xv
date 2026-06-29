'use client'
// src/app/konida/performance/kabbandung/[cabor_slug]/[atlet_id]/page.tsx
// Atlet dossier — unified baseline + kejuaraan + kesiapan + AI brief
// Sticky nav + long scroll layout, 5 sections

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowLeft, Trophy, Calendar, MapPin, Award, Sparkles,
  Activity, User, ChevronRight, Plus, AlertCircle, CheckCircle2,
  Clock, FileText, BarChart3,
} from 'lucide-react'
import { getCaborAccent, getCaborIcon, caborToSlug, slugToCaborName } from '@/lib/performance/cabor-accent-map'
import { PerformanceBaselineSection } from '@/components/konida/performance/PerformanceBaselineSection'
import { PerformanceQuadrantCard } from '@/components/konida/performance/PerformanceQuadrantCard'
import { PerformanceFitnessCard } from '@/components/konida/performance/PerformanceFitnessCard'
import { PerformanceAgeCard } from '@/components/konida/performance/PerformanceAgeCard'
import { CareerTimeline } from '@/components/konida/performance/CareerTimeline'
import { PrestasiInputForm } from '@/components/konida/performance/PrestasiInputForm'
import AthleteSmartBrief from '@/components/konida/performance/AthleteSmartBrief'
import AchievementBanner from '@/components/konida/performance/AchievementBanner'
import MultiDisciplineProjection from '@/components/konida/performance/MultiDisciplineProjection'
import { LiftProgressionCard } from '@/components/konida/performance/LiftProgressionCard'
import { AthleteActionItems } from '@/components/konida/performance/AthleteActionItems'
import type { ReadinessInput } from '@/lib/performance/readiness-score'
import { calculateReadiness } from '@/lib/performance/readiness-score'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID = 4

interface AtletDetail {
  id:                  number
  nama_lengkap:        string
  cabor_id:            number
  cabor_nama_raw:      string
  cabor?:              { id: number; nama: string; min_umur?: number; avg_umur?: number; max_umur?: number }
  gender:              string
  tgl_lahir:           string
  status_registrasi:   string
  kode_asal_daerah:    string | null
  nomor_koni?:         string | null
  domisili?:           string | null
}

interface BaselineEvent {
  id:                 number
  event_name:         string
  is_relay:           boolean
  waktu_terbaik:      string | null
  rekor_porprov:      string | null
  gap_percentage:     number | null
  target_medali:      string | null
  pesaing:            string | null
  medal_probability?: { emas: number; perak: number; perunggu: number } | null
  metric_type?:       string | null
  weight_class?:      string | null
}

interface FitnessRecord {
  tahap:                number
  kesimpulan_persen:    number | null
  kesimpulan_kategori?: string | null
  bmi?:                 number | null
  berat_badan?:         number | null
  tinggi_badan?:        number | null
  tanggal_tes?:         string | null
  status_tes?:          string | null
}

interface RiwayatRecord {
  id:                  number
  atlet_id:            number
  tahun:               number
  event:               string
  nomor_tanding:       string
  level_event:         string
  lokasi:              string | null
  hasil:               string
  ranking?:            number | null
  catatan_waktu?:      string | null
  is_demo:             boolean
  submission_status?:  string
  submitted_at?:       string | null
  verified_at?:        string | null
  bukti_url?:          string | null
  notes?:              string | null
}

const LEVEL_RANK: Record<string, number> = {
  'Internasional': 5, 'Nasional': 4, 'Provinsi': 3, 'Kabupaten': 2, 'Lokal': 1,
}

const SECTIONS = [
  { id: 'profile',     label: 'Profile',     icon: User },
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'career',      label: 'Karier',      icon: Trophy },
  { id: 'kesiapan',    label: 'Kesiapan',    icon: Activity },
  { id: 'brief',       label: 'AI Brief',    icon: Sparkles },
]

function ageAt(tglLahir: string | null, targetDate: Date): number | null {
  if (!tglLahir) return null
  const birth = new Date(tglLahir)
  let age = targetDate.getFullYear() - birth.getFullYear()
  const m = targetDate.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && targetDate.getDate() < birth.getDate())) age--
  return age
}

export default function PerformanceDossierPage() {
  const params  = useParams()
  const atletId = Number(params.atlet_id)
  const slug    = String(params.cabor_slug)
  
  const [atlet,     setAtlet]     = useState<AtletDetail | null>(null)
  const [baseline,  setBaseline]  = useState<BaselineEvent[]>([])
  const [fitData,   setFitData]   = useState<FitnessRecord[]>([])
  const [riwayat,   setRiwayat]   = useState<RiwayatRecord[]>([])
  const [allCaborNames, setAllCaborNames] = useState<string[]>([])
  const [loading,   setLoading]   = useState(true)
  
  const [showInputForm, setShowInputForm] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')
  
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  
  // Initial load
  const loadData = async () => {
    if (!atletId) return
    
    const [atletRes, blRes, fitRes, rwRes, cabornamesRes] = await Promise.all([
      sb.from('atlet')
        .select('*, cabor:cabor_id(id,nama,min_umur,avg_umur,max_umur)')
        .eq('id', atletId)
        .eq('kontingen_id', KONTINGEN_ID)
        .single(),
      sb.from('atlet_baseline_performance').select('*').eq('atlet_id', atletId).order('event_name'),
      sb.from('atlet_tes_fisik')
        .select('tahap,kesimpulan_persen,kesimpulan_kategori,bmi,berat_badan,tinggi_badan,tanggal_tes,status_tes')
        .eq('atlet_id', atletId).eq('status_tes', 'Hadir').order('tahap'),
      sb.from('riwayat_prestasi').select('*').eq('atlet_id', atletId).order('tahun', { ascending: false }),
      sb.from('atlet').select('cabor_nama_raw').eq('kontingen_id', KONTINGEN_ID),
    ])
    
    if (atletRes.data) setAtlet(atletRes.data as AtletDetail)
    if (blRes.data)    setBaseline(blRes.data as BaselineEvent[])
    if (fitRes.data)   setFitData(fitRes.data as FitnessRecord[])
    if (rwRes.data)    setRiwayat(rwRes.data as RiwayatRecord[])
    if (cabornamesRes.data) {
      const names = Array.from(new Set((cabornamesRes.data as any[]).map(r => r.cabor_nama_raw).filter(Boolean))) as string[]
      setAllCaborNames(names)
    }
    
    setLoading(false)
  }
  
  useEffect(() => { void loadData() }, [atletId])
  
  // Scroll spy
  useEffect(() => {
    if (loading) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )
    SECTIONS.forEach(s => {
      const el = sectionRefs.current[s.id]
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [loading])
  
  // Validate slug matches atlet cabor
  const caborNamaFromSlug = useMemo(() => 
    allCaborNames.length > 0 ? slugToCaborName(slug, allCaborNames) : null,
    [slug, allCaborNames]
  )
  
  // Derived: aggregate riwayat stats
  const riwayatStats = useMemo(() => {
    const validRecords = riwayat.filter(r => r.submission_status !== 'rejected')
    const realVerified = riwayat.filter(r => !r.is_demo && r.submission_status === 'verified')
    
    return {
      total:      validRecords.length,
      verified:   realVerified.length,
      demo:       riwayat.filter(r => r.is_demo).length,
      pending:    riwayat.filter(r => r.submission_status === 'pending').length,
      emas:       realVerified.filter(r => r.hasil === 'Emas').length,
      perak:      realVerified.filter(r => r.hasil === 'Perak').length,
      perunggu:   realVerified.filter(r => r.hasil === 'Perunggu').length,
      validRecords,
      realVerified,
    }
  }, [riwayat])
  
  const totalMedal = riwayatStats.emas + riwayatStats.perak + riwayatStats.perunggu
  const topLevel   = riwayatStats.realVerified.reduce<string | null>((top, r) => {
    if (!top) return r.level_event
    return (LEVEL_RANK[r.level_event] || 0) > (LEVEL_RANK[top] || 0) ? r.level_event : top
  }, null)
  
  // Level breakdown
  const levelCounts = useMemo(() => {
    const map: Record<string, number> = {}
    riwayatStats.realVerified.forEach(r => {
      map[r.level_event] = (map[r.level_event] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => (LEVEL_RANK[b[0]] || 0) - (LEVEL_RANK[a[0]] || 0))
  }, [riwayatStats.realVerified])
  
  // Baseline aggregate
  const baselineGaps = baseline.filter(b => b.gap_percentage !== null).map(b => Math.abs(b.gap_percentage!))
  const avgGap   = baselineGaps.length > 0 ? baselineGaps.reduce((s, g) => s + g, 0) / baselineGaps.length : null
  
  // Latest fitness
  const latestFit = fitData.length > 0 ? fitData[fitData.length - 1] : null
  
  // Combined readiness input
  const readinessInput: ReadinessInput = {
    fitnessPersen:  latestFit?.kesimpulan_persen ?? null,
    avgGap,
    topLevel,
    totalMedals:    totalMedal,
    emasCount:      riwayatStats.emas,
    perakCount:     riwayatStats.perak,
    perungguCount:  riwayatStats.perunggu,
  }
  
  const readinessResult = calculateReadiness(readinessInput)
  const tierNum = readinessResult.tier === 'unggulan' ? 1
                : readinessResult.tier === 'potensial' ? 2
                : readinessResult.tier === 'developing' ? 3
                : readinessResult.tier === 'concern' ? 4
                : null
  const tierColor = tierNum === 1 ? '#10b981' : tierNum === 2 ? '#3b82f6' : tierNum === 3 ? '#f59e0b' : '#ef4444'

  const PORPROV_DATE = new Date('2026-11-07')
  const age = atlet ? ageAt(atlet.tgl_lahir, PORPROV_DATE) : null
  const accent = atlet ? getCaborAccent(atlet.cabor?.nama ?? atlet.cabor_nama_raw) : '#38bdf8'
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020a14' }}>
      <div className="text-center">
        <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: `${accent}20`, borderTopColor: accent }}/>
        <div className="text-xs text-slate-500">Memuat dossier atlet...</div>
      </div>
    </div>
  )
  
  if (!atlet) return (
    <div className="min-h-screen p-8" style={{ background: '#020a14' }}>
      <div className="max-w-3xl mx-auto text-center py-20">
        <AlertCircle size={40} className="mx-auto mb-3 text-slate-700"/>
        <h2 className="text-lg font-bold text-slate-300 mb-2">Atlet tidak ditemukan</h2>
        <p className="text-sm text-slate-500 mb-4">ID: <code className="font-mono">{atletId}</code></p>
        <Link href="/konida/performance/kabbandung"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-sky-400 bg-sky-500/10 border border-sky-500/30">
          <ArrowLeft size={14}/> Kembali ke landing
        </Link>
      </div>
    </div>
  )
  
  const Icon = getCaborIcon(atlet.cabor?.nama ?? atlet.cabor_nama_raw)
  const isLokal = atlet.kode_asal_daerah?.startsWith('3204') ?? false
  
  return (
    <div className="min-h-screen text-zinc-300 font-sans"
      style={{ background: 'linear-gradient(135deg,#020a14 0%,#020c18 100%)' }}>
      
      {/* Sticky nav */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ background: 'rgba(2,10,20,0.92)', borderColor: `${accent}15` }}>
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/konida/performance/kabbandung/${slug}`}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
              <ArrowLeft size={16} className="text-slate-400"/>
            </Link>
            <Icon size={18} style={{ color: accent }}/>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{atlet.nama_lengkap}</div>
              <div className="text-[10px] text-slate-500">{atlet.cabor?.nama ?? atlet.cabor_nama_raw}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-wrap">
            {SECTIONS.map(s => {
              const active = activeSection === s.id
              return (
                <a key={s.id} href={`#${s.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    background: active ? `${accent}18` : 'transparent',
                    color:      active ? accent : '#64748b',
                    border:     active ? `1px solid ${accent}30` : '1px solid transparent',
                  }}>
                  <s.icon size={11}/>
                  <span className="hidden md:inline">{s.label}</span>
                </a>
              )
            })}
          </div>
        </div>
      </div>
      
      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        
        {/* Breadcrumb */}
        <div className="text-[11px] text-slate-500">
          <Link href="/konida/performance/kabbandung" className="hover:text-slate-300">KAB. BANDUNG / Performance</Link>
          <span className="text-slate-700"> / </span>
          <Link href={`/konida/performance/kabbandung/${slug}`} className="hover:text-slate-300" style={{ color: accent }}>
            {atlet.cabor?.nama ?? atlet.cabor_nama_raw}
          </Link>
          <span className="text-slate-700"> / </span>
          <span className="text-slate-300">{atlet.nama_lengkap}</span>
        </div>
        
        {/* ═══ SECTION 1: PROFILE ═══ */}
        <section id="profile" ref={el => { sectionRefs.current['profile'] = el }} className="scroll-mt-20">
          <div className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${accent}10, rgba(15,23,42,0.7))`,
              border: `1px solid ${accent}25`,
            }}>
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}/>
            
            <div className="relative flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${accent}20`, border: `2px solid ${accent}40` }}>
                  <Icon size={32} style={{ color: accent }}/>
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h1 className="text-2xl font-black text-white">{atlet.nama_lengkap}</h1>
                    {atlet.status_registrasi === 'Verified' && (
                      <CheckCircle2 size={18} style={{ color: '#22c55e' }}/>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: atlet.gender === 'L' ? 'rgba(56,189,248,0.15)' : 'rgba(244,114,182,0.15)',
                        color:      atlet.gender === 'L' ? '#38bdf8' : '#f472b6',
                        border:    `1px solid ${atlet.gender === 'L' ? 'rgba(56,189,248,0.3)' : 'rgba(244,114,182,0.3)'}`,
                      }}>
                      {atlet.gender === 'L' ? 'Putra' : 'Putri'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {age ?? '?'} thn
                    </span>
                    {isLokal ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                        Lokal
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                        Luar Daerah
                      </span>
                    )}
                    {atlet.nomor_koni && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full text-slate-500 border border-slate-700">
                        KONI #{atlet.nomor_koni}
                      </span>
                    )}
                    {topLevel === 'Internasional' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-black"
                        style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)', color: '#000' }}>
                        ⭐ ELITE
                      </span>
                    )}
                  </div>
                  
                  {/* Quick stats inline */}
                  <div className="flex items-center gap-4 flex-wrap text-[11px]">
                    {avgGap !== null && (
                      <div>
                        <span className="text-slate-500">Avg gap baseline: </span>
                        <span className="font-bold tabular-nums" style={{ 
                          color: avgGap <= 3 ? '#10b981' : avgGap <= 7 ? '#06b6d4' : avgGap <= 12 ? '#f59e0b' : '#ef4444'
                        }}>{avgGap.toFixed(1)}%</span>
                      </div>
                    )}
                    {latestFit?.kesimpulan_persen !== null && latestFit?.kesimpulan_persen !== undefined && (
                      <div>
                        <span className="text-slate-500">Tes fisik: </span>
                        <span className="font-bold tabular-nums" style={{ 
                          color: latestFit.kesimpulan_persen >= 75 ? '#22c55e' : latestFit.kesimpulan_persen >= 60 ? '#f59e0b' : '#ef4444'
                        }}>{latestFit.kesimpulan_persen}%</span>
                      </div>
                    )}
                    {totalMedal > 0 && (
                      <div>
                        <span className="text-slate-500">Medali: </span>
                        <span className="font-bold text-white tabular-nums">{totalMedal}</span>
                        <span className="text-slate-600 ml-1">({riwayatStats.emas}/{riwayatStats.perak}/{riwayatStats.perunggu})</span>
                      </div>
                    )}
                    {topLevel && (
                      <div>
                        <span className="text-slate-500">Top: </span>
                        <span className="font-bold" style={{ color: accent }}>{topLevel}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 shrink-0">
                {tierNum && (
                  <span className="px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest"
                    style={{ background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}35` }}>
                    TIER {tierNum}
                  </span>
                )}
                <button onClick={() => setShowInputForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
                  <Plus size={14}/> Tambah Prestasi
                </button>
              </div>
            </div>

            {/* KBAAS Fase 1.2 — banner prestasi nasional terbaru (≤180 hari) */}
            <div className="mt-4"><AchievementBanner atletId={atlet.id} variant="full" /></div>
          </div>
        </section>
        
        {/* ═══ SECTION 2: PERFORMANCE BASELINE ═══ */}
        <section id="performance" ref={el => { sectionRefs.current['performance'] = el }} className="scroll-mt-20">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <BarChart3 size={16} style={{ color: accent }}/>
            Performance Baseline
            {baseline.length > 0 && (
              <span className="text-[10px] font-normal text-slate-500 ml-1">
                {baseline.length} event · PORPROV 2022
              </span>
            )}
          </h2>
          <PerformanceBaselineSection events={baseline} accent={accent}/>

          {/* KBAAS Fase 2.6 — projeksi antar-nomor sefamili dari hasil kejurnas */}
          {baseline[0]?.event_name && (
            <div className="mt-4">
              <MultiDisciplineProjection atletId={atletId} targetNomor={baseline[0].event_name} />
            </div>
          )}

          {/* Progression test — hanya untuk Angkat Berat */}
          {(atlet.cabor?.nama ?? atlet.cabor_nama_raw) === 'Angkat Berat' && (
            <div className="mt-4">
              <LiftProgressionCard atletId={atletId} accent={accent}/>
            </div>
          )}
        </section>
        
        {/* ═══ SECTION 3: CAREER ═══ */}
        <section id="career" ref={el => { sectionRefs.current['career'] = el }} className="scroll-mt-20">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Trophy size={16} style={{ color: accent }}/>
            Riwayat Karier
            {riwayatStats.total > 0 && (
              <span className="text-[10px] font-normal text-slate-500 ml-1">
                {riwayatStats.verified}/{riwayatStats.total} terverifikasi
              </span>
            )}
          </h2>
          
          {/* Aggregate medal cards */}
          {totalMedal > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
                  <div className="text-3xl mb-1">🥇</div>
                  <div className="text-3xl font-black tabular-nums" style={{ color: '#fbbf24' }}>{riwayatStats.emas}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Emas</div>
                </div>
                <div className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(203,213,225,0.06)', border: '1px solid rgba(203,213,225,0.20)' }}>
                  <div className="text-3xl mb-1">🥈</div>
                  <div className="text-3xl font-black tabular-nums text-slate-200">{riwayatStats.perak}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Perak</div>
                </div>
                <div className="rounded-2xl p-4 text-center"
                  style={{ background: 'rgba(205,127,50,0.08)', border: '1px solid rgba(205,127,50,0.25)' }}>
                  <div className="text-3xl mb-1">🥉</div>
                  <div className="text-3xl font-black tabular-nums" style={{ color: '#cd7f32' }}>{riwayatStats.perunggu}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Perunggu</div>
                </div>
              </div>
              
              {/* Level breakdown */}
              {levelCounts.length > 0 && (
                <div className="rounded-2xl p-4 bg-slate-900/70 border border-slate-800 mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Distribusi per Level</div>
                  <div className="space-y-2">
                    {levelCounts.map(([level, count]) => (
                      <div key={level} className="flex items-center gap-3">
                        <span className="text-xs text-slate-300 w-32 shrink-0">{level}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${(count / totalMedal) * 100}%`,
                              background: level === 'Internasional' ? '#fbbf24'
                                : level === 'Nasional' ? '#a855f7'
                                : level === 'Provinsi' ? accent
                                : level === 'Kabupaten' ? '#06b6d4'
                                : '#64748b',
                            }}/>
                        </div>
                        <span className="text-xs font-bold text-white tabular-nums w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl p-6 bg-slate-900/40 border border-slate-800 text-center mb-4">
              <Trophy size={36} className="mx-auto mb-3 text-slate-700"/>
              <div className="text-sm text-slate-400 mb-1">Belum ada prestasi terverifikasi</div>
              <div className="text-[11px] text-slate-600 mb-3">Tambah prestasi via tombol di header atau atlet input via Portal</div>
              <button onClick={() => setShowInputForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
                <Plus size={13}/> Tambah Prestasi
              </button>
            </div>
          )}
          
          {/* Career timeline */}
          {riwayatStats.realVerified.length > 0 && (
            <div className="mb-4">
              <CareerTimeline events={riwayatStats.realVerified as any[]} accent={accent}/>
            </div>
          )}
          
          {/* All records list */}
          {riwayatStats.validRecords.length > 0 && (
            <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Daftar Lengkap Record</h3>
                <span className="text-[10px] text-slate-500">{riwayatStats.validRecords.length} record</span>
              </div>
              
              <div className="space-y-2">
                {riwayatStats.validRecords.map(r => (
                  <RecordCard key={r.id} record={r} accent={accent}/>
                ))}
              </div>
            </div>
          )}
        </section>
        
        {/* ═══ SECTION 4: KESIAPAN ═══ */}
        <section id="kesiapan" ref={el => { sectionRefs.current['kesiapan'] = el }} className="scroll-mt-20">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Activity size={16} style={{ color: accent }}/>
            Analisa Kesiapan PORPROV
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PerformanceQuadrantCard input={readinessInput} accent={accent}/>
            <PerformanceFitnessCard fitData={fitData} accent={accent}/>
            <PerformanceAgeCard
              age={age}
              caborNama={atlet.cabor?.nama ?? atlet.cabor_nama_raw}
              caborInfo={atlet.cabor}
              accent={accent}/>
          </div>
        </section>
        
        {/* ═══ SECTION 5: AI BRIEF ═══ */}
        <section id="brief" ref={el => { sectionRefs.current['brief'] = el }} className="scroll-mt-20 pb-12">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles size={16} style={{ color: accent }}/>
            AI Smart Brief
          </h2>
          <AthleteSmartBrief atletId={atletId} accent={accent} autoLoad={false}/>
          <div className="mt-4">
            <AthleteActionItems
              atletId={atletId}
              atletNama={atlet.nama_lengkap}
              cabor={atlet.cabor?.nama ?? atlet.cabor_nama_raw}
              baseline={baseline}
              accent={accent}
            />
          </div>
        </section>
      </main>
      
      {/* Modal: Input prestasi */}
      {showInputForm && (
        <PrestasiInputForm
          atletId={atletId}
          atletNama={atlet.nama_lengkap}
          caborNama={atlet.cabor?.nama ?? atlet.cabor_nama_raw}
          accent={accent}
          submittedBy="admin"
          onClose={() => setShowInputForm(false)}
          onSuccess={() => {
            setShowInputForm(false)
            void loadData()
          }}/>
      )}
    </div>
  )
}

// ── Inline component: RecordCard ──
function RecordCard({ record, accent }: { record: RiwayatRecord; accent: string }) {
  const isVerified = !record.is_demo && record.submission_status === 'verified'
  const isPending  = record.submission_status === 'pending'
  const isDemo     = record.is_demo
  
  const hasilColor = record.hasil === 'Emas' ? '#fbbf24'
    : record.hasil === 'Perak' ? '#cbd5e1'
    : record.hasil === 'Perunggu' ? '#cd7f32'
    : '#64748b'
  const hasilEmoji = record.hasil === 'Emas' ? '🥇'
    : record.hasil === 'Perak' ? '🥈'
    : record.hasil === 'Perunggu' ? '🥉'
    : record.ranking ? `#${record.ranking}` : '·'
  
  return (
    <div className="rounded-xl p-3 flex items-center gap-3 flex-wrap"
      style={{
        background: isPending ? 'rgba(59,130,246,0.04)' : isDemo ? 'rgba(251,191,36,0.04)' : 'rgba(15,23,42,0.5)',
        border: isPending ? '1px solid rgba(59,130,246,0.18)'
              : isDemo ? '1px dashed rgba(251,191,36,0.20)'
              : `1px solid rgba(71,85,105,0.30)`,
      }}>
      <div className="text-2xl shrink-0" style={{ color: hasilColor }}>{hasilEmoji}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white font-medium truncate">{record.event}</div>
        <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap mt-0.5">
          <span className="tabular-nums">{record.tahun}</span>
          <span>·</span>
          <span>{record.nomor_tanding}</span>
          {record.lokasi && <><span>·</span><span>{record.lokasi}</span></>}
          {record.catatan_waktu && <><span>·</span><span className="font-mono text-slate-400">{record.catatan_waktu}</span></>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}>
          {record.level_event}
        </span>
        {isVerified && (
          <CheckCircle2 size={13} style={{ color: '#22c55e' }}/>
        )}
        {isPending && (
          <Clock size={13} style={{ color: '#60a5fa' }}/>
        )}
        {isDemo && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full text-amber-300 border border-amber-500/30">demo</span>
        )}
        {record.bukti_url && (
          <a href={record.bukti_url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white">
            <FileText size={13}/>
          </a>
        )}
      </div>
    </div>
  )
}
