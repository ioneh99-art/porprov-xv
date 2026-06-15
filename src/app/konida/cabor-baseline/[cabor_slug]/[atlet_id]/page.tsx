'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Trophy, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { caborBySlug } from '@/lib/baseline/cabor-map'
import { gapTier, GAP_TIER_COLOR } from '@/lib/baseline/medal-predictor'
import { parseTimeToSeconds } from '@/lib/baseline/time-parser'
import AthleteSmartBrief from '@/components/baseline/AthleteSmartBrief'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CABOR_ACCENT: Record<number, string> = { 10: '#f97316', 7: '#06b6d4' }

// Peak age window per sport type (rough heuristic)
const PEAK_WINDOW: Record<number, { min: number; max: number; label: string }> = {
  10: { min: 21, max: 30, label: 'Atletik' },
  7:  { min: 16, max: 24, label: 'Renang'  },
}

const QUADRANT_META = {
  UNGGULAN:  { label: 'Unggulan',  desc: 'Fisik prima + dekat rekor',         color: '#22c55e', bg: '#22c55e14' },
  POTENSIAL: { label: 'Potensial', desc: 'Fisik prima, perlu latihan teknik',  color: '#3b82f6', bg: '#3b82f614' },
  AT_RISK:   { label: 'At Risk',   desc: 'Dekat rekor, tapi fisik belum prima',color: '#f59e0b', bg: '#f59e0b14' },
  CONCERN:   { label: 'Perhatian', desc: 'Fisik & teknik perlu intervensi',    color: '#ef4444', bg: '#ef444414' },
  UNKNOWN:   { label: '—',         desc: 'Data tidak cukup untuk kuadran',     color: '#6b7280', bg: '#6b728014' },
}

const initials = (n: string) => (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

function ageAt(tglLahir: string | null, targetDate: Date): number | null {
  if (!tglLahir) return null
  const birth = new Date(tglLahir)
  let age = targetDate.getFullYear() - birth.getFullYear()
  const m = targetDate.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && targetDate.getDate() < birth.getDate())) age--
  return age
}

