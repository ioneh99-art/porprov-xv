'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Search, CheckCircle, Clock, X, User, MapPin,
  Download, XCircle, Award, RefreshCw,
  CreditCard, Hash, Filter, Calendar, Shield,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Atlet {
  id:                 number
  nama_lengkap:       string
  no_ktp:             string
  tgl_lahir:          string
  gender:             string
  status_registrasi:  string
  catatan_verifikasi: string | null
  no_registrasi_koni: number | null
  created_at:         string
  kontingen_id:       number
  kontingen_nama:     string
}

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
  'Verified':      { label: 'Verified',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  'Menunggu Admin':{ label: 'Menunggu Admin',  color: 'text-amber-400   bg-amber-500/10   border-amber-500/20',  icon: Clock },
  'Posted':        { label: 'Posted',          color: 'text-blue-400    bg-blue-500/10    border-blue-500/20',   icon: Shield },
  'Ditolak Admin': { label: 'Ditolak Admin',   color: 'text-red-400     bg-red-500/10     border-red-500/20',    icon: XCircle },
}

export default function PentathlonAtletPage() {
  const [me, setMe] = useState<any>(null)
  const [atlets, setAtlets] = useState<Atlet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterGender, setFilterGender] = useState('ALL')
  const [selectedAtlet, setSelectedAtlet] = useState<Atlet | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const meData = me ?? await fetch('/api/auth/me').then(r => r.json())
      if (!me) setMe(meData)
      const cabor_id = meData?.cabor_id
      if (!cabor_id) return

      const { data, error: err } = await sb
        .from('atlet')
        .select('id, nama_lengkap, no_ktp, tgl_lahir, gender, status_registrasi, catatan_verifikasi, no_registrasi_koni, created_at, kontingen_id, kontingen(nama)')
        .eq('cabor_id', cabor_id)
        .order('nama_lengkap')

      if (err) throw err

      setAtlets((data ?? []).map((a: any) => ({
        ...a,
        kontingen_nama: a.kontingen?.nama ?? '-',
      })))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [me])

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(() => {
    return atlets.filter(a => {
      if (filterStatus !== 'ALL' && a.status_registrasi !== filterStatus) return false
      if (filterGender !== 'ALL' && a.gender !== filterGender) return false
      if (search) {
        const q = search.toLowerCase()
        if (!a.nama_lengkap.toLowerCase().includes(q) && !a.kontingen_nama.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [atlets, filterStatus, filterGender, search])

  // Group by kontingen
  const grouped = useMemo(() => {
    const map = new Map<string, Atlet[]>()
    for (const a of filtered) {
      const key = a.kontingen_nama
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const stats = useMemo(() => ({
    total:     atlets.length,
    verified:  atlets.filter(a => a.status_registrasi === 'Verified').length,
    pending:   atlets.filter(a => a.status_registrasi === 'Menunggu Admin').length,
    ditolak:   atlets.filter(a => a.status_registrasi === 'Ditolak Admin').length,
    putra:     atlets.filter(a => a.gender === 'L').length,
    putri:     atlets.filter(a => a.gender === 'P').length,
  }), [atlets])

  const exportCsv = () => {
    const headers = ['Nama', 'No KTP', 'Gender', 'Kontingen', 'Status', 'Tgl Lahir']
    const rows = filtered.map(a => [
      a.nama_lengkap, a.no_ktp, a.gender === 'L' ? 'Putra' : 'Putri',
      a.kontingen_nama, a.status_registrasi, a.tgl_lahir,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `data-atlet-pentathlon-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const age = (tgl: string) => {
    if (!tgl) return '-'
    const d = new Date(tgl)
    const y = new Date().getFullYear() - d.getFullYear()
    return `${y} th`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm">{error}</div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Data Atlet Pentathlon</h1>
          <p className="text-slate-500 text-xs mt-1">
            {me?.cabor_nama ?? 'Pentathlon'} · {stats.total} atlet terdaftar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-all">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 text-xs px-3 py-2 rounded-lg transition-all">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard label="Total Atlet" value={stats.total} color="yellow" />
        <KpiCard label="Verified" value={stats.verified} color="emerald" />
        <KpiCard label="Menunggu" value={stats.pending} color="amber" />
        <KpiCard label="Ditolak" value={stats.ditolak} color="red" />
        <KpiCard label="Putra" value={stats.putra} color="blue" />
        <KpiCard label="Putri" value={stats.putri} color="pink" />
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 flex items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau kontingen..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-500/50"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-slate-500" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-yellow-500/50">
            <option value="ALL">Semua Status</option>
            {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-yellow-500/50">
            <option value="ALL">Semua Gender</option>
            <option value="L">Putra</option>
            <option value="P">Putri</option>
          </select>
        </div>
        <div className="text-slate-500 text-xs flex-shrink-0">{filtered.length} ditampilkan</div>
      </div>

      {/* Atlet list grouped by kontingen */}
      <div className="space-y-4">
        {grouped.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-600 text-sm">
            Tidak ada atlet ditemukan
          </div>
        ) : grouped.map(([kontingen, rows]) => (
          <div key={kontingen} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-yellow-400" />
                <span className="text-sm font-medium text-white">{kontingen}</span>
                <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                  {rows.length} atlet
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-emerald-400">{rows.filter(r => r.status_registrasi === 'Verified').length} verified</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{rows.filter(r => r.gender === 'L').length}P / {rows.filter(r => r.gender === 'P').length}W</span>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-800/20">
                <tr className="border-b border-slate-800/50">
                  <th className="text-left text-slate-500 text-[10px] uppercase px-5 py-2.5 font-medium tracking-wider w-8">#</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase px-3 py-2.5 font-medium tracking-wider">Nama</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase px-3 py-2.5 font-medium tracking-wider">Gender</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase px-3 py-2.5 font-medium tracking-wider">Umur</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase px-3 py-2.5 font-medium tracking-wider">No KTP</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase px-3 py-2.5 font-medium tracking-wider">Status</th>
                  <th className="text-left text-slate-500 text-[10px] uppercase px-3 py-2.5 font-medium tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a, i) => {
                  const sCfg = STATUS_CFG[a.status_registrasi] ?? STATUS_CFG['Menunggu Admin']
                  const SIcon = sCfg.icon
                  return (
                    <tr key={a.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3 text-slate-600">{i + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-200">{a.nama_lengkap}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                          {a.gender === 'L' ? '♂ Putra' : '♀ Putri'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-400">{age(a.tgl_lahir)}</td>
                      <td className="px-3 py-3 font-mono text-slate-500 text-[11px]">{a.no_ktp || '-'}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${sCfg.color}`}>
                          <SIcon size={10} />
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => setSelectedAtlet(a)}
                          className="text-[10px] px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
                          Detail
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Dossier Drawer */}
      {selectedAtlet && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedAtlet(null)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-slate-950 border-l border-slate-800 z-50 overflow-y-auto">
            <div className="p-5">
              {/* Drawer header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="text-white font-semibold text-base">{selectedAtlet.nama_lengkap}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{selectedAtlet.kontingen_nama}</div>
                </div>
                <button onClick={() => setSelectedAtlet(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Status badge */}
              {(() => {
                const sCfg = STATUS_CFG[selectedAtlet.status_registrasi] ?? STATUS_CFG['Menunggu Admin']
                const SIcon = sCfg.icon
                return (
                  <div className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium mb-5 ${sCfg.color}`}>
                    <SIcon size={12} />
                    {sCfg.label}
                  </div>
                )
              })()}

              {/* Profile info */}
              <div className="space-y-3">
                <InfoRow icon={User} label="Gender" value={selectedAtlet.gender === 'L' ? 'Putra (Laki-laki)' : 'Putri (Perempuan)'} />
                <InfoRow icon={Calendar} label="Tgl Lahir" value={selectedAtlet.tgl_lahir ? new Date(selectedAtlet.tgl_lahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'} />
                <InfoRow icon={CreditCard} label="No KTP" value={selectedAtlet.no_ktp || '-'} mono />
                <InfoRow icon={Hash} label="No Reg KONI" value={selectedAtlet.no_registrasi_koni?.toString() ?? '-'} mono />
                <InfoRow icon={MapPin} label="Kontingen" value={selectedAtlet.kontingen_nama} />
                <InfoRow icon={Award} label="Cabor" value={me?.cabor_nama ?? 'Pentathlon'} />
              </div>

              {/* Catatan */}
              {selectedAtlet.catatan_verifikasi && (
                <div className="mt-5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Catatan Verifikasi</div>
                  <div className="text-amber-200/80 text-xs leading-relaxed">{selectedAtlet.catatan_verifikasi}</div>
                </div>
              )}

              {/* Registered date */}
              <div className="mt-5 pt-4 border-t border-slate-800 text-[10px] text-slate-600">
                Terdaftar: {selectedAtlet.created_at ? new Date(selectedAtlet.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    yellow:  'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    red:     'bg-red-500/10 border-red-500/20 text-red-400',
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
    pink:    'bg-pink-500/10 border-pink-500/20 text-pink-400',
  }
  return (
    <div className={`rounded-xl border p-3.5 ${colorMap[color]}`}>
      <div className="text-2xl font-semibold leading-tight">{value}</div>
      <div className="text-[10px] opacity-70 mt-1">{label}</div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Icon size={12} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</div>
        <div className={`text-xs text-slate-200 truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
    </div>
  )
}
