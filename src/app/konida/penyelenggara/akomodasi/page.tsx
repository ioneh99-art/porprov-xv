'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BedDouble, Building2, Car, Check, ChevronDown,
  Clock, Edit3, Hotel, MapPin, Phone, Plus,
  RefreshCw, Search, Star, Tag, Trash2, User,
  Users, Utensils, X, CheckCircle, AlertCircle,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

// ─── Types ───────────────────────────────────────────────
type TamuKategori = 'vip' | 'kontingen' | 'official' | 'media' | 'panitia'
type AkomodasiStatus = 'konfirmasi' | 'pending' | 'checkin' | 'checkout' | 'batal'
type TransportStatus = 'tersedia' | 'terpakai' | 'maintenance'

interface Hotel {
  id: number
  nama: string
  alamat: string
  bintang: number
  total_kamar: number
  kamar_terisi: number
  harga_per_malam: number
  fasilitas: string[]
  telp?: string
  pic?: string
}

interface Tamu {
  id: number
  nama: string
  jabatan?: string
  instansi?: string
  kategori: TamuKategori
  hotel_id?: number
  hotel_nama?: string
  nomor_kamar?: string
  tanggal_masuk?: string
  tanggal_keluar?: string
  status: AkomodasiStatus
  transport_dibutuhkan: boolean
  catatan?: string
  telp?: string
}

interface Kendaraan {
  id: number
  plat: string
  jenis: string
  kapasitas: number
  driver: string
  status: TransportStatus
  ditugaskan_ke?: string
}

// ─── Mock Data ───────────────────────────────────────────
const MOCK_HOTELS: Hotel[] = [
  { id: 1, nama: 'Novotel Bekasi', alamat: 'Jl. Ahmad Yani No. 177', bintang: 4, total_kamar: 80, kamar_terisi: 67, harga_per_malam: 850000, fasilitas: ['Kolam Renang', 'Gym', 'Restoran', 'WiFi', 'Ballroom'], telp: '021-884-5566', pic: 'Bpk. Hendra' },
  { id: 2, nama: 'Swiss-Belhotel Bekasi', alamat: 'Jl. Ir. H. Juanda', bintang: 4, total_kamar: 60, kamar_terisi: 44, harga_per_malam: 750000, fasilitas: ['Restoran', 'WiFi', 'Meeting Room', 'Parkir'], telp: '021-884-7788', pic: 'Ibu Sari' },
  { id: 3, nama: 'Amaroossa Suite Bekasi', alamat: 'Grand Galaxy City', bintang: 4, total_kamar: 55, kamar_terisi: 38, harga_per_malam: 700000, fasilitas: ['WiFi', 'Restoran', 'Spa', 'Pool'], telp: '021-2250-3355', pic: 'Bpk. Dani' },
  { id: 4, nama: 'Grand Whiz Bekasi', alamat: 'Jl. Cut Mutia No. 1', bintang: 3, total_kamar: 45, kamar_terisi: 21, harga_per_malam: 550000, fasilitas: ['WiFi', 'Restoran', 'Parkir'], telp: '021-884-3322', pic: 'Ibu Rina' },
  { id: 5, nama: 'Wisma Atlet Bekasi', alamat: 'Komplek Stadion Patriot', bintang: 2, total_kamar: 120, kamar_terisi: 98, harga_per_malam: 250000, fasilitas: ['WiFi', 'Kantin', 'Laundry'], telp: '021-884-1122', pic: 'Bpk. Joko' },
]

