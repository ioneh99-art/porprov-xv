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
  Layers,
  Navigation,
  Plus,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Wifi,
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

// Extended venue metadata
interface VenueMeta {
  cabor: string
  kapasitas: number
  petugas: number
  penonton: number
  klaster_label: string
}

const VENUE_META: Record<number, VenueMeta> = {
  0: { cabor: 'Atletik', kapasitas: 500, petugas: 24, penonton: 380, klaster_label: 'Klaster I' },
  1: { cabor: 'Renang', kapasitas: 300, petugas: 18, penonton: 210, klaster_label: 'Klaster I' },
  2: { cabor: 'Bulu Tangkis', kapasitas: 400, petugas: 20, penonton: 315, klaster_label: 'Klaster I' },
  3: { cabor: 'Voli', kapasitas: 350, petugas: 16, penonton: 120, klaster_label: 'Klaster I' },
  4: { cabor: 'Basket', kapasitas: 280, petugas: 14, penonton: 95, klaster_label: 'Klaster I' },
  5: { cabor: 'Sepak Bola', kapasitas: 600, petugas: 32, penonton: 0, klaster_label: 'Klaster I' },
  6: { cabor: 'Tenis', kapasitas: 200, petugas: 12, penonton: 0, klaster_label: 'Klaster I' },
  7: { cabor: 'Pencak Silat', kapasitas: 250, petugas: 15, penonton: 0, klaster_label: 'Klaster I' },
  8: { cabor: 'Panahan', kapasitas: 180, petugas: 10, penonton: 0, klaster_label: 'Klaster I' },
  9: { cabor: 'Taekwondo', kapasitas: 220, petugas: 13, penonton: 0, klaster_label: 'Klaster I' },
  10: { cabor: 'Judo', kapasitas: 150, petugas: 9, penonton: 0, klaster_label: 'Klaster I' },
  11: { cabor: 'Karate', kapasitas: 160, petugas: 10, penonton: 0, klaster_label: 'Klaster I' },
  12: { cabor: 'Angkat Besi', kapasitas: 120, petugas: 8, penonton: 0, klaster_label: 'Klaster I' },
  13: { cabor: 'Tinju', kapasitas: 200, petugas: 12, penonton: 0, klaster_label: 'Klaster I' },
  14: { cabor: 'Senam', kapasitas: 180, petugas: 11, penonton: 0, klaster_label: 'Klaster I' },
}

