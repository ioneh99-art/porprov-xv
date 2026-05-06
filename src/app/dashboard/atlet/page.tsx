'use client'
import { useState } from 'react'
import { Search, Filter, Eye } from 'lucide-react'
import { atletData } from '@/lib/data'

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Verified: 'bg-emerald-500/10 text-emerald-400',
    Draft: 'bg-slate-700 text-slate-400',
    Ready: 'bg-blue-500/10 text-blue-400',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-slate-700 text-slate-400'}`}>
      {status}
    </span>
  )
}

export default function AtletPage() {
  const [search, setSearch] = useState('')
  const [filterVerif, setFilterVerif] = useState('Semua')

  const filtered = atletData.filter(a => {
    const matchSearch = a.nama.toLowerCase().includes(search.toLowerCase()) ||
      a.kontingen.toLowerCase().includes(search.toLowerCase()) ||
      a.olahraga.toLowerCase().includes(search.toLowerCase())
    const matchVerif = filterVerif === 'Semua' || a.statusVerif === filterVerif
    return matchSearch && matchVerif
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Daftar Atlet</h1>
          <p className="text-slate-500 text-xs mt-0.5">Total 24,122 atlet terdaftar</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg transition-colors font-medium">
          + Tambah Atlet
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama, kontingen, olahraga..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-500" />
            {['Semua', 'Verified', 'Draft'].map(f => (
              <button
                key={f}
                onClick={() => setFilterVerif(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${filterVerif === f
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="ml-auto text-slate-500 text-xs">{filtered.length} hasil</div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Kontingen', 'Olahraga', 'Nama Lengkap', 'Gender', 'Tgl Lahir', 'No KTP', 'Status Reg', 'Status Verif', ''].map(h => (
                  <th key={h} className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3 first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-slate-300 text-xs font-medium whitespace-nowrap">{a.kontingen}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{a.olahraga}</td>
                  <td className="px-4 py-3 text-slate-200 text-xs font-medium">{a.nama}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                      {a.gender === 'L' ? 'Putra' : 'Putri'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{a.tglLahir}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{a.noKtp}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.statusReg} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.statusVerif} /></td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">Tidak ada data yang cocok</div>
        )}
      </div>
    </div>
  )
}
