'use client'
import { useEffect, useState } from 'react'
import { Search, Plus, Eye, Edit } from 'lucide-react'
import Link from 'next/link'

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Verified: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    Draft: 'bg-slate-700/50 text-slate-400 border border-slate-700',
    Ready: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    Rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status] ?? styles.Draft}`}>
      {status}
    </span>
  )
}

export default function KonidaAtletPage() {
  const [atlet, setAtlet] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('Semua')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const me = await res.json()

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data, error: err } = await supabase
        .from('atlet')
        .select(`
          id, nama_lengkap, no_ktp, gender, tgl_lahir,
          status_registrasi, status_verifikasi,
          cabang_olahraga(nama)
        `)
        .eq('kontingen_id', me.kontingen_id)
        .order('created_at', { ascending: false })

      if (err) throw new Error(err.message)
      setAtlet(data ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = atlet.filter(a => {
    const matchSearch =
      a.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
      a.no_ktp?.includes(search) ||
      a.cabang_olahraga?.nama?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'Semua' || a.status_verifikasi === filterStatus
    return matchSearch && matchStatus
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm">
      <div className="font-medium mb-1">Error memuat data</div>
      <div className="text-xs opacity-70">{error}</div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Daftar Atlet</h1>
          <p className="text-slate-500 text-xs mt-0.5">{atlet.length} atlet terdaftar</p>
        </div>
        <Link href="/konida/atlet/tambah"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs px-4 py-2 rounded-lg transition-colors font-semibold">
          <Plus size={14} />
          Tambah Atlet
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama, KTP, olahraga..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div className="flex gap-1.5">
            {['Semua', 'Draft', 'Ready', 'Verified'].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${filterStatus === f
                    ? 'bg-amber-500 border-amber-500 text-slate-900 font-semibold'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="ml-auto text-slate-500 text-xs">{filtered.length} hasil</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nama Lengkap', 'Cabor', 'Gender', 'Tgl Lahir', 'No KTP', 'Reg', 'Verif', ''].map(h => (
                  <th key={h} className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3 first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-600 text-sm">
                    {atlet.length === 0
                      ? '🏃 Belum ada atlet — klik Tambah Atlet untuk mulai'
                      : 'Tidak ada hasil yang cocok'}
                  </td>
                </tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-slate-200 text-xs font-medium">{a.nama_lengkap}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{a.cabang_olahraga?.nama}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                      {a.gender === 'L' ? 'Putra' : 'Putri'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{a.tgl_lahir}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{a.no_ktp}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status_registrasi} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.status_verifikasi} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Link href={`/konida/atlet/${a.id}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                        <Eye size={13} />
                      </Link>
                      <Link href={`/konida/atlet/${a.id}/edit`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                        <Edit size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}