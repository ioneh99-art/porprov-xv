'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { RefreshCw, Download, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface KlasemenRow {
  atlet_id: number
  nama_lengkap: string
  kontingen_nama: string
  fencing: number
  swimming: number
  obstacle: number
  laser_run: number
  total: number
  rank: number
  medali: string
}

export default function PentathlonKlasemenPage() {
  const [me, setMe] = useState<any>(null)
  const meRef = useRef<any>(null)
  const [genderFilter, setGenderFilter] = useState<'L' | 'P'>('L')
  const [klasemen, setKlasemen] = useState<{ L: KlasemenRow[]; P: KlasemenRow[] }>({ L: [], P: [] })
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedAtlet, setSelectedAtlet] = useState<KlasemenRow | null>(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(loadData, 30000)
    return () => clearInterval(t)
  }, [autoRefresh])

  const loadData = async () => {
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

      const map: { L: any; P: any } = {
        L: { individual: 0, fencing: 0, swimming: 0, obstacle: 0, laser_run: 0 },
        P: { individual: 0, fencing: 0, swimming: 0, obstacle: 0, laser_run: 0 },
      }
      nomorList?.forEach(n => {
        const g = n.gender as 'L' | 'P'
        if (g !== 'L' && g !== 'P') return
        const nm = n.nama as string
        if      (nm.includes('Individual')) map[g].individual = n.id
        else if (nm.includes('Fencing'))    map[g].fencing    = n.id
        else if (nm.includes('Swimming'))   map[g].swimming   = n.id
        else if (nm.includes('Riding') || nm.includes('Obstacle')) map[g].obstacle = n.id
        else if (nm.includes('Laser Run'))  map[g].laser_run  = n.id
      })

      const allNomorIds = nomorList?.map(n => n.id) ?? []
      if (allNomorIds.length === 0) { setKlasemen({ L: [], P: [] }); setLoading(false); return }

      const { data: hasilList } = await sb
        .from('hasil_pertandingan')
        .select('nomor_id, atlet_id, nilai, medali, atlet(nama_lengkap, gender, kontingen(nama))')
        .in('nomor_id', allNomorIds)

      const aggregate: Record<string, KlasemenRow> = {}
      hasilList?.forEach((h: any) => {
        const atlet = h.atlet
        if (!atlet) return
        const g = atlet.gender as 'L' | 'P'
        const key = `${g}-${h.atlet_id}`

        if (!aggregate[key]) {
          aggregate[key] = {
            atlet_id: h.atlet_id,
            nama_lengkap: atlet.nama_lengkap,
            kontingen_nama: atlet.kontingen?.nama ?? '-',
            fencing: 0, swimming: 0, obstacle: 0, laser_run: 0, total: 0,
            rank: 0, medali: 'none',
          }
        }
        const row = aggregate[key]
        if      (h.nomor_id === map[g].fencing)    row.fencing   = h.nilai ?? 0
        else if (h.nomor_id === map[g].swimming)   row.swimming  = h.nilai ?? 0
        else if (h.nomor_id === map[g].obstacle)   row.obstacle  = h.nilai ?? 0
        else if (h.nomor_id === map[g].laser_run)  row.laser_run = h.nilai ?? 0
        else if (h.nomor_id === map[g].individual) { row.total = h.nilai ?? 0; row.medali = h.medali ?? 'none' }
      })

      const byGender: { L: KlasemenRow[]; P: KlasemenRow[] } = { L: [], P: [] }
      Object.entries(aggregate).forEach(([key, row]) => {
        const g = key.split('-')[0] as 'L' | 'P'
        if (row.total === 0) row.total = row.fencing + row.swimming + row.obstacle + row.laser_run
        byGender[g].push(row)
      })
      byGender.L.sort((a, b) => b.total - a.total).forEach((r, i) => { r.rank = i + 1 })
      byGender.P.sort((a, b) => b.total - a.total).forEach((r, i) => { r.rank = i + 1 })

      setKlasemen(byGender)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    const data = klasemen[genderFilter]
    if (data.length === 0) return
    const headers = ['Rank', 'Nama', 'Kontingen', 'Fencing', 'Swimming', 'Obstacle', 'Laser Run', 'Total', 'Gap #1', 'Medali']
    const rank1 = data[0]?.total ?? 0
    const rows = data.map(r => [r.rank, r.nama_lengkap, r.kontingen_nama, r.fencing, r.swimming, r.obstacle, r.laser_run, r.total, r.rank === 1 ? 0 : rank1 - r.total, r.medali])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `klasemen-pentathlon-${genderFilter === 'L' ? 'putra' : 'putri'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const current = klasemen[genderFilter]

  const eventMaxes = useMemo(() => ({
    fencing:  Math.max(...current.map(r => r.fencing),  1),
    swimming: Math.max(...current.map(r => r.swimming), 1),
    obstacle: Math.max(...current.map(r => r.obstacle), 1),
    laser_run: Math.max(...current.map(r => r.laser_run), 1),
  }), [current])

  const rank1Total = current[0]?.total ?? 0
  const rank3Total = current[2]?.total ?? 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Klasemen Pentathlon Live</h1>
          <p className="text-slate-500 text-xs mt-1">
            Klik nama atlet untuk detail per-event · {me?.nama}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-all ${autoRefresh ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            {autoRefresh ? 'Live ON' : 'Live OFF'}
          </button>
          <button onClick={loadData} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-all">
            <RefreshCw size={12} /> Reload
          </button>
          <button onClick={exportCsv} disabled={current.length === 0}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs px-3 py-2 rounded-lg transition-all">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        {(['L', 'P'] as const).map(g => (
          <button key={g} onClick={() => setGenderFilter(g)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${genderFilter === g ? (g === 'L' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' : 'bg-pink-500/20 border border-pink-500/30 text-pink-400') : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'}`}>
            {g === 'L' ? '👨 Putra' : '👩 Putri'} ({klasemen[g].length})
          </button>
        ))}
      </div>

      {/* Podium Top 3 */}
      {current.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <PodiumCard atlet={current[1]} position={2} onClick={() => setSelectedAtlet(current[1])} />
          <PodiumCard atlet={current[0]} position={1} onClick={() => setSelectedAtlet(current[0])} />
          <PodiumCard atlet={current[2]} position={3} onClick={() => setSelectedAtlet(current[2])} />
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-white text-sm font-medium">Klasemen Lengkap — {genderFilter === 'L' ? 'Putra' : 'Putri'}</div>
          <div className="text-slate-500 text-xs">{current.length} atlet · klik nama untuk detail</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/40">
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-5 py-3 w-16">Rank</th>
                <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Atlet</th>
                <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Kontingen</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Fencing</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Swimming</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Obstacle</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Laser Run</th>
                <th className="text-center text-yellow-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Total</th>
                <th className="text-center text-red-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Gap #1</th>
                <th className="text-center text-amber-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Gap Medali</th>
                <th className="text-center text-yellow-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Medali</th>
              </tr>
            </thead>
            <tbody>
              {current.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16 text-slate-600">Belum ada hasil yang diinput</td></tr>
              ) : current.map(r => {
                const gapVsFirst = r.rank === 1 ? null : rank1Total - r.total
                const gapToMedal = r.rank <= 3 ? null : (rank3Total > 0 ? rank3Total - r.total + 1 : null)
                return (
                  <tr key={r.atlet_id}
                    className={`border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors cursor-pointer ${r.rank <= 3 ? 'bg-slate-800/10' : ''}`}
                    onClick={() => setSelectedAtlet(r)}>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${r.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : r.rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' : r.rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' : 'text-slate-500'}`}>{r.rank}</span>
                    </td>
                    <td className="px-3 py-3 text-yellow-200 font-medium hover:text-yellow-300">{r.nama_lengkap}</td>
                    <td className="px-3 py-3 text-slate-400">{r.kontingen_nama}</td>
                    <td className="px-2 py-3 text-center text-slate-300">{r.fencing  > 0 ? r.fencing  : '-'}</td>
                    <td className="px-2 py-3 text-center text-slate-300">{r.swimming > 0 ? r.swimming : '-'}</td>
                    <td className="px-2 py-3 text-center text-slate-300">{r.obstacle > 0 ? r.obstacle : '-'}</td>
                    <td className="px-2 py-3 text-center text-slate-300">{r.laser_run > 0 ? r.laser_run : '-'}</td>
                    <td className="px-3 py-3 text-center font-bold text-yellow-300">{r.total > 0 ? r.total : '-'}</td>
                    <td className="px-2 py-3 text-center">
                      {gapVsFirst === null
                        ? <span className="text-[9px] font-bold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">LEADER</span>
                        : <span className="text-red-400 font-mono text-[11px]">-{gapVsFirst}</span>}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {gapToMedal === null
                        ? <span className="text-[9px] font-bold text-emerald-400">✓</span>
                        : <span className="text-amber-400 font-mono text-[11px]">+{gapToMedal}</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.medali === 'emas'     && <span className="text-yellow-400">🥇</span>}
                      {r.medali === 'perak'    && <span className="text-slate-300">🥈</span>}
                      {r.medali === 'perunggu' && <span className="text-amber-600">🥉</span>}
                      {(!r.medali || r.medali === 'none') && <span className="text-slate-700">-</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-800 px-5 py-3 bg-slate-800/20 text-[10px] text-slate-500 flex gap-4">
          <span className="text-red-400 font-medium">Gap #1</span> = poin yang dibutuhkan untuk menyalip leader
          <span className="text-amber-400 font-medium ml-2">Gap Medali</span> = poin untuk masuk top 3
        </div>
      </div>

      {/* Atlet Performance Drawer */}
      {selectedAtlet && (
        <AtletPerformanceCard
          atlet={selectedAtlet}
          rank1={current[0]}
          maxes={eventMaxes}
          onClose={() => setSelectedAtlet(null)}
        />
      )}
    </div>
  )
}

function AtletPerformanceCard({ atlet, rank1, maxes, onClose }: {
  atlet: KlasemenRow
  rank1: KlasemenRow
  maxes: Record<string, number>
  onClose: () => void
}) {
  const events = [
    { key: 'fencing',  label: 'Fencing',  val: atlet.fencing,  r1: rank1.fencing,  max: maxes.fencing },
    { key: 'swimming', label: 'Swimming', val: atlet.swimming, r1: rank1.swimming, max: maxes.swimming },
    { key: 'obstacle', label: 'Obstacle / Riding', val: atlet.obstacle, r1: rank1.obstacle, max: maxes.obstacle },
    { key: 'laser_run',label: 'Laser Run', val: atlet.laser_run, r1: rank1.laser_run, max: maxes.laser_run },
  ]

  const best  = [...events].filter(e => e.val > 0).sort((a, b) => (b.val/b.max) - (a.val/a.max))[0]
  const worst = [...events].filter(e => e.val > 0).sort((a, b) => (a.val/a.max) - (b.val/b.max))[0]
  const gapToGold = atlet.rank === 1 ? 0 : (rank1?.total ?? 0) - atlet.total

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-80 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-white font-semibold text-sm">{atlet.nama_lengkap}</div>
              <div className="text-slate-400 text-xs mt-0.5">{atlet.kontingen_nama}</div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-800 rounded-xl p-3 text-center">
              <div className={`text-2xl font-bold ${atlet.rank === 1 ? 'text-yellow-400' : atlet.rank === 2 ? 'text-slate-300' : atlet.rank === 3 ? 'text-amber-500' : 'text-white'}`}>
                #{atlet.rank}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Ranking</div>
            </div>
            <div className="flex-1 bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-300">{atlet.total}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Total Poin</div>
            </div>
            {gapToGold > 0 && (
              <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-red-400">-{gapToGold}</div>
                <div className="text-[10px] text-red-400/70 mt-0.5">Gap to Gold</div>
              </div>
            )}
          </div>
        </div>

        {/* Event Breakdown */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-4">Event Breakdown</div>
          <div className="space-y-4">
            {events.map(ev => {
              const pct     = ev.max > 0 ? (ev.val / ev.max) * 100 : 0
              const r1pct   = ev.max > 0 ? (ev.r1 / ev.max) * 100 : 0
              const diff    = ev.val - ev.r1
              const isBest  = best?.key === ev.key
              const isWorst = worst?.key === ev.key

              return (
                <div key={ev.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-300 font-medium">{ev.label}</span>
                      {isBest  && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">BEST</span>}
                      {isWorst && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">WEAK</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{ev.val > 0 ? ev.val : '—'}</span>
                      {ev.val > 0 && ev.r1 > 0 && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {diff > 0 ? <TrendingUp size={9} /> : diff < 0 ? <TrendingDown size={9} /> : <Minus size={9} />}
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Bar: atlet */}
                  <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full transition-all ${isBest ? 'bg-emerald-400' : isWorst ? 'bg-amber-400' : 'bg-yellow-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  {/* Bar: rank 1 reference (dimmed) */}
                  {ev.r1 > 0 && atlet.rank !== 1 && (
                    <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-slate-500/50"
                        style={{ width: `${r1pct}%` }} />
                      <span className="absolute right-0 -top-0.5 text-[8px] text-slate-600">rank 1</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary */}
          {(best || worst) && (
            <div className="mt-6 space-y-2">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-3">Analisis</div>
              {best && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="text-[10px] text-emerald-400 font-medium">💪 Kekuatan Terbaik</div>
                  <div className="text-sm text-white mt-1">{best.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{best.val} poin ({Math.round((best.val/atlet.total)*100)}% kontribusi)</div>
                </div>
              )}
              {worst && worst.key !== best?.key && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <div className="text-[10px] text-amber-400 font-medium">⚠️ Perlu Ditingkatkan</div>
                  <div className="text-sm text-white mt-1">{worst.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {worst.val > 0 ? `${worst.val} poin · selisih ${worst.r1 - worst.val} dari rank 1` : 'Belum ada data'}
                  </div>
                </div>
              )}
              {gapToGold > 0 && best && (
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 font-medium">📈 Untuk naik ke Rank 1</div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Butuh <span className="text-yellow-400 font-bold">+{gapToGold} poin</span> lagi.
                    Fokus tingkatkan <span className="text-amber-300">{worst?.label}</span>.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function PodiumCard({ atlet, position, onClick }: { atlet: KlasemenRow; position: 1 | 2 | 3; onClick: () => void }) {
  const cfg: Record<number, { emoji: string; color: string; text: string; label: string }> = {
    1: { emoji: '🥇', color: 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5', text: 'text-yellow-400', label: 'EMAS' },
    2: { emoji: '🥈', color: 'border-slate-400/30 bg-gradient-to-br from-slate-400/10 to-slate-400/5',   text: 'text-slate-300',  label: 'PERAK' },
    3: { emoji: '🥉', color: 'border-amber-700/30 bg-gradient-to-br from-amber-700/10 to-amber-700/5',   text: 'text-amber-500',  label: 'PERUNGGU' },
  }
  const c = cfg[position]
  return (
    <div className={position === 1 ? '' : 'pt-8'}>
      <button onClick={onClick} className={`w-full border ${c.color} rounded-2xl p-5 text-center hover:brightness-110 transition-all`}>
        <div className="text-4xl mb-2">{c.emoji}</div>
        <div className={`${c.text} text-[10px] font-bold tracking-wider mb-1`}>{c.label}</div>
        <div className="text-white text-sm font-semibold mb-1">{atlet.nama_lengkap}</div>
        <div className="text-slate-400 text-[11px] mb-3">{atlet.kontingen_nama}</div>
        <div className={`${c.text} text-2xl font-bold`}>{atlet.total}</div>
        <div className="text-slate-500 text-[10px] mt-0.5">poin total · klik detail</div>
      </button>
    </div>
  )
}
