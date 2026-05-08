'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Star, Clock, CheckCircle, Plus, LogOut, User, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function AtletDashboardPage() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [atlet, setAtlet] = useState<any>(null)
  const [kejuaraan, setKejuaraan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const meRes = await fetch('/api/atlet/me')
      if (!meRes.ok) { router.push('/atlet/login'); return }
      const meData = await meRes.json()
      setMe(meData)

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const [{ data: atletData }, { data: kejuaraanData }] = await Promise.all([
        supabase.from('atlet')
          .select('*, cabang_olahraga(nama), kontingen(nama)')
          .eq('id', meData.atlet_id)
          .single(),
        supabase.from('riwayat_kejuaraan')
          .select('*')
          .eq('atlet_id', meData.atlet_id)
          .order('tahun', { ascending: false }),
      ])

      setAtlet(atletData)
      setKejuaraan(kejuaraanData ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/atlet/logout', { method: 'POST' })
    router.push('/atlet/login')
  }

  const togglePublic = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('atlet_accounts')
      .update({ is_public: !me.is_public })
      .eq('atlet_id', me.atlet_id)
    setMe((prev: any) => ({ ...prev, is_public: !prev.is_public }))
  }

  const statusColor = (s: string) => {
    if (s === 'Verified') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (s === 'Draft') return 'bg-slate-700/50 text-slate-400 border-slate-700'
    if (s?.includes('Menunggu')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    if (s?.includes('Ditolak')) return 'bg-red-500/10 text-red-400 border-red-500/20'
    return 'bg-slate-700/50 text-slate-400 border-slate-700'
  }

  const tingkatColor = (t: string) => {
    if (t === 'internasional') return 'bg-purple-500/10 text-purple-400'
    if (t === 'nasional') return 'bg-blue-500/10 text-blue-400'
    if (t === 'provinsi') return 'bg-emerald-500/10 text-emerald-400'
    return 'bg-slate-700/50 text-slate-400'
  }

  const totalVerified = kejuaraan.filter(k => k.status === 'Verified').length
  const totalPending = kejuaraan.filter(k => k.status?.includes('Menunggu')).length

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-red-400 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Topbar */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-porprov.png" alt="PORPROV XV" className="w-8 h-8 object-contain" />
            <div>
              <div className="text-white text-sm font-semibold">Portal Atlet</div>
              <div className="text-slate-500 text-[10px]">PORPROV XV · Jawa Barat 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={togglePublic}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all
                ${me?.is_public
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'border-slate-700 text-slate-500'}`}>
              {me?.is_public ? <Eye size={12} /> : <EyeOff size={12} />}
              {me?.is_public ? 'Profil Publik' : 'Profil Privat'}
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1.5">
              <LogOut size={13} />
              Keluar
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-white text-xl font-semibold mb-1">{atlet?.nama_lengkap}</h1>
              <div className="flex gap-3 flex-wrap">
                <span className="text-slate-400 text-xs">{atlet?.cabang_olahraga?.nama}</span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-400 text-xs">{atlet?.kontingen?.nama}</span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-400 text-xs">{atlet?.gender === 'L' ? 'Putra' : 'Putri'}</span>
              </div>
              <div className="mt-2 text-slate-600 text-[10px] font-mono">{atlet?.no_ktp}</div>
            </div>
            <div className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${statusColor(atlet?.status_registrasi)}`}>
              {atlet?.status_registrasi}
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Kejuaraan', value: kejuaraan.length, icon: Trophy, color: 'bg-amber-500/10 text-amber-400' },
            { label: 'Sudah Verified', value: totalVerified, icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-400' },
            { label: 'Menunggu Review', value: totalPending, icon: Clock, color: totalPending > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700/50 text-slate-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs">{label}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={15} />
                </div>
              </div>
              <div className="text-3xl font-semibold text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* Riwayat Kejuaraan */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-white text-sm font-medium">Riwayat Kejuaraan</div>
              <div className="text-slate-500 text-xs mt-0.5">Track record prestasi kamu</div>
            </div>
            <Link href="/atlet/kejuaraan/tambah"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg transition-colors font-semibold">
              <Plus size={13} />
              Tambah Kejuaraan
            </Link>
          </div>

          {kejuaraan.length === 0 ? (
            <div className="text-center py-16">
              <Trophy size={32} className="text-slate-700 mx-auto mb-3" />
              <div className="text-slate-600 text-sm">Belum ada kejuaraan</div>
              <div className="text-slate-700 text-xs mt-1">Klik "Tambah Kejuaraan" untuk mulai</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {kejuaraan.map(k => (
                <div key={k.id} className="px-5 py-4 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white text-sm font-medium">{k.nama_kejuaraan}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tingkatColor(k.tingkat)}`}>
                          {k.tingkat?.replace('_', '/')}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs">
                        {k.nomor_lomba} · {k.hasil} · {k.tahun}
                      </div>
                      {k.status?.includes('Ditolak') && k.catatan_konida && (
                        <div className="mt-1.5 text-red-400 text-[10px] bg-red-500/5 px-2 py-1 rounded">
                          ⚠ {k.catatan_konida || k.catatan_cabor || k.catatan_admin}
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${statusColor(k.status)}`}>
                      {k.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}