'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Search, ChevronRight, ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { caborBySlug } from '@/lib/baseline/cabor-map'
import { gapTier, GAP_TIER_COLOR } from '@/lib/baseline/medal-predictor'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CABOR_ACCENT: Record<number, string> = {
  10: '#f97316',
  7:  '#06b6d4',
}

const GAP_MAX_VIS = 20 // gap >20% = bar penuh

function PillGroup({ options, value, onChange, color }: {
  options: string[]; value: string; onChange: (v: string) => void; color: string
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
          style={value === o
            ? { background: `${color}25`, color, border: `1px solid ${color}60` }
            : { background: 'rgba(30,41,59,0.6)', color: '#64748b', border: '1px solid rgba(71,85,105,0.4)' }
          }>
          {o}
        </button>
      ))}
    </div>
  )
}

export default function BaselineRosterPage() {
  const params  = useParams()
  const slug    = String(params.cabor_slug)
  const meta    = caborBySlug(slug)
  const accent  = meta ? (CABOR_ACCENT[meta.id] ?? '#38bdf8') : '#38bdf8'

  const [rows, setRows]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fGender, setFGender] = useState('Semua')
  const [fTarget, setFTarget] = useState('Semua')
  const [fEvent, setFEvent]   = useState('Semua')
  const [q, setQ]             = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!meta) { setLoading(false); return }
    ;(async () => {
      const { data } = await sb
        .from('atlet_baseline_performance')
        .select('id, atlet_id, event_name, gender, waktu_terbaik, target_medali, gap_percentage, is_relay, atlet:atlet_id(id, nama_lengkap, gender, status_verifikasi)')
        .eq('cabor_id', meta.id)
        .order('gap_percentage', { ascending: true, nullsFirst: false })
      setRows(data ?? [])
      setLoading(false)
    })()
  }, [slug])

  const events   = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => r.event_name))).sort()], [rows])
  const filtered = useMemo(() => rows.filter(r => {
    if (fGender !== 'Semua' && r.gender !== (fGender === 'Putra' ? 'L' : 'P')) return false
    if (fTarget !== 'Semua') {
      const t = (r.target_medali || '').toLowerCase()
      if (fTarget === 'Belum' ? (t && t !== '-') : !t.includes(fTarget.toLowerCase())) return false
    }
    if (fEvent !== 'Semua' && r.event_name !== fEvent) return false
    if (q && !(r.atlet?.nama_lengkap || '').toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [rows, fGender, fTarget, fEvent, q])

  if (!meta) return <div className="text-slate-400 p-6">Cabor tidak dikenal: {slug}</div>

  const activeFilters = [fGender !== 'Semua', fTarget !== 'Semua', fEvent !== 'Semua', q !== ''].filter(Boolean).length

  return (
    <div className="text-slate-200">
      {/* Breadcrumb */}
      <div className="text-xs text-slate-500 mb-2">
        <Link href="/konida/cabor-baseline" className="hover:text-slate-300">KAB. BANDUNG / Baseline</Link>
        <span className="text-slate-700"> / </span>
        <span style={{ color: accent }}>{meta.name}</span>
      </div>
      <Link href="/konida/cabor-baseline" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-4">
        <ArrowLeft size={12} /> Kembali
      </Link>

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-2 h-6 rounded-full" style={{ background: accent }} />
            <h1 className="text-2xl font-black text-white">{meta.name}</h1>
          </div>
          <p className="text-xs text-slate-500 ml-4">
            {loading ? '…' : `${rows.length} event baseline · ${new Set(rows.map(r => r.atlet_id)).size} atlet · baseline 2022`}
          </p>
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
          style={showFilters || activeFilters > 0
            ? { background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }
            : { background: 'rgba(30,41,59,0.6)', color: '#94a3b8', border: '1px solid rgba(71,85,105,0.4)' }}>
          <SlidersHorizontal size={13} />
          Filter
          {activeFilters > 0 && (
            <span className="w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center"
              style={{ background: accent, color: '#000' }}>{activeFilters}</span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Gender</div>
              <PillGroup options={['Semua','Putra','Putri']} value={fGender} onChange={setFGender} color={accent} />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Target Medali</div>
              <PillGroup options={['Semua','Emas','Perak','Perunggu','Belum']} value={fTarget} onChange={setFTarget} color={accent} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Event</div>
              <select value={fEvent} onChange={e => setFEvent(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500">
                {events.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atlet…"
                className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500 w-48" />
            </div>
            {activeFilters > 0 && (
              <button onClick={() => { setFGender('Semua'); setFTarget('Semua'); setFEvent('Semua'); setQ('') }}
                className="text-[11px] text-slate-500 hover:text-red-400 transition-colors">
                Reset semua
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result count */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-600">{filtered.length} hasil</span>
        {/* Gap legend */}
        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
          {[['elite','≤3% elite'],['strong','3-7% kuat'],['moderate','7-12% sedang'],['far','>12% jauh']].map(([t,l]) => (
            <div key={t} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: GAP_TIER_COLOR[t as keyof typeof GAP_TIER_COLOR] }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-600 text-sm">Memuat roster…</div>
      ) : (
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <div className="col-span-4">Atlet</div>
            <div className="col-span-3">Event</div>
            <div className="col-span-2 text-center">Waktu Terbaik</div>
            <div className="col-span-2">Gap vs Rekor</div>
            <div className="col-span-1 text-center">Target</div>
          </div>

          <div className="divide-y divide-slate-800/70">
            {filtered.map(r => {
              const tier  = gapTier(r.gap_percentage)
              const color = GAP_TIER_COLOR[tier]
              const gap   = r.gap_percentage !== null && r.gap_percentage !== undefined ? Math.abs(r.gap_percentage) : null
              const barW  = gap !== null ? Math.min(gap / GAP_MAX_VIS * 100, 100) : 0
              return (
                <Link key={r.id} href={`/konida/cabor-baseline/${slug}/${r.atlet_id}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-900/60 transition-colors group"
                  style={{ borderLeft: `2px solid transparent` }}
                  onMouseEnter={e => (e.currentTarget.style.borderLeftColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'transparent')}>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <ChevronRight size={13} className="text-slate-700 group-hover:text-slate-300 shrink-0 transition-colors" />
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate font-medium">{r.atlet?.nama_lengkap ?? '—'}</div>
                      <div className="text-[10px] text-slate-600">
                        {r.gender === 'L' ? 'Putra' : r.gender === 'P' ? 'Putri' : r.gender}
                        {r.is_relay ? ' · Relay' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 text-xs text-slate-400 truncate">{r.event_name}</div>

                  <div className="col-span-2 text-center text-xs font-mono text-slate-300">
                    {r.waktu_terbaik || '—'}
                  </div>

                  {/* Gap bar */}
                  <div className="col-span-2">
                    {gap !== null ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold tabular-nums" style={{ color }}>{r.gap_percentage}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: color, opacity: 0.7 }} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600">—</span>
                    )}
                  </div>

                  <div className="col-span-1 text-center">
                    {r.target_medali && r.target_medali !== '-' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${accent}1a`, color: accent, border: `1px solid ${accent}30` }}>
                        {r.target_medali.replace('Berpeluang ', '')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-700">—</span>
                    )}
                  </div>
                </Link>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-600 text-sm">Tidak ada atlet sesuai filter.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
