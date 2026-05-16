'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Award, CheckCircle, ChevronDown, ChevronRight,
  Clock, Download, Edit3, Filter, Loader2,
  Plus, RefreshCw, Search, Target, TrendingUp,
  Users, X, XCircle, AlertCircle, BarChart2, Medal,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

// ─── Types ────────────────────────────────────────────────
type KualStatus = 'lolos' | 'tidak_lolos' | 'pending' | 'cadangan'
type Gender = 'L' | 'P'

interface Atlet {
  id: number
  nama: string
  gender: Gender
  tgl_lahir?: string
  kontingen_id?: number
  kontingen_nama?: string
  cabor_id?: number
  cabor_nama?: string
  nomor_pertandingan?: string
  status_kualifikasi: KualStatus
  nilai_kualifikasi?: number
  catatan?: string
  verified: boolean
}

interface CaborKualifikasi {
  cabor_id: number
  cabor_nama: string
  kuota_l: number
  kuota_p: number
  terisi_l: number
  terisi_p: number
  total_pendaftar: number
  atlet: Atlet[]
}

interface Kontingen {
  id: number
  nama: string
}

// ─── Mock Data ────────────────────────────────────────────
const MOCK_CABORS: CaborKualifikasi[] = [
  {
    cabor_id: 1, cabor_nama: 'Atletik',
    kuota_l: 12, kuota_p: 10, terisi_l: 9, terisi_p: 7, total_pendaftar: 38,
    atlet: [
      { id: 1, nama: 'Rizky Pratama', gender: 'L', kontingen_nama: 'Kota Bandung', cabor_nama: 'Atletik', nomor_pertandingan: '100m Putra', status_kualifikasi: 'lolos', nilai_kualifikasi: 92, verified: true },
      { id: 2, nama: 'Siti Rahayu', gender: 'P', kontingen_nama: 'Kota Bogor', cabor_nama: 'Atletik', nomor_pertandingan: '200m Putri', status_kualifikasi: 'lolos', nilai_kualifikasi: 88, verified: true },
      { id: 3, nama: 'Dandi Kusuma', gender: 'L', kontingen_nama: 'Kota Depok', cabor_nama: 'Atletik', nomor_pertandingan: '400m Putra', status_kualifikasi: 'pending', nilai_kualifikasi: 75, verified: false },
      { id: 4, nama: 'Maya Sari', gender: 'P', kontingen_nama: 'Kab. Bekasi', cabor_nama: 'Atletik', nomor_pertandingan: 'Lompat Jauh Putri', status_kualifikasi: 'cadangan', nilai_kualifikasi: 71, verified: true },
      { id: 5, nama: 'Hendra Wijaya', gender: 'L', kontingen_nama: 'Kota Bekasi', cabor_nama: 'Atletik', nomor_pertandingan: '100m Putra', status_kualifikasi: 'tidak_lolos', nilai_kualifikasi: 58, verified: true },
    ],
  },
  {
    cabor_id: 2, cabor_nama: 'Renang',
    kuota_l: 8, kuota_p: 8, terisi_l: 8, terisi_p: 6, total_pendaftar: 24,
    atlet: [
      { id: 6, nama: 'Aldo Setiawan', gender: 'L', kontingen_nama: 'Kota Bandung', cabor_nama: 'Renang', nomor_pertandingan: '100m Gaya Bebas', status_kualifikasi: 'lolos', nilai_kualifikasi: 95, verified: true },
      { id: 7, nama: 'Putri Cahaya', gender: 'P', kontingen_nama: 'Kab. Bogor', cabor_nama: 'Renang', nomor_pertandingan: '200m Gaya Kupu', status_kualifikasi: 'lolos', nilai_kualifikasi: 91, verified: true },
      { id: 8, nama: 'Bima Saputra', gender: 'L', kontingen_nama: 'Kota Cimahi', cabor_nama: 'Renang', nomor_pertandingan: '50m Gaya Bebas', status_kualifikasi: 'pending', nilai_kualifikasi: 82, verified: false },
    ],
  },
  {
    cabor_id: 3, cabor_nama: 'Bulu Tangkis',
    kuota_l: 6, kuota_p: 6, terisi_l: 5, terisi_p: 4, total_pendaftar: 18,
    atlet: [
      { id: 9, nama: 'Kevin Santoso', gender: 'L', kontingen_nama: 'Kota Bandung', cabor_nama: 'Bulu Tangkis', nomor_pertandingan: 'Tunggal Putra', status_kualifikasi: 'lolos', nilai_kualifikasi: 97, verified: true },
      { id: 10, nama: 'Rini Permata', gender: 'P', kontingen_nama: 'Kota Bogor', cabor_nama: 'Bulu Tangkis', nomor_pertandingan: 'Tunggal Putri', status_kualifikasi: 'lolos', nilai_kualifikasi: 89, verified: true },
    ],
  },
  {
    cabor_id: 4, cabor_nama: 'Pencak Silat',
    kuota_l: 10, kuota_p: 8, terisi_l: 6, terisi_p: 5, total_pendaftar: 22,
    atlet: [
      { id: 11, nama: 'Agus Rahmat', gender: 'L', kontingen_nama: 'Kab. Ciamis', cabor_nama: 'Pencak Silat', nomor_pertandingan: 'Kelas C Putra', status_kualifikasi: 'lolos', nilai_kualifikasi: 86, verified: true },
      { id: 12, nama: 'Dewi Anggraini', gender: 'P', kontingen_nama: 'Kota Tasik', cabor_nama: 'Pencak Silat', nomor_pertandingan: 'Kelas B Putri', status_kualifikasi: 'pending', nilai_kualifikasi: 79, verified: false },
    ],
  },
]

