'use client'
import { useEffect, useState, useRef } from 'react'
import { RefreshCw, Download, Clock } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function formatWaktu(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.round((seconds % 1) * 100)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}

interface KlasemenRow {
  atlet_id: number
  nama_lengkap: string
  kontingen_nama: string
  waktu_seconds: number
  rank: number
  medali: string
}

interface Nomor {
  id: number
  nama: string
  gender: 'L' | 'P'
}

export default function DayungKlasemenPage() {
  const [me, setMe] = useState<any>(null)
  const meRef = useRef<any>(null)
  const [nomors, setNomors] = useState<Nomor[]>([])
  const [selectedNomor, setSelectedNomor] = useState<number | null>(null)
  const [genderFilter, setGenderFilter] = useState<'L' | 'P'>('L')
  const [klasemen, setKlasemen] = useState<KlasemenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(() => loadData(), 30000)
    return () => clearInterval(t)
  }, [autoRefresh, selectedNomor])

  const loadData = async (nomorId?: number) => {
    try {
      if (!meRef.current) {
        const meData = await fetch('/api/auth/me').then(r => r.json())
        meRef.current = meData
        setMe(meData)
      }
      const cabor_id = meRef.current?.cabor_id
      if (!cabor_id) return

      const { data: nomorList } = await sb
        .from('nomor_pertandingan')
        .select('id, nama, gender')
        .eq('cabor_id', cabor_id)
        .order('gender')
        .order('nama')
      setNomors((nomorList ?? []) as Nomor[])

      const activeNomor = nomorId ?? selectedNomor ?? nomorList?.[0]?.id ?? null
      if (!selectedNomor && nomorList?.[0]) {
        setSelectedNomor(nomorList[0].id)
        setGenderFilter(nomorList[0].gender as 'L' | 'P')
      }
      if (!activeNomor) { setKlasemen([]); setLoading(false); return }

      const { data: hasilList } = await sb
        .from('hasil_pertandingan')
        .select('atlet_id, nilai, medali, atlet(nama_lengkap, gender, kontingen(nama))')
        .eq('nomor_id', activeNomor)
        .gt('nilai', 0)

      const rows: KlasemenRow[] = (hasilList ?? []).map((h: any) => ({
        atlet_id: h.atlet_id,
        nama_lengkap: h.atlet?.nama_lengkap ?? '?',
        kontingen_nama: h.atlet?.kontingen?.nama ?? '-',
        waktu_seconds: h.nilai ?? 0,
        rank: 0,
        medali: h.medali ?? 'none',
      }))

      // Ascending sort: rank 1 = fastest (smallest seconds)
      rows.sort((a, b) => a.waktu_seconds - b.waktu_seconds)
      rows.forEach((r, i) => { r.rank = i + 1 })

      setKlasemen(rows)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleNomorChange = (nomorId: number) => {
    setSelectedNomor(nomorId)
    const nomor = nomors.find(n => n.id === nomorId)
    if (nomor) setGenderFilter(nomor.gender as 'L' | 'P')
    setLoading(true)
    loadData(nomorId)
  }

  const exportCsv = () => {
    if (klasemen.length === 0) return
    const nomorNama = nomors.find(n => n.id === selectedNomor)?.nama ?? 'dayung'
    const headers = ['Rank', 'Nama', 'Kontingen', 'Waktu', 'Detik', 'Medali']
    const rows = klasemen.map(r => [r.rank, r.nama_lengkap, r.kontingen_nama, formatWaktu(r.waktu_seconds), r.waktu_seconds, r.medali])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `klasemen-dayung-${nomorNama.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const nomorsByGender = nomors.filter(n => n.gender === genderFilter)
  const selectedNomorNama = nomors.find(n => n.id === selectedNomor)?.nama ?? ''

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Klasemen Dayung Live</h1>
          <p className="text-slate-500 text-xs mt-1">
            Ranking waktu ascending · Rank 1 = waktu tercepat · {me?.nama}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-all ${autoRefresh ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
            {autoRefresh ? 'Live ON' : 'Live OFF'}
          </button>
          <button onClick={() => loadData(selectedNomor ?? undefined)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-all">
            <RefreshCw size={12} /> Reload
          </button>
          <button onClick={exportCsv} disabled={klasemen.length === 0}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs px-3 py-2 rounded-lg transition-all">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Nomor Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
        <div className="text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-3">Pilih Nomor Pertandingan</div>
        <div className="flex items-center gap-3 flex-wrap">
          {(['L', 'P'] as const).map(g => (
            <button key={g} onClick={() => {
              setGenderFilter(g)
              const first = nomors.find(n => n.gender === g)
              if (first) handleNomorChange(first.id)
            }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                genderFilter === g
                  ? g === 'L' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                    : 'bg-pink-500/20 border border-pink-500/30 text-pink-400'
                  : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'
              }`}>
              {g === 'L' ? '👨 Putra' : '👩 Putri'}
            </button>
          ))}
          <div className="flex-1 min-w-60">
            <select
              value={selectedNomor ?? ''}
              onChange={e => handleNomorChange(Number(e.target.value))}
              className="w-full bg-slate-800 border border-sky-500/30 rounded-lg px-3 py-2 text-xs text-sky-300 focus:outline-none focus:border-sky-500">
              <option value="">-- Pilih Nomor --</option>
              {nomorsByGender.map(n => (
                <option key={n.id} value={n.id}>{n.nama}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedNomorNama && (
          <div className="mt-2 text-[11px] text-sky-400/70">
            Nomor: <span className="font-medium text-sky-300">{selectedNomorNama}</span>
            <span className="text-slate-600 mx-2">·</span>
            <span className="text-slate-500">{klasemen.length} atlet terdaftar hasil</span>
          </div>
        )}
      </div>

      {/* Podium Top 3 */}
      {klasemen.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <PodiumCard atlet={klasemen[1]} position={2} />
          <PodiumCard atlet={klasemen[0]} position={1} />
          <PodiumCard atlet={klasemen[2]} position={3} />
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-white text-sm font-medium flex items-center gap-2">
            <Clock size={14} className="text-sky-400" />
            Klasemen — {selectedNomorNama || 'Pilih Nomor'}
          </div>
          <div className="text-slate-500 text-xs">{klasemen.length} atlet</div>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-slate-800/40">
            <tr className="border-b border-slate-800">
              <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-5 py-3 w-16">Rank</th>
              <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Atlet</th>
              <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Kontingen</th>
              <th className="text-center text-sky-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Waktu</th>
              <th className="text-center text-sky-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Detik</th>
              <th className="text-center text-sky-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Medali</th>
            </tr>
          </thead>
          <tbody>
            {klasemen.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-slate-600">
                {selectedNomor ? 'Belum ada hasil yang diinput untuk nomor ini' : 'Pilih nomor pertandingan'}
              </td></tr>
            ) : klasemen.map(r => (
              <tr key={r.atlet_id} className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors ${r.rank <= 3 ? 'bg-slate-800/10' : ''}`}>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    r.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : r.rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                    : r.rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                    : 'text-slate-500'
                  }`}>{r.rank}</span>
                </td>
                <td className="px-3 py-3 text-slate-200 font-medium">{r.nama_lengkap}</td>
                <td className="px-3 py-3 text-slate-400">{r.kontingen_nama}</td>
                <td className="px-3 py-3 text-center font-mono font-bold text-sky-300">{formatWaktu(r.waktu_seconds)}</td>
                <td className="px-3 py-3 text-center font-mono text-slate-400 text-[11px]">{r.waktu_seconds.toFixed(2)}</td>
                <td className="px-3 py-3 text-center">
                  {r.medali === 'emas'     && <span className="text-yellow-400">🥇</span>}
                  {r.medali === 'perak'    && <span className="text-slate-300">🥈</span>}
                  {r.medali === 'perunggu' && <span className="text-amber-600">🥉</span>}
                  {(!r.medali || r.medali === 'none') && <span className="text-slate-700">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PodiumCard({ atlet, position }: { atlet: KlasemenRow; position: 1 | 2 | 3 }) {
  const cfg: Record<number, { emoji: string; color: string; text: string; label: string }> = {
    1: { emoji: '🥇', color: 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5', text: 'text-yellow-400', label: 'EMAS' },
    2: { emoji: '🥈', color: 'border-slate-400/30 bg-gradient-to-br from-slate-400/10 to-slate-400/5',   text: 'text-slate-300',  label: 'PERAK' },
    3: { emoji: '🥉', color: 'border-amber-700/30 bg-gradient-to-br from-amber-700/10 to-amber-700/5',   text: 'text-amber-500',  label: 'PERUNGGU' },
  }
  const c = cfg[position]
  return (
    <div className={position === 1 ? '' : 'pt-8'}>
      <div className={`border ${c.color} rounded-2xl p-5 text-center`}>
        <div className="text-4xl mb-2">{c.emoji}</div>
        <div className={`${c.text} text-[10px] font-bold tracking-wider mb-1`}>{c.label}</div>
        <div className="text-white text-sm font-semibold mb-1">{atlet.nama_lengkap}</div>
        <div className="text-slate-400 text-[11px] mb-3">{atlet.kontingen_nama}</div>
        <div className={`${c.text} text-2xl font-bold font-mono`}>{formatWaktu(atlet.waktu_seconds)}</div>
        <div className="text-slate-500 text-[10px] mt-0.5">waktu finish</div>
      </div>
    </div>
  )
}
