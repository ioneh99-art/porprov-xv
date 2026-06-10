'use client'
import { useEffect, useState, useCallback } from 'react'
import { Trophy, Users, CheckCircle, Edit3, Award, Target, AlertCircle, Send, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DayungDashboardPage() {
  const [me, setMe] = useState<any>(null)
  const [nomors, setNomors] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalAtlet: 0, verified: 0, menungguAdmin: 0, posted: 0, ditolak: 0,
    putra: 0, putri: 0,
    totalNomor: 0, hasilTerinput: 0, medaliDitetapkan: 0,
    totalLineup: 0, totalJadwal: 0,
  })
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
        totalAtlet:    atletList?.length ?? 0,
        verified:      atletList?.filter(a => a.status_registrasi === 'Verified').length ?? 0,
        menungguAdmin: atletList?.filter(a => a.status_registrasi === 'Menunggu Admin').length ?? 0,
        posted:        atletList?.filter(a => a.status_registrasi === 'Posted').length ?? 0,
        ditolak:       atletList?.filter(a => a.status_registrasi === 'Ditolak Admin').length ?? 0,
        putra:         atletList?.filter(a => a.gender === 'L').length ?? 0,
        putri:         atletList?.filter(a => a.gender === 'P').length ?? 0,
      }

      const [{ count: hasilCount }, { count: medaliCount }, { count: lineupCount }, { count: jadwalCount }] =
        await Promise.all([
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

      setStats({ ...atletStats, totalNomor: nomorList?.length ?? 0, hasilTerinput: hasilCount ?? 0, medaliDitetapkan: medaliCount ?? 0, totalLineup: lineupCount ?? 0, totalJadwal: jadwalCount ?? 0 })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [me])

  useEffect(() => { loadData() }, [])

  const nomorPutra = nomors.filter(n => n.gender === 'L')
  const nomorPutri = nomors.filter(n => n.gender === 'P')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm">{error}</div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard Dayung</h1>
          <p className="text-slate-500 text-xs mt-1">
            {me?.cabor_nama ?? 'Dayung - Canoe'} · Time-based scoring · {stats.totalNomor} nomor pertandingan
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-sky-400 text-[10px] font-bold tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-2xl p-5 mb-6">
        <div className="text-white text-sm font-medium mb-1">Tahapan Workflow</div>
        <div className="text-slate-500 text-[11px] mb-4">Ikuti urutan 1 → 2 → 3 → 4 untuk operasional yang benar</div>
        <div className="grid grid-cols-4 gap-3">
          <WorkflowStep step={1} title="Lineup Atlet"   desc="Daftarkan atlet ke nomor" value={stats.totalLineup}     unit="entries" done={stats.totalLineup > 0}     href="/operator/dayung/lineup"   icon={Users}     />
          <WorkflowStep step={2} title="Jadwal"         desc="Set jadwal lomba"          value={stats.totalJadwal}     unit="jadwal"  done={stats.totalJadwal > 0}     href="/operator/jadwal"          icon={Calendar}  external="Generic" />
          <WorkflowStep step={3} title="Input Waktu"    desc="Input finish time atlet"   value={stats.hasilTerinput}   unit="row"     done={stats.hasilTerinput > 0}   href="/operator/dayung/input"    icon={Edit3}     />
          <WorkflowStep step={4} title="Klasemen Live"  desc="Ranking per nomor"         value={stats.medaliDitetapkan}unit="medali"  done={stats.medaliDitetapkan > 0} href="/operator/dayung/klasemen" icon={Trophy}    />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total Atlet" value={stats.totalAtlet} icon={Users} color="sky"
          subtitle={<><span className="text-blue-400">{stats.putra} Putra</span><span className="mx-1.5">·</span><span className="text-pink-400">{stats.putri} Putri</span></>} />
        <KpiCard label="Nomor Pertandingan" value={stats.totalNomor} icon={Target} color="blue" subtitle="Sprint + Slalom + Marathon" />
        <KpiCard label="Hasil Terinput" value={stats.hasilTerinput} icon={CheckCircle} color="violet" subtitle="dari pertandingan" />
        <KpiCard label="Medali Ditetapkan" value={stats.medaliDitetapkan} icon={Award} color="sky" subtitle="emas/perak/perunggu" />
      </div>

      {/* Status Registrasi */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <div className="text-white text-sm font-medium mb-1">Status Registrasi Atlet</div>
        <div className="text-slate-500 text-[11px] mb-4">Breakdown {stats.totalAtlet} atlet dayung</div>
        <div className="grid grid-cols-4 gap-3">
          <StatusCard icon={CheckCircle} label="Verified"      value={stats.verified}      total={stats.totalAtlet} color="emerald" desc="Siap bertanding" />
          <StatusCard icon={AlertCircle} label="Menunggu Admin" value={stats.menungguAdmin} total={stats.totalAtlet} color="amber"   desc="Belum diverifikasi" />
          <StatusCard icon={Send}        label="Posted"         value={stats.posted}        total={stats.totalAtlet} color="blue"    desc="Sudah final" />
          <StatusCard icon={AlertCircle} label="Ditolak Admin"  value={stats.ditolak}       total={stats.totalAtlet} color="red"     desc="Perlu revisi" />
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

function WorkflowStep({ step, title, desc, value, unit, done, href, icon: Icon, external }: any) {
  return (
    <Link href={href} className={`relative group block rounded-xl p-4 border transition-all
      ${done ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50' : 'bg-slate-900/50 border-slate-800 hover:border-sky-500/30'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
          ${done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'}`}>
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
        <ArrowRight size={12} className="text-slate-600 group-hover:text-sky-400 transition-colors" />
      </div>
    </Link>
  )
}

function KpiCard({ label, value, icon: Icon, color, subtitle }: any) {
  const colorMap: any = {
    sky:    'bg-sky-500/10 text-sky-400',
    blue:   'bg-blue-500/10 text-blue-400',
    violet: 'bg-violet-500/10 text-violet-400',
  }
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color] ?? colorMap.sky}`}>
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
    amber:   'bg-amber-500/10  text-amber-400  border-amber-500/20',
    blue:    'bg-blue-500/10   text-blue-400   border-blue-500/20',
    red:     'bg-red-500/10    text-red-400    border-red-500/20',
  }
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className={`rounded-xl border p-3.5 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2"><Icon size={13} /><div className="text-[10px] opacity-70">{percent}%</div></div>
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
      <div className="space-y-1">
        {nomors.length === 0
          ? <div className="text-slate-600 text-xs py-3">Tidak ada nomor</div>
          : nomors.map(n => (
            <div key={n.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-800/40 transition-colors">
              <span className="text-xs text-slate-300 truncate">{n.nama}</span>
              <span className="text-[10px] text-slate-500 ml-2 flex-shrink-0">#{n.id}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