const MOCK_KONTINGENS: Kontingen[] = [
  { id: 1, nama: 'Kota Bandung' },
  { id: 2, nama: 'Kota Bogor' },
  { id: 3, nama: 'Kota Depok' },
  { id: 4, nama: 'Kota Bekasi' },
  { id: 5, nama: 'Kab. Bekasi' },
  { id: 6, nama: 'Kab. Bogor' },
]

// ─── Config ───────────────────────────────────────────────
const KUAL_STATUS: Record<KualStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  lolos:       { label: 'Lolos',       color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle },
  tidak_lolos: { label: 'Tidak Lolos', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: XCircle },
  pending:     { label: 'Pending',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',icon: Clock },
  cadangan:    { label: 'Cadangan',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  icon: AlertCircle },
}

// ─── Sub-components ───────────────────────────────────────
function KuotaBar({ used, total, label, color }: { used: number; total: number; label: string; color: string }) {
  const pct = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0
  const isFull = pct >= 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 w-3">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold w-10 text-right ${isFull ? 'text-red-600' : 'text-gray-600'}`}>
        {used}/{total}
      </span>
    </div>
  )
}

function NilaiBadge({ nilai }: { nilai?: number }) {
  if (!nilai) return <span className="text-gray-300 text-xs">—</span>
  const color = nilai >= 90 ? 'text-green-600 bg-green-50' : nilai >= 75 ? 'text-blue-600 bg-blue-50' : nilai >= 60 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{nilai}</span>
}

