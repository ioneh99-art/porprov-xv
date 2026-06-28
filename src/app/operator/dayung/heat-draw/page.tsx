'use client'
// src/app/operator/dayung/heat-draw/page.tsx
// Phase 2 — Heat Draw: assign atlet terdaftar (kualifikasi_atlet) ke heat × lane.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Shuffle, Save, Waves } from 'lucide-react'
import { DAYUNG, genderLabel } from '@/lib/sport-plugins/dayung/config'
import { drawHeats, type HeatAssignment } from '@/lib/sport-plugins/dayung/heat-draw'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function DayungHeatDrawPage() {
  const [nomors, setNomors] = useState<any[]>([])
  const [activeNomor, setActiveNomor] = useState<number | null>(null)
  const [peserta, setPeserta] = useState<any[]>([])
  const [lanes, setLanes] = useState(6)
  const [draw, setDraw] = useState<HeatAssignment[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
      const caborId = me?.cabor_id ?? DAYUNG.caborId
      const { data } = await sb.from('nomor_pertandingan').select('id,nama,gender').eq('cabor_id', caborId).order('nama')
      setNomors(data ?? [])
    })()
  }, [])

  useEffect(() => {
    if (!activeNomor) { setPeserta([]); setDraw([]); return }
    (async () => {
      const { data: kual } = await sb.from('kualifikasi_atlet')
        .select('atlet_id,heat_number,lane,status,atlet:atlet_id(id,nama_lengkap,gender)')
        .eq('nomor_id', activeNomor).neq('status', 'Dibatalkan')
      const ids = (kual ?? []).map((k: any) => k.atlet_id)
      // seed proxy = fitness terbaik (atlet_tes_fisik) — fallback ke 50
      const seedMap: Record<number, number> = {}
      if (ids.length) {
        const { data: tf } = await sb.from('atlet_tes_fisik').select('atlet_id,kesimpulan_persen,status_tes,tahap').in('atlet_id', ids).eq('status_tes', 'Hadir')
        for (const t of tf ?? []) if (t.kesimpulan_persen != null) seedMap[t.atlet_id] = Math.max(seedMap[t.atlet_id] ?? 0, t.kesimpulan_persen)
      }
      setPeserta((kual ?? []).map((k: any) => ({
        atlet_id: k.atlet_id, nama: k.atlet?.nama_lengkap ?? '?', gender: k.atlet?.gender,
        heat_number: k.heat_number, lane: k.lane, seed: seedMap[k.atlet_id] ?? 50,
      })))
      setDraw([])
    })()
  }, [activeNomor])

  const generate = () => {
    setDraw(drawHeats(peserta.map(p => ({ atlet_id: p.atlet_id, nama: p.nama, seed_value: p.seed })), lanes))
    setMsg('')
  }

  const save = async () => {
    if (!draw.length) return
    setSaving(true); setMsg('')
    let ok = 0
    for (const d of draw) {
      const { error } = await sb.from('kualifikasi_atlet').update({ heat_number: d.heat_number, lane: d.lane })
        .eq('nomor_id', activeNomor!).eq('atlet_id', d.atlet_id)
      if (!error) ok++
    }
    setSaving(false); setMsg(`Tersimpan: ${ok}/${draw.length} lane assignment.`)
  }

  const heats = useMemo(() => {
    const m: Record<number, HeatAssignment[]> = {}
    for (const d of draw) (m[d.heat_number] ||= []).push(d)
    for (const k in m) m[+k].sort((a, b) => a.lane - b.lane)
    return m
  }, [draw])

  return (
    <div className="text-slate-200">
      <div className="flex items-center gap-2 mb-1"><Shuffle size={18} className="text-sky-400" /><h1 className="text-xl font-black text-white">Heat Draw</h1></div>
      <p className="text-xs text-slate-500 mb-4">Distribusi atlet ke heat × lane (snake seeding · seed = kesiapan fisik · lane tengah untuk seed terbaik)</p>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Nomor Pertandingan</label>
          <select value={activeNomor ?? ''} onChange={e => setActiveNomor(e.target.value ? +e.target.value : null)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 w-72">
            <option value="">— pilih nomor —</option>
            {nomors.map(n => <option key={n.id} value={n.id}>{n.nama} ({genderLabel(n.gender)})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Lane / Heat</label>
          <input type="number" min={2} max={9} value={lanes} onChange={e => setLanes(Math.min(9, Math.max(2, +e.target.value || 6)))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 w-20" />
        </div>
        <button onClick={generate} disabled={!peserta.length}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/40 disabled:opacity-40 hover:bg-sky-500/25">
          <Shuffle size={13} /> Generate Draw
        </button>
        {draw.length > 0 && (
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 disabled:opacity-40 hover:bg-emerald-500/25">
            <Save size={13} /> {saving ? 'Menyimpan…' : 'Simpan Lane'}
          </button>
        )}
      </div>

      {msg && <div className="text-xs text-emerald-400 mb-3">{msg}</div>}

      {!activeNomor ? (
        <div className="py-16 text-center text-slate-600 text-sm">Pilih nomor pertandingan untuk mulai.</div>
      ) : peserta.length === 0 ? (
        <div className="py-16 text-center text-slate-600 text-sm">Belum ada atlet terdaftar di nomor ini. Daftarkan dulu di tab <span className="text-sky-400">Lineup</span>.</div>
      ) : draw.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 p-4">
          <div className="text-xs text-slate-500 mb-2">{peserta.length} atlet terdaftar — klik <b className="text-sky-400">Generate Draw</b>.</div>
          <div className="flex flex-wrap gap-2">
            {peserta.sort((a, b) => b.seed - a.seed).map(p => (
              <span key={p.atlet_id} className="text-[11px] px-2 py-1 rounded-lg bg-slate-800/50 text-slate-300">{p.nama} <span className="text-slate-500">· seed {p.seed}</span></span>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(heats).map(([h, assigns]) => (
            <div key={h} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2 mb-3"><Waves size={14} className="text-sky-400" /><span className="text-sm font-bold text-white">Heat {h}</span><span className="text-[10px] text-slate-500">({assigns.length} atlet)</span></div>
              <div className="space-y-1.5">
                {assigns.map(a => (
                  <div key={a.atlet_id} className="flex items-center gap-3 text-xs bg-slate-800/40 rounded-lg px-3 py-2">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-300 flex items-center justify-center font-bold shrink-0">{a.lane}</span>
                    <span className="text-slate-200 truncate">{a.nama}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
