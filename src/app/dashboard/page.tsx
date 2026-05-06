'use client'
import { useEffect, useState } from 'react'
import { Users, CheckCircle, Send, TrendingUp, AlertTriangle, Upload } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0, verified: 0, posted: 0,
    caborData: [] as any[],
  })
  const [aktivitas, setAktivitas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: atlet } = await supabase
      .from('atlet')
      .select('status_verifikasi, is_posted, cabang_olahraga(nama)')

    if (atlet) {
      const total = atlet.length
      const verified = atlet.filter(a => a.status_verifikasi === 'Verified').length
      const posted = atlet.filter(a => a.is_posted).length

      // Group by cabor
      const caborMap: Record<string, { total: number, verif: number, posted: number }> = {}
      atlet.forEach((a: any) => {
        const name = a.cabang_olahraga?.nama ?? 'Lainnya'
        if (!caborMap[name]) caborMap[name] = { total: 0, verif: 0, posted: 0 }
        caborMap[name].total++
        if (a.status_verifikasi === 'Verified') caborMap[name].verif++
        if (a.is_posted) caborMap[name].posted++
      })

      setStats({
        total, verified, posted,
        caborData: Object.entries(caborMap).map(([name, v]) => ({ name, ...v })),
      })
    }

    // Aktivitas terbaru dari log_verifikasi
    const { data: logs } = await supabase
      .from('log_verifikasi')
      .select('action, catatan, created_at, atlet(nama_lengkap)')
      .order('created_at', { ascending: false })
      .limit(5)

    setAktivitas(logs ?? [])
    setLoading(false)
  }

  const vPct = stats.total ? Math.round(stats.verified / stats.total * 100) : 0
  const pPct = stats.total ? Math.round(stats.posted / stats.total * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard Admin</h1>
          <p className="text-slate-500 text-xs mt-0.5">PORPROV XV · Jawa Barat 2026</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Registrasi', value: stats.total, pct: 100, color: 'bg-blue-500/10 text-blue-400', barColor: 'bg-blue-500', icon: Users },
          { label: 'Terverifikasi', value: stats.verified, pct: vPct, color: 'bg-emerald-500/10 text-emerald-400', barColor: 'bg-emerald-500', icon: CheckCircle },
          { label: 'Sudah Posting', value: stats.posted, pct: pPct, color: 'bg-amber-500/10 text-amber-400', barColor: 'bg-amber-500', icon: Send },
        ].map(({ label, value, pct, color, barColor, icon: Icon }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-xs">{label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="text-3xl font-semibold text-white mb-3">
              {value.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-slate-500 text-xs">{pct}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Chart */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">Rekap per Cabang Olahraga</div>
          </div>
          <div className="p-5">
            {stats.caborData.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm">Belum ada data atlet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.caborData} barSize={8}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={40} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="total" name="Total" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="verif" name="Verified" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="posted" name="Posted" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Aktivitas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">Aktivitas Terbaru</div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {aktivitas.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs">Belum ada aktivitas</div>
            ) : aktivitas.map((a, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                  ${a.action === 'verified' ? 'bg-emerald-500/10' : a.action === 'rejected' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                  {a.action === 'verified' ? <CheckCircle size={13} className="text-emerald-400" />
                    : a.action === 'rejected' ? <AlertTriangle size={13} className="text-red-400" />
                    : <Upload size={13} className="text-blue-400" />}
                </div>
                <div>
                  <div className="text-slate-300 text-xs font-medium leading-snug">
                    {a.atlet?.nama_lengkap} — {a.action}
                  </div>
                  <div className="text-slate-600 text-[10px] mt-0.5">
                    {new Date(a.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}