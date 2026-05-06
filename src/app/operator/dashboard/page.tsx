'use client'
import { useEffect, useState } from 'react'
import { Trophy, Users, CheckCircle, ClipboardList } from 'lucide-react'
import Link from 'next/link'

export default function OperatorDashboardPage() {
  const [me, setMe] = useState<any>(null)
  const [stats, setStats] = useState({
    nomor: 0,
    menunggu: 0,
    hasil: 0,
    medali: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const meData = await fetch('/api/auth/me').then(r => r.json())
      setMe(meData)

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const [
        { count: nomorCount },
        { count: menungguCount },
        { count: hasilCount },
        { count: medaliCount },
      ] = await Promise.all([
        supabase
          .from('nomor_pertandingan')
          .select('*', { count: 'exact', head: true })
          .eq('cabor_id', meData.cabor_id),
        supabase
          .from('atlet')
          .select('*', { count: 'exact', head: true })
          .eq('cabor_id', meData.cabor_id)
          .eq('status_registrasi', 'Menunggu Cabor'),
        supabase
          .from('hasil_pertandingan')
          .select('*, nomor_pertandingan!inner(cabor_id)', { count: 'exact', head: true })
          .eq('nomor_pertandingan.cabor_id', meData.cabor_id),
        supabase
          .from('hasil_pertandingan')
          .select('*, nomor_pertandingan!inner(cabor_id)', { count: 'exact', head: true })
          .eq('nomor_pertandingan.cabor_id', meData.cabor_id)
          .neq('medali', 'none'),
      ])

      setStats({
        nomor: nomorCount ?? 0,
        menunggu: menungguCount ?? 0,
        hasil: hasilCount ?? 0,
        medali: medaliCount ?? 0,
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
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
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-white">Dashboard Operator</h1>
        <p className="text-slate-500 text-xs mt-0.5">
          {me?.nama} · PORPROV XV 2026
        </p>
      </div>

      {/* Alert menunggu verifikasi */}
      {stats.menunggu > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span className="text-amber-400 text-xs">
            <span className="font-semibold">{stats.menunggu} atlet</span> menunggu review — segera periksa di menu Verifikasi Atlet
          </span>
          <Link href="/operator/verifikasi"
            className="ml-auto bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all">
            Review Sekarang
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Nomor Pertandingan',
            value: stats.nomor,
            icon: ClipboardList,
            color: 'bg-emerald-500/10 text-emerald-400',
          },
          {
            label: 'Menunggu Review',
            value: stats.menunggu,
            icon: Users,
            color: stats.menunggu > 0
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-slate-700/50 text-slate-500',
          },
          {
            label: 'Hasil Terinput',
            value: stats.hasil,
            icon: CheckCircle,
            color: 'bg-blue-500/10 text-blue-400',
          },
          {
            label: 'Medali Ditetapkan',
            value: stats.medali,
            icon: Trophy,
            color: 'bg-yellow-500/10 text-yellow-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-xs">{label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/operator/verifikasi"
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-2xl p-6 transition-all">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle size={18} className="text-emerald-400" />
          </div>
          <div className="text-white text-sm font-medium mb-1">Verifikasi Atlet</div>
          <div className="text-slate-500 text-xs leading-relaxed">
            Review dan approve atlet yang diajukan KONIDA ke cabor kamu
          </div>
          {stats.menunggu > 0 && (
            <div className="mt-3 inline-block bg-amber-500/10 text-amber-400 text-[10px] px-2 py-1 rounded-full border border-amber-500/20">
              {stats.menunggu} menunggu
            </div>
          )}
        </Link>

        <Link href="/operator/nomor"
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/30 rounded-2xl p-6 transition-all">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
            <ClipboardList size={18} className="text-blue-400" />
          </div>
          <div className="text-white text-sm font-medium mb-1">Nomor Pertandingan</div>
          <div className="text-slate-500 text-xs leading-relaxed">
            Setup dan kelola nomor pertandingan cabor kamu
          </div>
          <div className="mt-3 inline-block bg-blue-500/10 text-blue-400 text-[10px] px-2 py-1 rounded-full border border-blue-500/20">
            {stats.nomor} nomor
          </div>
        </Link>

        <Link href="/operator/hasil"
          className="bg-slate-900 border border-slate-800 hover:border-yellow-500/30 rounded-2xl p-6 transition-all">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4">
            <Trophy size={18} className="text-yellow-400" />
          </div>
          <div className="text-white text-sm font-medium mb-1">Input Hasil</div>
          <div className="text-slate-500 text-xs leading-relaxed">
            Input hasil pertandingan dan tetapkan medali per nomor
          </div>
          <div className="mt-3 inline-block bg-yellow-500/10 text-yellow-400 text-[10px] px-2 py-1 rounded-full border border-yellow-500/20">
            {stats.medali} medali ditetapkan
          </div>
        </Link>
      </div>
    </div>
  )
}