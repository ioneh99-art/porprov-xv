'use client'
import { useEffect, useState } from 'react'
import { Search, CheckCircle, XCircle, Send } from 'lucide-react'

export default function VerifikasiPage() {
  const [atlet, setAtlet] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Menunggu Admin')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<number | null>(null)
  const [me, setMe] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const meData = await fetch('/api/auth/me').then(r => r.json())
    setMe(meData)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data } = await supabase
      .from('atlet')
      .select(`
        id, nama_lengkap, no_ktp, gender,
        status_registrasi, status_verifikasi,
        catatan_verifikasi, catatan_cabor,
        approved_cabor_at, approved_admin_at,
        is_posted,
        cabang_olahraga(nama),
        kontingen(nama)
      `)
      .order('created_at', { ascending: false })

    setAtlet(data ?? [])
    setLoading(false)
  }

  const handleApprove = async (atletId: number) => {
    setProcessing(atletId)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.rpc('approve_admin', {
        atlet_id: atletId,
        user_id: me.id,
        catatan: 'Diverifikasi oleh Admin PORPROV'
      })
      await loadData()
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (atletId: number) => {
    const catatan = prompt('Alasan penolakan (wajib diisi):')
    if (!catatan) return
    setProcessing(atletId)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.rpc('reject_admin', {
        atlet_id: atletId,
        user_id: me.id,
        catatan
      })
      await loadData()
    } finally {
      setProcessing(null)
    }
  }

  const handlePosting = async (atletId: number) => {
    if (!confirm('Posting atlet ini? Data tidak bisa diubah setelah posted.')) return
    setProcessing(atletId)
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.rpc('posting_atlet', {
        atlet_id: atletId,
        user_id: me.id
      })
      await loadData()
    } finally {
      setProcessing(null)
    }
  }

  const pending = atlet.filter(a => a.status_registrasi === 'Menunggu Admin').length
  const filtered = atlet.filter(a => {
    const matchSearch =
      a.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
      a.kontingen?.nama?.toLowerCase().includes(search.toLowerCase()) ||
      a.cabang_olahraga?.nama?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Semua' || a.status_registrasi === filter
    return matchSearch && matchFilter
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Verifikasi Final Atlet</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Atlet yang sudah diapprove Operator Cabor menunggu verifikasi Admin
          </p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-400 text-xs font-medium">
              {pending} atlet menunggu verifikasi final
            </span>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Cari nama, kontingen, cabor..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['Menunggu Admin', 'Verified', 'Posted', 'Ditolak Admin', 'Semua'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${filter === f
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                {f}
                {f === 'Menunggu Admin' && pending > 0 && (
                  <span className="ml-1.5 bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {pending}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto text-slate-500 text-xs">{filtered.length} atlet</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nama', 'Kontingen', 'Cabor', 'Gender', 'Status', 'Approve Cabor', 'Aksi Admin'].map(h => (
                  <th key={h} className="text-left text-slate-500 text-[10px] uppercase tracking-wider font-medium px-4 py-3 first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-600 text-sm">
                    {filter === 'Menunggu Admin'
                      ? '✅ Tidak ada atlet yang menunggu verifikasi'
                      : 'Tidak ada data'}
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-3 text-slate-200 text-xs font-medium">{a.nama_lengkap}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{a.kontingen?.nama}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{a.cabang_olahraga?.nama}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full
                      ${a.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                      {a.gender === 'L' ? 'Putra' : 'Putri'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium
                      ${a.status_registrasi === 'Menunggu Admin' ? 'bg-purple-500/10 text-purple-400'
                      : a.status_registrasi === 'Verified' ? 'bg-emerald-500/10 text-emerald-400'
                      : a.status_registrasi === 'Posted' ? 'bg-blue-500/10 text-blue-400'
                      : a.status_registrasi === 'Ditolak Admin' ? 'bg-red-500/10 text-red-400'
                      : 'bg-slate-700/50 text-slate-400'}`}>
                      {a.status_registrasi}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.approved_cabor_at ? (
                      <span className="text-emerald-400 text-[10px]">
                        ✓ {new Date(a.approved_cabor_at).toLocaleDateString('id-ID')}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {a.status_registrasi === 'Menunggu Admin' && (
                        <>
                          <button onClick={() => handleApprove(a.id)}
                            disabled={processing === a.id}
                            className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                            <CheckCircle size={11} /> Verify
                          </button>
                          <button onClick={() => handleReject(a.id)}
                            disabled={processing === a.id}
                            className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                            <XCircle size={11} /> Reject
                          </button>
                        </>
                      )}
                      {a.status_registrasi === 'Verified' && !a.is_posted && (
                        <button onClick={() => handlePosting(a.id)}
                          disabled={processing === a.id}
                          className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                          <Send size={11} /> Posting
                        </button>
                      )}
                      {a.is_posted && (
                        <span className="text-blue-400 text-[10px]">✓ Posted</span>
                      )}
                      {a.status_registrasi === 'Ditolak Admin' && (
                        <span className="text-red-400 text-[10px]">✗ Ditolak</span>
                      )}
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