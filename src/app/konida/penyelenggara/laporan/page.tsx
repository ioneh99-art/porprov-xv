'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, BarChart2, Calendar,
  CheckCircle, ChevronDown, Clock, Download,
  Edit3, FileText, Loader2, Plus, RefreshCw,
  Save, Send, Shield, Star, ThumbsUp, Trash2,
  TrendingUp, Users, X, Zap, Building2, Medal,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

// ─── Types ───────────────────────────────────────────────
type LaporanStatus = 'draft' | 'final' | 'terkirim'
type HighlightTipe = 'positif' | 'negatif' | 'netral'

interface LaporanHarian {
  id: number
  tanggal: string
  dibuat_oleh: string
  status: LaporanStatus
  ringkasan_umum: string
  total_pertandingan: number
  pertandingan_selesai: number
  total_atlet: number
  total_penonton: number
  venue_bermasalah: number
  incident_terbuka: number
  highlight: HighlightItem[]
  catatan_besok: string
  updated_at: string
}

interface HighlightItem {
  id: number
  tipe: HighlightTipe
  deskripsi: string
  venue?: string
  cabor?: string
}

interface MedalCount {
  kontingen: string
  emas: number
  perak: number
  perunggu: number
}

// ─── Mock Data ───────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10)

const MOCK_LAPORAN: LaporanHarian[] = [
  {
    id: 1,
    tanggal: TODAY,
    dibuat_oleh: 'Admin Klaster I',
    status: 'draft',
    ringkasan_umum: 'Hari pertama pelaksanaan PORPROV XV Klaster I Kota Bekasi berjalan dengan lancar. Seluruh venue telah beroperasi sesuai jadwal. Beberapa kendala minor telah tertangani dengan cepat oleh tim lapangan.',
    total_pertandingan: 24,
    pertandingan_selesai: 18,
    total_atlet: 1247,
    total_penonton: 3820,
    venue_bermasalah: 1,
    incident_terbuka: 2,
    catatan_besok: 'Persiapkan ekstra petugas parkir untuk laga Final Renang mulai pukul 08.00 WIB. Pastikan sound system Stadion Patriot sudah diperbaiki sebelum pertandingan dimulai.',
    updated_at: new Date().toISOString(),
    highlight: [
      { id: 1, tipe: 'positif', deskripsi: 'Atlet renang Kota Bogor berhasil memecahkan rekor PORPROV cabang 100m gaya bebas putri', cabor: 'Renang', venue: 'Kolam Renang Harapan Indah' },
      { id: 2, tipe: 'positif', deskripsi: 'Jumlah penonton melebihi target harian 20%, antusias masyarakat sangat tinggi', venue: 'Stadion Patriot' },
      { id: 3, tipe: 'negatif', deskripsi: 'Sound system tribun barat mengalami gangguan sejak pukul 14.00, sedang dalam perbaikan', venue: 'Stadion Patriot Candrabhaga', cabor: 'Atletik' },
      { id: 4, tipe: 'positif', deskripsi: 'Seluruh tim medis siaga dan tidak ada insiden medis serius sepanjang hari', venue: 'Semua Venue' },
      { id: 5, tipe: 'netral', deskripsi: 'Pertandingan Bulu Tangkis ganda putra ditunda 30 menit akibat kondisi lapangan', cabor: 'Bulu Tangkis', venue: 'GOR Bekasi Cyber Park' },
    ],
  },
  {
    id: 2,
    tanggal: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    dibuat_oleh: 'Admin Klaster I',
    status: 'terkirim',
    ringkasan_umum: 'Pelaksanaan hari pertama teknis berjalan kondusif. Venue sudah terverifikasi semua.',
    total_pertandingan: 12,
    pertandingan_selesai: 12,
    total_atlet: 980,
    total_penonton: 2100,
    venue_bermasalah: 0,
    incident_terbuka: 0,
    catatan_besok: 'Mulai pertandingan resmi pukul 07.00 WIB',
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    highlight: [
      { id: 6, tipe: 'positif', deskripsi: 'Semua venue lolos inspeksi teknis KONI', venue: 'Semua Venue' },
      { id: 7, tipe: 'positif', deskripsi: 'Pembukaan Klaster I berjalan lancar dan meriah', venue: 'Stadion Patriot' },
    ],
  },
]

