'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Map as LeafletMap } from 'leaflet'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Navigation,
  Plus,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

type VenueStatus = 'aktif' | 'siap' | 'selesai' | 'masalah' | 'standby'
type IncidentStatus = 'open' | 'handled' | 'closed'
type Priority = 'tinggi' | 'sedang' | 'rendah'

interface Venue {
  id: number
  nama: string
  alamat: string
  klaster_id: number
  lat?: number
  lng?: number
}

interface Incident {
  id: number
  venue_id: number
  venue_nama: string
  jenis: string
  deskripsi: string
  status: IncidentStatus
  created_at: string
  prioritas: Priority
}

interface JadwalItem {
  id: number
  nama_pertandingan: string
  jam_mulai: string | null
  jam_selesai: string | null
  venue?: { nama?: string } | null
  cabang_olahraga?: { nama?: string } | null
}

const VENUE_STATUS_CONFIG: Record<VenueStatus, { label: string; color: string; bg: string; dot: string }> = {
  aktif: { label: 'Aktif', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
  siap: { label: 'Siap', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  masalah: { label: 'Masalah', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
  standby: { label: 'Standby', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  selesai: { label: 'Selesai', color: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400' },
}

function getVenueStatus(idx: number): VenueStatus {
  const statuses: VenueStatus[] = [
    'aktif',
    'aktif',
    'aktif',
    'siap',
    'siap',
    'siap',
    'siap',
    'standby',
    'standby',
    'standby',
    'standby',
    'standby',
    'selesai',
    'selesai',
    'masalah',
  ]
  return statuses[idx % statuses.length]
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function LiveClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="font-bold text-[#3c4858] tracking-widest tabular-nums">
      {time.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </span>
  )
}

function PetaCommandCenter({ venues }: { venues: Venue[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initMap() {
      if (!mapRef.current) return

      const L = (await import('leaflet')).default
      // @ts-ignore: leaflet CSS import has no module declarations in this project
      await import('leaflet/dist/leaflet.css')

      if (cancelled || !mapRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number }
      if (container._leaflet_id) {
        container._leaflet_id = undefined
      }

      const map = L.map(mapRef.current, {
        center: [-6.23827, 106.975573],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: false,
      })

      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      venues.forEach((v, i) => {
        const status = getVenueStatus(i)
        const hexColor =
          status === 'aktif'
            ? '#4caf50'
            : status === 'siap'
              ? '#2196f3'
              : status === 'masalah'
                ? '#f44336'
                : status === 'standby'
                  ? '#ff9800'
                  : '#9e9e9e'

        const lat = v.lat ?? -6.238 + Math.sin(i) * 0.05
        const lng = v.lng ?? 106.975 + Math.cos(i) * 0.05

        const marker = L.circleMarker([lat, lng], {
          radius: status === 'masalah' ? 12 : 9,
          fillColor: hexColor,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map)

        const safeNama = escapeHtml(v.nama || '-')
        const safeAlamat = escapeHtml(v.alamat || 'Kota Bekasi, Jawa Barat')

        marker.bindPopup(
          `
          <div style="background:white; color:#333; padding:5px; min-width:180px;">
            <div style="font-size:10px; color:${hexColor}; font-weight:bold; margin-bottom:4px; text-transform:uppercase;">
              ● STATUS: ${status}
            </div>
            <div style="font-weight:bold; font-size:13px; margin-bottom:4px; color:#3c4858;">${safeNama}</div>
            <div style="font-size:11px; color:#999;">${safeAlamat}</div>
          </div>
        `,
          { className: 'custom-popup-light' }
        )
      })
    }

    void initMap()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [venues])

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden border border-gray-100">
      <style>{`
        .custom-popup-light .leaflet-popup-content-wrapper { box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-radius: 8px; }
        .custom-popup-light .leaflet-popup-tip { background: white; }
        .leaflet-container { background: #f8f9fa; z-index: 10; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important; }
      `}</style>
      <div ref={mapRef} className="w-full h-full min-h-[400px]" />
    </div>
  )
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')

export default function CommandCenter() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [jadwal, setJadwal] = useState<JadwalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddIncident, setShowAddIncident] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [filterStatus, setFilterStatus] = useState<VenueStatus | 'semua'>('semua')
  const [animIn, setAnimIn] = useState(false)
  const requestIdRef = useRef(0)

  const [incidentForm, setIncidentForm] = useState<{
    jenis: string
    deskripsi: string
    prioritas: Priority
    venue_id: number
  }>({
    jenis: '',
    deskripsi: '',
    prioritas: 'sedang',
    venue_id: 0,
  })

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (loading) return
    const t = setTimeout(() => setAnimIn(true), 50)
    return () => clearTimeout(t)
  }, [loading])

  async function loadData() {
    const reqId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const [venueRes, jadwalRes] = await Promise.all([
        sb.from('venue').select('id,nama,alamat,klaster_id').eq('klaster_id', 1).order('nama'),
        sb
          .from('jadwal_pertandingan')
          .select('id,nama_pertandingan,jam_mulai,jam_selesai,venue_id,venue(nama),cabang_olahraga(nama)')
          .order('jam_mulai')
          .limit(30),
      ])

      if (reqId !== requestIdRef.current) return
      if (venueRes.error) throw venueRes.error

      setVenues((venueRes.data ?? []) as Venue[])
      setJadwal((jadwalRes.data ?? []) as JadwalItem[])

      setIncidents([
        {
          id: 1,
          venue_id: 1,
          venue_nama: 'Stadion Patriot Candrabhaga',
          jenis: 'Teknis',
          deskripsi: 'Sound system area tribun barat mengalami gangguan',
          status: 'open',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          prioritas: 'tinggi',
        },
        {
          id: 2,
          venue_id: 3,
          venue_nama: 'Kolam Renang Harapan Indah',
          jenis: 'Keamanan',
          deskripsi: 'Akses parkir overload, butuh petugas tambahan',
          status: 'handled',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          prioritas: 'sedang',
        },
        {
          id: 3,
          venue_id: 2,
          venue_nama: 'GOR Bekasi Cyber Park',
          jenis: 'Logistik',
          deskripsi: 'Konsumsi wasit belum tiba, delay 30 menit',
          status: 'closed',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          prioritas: 'rendah',
        },
      ])
    } catch (e) {
      if (reqId !== requestIdRef.current) return
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }

  function handleRefresh() {
    void loadData()
  }

  function handleAddIncident() {
    if (!incidentForm.deskripsi || !incidentForm.jenis || incidentForm.venue_id === 0) return

    const newIncident: Incident = {
      id: Date.now(),
      venue_id: incidentForm.venue_id,
      venue_nama: venues.find((v) => v.id === incidentForm.venue_id)?.nama ?? '-',
      jenis: incidentForm.jenis,
      deskripsi: incidentForm.deskripsi,
      status: 'open',
      created_at: new Date().toISOString(),
      prioritas: incidentForm.prioritas,
    }

    setIncidents((prev) => [newIncident, ...prev])
    setShowAddIncident(false)
    setIncidentForm({ jenis: '', deskripsi: '', prioritas: 'sedang', venue_id: 0 })
  }

  function handleCloseIncident(id: number) {
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status: 'closed' } : inc)))
  }

  const statusCounts = useMemo(
    () => ({
      aktif: venues.filter((_, i) => getVenueStatus(i) === 'aktif').length,
      masalah: venues.filter((_, i) => getVenueStatus(i) === 'masalah').length,
    }),
    [venues]
  )

  const openIncidents = useMemo(() => incidents.filter((i) => i.status === 'open').length, [incidents])

  const filteredVenues = useMemo(() => {
    if (filterStatus === 'semua') return venues
    return venues.filter((_, i) => getVenueStatus(i) === filterStatus)
  }, [venues, filterStatus])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#eeeeee] rounded-xl">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#eeeeee] p-8">
        <div className="max-w-xl bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <h3 className="font-semibold text-lg">Gagal memuat data</h3>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  const ani = (d = 0) => ({
    className: `transition-all duration-700 ${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`,
    style: { transitionDelay: `${d}ms` },
  })

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 space-y-10 font-sans">
      <div {...ani(0)} className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white shadow-md flex items-center justify-center border border-gray-100">
            <img
              src="/logos/bekasi.png"
              alt="Bekasi"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                const el = e.target as HTMLImageElement
                el.style.display = 'none'
                const p = el.parentElement
                if (p) p.innerHTML = '<span class="text-orange-500 font-bold text-xs">BKS</span>'
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-light text-[#3c4858] tracking-wide">Command Center</h1>
            <div className="mt-1 text-sm text-[#999999]">Pusat Kendali Operasional Klaster I</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm text-gray-500 flex items-center gap-2 border border-gray-100">
            <Clock size={14} className="text-gray-400" /> <LiveClock />
          </div>
          <button
            onClick={handleRefresh}
            className="bg-white hover:bg-gray-50 px-4 py-2 rounded-full shadow-sm text-sm text-[#3c4858] flex items-center gap-2 border border-gray-100 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div {...ani(50)} className="grid grid-cols-4 gap-6 pt-6">
        {[
          {
            label: 'Total Fasilitas',
            value: venues.length,
            icon: Building2,
            color: 'bg-gradient-to-tr from-blue-500 to-blue-400',
            shadow: 'shadow-blue-500/40',
            sub: 'Klaster I Bekasi',
          },
          {
            label: 'Venue Aktif',
            value: statusCounts.aktif,
            icon: Activity,
            color: 'bg-gradient-to-tr from-green-500 to-green-400',
            shadow: 'shadow-green-500/40',
            sub: 'Digunakan saat ini',
          },
          {
            label: 'Incident Terbuka',
            value: openIncidents,
            icon: AlertTriangle,
            color: openIncidents > 0 ? 'bg-gradient-to-tr from-red-500 to-red-400' : 'bg-gradient-to-tr from-gray-500 to-gray-400',
            shadow: openIncidents > 0 ? 'shadow-red-500/40' : 'shadow-gray-500/40',
            sub: openIncidents > 0 ? 'Perlu tindakan segera' : 'Aman terkendali',
          },
          {
            label: 'Laga Hari Ini',
            value: jadwal.length,
            icon: Calendar,
            color: 'bg-gradient-to-tr from-orange-500 to-orange-400',
            shadow: 'shadow-orange-500/40',
            sub: 'Sesuai jadwal resmi',
          },
        ].map((card) => (
          <div key={card.label} className="relative bg-white rounded-xl shadow-md p-4 pt-6">
            <div className={`absolute -top-6 left-4 w-16 h-16 rounded-xl flex items-center justify-center shadow-lg ${card.color} ${card.shadow}`}>
              <card.icon size={26} className="text-white" />
            </div>
            <div className="text-right">
              <p className="text-sm font-light text-[#999999] mb-1">{card.label}</p>
              <h4 className="text-2xl font-light text-[#3c4858]">{card.value}</h4>
            </div>
            <div className="border-t border-gray-100 mt-5 pt-3 flex items-center gap-2">
              <Clock size={12} className="text-gray-400" />
              <p className="text-xs font-light text-[#999999]">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div {...ani(100)} className="grid grid-cols-3 gap-6 pt-8">
        <div className="col-span-2 relative bg-white rounded-xl shadow-md p-4 pt-10">
          <div className="absolute -top-8 left-4 right-4 h-20 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 shadow-lg shadow-cyan-500/40 px-6 flex items-center justify-between">
            <div>
              <h6 className="text-white text-lg font-normal">Peta Taktis Operasional</h6>
              <p className="text-cyan-50 text-sm font-light">Pemantauan Titik Venue Secara Real-time</p>
            </div>
            <Navigation size={32} className="text-white opacity-50" />
          </div>
          <div className="mt-14 w-full h-[400px]">
            <div className="absolute inset-0 z-20 pointer-events-none mt-24 px-4 pb-4">
              <div className="w-full h-full border border-gray-200 rounded-lg pointer-events-auto shadow-inner">
                <PetaCommandCenter venues={venues} />
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-white rounded-xl shadow-md p-4 pt-10 flex flex-col h-[528px]">
          <div className="absolute -top-8 left-4 right-4 h-20 rounded-xl bg-gradient-to-tr from-purple-600 to-purple-400 shadow-lg shadow-purple-500/40 px-6 flex items-center justify-between">
            <div>
              <h6 className="text-white text-lg font-normal">Status Venue</h6>
              <p className="text-purple-50 text-sm font-light">Filter & Detail Cepat</p>
            </div>
          </div>

          <div className="mt-14 mb-4 flex flex-wrap gap-2">
            {(['semua', 'aktif', 'siap', 'masalah', 'standby'] as const).map((s) => {
              const conf =
                s === 'semua'
                  ? { label: 'Semua', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' }
                  : VENUE_STATUS_CONFIG[s]
              const isActive = filterStatus === s
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    isActive
                      ? `${conf.bg} ${conf.color} border-transparent font-bold`
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {conf.label}
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {filteredVenues.map((v, i) => {
              const realIndex = venues.findIndex((x) => x.id === v.id)
              const status = getVenueStatus(realIndex < 0 ? i : realIndex)
              const conf = VENUE_STATUS_CONFIG[status]
              const isSelected = selectedVenue?.id === v.id

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVenue(isSelected ? null : v)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? `${conf.bg} border-transparent` : 'bg-white border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-[#3c4858] leading-tight pr-2">{v.nama}</span>
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${conf.dot} ${
                        status === 'aktif' ? 'animate-pulse' : ''
                      }`}
                    />
                  </div>
                  <div className="text-xs text-[#999999] truncate">{v.alamat || 'Kota Bekasi'}</div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-black/5 flex gap-2">
                      <Link
                        href={`/konida/penyelenggara/venue/${v.id}`}
                        className="text-[10px] bg-white border border-gray-200 px-3 py-1 rounded text-gray-600 hover:bg-gray-50"
                      >
                        Detail Lengkap
                      </Link>
                      {status !== 'masalah' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setIncidentForm((f) => ({ ...f, venue_id: v.id }))
                            setShowAddIncident(true)
                          }}
                          className="text-[10px] bg-red-50 border border-red-100 px-3 py-1 rounded text-red-600 hover:bg-red-100"
                        >
                          Lapor Insiden
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div {...ani(150)} className="grid grid-cols-3 gap-6 pt-6">
        <div className="col-span-1 bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-[380px]">
          <div className="bg-gradient-to-tr from-blue-600 to-blue-500 p-4 rounded-t-xl shadow-[0_4px_20px_0px_rgba(0,0,0,0.14),0_7px_10px_-5px_rgba(33,150,243,0.4)] mx-4 -mt-4 relative z-10">
            <h4 className="text-white text-lg font-normal mb-1 flex items-center gap-2">
              <Activity size={18} /> Pertandingan Live
            </h4>
            <p className="text-blue-100 text-sm font-light">Agenda yang sedang berlangsung</p>
          </div>
          <div className="p-0 overflow-y-auto mt-2">
            {jadwal.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Belum ada pertandingan aktif</div>
            ) : (
              jadwal.map((j, i) => (
                <div key={j.id} className={`flex gap-4 p-4 border-b border-gray-50 ${i === 0 ? 'bg-blue-50/30' : ''}`}>
                  <div className="text-center w-12 flex-shrink-0">
                    <div className={`font-bold ${i === 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                      {j.jam_mulai?.slice(0, 5) ?? '--:--'}
                    </div>
                    <div className="text-[10px] text-gray-400">{j.jam_selesai?.slice(0, 5) ?? ''}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#3c4858]">{j.nama_pertandingan}</div>
                    <div className="text-xs text-gray-500 mt-1">{j.venue?.nama ?? '-'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-1 bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-[380px]">
          <div
            className={`bg-gradient-to-tr ${
              openIncidents > 0 ? 'from-red-600 to-red-500' : 'from-green-600 to-green-500'
            } p-4 rounded-t-xl shadow-[0_4px_20px_0px_rgba(0,0,0,0.14)] mx-4 -mt-4 relative z-10 flex justify-between items-start`}
          >
            <div>
              <h4 className="text-white text-lg font-normal mb-1 flex items-center gap-2">
                <Bell size={18} /> Incident Report
              </h4>
              <p className="text-white/80 text-sm font-light">
                {openIncidents > 0 ? `${openIncidents} Laporan Terbuka` : 'Tidak ada kendala'}
              </p>
            </div>
            <button
              onClick={() => setShowAddIncident(true)}
              className="bg-white/20 hover:bg-white/30 text-white rounded p-1.5 backdrop-blur-sm transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="p-0 overflow-y-auto mt-2">
            {incidents.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Sistem aman terkendali</div>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className={`p-4 border-b border-gray-50 ${inc.status === 'open' ? 'bg-red-50/20' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        inc.status === 'open'
                          ? 'bg-red-100 text-red-600'
                          : inc.status === 'handled'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {inc.status === 'open' ? 'OPEN' : inc.status === 'handled' ? 'DITANGANI' : 'SELESAI'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(inc.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[#3c4858] mb-1">{inc.deskripsi}</div>
                  <div className="text-xs text-gray-500">
                    {inc.venue_nama} · {inc.jenis}
                  </div>
                  {inc.status === 'open' && (
                    <button
                      onClick={() => handleCloseIncident(inc.id)}
                      className="mt-3 text-xs font-bold text-green-500 hover:text-green-600"
                    >
                      ✓ TANDAI SELESAI
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-6">
          <div className="bg-gradient-to-tr from-[#1e88e5] to-blue-600 rounded-xl shadow-lg shadow-blue-500/20 p-6 flex flex-col justify-center relative overflow-hidden h-[180px]">
            <div className="absolute -right-6 top-4 opacity-20">
              <Zap size={120} className="text-white" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-normal text-white mb-1 flex items-center gap-2">
                SIPA Intelligence
                <span className="text-[9px] bg-white text-blue-600 px-2 py-0.5 rounded-full font-black uppercase">On</span>
              </h3>
              <p className="text-blue-100 text-xs mb-4 font-light">
                Asisten AI operasional. Analisis kendala & laporan venue secara live.
              </p>
              <Link
                href="/konida/sipa"
                className="inline-block bg-white hover:bg-gray-100 text-blue-700 text-xs px-4 py-2 rounded shadow-md font-medium"
              >
                Tanya SIPA AI →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 h-[176px]">
            <Link
              href="/konida/penyelenggara/kesiapan"
              className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors group border border-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <CheckCircle size={20} />
              </div>
              <span className="text-xs text-[#3c4858] font-medium">Cek Kesiapan</span>
            </Link>
            <Link
              href="/konida/penyelenggara/laporan"
              className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors group border border-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <span className="text-xs text-[#3c4858] font-medium">Laporan PDF</span>
            </Link>
          </div>
        </div>
      </div>

      {showAddIncident && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-medium text-lg">Lapor Kendala / Insiden</h3>
              <button onClick={() => setShowAddIncident(false)} className="text-red-100 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Pilih Venue</label>
                <select
                  value={incidentForm.venue_id}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, venue_id: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                >
                  <option value={0}>-- Pilih Venue yang Bermasalah --</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Jenis Insiden</label>
                  <select
                    value={incidentForm.jenis}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, jenis: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                  >
                    <option value="">-- Kategori --</option>
                    {['Teknis', 'Keamanan', 'Logistik', 'Kesehatan', 'Cuaca', 'Lainnya'].map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                    Tingkat Prioritas
                  </label>
                  <select
                    value={incidentForm.prioritas}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, prioritas: e.target.value as Priority }))}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-red-500 outline-none bg-gray-50"
                  >
                    <option value="rendah">Rendah (Aman)</option>
                    <option value="sedang">Sedang (Perlu Perhatian)</option>
                    <option value="tinggi">Tinggi (Darurat!)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Deskripsi Kejadian</label>
                <textarea
                  value={incidentForm.deskripsi}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Jelaskan detail masalah yang terjadi di lapangan..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-[#3c4858] focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 resize-y"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setShowAddIncident(false)}
                className="px-5 py-2 text-sm text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddIncident}
                disabled={!incidentForm.jenis || !incidentForm.deskripsi || incidentForm.venue_id === 0}
                className="px-5 py-2 text-sm bg-red-500 disabled:bg-red-300 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-md shadow-red-500/30"
              >
                Kirim Laporan Siaga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}