'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Trophy, Users, CheckCircle, Edit3, Award, Target, AlertCircle, Send, Calendar, ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { usePentathlonRealtime, RealtimeStatusBadge } from '@/hooks/usePentathlonRealtime'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function PentathlonDashboardPage() {
  const [me, setMe] = useState<any>(null)
  const [nomors, setNomors] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalAtlet: 0, verified: 0, menungguAdmin: 0, posted: 0, ditolak: 0,
    putra: 0, putri: 0,
    totalNomor: 0, hasilTerinput: 0, medaliDitetapkan: 0,
    totalLineup: 0, totalJadwal: 0,
  })
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const meData = me ?? await fetch('/api/auth/me').then(r => r.json())
      if (!me) setMe(meData)

      const cabor_id = meData?.cabor_id
      if (!cabor_id) return

      const { data: nomorList } = await supabase
        .from('nomor_pertandingan')
        .select('id, nama, gender, status')
        .eq('cabor_id', cabor_id)
        .order('nama')

      setNomors(nomorList ?? [])
      const nomorIds = (nomorList ?? []).map(n => n.id)

      const { data: atletList } = await supabase
        .from('atlet')
        .select('id, gender, status_registrasi')
        .eq('cabor_id', cabor_id)

      const atletStats = {
        totalAtlet: atletList?.length ?? 0,
        verified: atletList?.filter(a => a.status_registrasi === 'Verified').length ?? 0,
        menungguAdmin: atletList?.filter(a => a.status_registrasi === 'Menunggu Admin').length ?? 0,
        posted: atletList?.filter(a => a.status_registrasi === 'Posted').length ?? 0,
        ditolak: atletList?.filter(a => a.status_registrasi === 'Ditolak Admin').length ?? 0,
        putra: atletList?.filter(a => a.gender === 'L').length ?? 0,
        putri: atletList?.filter(a => a.gender === 'P').length ?? 0,
      }

      const [
        { count: hasilCount },
        { count: medaliCount },
        { count: lineupCount },
        { count: jadwalCount },
      ] = await Promise.all([
        nomorIds.length > 0
          ? supabase.from('hasil_pertandingan').select('*', { count: 'exact', head: true }).in('nomor_id', nomorIds)
          : Promise.resolve({ count: 0 }),
        nomorIds.length > 0
          ? supabase.from('hasil_pertandingan').select('*', { count: 'exact', head: true }).in('nomor_id', nomorIds).neq('medali', 'none')
          : Promise.resolve({ count: 0 }),
        nomorIds.length > 0
          ? supabase.from('kualifikasi_atlet').select('*', { count: 'exact', head: true }).in('nomor_id', nomorIds).neq('status', 'Dibatalkan')
          : Promise.resolve({ count: 0 }),
        nomorIds.length > 0
          ? supabase.from('jadwal_pertandingan').select('*', { count: 'exact', head: true }).in('nomor_id', nomorIds)
          : Promise.resolve({ count: 0 }),
      ])

      setStats({
        ...atletStats,
        totalNomor: nomorList?.length ?? 0,
        hasilTerinput: hasilCount ?? 0,
        medaliDitetapkan: medaliCount ?? 0,
        totalLineup: lineupCount ?? 0,
        totalJadwal: jadwalCount ?? 0,
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [me])

  useEffect(() => { loadData() }, [])

  const { realtimeStatus, lastUpdate } = usePentathlonRealtime({
    cabor_id: me?.cabor_id,
    tables: ['hasil_pertandingan', 'kualifikasi_atlet', 'atlet'],
    onUpdate: loadData,
  })

  // ── Smart Alerts ────────────────────────────────────────
  const alerts = useMemo(() => {
    if (stats.totalAtlet === 0) return []
    const a: { id: string; type: 'error' | 'warning' | 'info'; msg: string; href: string; cta: string }[] = []

    if (stats.ditolak > 0)
      a.push({ id: 'ditolak', type: 'error', msg: `${stats.ditolak} atlet ditolak admin — perlu revisi segera`, href: '/operator/pentathlon/atlet', cta: 'Lihat' })
    if (stats.menungguAdmin > 0)
      a.push({ id: 'menunggu', type: 'warning', msg: `${stats.menungguAdmin} atlet menunggu verifikasi`, href: '/operator/pentathlon/atlet', cta: 'Verifikasi' })
    if (stats.totalAtlet > 0 && stats.totalLineup === 0)
      a.push({ id: 'lineup', type: 'warning', msg: 'Lineup belum dimulai — daftarkan atlet ke 5 nomor pentathlon', href: '/operator/pentathlon/lineup', cta: 'Mulai Lineup' })
    if (stats.totalJadwal === 0 && stats.totalNomor > 0)
      a.push({ id: 'jadwal', type: 'info', msg: 'Jadwal pertandingan belum dibuat', href: '/operator/jadwal', cta: 'Buat Jadwal' })
    if (stats.totalLineup > 0 && stats.hasilTerinput === 0)
      a.push({ id: 'hasil', type: 'warning', msg: 'Lineup sudah ada, tapi belum ada skor diinput', href: '/operator/pentathlon/input', cta: 'Input Skor' })
    if (stats.verified > 0 && stats.medaliDitetapkan === 0 && stats.hasilTerinput > 0)
      a.push({ id: 'medali', type: 'info', msg: 'Skor ada, tapi medali belum ditetapkan — simpan ulang dari Input', href: '/operator/pentathlon/input', cta: 'Input Skor' })

    return a.filter(a => !dismissedAlerts.has(a.id)).slice(0, 4)
  }, [stats, dismissedAlerts])

  // ── Readiness Index ─────────────────────────────────────
  const readiness = useMemo(() => {
    if (stats.totalAtlet === 0) return { score: 0, label: 'Belum Ada Data', color: 'text-slate-500', dims: [] }
    const expectedLineup = Math.max(stats.verified * 5, 1) // 5 nomors per verified atlet
    const lineupRate  = Math.min((stats.totalLineup / expectedLineup), 1)
    const jadwalRate  = stats.totalJadwal > 0 ? Math.min(stats.totalJadwal / Math.max(stats.totalNomor, 1), 1) : 0
    const hasilRate   = stats.totalLineup > 0 ? Math.min(stats.hasilTerinput / Math.max(stats.totalLineup, 1), 1) : 0
    const medaliRate  = Math.min(stats.medaliDitetapkan / 6, 1) // target 6 medali (3 putra + 3 putri)

    const score = Math.round(lineupRate * 25 + jadwalRate * 20 + hasilRate * 30 + medaliRate * 25)
    const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Siap Tanding' : score >= 40 ? 'Perlu Perhatian' : 'Kritis'
    const color = score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-yellow-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
    const dims = [
      { label: 'Lineup',  score: Math.round(lineupRate * 100),  weight: 25 },
      { label: 'Jadwal',  score: Math.round(jadwalRate * 100),  weight: 20 },
      { label: 'Hasil',   score: Math.round(hasilRate * 100),   weight: 30 },
      { label: 'Medali',  score: Math.round(medaliRate * 100),  weight: 25 },
    ]
    return { score, label, color, dims }
  }, [stats])

  const nomorPutra = nomors.filter(n => n.gender === 'L')
  const nomorPutri = nomors.filter(n => n.gender === 'P')

  const step1Done = stats.totalLineup > 0
  const step2Done = stats.totalJadwal > 0
  const step3Done = stats.hasilTerinput > 0
  const step4Done = stats.medaliDitetapkan > 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm">
      <div className="font-medium mb-1">Error memuat dashboard</div>
      <div className="text-xs opacity-70">{error}</div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard Pentathlon</h1>
          <p className="text-slate-500 text-xs mt-1">
            {me?.cabor_nama ?? 'Modern Pentathlon'} · 4 disiplin: Fencing → Swimming → Obstacle → Laser Run
          </p>
        </div>
        <RealtimeStatusBadge status={realtimeStatus} lastUpdate={lastUpdate} />
      </div>

      {/* Smart Alert Strip */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-5">
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs ${
              alert.type === 'error'   ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            }`}>
              <span className="flex-shrink-0 text-base">
                {alert.type === 'error' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <span className="flex-1">{alert.msg}</span>
              <Link href={alert.href}
                className={`flex-shrink-0 font-semibold text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                  alert.type === 'error'   ? 'border-red-500/30 hover:bg-red-500/20'
                  : alert.type === 'warning' ? 'border-amber-500/30 hover:bg-amber-500/20'
                  : 'border-blue-500/30 hover:bg-blue-500/20'
                }`}>{alert.cta} →</Link>
              <button onClick={() => setDismissedAlerts(prev => new Set(Array.from(prev).concat(alert.id)))}
                className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors ml-1">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Readiness Index + KPI */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Readiness Gauge */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center">
          <div className="text-slate-400 text-xs mb-3 text-center">Readiness Index</div>
          <ReadinessGauge score={readiness.score} />
          <div className={`text-sm font-semibold mt-2 ${readiness.color}`}>{readiness.label}</div>
          <div className="w-full mt-4 space-y-2">
            {readiness.dims.map(d => (
              <div key={d.label}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-500">{d.label}</span>
                  <span className={d.score >= 80 ? 'text-emerald-400' : d.score >= 50 ? 'text-amber-400' : 'text-red-400'}>{d.score}%</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${d.score >= 80 ? 'bg-emerald-400' : d.score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${d.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI 2x2 */}
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <KpiCard label="Total Atlet" value={stats.totalAtlet} icon={Users} color="yellow"
            subtitle={<><span className="text-blue-400">{stats.putra} Putra</span><span className="mx-1.5">·</span><span className="text-pink-400">{stats.putri} Putri</span></>} />
          <KpiCard label="Nomor Pertandingan" value={stats.totalNomor} icon={Target} color="blue" subtitle="Individual + 4 Disiplin" />
          <KpiCard label="Hasil Terinput" value={stats.hasilTerinput} icon={CheckCircle} color="violet" subtitle="dari pertandingan" />
          <KpiCard label="Medali Ditetapkan" value={stats.medaliDitetapkan} icon={Award} color="yellow" subtitle="emas/perak/perunggu" />
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-white text-sm font-medium">Tahapan Workflow</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Ikuti urutan 1 → 2 → 3 → 4 untuk operasional yang benar</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <WorkflowStep step={1} title="Lineup Atlet" desc="Daftar atlet ke 5 nomor" value={stats.totalLineup} unit="entries" done={step1Done} href="/operator/pentathlon/lineup" icon={Users} />
          <WorkflowStep step={2} title="Jadwal" desc="Set jadwal tanding" value={stats.totalJadwal} unit="jadwal" done={step2Done} href="/operator/jadwal" icon={Calendar} external="Generic" />
          <WorkflowStep step={3} title="Input Skor" desc="Input hasil pertandingan" value={stats.hasilTerinput} unit="row" done={step3Done} href="/operator/pentathlon/input" icon={Edit3} />
          <WorkflowStep step={4} title="Klasemen Live" desc="Display ranking + detail" value={stats.medaliDitetapkan} unit="medali" done={step4Done} href="/operator/pentathlon/klasemen" icon={Trophy} />
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <div className="mb-4">
          <div className="text-white text-sm font-medium">Status Registrasi Atlet</div>
          <div className="text-slate-500 text-[11px] mt-0.5">Breakdown verifikasi {stats.totalAtlet} atlet pentathlon</div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <StatusCard icon={CheckCircle} label="Verified" value={stats.verified} total={stats.totalAtlet} color="emerald" desc="Siap bertanding" />
          <StatusCard icon={AlertCircle} label="Menunggu Admin" value={stats.menungguAdmin} total={stats.totalAtlet} color="amber" desc="Belum diverifikasi" />
          <StatusCard icon={Send} label="Posted" value={stats.posted} total={stats.totalAtlet} color="blue" desc="Sudah final" />
          <StatusCard icon={AlertCircle} label="Ditolak Admin" value={stats.ditolak} total={stats.totalAtlet} color="red" desc="Perlu revisi" />
        </div>
      </div>

      {/* Nomor Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <NomorCard title={`Putra (${nomorPutra.length} Nomor)`} nomors={nomorPutra} accent="blue" />
        <NomorCard title={`Putri (${nomorPutri.length} Nomor)`} nomors={nomorPutri} accent="pink" />
      </div>
    </div>
  )
}

// ── Readiness Gauge SVG ─────────────────────────────────
function ReadinessGauge({ score }: { score: number }) {
  const R = 54
  const cx = 70, cy = 72
  const arcLen = Math.PI * R // semicircle
  const filled = (score / 100) * arcLen
  const strokeColor = score >= 90 ? '#34d399' : score >= 70 ? '#facc15' : score >= 40 ? '#fb923c' : '#f87171'
  return (
    <svg viewBox="0 0 140 80" className="w-36 h-20">
      <defs>
        <linearGradient id="gaugeTrack" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      {/* Track */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
      {/* Filled */}
      <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none" stroke={strokeColor} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${filled} ${arcLen}`} />
      {/* Score text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="20" fontWeight="700" fontFamily="monospace">{score}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#64748b" fontSize="8">/ 100</text>
    </svg>
  )
}

function WorkflowStep({ step, title, desc, value, unit, done, href, icon: Icon, external }: any) {
  return (
    <Link href={href}
      className={`relative group block rounded-xl p-4 border transition-all
        ${done ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-yellow-500/30'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
          ${done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
          {done ? '✓' : step}
        </div>
        {external && <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{external}</span>}
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className={done ? 'text-emerald-400' : 'text-slate-400'} />
        <div className={`text-xs font-semibold ${done ? 'text-emerald-300' : 'text-white'}`}>{title}</div>
      </div>
      <div className="text-[10px] text-slate-500 mb-2">{desc}</div>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-lg font-bold ${done ? 'text-emerald-400' : 'text-slate-600'}`}>{value}</div>
          <div className="text-[9px] text-slate-500">{unit}</div>
        </div>
        <ArrowRight size={12} className="text-slate-600 group-hover:text-yellow-400 transition-colors" />
      </div>
    </Link>
  )
}

function KpiCard({ label, value, icon: Icon, color, subtitle }: any) {
  const colorMap: any = {
    yellow: 'bg-yellow-500/10 text-yellow-400',
    blue: 'bg-blue-500/10 text-blue-400',
    violet: 'bg-violet-500/10 text-violet-400',
  }
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color] ?? colorMap.yellow}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="text-[10px] text-slate-500 mt-1.5">{subtitle}</div>
    </div>
  )
}

function StatusCard({ icon: Icon, label, value, total, color, desc }: any) {
  const colorMap: any = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className={`rounded-xl border p-3.5 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={13} />
        <div className="text-[10px] opacity-70">{percent}%</div>
      </div>
      <div className="text-2xl font-semibold leading-tight">{value}</div>
      <div className="text-[10px] font-medium mt-1">{label}</div>
      <div className="text-[10px] opacity-60 mt-0.5">{desc}</div>
    </div>
  )
}

function NomorCard({ title, nomors, accent }: { title: string; nomors: any[]; accent: 'blue' | 'pink' }) {
  const accentColor = accent === 'blue' ? 'text-blue-400 bg-blue-500/10' : 'text-pink-400 bg-pink-500/10'
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium ${accentColor} mb-4`}>{title}</div>
      <div className="space-y-1.5">
        {nomors.length === 0 ? (
          <div className="text-slate-600 text-xs py-3">Tidak ada nomor</div>
        ) : nomors.map(n => {
          const isIndividual = n.nama.includes('Individual')
          const shortName = n.nama.replace('Modern Pentathlon ', '').replace(/ (Putra|Putri)$/, '')
          return (
            <div key={n.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center gap-2">
                {isIndividual && <span className="text-yellow-400 text-xs">⭐</span>}
                <span className={`text-xs ${isIndividual ? 'text-yellow-200 font-medium' : 'text-slate-300'}`}>{shortName}</span>
              </div>
              <span className="text-[10px] text-slate-500">#{n.id}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