const MOCK_TAMU: Tamu[] = [
  { id: 1, nama: 'H. Rohidin Mersyah', jabatan: 'Gubernur', instansi: 'Pemprov Bengkulu', kategori: 'vip', hotel_id: 1, hotel_nama: 'Novotel Bekasi', nomor_kamar: '1201', tanggal_masuk: '2025-06-01', tanggal_keluar: '2025-06-03', status: 'konfirmasi', transport_dibutuhkan: true, telp: '0811-111-001' },
  { id: 2, nama: 'Dr. Achmad Sobari', jabatan: 'Ketua KONI Jabar', instansi: 'KONI Jawa Barat', kategori: 'official', hotel_id: 1, hotel_nama: 'Novotel Bekasi', nomor_kamar: '1105', tanggal_masuk: '2025-05-30', tanggal_keluar: '2025-06-05', status: 'checkin', transport_dibutuhkan: true, telp: '0812-222-002' },
  { id: 3, nama: 'Tim Atletik Kontingen Bandung', jabatan: '24 Atlet', instansi: 'Kontingen Kota Bandung', kategori: 'kontingen', hotel_id: 5, hotel_nama: 'Wisma Atlet Bekasi', nomor_kamar: 'Lantai 2 Blok A', tanggal_masuk: '2025-05-31', tanggal_keluar: '2025-06-04', status: 'checkin', transport_dibutuhkan: false },
  { id: 4, nama: 'Tim Media Trans7', jabatan: 'Kru Liputan', instansi: 'Trans7', kategori: 'media', hotel_id: 2, hotel_nama: 'Swiss-Belhotel Bekasi', nomor_kamar: '304', tanggal_masuk: '2025-06-01', tanggal_keluar: '2025-06-03', status: 'pending', transport_dibutuhkan: true, catatan: 'Perlu akses press area' },
  { id: 5, nama: 'Rombongan Deputi KEMENPORA', jabatan: 'Deputi Bidang Pembudayaan', instansi: 'KEMENPORA RI', kategori: 'vip', hotel_id: 1, hotel_nama: 'Novotel Bekasi', nomor_kamar: '1401', tanggal_masuk: '2025-06-02', tanggal_keluar: '2025-06-02', status: 'pending', transport_dibutuhkan: true, telp: '0813-333-003' },
  { id: 6, nama: 'Kontingen Kota Depok', jabatan: '38 Atlet', instansi: 'Kontingen Kota Depok', kategori: 'kontingen', hotel_id: 5, hotel_nama: 'Wisma Atlet Bekasi', nomor_kamar: 'Lantai 3 Blok B', tanggal_masuk: '2025-05-31', tanggal_keluar: '2025-06-05', status: 'checkin', transport_dibutuhkan: false },
  { id: 7, nama: 'Bpk. Tri Adhianto', jabatan: 'Wali Kota Bekasi', instansi: 'Pemkot Bekasi', kategori: 'vip', hotel_id: 1, hotel_nama: 'Novotel Bekasi', nomor_kamar: 'Presidential Suite', tanggal_masuk: '2025-05-30', tanggal_keluar: '2025-06-06', status: 'checkin', transport_dibutuhkan: true, telp: '0814-444-004' },
]

const MOCK_KENDARAAN: Kendaraan[] = [
  { id: 1, plat: 'B 1234 AGX', jenis: 'Alphard', kapasitas: 7, driver: 'Sugeng', status: 'terpakai', ditugaskan_ke: 'Gubernur Bengkulu' },
  { id: 2, plat: 'B 5678 ZXY', jenis: 'Innova Reborn', kapasitas: 7, driver: 'Wahyu', status: 'tersedia' },
  { id: 3, plat: 'BD 1111 A', jenis: 'Avanza', kapasitas: 7, driver: 'Dedi', status: 'tersedia' },
  { id: 4, plat: 'BD 2222 B', jenis: 'Bus Pariwisata', kapasitas: 45, driver: 'Roni', status: 'terpakai', ditugaskan_ke: 'Kontingen Bandung' },
  { id: 5, plat: 'BD 3333 C', jenis: 'Bus Pariwisata', kapasitas: 45, driver: 'Hasan', status: 'tersedia' },
  { id: 6, plat: 'BD 4444 D', jenis: 'Minibus', kapasitas: 12, driver: 'Iwan', status: 'maintenance' },
]

