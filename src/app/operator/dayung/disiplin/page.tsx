'use client'
// src/app/operator/dayung/disiplin/page.tsx
// Phase 1 — Daftar disiplin Dayung (Canoe/Kayak/Rowing/TBR × gender) + jumlah nomor.

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ClipboardList } from 'lucide-react'
import { DAYUNG, genderLabel } from '@/lib/sport-plugins/dayung/config'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function DayungDisiplinPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
      const caborId = me?.cabor_id ?? DAYUNG.caborId
      const [{ data: disiplin }, { data: nomor }] = await Promise.all([
        sb.from('disiplin').select('id,nama,gender,kategori').eq('cabor_id', caborId).order('nama').order('gender'),
        sb.from('nomor_pertandingan').select('disiplin_id').eq('cabor_id', caborId),
      ])
      const cnt: Record<number, number> = {}
      for (const n of nomor ?? []) if (n.disiplin_id) cnt[n.disiplin_id] = (cnt[n.disiplin_id] || 0) + 1
      setRows((disiplin ?? []).map(d => ({ ...d, jumlah_nomor: cnt[d.id] ?? 0 })))
      setLoading(false)
    })()
  }, [])

  // group by nama disiplin
  const grouped = rows.reduce((a: Record<string, any[]>, r) => { (a[r.nama] ||= []).push(r); return a }, {})

  return (
    <div className="text-slate-200">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList size={18} className="text-sky-400" />
        <h1 className="text-xl font-black text-white">Disiplin Dayung</h1>
      </div>
      <p className="text-xs text-slate-500 mb-5">4 disiplin × kelas gender · total {rows.length} kategori, {rows.reduce((s, r) => s + r.jumlah_nomor, 0)} nomor pertandingan</p>

      {loading ? <div className="py-20 text-center text-slate-600 text-sm">Memuat…</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(grouped).map(([nama, items]) => (
            <div key={nama} className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold text-white">{nama}</div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {items.reduce((s, i) => s + i.jumlah_nomor, 0)} nomor
                </span>
              </div>
              <div className="space-y-2">
                {items.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-xs bg-slate-800/40 rounded-lg px-3 py-2">
                    <span className="text-slate-300">{genderLabel(d.gender)} · {d.kategori}</span>
                    <span className="text-slate-500">{d.jumlah_nomor} nomor</span>
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