const VENUE_STATUS_CONFIG: Record<VenueStatus, { label: string; color: string; bg: string; dot: string; hex: string }> = {
  aktif: { label: 'Aktif', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', hex: '#4caf50' },
  siap: { label: 'Siap', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500', hex: '#2196f3' },
  masalah: { label: 'Masalah', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', hex: '#f44336' },
  standby: { label: 'Standby', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500', hex: '#ff9800' },
  selesai: { label: 'Selesai', color: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400', hex: '#9e9e9e' },
}

// Koordinat venue Bekasi area (real approximation)
const VENUE_COORDS: [number, number][] = [
  [-6.2383, 106.9756], // Stadion Patriot
  [-6.2451, 106.9823], // Kolam Renang
  [-6.2298, 106.9689], // GOR Cyber Park
  [-6.2512, 106.9612], // Hall A
  [-6.2187, 106.9901], // Hall B
  [-6.2634, 106.9745], // Lapangan C
  [-6.2356, 107.0012], // Area D
  [-6.2289, 106.9534], // Gedung E
  [-6.2701, 106.9867], // Arena F
  [-6.2423, 107.0098], // Venue G
  [-6.2156, 106.9678], // Venue H
  [-6.2589, 106.9523], // Venue I
  [-6.2478, 107.0045], // Venue J
  [-6.2334, 106.9445], // Venue K
  [-6.2712, 107.0123], // Venue L
]

function getVenueStatus(idx: number): VenueStatus {
  const statuses: VenueStatus[] = [
    'aktif', 'aktif', 'aktif',
    'siap', 'siap', 'siap', 'siap',
    'standby', 'standby', 'standby', 'standby', 'standby',
    'selesai', 'selesai', 'masalah',
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
      {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

// Mini donut ring untuk penonton/kapasitas
function CapacityRing({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={36} height={36} viewBox="0 0 36 36" className="flex-shrink-0">
      <circle cx={18} cy={18} r={r} fill="none" stroke="#e5e7eb" strokeWidth={3} />
      <circle
        cx={18} cy={18} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text x={18} y={22} textAnchor="middle" fontSize={8} fill={color} fontWeight="bold">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

function PetaCommandCenter({ venues, selectedVenueId, onVenueClick }: {
  venues: Venue[]
  selectedVenueId: number | null
  onVenueClick: (id: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Record<number, any>>({})

  useEffect(() => {
    let cancelled = false

    async function initMap() {
      if (!mapRef.current) return
      const L = (await import('leaflet')).default
      // @ts-ignore
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number }
      if (container._leaflet_id) container._leaflet_id = undefined

      const map = L.map(mapRef.current, {
        center: [-6.2451, 106.9745],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      })
      mapInstanceRef.current = map

      // Light clean tile
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap © CARTO',
      }).addTo(map)

      markersRef.current = {}

      venues.forEach((v, i) => {
        const status = getVenueStatus(i)
        const conf = VENUE_STATUS_CONFIG[status]
        const meta = VENUE_META[i] ?? { cabor: '-', kapasitas: 0, petugas: 0, penonton: 0, klaster_label: 'Klaster I' }
        const coords = VENUE_COORDS[i] ?? [-6.245 + Math.sin(i) * 0.04, 106.975 + Math.cos(i) * 0.04]

        const isPulse = status === 'aktif'
        const isAlert = status === 'masalah'
        const radius = isAlert ? 13 : isPulse ? 11 : 9

        const marker = L.circleMarker(coords, {
          radius,
          fillColor: conf.hex,
          color: '#ffffff',
          weight: isAlert ? 3 : 2,
          opacity: 1,
          fillOpacity: isAlert ? 1 : 0.88,
          className: isPulse ? 'pulse-marker' : '',
        }).addTo(map)

        const safeNama = escapeHtml(v.nama || '-')
        const safeAlamat = escapeHtml(v.alamat || 'Kota Bekasi')
        const pctPenonton = meta.kapasitas > 0 ? Math.round((meta.penonton / meta.kapasitas) * 100) : 0

        marker.bindPopup(
          `<div style="font-family:'Segoe UI',sans-serif;min-width:200px;padding:2px">
            <div style="font-size:10px;font-weight:700;color:${conf.hex};letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">
              ● ${status.toUpperCase()}
            </div>
            <div style="font-weight:700;font-size:13px;color:#3c4858;margin-bottom:2px">${safeNama}</div>
            <div style="font-size:11px;color:#aaa;margin-bottom:8px">${safeAlamat}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;background:#f8f9fa;border-radius:6px;padding:6px">
              <div><span style="color:#999">Cabor:</span> <b style="color:#3c4858">${meta.cabor}</b></div>
              <div><span style="color:#999">Kapasitas:</span> <b style="color:#3c4858">${meta.kapasitas}</b></div>
              <div><span style="color:#999">Petugas:</span> <b style="color:#3c4858">${meta.petugas}</b></div>
              <div><span style="color:#999">Penonton:</span> <b style="color:${conf.hex}">${meta.penonton > 0 ? `${pctPenonton}%` : 'Kosong'}</b></div>
            </div>
          </div>`,
          { className: 'custom-popup-light' }
        )

        marker.on('click', () => onVenueClick(v.id))
        markersRef.current[v.id] = marker
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
    <div className="w-full h-full relative rounded-xl overflow-hidden">
      <style>{`
        .custom-popup-light .leaflet-popup-content-wrapper {
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          border-radius: 10px;
          border: none;
          padding: 0;
        }
        .custom-popup-light .leaflet-popup-content { margin: 12px 14px; }
        .custom-popup-light .leaflet-popup-tip { background: white; }
        .leaflet-container { background: #f0f4f8; z-index: 10; }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          border: none !important;
          color: #3c4858 !important;
          font-weight: bold;
        }
        @keyframes markerPulse {
          0% { stroke-opacity: 1; stroke-width: 2; }
          50% { stroke-opacity: 0.4; stroke-width: 6; }
          100% { stroke-opacity: 1; stroke-width: 2; }
        }
        .pulse-marker path, .pulse-marker circle {
          animation: markerPulse 2s ease-in-out infinite;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full min-h-[400px]" />
    </div>
  )
}

// Legend overlay untuk peta
function MapLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 px-3 py-2.5 flex flex-col gap-1.5">
      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status Venue</div>
      {(Object.entries(VENUE_STATUS_CONFIG) as [VenueStatus, typeof VENUE_STATUS_CONFIG[VenueStatus]][]).map(([key, conf]) => (
        <div key={key} className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${conf.dot}`} />
          <span className="text-[10px] text-gray-600 font-medium">{conf.label}</span>
        </div>
      ))}
    </div>
  )
}

// Stats bar di atas peta
function MapStatsBar({ venues }: { venues: Venue[] }) {
  const counts = useMemo(() => {
    const c: Record<VenueStatus, number> = { aktif: 0, siap: 0, masalah: 0, standby: 0, selesai: 0 }
    venues.forEach((_, i) => { c[getVenueStatus(i)]++ })
    return c
  }, [venues])

  const totalMeta = useMemo(() => {
    let totalPetugas = 0, totalPenonton = 0
    venues.forEach((_, i) => {
      const m = VENUE_META[i]
      if (m) { totalPetugas += m.petugas; totalPenonton += m.penonton }
    })
    return { totalPetugas, totalPenonton }
  }, [venues])

  return (
    <div className="absolute top-3 left-3 right-3 z-[400] flex gap-2 flex-wrap">
      {[
        { label: 'Aktif', value: counts.aktif, color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
        { label: 'Siap', value: counts.siap, color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
        { label: 'Standby', value: counts.standby, color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
        { label: 'Masalah', value: counts.masalah, color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
        { label: 'Selesai', value: counts.selesai, color: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50' },
      ].map((s) => (
        <div key={s.label} className={`${s.bg} border border-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm`}>
          <div className={`w-2 h-2 rounded-full ${s.color}`} />
          <span className={`text-[10px] font-bold ${s.text}`}>{s.value}</span>
          <span className="text-[10px] text-gray-500">{s.label}</span>
        </div>
      ))}
      <div className="bg-white/90 border border-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm ml-auto">
        <Users size={10} className="text-gray-400" />
        <span className="text-[10px] font-bold text-gray-700">{totalMeta.totalPetugas}</span>
        <span className="text-[10px] text-gray-400">petugas</span>
        <span className="text-gray-200 mx-1">|</span>
        <span className="text-[10px] font-bold text-gray-700">{totalMeta.totalPenonton}</span>
        <span className="text-[10px] text-gray-400">penonton</span>
      </div>
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
  const [mapSelectedId, setMapSelectedId] = useState<number | null>(null)
  const requestIdRef = useRef(0)

  const [incidentForm, setIncidentForm] = useState<{
    jenis: string; deskripsi: string; prioritas: Priority; venue_id: number
  }>({ jenis: '', deskripsi: '', prioritas: 'sedang', venue_id: 0 })

  useEffect(() => { void loadData() }, [])
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
        sb.from('jadwal_pertandingan')
          .select('id,nama_pertandingan,jam_mulai,jam_selesai,venue_id,venue(nama),cabang_olahraga(nama)')
          .order('jam_mulai').limit(30),
      ])
      if (reqId !== requestIdRef.current) return
      if (venueRes.error) throw venueRes.error
      setVenues((venueRes.data ?? []) as Venue[])
      setJadwal((jadwalRes.data ?? []) as JadwalItem[])
      setIncidents([
        {
          id: 1, venue_id: 1, venue_nama: 'Stadion Patriot Candrabhaga',
          jenis: 'Teknis', deskripsi: 'Sound system area tribun barat mengalami gangguan',
          status: 'open', created_at: new Date(Date.now() - 1800000).toISOString(), prioritas: 'tinggi',
        },
        {
          id: 2, venue_id: 3, venue_nama: 'Kolam Renang Harapan Indah',
          jenis: 'Keamanan', deskripsi: 'Akses parkir overload, butuh petugas tambahan',
          status: 'handled', created_at: new Date(Date.now() - 3600000).toISOString(), prioritas: 'sedang',
        },
        {
          id: 3, venue_id: 2, venue_nama: 'GOR Bekasi Cyber Park',
          jenis: 'Logistik', deskripsi: 'Konsumsi wasit belum tiba, delay 30 menit',
          status: 'closed', created_at: new Date(Date.now() - 7200000).toISOString(), prioritas: 'rendah',
        },
      ])
    } catch (e) {
      if (reqId !== requestIdRef.current) return
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
    } finally {
      if (reqId === requestIdRef.current) setLoading(false)
    }
  }

  function handleAddIncident() {
    if (!incidentForm.deskripsi || !incidentForm.jenis || incidentForm.venue_id === 0) return
    const newIncident: Incident = {
      id: Date.now(), venue_id: incidentForm.venue_id,
      venue_nama: venues.find((v) => v.id === incidentForm.venue_id)?.nama ?? '-',
      jenis: incidentForm.jenis, deskripsi: incidentForm.deskripsi,
      status: 'open', created_at: new Date().toISOString(), prioritas: incidentForm.prioritas,
    }
    setIncidents((prev) => [newIncident, ...prev])
    setShowAddIncident(false)
    setIncidentForm({ jenis: '', deskripsi: '', prioritas: 'sedang', venue_id: 0 })
  }

  function handleCloseIncident(id: number) {
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, status: 'closed' } : inc)))
  }

  const statusCounts = useMemo(() => {
    const c: Record<VenueStatus, number> = { aktif: 0, siap: 0, masalah: 0, standby: 0, selesai: 0 }
    venues.forEach((_, i) => { c[getVenueStatus(i)]++ })
    return c
  }, [venues])

  const totalStats = useMemo(() => {
    let petugas = 0, penonton = 0, kapasitas = 0
    venues.forEach((_, i) => {
      const m = VENUE_META[i]
      if (m) { petugas += m.petugas; penonton += m.penonton; kapasitas += m.kapasitas }
    })
    return { petugas, penonton, kapasitas, pct: kapasitas > 0 ? Math.round((penonton / kapasitas) * 100) : 0 }
  }, [venues])

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
          <button onClick={() => void loadData()} className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">
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

      {/* ─── Header ─── */}
      <div {...ani(0)} className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white shadow-md flex items-center justify-center border border-gray-100">
            <img
              src="/logos/bekasi.png" alt="Bekasi" className="w-10 h-10 object-contain"
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
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-[#999999]">Pusat Kendali Operasional Klaster I · Live</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm text-gray-500 flex items-center gap-2 border border-gray-100">
            <Clock size={14} className="text-gray-400" /> <LiveClock />
          </div>
          <button
            onClick={() => void loadData()}
            className="bg-white hover:bg-gray-50 px-4 py-2 rounded-full shadow-sm text-sm text-[#3c4858] flex items-center gap-2 border border-gray-100 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div {...ani(50)} className="grid grid-cols-5 gap-5 pt-6">
        {[
          {
            label: 'Total Fasilitas', value: venues.length, icon: Building2,
            color: 'bg-gradient-to-tr from-blue-500 to-blue-400', shadow: 'shadow-blue-500/40', sub: 'Klaster I Bekasi',
          },
          {
            label: 'Venue Aktif', value: statusCounts.aktif, icon: Activity,
            color: 'bg-gradient-to-tr from-green-500 to-green-400', shadow: 'shadow-green-500/40', sub: 'Pertandingan berjalan',
          },
          {
            label: 'Incident Terbuka', value: openIncidents, icon: AlertTriangle,
            color: openIncidents > 0 ? 'bg-gradient-to-tr from-red-500 to-red-400' : 'bg-gradient-to-tr from-gray-400 to-gray-300',
            shadow: openIncidents > 0 ? 'shadow-red-500/40' : 'shadow-gray-400/40',
            sub: openIncidents > 0 ? 'Perlu tindakan segera' : 'Aman terkendali',
          },
          {
            label: 'Total Petugas', value: totalStats.petugas, icon: Shield,
            color: 'bg-gradient-to-tr from-purple-500 to-purple-400', shadow: 'shadow-purple-500/40', sub: 'Di seluruh venue',
          },
          {
            label: 'Laga Hari Ini', value: jadwal.length, icon: Calendar,
            color: 'bg-gradient-to-tr from-orange-500 to-orange-400', shadow: 'shadow-orange-500/40', sub: 'Sesuai jadwal resmi',
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

      {/* ─── Occupancy Bar ─── */}
      <div {...ani(80)} className="bg-white rounded-xl shadow-md px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-2 flex-shrink-0">
          <TrendingUp size={16} className="text-orange-500" />
          <span className="text-sm font-medium text-[#3c4858]">Kapasitas Penonton</span>
        </div>
        <div className="flex-1 relative">
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-1000"
              style={{ width: `${totalStats.pct}%` }}
            />
          </div>
        </div>
        <div className="text-sm font-bold text-orange-600 flex-shrink-0">{totalStats.pct}%</div>
        <div className="text-xs text-gray-400 flex-shrink-0">{totalStats.penonton.toLocaleString()} / {totalStats.kapasitas.toLocaleString()} kursi</div>
        <div className="flex items-center gap-3 ml-2">
          {(['aktif', 'siap', 'masalah', 'standby'] as VenueStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${VENUE_STATUS_CONFIG[s].dot}`} />
              <span className="text-xs text-gray-500">{statusCounts[s]} {VENUE_STATUS_CONFIG[s].label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Peta + Venue Status ─── */}
      <div {...ani(100)} className="grid grid-cols-3 gap-6 pt-8">
        {/* Peta */}
        <div className="col-span-2 relative bg-white rounded-xl shadow-md p-4 pt-10">
          <div className="absolute -top-8 left-4 right-4 h-20 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 shadow-lg shadow-cyan-500/40 px-6 flex items-center justify-between z-10">
            <div>
              <h6 className="text-white text-lg font-normal flex items-center gap-2">
                Peta Taktis Operasional
                <span className="flex items-center gap-1 bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full">
                  <Wifi size={8} /> LIVE
                </span>
              </h6>
              <p className="text-cyan-50 text-sm font-light">{venues.length} titik venue dipantau secara real-time</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-white/60 text-[10px]">Area Coverage</div>
                <div className="text-white font-bold text-sm">Klaster I · Bekasi</div>
              </div>
              <Navigation size={32} className="text-white opacity-40" />
            </div>
          </div>

          {/* Map container */}
          <div className="mt-16 w-full rounded-xl overflow-hidden relative" style={{ height: 440 }}>
            <MapStatsBar venues={venues} />
            <PetaCommandCenter
              venues={venues}
              selectedVenueId={mapSelectedId}
              onVenueClick={(id) => {
                setMapSelectedId(id)
                const v = venues.find((x) => x.id === id)
                setSelectedVenue(v ?? null)
              }}
            />
            <MapLegend />
          </div>
        </div>

        {/* Venue Status Panel */}
        <div className="relative bg-white rounded-xl shadow-md p-4 pt-10 flex flex-col" style={{ maxHeight: 580 }}>
          <div className="absolute -top-8 left-4 right-4 h-20 rounded-xl bg-gradient-to-tr from-purple-600 to-purple-400 shadow-lg shadow-purple-500/40 px-6 flex items-center justify-between z-10">
            <div>
              <h6 className="text-white text-lg font-normal">Status Venue</h6>
              <p className="text-purple-50 text-sm font-light">Filter & Detail Cepat</p>
            </div>
            <Layers size={24} className="text-white/40" />
          </div>

          <div className="mt-14 mb-3 flex flex-wrap gap-1.5">
            {(['semua', 'aktif', 'siap', 'masalah', 'standby', 'selesai'] as const).map((s) => {
              const conf = s === 'semua'
                ? { label: 'Semua', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400', hex: '' }
                : VENUE_STATUS_CONFIG[s]
              const isActive = filterStatus === s
              const count = s === 'semua' ? venues.length : statusCounts[s]
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                    isActive
                      ? `${conf.bg} ${conf.color} border-transparent font-bold`
                      : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {conf.label}
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${isActive ? 'bg-white/60' : 'bg-gray-100'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredVenues.map((v, i) => {
              const realIndex = venues.findIndex((x) => x.id === v.id)
              const idx = realIndex < 0 ? i : realIndex
              const status = getVenueStatus(idx)
              const conf = VENUE_STATUS_CONFIG[status]
              const meta = VENUE_META[idx] ?? { cabor: '-', kapasitas: 0, petugas: 0, penonton: 0, klaster_label: '' }
              const isSelected = selectedVenue?.id === v.id || mapSelectedId === v.id

              return (
                <div
                  key={v.id}
                  onClick={() => {
                    const next = isSelected ? null : v
                    setSelectedVenue(next)
                    setMapSelectedId(next?.id ?? null)
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? `${conf.bg} border-${conf.dot.replace('bg-', '')}/30` : 'bg-white border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-[#3c4858] leading-tight pr-2 flex-1">{v.nama}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${conf.dot} ${status === 'aktif' ? 'animate-pulse' : ''}`} />
                      <span className={`text-[9px] font-bold ${conf.color}`}>{conf.label}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#999] mb-2 truncate">{meta.cabor} · {v.alamat || 'Kota Bekasi'}</div>

                  {/* Mini stats row */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Users size={9} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500">{meta.petugas} petugas</span>
                    </div>
                    {meta.penonton > 0 && (
                      <div className="flex items-center gap-1 ml-auto">
                        <CapacityRing value={meta.penonton} max={meta.kapasitas} color={conf.hex} />
                        <span className="text-[9px] text-gray-400">{meta.penonton}/{meta.kapasitas}</span>
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-black/5 flex gap-2">
                      <Link
                        href={`/konida/penyelenggara/venue/${v.id}`}
                        className="text-[10px] bg-white border border-gray-200 px-3 py-1 rounded text-gray-600 hover:bg-gray-50"
                        onClick={(e) => e.stopPropagation()}
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

      {/* ─── Bottom Row ─── */}
      <div {...ani(150)} className="grid grid-cols-3 gap-6 pt-6">

        {/* Pertandingan Live */}
        <div className="col-span-1 bg-white rounded-xl shadow-md overflow-hidden flex flex-col" style={{ height: 380 }}>
          <div className="bg-gradient-to-tr from-blue-600 to-blue-500 p-4 rounded-t-xl shadow-[0_4px_20px_0px_rgba(0,0,0,0.14),0_7px_10px_-5px_rgba(33,150,243,0.4)] mx-4 -mt-4 relative z-10">
            <h4 className="text-white text-lg font-normal mb-1 flex items-center gap-2">
              <Activity size={18} /> Pertandingan Live
              <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{jadwal.length} laga</span>
            </h4>
            <p className="text-blue-100 text-sm font-light">Agenda yang sedang berlangsung</p>
          </div>
          <div className="overflow-y-auto mt-2 flex-1">
            {jadwal.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Belum ada pertandingan aktif</div>
            ) : (
              jadwal.map((j, i) => (
                <div key={j.id} className={`flex gap-4 p-4 border-b border-gray-50 ${i === 0 ? 'bg-blue-50/30' : ''}`}>
                  <div className="text-center w-12 flex-shrink-0">
                    <div className={`font-bold text-sm ${i === 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                      {j.jam_mulai?.slice(0, 5) ?? '--:--'}
                    </div>
                    <div className="text-[10px] text-gray-400">{j.jam_selesai?.slice(0, 5) ?? ''}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#3c4858]">{j.nama_pertandingan}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{j.venue?.nama ?? '-'} · {j.cabang_olahraga?.nama ?? ''}</div>
                  </div>
                  {i === 0 && (
                    <div className="flex-shrink-0 flex items-center">
                      <span className="text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">LIVE</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Incident Report */}
        <div className="col-span-1 bg-white rounded-xl shadow-md overflow-hidden flex flex-col" style={{ height: 380 }}>
          <div
            className={`bg-gradient-to-tr ${openIncidents > 0 ? 'from-red-600 to-red-500' : 'from-green-600 to-green-500'} p-4 rounded-t-xl shadow-[0_4px_20px_0px_rgba(0,0,0,0.14)] mx-4 -mt-4 relative z-10 flex justify-between items-start`}
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
          <div className="overflow-y-auto mt-2 flex-1">
            {incidents.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Sistem aman terkendali</div>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className={`p-4 border-b border-gray-50 ${inc.status === 'open' ? 'bg-red-50/20' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        inc.status === 'open' ? 'bg-red-100 text-red-600'
                        : inc.status === 'handled' ? 'bg-orange-100 text-orange-600'
                        : 'bg-green-100 text-green-600'
                      }`}>
                        {inc.status === 'open' ? 'OPEN' : inc.status === 'handled' ? 'DITANGANI' : 'SELESAI'}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        inc.prioritas === 'tinggi' ? 'bg-red-50 text-red-400'
                        : inc.prioritas === 'sedang' ? 'bg-orange-50 text-orange-400'
                        : 'bg-gray-50 text-gray-400'
                      }`}>
                        {inc.prioritas}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {new Date(inc.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[#3c4858] mb-1">{inc.deskripsi}</div>
                  <div className="text-xs text-gray-500">{inc.venue_nama} · {inc.jenis}</div>
                  {inc.status === 'open' && (
                    <button
                      onClick={() => handleCloseIncident(inc.id)}
                      className="mt-3 text-xs font-bold text-green-500 hover:text-green-600 flex items-center gap-1"
                    >
                      <CheckCircle size={12} /> TANDAI SELESAI
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="bg-gradient-to-tr from-[#1e88e5] to-blue-600 rounded-xl shadow-lg shadow-blue-500/20 p-6 flex flex-col justify-center relative overflow-hidden" style={{ height: 180 }}>
            <div className="absolute -right-6 top-4 opacity-10">
              <Zap size={140} className="text-white" />
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

          <div className="grid grid-cols-2 gap-4" style={{ height: 176 }}>
            <Link
              href="/konida/penyelenggara/kesiapan"
              className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors group border border-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <CheckCircle size={20} />
              </div>
              <span className="text-xs text-[#3c4858] font-medium">Cek Kesiapan</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Checklist Venue</span>
            </Link>
            <Link
              href="/konida/penyelenggara/laporan"
              className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors group border border-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <span className="text-xs text-[#3c4858] font-medium">Laporan PDF</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Export & Share</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Modal Add Incident ─── */}
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
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.nama}</option>)}
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
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Tingkat Prioritas</label>
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