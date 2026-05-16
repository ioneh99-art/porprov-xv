'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Award, Calendar, CheckCircle, ChevronDown, Clock,
  Download, Edit3, ExternalLink, Eye, FileText,
  Filter, Loader2, Medal, Plus, RefreshCw, Search,
  Star, ThumbsUp, Upload, Users, X, XCircle, AlertCircle,
  TrendingUp, Shield,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

// ─── Types ────────────────────────────────────────────────
type VerifStatus = 'verified' | 'pending' | 'ditolak' | 'revisi'
type TingkatKejuaraan = 'nasional' | 'provinsi' | 'kabkota' | 'internasional'
type MedaliJenis = 'emas' | 'perak' | 'perunggu' | 'juara_harapan' | null

interface Atlet {
  id: number
  nama: string
  gender: 'L' | 'P'
  kontingen_nama?: string
  cabor_nama?: string
}

interface Kejuaraan {
  id: number
  atlet_id: number
  atlet_nama: string
  atlet_kontingen?: string
  cabor_nama?: string
  nama_kejuaraan: string
  tingkat: TingkatKejuaraan
  tahun: number
  medali: MedaliJenis
  nomor_lomba?: string
  penyelenggara?: string
  status_verifikasi: VerifStatus
  bukti_url?: string
  catatan_operator?: string
  created_at: string
}

// ─── Mock Data ────────────────────────────────────────────
const MOCK_KEJUARAAN: Kejuaraan[] = [
  { id: 1, atlet_id: 1, atlet_nama: 'Rizky Pratama', atlet_kontingen: 'Kota Bandung', cabor_nama: 'Atletik', nama_kejuaraan: 'Kejurnas Atletik 2024', tingkat: 'nasional', tahun: 2024, medali: 'emas', nomor_lomba: '100m Putra', penyelenggara: 'PASI', status_verifikasi: 'verified', bukti_url: '/bukti/1.pdf', created_at: '2024-12-01' },
  { id: 2, atlet_id: 2, atlet_nama: 'Siti Rahayu', atlet_kontingen: 'Kota Bogor', cabor_nama: 'Atletik', nama_kejuaraan: 'Porprov Jabar 2022', tingkat: 'provinsi', tahun: 2022, medali: 'perak', nomor_lomba: '200m Putri', penyelenggara: 'KONI Jabar', status_verifikasi: 'verified', created_at: '2024-11-15' },
  { id: 3, atlet_id: 3, atlet_nama: 'Dandi Kusuma', atlet_kontingen: 'Kota Depok', cabor_nama: 'Atletik', nama_kejuaraan: 'Kejurda Atletik 2024', tingkat: 'kabkota', tahun: 2024, medali: 'emas', nomor_lomba: '400m Putra', penyelenggara: 'PASI Kota Depok', status_verifikasi: 'pending', created_at: '2025-01-10' },
  { id: 4, atlet_id: 6, atlet_nama: 'Aldo Setiawan', atlet_kontingen: 'Kota Bandung', cabor_nama: 'Renang', nama_kejuaraan: 'PON XX Papua 2021', tingkat: 'nasional', tahun: 2021, medali: 'perak', nomor_lomba: '100m Gaya Bebas', penyelenggara: 'PRSI', status_verifikasi: 'verified', created_at: '2024-10-20' },
  { id: 5, atlet_id: 9, atlet_nama: 'Kevin Santoso', atlet_kontingen: 'Kota Bandung', cabor_nama: 'Bulu Tangkis', nama_kejuaraan: 'Kejurnas BT U-23 2024', tingkat: 'nasional', tahun: 2024, medali: 'emas', nomor_lomba: 'Tunggal Putra', penyelenggara: 'PBSI', status_verifikasi: 'verified', bukti_url: '/bukti/5.pdf', created_at: '2025-01-05' },
  { id: 6, atlet_id: 7, atlet_nama: 'Putri Cahaya', atlet_kontingen: 'Kab. Bogor', cabor_nama: 'Renang', nama_kejuaraan: 'Kejurnas Renang 2023', tingkat: 'nasional', tahun: 2023, medali: 'perunggu', nomor_lomba: '200m Gaya Kupu', penyelenggara: 'PRSI', status_verifikasi: 'revisi', catatan_operator: 'Bukti scan kurang jelas, mohon upload ulang', created_at: '2025-01-08' },
  { id: 7, atlet_id: 11, atlet_nama: 'Agus Rahmat', atlet_kontingen: 'Kab. Ciamis', cabor_nama: 'Pencak Silat', nama_kejuaraan: 'Kejurnas Silat 2024', tingkat: 'nasional', tahun: 2024, medali: 'emas', nomor_lomba: 'Kelas C Putra', penyelenggara: 'IPSI', status_verifikasi: 'pending', created_at: '2025-01-12' },
  { id: 8, atlet_id: 4, atlet_nama: 'Maya Sari', atlet_kontingen: 'Kab. Bekasi', cabor_nama: 'Atletik', nama_kejuaraan: 'O2SN Tingkat Provinsi 2023', tingkat: 'provinsi', tahun: 2023, medali: 'perak', nomor_lomba: 'Lompat Jauh Putri', penyelenggara: 'Dinas Pendidikan Jabar', status_verifikasi: 'ditolak', catatan_operator: 'Kejuaraan tidak masuk dalam daftar yang diakui KONI', created_at: '2025-01-03' },
]

