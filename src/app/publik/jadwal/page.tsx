'use client'
import { useEffect, useState } from 'react'
import { Calendar, Clock, MapPin, Filter, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const TANGGAL_EVENT = Array.from({ length: 14 }, (_, i) => {
  const d = new Date('2026-11-07')
  d.setDate(d.getDate() + i)
  return d.toISOString().slice(0, 10)
})

export default function JadwalPublikPage() {
  const [jadwal, setJadwal] = useState<any[]>([])
  const [cabors, setCabors] = useState<any[]>([])
  const [klasters, setKlasters] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTanggal, setSelectedTanggal] = useState('')
  const [selectedCabor, setSelectedCabor] = useState('')
  const [selectedKlaster, setSelectedKlaster] = useState('')

  useEffect(() => { loadMaster() }, [])
  useEffect(() => { loadJadwal() }, [selectedTanggal, selectedCabor, selectedKlaster])

  const loadMaster = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const [{ data: c }, { data: k }] = await Promise.all([
      supabase.from('cabang_olahraga').select('id, nama').eq('is_active', true).order('nama'),
      supabase.from('klaster').select('id, nama').order('nama'),
    ])
    setCabors(c ?? [])
    setKlasters(k ?? [])
  }

  const loadJadwal = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedTanggal) params.set('tanggal', selectedTanggal)
      if (selectedCabor) params.set('cabor_id', selectedCabor)
      if (selectedKlaster) params.set('klaster_id', selectedKlaster)
      const res = await fetch(`/api/publik/jadwal?${params}`)
      const data = await res.json()
      setJadwal(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (s: string) => {
    if (s === 'Berlangsung') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (s === 'Selesai') return 'bg-slate-700/50 text-slate-400 border-slate-700'
    if (s === 'Ditunda') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    if (s === 'Dibatalkan') return 'bg-red-500/10 text-red-400 border-red-500/20'
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }

  const genderLabel = (g: string) => {
    if (g === 'L') return 'Putra'
    if (g === 'P') return 'Putri'
    if (g === 'MIX') return 'Mix'
    return 'Open'
  }

  // Group by tanggal
  const grouped = jadwal.reduce((acc: any, j: any) => {
    const tgl = j.tanggal
    if (!acc[tgl]) acc[tgl] = []
    acc[tgl].push(j)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-porprov.png" alt="PORPROV XV"
              className="w-9 h-9 object-contain mix-blend-lighten" />
            <div>
              <div className="text-white text-sm font-semibold">Jadwal Pertandingan</div>
              <div className="text-slate-500 text-[10px]">PORPROV XV · Jawa Barat 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/publik/klasemen"
              className="text-slate-400 hover:text-white text-xs transition-colors">
              Klasemen →
            </Link>
            <Link href="/publik/hasil"
              className="text-slate-400 hover:text-white text-xs transition-colors">
              Hasil →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📅</div>
          <h1 className="text-white text-3xl font-bold mb-2">Jadwal Pertandingan</h1>
          <p className="text-slate-500 text-sm">7 – 20 November 2026 · Jawa Barat</p>
        </div>

        {/* Filter tanggal scroll */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
          <button onClick={() => setSelectedTanggal('')}
            className={`text-xs px-4 py-2 rounded-full border whitespace-nowrap transition-all flex-shrink-0
              ${!selectedTanggal ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
            Semua
          </button>
          {TANGGAL_EVENT.map(tgl => {
            const d = new Date(tgl)
            return (
              <button key={tgl} onClick={() => setSelectedTanggal(tgl)}
                className={`flex flex-col items-center px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all flex-shrink-0
                  ${selectedTanggal === tgl ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                <span className="text-[10px]">{d.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                <span className="text-sm font-bold">{d.getDate()}</span>
                <span className="text-[10px]">Nov</span>
              </button>
            )
          })}
        </div>

        {/* Filter cabor & klaster */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <select value={selectedCabor} onChange={e => setSelectedCabor(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
            <option value="">Semua Cabang Olahraga</option>
            {cabors.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nama}</option>
            ))}
          </select>
          <select value={selectedKlaster} onChange={e => setSelectedKlaster(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all">
            <option value="">Semua Klaster</option>
            {klasters.map((k: any) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : jadwal.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📋</div>
            <div className="text-slate-500 text-sm">Belum ada jadwal yang tersedia</div>
            <div className="text-slate-700 text-xs mt-1">
              Jadwal akan ditampilkan setelah diinput oleh panitia
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([tgl, items]: any) => (
              <div key={tgl}>
                {/* Tanggal header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                    {new Date(tgl).toLocaleDateString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-600 text-xs">{items.length} pertandingan</span>
                </div>

                {/* Jadwal list */}
                <div className="space-y-2">
                  {items.map((j: any) => (
                    <div key={j.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 hover:border-slate-700 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-white text-sm font-medium">
                              {j.nomor_pertandingan?.nama}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium
                              ${j.nomor_pertandingan?.gender === 'L' ? 'bg-blue-500/10 text-blue-400' :
                                j.nomor_pertandingan?.gender === 'P' ? 'bg-pink-500/10 text-pink-400' :
                                'bg-purple-500/10 text-purple-400'}`}>
                              {genderLabel(j.nomor_pertandingan?.gender)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              {j.fase}
                            </span>
                          </div>
                          <div className="text-slate-400 text-xs font-medium mb-2">
                            {j.nomor_pertandingan?.cabang_olahraga?.nama}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {j.waktu_mulai && (
                              <div className="flex items-center gap-1">
                                <Clock size={11} />
                                <span>{j.waktu_mulai.slice(0,5)}
                                  {j.waktu_selesai && ` – ${j.waktu_selesai.slice(0,5)}`}
                                </span>
                              </div>
                            )}
                            {j.venue && (
                              <div className="flex items-center gap-1">
                                <MapPin size={11} />
                                <span>{j.venue.nama}</span>
                              </div>
                            )}
                          </div>
                          {j.keterangan && (
                            <div className="mt-2 text-slate-500 text-xs bg-slate-800/50 px-3 py-1.5 rounded-lg">
                              {j.keterangan}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${statusColor(j.status)}`}>
                          {j.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10 text-slate-800 text-xs">
          © 2026 KONI Jawa Barat · Sistem Informasi PORPROV XV
        </div>
      </div>
    </div>
  )
}