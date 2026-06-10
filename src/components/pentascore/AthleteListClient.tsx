'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Search, Filter, Users, Download, Upload, X,
  Globe2, Trash2,
} from 'lucide-react'

type Athlete = any

export default function AthleteListClient({
  initialAthletes,
  tenants,
  events,
  eventId,
  tenantId,
  enrolledMode,
}: {
  initialAthletes: Athlete[]
  tenants: { id: string; nama: string; nama_pendek: string | null; color_primary: string }[]
  events: { id: string; nama: string; ps_tenants: { nama_pendek: string | null } | null }[]
  eventId?: string
  tenantId?: string
  enrolledMode: boolean
}) {
  const router = useRouter()
  const [athletes, setAthletes] = useState<Athlete[]>(initialAthletes)
  const [query, setQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'L' | 'P'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return athletes.filter(a => {
      const matchQuery = !q
        || a.nama_lengkap?.toLowerCase().includes(q)
        || a.uipm_id?.toLowerCase().includes(q)
        || a.affiliation_nama?.toLowerCase().includes(q)
        || a.negara_code?.toLowerCase().includes(q)
      const matchGender = genderFilter === 'all' || a.gender === genderFilter
      return matchQuery && matchGender
    })
  }, [athletes, query, genderFilter])

  const removeAthlete = async (a: Athlete) => {
    if (!confirm(`Hapus atlet "${a.nama_lengkap}"?${enrolledMode ? ' (Akan menghapus enrollment dari event ini)' : ' (Master record akan hilang)'}`)) {
      return
    }
    try {
      const url = enrolledMode
        ? `/api/pentascore/athletes/enrollment/${a.id}`
        : `/api/pentascore/athletes/${a.id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setAthletes(prev => prev.filter(x => x.id !== a.id))
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama, UIPM ID, kontingen..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Gender filter */}
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded overflow-hidden">
            {[
              { v: 'all', label: 'Semua' },
              { v: 'L', label: 'Pria' },
              { v: 'P', label: 'Wanita' },
            ].map(o => (
              <button
                key={o.v}
                onClick={() => setGenderFilter(o.v as any)}
                className={`px-3 py-2 text-xs transition ${
                  genderFilter === o.v
                    ? 'bg-amber-500/15 text-amber-200'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Tenant filter (only in master mode) */}
          {!enrolledMode && tenants.length > 0 && (
            <select
              value={tenantId ?? ''}
              onChange={e => {
                const url = new URL(window.location.href)
                if (e.target.value) url.searchParams.set('tenant_id', e.target.value)
                else url.searchParams.delete('tenant_id')
                router.push(url.pathname + url.search)
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="">All Tenants</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.nama_pendek ?? t.nama}</option>)}
            </select>
          )}

          {/* Event quick switcher */}
          {events.length > 0 && (
            <select
              value={eventId ?? ''}
              onChange={e => {
                const url = new URL(window.location.href)
                if (e.target.value) url.searchParams.set('event_id', e.target.value)
                else url.searchParams.delete('event_id')
                router.push(url.pathname + url.search)
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500 max-w-[280px] truncate"
            >
              <option value="">Master Registry</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.ps_tenants?.nama_pendek ?? '—'} · {e.nama}
                </option>
              ))}
            </select>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <Link
              href={`/operator/pentascore/athletes/import${eventId ? `?event_id=${eventId}` : ''}`}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded flex items-center gap-1.5 transition"
            >
              <Upload size={12} /> Import Excel
            </Link>
            <a
              href="/api/pentascore/athletes/template"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded flex items-center gap-1.5 transition"
              title="Download template Excel"
            >
              <Download size={12} /> Template
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-slate-400">
          <strong className="text-white">{filtered.length}</strong> dari {athletes.length} atlet
        </div>
        {enrolledMode && (
          <div className="text-amber-400 text-xs flex items-center gap-1.5">
            <Filter size={11} />
            Showing enrollment for event filter
          </div>
        )}
      </div>

      {/* Athletes table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users size={32} className="mx-auto mb-3 opacity-50" />
            <div className="text-sm">
              {athletes.length === 0
                ? <>No athletes yet. <Link href={`/operator/pentascore/athletes/import${eventId ? `?event_id=${eventId}` : ''}`} className="text-amber-400 hover:underline">Import via Excel →</Link></>
                : 'No matches for current filter.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  {enrolledMode && (
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16">#</th>
                  )}
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atlet</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">UIPM ID</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Negara</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Affiliation</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gender</th>
                  {enrolledMode && (
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  )}
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition">
                    {enrolledMode && (
                      <td className="px-4 py-3 text-amber-400 font-mono font-bold">
                        {a.start_number ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{a.nama_lengkap}</div>
                      {a.tanggal_lahir && (
                        <div className="text-[10px] text-slate-500">DOB {a.tanggal_lahir}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                      {a.uipm_id ?? <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Globe2 size={11} className="text-slate-500" />
                        {a.negara_code ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{a.affiliation_nama ?? '—'}</td>
                    <td className="px-4 py-3">
                      {a.gender === 'L' ? (
                        <span className="inline-flex items-center gap-1 text-blue-300">
                          <span className="font-bold text-[12px] select-none">♂</span> Pria
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-pink-300">
                          <span className="font-bold text-[12px] select-none">♀</span> Wanita
                        </span>
                      )}
                    </td>
                    {enrolledMode && (
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          a.enrollment_status === 'confirmed' ? 'bg-green-500/15 text-green-300' :
                          a.enrollment_status === 'withdrew'  ? 'bg-yellow-500/15 text-yellow-300' :
                          a.enrollment_status === 'dsq'       ? 'bg-red-500/15 text-red-300' :
                          'bg-slate-700/50 text-slate-300'
                        }`}>
                          {a.enrollment_status}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeAthlete(a)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