// ─── Config ──────────────────────────────────────────────
const TAMU_KATEGORI: Record<TamuKategori, { label: string; color: string; bg: string; icon: string }> = {
  vip:      { label: 'VIP',       color: 'text-yellow-700', bg: 'bg-yellow-50',  icon: '⭐' },
  official: { label: 'Official',  color: 'text-purple-700', bg: 'bg-purple-50',  icon: '🏅' },
  kontingen:{ label: 'Kontingen', color: 'text-blue-700',   bg: 'bg-blue-50',    icon: '🏃' },
  media:    { label: 'Media',     color: 'text-gray-700',   bg: 'bg-gray-100',   icon: '📷' },
  panitia:  { label: 'Panitia',   color: 'text-green-700',  bg: 'bg-green-50',   icon: '👷' },
}
const AKOM_STATUS: Record<AkomodasiStatus, { label: string; color: string; bg: string }> = {
  konfirmasi: { label: 'Konfirmasi', color: 'text-blue-700',   bg: 'bg-blue-50'   },
  pending:    { label: 'Pending',    color: 'text-orange-700', bg: 'bg-orange-50' },
  checkin:    { label: 'Check-In',   color: 'text-green-700',  bg: 'bg-green-50'  },
  checkout:   { label: 'Check-Out',  color: 'text-gray-500',   bg: 'bg-gray-100'  },
  batal:      { label: 'Batal',      color: 'text-red-600',    bg: 'bg-red-50'    },
}
const TRANSPORT_STATUS: Record<TransportStatus, { label: string; color: string; bg: string }> = {
  tersedia:    { label: 'Tersedia',    color: 'text-green-600',  bg: 'bg-green-50'  },
  terpakai:    { label: 'Terpakai',    color: 'text-blue-600',   bg: 'bg-blue-50'   },
  maintenance: { label: 'Servis',      color: 'text-red-500',    bg: 'bg-red-50'    },
}