// ─── Config ───────────────────────────────────────────────
const VERIF_STATUS: Record<VerifStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  verified: { label: 'Verified',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle },
  pending:  { label: 'Pending',   color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',icon: Clock },
  revisi:   { label: 'Revisi',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  icon: AlertCircle },
  ditolak:  { label: 'Ditolak',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   icon: XCircle },
}
const TINGKAT: Record<TingkatKejuaraan, { label: string; color: string; bg: string; poin: number }> = {
  internasional: { label: 'Internasional', color: 'text-purple-700', bg: 'bg-purple-50', poin: 100 },
  nasional:      { label: 'Nasional',      color: 'text-blue-700',   bg: 'bg-blue-50',   poin: 75  },
  provinsi:      { label: 'Provinsi',      color: 'text-cyan-700',   bg: 'bg-cyan-50',   poin: 50  },
  kabkota:       { label: 'Kab/Kota',      color: 'text-gray-700',   bg: 'bg-gray-100',  poin: 25  },
}
const MEDALI_CONF: Record<string, { label: string; icon: string; color: string }> = {
  emas:         { label: 'Emas',         icon: '🥇', color: 'text-yellow-600' },
  perak:        { label: 'Perak',        icon: '🥈', color: 'text-gray-500'   },
  perunggu:     { label: 'Perunggu',     icon: '🥉', color: 'text-orange-600' },
  juara_harapan:{ label: 'Jrp. Harapan',icon: '🏅', color: 'text-blue-500'   },
}

