'use client'
// src/components/konida/AthleteDetailDrawer.tsx
// Drawer/modal yang nampilin profil tes fisik 1 atlet (full detail)
// Dipanggil dari TesFisikDetailReport saat klik atlet di daftar
// Pattern: fetch /api/konida/tes-fisik/atlet/[id]

import { useEffect, useState } from 'react'
import { X, Activity, Heart, Target, Award, AlertTriangle, Flame } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

const KATEGORI_COLOR: Record<string,string> = {
  'Baik Sekali':   '#10b981',
  'Baik':          '#3b82f6',
  'Cukup':         '#fbbf24',
  'Kurang':        '#f97316',
  'Kurang Sekali': '#ef4444',
}

interface Props {
  atletId: number | null
  primary: string
  onClose: () => void
}

export default function AthleteDetailDrawer({ atletId, primary, onClose }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!atletId) return
    setLoading(true)
    setData(null)
    fetch(`/api/konida/tes-fisik/atlet/${atletId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [atletId])

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!atletId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="w-full max-w-4xl h-full overflow-y-auto relative"
        style={{ background: '#020915', borderLeft: `2px solid ${primary}` }}
        onClick={e => e.stopPropagation()}>

        {/* Decorative radial glow */}
        <div className="absolute top-[-100px] right-[-100px] w-80 h-80 rounded-full opacity-15 pointer-events-none"
          style={{ background: `radial-gradient(circle,${primary},transparent 70%)` }}/>
        <div className="absolute bottom-[-80px] left-[-80px] w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(circle,${primary},transparent 70%)` }}/>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between relative"
          style={{ background: 'rgba(2,9,21,0.95)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${primary}40` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${primary}20`, border: `1px solid ${primary}40` }}>
              <Activity size={18} style={{ color: primary }}/>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Profil Tes Biomotorik</h2>
              <p className="text-slate-400 text-[10px] tracking-wide uppercase">Detail per Atlet</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-800 flex items-center justify-center transition">
            <X size={18} className="text-slate-400"/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 relative">
          {loading && <div className="text-center text-slate-400 py-12">Memuat profil atlet...</div>}

          {!loading && !data && (
            <div className="text-center text-red-400 py-12">Gagal memuat data atlet</div>
          )}

          {!loading && data && !data.has_data && (
            <div className="rounded-xl p-5 text-center"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
              <AlertTriangle size={32} className="text-amber-400 mx-auto mb-2"/>
              <h3 className="text-amber-300 font-bold text-sm">Belum Ada Data Tes Fisik</h3>
              <p className="text-slate-400 text-xs mt-2">
                {data.atlet?.nama_lengkap} belum mengikuti tes biomotorik.
              </p>
            </div>
          )}

          {!loading && data?.has_data && <AthleteProfile data={data} primary={primary}/>}
        </div>
      </div>
    </div>
  )
}

