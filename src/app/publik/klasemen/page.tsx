'use client'
import { useEffect, useState } from 'react'
import { X, Medal } from 'lucide-react'

export default function KlasemenPublikPage() {
  const [klasemen, setKlasemen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filterCabor, setFilterCabor] = useState('Semua')
  const [cabors, setCabors] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [detail, setDetail] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [filterCabor])

  const loadData = async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: caborList } = await supabase
      .from('cabang_olahraga')
      .select('id, nama')
      .eq('is_active', true)
      .order('nama')
    setCabors(caborList ?? [])

    if (filterCabor === 'Semua') {
      const { data } = await supabase
        .from('klasemen_medali')
        .select('*, kontingen(nama)')
        .order('emas', { ascending: false })
        .order('perak', { ascending: false })
        .order('perunggu', { ascending: false })
      setKlasemen(data ?? [])
    } else {
      const selectedCabor = caborList?.find(c => c.nama === filterCabor)
      if (!selectedCabor) return

      const { data: hasilData } = await supabase
        .from('hasil_pertandingan')
        .select('kontingen_id, medali, kontingen(nama), nomor_pertandingan!inner(cabor_id)')
        .eq('nomor_pertandingan.cabor_id', selectedCabor.id)
        .neq('medali', 'none')

      const map: Record<number, any> = {}
      hasilData?.forEach((h: any) => {
        if (!map[h.kontingen_id]) {
          map[h.kontingen_id] = {
            kontingen_id: h.kontingen_id,
            kontingen: h.kontingen,
            emas: 0, perak: 0, perunggu: 0, total: 0
          }
        }
        if (h.medali === 'emas') map[h.kontingen_id].emas++
        if (h.medali === 'perak') map[h.kontingen_id].perak++
        if (h.medali === 'perunggu') map[h.kontingen_id].perunggu++
        map[h.kontingen_id].total++
      })

      setKlasemen(Object.values(map).sort((a: any, b: any) =>
        b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu
      ))
    }

    setLastUpdate(new Date())
    setLoading(false)
  }

  const loadDetail = async (kontingen: any) => {
    setSelected(kontingen)
    setLoadingDetail(true)
    setDetail([])

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data } = await supabase
      .from('hasil_pertandingan')
      .select(`
        medali, nilai, satuan_hasil,
        atlet(nama_lengkap),
        nomor_pertandingan(nama, tipe_skor, satuan, cabang_olahraga(nama))
      `)
      .eq('kontingen_id', kontingen.kontingen_id)
      .neq('medali', 'none')
      .order('medali')

    const byCabor: Record<string, any[]> = {}
    data?.forEach((h: any) => {
      const cabor = h.nomor_pertandingan?.cabang_olahraga?.nama ?? 'Lainnya'
      if (!byCabor[cabor]) byCabor[cabor] = []
      byCabor[cabor].push(h)
    })

    setDetail(Object.entries(byCabor).map(([cabor, items]) => ({ cabor, items })))
    setLoadingDetail(false)
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  const getRowBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/40'
    if (rank === 2) return 'bg-slate-400/5 border border-slate-400/10 hover:border-slate-400/30'
    if (rank === 3) return 'bg-amber-700/5 border border-amber-700/20 hover:border-amber-700/40'
    return 'border border-slate-800/60 hover:border-slate-700'
  }

  const medaliIcon = (m: string) => {
    if (m === 'emas') return '🥇'
    if (m === 'perak') return '🥈'
    if (m === 'perunggu') return '🥉'
    return '—'
  }

  const medaliColor = (m: string) => {
    if (m === 'emas') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    if (m === 'perak') return 'text-slate-300 bg-slate-400/10 border-slate-400/20'
    if (m === 'perunggu') return 'text-amber-600 bg-amber-600/10 border-amber-600/20'
    return ''
  }

  return (
    <div className="min-h-screen bg-slate-950">

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-porprov.png"
              alt="PORPROV XV"
              className="w-10 h-10 object-contain"
            />
            <div>
              <div className="text-white text-sm font-semibold">PORPROV XV</div>
              <div className="text-slate-500 text-[10px]">Jawa Barat 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">Live</span>
            {lastUpdate && (
              <span className="text-slate-600 text-[10px] ml-1">
                · {lastUpdate.toLocaleTimeString('id-ID')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-white text-3xl font-bold mb-2">
            Klasemen Perolehan Medali
          </h1>
          <p className="text-slate-500 text-sm">
            PORPROV XV Jawa Barat 2026
          </p>
          <p className="text-slate-700 text-xs mt-1">
            Update otomatis setiap 30 detik
          </p>
        </div>

    

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : klasemen.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🏅</div>
            <div className="text-slate-500 text-sm">Belum ada medali yang ditetapkan</div>
            <div className="text-slate-700 text-xs mt-1">Pantau terus — update otomatis setiap 30 detik</div>
          </div>
        ) : (
          <div>
            {/* Header Tabel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 mb-3 flex items-center">
              <div className="w-12 text-slate-600 text-[10px] uppercase tracking-wider font-medium">
                Rank
              </div>
              <div className="flex-1 text-slate-600 text-[10px] uppercase tracking-wider font-medium">
                Kontingen
              </div>
              <div className="flex items-center gap-6 mr-5">
                <div className="w-10 text-center">
                  <div className="text-xl">🥇</div>
                  <div className="text-yellow-600 text-[9px] font-semibold mt-0.5">EMAS</div>
                </div>
                <div className="w-10 text-center">
                  <div className="text-xl">🥈</div>
                  <div className="text-slate-500 text-[9px] font-semibold mt-0.5">PERAK</div>
                </div>
                <div className="w-10 text-center">
                  <div className="text-xl">🥉</div>
                  <div className="text-amber-700 text-[9px] font-semibold mt-0.5">PERUNGGU</div>
                </div>
                <div className="w-14 text-center border-l border-slate-700 pl-4">
                  <div className="text-slate-400 text-base font-bold">∑</div>
                  <div className="text-slate-600 text-[9px] font-semibold mt-0.5">TOTAL</div>
                </div>
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {klasemen.map((k, i) => {
                const rank = i + 1
                return (
                  <button key={k.kontingen_id} onClick={() => loadDetail(k)}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left ${getRowBg(rank)}`}>

                    {/* Rank */}
                    <div className="w-12 flex-shrink-0">
                      {rank <= 3 ? (
                        <span className="text-2xl">{getRankIcon(rank)}</span>
                      ) : (
                        <span className="text-slate-500 text-lg font-bold w-8 text-center block">{rank}</span>
                      )}
                    </div>

                    {/* Nama Kontingen */}
                    <div className="flex-1">
                      <div className={`font-bold ${rank === 1 ? 'text-yellow-300 text-lg' : rank === 2 ? 'text-slate-200 text-base' : rank === 3 ? 'text-amber-500 text-base' : 'text-slate-300 text-sm'}`}>
                        {k.kontingen?.nama}
                      </div>
                    </div>

                    {/* Medali */}
                    <div className="flex items-center gap-6">
                      <div className="w-10 text-center">
                        <div className={`font-bold ${rank <= 3 ? 'text-2xl' : 'text-xl'} text-yellow-400`}>
                          {k.emas}
                        </div>
                      </div>
                      <div className="w-10 text-center">
                        <div className={`font-bold ${rank <= 3 ? 'text-2xl' : 'text-xl'} text-slate-300`}>
                          {k.perak}
                        </div>
                      </div>
                      <div className="w-10 text-center">
                        <div className={`font-bold ${rank <= 3 ? 'text-2xl' : 'text-xl'} text-amber-600`}>
                          {k.perunggu}
                        </div>
                      </div>
                      <div className="w-14 text-center border-l border-slate-700 pl-4">
                        <div className={`font-bold ${rank <= 3 ? 'text-2xl' : 'text-xl'} text-white`}>
                          {k.total}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-slate-600 text-lg ml-2">›</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="text-center mt-10 text-slate-800 text-xs">
          © 2026 KONI Jawa Barat · Sistem Informasi PORPROV XV
        </div>
      </div>

      {/* Modal Detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-white font-bold text-base">{selected.kontingen?.nama}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  Detail perolehan medali per cabang olahraga
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Summary strip */}
            <div className="px-6 py-4 border-b border-slate-800 flex gap-4 flex-shrink-0 bg-slate-950/50">
              {[
                { label: '🥇 Emas', value: selected.emas, color: 'text-yellow-400' },
                { label: '🥈 Perak', value: selected.perak, color: 'text-slate-300' },
                { label: '🥉 Perunggu', value: selected.perunggu, color: 'text-amber-600' },
                { label: '∑ Total', value: selected.total, color: 'text-white' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex-1 text-center">
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                  <div className="text-slate-600 text-[10px] mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Detail per cabor */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : detail.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm">
                  Belum ada detail medali
                </div>
              ) : detail.map(({ cabor, items }) => (
                <div key={cabor} className="mb-6">
                  {/* Cabor header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Medal size={12} className="text-blue-400" />
                    <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                      {cabor}
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-slate-600 text-[10px]">
                      {items.length} medali
                    </span>
                  </div>

                  {/* List medali */}
                  <div className="space-y-2">
                    {items.map((h: any, idx: number) => (
                      <div key={idx}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${medaliColor(h.medali)}`}>
                        <span className="text-xl">{medaliIcon(h.medali)}</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-200">
                            {h.nomor_pertandingan?.nama}
                          </div>
                          <div className="text-slate-500 text-[10px] mt-0.5">
                            {h.atlet?.nama_lengkap}
                            {h.nilai && (
                              <span className="ml-1">
                                · {h.nilai} {h.nomor_pertandingan?.satuan ?? ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold capitalize ${medaliColor(h.medali)}`}>
                          {h.medali}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}