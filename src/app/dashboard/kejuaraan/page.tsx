'use client'
import { useEffect, useState } from 'react'
import { Search, CheckCircle, XCircle, Trophy } from 'lucide-react'

export default function AdminKejuaraanPage() {
  const [kejuaraan, setKejuaraan] = useState<any[]>([])
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

        // Admin lihat semua — tidak perlu filter
        const { data, error } = await supabase
            .from('riwayat_kejuaraan')
            .select(`
            *,
            atlet(nama_lengkap, no_ktp, cabang_olahraga(nama), kontingen(nama))
            `)
            .order('created_at', { ascending: false })

        console.log('kejuaraan data:', data)
        console.log('kejuaraan error:', error)

        setKejuaraan(data ?? [])
        setLoading(false)
    }

  const handleApprove = async (id: number) => {
    setProcessing(id)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('riwayat_kejuaraan').update({
      status: 'Verified',
      approved_admin_by: me.id,
      approved_admin_at: new Date().toISOString(),
      catatan_admin: 'Diverifikasi oleh Admin KONI',
    }).eq('id', id)
    await loadData()
    setProcessing(null)
  }

  const handleReject = async (id: number) => {
    const catatan = prompt('Alasan penolakan (wajib):')
    if (!catatan) return
    setProcessing(id)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('riwayat_kejuaraan').update({
      status: 'Ditolak Admin',
      catatan_admin: catatan,
    }).eq('id', id)
    await loadData()
    setProcessing(null)
  }

  const filtered = kejuaraan.filter(k => {
    const matchSearch =
      k.nama_kejuaraan?.toLowerCase().includes(search.toLowerCase()) ||
      k.atlet?.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
      k.atlet?.kontingen?.nama?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Semua' || k.status === filter
    return matchSearch && matchFilter
  })

  const pending = kejuaraan.filter(k => k.status === 'Menunggu Admin').length

  const statusColor = (s: string) => {
    if (s === 'Verified') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (s === 'Menunggu KONIDA') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    if (s === 'Menunggu Cabor') return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    if (s === 'Menunggu Admin') return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    if (s?.includes('Ditolak')) return 'bg-red-500/10 text-red-400 border-red-500/20'
    return 'bg-slate-700/50 text-slate-400 border-slate-700'
  }

  const tingkatColor = (t: string) => {
    if (t === 'internasional') return 'bg-purple-500/10 text-purple-400'
    if (t === 'nasional') return 'bg-blue-500/10 text-blue-400'
    if (t === 'provinsi') return 'bg-emerald-500/10 text-emerald-400'
    return 'bg-slate-700/50 text-slate-400'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Verifikasi Final Kejuaraan</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Verifikasi final riwayat kejuaraan atlet dari seluruh kontingen
          </p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-purple-400 text-xs font-medium">
              {pending} menunggu verifikasi final
            </span>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Cari nama, kontingen..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['Menunggu Admin', 'Verified', 'Ditolak Admin', 'Semua'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${filter === f
                    ? 'bg-blue-600 border-blue-600 text-white font-semibold'
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
          <div className="ml-auto text-slate-500 text-xs">{filtered.length} data</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Trophy size={32} className="text-slate-700 mx-auto mb-3" />
            <div className="text-slate-600 text-sm">
              {filter === 'Menunggu Admin'
                ? '✅ Tidak ada yang menunggu verifikasi'
                : 'Tidak ada data'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filtered.map(k => (
              <div key={k.id} className="px-5 py-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white text-sm font-medium">{k.nama_kejuaraan}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tingkatColor(k.tingkat)}`}>
                        {k.tingkat?.replace('_', '/')}
                      </span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium ${statusColor(k.status)}`}>
                        {k.status}
                      </span>
                    </div>

                    <div className="text-slate-400 text-xs mb-1">
                      {k.nomor_lomba} · <span className="text-emerald-400 font-medium">{k.hasil}</span> · {k.tahun}
                      {k.penyelenggara && ` · ${k.penyelenggara}`}
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-slate-400 text-xs">{k.atlet?.nama_lengkap}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-slate-500 text-xs">{k.atlet?.kontingen?.nama}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-slate-500 text-xs">{k.atlet?.cabang_olahraga?.nama}</span>
                    </div>

                    {k.deskripsi && (
                      <div className="mt-2 text-slate-500 text-xs bg-slate-800/50 px-3 py-2 rounded-lg">
                        {k.deskripsi}
                      </div>
                    )}

                    {k.dokumen_url && (
                      <a href={k.dokumen_url} target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs transition-colors">
                        📎 Lihat bukti dokumen
                      </a>
                    )}

                    {/* Trail verifikasi */}
                    {k.approved_konida_at && (
                      <div className="mt-2 text-slate-600 text-[10px]">
                        ✓ KONIDA: {new Date(k.approved_konida_at).toLocaleDateString('id-ID')}
                        {k.approved_cabor_at && ` · ✓ Cabor: ${new Date(k.approved_cabor_at).toLocaleDateString('id-ID')}`}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {k.status === 'Menunggu Admin' && (
                      <>
                        <button onClick={() => handleApprove(k.id)}
                          disabled={processing === k.id}
                          className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50 font-medium">
                          <CheckCircle size={12} /> Verify
                        </button>
                        <button onClick={() => handleReject(k.id)}
                          disabled={processing === k.id}
                          className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50 font-medium">
                          <XCircle size={12} /> Tolak
                        </button>
                      </>
                    )}
                    {k.status === 'Verified' && (
                      <span className="text-emerald-400 text-[10px]">✅ Verified</span>
                    )}
                    {k.status?.includes('Ditolak') && (
                      <span className="text-red-400 text-[10px]">✗ Ditolak</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}