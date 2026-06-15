'use client'
// src/app/konida/cabor-baseline/[cabor_slug]/page.tsx
// PAGE B — Roster atlet per cabor + filter & gap analysis

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Search, ChevronRight, ArrowLeft } from 'lucide-react'
import { caborBySlug, ACCENT } from '@/lib/baseline/cabor-map'
import { gapTier, GAP_TIER_COLOR } from '@/lib/baseline/medal-predictor'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function BaselineRosterPage() {
  const params = useParams()
  const slug = String(params.cabor_slug)
  const meta = caborBySlug(slug)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fGender, setFGender] = useState('Semua')
  const [fTarget, setFTarget] = useState('Semua')
  const [fEvent, setFEvent] = useState('Semua')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!meta) { setLoading(false); return }
    (async () => {
      const { data } = await sb
        .from('atlet_baseline_performance')
        .select('id, atlet_id, event_name, gender, waktu_terbaik, target_medali, gap_percentage, is_relay, atlet:atlet_id(id, nama_lengkap, gender, status_verifikasi)')
        .eq('cabor_id', meta.id)
        .order('gap_percentage', { ascending: true, nullsFirst: false })
      setRows(data ?? [])
      setLoading(false)
    })()
  }, [slug])

  const events = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => r.event_name))).sort()], [rows])
  const filtered = useMemo(() => rows.filter(r => {
    if (fGender !== 'Semua' && r.gender !== (fGender === 'Putra' ? 'L' : fGender === 'Putri' ? 'P' : r.gender)) return false
    if (fTarget !== 'Semua') {
      const t = (r.target_medali || '').toLowerCase()
      if (fTarget === 'Belum' ? (t && t !== '-') : !t.includes(fTarget.toLowerCase())) return false
    }
    if (fEvent !== 'Semua' && r.event_name !== fEvent) return false
    if (q && !(r.atlet?.nama_lengkap || '').toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [rows, fGender, fTarget, fEvent, q])

  if (!meta) return <div className="text-slate-400 p-6">Cabor tidak dikenal: {slug}</div>

  const Sel = ({ value, onChange, options }: any) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-500">
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  return (
    <div className="text-slate-200">
      <div className="text-xs text-slate-500 mb-2">
        <Link href="/konida/cabor-baseline" className="hover:text-slate-300">KAB. BANDUNG / Baseline</Link>
        <span className="text-slate-700"> / </span><span style={{ color: ACCENT }}>{meta.name}</span>
      </div>

      <Link href="/konida/cabor-baseline" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3"><ArrowLeft size={12} /> Kembali</Link>

      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">{meta.name}</h1>
          <p className="text-xs text-slate-500">{rows.length} event baseline · {new Set(rows.map(r => r.atlet_id)).size} atlet · baseline 2022</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Sel value={fGender} onChange={setFGender} options={['Semua', 'Putra', 'Putri']} />
        <Sel value={fEvent} onChange={setFEvent} options={events} />
        <Sel value={fTarget} onChange={setFTarget} options={['Semua', 'Emas', 'Perak', 'Perunggu', 'Belum']} />
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atlet…"
            className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-500 w-48" />
        </div>
        <span className="text-[11px] text-slate-600 ml-auto">{filtered.length} hasil</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-600 text-sm">Memuat roster…</div>
      ) : (
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <div className="col-span-4">Atlet</div>
            <div className="col-span-3">Event</div>
            <div className="col-span-2 text-center">Waktu Terbaik</div>
            <div className="col-span-1 text-center">Gap</div>
            <div className="col-span-2 text-center">Target</div>
          </div>
          <div className="divide-y divide-slate-800/70">
            {filtered.map(r => {
              const tier = gapTier(r.gap_percentage)
              const color = GAP_TIER_COLOR[tier]
              return (
                <Link key={r.id} href={`/konida/cabor-baseline/${slug}/${r.atlet_id}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-900/60 transition-colors">
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <ChevronRight size={13} className="text-slate-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{r.atlet?.nama_lengkap ?? '—'}</div>
                      <div className="text-[10px] text-slate-600">{r.gender === 'L' ? 'Putra' : r.gender === 'P' ? 'Putri' : r.gender}{r.is_relay ? ' · Relay' : ''}</div>
                    </div>
                  </div>
                  <div className="col-span-3 text-xs text-slate-400 truncate">{r.event_name}</div>
                  <div className="col-span-2 text-center text-xs font-mono text-slate-300">{r.waktu_terbaik || '—'}</div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>
                      {r.gap_percentage !== null && r.gap_percentage !== undefined ? `${r.gap_percentage}%` : '—'}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    {r.target_medali && r.target_medali !== '-'
                      ? <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: `${ACCENT}1a`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>{r.target_medali}</span>
                      : <span className="text-[10px] text-slate-600">—</span>}
                  </div>
                </Link>
              )
            })}
            {filtered.length === 0 && <div className="py-12 text-center text-slate-600 text-sm">Tidak ada atlet sesuai filter.</div>}
          </div>
        </div>
      )}

      {/* Legend gap */}
      <div className="flex flex-wrap gap-3 mt-4 text-[10px] text-slate-500">
        {[['elite', '≤3% (elite)'], ['strong', '3-7% (kuat)'], ['moderate', '7-12% (sedang)'], ['far', '>12% (jauh)']].map(([t, l]) => (
          <div key={t} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GAP_TIER_COLOR[t as keyof typeof GAP_TIER_COLOR] }} />{l}</div>
        ))}
      </div>
    </div>
  )
}
