'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Award, BarChart2, Calendar, CheckCircle,
  ChevronRight, Clock, Download, FileText,
  Filter, Loader2, Medal, RefreshCw, Search,
  Star, TrendingUp, Users, X, XCircle, Printer,
  Table, Eye, AlertCircle,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

// ─── Types ────────────────────────────────────────────────
type LaporanTipe = 'rekap_atlet' | 'kualifikasi' | 'kejuaraan' | 'medali' | 'statistik'

interface RekapAtlet {
  kontingen_id: number
  kontingen_nama: string
  total_atlet: number
  atlet_l: number
  atlet_p: number
  total_cabor: number
  kualifikasi_lolos: number
  kualifikasi_pending: number
  kejuaraan_verified: number
  medali_emas: number
  medali_perak: number
  medali_perunggu: number
}

interface CaborStat {
  cabor_nama: string
  total_atlet: number
  lolos: number
  pending: number
  verified_prestasi: number
}

// ─── Mock Data ────────────────────────────────────────────
const MOCK_REKAP: RekapAtlet[] = [
  { kontingen_id: 1, kontingen_nama: 'Kota Bandung',   total_atlet: 145, atlet_l: 82, atlet_p: 63, total_cabor: 28, kualifikasi_lolos: 118, kualifikasi_pending: 20, kejuaraan_verified: 210, medali_emas: 12, medali_perak: 9, medali_perunggu: 15 },
  { kontingen_id: 2, kontingen_nama: 'Kota Bogor',     total_atlet: 112, atlet_l: 65, atlet_p: 47, total_cabor: 22, kualifikasi_lolos: 98,  kualifikasi_pending: 12, kejuaraan_verified: 165, medali_emas: 8,  medali_perak: 11, medali_perunggu: 10 },
  { kontingen_id: 3, kontingen_nama: 'Kota Depok',     total_atlet: 98,  atlet_l: 55, atlet_p: 43, total_cabor: 19, kualifikasi_lolos: 82,  kualifikasi_pending: 14, kejuaraan_verified: 132, medali_emas: 6,  medali_perak: 7,  medali_perunggu: 9  },
  { kontingen_id: 4, kontingen_nama: 'Kota Bekasi',    total_atlet: 124, atlet_l: 71, atlet_p: 53, total_cabor: 25, kualifikasi_lolos: 105, kualifikasi_pending: 17, kejuaraan_verified: 188, medali_emas: 9,  medali_perak: 13, medali_perunggu: 12 },
  { kontingen_id: 5, kontingen_nama: 'Kab. Bekasi',    total_atlet: 87,  atlet_l: 50, atlet_p: 37, total_cabor: 17, kualifikasi_lolos: 70,  kualifikasi_pending: 15, kejuaraan_verified: 98,  medali_emas: 4,  medali_perak: 6,  medali_perunggu: 8  },
  { kontingen_id: 6, kontingen_nama: 'Kab. Bogor',     total_atlet: 103, atlet_l: 60, atlet_p: 43, total_cabor: 21, kualifikasi_lolos: 88,  kualifikasi_pending: 13, kejuaraan_verified: 141, medali_emas: 7,  medali_perak: 8,  medali_perunggu: 11 },
  { kontingen_id: 7, kontingen_nama: 'Kota Cimahi',    total_atlet: 72,  atlet_l: 42, atlet_p: 30, total_cabor: 15, kualifikasi_lolos: 58,  kualifikasi_pending: 12, kejuaraan_verified: 87,  medali_emas: 3,  medali_perak: 5,  medali_perunggu: 7  },
  { kontingen_id: 8, kontingen_nama: 'Kab. Cianjur',   total_atlet: 65,  atlet_l: 38, atlet_p: 27, total_cabor: 13, kualifikasi_lolos: 50,  kualifikasi_pending: 13, kejuaraan_verified: 72,  medali_emas: 2,  medali_perak: 4,  medali_perunggu: 5  },
]