export default function BaselineAtletDetailPage() {
  const params  = useParams()
  const slug    = String(params.cabor_slug)
  const atletId = Number(params.atlet_id)
  const meta    = caborBySlug(slug)
  const accent  = meta ? (CABOR_ACCENT[meta.id] ?? '#38bdf8') : '#38bdf8'

  const [atlet, setAtlet]       = useState<any>(null)
  const [perf, setPerf]         = useState<any[]>([])
  const [fitData, setFitData]   = useState<any[]>([])
  const [caborInfo, setCaborInfo] = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [showBrief, setShowBrief] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [{ data: a }, { data: p }, { data: tf }, { data: ci }] = await Promise.all([
        sb.from('atlet')
          .select('id,nama_lengkap,gender,status_verifikasi,status_registrasi,tgl_lahir,kode_asal_daerah,kontingen:kontingen_id(nama),cabor:cabor_id(nama)')
          .eq('id', atletId).single(),
        sb.from('atlet_baseline_performance').select('*').eq('atlet_id', atletId).order('event_name'),
        sb.from('atlet_tes_fisik')
          .select('tahap,kesimpulan_persen,kesimpulan_kategori,bmi,berat_badan,tinggi_badan,tanggal_tes,status_tes')
          .eq('atlet_id', atletId).order('tahap'),
        meta ? sb.from('cabang_olahraga').select('avg_umur,min_umur,max_umur,nama').eq('id', meta.id).single() : Promise.resolve({ data: null }),
      ])
      setAtlet(a); setPerf(p ?? [])
      setFitData((tf ?? []).filter((f: any) => f.status_tes === 'Hadir'))
      setCaborInfo(ci)
      setLoading(false)
    })()
  }, [atletId])

  /* ── Derived indicators ── */
  const PORPROV_DATE = new Date('2026-11-07')
  const age          = atlet ? ageAt(atlet.tgl_lahir, PORPROV_DATE) : null
  const peakWindow   = meta ? PEAK_WINDOW[meta.id] : null
  const ageStatus    = age && peakWindow
    ? age < peakWindow.min ? 'berkembang'
    : age > peakWindow.max ? 'senior'
    : 'prime'
    : null

  // Fitness trend per tahap
  const fitPerTahap = [1, 2, 3].map(t => fitData.find(f => f.tahap === t) ?? null)
  const latestFit   = fitData.length ? fitData[fitData.length - 1] : null
  const fitTrend    = fitPerTahap.filter(Boolean).length >= 2
    ? (() => {
        const vals = fitPerTahap.filter(Boolean).map((f: any) => f.kesimpulan_persen)
        const delta = vals[vals.length - 1] - vals[0]
        return delta > 3 ? 'naik' : delta < -3 ? 'turun' : 'stabil'
      })()
    : null

  // Gap average & consistency
  const validGaps  = perf.filter(p => p.gap_percentage !== null).map(p => Number(p.gap_percentage))
  const avgGap     = validGaps.length ? validGaps.reduce((s, g) => s + g, 0) / validGaps.length : null
  const gapVariance = validGaps.length > 1
    ? Math.sqrt(validGaps.reduce((s, g) => s + Math.pow(g - avgGap!, 2), 0) / validGaps.length)
    : null

  // Quadrant
  const isFit   = latestFit && latestFit.kesimpulan_persen >= 70
  const isClose = avgGap !== null && avgGap <= 7
  const quadrant: keyof typeof QUADRANT_META =
    latestFit === null && avgGap === null ? 'UNKNOWN'
    : isFit  && isClose  ? 'UNGGULAN'
    : isFit  && !isClose ? 'POTENSIAL'
    : !isFit && isClose  ? 'AT_RISK'
    : 'CONCERN'
  const qMeta = QUADRANT_META[quadrant]

  // Medal probability best
  const best = perf.reduce((acc, p) => {
    const mp = p.medal_probability || {}
    return { emas: Math.max(acc.emas, mp.emas || 0), perak: Math.max(acc.perak, mp.perak || 0), perunggu: Math.max(acc.perunggu, mp.perunggu || 0) }
  }, { emas: 0, perak: 0, perunggu: 0 })
  const bestKey = (['emas','perak','perunggu'] as const).reduce((a, k) => best[k] > best[a] ? k : a, 'perunggu' as 'emas'|'perak'|'perunggu')
  const hasProb = best.emas > 0 || best.perak > 0 || best.perunggu > 0

  // Time bars
  const perfWithSec = perf.map(p => ({
    ...p, waktuSec: parseTimeToSeconds(p.waktu_terbaik), rekorSec: parseTimeToSeconds(p.rekor_porprov),
  }))
  const maxSec = Math.max(...perfWithSec.map(p => Math.max(p.waktuSec ?? 0, p.rekorSec ?? 0)), 1)

  // isLokal
  const isLokal = atlet?.kode_asal_daerah?.startsWith('3204') ?? null

  if (loading) return <div className="py-20 text-center text-slate-600 text-sm">Memuat profil atlet…</div>
  if (!atlet)  return <div className="text-slate-400 p-6">Atlet tidak ditemukan.</div>

  const statusColor = atlet.status_verifikasi === 'Verified'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : 'text-amber-400 bg-amber-500/10 border-amber-500/20'

  const TrendIcon = fitTrend === 'naik' ? TrendingUp : fitTrend === 'turun' ? TrendingDown : Minus
  const trendColor = fitTrend === 'naik' ? '#22c55e' : fitTrend === 'turun' ? '#ef4444' : '#94a3b8'

  return (
    <div className="text-slate-200 max-w-4xl">
      {/* Breadcrumb */}
      <div className="text-xs text-slate-500 mb-2">
        <Link href="/konida/cabor-baseline" className="hover:text-slate-300">Baseline</Link>
        <span className="text-slate-700"> / </span>
        <Link href={`/konida/cabor-baseline/${slug}`} className="hover:text-slate-300">{meta?.name ?? slug}</Link>
        <span className="text-slate-700"> / </span>
        <span style={{ color: accent }}>{atlet.nama_lengkap}</span>
      </div>
      <Link href={`/konida/cabor-baseline/${slug}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4">
        <ArrowLeft size={12} /> Kembali ke roster
      </Link>

      {/* ── Profile header ── */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden border border-slate-800"
        style={{ background: `linear-gradient(135deg, ${accent}12 0%, rgba(15,23,42,0.9) 60%)` }}>
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, transform: 'translate(-30%,-30%)' }}/>
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0"
            style={{ background: `${accent}28`, border: `2px solid ${accent}60` }}>
            {initials(atlet.nama_lengkap)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-white">{atlet.nama_lengkap}</h1>
            <div className="text-xs text-slate-400 mt-0.5">
              {atlet.gender === 'L' ? 'Putra' : 'Putri'} · {atlet.cabor?.nama ?? meta?.name} · {atlet.kontingen?.nama}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor}`}>{atlet.status_verifikasi}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold"
                style={{ background: qMeta.bg, color: qMeta.color, borderColor: `${qMeta.color}40` }}>
                {qMeta.label}
              </span>
              {age && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">{age} thn</span>}
              {isLokal !== null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700"
                  style={{ color: isLokal ? '#22c55e' : '#f97316' }}>
                  {isLokal ? '📍 Lokal' : '🔀 Non-lokal'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 1: Performance + Prediksi ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Performance history */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">
            Riwayat Performa <span className="text-[11px] font-normal text-slate-500">(Baseline 2022)</span>
          </h3>
          <div className="space-y-3">
            {perfWithSec.map(p => {
              const color  = GAP_TIER_COLOR[gapTier(p.gap_percentage)]
              const hasBar = p.waktuSec !== null && p.rekorSec !== null
              const wPct   = hasBar ? (p.waktuSec! / maxSec) * 100 : 0
              const rPct   = hasBar ? (p.rekorSec! / maxSec) * 100 : 0
              return (
                <div key={p.id} className="rounded-xl bg-slate-800/50 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-white font-medium">{p.event_name}{p.is_relay ? ' 🤝' : ''}</span>
                    {p.gap_percentage !== null && p.gap_percentage !== undefined
                      ? <span className="text-xs font-bold tabular-nums shrink-0" style={{ color }}>gap {p.gap_percentage}%</span>
                      : <span className="text-[10px] text-slate-600">no rekor</span>}
                  </div>
                  {hasBar && (
                    <div className="space-y-1">
                      <div>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-slate-400">⏱ Atlet</span>
                          <span className="font-mono text-slate-300">{p.waktu_terbaik}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width:`${wPct}%`, background:color, opacity:0.8 }}/>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-slate-500">🏁 Rekor</span>
                          <span className="font-mono text-slate-500">{p.rekor_porprov}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width:`${rPct}%`, background:'#22d3ee', opacity:0.4 }}/>
                        </div>
                      </div>
                    </div>
                  )}
                  {!hasBar && (
                    <div className="flex gap-4 text-[11px] text-slate-500">
                      <span>⏱ {p.waktu_terbaik || 'NT'}</span>
                      {p.rekor_porprov && <span>🏁 {p.rekor_porprov}</span>}
                    </div>
                  )}
                  <div className="flex gap-3 flex-wrap text-[10px]">
                    {p.target_medali && p.target_medali !== '-' && <span style={{ color: accent }}>🎯 {p.target_medali}</span>}
                    {p.pesaing && <span className="text-slate-600">Pesaing: {p.pesaing}</span>}
                  </div>
                </div>
              )
            })}
            {perf.length === 0 && <div className="text-xs text-slate-600">Belum ada data performa.</div>}
          </div>

          {/* Consistency indicator */}
          {gapVariance !== null && validGaps.length >= 2 && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Konsistensi {validGaps.length} event</span>
              <span className="font-bold" style={{ color: gapVariance < 3 ? '#22c55e' : gapVariance < 7 ? '#f59e0b' : '#ef4444' }}>
                {gapVariance < 3 ? '✓ Konsisten' : gapVariance < 7 ? '~ Cukup' : '⚠ Bervariasi'}
                <span className="text-slate-600 font-normal ml-1">(σ {gapVariance.toFixed(1)})</span>
              </span>
            </div>
          )}
        </div>

        {/* Medal probability */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Trophy size={15} style={{ color: accent }}/> Prediksi Medali
          </h3>
          <p className="text-[10px] text-slate-600 mb-4">Estimasi dari gap vs rekor PORPROV 2022</p>
          {hasProb ? (
            <>
              <div className="space-y-3 mb-4">
                {([['emas','🥇 Emas','#fbbf24'],['perak','🥈 Perak','#cbd5e1'],['perunggu','🥉 Perunggu','#cd7f32']] as const).map(([k,l,c]) => (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-400">{l}</span>
                      <span className="text-sm font-black tabular-nums" style={{ color:c }}>{best[k]}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width:`${best[k]}%`, background:c, boxShadow:bestKey===k?`0 0 8px ${c}60`:'none' }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-slate-800/50 px-3 py-2.5 text-[11px] text-slate-400">
                Peluang tertinggi: <span className="font-black" style={{ color:accent }}>{bestKey.charAt(0).toUpperCase()+bestKey.slice(1)}</span>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-xs text-slate-500">Tidak ada data waktu/rekor untuk estimasi.</div>
              <div className="text-[10px] text-slate-600 mt-1">Lihat Smart Brief untuk analisa kualitatif.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Indikator Baru ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Kuadran Kesiapan */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} style={{ color: accent }}/>
            <h3 className="text-sm font-bold text-white">Kuadran Kesiapan</h3>
          </div>
          <div className="rounded-xl p-4 text-center mb-3" style={{ background: qMeta.bg, border: `1px solid ${qMeta.color}30` }}>
            <div className="text-2xl font-black" style={{ color: qMeta.color }}>{qMeta.label}</div>
            <div className="text-[10px] text-slate-500 mt-1">{qMeta.desc}</div>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Fisik (tes fisik)</span>
              <span className="font-bold" style={{ color: latestFit ? (latestFit.kesimpulan_persen >= 70 ? '#22c55e' : '#f59e0b') : '#6b7280' }}>
                {latestFit ? `${latestFit.kesimpulan_persen}% — ${latestFit.kesimpulan_kategori ?? ''}` : 'Belum ada data'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Teknik (avg gap)</span>
              <span className="font-bold" style={{ color: avgGap !== null ? (avgGap <= 7 ? '#22c55e' : avgGap <= 12 ? '#f59e0b' : '#ef4444') : '#6b7280' }}>
                {avgGap !== null ? `${avgGap.toFixed(1)}% dari rekor` : 'Belum ada data'}
              </span>
            </div>
          </div>
        </div>

        {/* Tren Tes Fisik */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendIcon size={14} style={{ color: trendColor }}/>
              <h3 className="text-sm font-bold text-white">Tren Tes Fisik</h3>
            </div>
            {fitTrend && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: trendColor, background: `${trendColor}15`, border: `1px solid ${trendColor}30` }}>
                {fitTrend === 'naik' ? '↑ Naik' : fitTrend === 'turun' ? '↓ Turun' : '→ Stabil'}
              </span>
            )}
          </div>
          {fitPerTahap.some(Boolean) ? (
            <div className="space-y-3">
              {fitPerTahap.map((f, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Tahap {i + 1}</span>
                    <span className="font-bold" style={{ color: f ? (f.kesimpulan_persen >= 80 ? '#22c55e' : f.kesimpulan_persen >= 60 ? '#f59e0b' : '#ef4444') : '#374151' }}>
                      {f ? `${f.kesimpulan_persen}%` : '—'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    {f && (
                      <div className="h-full rounded-full transition-all"
                        style={{ width:`${f.kesimpulan_persen}%`, background: f.kesimpulan_persen >= 80 ? '#22c55e' : f.kesimpulan_persen >= 60 ? '#f59e0b' : '#ef4444' }}/>
                    )}
                  </div>
                </div>
              ))}
              {latestFit?.bmi && (
                <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                  <span className="text-slate-500">BMI</span>
                  <span className="font-bold text-slate-300">{latestFit.bmi} · {latestFit.berat_badan}kg / {latestFit.tinggi_badan}cm</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-[11px] text-slate-600">Belum ada data tes fisik untuk atlet ini.</div>
          )}
        </div>

        {/* Faktor Usia */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: accent }}/>
            <h3 className="text-sm font-bold text-white">Faktor Usia</h3>
          </div>
          {age ? (
            <>
              <div className="text-center mb-4">
                <div className="text-4xl font-black text-white">{age}</div>
                <div className="text-[11px] text-slate-500 mt-1">tahun saat PORPROV XV</div>
                <div className="text-[10px] text-slate-600">Nov 2026</div>
              </div>
              {peakWindow && (
                <>
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>{peakWindow.min} thn</span>
                      <span className="text-slate-400 font-semibold">Window Puncak {peakWindow.label}</span>
                      <span>{peakWindow.max} thn</span>
                    </div>
                    {/* Visual window bar */}
                    <div className="relative h-3 rounded-full bg-slate-800 overflow-visible">
                      {/* Peak window highlight */}
                      <div className="absolute h-full rounded-full"
                        style={{
                          left: `${Math.max(0, ((peakWindow.min - 14) / (40 - 14)) * 100)}%`,
                          width: `${((peakWindow.max - peakWindow.min) / (40 - 14)) * 100}%`,
                          background: `${accent}30`, border: `1px solid ${accent}50`
                        }}/>
                      {/* Athlete position */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white"
                        style={{
                          left: `${Math.min(95, Math.max(5, ((age - 14) / (40 - 14)) * 100))}%`,
                          transform: 'translate(-50%,-50%)',
                          background: ageStatus === 'prime' ? '#22c55e' : ageStatus === 'berkembang' ? '#3b82f6' : '#f59e0b'
                        }}/>
                    </div>
                  </div>
                  <div className="rounded-xl px-3 py-2 text-center mt-3"
                    style={{
                      background: ageStatus === 'prime' ? '#22c55e14' : ageStatus === 'berkembang' ? '#3b82f614' : '#f59e0b14',
                      border: `1px solid ${ageStatus === 'prime' ? '#22c55e30' : ageStatus === 'berkembang' ? '#3b82f630' : '#f59e0b30'}`
                    }}>
                    <div className="text-xs font-bold"
                      style={{ color: ageStatus === 'prime' ? '#22c55e' : ageStatus === 'berkembang' ? '#3b82f6' : '#f59e0b' }}>
                      {ageStatus === 'prime' ? '✓ Usia Puncak' : ageStatus === 'berkembang' ? '↗ Berkembang' : '↘ Melewati Puncak'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {ageStatus === 'prime' ? `Dalam window ${peakWindow.min}–${peakWindow.max} thn`
                        : ageStatus === 'berkembang' ? `Puncak dalam ${peakWindow.min - age} thn lagi`
                        : `${age - peakWindow.max} thn dari batas atas window`}
                    </div>
                  </div>
                </>
              )}
              {caborInfo?.avg_umur && (
                <div className="mt-3 flex justify-between text-[11px]">
                  <span className="text-slate-500">Rata-rata cabor</span>
                  <span className="text-slate-300 font-bold">{caborInfo.avg_umur} thn</span>
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center text-[11px] text-slate-600">Tanggal lahir tidak tersedia.</div>
          )}
        </div>
      </div>

      {/* ── AI Smart Brief ── */}
      {!showBrief ? (
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-white">AI Smart Brief</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Claude</span>
            </div>
            <p className="text-[11px] text-slate-500">Analisa naratif lengkap: fisik, teknik, usia, konsistensi, & rekomendasi latihan.</p>
          </div>
          <button onClick={() => setShowBrief(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
            style={{ background:`${accent}20`, color:accent, border:`1px solid ${accent}40` }}>
            ✨ Generate Brief
          </button>
        </div>
      ) : (
        <AthleteSmartBrief atletId={atletId} />
      )}
    </div>
  )
}