const MOCK_MEDALI: MedalCount[] = [
  { kontingen: 'Kota Bogor',    emas: 5, perak: 3, perunggu: 4 },
  { kontingen: 'Kota Depok',    emas: 4, perak: 5, perunggu: 2 },
  { kontingen: 'Kota Bekasi',   emas: 3, perak: 4, perunggu: 6 },
  { kontingen: 'Kab. Bekasi',   emas: 2, perak: 2, perunggu: 3 },
  { kontingen: 'Kota Bandung',  emas: 1, perak: 3, perunggu: 5 },
]

// ─── Config ──────────────────────────────────────────────
const LAPORAN_STATUS: Record<LaporanStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:    { label: 'Draft',    color: 'text-gray-600',   bg: 'bg-gray-100',   border: 'border-gray-200' },
  final:    { label: 'Final',    color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  terkirim: { label: 'Terkirim', color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
}
const HIGHLIGHT_CONF: Record<HighlightTipe, { color: string; bg: string; border: string; icon: any; label: string }> = {
  positif: { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: ThumbsUp,     label: 'Positif'  },
  negatif: { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: AlertTriangle, label: 'Masalah' },
  netral:  { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',icon: Activity,     label: 'Netral'   },
}

// ─── Sub-components ───────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient, shadow }: {
  label: string; value: string | number; sub?: string; icon: any; gradient: string; shadow: string
}) {
  return (
    <div className="relative bg-white rounded-xl shadow-md p-4 pt-7">
      <div className={`absolute -top-5 left-4 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${gradient} ${shadow}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="text-right">
        <p className="text-xs font-light text-[#999] mb-1">{label}</p>
        <h4 className="text-2xl font-light text-[#3c4858]">{value}</h4>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function MedaliTable({ data }: { data: MedalCount[] }) {
  const sorted = [...data].sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu)
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 px-5 py-3 flex items-center gap-2">
        <Medal size={16} className="text-white" />
        <h3 className="text-white font-medium text-sm">Klasemen Medali Sementara</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">No</th>
            <th className="text-left px-5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kontingen</th>
            <th className="text-center px-4 py-2.5 text-[10px] font-bold text-yellow-500 uppercase tracking-wider">🥇</th>
            <th className="text-center px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">🥈</th>
            <th className="text-center px-4 py-2.5 text-[10px] font-bold text-orange-500 uppercase tracking-wider">🥉</th>
            <th className="text-center px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, i) => (
            <tr key={m.kontingen} className={`border-b border-gray-50 ${i === 0 ? 'bg-yellow-50/30' : 'hover:bg-gray-50/50'}`}>
              <td className="px-5 py-3 text-sm text-gray-400">{i === 0 ? '🏆' : i + 1}</td>
              <td className="px-5 py-3 text-sm font-medium text-[#3c4858]">{m.kontingen}</td>
              <td className="px-4 py-3 text-center font-bold text-yellow-600">{m.emas}</td>
              <td className="px-4 py-3 text-center font-bold text-gray-500">{m.perak}</td>
              <td className="px-4 py-3 text-center font-bold text-orange-500">{m.perunggu}</td>
              <td className="px-4 py-3 text-center font-bold text-[#3c4858]">{m.emas + m.perak + m.perunggu}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function LaporanHarian() {
  const [laporans, setLaporans] = useState<LaporanHarian[]>(MOCK_LAPORAN)
  const [selected, setSelected] = useState<LaporanHarian>(MOCK_LAPORAN[0])
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<LaporanHarian>(MOCK_LAPORAN[0])
  const [animIn, setAnimIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newHighlight, setNewHighlight] = useState<{ tipe: HighlightTipe; deskripsi: string; venue: string; cabor: string }>({
    tipe: 'positif', deskripsi: '', venue: '', cabor: '',
  })
  const [showAddHL, setShowAddHL] = useState(false)
  const [activeView, setActiveView] = useState<'laporan' | 'medali'>('laporan')

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  function selectLaporan(l: LaporanHarian) {
    setSelected(l); setDraft(l); setIsEditing(false)
  }

  function handleSave() {
    setSaving(true)
    setTimeout(() => {
      const updated = { ...draft, updated_at: new Date().toISOString() }
      setLaporans(prev => prev.map(l => l.id === updated.id ? updated : l))
      setSelected(updated)
      setIsEditing(false)
      setSaving(false)
    }, 800)
  }

  function handleFinalize() {
    const updated = { ...draft, status: 'final' as LaporanStatus, updated_at: new Date().toISOString() }
    setDraft(updated)
    setLaporans(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelected(updated)
  }

  function handleSend() {
    const updated = { ...selected, status: 'terkirim' as LaporanStatus }
    setLaporans(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelected(updated)
  }

  function handleAddHighlight() {
    if (!newHighlight.deskripsi) return
    const hl: HighlightItem = { id: Date.now(), ...newHighlight }
    setDraft(d => ({ ...d, highlight: [...d.highlight, hl] }))
    setNewHighlight({ tipe: 'positif', deskripsi: '', venue: '', cabor: '' })
    setShowAddHL(false)
  }

  function handleCreateNew() {
    const newLaporan: LaporanHarian = {
      id: Date.now(),
      tanggal: TODAY,
      dibuat_oleh: 'Admin Klaster I',
      status: 'draft',
      ringkasan_umum: '',
      total_pertandingan: 0,
      pertandingan_selesai: 0,
      total_atlet: 0,
      total_penonton: 0,
      venue_bermasalah: 0,
      incident_terbuka: 0,
      catatan_besok: '',
      updated_at: new Date().toISOString(),
      highlight: [],
    }
    setLaporans(prev => [newLaporan, ...prev])
    setSelected(newLaporan)
    setDraft(newLaporan)
    setIsEditing(true)
  }

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const cur = isEditing ? draft : selected
  const stConf = LAPORAN_STATUS[cur.status]

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 font-sans">
      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-[#3c4858]">Laporan Harian</h1>
          <p className="text-sm text-gray-400 mt-0.5">Dokumentasi & ringkasan operasional harian PORPROV XV Klaster I</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateNew}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-full shadow-md text-sm flex items-center gap-2"
          >
            <Plus size={14} /> Laporan Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* ─── Sidebar: Daftar Laporan ─── */}
        <div {...ani(40)} className="col-span-1 space-y-3">
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-hidden">
            {[{ key: 'laporan', label: 'Laporan' }, { key: 'medali', label: 'Medali' }].map(t => (
              <button key={t.key} onClick={() => setActiveView(t.key as any)}
                className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                  activeView === t.key ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3">
              <h3 className="text-white font-medium text-sm flex items-center gap-2"><FileText size={14} /> Riwayat Laporan</h3>
            </div>
            <div className="p-2 space-y-1">
              {laporans.map(l => {
                const stC = LAPORAN_STATUS[l.status]
                const isActive = selected.id === l.id
                return (
                  <button key={l.id} onClick={() => selectLaporan(l)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${isActive ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#3c4858]">
                        {new Date(l.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${stC.bg} ${stC.color} border ${stC.border}`}>
                        {stC.label}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {l.pertandingan_selesai}/{l.total_pertandingan} laga · {l.highlight.length} highlight
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(l.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="col-span-3 space-y-5">

          {activeView === 'medali' ? (
            <div {...ani(60)}><MedaliTable data={MOCK_MEDALI} /></div>
          ) : (
            <>
              {/* Laporan header bar */}
              <div {...ani(60)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-medium text-[#3c4858]">
                      Laporan {new Date(cur.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h2>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${stConf.bg} ${stConf.color} ${stConf.border}`}>
                      {stConf.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Dibuat oleh: {cur.dibuat_oleh} · Update: {new Date(cur.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      {cur.status === 'final' && (
                        <button onClick={handleSend}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg shadow-sm transition-colors">
                          <Send size={14} /> Kirim ke KONI
                        </button>
                      )}
                      {cur.status !== 'terkirim' && (
                        <button onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg shadow-sm">
                          <Edit3 size={14} /> Edit
                        </button>
                      )}
                      <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm rounded-lg">
                        <Download size={14} /> Export PDF
                      </button>
                    </>
                  ) : (
                    <>
                      {draft.status === 'draft' && (
                        <button onClick={handleFinalize}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg">
                          <CheckCircle size={14} /> Finalisasi
                        </button>
                      )}
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm rounded-lg shadow-sm">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button onClick={() => { setDraft(selected); setIsEditing(false) }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                        <X size={14} /> Batal
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* KPI Stats */}
              <div {...ani(80)} className="grid grid-cols-6 gap-4 pt-2">
                {[
                  { label: 'Laga Dijadwalkan', value: cur.total_pertandingan, icon: Calendar, gradient: 'from-blue-500 to-blue-400', shadow: 'shadow-blue-500/30' },
                  { label: 'Laga Selesai', value: cur.pertandingan_selesai, icon: CheckCircle, gradient: 'from-green-500 to-green-400', shadow: 'shadow-green-500/30' },
                  { label: 'Total Atlet', value: cur.total_atlet.toLocaleString(), icon: Users, gradient: 'from-purple-500 to-purple-400', shadow: 'shadow-purple-500/30' },
                  { label: 'Total Penonton', value: cur.total_penonton.toLocaleString(), icon: TrendingUp, gradient: 'from-orange-500 to-orange-400', shadow: 'shadow-orange-500/30' },
                  { label: 'Venue Masalah', value: cur.venue_bermasalah, icon: Building2, gradient: cur.venue_bermasalah > 0 ? 'from-red-500 to-red-400' : 'from-gray-400 to-gray-300', shadow: 'shadow-red-500/20' },
                  { label: 'Incident Terbuka', value: cur.incident_terbuka, icon: AlertTriangle, gradient: cur.incident_terbuka > 0 ? 'from-red-500 to-red-400' : 'from-gray-400 to-gray-300', shadow: 'shadow-red-500/20' },
                ].map(c => (
                  <div key={c.label} className="relative bg-white rounded-xl shadow-md p-3 pt-7">
                    <div className={`absolute -top-4 left-3 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${c.gradient} ${c.shadow}`}>
                      <c.icon size={18} className="text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-light text-[#999] mb-0.5 leading-tight">{c.label}</p>
                      <h4 className="text-xl font-light text-[#3c4858]">{c.value}</h4>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ringkasan Umum */}
              <div {...ani(100)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-[#3c4858] mb-3 flex items-center gap-2">
                  <FileText size={15} className="text-blue-500" /> Ringkasan Umum
                </h3>
                {isEditing ? (
                  <textarea
                    value={draft.ringkasan_umum}
                    onChange={e => setDraft(d => ({ ...d, ringkasan_umum: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-[#3c4858] focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 resize-y"
                    placeholder="Tuliskan ringkasan kondisi operasional hari ini..."
                  />
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">{cur.ringkasan_umum || <span className="text-gray-300 italic">Belum ada ringkasan</span>}</p>
                )}
              </div>

              {/* Stats edit jika editing */}
              {isEditing && (
                <div {...ani(110)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-[#3c4858] mb-4 flex items-center gap-2">
                    <BarChart2 size={15} className="text-purple-500" /> Update Statistik
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: 'total_pertandingan', label: 'Total Laga' },
                      { key: 'pertandingan_selesai', label: 'Laga Selesai' },
                      { key: 'total_atlet', label: 'Total Atlet' },
                      { key: 'total_penonton', label: 'Total Penonton' },
                      { key: 'venue_bermasalah', label: 'Venue Bermasalah' },
                      { key: 'incident_terbuka', label: 'Incident Terbuka' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">{f.label}</label>
                        <input
                          type="number"
                          value={(draft as any)[f.key] ?? 0}
                          onChange={e => setDraft(d => ({ ...d, [f.key]: Number(e.target.value) }))}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Highlight */}
              <div {...ani(120)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[#3c4858] flex items-center gap-2">
                    <Zap size={15} className="text-yellow-500" /> Highlight Hari Ini
                    <span className="text-xs font-normal text-gray-400">({cur.highlight.length} item)</span>
                  </h3>
                  {isEditing && (
                    <button onClick={() => setShowAddHL(true)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                      <Plus size={12} /> Tambah
                    </button>
                  )}
                </div>

                {showAddHL && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex gap-2">
                      {(['positif', 'negatif', 'netral'] as HighlightTipe[]).map(t => {
                        const c = HIGHLIGHT_CONF[t]
                        return (
                          <button key={t} onClick={() => setNewHighlight(h => ({ ...h, tipe: t }))}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                              newHighlight.tipe === t ? `${c.bg} ${c.color} ${c.border}` : 'bg-white text-gray-400 border-gray-200'
                            }`}>
                            {c.label}
                          </button>
                        )
                      })}
                    </div>
                    <textarea
                      value={newHighlight.deskripsi}
                      onChange={e => setNewHighlight(h => ({ ...h, deskripsi: e.target.value }))}
                      rows={2}
                      placeholder="Deskripsi highlight..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={newHighlight.venue} onChange={e => setNewHighlight(h => ({ ...h, venue: e.target.value }))}
                        placeholder="Venue (opsional)"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                      <input value={newHighlight.cabor} onChange={e => setNewHighlight(h => ({ ...h, cabor: e.target.value }))}
                        placeholder="Cabor (opsional)"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddHighlight} disabled={!newHighlight.deskripsi}
                        className="px-4 py-2 bg-blue-500 disabled:bg-blue-300 text-white text-sm rounded-lg">Tambah</button>
                      <button onClick={() => setShowAddHL(false)} className="px-4 py-2 bg-white text-gray-500 text-sm rounded-lg border border-gray-200">Batal</button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {cur.highlight.length === 0 ? (
                    <div className="text-center py-8 text-gray-300 text-sm">Belum ada highlight</div>
                  ) : cur.highlight.map(hl => {
                    const c = HIGHLIGHT_CONF[hl.tipe]
                    return (
                      <div key={hl.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${c.bg} ${c.border}`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c.color}`}
                          style={{ background: 'white' }}>
                          <c.icon size={14} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${c.color}`}>{hl.deskripsi}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {hl.venue && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Building2 size={9} />{hl.venue}</span>}
                            {hl.cabor && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Activity size={9} />{hl.cabor}</span>}
                          </div>
                        </div>
                        {isEditing && (
                          <button onClick={() => setDraft(d => ({ ...d, highlight: d.highlight.filter(h => h.id !== hl.id) }))}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 flex-shrink-0">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Catatan Besok */}
              <div {...ani(140)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-sm font-semibold text-[#3c4858] mb-3 flex items-center gap-2">
                  <Clock size={15} className="text-orange-500" /> Catatan untuk Hari Berikutnya
                </h3>
                {isEditing ? (
                  <textarea
                    value={draft.catatan_besok}
                    onChange={e => setDraft(d => ({ ...d, catatan_besok: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-[#3c4858] focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50 resize-y"
                    placeholder="Arahan atau persiapan yang perlu dilakukan untuk hari berikutnya..."
                  />
                ) : (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <p className="text-sm text-orange-800 leading-relaxed">{cur.catatan_besok || <span className="text-orange-300 italic">Belum ada catatan</span>}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}