// ─── Modal Tambah/Edit ────────────────────────────────────
function KejuaraanModal({
  data, onClose, onSave,
}: { data?: Kejuaraan | null; onClose: () => void; onSave: (k: Partial<Kejuaraan>) => void }) {
  const [form, setForm] = useState<Partial<Kejuaraan>>(data ?? {
    nama_kejuaraan: '', tingkat: 'provinsi', tahun: new Date().getFullYear(),
    medali: 'emas', nomor_lomba: '', penyelenggara: '', status_verifikasi: 'pending',
  })
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-medium text-lg">{data ? 'Edit Kejuaraan' : 'Tambah Riwayat Kejuaraan'}</h3>
          <button onClick={onClose}><X size={18} className="text-yellow-100" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nama Kejuaraan</label>
            <input value={form.nama_kejuaraan ?? ''} onChange={e => setForm(f => ({ ...f, nama_kejuaraan: e.target.value }))}
              placeholder="Contoh: Kejurnas Atletik 2024"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Tingkat</label>
              <select value={form.tingkat} onChange={e => setForm(f => ({ ...f, tingkat: e.target.value as TingkatKejuaraan }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50">
                {Object.entries(TINGKAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Tahun</label>
              <input type="number" value={form.tahun ?? ''} onChange={e => setForm(f => ({ ...f, tahun: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Medali / Juara</label>
              <select value={form.medali ?? ''} onChange={e => setForm(f => ({ ...f, medali: e.target.value as MedaliJenis }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50">
                <option value="">— Tidak Ada —</option>
                {Object.entries(MEDALI_CONF).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nomor / Kelas</label>
              <input value={form.nomor_lomba ?? ''} onChange={e => setForm(f => ({ ...f, nomor_lomba: e.target.value }))}
                placeholder="100m Putra / Kelas A"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Penyelenggara</label>
            <input value={form.penyelenggara ?? ''} onChange={e => setForm(f => ({ ...f, penyelenggara: e.target.value }))}
              placeholder="PASI / PBSI / PRSI..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50" />
          </div>
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <Upload size={16} className="text-blue-500" />
            <span className="text-sm text-blue-700">Upload bukti SK / sertifikat (PDF/JPG)</span>
            <button className="ml-auto text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">Browse</button>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button>
          <button onClick={() => { onSave(form); onClose() }} disabled={!form.nama_kejuaraan}
            className="px-5 py-2 text-sm bg-yellow-500 disabled:bg-yellow-300 hover:bg-yellow-600 text-white font-bold rounded-lg shadow-md">
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Verifikasi Modal (Operator) ──────────────────────────
function VerifModal({ data, onClose, onVerif }: { data: Kejuaraan; onClose: () => void; onVerif: (id: number, status: VerifStatus, catatan?: string) => void }) {
  const [status, setStatus] = useState<VerifStatus>(data.status_verifikasi)
  const [catatan, setCatatan] = useState(data.catatan_operator ?? '')
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-medium">Verifikasi Kejuaraan</h3>
          <button onClick={onClose}><X size={18} className="text-blue-100" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <div className="font-semibold text-[#3c4858]">{data.atlet_nama}</div>
            <div className="text-sm text-gray-500">{data.nama_kejuaraan}</div>
            <div className="flex gap-2 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TINGKAT[data.tingkat].bg} ${TINGKAT[data.tingkat].color}`}>{TINGKAT[data.tingkat].label}</span>
              {data.medali && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-bold">{MEDALI_CONF[data.medali]?.icon} {MEDALI_CONF[data.medali]?.label}</span>}
            </div>
          </div>
          {data.bukti_url && (
            <a href={data.bukti_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
              <FileText size={14} /> Lihat Bukti Dokumen <ExternalLink size={12} className="ml-auto" />
            </a>
          )}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Keputusan Verifikasi</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(VERIF_STATUS) as [VerifStatus, any][]).map(([k, v]) => (
                <button key={k} onClick={() => setStatus(k)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    status === k ? `${v.bg} ${v.color} ${v.border}` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  <v.icon size={14} /> {v.label}
                </button>
              ))}
            </div>
          </div>
          {(status === 'ditolak' || status === 'revisi') && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                Alasan {status === 'ditolak' ? 'Penolakan' : 'Revisi'} *
              </label>
              <textarea value={catatan} onChange={e => setCatatan(e.target.value)}
                rows={3} placeholder="Jelaskan alasan..."
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 resize-none" />
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button>
          <button onClick={() => { onVerif(data.id, status, catatan); onClose() }}
            className="px-5 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-md">
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function KejuaraanAtlet() {
  const [kejuaraans, setKejuaraans] = useState<Kejuaraan[]>(MOCK_KEJUARAAN)
  const [search, setSearch] = useState('')
  const [filterVerif, setFilterVerif] = useState<VerifStatus | 'semua'>('semua')
  const [filterTingkat, setFilterTingkat] = useState<TingkatKejuaraan | 'semua'>('semua')
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState<Kejuaraan | null>(null)
  const [verifData, setVerifData] = useState<Kejuaraan | null>(null)
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  const filtered = useMemo(() => {
    let r = kejuaraans
    if (search) r = r.filter(k => k.atlet_nama.toLowerCase().includes(search.toLowerCase()) || k.nama_kejuaraan.toLowerCase().includes(search.toLowerCase()))
    if (filterVerif !== 'semua') r = r.filter(k => k.status_verifikasi === filterVerif)
    if (filterTingkat !== 'semua') r = r.filter(k => k.tingkat === filterTingkat)
    return r
  }, [kejuaraans, search, filterVerif, filterTingkat])

  const summary = useMemo(() => ({
    total: kejuaraans.length,
    verified: kejuaraans.filter(k => k.status_verifikasi === 'verified').length,
    pending: kejuaraans.filter(k => k.status_verifikasi === 'pending').length,
    revisi: kejuaraans.filter(k => k.status_verifikasi === 'revisi').length,
    ditolak: kejuaraans.filter(k => k.status_verifikasi === 'ditolak').length,
    totalEmas: kejuaraans.filter(k => k.medali === 'emas' && k.status_verifikasi === 'verified').length,
  }), [kejuaraans])

  function handleVerif(id: number, status: VerifStatus, catatan?: string) {
    setKejuaraans(prev => prev.map(k => k.id === id ? { ...k, status_verifikasi: status, catatan_operator: catatan } : k))
  }

  function handleSave(form: Partial<Kejuaraan>) {
    if (editData) {
      setKejuaraans(prev => prev.map(k => k.id === editData.id ? { ...k, ...form } : k))
    } else {
      setKejuaraans(prev => [...prev, { id: Date.now(), atlet_id: 0, atlet_nama: '', status_verifikasi: 'pending', tingkat: 'provinsi', tahun: new Date().getFullYear(), medali: null, nama_kejuaraan: '', created_at: new Date().toISOString(), ...form } as Kejuaraan])
    }
    setEditData(null)
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
          <h1 className="text-2xl font-light text-[#3c4858]">Kejuaraan Atlet</h1>
          <p className="text-sm text-gray-400 mt-0.5">Riwayat prestasi atlet & verifikasi dokumen kejuaraan PORPROV XV</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full text-sm text-gray-600 flex items-center gap-2 shadow-sm">
            <Download size={14} /> Export
          </button>
          <button onClick={() => { setEditData(null); setShowModal(true) }}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-md">
            <Plus size={14} /> Tambah Kejuaraan
          </button>
        </div>
      </div>

      {/* KPI */}
      <div {...ani(40)} className="grid grid-cols-6 gap-4 pt-2">
        {[
          { label: 'Total Kejuaraan', value: summary.total, gradient: 'from-blue-500 to-blue-400', icon: Award },
          { label: 'Verified', value: summary.verified, gradient: 'from-green-500 to-green-400', icon: CheckCircle },
          { label: 'Pending', value: summary.pending, gradient: 'from-orange-500 to-orange-400', icon: Clock },
          { label: 'Perlu Revisi', value: summary.revisi, gradient: 'from-blue-400 to-cyan-400', icon: AlertCircle },
          { label: 'Ditolak', value: summary.ditolak, gradient: 'from-red-500 to-red-400', icon: XCircle },
          { label: 'Medali Emas ✓', value: summary.totalEmas, gradient: 'from-yellow-500 to-orange-400', icon: Medal },
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

      {/* Filter */}
      <div {...ani(60)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atlet / kejuaraan..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-gray-50" />
        </div>
        <select value={filterTingkat} onChange={e => setFilterTingkat(e.target.value as any)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 outline-none">
          <option value="semua">Semua Tingkat</option>
          {Object.entries(TINGKAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="flex gap-1.5">
          {(['semua', 'pending', 'verified', 'revisi', 'ditolak'] as const).map(s => {
            const conf = s === 'semua' ? { label: 'Semua', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' } : VERIF_STATUS[s]
            return (
              <button key={s} onClick={() => setFilterVerif(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filterVerif === s ? `${conf.bg} ${conf.color} ${conf.border} font-bold` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}>
                {conf.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div {...ani(80)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
          style={{ gridTemplateColumns: '1fr 1.5fr 5rem 5rem 5rem 7rem 7rem' }}>
          <div>Atlet / Kontingen</div>
          <div>Kejuaraan</div>
          <div>Tingkat</div>
          <div>Tahun</div>
          <div>Medali</div>
          <div>Status Verif</div>
          <div>Aksi</div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Tidak ada data kejuaraan</div>
        ) : filtered.map((k) => {
          const vConf = VERIF_STATUS[k.status_verifikasi]
          const tConf = TINGKAT[k.tingkat]
          const mConf = k.medali ? MEDALI_CONF[k.medali] : null
          return (
            <div key={k.id}
              className={`grid px-5 py-4 border-b border-gray-50 hover:bg-gray-50/50 items-center gap-3 ${
                k.status_verifikasi === 'pending' ? 'bg-orange-50/20' : k.status_verifikasi === 'revisi' ? 'bg-blue-50/20' : ''
              }`}
              style={{ gridTemplateColumns: '1fr 1.5fr 5rem 5rem 5rem 7rem 7rem' }}>
              <div>
                <div className="text-sm font-medium text-[#3c4858]">{k.atlet_nama}</div>
                <div className="text-xs text-gray-400 mt-0.5">{k.atlet_kontingen} · {k.cabor_nama}</div>
              </div>
              <div>
                <div className="text-sm text-gray-700 font-medium truncate">{k.nama_kejuaraan}</div>
                <div className="text-xs text-gray-400 mt-0.5">{k.nomor_lomba} · {k.penyelenggara}</div>
                {k.catatan_operator && (
                  <div className="text-[10px] text-orange-500 italic mt-1 truncate">⚠ {k.catatan_operator}</div>
                )}
              </div>
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tConf.bg} ${tConf.color}`}>{tConf.label}</span>
              </div>
              <div className="text-sm text-gray-500 font-mono">{k.tahun}</div>
              <div>
                {mConf ? (
                  <span className={`text-sm font-bold ${mConf.color}`}>{mConf.icon} {mConf.label}</span>
                ) : <span className="text-gray-300 text-xs">—</span>}
              </div>
              <div>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit ${vConf.bg} ${vConf.color} ${vConf.border}`}>
                  <vConf.icon size={10} /> {vConf.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {k.bukti_url && (
                  <a href={k.bukti_url} target="_blank" rel="noopener noreferrer"
                    className="w-7 h-7 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center" title="Lihat Bukti">
                    <Eye size={12} className="text-blue-500" />
                  </a>
                )}
                {k.status_verifikasi === 'pending' && (
                  <button onClick={() => setVerifData(k)}
                    className="flex items-center gap-1 text-[10px] bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">
                    <Shield size={10} /> Verif
                  </button>
                )}
                {(k.status_verifikasi === 'revisi' || k.status_verifikasi === 'verified') && (
                  <button onClick={() => setVerifData(k)}
                    className="w-7 h-7 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center">
                    <Edit3 size={12} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {(showModal || editData) && (
        <KejuaraanModal
          data={editData}
          onClose={() => { setShowModal(false); setEditData(null) }}
          onSave={handleSave}
        />
      )}
      {verifData && (
        <VerifModal data={verifData} onClose={() => setVerifData(null)} onVerif={handleVerif} />
      )}
    </div>
  )
}