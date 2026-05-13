'use client'
import { useEffect, useState } from 'react'
import {
  Users, Trophy, TrendingUp, BarChart2,
  CheckCircle, Clock, XCircle, Medal,
  Shirt, Footprints, Target, Zap
} from 'lucide-react'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview'|'kontingen'|'cabor'|'logistik'>('overview')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [
      { data: atletAll },
      { data: kontingenList },
      { data: caborList },
      { data: medaliData },
    ] = await Promise.all([
      supabase.from('atlet').select('id, gender, status_registrasi, status_verifikasi, kontingen_id, cabor_id, ukuran_kemeja, ukuran_celana, ukuran_sepatu, cabang_olahraga(nama), kontingen(nama)'),
      supabase.from('kontingen').select('id, nama').order('nama'),
      supabase.from('cabang_olahraga').select('id, nama').order('nama'),
      supabase.from('klasemen_medali').select('*, kontingen(nama)').order('emas', { ascending: false }).limit(10),
    ])

    const atlet = atletAll ?? []

    // KPI
    const total = atlet.length
    const putra = atlet.filter((a: any) => a.gender === 'L').length
    const putri = atlet.filter((a: any) => a.gender === 'P').length
    const draft = atlet.filter((a: any) => a.status_registrasi === 'Draft').length
    const menunggu = atlet.filter((a: any) => a.status_registrasi?.includes('Menunggu')).length
    const verified = atlet.filter((a: any) => a.status_registrasi === 'Verified').length
    const posted = atlet.filter((a: any) => a.status_registrasi === 'Posted').length
    const ditolak = atlet.filter((a: any) => a.status_registrasi?.includes('Ditolak')).length
    const siapTanding = posted + verified

    // Status verifikasi
    const verApproved = atlet.filter((a: any) => a.status_verifikasi === 'Approved Cabor').length
    const verVerified = atlet.filter((a: any) => a.status_verifikasi === 'Verified').length
    const verDraft = atlet.filter((a: any) => a.status_verifikasi === 'Draft').length
    const verRejected = atlet.filter((a: any) => a.status_verifikasi === 'Rejected').length

    // Per kontingen
    const perKontingen = (kontingenList ?? []).map((k: any) => {
      const atletK = atlet.filter((a: any) => a.kontingen_id === k.id)
      return {
        nama: k.nama,
        total: atletK.length,
        putra: atletK.filter((a: any) => a.gender === 'L').length,
        putri: atletK.filter((a: any) => a.gender === 'P').length,
        posted: atletK.filter((a: any) => a.status_registrasi === 'Posted').length,
        verified: atletK.filter((a: any) => a.status_registrasi === 'Verified').length,
        menunggu: atletK.filter((a: any) => a.status_registrasi?.includes('Menunggu')).length,
        ditolak: atletK.filter((a: any) => a.status_registrasi?.includes('Ditolak')).length,
        progress: atletK.length > 0
          ? Math.round(((atletK.filter((a: any) =>
              a.status_registrasi === 'Posted' || a.status_registrasi === 'Verified'
            ).length) / atletK.length) * 100)
          : 0,
      }
    }).filter(k => k.total > 0).sort((a, b) => b.total - a.total)

    // Belum kirim (progress 0)
    const belumKirim = perKontingen.filter(k => k.progress === 0).length
    const sudahLengkap = perKontingen.filter(k => k.progress === 100).length

    // Per cabor
    const perCabor = (caborList ?? []).map((c: any) => {
      const atletC = atlet.filter((a: any) => a.cabor_id === c.id)
      return {
        nama: c.nama,
        total: atletC.length,
        putra: atletC.filter((a: any) => a.gender === 'L').length,
        putri: atletC.filter((a: any) => a.gender === 'P').length,
        siap: atletC.filter((a: any) =>
          a.status_registrasi === 'Posted' || a.status_registrasi === 'Verified'
        ).length,
      }
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 15)

    // Distribusi ukuran
    const ukuranKemeja: Record<string, number> = {}
    const ukuranCelana: Record<string, number> = {}
    const ukuranSepatu: Record<string, number> = {}
    for (const a of atlet as any[]) {
      if (a.ukuran_kemeja) ukuranKemeja[a.ukuran_kemeja] = (ukuranKemeja[a.ukuran_kemeja] || 0) + 1
      if (a.ukuran_celana) ukuranCelana[a.ukuran_celana] = (ukuranCelana[a.ukuran_celana] || 0) + 1
      if (a.ukuran_sepatu) ukuranSepatu[a.ukuran_sepatu] = (ukuranSepatu[a.ukuran_sepatu] || 0) + 1
    }

    // AI Insights otomatis
    const insights = []
    const topCabor = perCabor[0]
    const bottomKontingen = [...perKontingen].sort((a,b) => a.total - b.total)[0]
    const topKontingen = perKontingen[0]

    if (topCabor) insights.push(`Cabor ${topCabor.nama} memiliki atlet terbanyak (${topCabor.total} atlet)`)
    if (topKontingen) insights.push(`${topKontingen.nama} memimpin dengan ${topKontingen.total} atlet terdaftar`)
    if (bottomKontingen && bottomKontingen.total < 3) insights.push(`${bottomKontingen.nama} perlu perhatian — baru ${bottomKontingen.total} atlet`)
    if (ditolak > 0) insights.push(`${ditolak} atlet ditolak — perlu tindak lanjut segera`)
    if (siapTanding > 0) insights.push(`${Math.round((siapTanding/total)*100)}% atlet sudah siap tanding (${siapTanding}/${total})`)
    if (belumKirim > 0) insights.push(`${belumKirim} kontingen belum ada atlet yang siap tanding`)

    setData({
      kpi: { total, putra, putri, draft, menunggu, verified, posted, ditolak, siapTanding },
      verifikasi: { verApproved, verVerified, verDraft, verRejected },
      perKontingen,
      perCabor,
      ukuranKemeja, ukuranCelana, ukuranSepatu,
      medali: medaliData ?? [],
      insights,
      stats: { belumKirim, sudahLengkap },
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  const { kpi, verifikasi, perKontingen, perCabor, ukuranKemeja, ukuranCelana, ukuranSepatu, medali, insights, stats } = data
  const maxKontingen = Math.max(...perKontingen.map((k: any) => k.total), 1)
  const maxCabor = Math.max(...perCabor.map((c: any) => c.total), 1)

  const UkuranBar = ({ data, sizes, color }: { data: Record<string,number>, sizes: string[], color: string }) => {
    const maxVal = Math.max(...sizes.map(s => data[s] || 0), 1)
    return (
      <div className="space-y-2">
        {sizes.map(size => {
          const val = data[size] || 0
          return (
            <div key={size} className="flex items-center gap-3">
              <span className="text-slate-400 text-xs w-10 font-mono text-right">{size}</span>
              <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
                <div className={`h-full ${color} rounded transition-all flex items-center px-2`}
                  style={{ width: `${(val/maxVal)*100}%`, minWidth: val > 0 ? '28px' : '0' }}>
                  {val > 0 && <span className="text-white text-[10px] font-bold">{val}</span>}
                </div>
              </div>
              <span className="text-slate-500 text-[10px] w-6 text-right">{val}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard Analytics</h1>
          <p className="text-slate-500 text-xs mt-0.5">Statistik real-time PORPROV XV Jawa Barat 2026</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live data
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-800/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-blue-400" />
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">AI Insight Otomatis</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {insights.map((insight: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <span className="text-slate-300 text-xs leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Utama */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Atlet', value: kpi.total, icon: Users, color: 'text-white', bg: 'bg-blue-600' },
          { label: 'Putra', value: kpi.putra, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Putri', value: kpi.putri, icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          {
            label: 'Siap Tanding',
            value: kpi.siapTanding,
            icon: CheckCircle,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs">{label}</span>
              <div className={`w-7 h-7 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={13} className={color} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            {label === 'Siap Tanding' && kpi.total > 0 && (
              <div className="text-slate-500 text-[10px] mt-1">
                {Math.round((kpi.siapTanding/kpi.total)*100)}% dari total
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Registrasi + Verifikasi */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status Registrasi */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4">Status Registrasi</div>
          <div className="space-y-2.5">
            {[
              { label: 'Draft', value: kpi.draft, color: 'bg-slate-600' },
              { label: 'Menunggu Review', value: kpi.menunggu, color: 'bg-amber-500' },
              { label: 'Verified', value: kpi.verified, color: 'bg-emerald-500' },
              { label: 'Posted', value: kpi.posted, color: 'bg-blue-500' },
              { label: 'Ditolak', value: kpi.ditolak, color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-32 flex-shrink-0">{label}</span>
                <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${kpi.total > 0 ? (value/kpi.total)*100 : 0}%`, minWidth: value > 0 ? '20px' : '0' }} />
                </div>
                <span className="text-white text-xs font-bold w-8 text-right">{value}</span>
                <span className="text-slate-600 text-[10px] w-8">
                  {kpi.total > 0 ? `${Math.round((value/kpi.total)*100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Verifikasi */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4">Status Verifikasi</div>
          <div className="space-y-2.5">
            {[
              { label: 'Draft', value: verifikasi.verDraft, color: 'bg-slate-600' },
              { label: 'Approved Cabor', value: verifikasi.verApproved, color: 'bg-amber-500' },
              { label: 'Verified', value: verifikasi.verVerified, color: 'bg-emerald-500' },
              { label: 'Rejected', value: verifikasi.verRejected, color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs w-32 flex-shrink-0">{label}</span>
                <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${kpi.total > 0 ? (value/kpi.total)*100 : 0}%`, minWidth: value > 0 ? '20px' : '0' }} />
                </div>
                <span className="text-white text-xs font-bold w-8 text-right">{value}</span>
                <span className="text-slate-600 text-[10px] w-8">
                  {kpi.total > 0 ? `${Math.round((value/kpi.total)*100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
          {/* Summary siap vs belum */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
              <div className="text-emerald-400 text-xl font-bold">{stats.sudahLengkap}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">Kontingen 100% siap</div>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-3 text-center">
              <div className="text-amber-400 text-xl font-bold">{stats.belumKirim}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">Kontingen belum siap</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar global */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white text-sm font-medium">Progress Registrasi Keseluruhan</div>
          <div className="text-slate-400 text-xs">{kpi.posted + kpi.verified} / {kpi.total} atlet selesai</div>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-blue-600 transition-all" style={{ width: `${kpi.total > 0 ? (kpi.posted/kpi.total)*100 : 0}%` }} />
            <div className="bg-emerald-500 transition-all" style={{ width: `${kpi.total > 0 ? (kpi.verified/kpi.total)*100 : 0}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${kpi.total > 0 ? (kpi.menunggu/kpi.total)*100 : 0}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${kpi.total > 0 ? (kpi.ditolak/kpi.total)*100 : 0}%` }} />
          </div>
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { label: 'Posted', color: 'bg-blue-600' },
            { label: 'Verified', color: 'bg-emerald-500' },
            { label: 'Menunggu', color: 'bg-amber-500' },
            { label: 'Ditolak', color: 'bg-red-500' },
            { label: 'Draft', color: 'bg-slate-600' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-slate-500 text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab navigasi */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
        {[
          { key: 'overview', label: 'Per Kontingen' },
          { key: 'cabor', label: 'Per Cabor' },
          { key: 'logistik', label: 'Logistik & Ukuran' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Per Kontingen */}
      {activeTab === 'overview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-white text-sm font-medium">Atlet per Kontingen</div>
              <div className="text-slate-500 text-xs mt-0.5">{perKontingen.length} kontingen aktif</div>
            </div>
            <div className="text-slate-500 text-xs">Putra / Putri / Progress</div>
          </div>
          <div className="px-5 py-4 space-y-3 max-h-96 overflow-y-auto">
            {perKontingen.map((k: any, i: number) => (
              <div key={k.nama}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-slate-600 text-[10px] w-5 flex-shrink-0">{i+1}</span>
                    <span className="text-slate-200 text-xs font-medium truncate">{k.nama}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <span className="text-slate-500 text-[10px]">{k.putra}L / {k.putri}P</span>
                    <span className="text-white text-xs font-bold w-6 text-right">{k.total}</span>
                    <span className={`text-[10px] w-8 text-right font-medium ${
                      k.progress === 100 ? 'text-emerald-400' :
                      k.progress >= 50 ? 'text-amber-400' : 'text-slate-500'
                    }`}>{k.progress}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden ml-7">
                  <div className="h-full flex">
                    <div className="bg-blue-500 transition-all" style={{ width: `${(k.posted/maxKontingen)*100}%` }} />
                    <div className="bg-emerald-500 transition-all" style={{ width: `${(k.verified/maxKontingen)*100}%` }} />
                    <div className="bg-amber-500/60 transition-all" style={{ width: `${(k.menunggu/maxKontingen)*100}%` }} />
                    <div className="bg-red-500/60 transition-all" style={{ width: `${(k.ditolak/maxKontingen)*100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Per Cabor */}
      {activeTab === 'cabor' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">Distribusi per Cabang Olahraga</div>
            <div className="text-slate-500 text-xs mt-0.5">{perCabor.length} cabor aktif</div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {perCabor.map((c: any, i: number) => (
              <div key={c.nama}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-[10px] w-5">{i+1}</span>
                    <span className="text-slate-200 text-xs font-medium">{c.nama}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[10px]">{c.putra}L / {c.putri}P</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      c.siap === c.total ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>{c.siap}/{c.total} siap</span>
                    <span className="text-white text-xs font-bold w-6 text-right">{c.total}</span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden ml-7">
                  <div className="h-full flex">
                    <div className="bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(c.putra/maxCabor)*100}%` }} />
                    <div className="bg-pink-500 transition-all"
                      style={{ width: `${(c.putri/maxCabor)*100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 pb-4 flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-500 text-[10px]">Putra</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="text-slate-500 text-[10px]">Putri</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Logistik */}
      {activeTab === 'logistik' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shirt size={14} className="text-amber-400" />
                <div className="text-white text-sm font-medium">Ukuran Kemeja</div>
              </div>
              <UkuranBar data={ukuranKemeja} sizes={['S','M','L','XL','XXL','XXXL']}
                color="bg-gradient-to-r from-amber-600 to-amber-400" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shirt size={14} className="text-emerald-400" />
                <div className="text-white text-sm font-medium">Ukuran Celana</div>
              </div>
              <UkuranBar data={ukuranCelana} sizes={['S','M','L','XL','XXL','XXXL']}
                color="bg-gradient-to-r from-emerald-600 to-emerald-400" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Footprints size={14} className="text-blue-400" />
                <div className="text-white text-sm font-medium">Ukuran Sepatu</div>
              </div>
              <UkuranBar
                data={ukuranSepatu}
                sizes={['36','37','38','39','40','41','42','43','44','45']}
                color="bg-gradient-to-r from-blue-600 to-blue-400" />
            </div>
          </div>
          {/* Total kebutuhan logistik */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-white text-sm font-medium mb-3">Ringkasan Kebutuhan Logistik</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { 
                  label: 'Total Kemeja', 
                  value: (Object.values(ukuranKemeja) as number[]).reduce((a, b) => a + b, 0), 
                  color: 'text-amber-400' 
                },
                { 
                  label: 'Total Celana', 
                  value: (Object.values(ukuranCelana) as number[]).reduce((a, b) => a + b, 0), 
                  color: 'text-emerald-400' 
                },
                { 
                  label: 'Total Sepatu', 
                  value: (Object.values(ukuranSepatu) as number[]).reduce((a, b) => a + b, 0), 
                  color: 'text-blue-400' 
                },              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-slate-400 text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Klasemen Medali */}
      {medali.length > 0 && medali.some((m: any) => m.emas > 0 || m.perak > 0 || m.perunggu > 0) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">Top 10 Klasemen Medali</div>
            <div className="text-slate-500 text-xs mt-0.5">Update otomatis saat hasil diinput</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['#','Kontingen','🥇 Emas','🥈 Perak','🥉 Perunggu','Total'].map(h => (
                    <th key={h} className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medali.filter((m:any) => m.total > 0).map((m: any, i: number) => (
                  <tr key={m.id} className={`border-b border-slate-800/40 hover:bg-slate-800/20 ${i < 3 ? 'bg-slate-800/10' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                        <span className="text-slate-500 text-sm">{i+1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-200 text-xs font-medium">{m.kontingen?.nama}</td>
                    <td className="px-4 py-3 text-center text-yellow-400 font-bold">{m.emas}</td>
                    <td className="px-4 py-3 text-center text-slate-300 font-bold">{m.perak}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-bold">{m.perunggu}</td>
                    <td className="px-4 py-3 text-center text-white font-bold">{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Talent Radar */}
      <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">🤖</div>
        <div className="text-white text-sm font-medium mb-1">AI Talent Radar</div>
        <div className="text-slate-500 text-xs max-w-sm mx-auto">
          Analisa performa, prediksi medali PON, dan rekomendasi pembinaan tersedia
          setelah data riwayat kejuaraan lengkap dan terhubung ke SIPA Intelligence
        </div>
        <div className="mt-4 inline-flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full">
          <Zap size={12} />
          Powered by SIPA Intelligence AI
        </div>
      </div>
    </div>
  )
}