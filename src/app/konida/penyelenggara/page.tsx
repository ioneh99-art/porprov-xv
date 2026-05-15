'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Monitor, MapPin, AlertTriangle, CheckCircle,
  Clock, Users, ChevronRight, RefreshCw,
  Phone, Zap, Activity, Shield, Building2,
  FileText, Bell, TrendingUp, XCircle, Plus
} from 'lucide-react'

const C = {
  orange: '#E84E0F', orangeLight: '#FEF0EA', orangeBorder: '#FBBF9B',
  blue: '#1B6EC2', blueLight: '#EBF3FC', blueBorder: '#90C0F0',
  green: '#3AAA35', greenLight: '#EAF7E9', greenBorder: '#8FD48C',
  yellow: '#F5C518', yellowLight: '#FFFBE8', yellowBorder: '#F5DC7A',
  red: '#DC2626', redLight: '#FEF2F2', redBorder: '#FCA5A5',
  gray: '#F8F8F7', grayBorder: '#E5E5E2',
  text: '#1a1a18', textMuted: '#6b7280', textLight: '#9ca3af',
  white: '#ffffff',
}

type VenueStatus = 'aktif' | 'siap' | 'selesai' | 'masalah' | 'standby'

interface Venue {
  id: number; nama: string; alamat: string; klaster_id: number
}
interface Incident {
  id: number; venue_id: number; venue_nama: string
  jenis: string; deskripsi: string; status: 'open' | 'handled' | 'closed'
  created_at: string; prioritas: 'tinggi' | 'sedang' | 'rendah'
}

const VENUE_STATUS_CONFIG: Record<VenueStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  aktif:   { label: 'Aktif',   color: C.green,   bg: C.greenLight,  border: C.greenBorder,  dot: C.green },
  siap:    { label: 'Siap',    color: C.blue,    bg: C.blueLight,   border: C.blueBorder,   dot: C.blue },
  selesai: { label: 'Selesai', color: C.textMuted, bg: C.gray,      border: C.grayBorder,   dot: C.textLight },
  masalah: { label: 'Masalah', color: C.red,     bg: C.redLight,    border: C.redBorder,    dot: C.red },
  standby: { label: 'Standby', color: '#b45309', bg: C.yellowLight, border: C.yellowBorder, dot: C.yellow },
}

// Simulasi status venue dari data DB
function getVenueStatus(idx: number): VenueStatus {
  const statuses: VenueStatus[] = ['aktif','aktif','aktif','siap','siap','siap','siap','standby','standby','standby','standby','standby','selesai','selesai','masalah']
  return statuses[idx % statuses.length]
}

