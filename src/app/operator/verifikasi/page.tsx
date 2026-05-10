'use client'
import { useEffect, useState } from 'react'
import { Search, CheckCircle, XCircle, Mail } from 'lucide-react'

export default function OperatorVerifikasiPage() {
  const [atlet, setAtlet] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Menunggu Cabor')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<number | null>(null)
  const [me, setMe] = useState<any>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { loadData() }, [])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

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
        id, nama_lengkap, no_ktp, gender, tgl_lahir,
        status_registrasi, status_verifikasi,
        catatan_cabor, catatan_verifikasi,
        approved_cabor_at,
        cabang_olahraga(nama),
        kontingen(nama)
      `)
      .eq('cabor_id', meData.cabor_id)
      .order('created_at', { ascending: false })

    setAtlet(data ?? [])
    setLoading(false)
  }

  const handleAction = async (
    atletId: number,
    action: 'approve_cabor' | 'reject_cabor',
    alasan?: string
  ) => {
    setProcessing(atletId)
    try {
      const res = await fetch('/api/verifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atlet_id: atletId, action, alasan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast(
        action === 'approve_cabor'
          ? '✅ Atlet diapprove! Email notifikasi terkirim ke KONIDA.'
          : '❌ Atlet ditolak. Email notifikasi terkirim ke KONIDA.',
        'success'
      )
      await loadData()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleApprove = async (atletId: number) => {
    if (!confirm('Approve atlet ini? Data akan diteruskan ke Admin KONI.')) return
    await handleAction(atletId, 'approve_cabor')
  }

  const handleReject = async (atletId: number) => {
    const alasan = prompt('Alasan penolakan (wajib diisi):')
    if (!alasan) return
    await handleAction(atletId, 'reject_cabor', alasan)
  }

  const filtered = atlet.filter(a => {
    const matchSearch =
      a.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
      a.kontingen?.nama?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Semua' || a.status_registrasi === filter
    return matchSearch && matchFilter
  })

  const pending = atlet.filter(a => a.status_registrasi === 'Menunggu Cabor').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl transition-all
          ${toast.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Verifikasi Atlet</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Review atlet yang diajukan KONIDA ke cabor kamu
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pending > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-medium">
                {pending} atlet menunggu review
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
            <Mail size={11} />
            <span>Email aktif</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Cari nama, kontingen..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['Menunggu Cabor', 'Menunggu Admin', 'Ditolak Cabor', 'Verified', 'Semua'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${filter === f
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                {f}
                {f === 'Menunggu Cabor' && pending > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-slate-900 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {pending}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto text-slate-500 text-xs">{filtered.length} atlet</div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nama', 'Kontingen', 'Gender', 'Tgl Lahir', 'Status', 'Catatan', 'Aksi'].map(h => (
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
                    {filter === 'Menunggu Cabor'
                      ? '✅ Tidak ada atlet yang menunggu review'
                      : 'Tidak ada data'}
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-slate-200 text-xs font-medium">{a.nama_lengkap}</div>
                    <div className="text-slate-600 text-[10px] font-mono mt-0.5">{a.no_ktp}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{a.kontingen?.nama}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full
                      ${a.gender === 'L' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                      {a.gender === 'L' ? 'Putra' : 'Putri'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {a.tgl_lahir
                      ? new Date(a.tgl_lahir).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium
                      ${a.status_registrasi === 'Menunggu Cabor' ? 'bg-amber-500/10 text-amber-400'
                      : a.status_registrasi === 'Menunggu Admin' ? 'bg-purple-500/10 text-purple-400'
                      : a.status_registrasi === 'Ditolak Cabor' ? 'bg-red-500/10 text-red-400'
                      : a.status_registrasi === 'Verified' ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-700/50 text-slate-400'}`}>
                      {a.status_registrasi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[140px] truncate">
                    {a.catatan_cabor || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {a.status_registrasi === 'Menunggu Cabor' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleApprove(a.id)}
                          disabled={processing === a.id}
                          className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                          {processing === a.id
                            ? <div className="w-3 h-3 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                            : <CheckCircle size={11} />}
                          Approve
                        </button>
                        <button onClick={() => handleReject(a.id)}
                          disabled={processing === a.id}
                          className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                          <XCircle size={11} /> Reject
                        </button>
                      </div>
                    )}
                    {a.status_registrasi === 'Menunggu Admin' && (
                      <span className="text-purple-400 text-[10px] flex items-center gap-1">
                        <CheckCircle size={10} /> Diteruskan ke Admin
                      </span>
                    )}
                    {a.status_registrasi === 'Verified' && (
                      <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                        <CheckCircle size={10} /> Verified
                      </span>
                    )}
                    {a.status_registrasi === 'Ditolak Cabor' && (
                      <span className="text-red-400 text-[10px] flex items-center gap-1">
                        <XCircle size={10} /> Ditolak
                      </span>
                    )}
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