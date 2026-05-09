'use client'
import { useEffect, useState } from 'react'
import {
  Users, Trophy, TrendingUp, BarChart2,
  CheckCircle, Clock, XCircle, Medal
} from 'lucide-react'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      supabase.from('atlet').select('id, gender, status_registrasi, kontingen_id, cabor_id, ukuran_kemeja, ukuran_celana, ukuran_sepatu, cabang_olahraga(nama), kontingen(nama)'),
      supabase.from('kontingen').select('id, nama').order('nama'),
      supabase.from('cabang_olahraga').select('id, nama').eq('is_active', true).order('nama'),
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
        progress: atletK.length > 0
          ? Math.round(((atletK.filter((a: any) =>
              a.status_registrasi === 'Posted' || a.status_registrasi === 'Verified'
            ).length) / atletK.length) * 100)
          : 0,
      }
    }).filter(k => k.total > 0).sort((a, b) => b.total - a.total)

    // Per cabor top 15
    const perCabor = (caborList ?? []).map((c: any) => {
      const atletC = atlet.filter((a: any) => a.cabor_id === c.id)
      return { nama: c.nama, total: atletC.length }
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

    setData({
      kpi: { total, putra, putri, draft, menunggu, verified, posted, ditolak },
      perKontingen,
      perCabor,
      ukuranKemeja,
      ukuranCelana,
      ukuranSepatu,
      medali: medaliData ?? [],
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  const { kpi, perKontingen, perCabor, ukuranKemeja, ukuranCelana, medali } = data
  const maxKontingen = Math.max(...perKontingen.map((k: any) => k.total), 1)
  const maxCabor = Math.max(...perCabor.map((c: any) => c.total), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Dashboard Analytics</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Statistik real-time PORPROV XV Jawa Barat 2026
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live data
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Atlet', value: kpi.total, icon: Users, color: 'text-white', bg: 'bg-blue-600' },
          { label: 'Putra', value: kpi.putra, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Putri', value: kpi.putri, icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          {
            label: 'Rasio P/Pi',
            value: kpi.total > 0 ? `${Math.round((kpi.putra/kpi.total)*100)}%` : '0%',
            icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10'
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs">{label}</span>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={15} className={color} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* KPI Row 2 — Status */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Draft', value: kpi.draft, color: 'text-slate-400', bg: 'bg-slate-700/30' },
          { label: 'Menunggu Review', value: kpi.menunggu, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Verified', value: kpi.verified, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Posted', value: kpi.posted, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Ditolak', value: kpi.ditolak, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border border-slate-800 rounded-2xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-slate-500 text-xs mt-1">{label}</div>
            <div className="text-slate-600 text-[10px] mt-0.5">
              {kpi.total > 0 ? `${Math.round((value/kpi.total)*100)}%` : '0%'}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar Global */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white text-sm font-medium">Progress Registrasi Keseluruhan</div>
          <div className="text-slate-400 text-xs">
            {kpi.posted + kpi.verified} / {kpi.total} atlet selesai
          </div>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-blue-600 transition-all"
              style={{ width: `${kpi.total > 0 ? (kpi.posted/kpi.total)*100 : 0}%` }} />
            <div className="bg-emerald-500 transition-all"
              style={{ width: `${kpi.total > 0 ? (kpi.verified/kpi.total)*100 : 0}%` }} />
            <div className="bg-amber-500 transition-all"
              style={{ width: `${kpi.total > 0 ? (kpi.menunggu/kpi.total)*100 : 0}%` }} />
            <div className="bg-red-500 transition-all"
              style={{ width: `${kpi.total > 0 ? (kpi.ditolak/kpi.total)*100 : 0}%` }} />
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

      <div className="grid grid-cols-2 gap-5">
        {/* Per Kontingen */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">Atlet per Kontingen</div>
            <div className="text-slate-500 text-xs mt-0.5">
              {perKontingen.length} kontingen aktif
            </div>
          </div>
          <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
            {perKontingen.map((k: any, i: number) => (
              <div key={k.nama}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-[10px] w-4">{i+1}</span>
                    <span className="text-slate-200 text-xs font-medium truncate max-w-[140px]">
                      {k.nama.replace('KAB. ','').replace('KOTA ','')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">
                      {k.putra}L/{k.putri}P
                    </span>
                    <span className="text-white text-xs font-bold">{k.total}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div className="bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(k.posted/maxKontingen)*100}%` }} />
                    <div className="bg-emerald-500 transition-all"
                      style={{ width: `${(k.verified/maxKontingen)*100}%` }} />
                    <div className="bg-slate-600 transition-all"
                      style={{ width: `${((k.total-k.posted-k.verified)/maxKontingen)*100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per Cabor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">Top 15 Cabang Olahraga</div>
            <div className="text-slate-500 text-xs mt-0.5">Berdasarkan jumlah atlet</div>
          </div>
          <div className="px-5 py-4 space-y-2.5 max-h-80 overflow-y-auto">
            {perCabor.map((c: any, i: number) => (
              <div key={c.nama} className="flex items-center gap-3">
                <span className="text-slate-600 text-[10px] w-4 flex-shrink-0">{i+1}</span>
                <span className="text-slate-300 text-xs w-36 flex-shrink-0 truncate">{c.nama}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
                    style={{ width: `${(c.total/maxCabor)*100}%` }} />
                </div>
                <span className="text-white text-xs font-bold w-8 text-right flex-shrink-0">{c.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Distribusi Ukuran */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4">
            Distribusi Ukuran Kemeja
          </div>
          {Object.keys(ukuranKemeja).length === 0 ? (
            <div className="text-slate-600 text-xs text-center py-8">Belum ada data ukuran</div>
          ) : (
            <div className="space-y-2">
              {['S','M','L','XL','XXL','XXXL'].map(size => {
                const val = ukuranKemeja[size] || 0
                const maxVal = Math.max(...Object.values(ukuranKemeja) as number[], 1)
                return (
                  <div key={size} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-8 font-mono">{size}</span>
                    <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded transition-all flex items-center px-2"
                        style={{ width: `${(val/maxVal)*100}%`, minWidth: val > 0 ? '32px' : '0' }}>
                        {val > 0 && <span className="text-white text-[10px] font-bold">{val}</span>}
                      </div>
                    </div>
                    <span className="text-slate-500 text-[10px] w-8 text-right">{val}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-white text-sm font-medium mb-4">
            Distribusi Ukuran Celana
          </div>
          {Object.keys(ukuranCelana).length === 0 ? (
            <div className="text-slate-600 text-xs text-center py-8">Belum ada data ukuran</div>
          ) : (
            <div className="space-y-2">
              {['S','M','L','XL','XXL','XXXL'].map(size => {
                const val = ukuranCelana[size] || 0
                const maxVal = Math.max(...Object.values(ukuranCelana) as number[], 1)
                return (
                  <div key={size} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-8 font-mono">{size}</span>
                    <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded transition-all flex items-center px-2"
                        style={{ width: `${(val/maxVal)*100}%`, minWidth: val > 0 ? '32px' : '0' }}>
                        {val > 0 && <span className="text-white text-[10px] font-bold">{val}</span>}
                      </div>
                    </div>
                    <span className="text-slate-500 text-[10px] w-8 text-right">{val}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Klasemen Medali */}
      {medali.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="text-white text-sm font-medium">Top 10 Klasemen Medali</div>
            <div className="text-slate-500 text-xs mt-0.5">Update otomatis saat hasil diinput</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['#', 'Kontingen', '🥇', '🥈', '🥉', 'Total'].map(h => (
                    <th key={h} className="text-center text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {medali.map((m: any, i: number) => (
                  <tr key={m.id} className="border-b border-slate-800/40 hover:bg-slate-800/20">
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

      {/* Talent Radar placeholder */}
      <div className="bg-slate-900 border border-slate-800 border-dashed rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">🤖</div>
        <div className="text-white text-sm font-medium mb-1">AI Talent Radar</div>
        <div className="text-slate-500 text-xs">
          Analisa performa atlet dan rekomendasi pembinaan akan tersedia setelah
          data riwayat kejuaraan terkumpul dan AI credit diisi
        </div>
      </div>
    </div>
  )
}