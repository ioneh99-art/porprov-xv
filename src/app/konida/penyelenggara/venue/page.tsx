'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2, Calendar, ChevronDown, ChevronRight, Clock,
  Edit3, Filter, MapPin, Plus, RefreshCw, Search,
  Users, X, CheckCircle, AlertCircle, Circle, Layers,
  ArrowUpDown, Eye, Wifi,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

// ─── Types ───────────────────────────────────────────────
type VenueStatus = 'aktif' | 'siap' | 'selesai' | 'masalah' | 'standby'
interface Venue {
  id: number; nama: string; alamat: string; kapasitas?: number
  klaster_id: number; fasilitas?: string; status?: VenueStatus
}
interface Jadwal {
  id: number; nama_pertandingan: string; jam_mulai: string | null
  jam_selesai: string | null; tanggal?: string | null
  venue_id?: number | null; cabor_id?: number | null
  venue?: { id?: number; nama?: string } | null
  cabang_olahraga?: { id?: number; nama?: string } | null
  status_pertandingan?: 'dijadwalkan' | 'berlangsung' | 'selesai' | 'tunda' | null
}
interface CaborItem { id: number; nama: string }

const STATUS_VENUE: Record<VenueStatus, { label: string; color: string; bg: string; dot: string }> = {
  aktif:   { label: 'Aktif',    color: 'text-green-700',  bg: 'bg-green-50',  dot: 'bg-green-500'  },
  siap:    { label: 'Siap',     color: 'text-blue-700',   bg: 'bg-blue-50',   dot: 'bg-blue-500'   },
  masalah: { label: 'Masalah',  color: 'text-red-700',    bg: 'bg-red-50',    dot: 'bg-red-500'    },
  standby: { label: 'Standby',  color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  selesai: { label: 'Selesai',  color: 'text-gray-500',   bg: 'bg-gray-100',  dot: 'bg-gray-400'   },
}
const STATUS_JADWAL = {
  dijadwalkan: { label: 'Dijadwalkan', color: 'text-blue-600',   bg: 'bg-blue-50'  },
  berlangsung: { label: 'Live',        color: 'text-green-600',  bg: 'bg-green-50' },
  selesai:     { label: 'Selesai',     color: 'text-gray-500',   bg: 'bg-gray-100' },
  tunda:       { label: 'Ditunda',     color: 'text-orange-600', bg: 'bg-orange-50'},
}

const MOCK_STATUSES: VenueStatus[] = [
  'aktif','aktif','aktif','siap','siap','siap','siap',
  'standby','standby','standby','standby','standby','selesai','selesai','masalah',
]
const FASILITAS_LIST = [
  'Parkir Luas','AC Central','WiFi','Tribun Penonton','Ruang Ganti',
  'Kantin','P3K','CCTV','Genset','Ruang Press',
]

// ─── Helpers ─────────────────────────────────────────────
function getVenueStatus(idx: number): VenueStatus { return MOCK_STATUSES[idx % MOCK_STATUSES.length] }
function fmtTime(t: string | null) { return t ? t.slice(0, 5) : '--:--' }
function fmtTanggal(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── Sub-components ───────────────────────────────────────

function SectionHeader({
  icon: Icon, title, subtitle, gradient, count,
}: { icon: any; title: string; subtitle: string; gradient: string; count?: number }) {
  return (
    <div className={`${gradient} rounded-xl px-6 py-4 shadow-md flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-white text-lg font-medium">{title}</h2>
          <p className="text-white/70 text-xs">{subtitle}</p>
        </div>
      </div>
      {count !== undefined && (
        <div className="bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-full">{count} data</div>
      )}
    </div>
  )
}

function VenueCard({
  venue, idx, onEdit,
}: { venue: Venue; idx: number; onEdit: (v: Venue) => void }) {
  const status = venue.status ?? getVenueStatus(idx)
  const conf = STATUS_VENUE[status]
  const fasArr = venue.fasilitas ? venue.fasilitas.split(',').map(s => s.trim()) : FASILITAS_LIST.slice(0, 4 + (idx % 3))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 pr-2">
            <h3 className="font-semibold text-[#3c4858] text-sm leading-tight">{venue.nama}</h3>
            <div className="flex items-center gap-1 mt-1 text-[#aaa] text-xs">
              <MapPin size={10} />
              <span className="truncate">{venue.alamat || 'Kota Bekasi, Jawa Barat'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${conf.bg} ${conf.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${conf.dot} ${status === 'aktif' ? 'animate-pulse' : ''}`} />
              {conf.label}
            </div>
            <button
              onClick={() => onEdit(venue)}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center"
            >
              <Edit3 size={12} className="text-gray-500" />
            </button>
          </div>
        </div>

        {venue.kapasitas && (
          <div className="flex items-center gap-2 mb-3">
            <Users size={11} className="text-gray-400" />
            <span className="text-xs text-gray-500">Kapasitas:</span>
            <span className="text-xs font-bold text-[#3c4858]">{venue.kapasitas.toLocaleString()} orang</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {fasArr.slice(0, 5).map((f) => (
            <span key={f} className="text-[9px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f}</span>
          ))}
          {fasArr.length > 5 && (
            <span className="text-[9px] bg-gray-50 border border-gray-100 text-gray-400 px-2 py-0.5 rounded-full">+{fasArr.length - 5} lagi</span>
          )}
        </div>
      </div>
      <div className="border-t border-gray-50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">Klaster I · Bekasi</span>
        <button className="text-[10px] text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1">
          <Eye size={10} /> Detail
        </button>
      </div>
    </div>
  )
}

function JadwalRow({ jadwal, idx }: { jadwal: Jadwal; idx: number }) {
  const st = jadwal.status_pertandingan ?? 'dijadwalkan'
  const conf = STATUS_JADWAL[st] ?? STATUS_JADWAL.dijadwalkan
  const isLive = st === 'berlangsung'

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isLive ? 'bg-green-50/30' : ''}`}>
      <div className="w-16 flex-shrink-0 text-center">
        <div className={`text-sm font-bold ${isLive ? 'text-green-600' : 'text-gray-600'}`}>{fmtTime(jadwal.jam_mulai)}</div>
        <div className="text-[10px] text-gray-400">{fmtTime(jadwal.jam_selesai)}</div>
      </div>
      <div className="w-24 flex-shrink-0">
        <div className="text-[10px] text-gray-400">{fmtTanggal(jadwal.tanggal ?? null)}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#3c4858] truncate">{jadwal.nama_pertandingan}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {jadwal.cabang_olahraga?.nama && <span className="font-medium text-gray-500">{jadwal.cabang_olahraga.nama}</span>}
          {jadwal.cabang_olahraga?.nama && jadwal.venue?.nama && <span className="mx-1.5 text-gray-300">·</span>}
          {jadwal.venue?.nama && <span>{jadwal.venue.nama}</span>}
        </div>
      </div>
      <div className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${conf.bg} ${conf.color}`}>
        {isLive && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />}
        {conf.label}
      </div>
    </div>
  )
}

// ─── Modal Edit/Add Venue ─────────────────────────────────
function VenueModal({
  venue, venues, onClose, onSave,
}: { venue: Venue | null; venues: Venue[]; onClose: () => void; onSave: (v: Partial<Venue>) => void }) {
  const [form, setForm] = useState<Partial<Venue>>(
    venue ?? { nama: '', alamat: '', kapasitas: 0, klaster_id: 1, status: 'siap' }
  )
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-medium text-lg">{venue ? 'Edit Venue' : 'Tambah Venue Baru'}</h3>
          <button onClick={onClose}><X size={20} className="text-blue-100 hover:text-white" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nama Venue</label>
            <input
              value={form.nama ?? ''}
              onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
              placeholder="Contoh: Stadion Patriot Candrabhaga"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Alamat</label>
            <input
              value={form.alamat ?? ''}
              onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
              placeholder="Jl. Ahmad Yani, Bekasi Selatan"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Kapasitas</label>
              <input
                type="number"
                value={form.kapasitas ?? ''}
                onChange={e => setForm(f => ({ ...f, kapasitas: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                placeholder="500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Status</label>
              <select
                value={form.status ?? 'siap'}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as VenueStatus }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
              >
                {Object.entries(STATUS_VENUE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Batal</button>
          <button
            onClick={() => { onSave(form); onClose() }}
            disabled={!form.nama}
            className="px-5 py-2 text-sm bg-blue-500 disabled:bg-blue-300 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors shadow-md"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function VenueJadwalPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [jadwal, setJadwal] = useState<Jadwal[]>([])
  const [cabors, setCabors] = useState<CaborItem[]>([])
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn] = useState(false)
  const [activeTab, setActiveTab] = useState<'venue' | 'jadwal'>('venue')
  const [searchVenue, setSearchVenue] = useState('')
  const [searchJadwal, setSearchJadwal] = useState('')
  const [filterStatus, setFilterStatus] = useState<VenueStatus | 'semua'>('semua')
  const [filterCabor, setFilterCabor] = useState<string>('semua')
  const [filterJadwalStatus, setFilterJadwalStatus] = useState<string>('semua')
  const [editVenue, setEditVenue] = useState<Venue | null | undefined>(undefined) // undefined=hidden
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const reqRef = useRef(0)

  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (loading) return
    const t = setTimeout(() => setAnimIn(true), 50)
    return () => clearTimeout(t)
  }, [loading])

  async function load() {
    const id = ++reqRef.current
    setLoading(true)
    try {
      const [vr, jr, cr] = await Promise.all([
        sb.from('venue').select('id,nama,alamat,kapasitas,klaster_id,fasilitas').eq('klaster_id', 1).order('nama'),
        sb.from('jadwal_pertandingan')
          .select('id,nama_pertandingan,jam_mulai,jam_selesai,tanggal,venue_id,cabor_id,venue(id,nama),cabang_olahraga(id,nama),status_pertandingan')
          .order('tanggal').order('jam_mulai').limit(100),
        sb.from('cabang_olahraga').select('id,nama').order('nama'),
      ])
      if (id !== reqRef.current) return
      setVenues((vr.data ?? []) as Venue[])
      setJadwal((jr.data ?? []) as Jadwal[])
      setCabors((cr.data ?? []) as CaborItem[])
    } finally {
      if (id === reqRef.current) setLoading(false)
    }
  }

  const filteredVenues = useMemo(() => {
    let r = venues
    if (searchVenue) r = r.filter(v => v.nama.toLowerCase().includes(searchVenue.toLowerCase()) || (v.alamat ?? '').toLowerCase().includes(searchVenue.toLowerCase()))
    if (filterStatus !== 'semua') r = r.filter((_, i) => (venues[i] ? getVenueStatus(i) : 'siap') === filterStatus)
    return r
  }, [venues, searchVenue, filterStatus])

  const filteredJadwal = useMemo(() => {
    let r = jadwal
    if (searchJadwal) r = r.filter(j => j.nama_pertandingan.toLowerCase().includes(searchJadwal.toLowerCase()))
    if (filterCabor !== 'semua') r = r.filter(j => String(j.cabang_olahraga?.id) === filterCabor)
    if (filterJadwalStatus !== 'semua') r = r.filter(j => (j.status_pertandingan ?? 'dijadwalkan') === filterJadwalStatus)
    return r
  }, [jadwal, searchJadwal, filterCabor, filterJadwalStatus])

  const venueStatCounts = useMemo(() => {
    const c: Record<VenueStatus, number> = { aktif: 0, siap: 0, masalah: 0, standby: 0, selesai: 0 }
    venues.forEach((_, i) => { c[getVenueStatus(i)]++ })
    return c
  }, [venues])

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#eeeeee]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Memuat data venue & jadwal...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 space-y-6 font-sans">

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#3c4858]">Venue & Jadwal</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manajemen fasilitas dan agenda pertandingan PORPROV XV</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => void load()} className="bg-white hover:bg-gray-50 px-4 py-2 rounded-full shadow-sm text-sm text-[#3c4858] flex items-center gap-2 border border-gray-100">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setEditVenue(null)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-full shadow-md text-sm flex items-center gap-2"
          >
            <Plus size={14} /> Tambah Venue
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div {...ani(50)} className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Venue', value: venues.length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Aktif', value: venueStatCounts.aktif, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: 'Standby', value: venueStatCounts.standby, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Masalah', value: venueStatCounts.masalah, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          { label: 'Total Jadwal', value: jadwal.length, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl px-4 py-3 flex items-center justify-between`}>
            <span className="text-xs text-gray-500">{s.label}</span>
            <span className={`text-xl font-light ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div {...ani(80)} className="bg-white rounded-xl shadow-sm border border-gray-100 flex">
        {[
          { key: 'venue', label: 'Manajemen Venue', icon: Building2 },
          { key: 'jadwal', label: 'Jadwal Pertandingan', icon: Calendar },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all rounded-xl ${
              activeTab === t.key
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <t.icon size={16} />
            {t.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {t.key === 'venue' ? venues.length : jadwal.length}
            </span>
          </button>
        ))}
      </div>

      {/* ─── VENUE TAB ─── */}
      {activeTab === 'venue' && (
        <div {...ani(100)} className="space-y-5">
          {/* Filter bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchVenue}
                onChange={e => setSearchVenue(e.target.value)}
                placeholder="Cari nama venue / alamat..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['semua', 'aktif', 'siap', 'masalah', 'standby', 'selesai'] as const).map(s => {
                const conf = s === 'semua'
                  ? { label: 'Semua', color: 'text-gray-600', bg: 'bg-gray-100' }
                  : STATUS_VENUE[s]
                const isActive = filterStatus === s
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      isActive ? `${conf.bg} ${conf.color} border-transparent font-bold` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {conf.label}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-1 ml-auto">
              {(['grid', 'list'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`p-2 rounded-lg transition-colors ${viewMode === m ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                >
                  {m === 'grid' ? <Layers size={15} /> : <ArrowUpDown size={15} />}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 px-1">{filteredVenues.length} venue ditemukan</p>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-4">
              {filteredVenues.map((v, i) => (
                <VenueCard key={v.id} venue={v} idx={venues.indexOf(v)} onEdit={setEditVenue} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-4">Nama Venue</div>
                <div className="col-span-3">Alamat</div>
                <div className="col-span-2">Kapasitas</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1"></div>
              </div>
              {filteredVenues.map((v, i) => {
                const status = getVenueStatus(venues.indexOf(v))
                const conf = STATUS_VENUE[status]
                return (
                  <div key={v.id} className="grid grid-cols-12 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/50 items-center">
                    <div className="col-span-4 text-sm font-medium text-[#3c4858]">{v.nama}</div>
                    <div className="col-span-3 text-xs text-gray-400 truncate">{v.alamat || 'Kota Bekasi'}</div>
                    <div className="col-span-2 text-xs text-gray-500">{v.kapasitas ? v.kapasitas.toLocaleString() : '-'}</div>
                    <div className="col-span-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${conf.bg} ${conf.color}`}>{conf.label}</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => setEditVenue(v)} className="w-7 h-7 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center">
                        <Edit3 size={12} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── JADWAL TAB ─── */}
      {activeTab === 'jadwal' && (
        <div {...ani(100)} className="space-y-5">
          {/* Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchJadwal}
                onChange={e => setSearchJadwal(e.target.value)}
                placeholder="Cari nama pertandingan..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
              />
            </div>
            <select
              value={filterCabor}
              onChange={e => setFilterCabor(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="semua">Semua Cabor</option>
              {cabors.map(c => <option key={c.id} value={String(c.id)}>{c.nama}</option>)}
            </select>
            <select
              value={filterJadwalStatus}
              onChange={e => setFilterJadwalStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="semua">Semua Status</option>
              {Object.entries(STATUS_JADWAL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <p className="text-xs text-gray-400 px-1">{filteredJadwal.length} pertandingan ditemukan</p>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: '4rem 6rem 1fr 7rem' }}>
              <div>Waktu</div>
              <div>Tanggal</div>
              <div>Pertandingan / Venue</div>
              <div>Status</div>
            </div>
            {filteredJadwal.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">Tidak ada jadwal ditemukan</div>
            ) : (
              filteredJadwal.map((j, i) => <JadwalRow key={j.id} jadwal={j} idx={i} />)
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {editVenue !== undefined && (
        <VenueModal
          venue={editVenue}
          venues={venues}
          onClose={() => setEditVenue(undefined)}
          onSave={(form) => {
            if (editVenue) {
              setVenues(vs => vs.map(v => v.id === editVenue.id ? { ...v, ...form } : v))
            } else {
              setVenues(vs => [...vs, { id: Date.now(), klaster_id: 1, ...form } as Venue])
            }
          }}
        />
      )}
    </div>
  )
}