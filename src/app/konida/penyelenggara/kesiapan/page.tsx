'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Circle, Clock, Edit3, RefreshCw, Save, Shield,
  ThumbsUp, Wrench, Users, Wifi, Zap, XCircle, BarChart2,
  Building2, FileCheck,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
)

// ─── Types ───────────────────────────────────────────────
type CheckStatus = 'ok' | 'masalah' | 'belum'
type KategoriKey = 'infrastruktur' | 'keamanan' | 'logistik' | 'it_komunikasi' | 'kesehatan'

interface CheckItem {
  id: string
  label: string
  status: CheckStatus
  catatan?: string
  penanggung_jawab?: string
}

interface KategoriChecklist {
  key: KategoriKey
  label: string
  icon: any
  color: string
  gradient: string
  items: CheckItem[]
}

interface Venue {
  id: number; nama: string; alamat: string; klaster_id: number
}

// ─── Config ──────────────────────────────────────────────
const KATEGORI_TEMPLATE: Omit<KategoriChecklist, 'items'>[] = [
  {
    key: 'infrastruktur',
    label: 'Infrastruktur & Fisik',
    icon: Building2,
    color: 'text-blue-600',
    gradient: 'from-blue-600 to-blue-500',
  },
  {
    key: 'keamanan',
    label: 'Keamanan & Keselamatan',
    icon: Shield,
    color: 'text-red-600',
    gradient: 'from-red-600 to-red-500',
  },
  {
    key: 'logistik',
    label: 'Logistik & Perlengkapan',
    icon: Wrench,
    color: 'text-orange-600',
    gradient: 'from-orange-500 to-orange-400',
  },
  {
    key: 'it_komunikasi',
    label: 'IT & Komunikasi',
    icon: Wifi,
    color: 'text-purple-600',
    gradient: 'from-purple-600 to-purple-500',
  },
  {
    key: 'kesehatan',
    label: 'Kesehatan & P3K',
    icon: Zap,
    color: 'text-green-600',
    gradient: 'from-green-600 to-green-500',
  },
]

const DEFAULT_ITEMS: Record<KategoriKey, Omit<CheckItem, 'status' | 'catatan'>[]> = {
  infrastruktur: [
    { id: 'inf1', label: 'Lapangan/arena siap digunakan', penanggung_jawab: 'Koord. Teknis' },
    { id: 'inf2', label: 'Tribun penonton bersih & aman', penanggung_jawab: 'Koord. Teknis' },
    { id: 'inf3', label: 'Toilet bersih & berfungsi', penanggung_jawab: 'Tim Kebersihan' },
    { id: 'inf4', label: 'Area parkir tertata & memadai', penanggung_jawab: 'Koord. Parkir' },
    { id: 'inf5', label: 'Rambu dan papan petunjuk terpasang', penanggung_jawab: 'Koord. Teknis' },
    { id: 'inf6', label: 'Pencahayaan arena memadai', penanggung_jawab: 'Tim Listrik' },
  ],
  keamanan: [
    { id: 'kem1', label: 'Petugas keamanan hadir di pos', penanggung_jawab: 'Kapolsek' },
    { id: 'kem2', label: 'CCTV aktif & terekam', penanggung_jawab: 'Tim IT' },
    { id: 'kem3', label: 'Jalur evakuasi darurat bersih', penanggung_jawab: 'Koord. K3' },
    { id: 'kem4', label: 'APAR tersedia & tidak kadaluarsa', penanggung_jawab: 'Koord. K3' },
    { id: 'kem5', label: 'Sistem PA (toa/pengumuman) berfungsi', penanggung_jawab: 'Tim Teknis' },
  ],
  logistik: [
    { id: 'log1', label: 'Peralatan cabor lengkap & siap', penanggung_jawab: 'Koord. Cabor' },
    { id: 'log2', label: 'Konsumsi wasit & officials tersedia', penanggung_jawab: 'Tim Konsumsi' },
    { id: 'log3', label: 'Seragam panitia sudah distribusi', penanggung_jawab: 'Sekretariat' },
    { id: 'log4', label: 'Meja & kursi wasit terpasang', penanggung_jawab: 'Tim Venue' },
    { id: 'log5', label: 'Banner/backdrop sponsor terpasang', penanggung_jawab: 'Tim Humas' },
  ],
  it_komunikasi: [
    { id: 'it1', label: 'WiFi venue aktif & stabil', penanggung_jawab: 'Tim IT' },
    { id: 'it2', label: 'Sistem scoring digital berfungsi', penanggung_jawab: 'Tim IT' },
    { id: 'it3', label: 'HT / walkie-talkie panitia OK', penanggung_jawab: 'Koord. Kominfo' },
    { id: 'it4', label: 'Sound system arena berfungsi', penanggung_jawab: 'Tim Sound' },
    { id: 'it5', label: 'Papan skor elektronik aktif', penanggung_jawab: 'Tim IT' },
    { id: 'it6', label: 'Live streaming siap (jika ada)', penanggung_jawab: 'Tim Media' },
  ],
  kesehatan: [
    { id: 'kes1', label: 'Tim medis / dokter hadir di venue', penanggung_jawab: 'Kadinkes' },
    { id: 'kes2', label: 'Tandu & ambulans standby', penanggung_jawab: 'Tim Medis' },
    { id: 'kes3', label: 'Kotak P3K lengkap & tersedia', penanggung_jawab: 'Tim Medis' },
    { id: 'kes4', label: 'Pos kesehatan aktif & berpenanda', penanggung_jawab: 'Tim Medis' },
  ],
}