// ─── Sub-components ───────────────────────────────────────
function StarRating({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={10} className={i < n ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

function OccupancyBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-gray-500 w-12 text-right">{used}/{total}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function AkomodasiTamu() {
  const [activeTab, setActiveTab] = useState<'tamu' | 'hotel' | 'transport'>('tamu')
  const [tamu, setTamu] = useState<Tamu[]>(MOCK_TAMU)
  const [hotels] = useState<Hotel[]>(MOCK_HOTELS)
  const [kendaraan, setKendaraan] = useState<Kendaraan[]>(MOCK_KENDARAAN)
  const [search, setSearch] = useState('')
  const [filterKat, setFilterKat] = useState<TamuKategori | 'semua'>('semua')
  const [filterStatus, setFilterStatus] = useState<AkomodasiStatus | 'semua'>('semua')
  const [animIn, setAnimIn] = useState(false)
  const [showAddTamu, setShowAddTamu] = useState(false)
  const [editTamu, setEditTamu] = useState<Tamu | null>(null)

  const [form, setForm] = useState<Partial<Tamu>>({
    nama: '', jabatan: '', instansi: '', kategori: 'kontingen',
    hotel_id: undefined, nomor_kamar: '', tanggal_masuk: '', tanggal_keluar: '',
    status: 'pending', transport_dibutuhkan: false, catatan: '', telp: '',
  })

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  const filteredTamu = useMemo(() => {
    let r = tamu
    if (search) r = r.filter(t => t.nama.toLowerCase().includes(search.toLowerCase()) || (t.instansi ?? '').toLowerCase().includes(search.toLowerCase()))
    if (filterKat !== 'semua') r = r.filter(t => t.kategori === filterKat)
    if (filterStatus !== 'semua') r = r.filter(t => t.status === filterStatus)
    return r
  }, [tamu, search, filterKat, filterStatus])

  const stats = useMemo(() => ({
    totalTamu: tamu.length,
    checkin: tamu.filter(t => t.status === 'checkin').length,
    pending: tamu.filter(t => t.status === 'pending').length,
    vip: tamu.filter(t => t.kategori === 'vip').length,
    transportNeed: tamu.filter(t => t.transport_dibutuhkan && t.status !== 'checkout').length,
    kendaraanTersedia: kendaraan.filter(k => k.status === 'tersedia').length,
    totalKamar: hotels.reduce((a, h) => a + h.total_kamar, 0),
    kamarTerisi: hotels.reduce((a, h) => a + h.kamar_terisi, 0),
  }), [tamu, hotels, kendaraan])

  function handleSaveTamu() {
    if (!form.nama) return
    if (editTamu) {
      setTamu(prev => prev.map(t => t.id === editTamu.id ? { ...t, ...form } as Tamu : t))
    } else {
      setTamu(prev => [...prev, { id: Date.now(), transport_dibutuhkan: false, status: 'pending', kategori: 'kontingen', ...form } as Tamu])
    }
    setShowAddTamu(false); setEditTamu(null)
    setForm({ nama: '', jabatan: '', instansi: '', kategori: 'kontingen', status: 'pending', transport_dibutuhkan: false })
  }

  function handleUpdateStatus(id: number, status: AkomodasiStatus) {
    setTamu(prev => prev.map(t => t.id === id ? { ...t, status } : t))
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
          <h1 className="text-2xl font-light text-[#3c4858]">Akomodasi Tamu</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manajemen penginapan, tamu VIP & transportasi PORPROV XV</p>
        </div>
        <button
          onClick={() => { setEditTamu(null); setShowAddTamu(true) }}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-full shadow-md text-sm flex items-center gap-2"
        >
          <Plus size={14} /> Tambah Tamu
        </button>
      </div>

      {/* KPI */}
      <div {...ani(40)} className="grid grid-cols-5 gap-4 pt-4">
        {[
          { label: 'Total Tamu', value: stats.totalTamu, icon: Users, gradient: 'from-blue-500 to-blue-400', shadow: 'shadow-blue-500/30' },
          { label: 'Sudah Check-In', value: stats.checkin, icon: CheckCircle, gradient: 'from-green-500 to-green-400', shadow: 'shadow-green-500/30' },
          { label: 'Tamu VIP', value: stats.vip, icon: Star, gradient: 'from-yellow-500 to-yellow-400', shadow: 'shadow-yellow-500/30' },
          { label: 'Kamar Terisi', value: `${stats.kamarTerisi}/${stats.totalKamar}`, icon: BedDouble, gradient: 'from-purple-500 to-purple-400', shadow: 'shadow-purple-500/30' },
          { label: 'Transport Tersedia', value: stats.kendaraanTersedia, icon: Car, gradient: 'from-orange-500 to-orange-400', shadow: 'shadow-orange-500/30' },
        ].map((card) => (
          <div key={card.label} className="relative bg-white rounded-xl shadow-md p-4 pt-6">
            <div className={`absolute -top-5 left-4 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${card.gradient} ${card.shadow}`}>
              <card.icon size={22} className="text-white" />
            </div>
            <div className="text-right mt-1">
              <p className="text-xs font-light text-[#999] mb-1">{card.label}</p>
              <h4 className="text-2xl font-light text-[#3c4858]">{card.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div {...ani(70)} className="bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-hidden">
        {[
          { key: 'tamu', label: 'Daftar Tamu', icon: User },
          { key: 'hotel', label: 'Hotel & Penginapan', icon: Hotel },
          { key: 'transport', label: 'Transportasi', icon: Car },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-inner'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAMU TAB ─── */}
      {activeTab === 'tamu' && (
        <div {...ani(100)} className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama / instansi..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['semua', 'vip', 'official', 'kontingen', 'media'] as const).map(k => {
                const conf = k === 'semua' ? { label: 'Semua', color: 'text-gray-600', bg: 'bg-gray-100' } : TAMU_KATEGORI[k]
                return (
                  <button key={k} onClick={() => setFilterKat(k)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      filterKat === k ? `${conf.bg} ${conf.color} border-transparent font-bold` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {k !== 'semua' && TAMU_KATEGORI[k as TamuKategori].icon + ' '}{conf.label}
                  </button>
                )
              })}
            </div>
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 outline-none"
            >
              <option value="semua">Semua Status</option>
              {Object.entries(AKOM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto' }}>
              <div>Nama / Instansi</div>
              <div>Kategori</div>
              <div>Hotel / Kamar</div>
              <div>Check-In → Out</div>
              <div>Status</div>
            </div>
            {filteredTamu.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Tidak ada data tamu</div>
            ) : filteredTamu.map(t => {
              const katConf = TAMU_KATEGORI[t.kategori]
              const stConf = AKOM_STATUS[t.status]
              return (
                <div key={t.id} className="grid px-5 py-4 border-b border-gray-50 hover:bg-gray-50/50 items-center gap-4"
                  style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr auto' }}>
                  <div>
                    <div className="text-sm font-semibold text-[#3c4858]">{t.nama}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.jabatan}{t.jabatan && t.instansi ? ' · ' : ''}{t.instansi}</div>
                    {t.telp && <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Phone size={9} />{t.telp}</div>}
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${katConf.bg} ${katConf.color}`}>
                      {katConf.icon} {katConf.label}
                    </span>
                    {t.transport_dibutuhkan && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-500">
                        <Car size={9} /> Butuh transport
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#3c4858]">{t.hotel_nama ?? '-'}</div>
                    {t.nomor_kamar && <div className="text-[10px] text-gray-400 mt-0.5">Kamar {t.nomor_kamar}</div>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.tanggal_masuk ? new Date(t.tanggal_masuk).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                    <span className="mx-1 text-gray-300">→</span>
                    {t.tanggal_keluar ? new Date(t.tanggal_keluar).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${stConf.bg} ${stConf.color}`}>{stConf.label}</span>
                    <div className="relative group">
                      <button className="w-7 h-7 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center">
                        <Edit3 size={12} className="text-gray-400" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 py-1 w-36 z-50 hidden group-hover:block">
                        {Object.entries(AKOM_STATUS).map(([k, v]) => (
                          <button key={k} onClick={() => handleUpdateStatus(t.id, k as AkomodasiStatus)}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${v.color}`}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── HOTEL TAB ─── */}
      {activeTab === 'hotel' && (
        <div {...ani(100)} className="grid grid-cols-3 gap-5">
          {hotels.map(h => {
            const pct = Math.round((h.kamar_terisi / h.total_kamar) * 100)
            return (
              <div key={h.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-2 ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-green-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-[#3c4858] text-sm">{h.nama}</h3>
                      <div className="flex items-center gap-1 mt-1"><MapPin size={10} className="text-gray-400" /><span className="text-xs text-gray-400 truncate">{h.alamat}</span></div>
                    </div>
                    <StarRating n={h.bintang} />
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Okupansi Kamar</span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                    <OccupancyBar used={h.kamar_terisi} total={h.total_kamar} />
                    <div className="text-[10px] text-gray-400 mt-1">{h.total_kamar - h.kamar_terisi} kamar tersisa</div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {h.fasilitas.map(f => (
                      <span key={f} className="text-[9px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                  <div className="border-t border-gray-50 pt-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-gray-400">PIC: <span className="text-gray-600 font-medium">{h.pic}</span></div>
                      <div className="text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={9} />{h.telp}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-[10px]">Harga/malam</div>
                      <div className="font-bold text-orange-600 text-sm">Rp {(h.harga_per_malam / 1000).toFixed(0)}rb</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── TRANSPORT TAB ─── */}
      {activeTab === 'transport' && (
        <div {...ani(100)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-2">
            {[
              { label: 'Tersedia', value: kendaraan.filter(k => k.status === 'tersedia').length, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
              { label: 'Terpakai', value: kendaraan.filter(k => k.status === 'terpakai').length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Maintenance', value: kendaraan.filter(k => k.status === 'maintenance').length, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl px-5 py-3 flex items-center justify-between`}>
                <span className="text-sm text-gray-500">{s.label}</span>
                <span className={`text-2xl font-light ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: '1fr 1fr 6rem 1fr 1fr' }}>
              <div>Kendaraan</div>
              <div>Driver</div>
              <div>Kapasitas</div>
              <div>Ditugaskan ke</div>
              <div>Status</div>
            </div>
            {kendaraan.map(k => {
              const stConf = TRANSPORT_STATUS[k.status]
              return (
                <div key={k.id} className="grid px-5 py-4 border-b border-gray-50 hover:bg-gray-50/50 items-center gap-4"
                  style={{ gridTemplateColumns: '1fr 1fr 6rem 1fr 1fr' }}>
                  <div>
                    <div className="text-sm font-semibold text-[#3c4858]">{k.jenis}</div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{k.plat}</div>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-1.5"><User size={12} className="text-gray-400" />{k.driver}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-1"><Users size={12} className="text-gray-400" />{k.kapasitas}</div>
                  <div className="text-xs text-gray-500">{k.ditugaskan_ke ?? <span className="text-gray-300">—</span>}</div>
                  <div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${stConf.bg} ${stConf.color}`}>{stConf.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Butuh transport */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2"><Car size={15} /> Tamu yang Butuh Transport ({stats.transportNeed} orang)</h4>
            <div className="flex flex-wrap gap-2">
              {tamu.filter(t => t.transport_dibutuhkan && t.status !== 'checkout').map(t => (
                <div key={t.id} className="bg-white border border-orange-100 rounded-lg px-3 py-1.5 text-xs text-gray-600 flex items-center gap-1.5">
                  <span className="font-medium text-[#3c4858]">{t.nama}</span>
                  <span className="text-gray-400">·</span>
                  <span className={AKOM_STATUS[t.status].color}>{AKOM_STATUS[t.status].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Tamu */}
      {showAddTamu && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-medium text-lg">Tambah Data Tamu</h3>
              <button onClick={() => setShowAddTamu(false)}><X size={20} className="text-orange-100 hover:text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nama Lengkap</label>
                  <input value={form.nama ?? ''} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50"
                    placeholder="Nama tamu / rombongan" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Jabatan</label>
                  <input value={form.jabatan ?? ''} onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50"
                    placeholder="Gubernur / Ketua / Atlet" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Instansi</label>
                  <input value={form.instansi ?? ''} onChange={e => setForm(f => ({ ...f, instansi: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50"
                    placeholder="Pemprov / KONI / Kontingen" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Kategori</label>
                  <select value={form.kategori} onChange={e => setForm(f => ({ ...f, kategori: e.target.value as TamuKategori }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50">
                    {Object.entries(TAMU_KATEGORI).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Hotel</label>
                  <select value={form.hotel_id ?? ''} onChange={e => {
                    const h = hotels.find(h => h.id === Number(e.target.value))
                    setForm(f => ({ ...f, hotel_id: Number(e.target.value), hotel_nama: h?.nama }))
                  }}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50">
                    <option value="">-- Pilih Hotel --</option>
                    {hotels.map(h => <option key={h.id} value={h.id}>{h.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Check-In</label>
                  <input type="date" value={form.tanggal_masuk ?? ''} onChange={e => setForm(f => ({ ...f, tanggal_masuk: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Check-Out</label>
                  <input type="date" value={form.tanggal_keluar ?? ''} onChange={e => setForm(f => ({ ...f, tanggal_keluar: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50" />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="transport" checked={form.transport_dibutuhkan ?? false}
                    onChange={e => setForm(f => ({ ...f, transport_dibutuhkan: e.target.checked }))}
                    className="w-4 h-4 text-orange-500 rounded" />
                  <label htmlFor="transport" className="text-sm text-gray-600">Membutuhkan fasilitas transportasi</label>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              <button onClick={() => setShowAddTamu(false)} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button>
              <button onClick={handleSaveTamu} disabled={!form.nama}
                className="px-5 py-2 text-sm bg-orange-500 disabled:bg-orange-300 hover:bg-orange-600 text-white font-bold rounded-lg shadow-md">
                Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}