function StatusBadge({ status }: { status: VenueStatus }) {
  const s = VENUE_STATUS_CONFIG[status]
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
      {s.label}
    </span>
  )
}

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color: C.orange, fontWeight: 700, fontSize: 13 }}>
      {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

export default function CommandCenter() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [jadwal, setJadwal] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [showAddIncident, setShowAddIncident] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [incidentForm, setIncidentForm] = useState({ jenis: '', deskripsi: '', prioritas: 'sedang', venue_id: 0 })
  const [filterStatus, setFilterStatus] = useState<VenueStatus | 'semua'>('semua')
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (!loading) setTimeout(() => setAnimIn(true), 50) }, [loading])

  const loadData = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const [{ data: venueData }, { data: jadwalData }] = await Promise.all([
      sb.from('venue').select('id,nama,alamat,klaster_id').eq('klaster_id', 1).order('nama'),
      sb.from('jadwal_pertandingan')
        .select('id,nama_pertandingan,jam_mulai,jam_selesai,venue_id,venue(nama),cabang_olahraga(nama)')
        .order('jam_mulai').limit(30)
        .then(r => ({ data: r.data ?? [] })).catch(() => ({ data: [] })),
    ])

    setVenues(venueData ?? [])
    setJadwal(jadwalData ?? [])

    // Simulasi incident data (nanti dari tabel real)
    setIncidents([
      { id: 1, venue_id: 1, venue_nama: 'Stadion Patriot Candrabhaga', jenis: 'Teknis', deskripsi: 'Sound system area tribun barat mengalami gangguan', status: 'open', created_at: new Date(Date.now()-1800000).toISOString(), prioritas: 'tinggi' },
      { id: 2, venue_id: 3, venue_nama: 'Kolam Renang Harapan Indah', jenis: 'Keamanan', deskripsi: 'Akses parkir overload, butuh petugas tambahan', status: 'handled', created_at: new Date(Date.now()-3600000).toISOString(), prioritas: 'sedang' },
      { id: 3, venue_id: 2, venue_nama: 'GOR Bekasi Cyber Park', jenis: 'Logistik', deskripsi: 'Konsumsi wasit belum tiba, delay 30 menit', status: 'closed', created_at: new Date(Date.now()-7200000).toISOString(), prioritas: 'rendah' },
    ])

    setLastRefresh(new Date())
    setLoading(false)
  }

  const handleRefresh = () => { setLoading(true); loadData() }

  const handleAddIncident = async () => {
    if (!incidentForm.deskripsi || !incidentForm.jenis) return
    const newIncident: Incident = {
      id: Date.now(), venue_id: incidentForm.venue_id,
      venue_nama: venues.find(v => v.id === incidentForm.venue_id)?.nama ?? '-',
      jenis: incidentForm.jenis, deskripsi: incidentForm.deskripsi,
      status: 'open', created_at: new Date().toISOString(),
      prioritas: incidentForm.prioritas as 'tinggi' | 'sedang' | 'rendah',
    }
    setIncidents(prev => [newIncident, ...prev])
    setShowAddIncident(false)
    setIncidentForm({ jenis: '', deskripsi: '', prioritas: 'sedang', venue_id: 0 })
  }

  const handleCloseIncident = (id: number) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'closed' as const } : i))
  }

  const statusCounts = {
    aktif: venues.filter((_, i) => getVenueStatus(i) === 'aktif').length,
    siap: venues.filter((_, i) => getVenueStatus(i) === 'siap').length,
    masalah: venues.filter((_, i) => getVenueStatus(i) === 'masalah').length,
    standby: venues.filter((_, i) => getVenueStatus(i) === 'standby').length,
  }

  const openIncidents = incidents.filter(i => i.status === 'open').length
  const filteredVenues = filterStatus === 'semua' ? venues : venues.filter((_, i) => getVenueStatus(i) === filterStatus)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.orangeLight}`, borderTopColor: C.orange, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms` },
    className: `transition-all duration-700 ${animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`
  })

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      <div className="space-y-4">

        {/* ══ HEADER COMMAND CENTER ═════════════════════════════════════════ */}
        <div {...ani(0)}>
          <div style={{ background: C.white, border: `1px solid ${C.grayBorder}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ height: 4, background: `linear-gradient(90deg,${C.orange},${C.yellow},${C.green},${C.blue})` }} />
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Logo + title */}
              <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src="/logos/bekasi.png" alt="Bekasi" style={{ width: 34, height: 34, objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:12px;font-weight:900;color:${C.orange};">BKS</span>` }} />
              </div>
              <div>
                <div style={{ color: C.orange, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Kota Bekasi · Klaster I</div>
                <div style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>Command Center</div>
              </div>

              {/* Live clock */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <LiveClock />
                  <div style={{ color: C.textLight, fontSize: 10 }}>
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 20, padding: '4px 12px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>SISTEM AKTIF</span>
                </div>
                <button onClick={handleRefresh} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: C.gray, border: `1px solid ${C.grayBorder}`, cursor: 'pointer', fontSize: 11, color: C.textMuted }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            </div>

            {/* Status bar 4 kota */}
            <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.grayBorder}`, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, background: C.gray }}>
              {[
                { label: 'Total Venue', value: venues.length, color: C.text, bg: C.white, border: C.grayBorder },
                { label: 'Venue Aktif', value: statusCounts.aktif, color: C.green, bg: C.greenLight, border: C.greenBorder },
                { label: 'Standby', value: statusCounts.standby, color: '#b45309', bg: C.yellowLight, border: C.yellowBorder },
                { label: 'Masalah', value: statusCounts.masalah, color: C.red, bg: C.redLight, border: C.redBorder },
                { label: 'Incident Terbuka', value: openIncidents, color: openIncidents > 0 ? C.red : C.green, bg: openIncidents > 0 ? C.redLight : C.greenLight, border: openIncidents > 0 ? C.redBorder : C.greenBorder },
                { label: 'Pertandingan Hari Ini', value: jadwal.length, color: C.blue, bg: C.blueLight, border: C.blueBorder },
              ].map(({ label, value, color, bg, border }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ color, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{value}</div>
                  <div style={{ color: C.textLight, fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ VENUE MONITOR GRID ════════════════════════════════════════════ */}
        <div {...ani(100)}>
          <div style={{ background: C.white, border: `1px solid ${C.grayBorder}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.grayBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.orangeLight }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={15} style={{ color: C.orange }} />
                <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>Monitor 25 Venue — Klaster I</span>
              </div>
              {/* Filter status */}
              <div style={{ display: 'flex', gap: 6 }}>
                {(['semua', 'aktif', 'siap', 'masalah', 'standby'] as const).map(s => {
                  const conf = s === 'semua' ? { label: 'Semua', color: C.text, bg: C.white, border: C.grayBorder } : VENUE_STATUS_CONFIG[s]
                  return (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      style={{ fontSize: 10, padding: '3px 10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filterStatus === s ? conf.border : C.grayBorder}`, background: filterStatus === s ? conf.bg : C.white, color: filterStatus === s ? conf.color : C.textMuted }}>
                      {s === 'semua' ? 'Semua' : conf.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
              {filteredVenues.map((v, i) => {
                const status = getVenueStatus(venues.indexOf(v))
                const conf = VENUE_STATUS_CONFIG[status]
                const todayJadwal = jadwal.filter(j => j.venue_id === v.id)
                return (
                  <div key={v.id}
                    onClick={() => setSelectedVenue(selectedVenue?.id === v.id ? null : v)}
                    style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: selectedVenue?.id === v.id ? conf.bg : C.gray, border: `1.5px solid ${selectedVenue?.id === v.id ? conf.border : C.grayBorder}`, transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: conf.dot, animation: status === 'aktif' ? 'pulse 1.5s infinite' : 'none' }} />
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <div style={{ color: C.text, fontSize: 11, fontWeight: 600, lineHeight: 1.3, marginBottom: 3 }}>
                      {v.nama.length > 22 ? v.nama.slice(0, 22) + '…' : v.nama}
                    </div>
                    <div style={{ color: C.textLight, fontSize: 9 }}>
                      {todayJadwal.length > 0 ? `${todayJadwal.length} pertandingan` : 'Tidak ada jadwal'}
                    </div>
                    {status === 'masalah' && (
                      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={10} style={{ color: C.red }} />
                        <span style={{ fontSize: 9, color: C.red, fontWeight: 600 }}>Ada laporan masalah</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Venue detail panel */}
            {selectedVenue && (
              <div style={{ margin: '0 14px 14px', padding: '14px 16px', borderRadius: 10, background: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={14} style={{ color: C.blue }} />
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{selectedVenue.nama}</span>
                    <StatusBadge status={getVenueStatus(venues.indexOf(selectedVenue))} />
                  </div>
                  <button onClick={() => setSelectedVenue(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>
                    <XCircle size={16} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[
                    { label: 'Alamat', value: selectedVenue.alamat || 'Bekasi, Jawa Barat' },
                    { label: 'Jadwal Hari Ini', value: `${jadwal.filter(j => j.venue_id === selectedVenue.id).length} pertandingan` },
                    { label: 'PIC', value: 'Hub: +62-xxx-xxxx' },
                    { label: 'Klaster', value: 'Klaster I Bekasi' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: C.white, borderRadius: 8, padding: '8px 10px', border: `1px solid ${C.blueBorder}` }}>
                      <div style={{ color: C.textLight, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
                      <div style={{ color: C.text, fontSize: 11, fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => { setIncidentForm(f => ({ ...f, venue_id: selectedVenue.id })); setShowAddIncident(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: C.redLight, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={13} /> Laporkan Masalah
                  </button>
                  <a href={`/konida/penyelenggara/venue/${selectedVenue.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: C.blueLight, border: `1px solid ${C.blueBorder}`, color: C.blue, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                    <ChevronRight size={13} /> Detail Venue
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ JADWAL HARI INI + INCIDENT ═══════════════════════════════════ */}
        <div {...ani(150)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Jadwal */}
          <div style={{ background: C.white, border: `1px solid ${C.grayBorder}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.grayBorder}`, display: 'flex', alignItems: 'center', gap: 8, background: C.blueLight }}>
              <Activity size={14} style={{ color: C.blue }} />
              <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Jadwal Pertandingan Aktif</span>
              <span style={{ marginLeft: 'auto', background: C.blue, color: C.white, fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>{jadwal.length}</span>
            </div>
            {jadwal.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: C.textLight }}>
                <Activity size={22} style={{ margin: '0 auto 8px', color: C.grayBorder }} />
                <div style={{ fontSize: 12 }}>Belum ada jadwal hari ini</div>
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {jadwal.map((j: any, i: number) => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: `1px solid ${C.grayBorder}`, background: i === 0 ? C.blueLight : C.white }}>
                    <div style={{ textAlign: 'center', width: 42, flexShrink: 0 }}>
                      <div style={{ color: i === 0 ? C.blue : C.textMuted, fontSize: 12, fontWeight: 800 }}>{j.jam_mulai?.slice(0, 5) ?? '--:--'}</div>
                      {j.jam_selesai && <div style={{ color: C.textLight, fontSize: 9 }}>{j.jam_selesai?.slice(0, 5)}</div>}
                    </div>
                    <div style={{ width: 1, height: 32, background: C.grayBorder, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.nama_pertandingan ?? 'Pertandingan'}</div>
                      <div style={{ color: C.textMuted, fontSize: 10 }}>{j.venue?.nama ?? '-'} · {j.cabang_olahraga?.nama ?? '-'}</div>
                    </div>
                    {i === 0 && <span style={{ background: C.blueLight, color: C.blue, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, border: `1px solid ${C.blueBorder}`, flexShrink: 0 }}>NOW</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incident Report */}
          <div style={{ background: C.white, border: `1px solid ${C.grayBorder}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.grayBorder}`, display: 'flex', alignItems: 'center', gap: 8, background: openIncidents > 0 ? C.redLight : C.greenLight }}>
              <Bell size={14} style={{ color: openIncidents > 0 ? C.red : C.green }} />
              <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>Incident Report</span>
              {openIncidents > 0 && (
                <span style={{ background: C.red, color: C.white, fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 10, animation: 'pulse 1.5s infinite' }}>{openIncidents} OPEN</span>
              )}
              <button onClick={() => setShowAddIncident(true)} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, color: C.orange, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={11} /> Tambah
              </button>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {incidents.map(inc => {
                const prioritasColor = inc.prioritas === 'tinggi' ? C.red : inc.prioritas === 'sedang' ? '#b45309' : C.textMuted
                const statusConf = inc.status === 'open' ? { bg: C.redLight, border: C.redBorder, color: C.red, label: 'OPEN' } :
                  inc.status === 'handled' ? { bg: C.yellowLight, border: C.yellowBorder, color: '#b45309', label: 'DITANGANI' } :
                  { bg: C.greenLight, border: C.greenBorder, color: C.green, label: 'SELESAI' }
                return (
                  <div key={inc.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.grayBorder}`, background: inc.status === 'open' ? '#FFFBFB' : C.white }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.border}` }}>{statusConf.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: prioritasColor }}>● {inc.prioritas.toUpperCase()}</span>
                          <span style={{ fontSize: 10, color: C.textMuted }}>{inc.jenis}</span>
                        </div>
                        <div style={{ color: C.text, fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{inc.deskripsi}</div>
                        <div style={{ color: C.textLight, fontSize: 10 }}>{inc.venue_nama} · {new Date(inc.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      {inc.status === 'open' && (
                        <button onClick={() => handleCloseIncident(inc.id)}
                          style={{ padding: '4px 10px', borderRadius: 7, background: C.greenLight, border: `1px solid ${C.greenBorder}`, color: C.green, fontSize: 10, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                          Tutup
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {incidents.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: C.textLight }}>
                  <CheckCircle size={22} style={{ margin: '0 auto 8px', color: C.green }} />
                  <div style={{ fontSize: 12 }}>Tidak ada incident hari ini</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ SIPA + QUICK ACTIONS ══════════════════════════════════════════ */}
        <div {...ani(200)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          {/* SIPA */}
          <div style={{ background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.white, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={20} style={{ color: C.green }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>SIPA Intelligence</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: C.white, color: C.green, border: `1px solid ${C.greenBorder}` }}>Groq AI · Online</span>
              </div>
              <p style={{ color: C.textMuted, fontSize: 12, margin: '0 0 8px' }}>Tanya kondisi operasional terkini — venue, jadwal, insiden, dan koordinasi</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Venue mana yang punya masalah hari ini?','Berapa pertandingan yang masih aktif?','Venue mana yang belum siap?'].map(q => (
                  <a key={q} href="/konida/sipa" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: C.white, border: `1px solid ${C.greenBorder}`, color: C.textMuted, textDecoration: 'none' }}>→ {q}</a>
                ))}
              </div>
            </div>
            <a href="/konida/sipa" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.white, padding: '9px 16px', borderRadius: 10, background: C.green, textDecoration: 'none', flexShrink: 0 }}>
              Buka SIPA <ChevronRight size={13} />
            </a>
          </div>

          {/* Quick links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Venue & Jadwal', desc: 'Detail semua venue', href: '/konida/penyelenggara/venue', Icon: MapPin, color: C.orange, bg: C.orangeLight, border: C.orangeBorder },
              { label: 'Kesiapan Teknis', desc: 'Checklist per venue', href: '/konida/penyelenggara/kesiapan', Icon: CheckCircle, color: C.blue, bg: C.blueLight, border: C.blueBorder },
              { label: 'Laporan Harian', desc: 'Generate & kirim', href: '/konida/penyelenggara/laporan', Icon: FileText, color: C.green, bg: C.greenLight, border: C.greenBorder },
            ].map(({ label, desc, href, Icon, color, bg, border }) => (
              <a key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: bg, border: `1px solid ${border}`, textDecoration: 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.white, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{label}</div>
                  <div style={{ color: C.textMuted, fontSize: 10 }}>{desc}</div>
                </div>
                <ChevronRight size={12} style={{ color, flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>

        {/* ══ MODAL ADD INCIDENT ════════════════════════════════════════════ */}
        {showAddIncident && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: C.white, borderRadius: 16, width: 440, padding: 24, border: `1px solid ${C.grayBorder}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>Laporkan Masalah / Incident</span>
                <button onClick={() => setShowAddIncident(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}><XCircle size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Venue</label>
                  <select value={incidentForm.venue_id} onChange={e => setIncidentForm(f => ({ ...f, venue_id: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.grayBorder}`, fontSize: 13, color: C.text, background: C.white }}>
                    <option value={0}>Pilih venue...</option>
                    {venues.map(v => <option key={v.id} value={v.id}>{v.nama}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Jenis</label>
                    <select value={incidentForm.jenis} onChange={e => setIncidentForm(f => ({ ...f, jenis: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.grayBorder}`, fontSize: 13, color: C.text, background: C.white }}>
                      <option value="">Pilih...</option>
                      {['Teknis','Keamanan','Logistik','Kesehatan','Cuaca','Lainnya'].map(j => <option key={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Prioritas</label>
                    <select value={incidentForm.prioritas} onChange={e => setIncidentForm(f => ({ ...f, prioritas: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.grayBorder}`, fontSize: 13, color: C.text, background: C.white }}>
                      <option value="rendah">Rendah</option>
                      <option value="sedang">Sedang</option>
                      <option value="tinggi">Tinggi</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Deskripsi Masalah</label>
                  <textarea value={incidentForm.deskripsi} onChange={e => setIncidentForm(f => ({ ...f, deskripsi: e.target.value }))}
                    placeholder="Jelaskan masalah secara singkat dan jelas..." rows={3}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.grayBorder}`, fontSize: 13, color: C.text, background: C.white, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button onClick={() => setShowAddIncident(false)} style={{ padding: '8px 16px', borderRadius: 8, background: C.gray, border: `1px solid ${C.grayBorder}`, color: C.textMuted, fontSize: 12, cursor: 'pointer' }}>Batal</button>
                  <button onClick={handleAddIncident} style={{ padding: '8px 16px', borderRadius: 8, background: C.orange, border: 'none', color: C.white, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Kirim Laporan</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}