function AtletRow({
  atlet, onEdit,
}: { atlet: Atlet; onEdit: (a: Atlet) => void }) {
  const st = KUAL_STATUS[atlet.status_kualifikasi]
  return (
    <div className={`grid gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50/50 items-center text-sm ${
      atlet.status_kualifikasi === 'lolos' ? 'bg-green-50/10' : atlet.status_kualifikasi === 'tidak_lolos' ? 'bg-red-50/10' : ''
    }`}
      style={{ gridTemplateColumns: '1fr 5rem 1fr 6rem 5rem 5rem 2rem' }}>
      <div>
        <div className="font-medium text-[#3c4858]">{atlet.nama}</div>
        <div className="text-xs text-gray-400 mt-0.5">{atlet.kontingen_nama}</div>
      </div>
      <div className="text-xs text-center">
        <span className={`px-2 py-0.5 rounded-full font-bold ${atlet.gender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
          {atlet.gender === 'L' ? '♂ Putra' : '♀ Putri'}
        </span>
      </div>
      <div className="text-xs text-gray-500 truncate">{atlet.nomor_pertandingan ?? '—'}</div>
      <div>
        <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit ${st.bg} ${st.color} ${st.border}`}>
          <st.icon size={10} /> {st.label}
        </span>
      </div>
      <div className="text-center"><NilaiBadge nilai={atlet.nilai_kualifikasi} /></div>
      <div className="text-center">
        {atlet.verified
          ? <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">✓ Verified</span>
          : <span className="text-[10px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-bold">Pending</span>}
      </div>
      <button onClick={() => onEdit(atlet)} className="w-7 h-7 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center">
        <Edit3 size={12} className="text-gray-400" />
      </button>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────
function EditModal({ atlet, onClose, onSave }: { atlet: Atlet; onClose: () => void; onSave: (a: Atlet) => void }) {
  const [form, setForm] = useState(atlet)
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-medium">Edit Status Kualifikasi</h3>
          <button onClick={onClose}><X size={18} className="text-blue-100" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="font-semibold text-[#3c4858]">{form.nama}</div>
            <div className="text-sm text-gray-400 mt-0.5">{form.kontingen_nama} · {form.cabor_nama}</div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status Kualifikasi</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(KUAL_STATUS) as [KualStatus, any][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setForm(f => ({ ...f, status_kualifikasi: k }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.status_kualifikasi === k ? `${v.bg} ${v.color} ${v.border}` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <v.icon size={14} /> {v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Nilai Kualifikasi (0–100)</label>
            <input
              type="number" min={0} max={100}
              value={form.nilai_kualifikasi ?? ''}
              onChange={e => setForm(f => ({ ...f, nilai_kualifikasi: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="verified" checked={form.verified}
              onChange={e => setForm(f => ({ ...f, verified: e.target.checked }))}
              className="w-4 h-4 text-blue-500 rounded" />
            <label htmlFor="verified" className="text-sm text-gray-600">Tandai sebagai Verified</label>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Catatan</label>
            <textarea
              value={form.catatan ?? ''}
              onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
              rows={2} placeholder="Catatan tambahan..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 resize-none"
            />
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button>
          <button onClick={() => { onSave(form); onClose() }}
            className="px-5 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md">
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function KualifikasiAtlet() {
  const [cabors, setCabors] = useState<CaborKualifikasi[]>(MOCK_CABORS)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<KualStatus | 'semua'>('semua')
  const [filterCabor, setFilterCabor] = useState<number | 'semua'>('semua')
  const [expandedCabor, setExpandedCabor] = useState<number | null>(1)
  const [editAtlet, setEditAtlet] = useState<Atlet | null>(null)
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  const allAtlets = useMemo(() => cabors.flatMap(c => c.atlet), [cabors])

  const filteredAtlets = useMemo(() => {
    let r = allAtlets
    if (search) r = r.filter(a => a.nama.toLowerCase().includes(search.toLowerCase()) || (a.kontingen_nama ?? '').toLowerCase().includes(search.toLowerCase()))
    if (filterStatus !== 'semua') r = r.filter(a => a.status_kualifikasi === filterStatus)
    if (filterCabor !== 'semua') r = r.filter(a => a.cabor_id === filterCabor)
    return r
  }, [allAtlets, search, filterStatus, filterCabor])

  const summary = useMemo(() => ({
    total: allAtlets.length,
    lolos: allAtlets.filter(a => a.status_kualifikasi === 'lolos').length,
    pending: allAtlets.filter(a => a.status_kualifikasi === 'pending').length,
    tidak_lolos: allAtlets.filter(a => a.status_kualifikasi === 'tidak_lolos').length,
    cadangan: allAtlets.filter(a => a.status_kualifikasi === 'cadangan').length,
    verified: allAtlets.filter(a => a.verified).length,
    totalKuota: cabors.reduce((a, c) => a + c.kuota_l + c.kuota_p, 0),
    terisi: cabors.reduce((a, c) => a + c.terisi_l + c.terisi_p, 0),
  }), [allAtlets, cabors])

  function handleSaveAtlet(updated: Atlet) {
    setCabors(prev => prev.map(c => ({
      ...c,
      atlet: c.atlet.map(a => a.id === updated.id ? updated : a),
    })))
  }

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 font-sans space-y-6">

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#3c4858]">Kualifikasi Atlet</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manajemen status kualifikasi & kuota per cabang olahraga PORPROV XV</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full text-sm text-gray-600 flex items-center gap-2 shadow-sm">
            <Download size={14} /> Export Excel
          </button>
          <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-md">
            <Plus size={14} /> Tambah Atlet
          </button>
        </div>
      </div>

      {/* KPI */}
      <div {...ani(40)} className="grid grid-cols-6 gap-4 pt-2">
        {[
          { label: 'Total Pendaftar', value: summary.total, gradient: 'from-blue-500 to-blue-400', icon: Users },
          { label: 'Lolos Kualifikasi', value: summary.lolos, gradient: 'from-green-500 to-green-400', icon: CheckCircle },
          { label: 'Pending Review', value: summary.pending, gradient: 'from-orange-500 to-orange-400', icon: Clock },
          { label: 'Tidak Lolos', value: summary.tidak_lolos, gradient: 'from-red-500 to-red-400', icon: XCircle },
          { label: 'Cadangan', value: summary.cadangan, gradient: 'from-purple-500 to-purple-400', icon: AlertCircle },
          { label: 'Kuota Terisi', value: `${summary.terisi}/${summary.totalKuota}`, gradient: 'from-cyan-500 to-cyan-400', icon: Target },
        ].map(c => (
          <div key={c.label} className="relative bg-white rounded-xl shadow-md p-3 pt-7">
            <div className={`absolute -top-4 left-3 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${c.gradient}`}>
              <c.icon size={18} className="text-white" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 mb-0.5">{c.label}</p>
              <h4 className="text-xl font-light text-[#3c4858]">{c.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div {...ani(60)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atlet / kontingen..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" />
        </div>
        <select value={filterCabor} onChange={e => setFilterCabor(e.target.value === 'semua' ? 'semua' : Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 outline-none">
          <option value="semua">Semua Cabor</option>
          {cabors.map(c => <option key={c.cabor_id} value={c.cabor_id}>{c.cabor_nama}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {(['semua', 'lolos', 'pending', 'cadangan', 'tidak_lolos'] as const).map(s => {
            const conf = s === 'semua' ? { label: 'Semua', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' } : KUAL_STATUS[s]
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filterStatus === s ? `${conf.bg} ${conf.color} ${conf.border} font-bold` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}>
                {conf.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Mode 1: Filter aktif → tampil flat list ─── */}
      {(search || filterStatus !== 'semua' || filterCabor !== 'semua') ? (
        <div {...ani(80)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
            style={{ gridTemplateColumns: '1fr 5rem 1fr 6rem 5rem 5rem 2rem' }}>
            <div>Atlet / Kontingen</div><div className="text-center">Gender</div>
            <div>Nomor</div><div>Status</div><div className="text-center">Nilai</div>
            <div className="text-center">Verifikasi</div><div></div>
          </div>
          {filteredAtlets.length === 0
            ? <div className="py-16 text-center text-gray-400 text-sm">Tidak ada atlet ditemukan</div>
            : filteredAtlets.map(a => <AtletRow key={a.id} atlet={a} onEdit={setEditAtlet} />)}
        </div>
      ) : (
        /* ─── Mode 2: Default → accordion per cabor ─── */
        <div className="space-y-4">
          {cabors.map((c, ci) => {
            const isOpen = expandedCabor === c.cabor_id
            const cLolos = c.atlet.filter(a => a.status_kualifikasi === 'lolos').length
            const cPending = c.atlet.filter(a => a.status_kualifikasi === 'pending').length
            const cMasalah = c.atlet.filter(a => a.status_kualifikasi === 'tidak_lolos').length
            const pctKuota = Math.round(((c.terisi_l + c.terisi_p) / (c.kuota_l + c.kuota_p)) * 100)

            return (
              <div key={c.cabor_id} {...ani(80 + ci * 30)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Accordion Header */}
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedCabor(isOpen ? null : c.cabor_id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-[#3c4858]">{c.cabor_nama}</h3>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full">{c.total_pendaftar} pendaftar</span>
                      {cPending > 0 && <span className="text-xs bg-orange-100 text-orange-600 px-2.5 py-0.5 rounded-full font-bold">{cPending} pending</span>}
                    </div>
                    <div className="flex items-center gap-6 mt-2">
                      <KuotaBar used={c.terisi_l} total={c.kuota_l} label="L" color="bg-blue-400" />
                      <KuotaBar used={c.terisi_p} total={c.kuota_p} label="P" color="bg-pink-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600 font-bold">✓{cLolos}</span>
                      <span className="text-orange-500 font-bold">⏳{cPending}</span>
                      {cMasalah > 0 && <span className="text-red-500 font-bold">✗{cMasalah}</span>}
                    </div>
                    <div className="w-12 text-right">
                      <span className={`text-xs font-bold ${pctKuota >= 100 ? 'text-red-600' : 'text-gray-500'}`}>{pctKuota}%</span>
                    </div>
                    {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <div className="grid gap-3 px-5 py-2.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ gridTemplateColumns: '1fr 5rem 1fr 6rem 5rem 5rem 2rem' }}>
                      <div>Atlet / Kontingen</div><div className="text-center">Gender</div>
                      <div>Nomor</div><div>Status</div><div className="text-center">Nilai</div>
                      <div className="text-center">Verifikasi</div><div></div>
                    </div>
                    {c.atlet.map(a => <AtletRow key={a.id} atlet={a} onEdit={setEditAtlet} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editAtlet && (
        <EditModal atlet={editAtlet} onClose={() => setEditAtlet(null)} onSave={handleSaveAtlet} />
      )}
    </div>
  )
}