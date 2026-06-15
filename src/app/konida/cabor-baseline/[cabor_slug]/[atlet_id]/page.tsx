'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Trophy } from 'lucide-react'
import { caborBySlug } from '@/lib/baseline/cabor-map'
import { gapTier, GAP_TIER_COLOR } from '@/lib/baseline/medal-predictor'
import { parseTimeToSeconds } from '@/lib/baseline/time-parser'
import AthleteSmartBrief from '@/components/baseline/AthleteSmartBrief'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CABOR_ACCENT: Record<number, string> = {
  10: '#f97316',
  7:  '#06b6d4',
}

const initials = (n: string) => (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

export default function BaselineAtletDetailPage() {
  const params  = useParams()
  const slug    = String(params.cabor_slug)
  const atletId = Number(params.atlet_id)
  const meta    = caborBySlug(slug)
  const accent  = meta ? (CABOR_ACCENT[meta.id] ?? '#38bdf8') : '#38bdf8'

  const [atlet, setAtlet]     = useState<any>(null)
  const [perf, setPerf]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showBrief, setShowBrief] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [{ data: a }, { data: p }] = await Promise.all([
        sb.from('atlet').select('id, nama_lengkap, gender, status_verifikasi, kontingen:kontingen_id(nama), cabor:cabor_id(nama)').eq('id', atletId).single(),
        sb.from('atlet_baseline_performance').select('*').eq('atlet_id', atletId).order('event_name'),
      ])
      setAtlet(a); setPerf(p ?? []); setLoading(false)
    })()
  }, [atletId])

  // Best medal probability across events
  const best = perf.reduce((acc, p) => {
    const mp = p.medal_probability || {}
    return {
      emas:     Math.max(acc.emas,     mp.emas     || 0),
      perak:    Math.max(acc.perak,    mp.perak    || 0),
      perunggu: Math.max(acc.perunggu, mp.perunggu || 0),
    }
  }, { emas: 0, perak: 0, perunggu: 0 })

  const bestKey = (['emas','perak','perunggu'] as const)
    .reduce((a, k) => best[k] > best[a] ? k : a, 'perunggu' as 'emas'|'perak'|'perunggu')

  const hasProb = best.emas > 0 || best.perak > 0 || best.perunggu > 0

  // Max seconds across all events (for bar chart normalization)
  const perfWithSec = perf.map(p => ({
    ...p,
    waktuSec: parseTimeToSeconds(p.waktu_terbaik),
    rekorSec: parseTimeToSeconds(p.rekor_porprov),
  }))
  const maxSec = Math.max(...perfWithSec.map(p => Math.max(p.waktuSec ?? 0, p.rekorSec ?? 0)), 1)

  if (loading) return <div className="py-20 text-center text-slate-600 text-sm">Memuat profil atlet…</div>
  if (!atlet)  return <div className="text-slate-400 p-6">Atlet tidak ditemukan.</div>

  const statusColor = atlet.status_verifikasi === 'Verified'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : atlet.status_verifikasi === 'Pending'
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-sky-400 bg-sky-500/10 border-sky-500/20'

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

      {/* Profile header — gradient per cabor */}
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden border border-slate-800"
        style={{ background: `linear-gradient(135deg, ${accent}12 0%, rgba(15,23,42,0.9) 60%)` }}>
        {/* Accent glow */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, transform: 'translate(-30%, -30%)' }} />
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
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor}`}>
                {atlet.status_verifikasi}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {perf.length} event baseline
              </span>
              {hasProb && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
                  Peluang terbaik: {bestKey}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Performance history with visual bar */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">Riwayat Performa <span className="text-[11px] font-normal text-slate-500">(Baseline 2022)</span></h3>
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

                  {/* Visual time comparison bars */}
                  {hasBar && (
                    <div className="space-y-1">
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-slate-400">⏱ Atlet</span>
                          <span className="font-mono text-slate-300">{p.waktu_terbaik}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${wPct}%`, background: color, opacity: 0.8 }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="text-slate-500">🏁 Rekor</span>
                          <span className="font-mono text-slate-500">{p.rekor_porprov}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${rPct}%`, background: '#22d3ee', opacity: 0.4 }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasBar && (
                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                      <span>⏱ {p.waktu_terbaik || 'NT'}</span>
                      {p.rekor_porprov && <span>🏁 rekor {p.rekor_porprov}</span>}
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap text-[10px]">
                    {p.target_medali && p.target_medali !== '-' &&
                      <span style={{ color: accent }}>🎯 {p.target_medali}</span>}
                    {p.pesaing &&
                      <span className="text-slate-600">Pesaing: {p.pesaing}</span>}
                  </div>
                </div>
              )
            })}
            {perf.length === 0 && <div className="text-xs text-slate-600">Belum ada data performa.</div>}
          </div>
        </div>

        {/* Medal probability */}
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Trophy size={15} style={{ color: accent }} /> Prediksi Medali
          </h3>
          <p className="text-[10px] text-slate-600 mb-4">Probabilitas terbaik lintas event (estimasi dari gap vs rekor)</p>

          {hasProb ? (
            <>
              <div className="space-y-3 mb-4">
                {([['emas','🥇 Emas','#fbbf24'],['perak','🥈 Perak','#cbd5e1'],['perunggu','🥉 Perunggu','#cd7f32']] as const).map(([k,l,c]) => (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-400">{l}</span>
                      <span className="text-sm font-black tabular-nums" style={{ color: c }}>{best[k]}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${best[k]}%`, background: c,
                          boxShadow: bestKey === k ? `0 0 8px ${c}60` : 'none' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-slate-800/50 px-3 py-2.5 text-[11px] text-slate-400">
                Peluang tertinggi: <span className="font-black" style={{ color: accent }}>{bestKey.charAt(0).toUpperCase() + bestKey.slice(1)}</span>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-xs text-slate-500">Tidak ada data waktu/rekor untuk estimasi probabilitas.</div>
              <div className="text-[10px] text-slate-600 mt-1">Peluang medali dinilai dari Smart Brief di bawah.</div>
            </div>
          )}

          {perf.every(p => p.gap_percentage === null) && hasProb === false && (
            <p className="text-[10px] text-slate-600 mt-3">
              Cabor ini menggunakan penilaian kualitatif — target dari KONI/pelatih.
            </p>
          )}
        </div>
      </div>

      {/* AI Smart Brief — manual trigger */}
      {!showBrief ? (
        <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-white">AI Smart Brief</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Claude</span>
            </div>
            <p className="text-[11px] text-slate-500">Analisis naratif kekuatan, gap, dan rekomendasi latihan atlet ini.</p>
          </div>
          <button onClick={() => setShowBrief(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
            style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
            ✨ Generate Brief
          </button>
        </div>
      ) : (
        <AthleteSmartBrief atletId={atletId} />
      )}
    </div>
  )
}