// ── Inner profile component ──
function AthleteProfile({ data, primary }: { data: any; primary: string }) {
  const latest = data.sessions[0]
  const insights = data.insights
  const radarData = (latest.items || []).map((i: any) => ({
    komponen: i.komponen, capaian: i.capaian_persen, fullMark: 100,
  }))
  const history = [...data.sessions].reverse().map((s: any) => ({
    tahap: `Tahap ${s.tahap}`, persen: s.kesimpulan_persen || 0,
  }))

  return (
    <>
      {/* Identitas */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${primary}30` }}>
        <h3 className="text-white text-lg font-bold">{data.atlet.nama_lengkap}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
          <span>NIK: <span className="text-slate-200 font-mono">{data.atlet.no_ktp}</span></span>
          <span>Cabor: <span className="text-slate-200">{data.atlet.cabor_nama_raw || '-'}</span></span>
          <span>Gender: <span className="text-slate-200">{data.atlet.gender}</span></span>
          {latest.cabor_nama && latest.cabor_nama !== data.atlet.cabor_nama_raw && (
            <span className="text-amber-400">Tes cabor: {latest.cabor_nama}</span>
          )}
        </div>
        {data.atlet.tgl_lahir && (
          <div className="text-xs text-slate-400 mt-1">
            Tgl Lahir: <span className="text-slate-200">{data.atlet.tgl_lahir}</span>
          </div>
        )}
      </div>

      {/* Ringkasan eksekutif */}
      {insights?.status === 'ok' && (
        <div className="rounded-xl p-4"
          style={{ background: `${primary}10`, border: `1px solid ${primary}40` }}>
          <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: primary }}>
            Ringkasan Kondisi Fisik
          </div>
          <p className="text-sm text-slate-200">
            Skor overall <span className="font-bold" style={{ color: KATEGORI_COLOR[insights.overall_kategori] }}>
              {insights.overall_persen}% — {insights.overall_kategori}
            </span>.
            {insights.all_excellent ? (
              <span className="ml-1 text-emerald-300">🎉 Semua komponen excellent. Pertahankan!</span>
            ) : (
              <> Fokus latihan: {insights.rekomendasi.map((r: any, i: number) => (
                <span key={i} className="font-semibold" style={{ color: '#fb923c' }}>
                  {i > 0 ? ', ' : ' '}{r.komponen}
                </span>
              ))}.</>
            )}
          </p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Skor Overall" value={`${latest.kesimpulan_persen}%`}
          sub={latest.kesimpulan_kategori}
          color={KATEGORI_COLOR[latest.kesimpulan_kategori || ''] || primary}/>
        <Kpi label="BMI" value={latest.bmi?.toFixed(1) || '—'}
          sub={insights?.bmi_status?.kategori || '—'}
          color={
            insights?.bmi_status?.color === 'green'  ? '#10b981' :
            insights?.bmi_status?.color === 'red'    ? '#ef4444' :
            insights?.bmi_status?.color === 'orange' ? '#f97316' : '#fbbf24'
          }/>
        <Kpi label="Berat" value={`${latest.berat_badan} kg`} sub="Antropometri" color="#22d3ee"/>
        <Kpi label="Tinggi" value={`${latest.tinggi_badan} cm`} sub="Antropometri" color="#22d3ee"/>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-3">
        <Box title="Profil Komponen Fisik" primary={primary} icon={Target}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b"/>
              <PolarAngleAxis dataKey="komponen" tick={{ fill: '#94a3b8', fontSize: 10 }}/>
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }}/>
              <Radar dataKey="capaian" stroke={primary} fill={primary} fillOpacity={0.45}/>
            </RadarChart>
          </ResponsiveContainer>
        </Box>

        <Box title="Komponen Terkuat & Terlemah" primary={primary} icon={Award}>
          <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mt-1 mb-2">
            🏆 Top 3 Terkuat
          </div>
          <div className="space-y-1.5">
            {insights?.strongest_components?.map((c: any, i: number) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-200">{c.komponen}</span>
                <span className="text-emerald-400 font-bold">{c.capaian_persen}%</span>
              </div>
            ))}
          </div>
          {insights?.weakest_components?.length > 0 ? (
            <>
              <div className="text-[10px] uppercase tracking-wider text-orange-400 font-bold mt-3 mb-2">
                🎯 Top 3 Perlu Latihan
              </div>
              <div className="space-y-1.5">
                {insights.weakest_components.map((c: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-200">{c.komponen}</span>
                    <span className="text-orange-400 font-bold">{c.capaian_persen}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-emerald-300 italic">
              🎉 Semua komponen excellent. Pertahankan!
            </div>
          )}
        </Box>
      </div>

      {/* Progress (kalau ada multi-tahap) */}
      {history.length > 1 && (
        <Box title="Progress Multi-Tahap" primary={primary} icon={Flame}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3"/>
              <XAxis dataKey="tahap" stroke="#94a3b8"/>
              <YAxis domain={[0, 100]} stroke="#94a3b8"/>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}/>
              <Line type="monotone" dataKey="persen" stroke={primary} strokeWidth={3}
                dot={{ fill: primary, r: 5 }}/>
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Detail items */}
      <Box title="Detail Item Tes" primary={primary} icon={Activity}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-2 text-left font-medium uppercase tracking-wider">Komponen</th>
                <th className="p-2 text-left font-medium uppercase tracking-wider">Item</th>
                <th className="p-2 text-right font-medium uppercase tracking-wider">Hasil</th>
                <th className="p-2 text-right font-medium uppercase tracking-wider">Norma</th>
                <th className="p-2 text-right font-medium uppercase tracking-wider">Capaian</th>
                <th className="p-2 text-left font-medium uppercase tracking-wider">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {latest.items?.map((it: any, idx: number) => (
                <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                  <td className="p-2" style={{ color: primary }}>{it.komponen}</td>
                  <td className="p-2 text-slate-200">{it.item_tes}</td>
                  <td className="p-2 text-right font-mono text-slate-200">{it.hasil_nilai} {it.hasil_satuan}</td>
                  <td className="p-2 text-right font-mono text-slate-500">{it.norma_nilai} {it.norma_satuan}</td>
                  <td className="p-2 text-right font-bold text-slate-100">{it.capaian_persen}%</td>
                  <td className="p-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        background: `${KATEGORI_COLOR[it.kategori] || primary}20`,
                        color: KATEGORI_COLOR[it.kategori] || primary,
                      }}>
                      {it.kategori}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      {/* Rekomendasi */}
      {insights?.rekomendasi?.length > 0 && (
        <div className="rounded-xl p-4"
          style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)' }}>
          <div className="text-orange-300 text-[10px] uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
            <Target size={12}/> Rekomendasi Latihan Fokus
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {insights.rekomendasi.map((r: any, i: number) => (
              <div key={i} className="rounded-lg p-3"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <div className="text-[10px] uppercase tracking-wider text-orange-400 font-bold">
                  {r.komponen} · {r.capaian}%
                </div>
                <div className="text-sm font-semibold text-white mt-1">{r.item}</div>
                <div className="text-[11px] text-slate-400 mt-2">{r.fokus}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="text-center text-[10px] text-slate-500 tracking-wider uppercase pt-3">
        {latest.lembaga_penguji} · Penanggung jawab: {latest.penanggung_jawab}
      </div>
    </>
  )
}

function Kpi({ label, value, sub, color }: any) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</div>
      <div className="mt-1 text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  )
}

function Box({ title, primary, icon: Icon, children }: any) {
  return (
    <div className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={12} style={{ color: primary }}/>}
        <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: primary }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}