const MOCK_CABOR_STAT: CaborStat[] = [
  { cabor_nama: 'Atletik',      total_atlet: 38, lolos: 28, pending: 8,  verified_prestasi: 62 },
  { cabor_nama: 'Renang',       total_atlet: 24, lolos: 18, pending: 4,  verified_prestasi: 38 },
  { cabor_nama: 'Bulu Tangkis', total_atlet: 18, lolos: 14, pending: 3,  verified_prestasi: 29 },
  { cabor_nama: 'Pencak Silat', total_atlet: 22, lolos: 16, pending: 5,  verified_prestasi: 33 },
  { cabor_nama: 'Voli',         total_atlet: 16, lolos: 12, pending: 3,  verified_prestasi: 22 },
  { cabor_nama: 'Basket',       total_atlet: 14, lolos: 10, pending: 3,  verified_prestasi: 18 },
  { cabor_nama: 'Panahan',      total_atlet: 12, lolos: 9,  pending: 2,  verified_prestasi: 15 },
  { cabor_nama: 'Karate',       total_atlet: 20, lolos: 15, pending: 4,  verified_prestasi: 28 },
]

// ─── Sub-components ───────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 w-8 text-right">{value}</span>
    </div>
  )
}

function ExportButton({
  label, icon: Icon, onClick, color,
}: { label: string; icon: any; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all hover:shadow-md ${color}`}>
      <Icon size={15} /> {label}
    </button>
  )
}

// ─── Rekap Atlet Table ────────────────────────────────────
function RekapAtletTable({ data, search }: { data: RekapAtlet[]; search: string }) {
  const filtered = data.filter(r => r.kontingen_nama.toLowerCase().includes(search.toLowerCase()))
  const totals = {
    total_atlet: filtered.reduce((a, r) => a + r.total_atlet, 0),
    atlet_l: filtered.reduce((a, r) => a + r.atlet_l, 0),
    atlet_p: filtered.reduce((a, r) => a + r.atlet_p, 0),
    lolos: filtered.reduce((a, r) => a + r.kualifikasi_lolos, 0),
    pending: filtered.reduce((a, r) => a + r.kualifikasi_pending, 0),
    emas: filtered.reduce((a, r) => a + r.medali_emas, 0),
    perak: filtered.reduce((a, r) => a + r.medali_perak, 0),
    perunggu: filtered.reduce((a, r) => a + r.medali_perunggu, 0),
  }
  const maxAtlet = Math.max(...data.map(r => r.total_atlet))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['No', 'Kontingen', 'Total Atlet', 'L/P', 'Cabor', 'Kual. Lolos', 'Pending', 'Kejuaraan ✓', '🥇', '🥈', '🥉', 'Total Medali'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={r.kontingen_id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-[#3c4858]">{r.kontingen_nama}</div>
                <div className="mt-1"><MiniBar value={r.total_atlet} max={maxAtlet} color="bg-blue-400" /></div>
              </td>
              <td className="px-4 py-3 font-bold text-[#3c4858] text-center">{r.total_atlet}</td>
              <td className="px-4 py-3 text-xs text-gray-500 text-center">
                <span className="text-blue-600 font-bold">{r.atlet_l}</span>/<span className="text-pink-600 font-bold">{r.atlet_p}</span>
              </td>
              <td className="px-4 py-3 text-center text-xs text-gray-500">{r.total_cabor}</td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{r.kualifikasi_lolos}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-bold text-orange-500">{r.kualifikasi_pending}</span>
              </td>
              <td className="px-4 py-3 text-center text-xs text-gray-500">{r.kejuaraan_verified}</td>
              <td className="px-4 py-3 text-center font-bold text-yellow-600">{r.medali_emas}</td>
              <td className="px-4 py-3 text-center font-bold text-gray-500">{r.medali_perak}</td>
              <td className="px-4 py-3 text-center font-bold text-orange-500">{r.medali_perunggu}</td>
              <td className="px-4 py-3 text-center font-bold text-[#3c4858]">{r.medali_emas + r.medali_perak + r.medali_perunggu}</td>
            </tr>
          ))}
          {/* Total row */}
          <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
            <td className="px-4 py-3" colSpan={2}><span className="text-xs text-gray-500 uppercase tracking-wider">TOTAL</span></td>
            <td className="px-4 py-3 text-center text-blue-600">{totals.total_atlet}</td>
            <td className="px-4 py-3 text-center text-xs"><span className="text-blue-600">{totals.atlet_l}</span>/<span className="text-pink-600">{totals.atlet_p}</span></td>
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3 text-center text-green-600">{totals.lolos}</td>
            <td className="px-4 py-3 text-center text-orange-500">{totals.pending}</td>
            <td className="px-4 py-3"></td>
            <td className="px-4 py-3 text-center text-yellow-600">{totals.emas}</td>
            <td className="px-4 py-3 text-center text-gray-500">{totals.perak}</td>
            <td className="px-4 py-3 text-center text-orange-500">{totals.perunggu}</td>
            <td className="px-4 py-3 text-center text-[#3c4858]">{totals.emas + totals.perak + totals.perunggu}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Cabor Stat Table ─────────────────────────────────────
function CaborStatTable({ data }: { data: CaborStat[] }) {
  const max = Math.max(...data.map(c => c.total_atlet))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['Cabang Olahraga', 'Total Atlet', 'Lolos Kual.', 'Pending', '% Lolos', 'Prestasi ✓'].map(h => (
              <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(c => {
            const pct = Math.round((c.lolos / c.total_atlet) * 100)
            return (
              <tr key={c.cabor_nama} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-[#3c4858]">{c.cabor_nama}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(c.total_atlet / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600">{c.total_atlet}</span>
                  </div>
                </td>
                <td className="px-5 py-3"><span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{c.lolos}</span></td>
                <td className="px-5 py-3 text-xs text-orange-500 font-bold">{c.pending}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-blue-400' : 'bg-orange-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-blue-600' : 'text-orange-600'}`}>{pct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-gray-500">{c.verified_prestasi}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function LaporanKonida() {
  const [activeTab, setActiveTab] = useState<LaporanTipe>('rekap_atlet')
  const [search, setSearch] = useState('')
  const [animIn, setAnimIn] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  async function handleExport(format: 'excel' | 'pdf') {
    setExporting(format)
    // Simulasi export — replace dengan jsPDF / xlsx call
    await new Promise(r => setTimeout(r, 1500))
    setExporting(null)
    // TODO: trigger download
    alert(`${format.toUpperCase()} berhasil di-generate! (Implementasi jsPDF/xlsx diperlukan)`)
  }

  const totalAtlet = MOCK_REKAP.reduce((a, r) => a + r.total_atlet, 0)
  const totalLolos = MOCK_REKAP.reduce((a, r) => a + r.kualifikasi_lolos, 0)
  const totalPending = MOCK_REKAP.reduce((a, r) => a + r.kualifikasi_pending, 0)
  const totalEmas = MOCK_REKAP.reduce((a, r) => a + r.medali_emas, 0)
  const totalVerif = MOCK_REKAP.reduce((a, r) => a + r.kejuaraan_verified, 0)

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const TABS: { key: LaporanTipe; label: string; icon: any }[] = [
    { key: 'rekap_atlet', label: 'Rekap Atlet', icon: Users },
    { key: 'kualifikasi', label: 'Kualifikasi', icon: CheckCircle },
    { key: 'kejuaraan',   label: 'Kejuaraan',   icon: Award },
    { key: 'medali',      label: 'Medali',       icon: Medal },
    { key: 'statistik',   label: 'Statistik Cabor', icon: BarChart2 },
  ]

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 font-sans space-y-6">

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#3c4858]">Laporan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Rekap lengkap data atlet, kualifikasi & prestasi PORPROV XV</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPreviewMode(p => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all ${previewMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}>
            <Eye size={14} /> {previewMode ? 'Mode Edit' : 'Preview Cetak'}
          </button>
          <ExportButton label="Export Excel" icon={Table} color="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            onClick={() => void handleExport('excel')} />
          <ExportButton label={exporting === 'pdf' ? 'Generating...' : 'Export PDF'} icon={exporting === 'pdf' ? Loader2 : Download}
            color="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            onClick={() => void handleExport('pdf')} />
        </div>
      </div>

      {/* KPI Summary */}
      <div {...ani(40)} className="grid grid-cols-5 gap-4 pt-2">
        {[
          { label: 'Total Atlet',        value: totalAtlet,  gradient: 'from-blue-500 to-blue-400',   icon: Users },
          { label: 'Lolos Kualifikasi',  value: totalLolos,  gradient: 'from-green-500 to-green-400', icon: CheckCircle },
          { label: 'Pending Review',     value: totalPending,gradient: 'from-orange-500 to-orange-400',icon: Clock },
          { label: 'Prestasi Terverif',  value: totalVerif,  gradient: 'from-purple-500 to-purple-400',icon: Award },
          { label: 'Total Medali Emas',  value: totalEmas,   gradient: 'from-yellow-500 to-orange-400',icon: Medal },
        ].map(c => (
          <div key={c.label} className="relative bg-white rounded-xl shadow-md p-4 pt-7">
            <div className={`absolute -top-5 left-4 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${c.gradient}`}>
              <c.icon size={20} className="text-white" />
            </div>
            <div className="text-right">
              <p className="text-xs font-light text-[#999] mb-1">{c.label}</p>
              <h4 className="text-2xl font-light text-[#3c4858]">{c.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div {...ani(60)} className="bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-hidden">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-inner' : 'text-gray-500 hover:bg-gray-50'
            }`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div {...ani(70)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'rekap_atlet' ? 'Cari kontingen...' : 'Cari data...'}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" />
        </div>
        <div className="text-xs text-gray-400 ml-auto">
          Terakhir diperbarui: {new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Content */}
      <div {...ani(80)} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${previewMode ? 'ring-2 ring-blue-200' : ''}`}>
        {previewMode && (
          <div className="bg-blue-50 border-b border-blue-100 px-5 py-2 flex items-center gap-2 text-xs text-blue-700">
            <Eye size={12} /> Mode Preview — Tampilan ini sesuai dengan output cetak/PDF
          </div>
        )}

        {activeTab === 'rekap_atlet' && (
          <div>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#3c4858] flex items-center gap-2">
                <Users size={16} className="text-blue-500" /> Rekap Atlet per Kontingen
              </h3>
              <span className="text-xs text-gray-400">{MOCK_REKAP.length} kontingen</span>
            </div>
            <RekapAtletTable data={MOCK_REKAP} search={search} />
          </div>
        )}

        {activeTab === 'statistik' && (
          <div>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#3c4858] flex items-center gap-2">
                <BarChart2 size={16} className="text-purple-500" /> Statistik per Cabang Olahraga
              </h3>
              <span className="text-xs text-gray-400">{MOCK_CABOR_STAT.length} cabor</span>
            </div>
            <CaborStatTable data={MOCK_CABOR_STAT} />
          </div>
        )}

        {activeTab === 'medali' && (
          <div>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-[#3c4858] flex items-center gap-2">
                <Medal size={16} className="text-yellow-500" /> Klasemen Medali per Kontingen
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Pos', 'Kontingen', '🥇 Emas', '🥈 Perak', '🥉 Perunggu', 'Total', 'Poin'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...MOCK_REKAP]
                  .sort((a, b) => b.medali_emas - a.medali_emas || b.medali_perak - a.medali_perak)
                  .map((r, i) => {
                    const total = r.medali_emas + r.medali_perak + r.medali_perunggu
                    const poin = r.medali_emas * 5 + r.medali_perak * 3 + r.medali_perunggu * 1
                    return (
                      <tr key={r.kontingen_id} className={`border-b border-gray-50 ${i === 0 ? 'bg-yellow-50/30' : 'hover:bg-gray-50/50'}`}>
                        <td className="px-5 py-3 text-sm font-bold text-gray-400">{i === 0 ? '🏆' : i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-[#3c4858]">{r.kontingen_nama}</td>
                        <td className="px-5 py-3 text-center font-bold text-yellow-600 text-lg">{r.medali_emas}</td>
                        <td className="px-5 py-3 text-center font-bold text-gray-500">{r.medali_perak}</td>
                        <td className="px-5 py-3 text-center font-bold text-orange-500">{r.medali_perunggu}</td>
                        <td className="px-5 py-3 text-center font-bold text-[#3c4858]">{total}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full">{poin} pts</span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}

        {(activeTab === 'kualifikasi' || activeTab === 'kejuaraan') && (
          <div className="py-16 text-center text-gray-400">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Laporan {activeTab === 'kualifikasi' ? 'Kualifikasi' : 'Kejuaraan'} detail tersedia di menu masing-masing.</p>
            <p className="text-xs mt-1 text-gray-300">Export dari halaman Kualifikasi / Kejuaraan untuk data lengkap.</p>
          </div>
        )}
      </div>
    </div>
  )
}