function buildChecklist(): KategoriChecklist[] {
  return KATEGORI_TEMPLATE.map(kat => ({
    ...kat,
    items: DEFAULT_ITEMS[kat.key].map(item => ({
      ...item,
      status: 'belum' as CheckStatus,
    })),
  }))
}

// ─── Sub-components ───────────────────────────────────────
function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === 'ok') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
      <CheckCircle size={11} /> OK
    </span>
  )
  if (status === 'masalah') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
      <AlertTriangle size={11} /> Masalah
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
      <Circle size={11} /> Belum
    </span>
  )
}

function ProgressRing({ pct, size = 56, stroke = 5, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={11} fill={color} fontWeight="bold">{pct}%</text>
    </svg>
  )
}

function KategoriCard({
  kat, venueId, onChange,
}: {
  kat: KategoriChecklist
  venueId: number
  onChange: (katKey: KategoriKey, itemId: string, status: CheckStatus, catatan?: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [catatanDraft, setCatatanDraft] = useState('')

  const okCount = kat.items.filter(i => i.status === 'ok').length
  const masalahCount = kat.items.filter(i => i.status === 'masalah').length
  const pct = Math.round((okCount / kat.items.length) * 100)
  const ringColor = pct === 100 ? '#16a34a' : pct >= 60 ? '#2563eb' : pct >= 30 ? '#ea580c' : '#dc2626'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className={`bg-gradient-to-r ${kat.gradient} p-4 cursor-pointer flex items-center justify-between`}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <kat.icon size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">{kat.label}</h3>
            <p className="text-white/70 text-xs">{kat.items.length} item checklist</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-white/80 text-xs">
            <div className="font-bold text-white">{okCount}/{kat.items.length} OK</div>
            {masalahCount > 0 && <div className="text-red-200 font-bold">{masalahCount} masalah</div>}
          </div>
          <ProgressRing pct={pct} size={48} stroke={4} color="white" />
          {open ? <ChevronUp size={16} className="text-white/60" /> : <ChevronDown size={16} className="text-white/60" />}
        </div>
      </div>

      {/* Items */}
      {open && (
        <div>
          {kat.items.map((item, i) => (
            <div key={item.id} className={`border-b border-gray-50 last:border-0 ${item.status === 'masalah' ? 'bg-red-50/30' : ''}`}>
              <div className="flex items-center gap-3 px-5 py-3">
                {/* Status Toggle */}
                <div className="flex gap-1 flex-shrink-0">
                  {(['belum', 'ok', 'masalah'] as CheckStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => onChange(kat.key, item.id, s)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        item.status === s
                          ? s === 'ok' ? 'bg-green-500 text-white' : s === 'masalah' ? 'bg-red-500 text-white' : 'bg-gray-300 text-white'
                          : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                      }`}
                      title={s === 'ok' ? 'OK' : s === 'masalah' ? 'Ada Masalah' : 'Belum Dicek'}
                    >
                      {s === 'ok' ? <CheckCircle size={13} /> : s === 'masalah' ? <AlertTriangle size={13} /> : <Circle size={13} />}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#3c4858] font-medium">{item.label}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.penanggung_jawab && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Users size={9} /> {item.penanggung_jawab}
                      </span>
                    )}
                    {item.catatan && (
                      <span className="text-[10px] text-orange-500 italic truncate max-w-48">"{item.catatan}"</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={item.status} />
                  <button
                    onClick={() => { setEditId(editId === item.id ? null : item.id); setCatatanDraft(item.catatan ?? '') }}
                    className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
              </div>

              {/* Catatan inline edit */}
              {editId === item.id && (
                <div className="px-5 pb-3 flex gap-2">
                  <input
                    value={catatanDraft}
                    onChange={e => setCatatanDraft(e.target.value)}
                    placeholder="Tambahkan catatan..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                  />
                  <button
                    onClick={() => { onChange(kat.key, item.id, item.status, catatanDraft); setEditId(null) }}
                    className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                  >
                    <Save size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function KesiapanTeknis() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null)
  const [checklists, setChecklists] = useState<Record<number, KategoriChecklist[]>>({})
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
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
      const { data } = await sb.from('venue').select('id,nama,alamat,klaster_id').eq('klaster_id', 1).order('nama')
      if (id !== reqRef.current) return
      const vs = (data ?? []) as Venue[]
      setVenues(vs)
      if (vs.length > 0 && !selectedVenueId) setSelectedVenueId(vs[0].id)
      // Build checklist per venue
      const cl: Record<number, KategoriChecklist[]> = {}
      vs.forEach(v => { cl[v.id] = buildChecklist() })
      setChecklists(cl)
    } finally {
      if (id === reqRef.current) setLoading(false)
    }
  }

  function handleChange(venueId: number, katKey: KategoriKey, itemId: string, status: CheckStatus, catatan?: string) {
    setChecklists(prev => {
      const copy = { ...prev }
      copy[venueId] = (copy[venueId] ?? buildChecklist()).map(kat =>
        kat.key !== katKey ? kat : {
          ...kat,
          items: kat.items.map(it => it.id !== itemId ? it : { ...it, status, catatan: catatan ?? it.catatan })
        }
      )
      return copy
    })
    setSavedAt(new Date())
  }

  const selectedVenue = venues.find(v => v.id === selectedVenueId)
  const currentChecklist = selectedVenueId ? (checklists[selectedVenueId] ?? []) : []

  const summary = useMemo(() => {
    if (!currentChecklist.length) return { total: 0, ok: 0, masalah: 0, belum: 0, pct: 0 }
    const all = currentChecklist.flatMap(k => k.items)
    const ok = all.filter(i => i.status === 'ok').length
    const masalah = all.filter(i => i.status === 'masalah').length
    return { total: all.length, ok, masalah, belum: all.length - ok - masalah, pct: Math.round((ok / all.length) * 100) }
  }, [currentChecklist])

  const globalSummary = useMemo(() => {
    return venues.map(v => {
      const cl = checklists[v.id] ?? []
      const all = cl.flatMap(k => k.items)
      const ok = all.filter(i => i.status === 'ok').length
      const masalah = all.filter(i => i.status === 'masalah').length
      const pct = all.length ? Math.round((ok / all.length) * 100) : 0
      return { venue: v, ok, masalah, total: all.length, pct }
    })
  }, [venues, checklists])

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const ringColor = summary.pct === 100 ? '#16a34a' : summary.pct >= 60 ? '#2563eb' : summary.pct >= 30 ? '#ea580c' : '#dc2626'

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#eeeeee]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Memuat data kesiapan teknis...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 font-sans">
      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-[#3c4858]">Kesiapan Teknis</h1>
          <p className="text-sm text-gray-400 mt-0.5">Checklist kesiapan operasional per venue PORPROV XV</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
              <CheckCircle size={12} /> Tersimpan {savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <button onClick={() => void load()} className="bg-white hover:bg-gray-50 px-4 py-2 rounded-full shadow-sm text-sm text-[#3c4858] flex items-center gap-2 border border-gray-100">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* ─── Sidebar Venue ─── */}
        <div {...ani(50)} className="col-span-1 space-y-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-3">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <Building2 size={15} /> Pilih Venue
              </h3>
            </div>
            <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
              {globalSummary.map(({ venue, pct, masalah }) => (
                <button
                  key={venue.id}
                  onClick={() => setSelectedVenueId(venue.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedVenueId === venue.id
                      ? 'bg-green-50 border border-green-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#3c4858] leading-tight truncate">{venue.nama}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : pct >= 60 ? '#2563eb' : '#ea580c' }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">{pct}%</span>
                      </div>
                    </div>
                    {masalah > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[9px] font-black mt-0.5">
                        {masalah}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="col-span-3 space-y-5">
          {/* Summary bar */}
          {selectedVenue && (
            <div {...ani(80)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-6">
              <ProgressRing pct={summary.pct} size={72} stroke={6} color={ringColor} />
              <div className="flex-1">
                <h2 className="text-lg font-medium text-[#3c4858]">{selectedVenue.nama}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{selectedVenue.alamat || 'Kota Bekasi, Jawa Barat'}</p>
                <div className="flex gap-6 mt-3">
                  {[
                    { label: 'Total Item', value: summary.total, color: 'text-gray-600' },
                    { label: '✓ OK', value: summary.ok, color: 'text-green-600' },
                    { label: '⚠ Masalah', value: summary.masalah, color: 'text-red-600' },
                    { label: '○ Belum', value: summary.belum, color: 'text-gray-400' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className={`text-xl font-light ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {summary.pct === 100 && (
                <div className="flex flex-col items-center gap-1 bg-green-50 border border-green-100 rounded-xl px-5 py-3">
                  <ThumbsUp size={24} className="text-green-600" />
                  <span className="text-xs font-bold text-green-700 text-center">Venue<br />Siap 100%</span>
                </div>
              )}
              {summary.masalah > 0 && (
                <div className="flex flex-col items-center gap-1 bg-red-50 border border-red-100 rounded-xl px-5 py-3">
                  <AlertTriangle size={24} className="text-red-500" />
                  <span className="text-xs font-bold text-red-600 text-center">{summary.masalah} Item<br />Bermasalah</span>
                </div>
              )}
            </div>
          )}

          {/* Checklist per kategori */}
          {selectedVenueId && currentChecklist.map((kat, i) => (
            <div key={kat.key} {...ani(100 + i * 40)}>
              <KategoriCard
                kat={kat}
                venueId={selectedVenueId}
                onChange={(katKey, itemId, status, catatan) => handleChange(selectedVenueId, katKey, itemId, status, catatan)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}