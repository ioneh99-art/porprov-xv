'use client'
import { useEffect, useState } from 'react'
import { Users, UserCheck, Trophy, TrendingUp } from 'lucide-react'

export default function KonidaDashboardPage() {
  const [summary, setSummary] = useState({
    total: 0, verified: 0, putra: 0, putri: 0, byCabor: {} as Record<string, number>
  })
  const [loading, setLoading] = useState(true)
  const [kontingen, setKontingen] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Step 1: ambil session
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error('Gagal ambil session')
      const me = await res.json()
      setKontingen(me.nama ?? '')

      if (!me.kontingen_id) {
        setLoading(false)
        return
      }

      // Step 2: ambil data atlet
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: atlet, error: err } = await supabase
        .from('atlet')
        .select('gender, status_verifikasi, cabang_olahraga(nama)')
        .eq('kontingen_id', me.kontingen_id)

      if (err) throw new Error(err.message)

      const byCabor: Record<string, number> = {}
      ;(atlet ?? []).forEach((a: any) => {
        const cabor = a.cabang_olahraga?.nama ?? 'Lainnya'
        byCabor[cabor] = (byCabor[cabor] || 0) + 1
      })

      setSummary({
        total: atlet?.length ?? 0,
        verified: atlet?.filter((a: any) => a.status_verifikasi === 'Verified').length ?? 0,
        putra: atlet?.filter((a: any) => a.gender === 'L').length ?? 0,
        putri: atlet?.filter((a: any) => a.gender === 'P').length ?? 0,
        byCabor,
      })
    } catch (e: any) {
      setError(e.message ?? 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
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
      <div className="mb-7">
        <h1 className="text-lg font-semibold text-white">Dashboard KONIDA</h1>
        <p className="text-slate-500 text-xs mt-0.5">{kontingen} · PORPROV XV 2026</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Atlet', value: summary.total, icon: Users, color: 'bg-amber-500/10 text-amber-400' },
          { label: 'Terverifikasi', value: summary.verified, icon: UserCheck, color: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'Putra', value: summary.putra, icon: TrendingUp, color: 'bg-blue-500/10 text-blue-400' },
          { label: 'Putri', value: summary.putri, icon: Trophy, color: 'bg-pink-500/10 text-pink-400' },
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-white text-sm font-medium">Rekap per Cabang Olahraga</div>
          <span className="text-slate-500 text-xs">{Object.keys(summary.byCabor).length} cabor</span>
        </div>
        {Object.keys(summary.byCabor).length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">
            Belum ada atlet terdaftar
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-5 py-3">Cabang Olahraga</th>
                <th className="text-right text-slate-500 text-[10px] uppercase tracking-wider font-medium px-5 py-3">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.byCabor).map(([cabor, count]) => (
                <tr key={cabor} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-slate-200 text-sm">{cabor}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-amber-400 font-semibold text-sm">{count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}