'use client'
// src/app/operator/dayung/nomor/page.tsx
// Phase 1 — Daftar nomor pertandingan Dayung, grouped per disiplin + filter.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ListChecks, Search } from 'lucide-react'
import { DAYUNG, genderLabel } from '@/lib/sport-plugins/dayung/config'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const statusColor = (s: string | null) =>
  s === 'Active' || s === 'Aktif' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  : s === 'Closed' ? 'text-slate-400 bg-slate-500/10 border-slate-500/20'
  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'

export default function DayungNomorPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [gender, setGender] = useState<'all' | 'L' | 'P' | 'MIX'>('all')
  const [disc, setDisc] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
      const caborId = me?.cabor_id ?? DAYUNG.caborId
      const { data } = await sb.from('nomor_pertandingan')
        .select('id,nama,gender,status,tipe_skor,satuan,disiplin:disiplin_id(nama)')
        .eq('cabor_id', caborId).order('nama')
      setRows(data ?? [])
      setLoading(false)
    })()
  }, [])

  const disciplines = useMemo(() => ['all', ...Array.from(new Set(rows.map(r => r.disiplin?.nama).filter(Boolean)))], [rows])
  const filtered = useMemo(() => rows.filter(r => {
    if (gender !== 'all' && r.gender !== gender) return false
    if (disc !== 'all' && r.disiplin?.nama !== disc) return false
    if (q && !r.nama.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [rows, gender, disc, q])

  const grouped = filtered.reduce((a: Record<string, any[]>, r) => {
    const k = r.disiplin?.nama ?? 'Lainnya'; (a[k] ||= []).push(r); return a
  }, {})

  const Chip = ({ active, onClick, children }: any) => (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? 'bg-sky-500/15 text-sky-300 border-sky-500/40' : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200'}`}>{children}</button>
  )

  return (
    <div className="text-slate-200">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks size={18} className="text-sky-400" />
        <h1 className="text-xl font-black text-white">Nomor Pertandingan</h1>
      </div>
      <p className="text-xs text-slate-500 mb-4">{rows.length} nomor · time-based scoring (mm:ss.SSS)</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Chip active={gender === 'all'} onClick={() => setGender('all')}>Semua</Chip>
        <Chip active={gender === 'L'} onClick={() => setGender('L')}>Putra</Chip>
        <Chip active={gender === 'P'} onClick={() => setGender('P')}>Putri</Chip>
        <Chip active={gender === 'MIX'} onClick={() => setGender('MIX')}>Mixed</Chip>
        <select value={disc} onChange={e => setDisc(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200">
          {disciplines.map(d => <option key={d} value={d}>{d === 'all' ? 'Semua disiplin' : d}</option>)}
        </select>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nomor…" className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 w-48" />
        </div>
      </div>

      {loading ? <div className="py-20 text-center text-slate-600 text-sm">Memuat…</div> : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([d, items]) => (
            <div key={d}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sky-400 text-xs font-bold uppercase tracking-widest">{d}</span>
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] text-slate-600">{items.length} nomor</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map(n => (
                  <div key={n.id} className="rounded-xl p-3 bg-slate-900/70 border border-slate-800">
                    <div className="text-sm text-white font-medium leading-tight">{n.nama}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-slate-500">{genderLabel(n.gender)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(n.status)}`}>{n.status ?? 'Draft'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="py-12 text-center text-slate-600 text-sm">Tidak ada nomor sesuai filter.</div>}
        </div>
      )}
    </div>
  )
}
