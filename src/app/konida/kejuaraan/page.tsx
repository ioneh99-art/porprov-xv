'use client'
import { useEffect, useState } from 'react'
import { Search, CheckCircle, XCircle, Trophy } from 'lucide-react'

export default function KonidaKejuaraanPage() {
  const [kejuaraan, setKejuaraan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Menunggu KONIDA')
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

        // Step 1: ambil atlet dari kontingen ini
        const { data: atletList } = await supabase
            .from('atlet')
            .select('id')
            .eq('kontingen_id', meData.kontingen_id)

        if (!atletList || atletList.length === 0) {
            setKejuaraan([])
            setLoading(false)
            return
        }

        const atletIds = atletList.map(a => a.id)

        // Step 2: ambil kejuaraan berdasarkan atlet_id
        const { data } = await supabase
            .from('riwayat_kejuaraan')
            .select(`
            *,
            atlet(nama_lengkap, no_ktp, kontingen_id, cabang_olahraga(nama), kontingen(nama))
            `)
            .in('atlet_id', atletIds)
            .order('created_at', { ascending: false })

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
      status: 'Menunggu Cabor',
      approved_konida_by: me.id,
      approved_konida_at: new Date().toISOString(),
      catatan_konida: 'Disetujui oleh KONIDA',
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
      status: 'Ditolak KONIDA',
      catatan_konida: catatan,
    }).eq('id', id)
    await loadData()
    setProcessing(null)
  }

  const filtered = kejuaraan.filter(k => {
    const matchSearch =
      k.nama_kejuaraan?.toLowerCase().includes(search.toLowerCase()) ||
      k.atlet?.nama_lengkap?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Semua' || k.status === filter
    return matchSearch && matchFilter
  })

  const pending = kejuaraan.filter(k => k.status === 'Menunggu KONIDA').length

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
      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-lg font-semibold text-white">Verifikasi Kejuaraan Atlet</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Review riwayat kejuaraan yang diajukan atlet kontingen kamu
          </p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-xs font-medium">
              {pending} kejuaraan menunggu review
            </span>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Cari nama atlet atau kejuaraan..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['Menunggu KONIDA', 'Menunggu Cabor', 'Verified', 'Ditolak KONIDA', 'Semua'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                  ${filter === f
                    ? 'bg-amber-500 border-amber-500 text-slate-900 font-semibold'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                {f}
                {f === 'Menunggu KONIDA' && pending > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {pending}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto text-slate-500 text-xs">{filtered.length} data</div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Trophy size={32} className="text-slate-700 mx-auto mb-3" />
            <div className="text-slate-600 text-sm">
              {filter === 'Menunggu KONIDA'
                ? '✅ Tidak ada yang menunggu review'
                : 'Tidak ada data'}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {filtered.map(k => (
              <div key={k.id} className="px-5 py-4 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white text-sm font-medium">{k.nama_kejuaraan}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tingkatColor(k.tingkat)}`}>
                        {k.tingkat?.replace('_', '/')}
                      </span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium ${statusColor(k.status)}`}>
                        {k.status}
                      </span>
                    </div>

                    {/* Detail */}
                    <div className="text-slate-400 text-xs mb-1">
                      {k.nomor_lomba} · <span className="text-emerald-400 font-medium">{k.hasil}</span> · {k.tahun}
                      {k.lokasi && ` · ${k.lokasi}`}
                    </div>

                    {/* Atlet info */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <span className="text-amber-400 text-[9px] font-bold">A</span>
                      </div>
                      <span className="text-slate-400 text-xs">{k.atlet?.nama_lengkap}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-slate-500 text-xs">{k.atlet?.cabang_olahraga?.nama}</span>
                    </div>

                    {/* Deskripsi */}
                    {k.deskripsi && (
                      <div className="mt-2 text-slate-500 text-xs bg-slate-800/50 px-3 py-2 rounded-lg">
                        {k.deskripsi}
                      </div>
                    )}

                    {/* Dokumen */}
                    {k.dokumen_url && (
                      <a href={k.dokumen_url} target="_blank" rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs transition-colors">
                        📎 Lihat bukti dokumen
                      </a>
                    )}

                    {/* Catatan penolakan */}
                    {k.status?.includes('Ditolak') && k.catatan_konida && (
                      <div className="mt-2 text-red-400 text-xs bg-red-500/5 border border-red-500/10 px-3 py-2 rounded-lg">
                        ⚠ {k.catatan_konida}
                      </div>
                    )}
                  </div>

                  {/* Aksi */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {k.status === 'Menunggu KONIDA' && (
                      <>
                        <button onClick={() => handleApprove(k.id)}
                          disabled={processing === k.id}
                          className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50 font-medium">
                          <CheckCircle size={12} /> Approve
                        </button>
                        <button onClick={() => handleReject(k.id)}
                          disabled={processing === k.id}
                          className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50 font-medium">
                          <XCircle size={12} /> Tolak
                        </button>
                      </>
                    )}
                    {k.status === 'Menunggu Cabor' && (
                      <span className="text-blue-400 text-[10px] text-right">
                        ✓ Diteruskan<br/>ke Cabor
                      </span>
                    )}
                    {k.status === 'Verified' && (
                      <span className="text-emerald-400 text-[10px]">✅ Verified</span>
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