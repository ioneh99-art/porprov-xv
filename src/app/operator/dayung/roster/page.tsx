'use client'
// src/app/operator/dayung/roster/page.tsx
// Phase 1 — Roster atlet Dayung: filter, search, detail drawer, export CSV.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Users, Search, Download, X, Activity, ShieldCheck, Cake } from 'lucide-react'
import { DAYUNG, fitnessTier, genderLabel, umurDari } from '@/lib/sport-plugins/dayung/config'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Row {
  id: number; nama_lengkap: string; gender: string | null; tgl_lahir: string | null
  no_ktp: string | null; nomor_peserta: string | null
  status_registrasi: string | null; status_verifikasi: string | null; foto_url: string | null
  fitnes: number | null; fitnes_kat: string | null
}

export default function DayungRosterPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [gender, setGender] = useState<'all' | 'L' | 'P'>('all')
  const [fitFilter, setFitFilter] = useState<'all' | 'tes' | 'belum'>('all')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Row | null>(null)

  useEffect(() => {
    (async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
      const caborId = me?.cabor_id ?? DAYUNG.caborId
      const kontingenId = me?.kontingen_id ?? DAYUNG.kontingenId

      const { data: atlet } = await sb.from('atlet')
        .select('id,nama_lengkap,gender,tgl_lahir,no_ktp,nomor_peserta,status_registrasi,status_verifikasi,foto_url')
        .eq('cabor_id', caborId).eq('kontingen_id', kontingenId).order('nama_lengkap')

      const ids = (atlet ?? []).map(a => a.id)
      // fitness: ambil kesimpulan_persen tahap tertinggi (status Hadir) per atlet
      const fitMap: Record<number, { persen: number; kat: string }> = {}
      for (let i = 0; i < ids.length; i += 200) {
        const { data: tf } = await sb.from('atlet_tes_fisik')
          .select('atlet_id,tahap,kesimpulan_persen,kesimpulan_kategori,status_tes')
          .in('atlet_id', ids.slice(i, i + 200)).eq('status_tes', 'Hadir')
        for (const t of tf ?? []) {
          if (t.kesimpulan_persen == null) continue
          const cur = fitMap[t.atlet_id]
          if (!cur || (t.tahap ?? 0) >= (cur as any).tahap) fitMap[t.atlet_id] = { persen: t.kesimpulan_persen, kat: t.kesimpulan_kategori, ...{ tahap: t.tahap } } as any
        }
      }
      setRows((atlet ?? []).map(a => ({
        ...a,
        fitnes: fitMap[a.id]?.persen ?? null,
        fitnes_kat: fitMap[a.id]?.kat ?? null,
      })))
      setLoading(false)
    })()
  }, [])

  const stats = useMemo(() => ({
    total: rows.length,
    putra: rows.filter(r => r.gender === 'L').length,
    putri: rows.filter(r => r.gender === 'P').length,
    tes: rows.filter(r => r.fitnes != null).length,
  }), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    if (gender !== 'all' && r.gender !== gender) return false
    if (fitFilter === 'tes' && r.fitnes == null) return false
    if (fitFilter === 'belum' && r.fitnes != null) return false
    if (q) {
      const s = q.toLowerCase()
      if (!(`${r.nama_lengkap} ${r.no_ktp ?? ''} ${r.nomor_peserta ?? ''}`.toLowerCase().includes(s))) return false
    }
    return true
  }), [rows, gender, fitFilter, q])

  const exportCsv = () => {
    const head = ['Nama', 'Gender', 'Umur', 'No KTP', 'Nomor Peserta', 'Status', 'Fitness %', 'Kategori']
    const lines = filtered.map(r => [
      r.nama_lengkap, genderLabel(r.gender), umurDari(r.tgl_lahir) ?? '', r.no_ktp ?? '',
      r.nomor_peserta ?? '', r.status_registrasi ?? '', r.fitnes ?? '', r.fitnes_kat ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `roster-dayung-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const Chip = ({ active, onClick, children }: any) => (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${active
        ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
        : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200'}`}>
      {children}
    </button>
  )

  return (
    <div className="text-slate-200">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: 'Total Atlet', v: stats.total, icon: Users, c: '#0ea5e9' },
          { l: 'Putra', v: stats.putra, icon: Users, c: '#38bdf8' },
          { l: 'Putri', v: stats.putri, icon: Users, c: '#f472b6' },
          { l: 'Sudah Tes Fisik', v: stats.tes, icon: Activity, c: '#34d399' },
        ].map(k => (
          <div key={k.l} className="rounded-2xl p-4 bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-2 mb-1.5"><k.icon size={13} style={{ color: k.c }} /><span className="text-[10px] uppercase tracking-wider text-slate-500">{k.l}</span></div>
            <div className="text-2xl font-black text-white">{loading ? '—' : k.v}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Chip active={gender === 'all'} onClick={() => setGender('all')}>Semua</Chip>
        <Chip active={gender === 'L'} onClick={() => setGender('L')}>Putra</Chip>
        <Chip active={gender === 'P'} onClick={() => setGender('P')}>Putri</Chip>
        <span className="w-px h-5 bg-slate-700 mx-1" />
        <Chip active={fitFilter === 'tes'} onClick={() => setFitFilter(fitFilter === 'tes' ? 'all' : 'tes')}>Sudah Tes</Chip>
        <Chip active={fitFilter === 'belum'} onClick={() => setFitFilter(fitFilter === 'belum' ? 'all' : 'belum')}>Belum Tes</Chip>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / KTP / no peserta…"
            className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 w-56" />
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/40 hover:bg-sky-500/25">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-600 text-sm">Memuat roster…</div>
      ) : (
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <div className="col-span-5">Nama</div>
            <div className="col-span-2 text-center">Gender</div>
            <div className="col-span-1 text-center">Umur</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-center">Fitness</div>
          </div>
          <div className="divide-y divide-slate-800/70 max-h-[64vh] overflow-y-auto">
            {filtered.map(r => {
              const ft = fitnessTier(r.fitnes)
              return (
                <button key={r.id} onClick={() => setSel(r)}
                  className="w-full grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-900/60 transition-colors text-left">
                  <div className="col-span-5 min-w-0">
                    <div className="text-sm text-white truncate">{r.nama_lengkap}</div>
                    <div className="text-[10px] text-slate-600">{r.nomor_peserta || r.no_ktp || '—'}</div>
                  </div>
                  <div className="col-span-2 text-center text-xs text-slate-400">{genderLabel(r.gender)}</div>
                  <div className="col-span-1 text-center text-xs text-slate-400">{umurDari(r.tgl_lahir) ?? '—'}</div>
                  <div className="col-span-2 text-center"><span className="text-[10px] text-slate-400">{r.status_registrasi ?? '—'}</span></div>
                  <div className="col-span-2 text-center">
                    <span className="text-[10px] px-2 py-1 rounded-full font-semibold" style={{ color: ft.color, background: ft.bg }}>
                      {r.fitnes != null ? `${r.fitnes}% · ${ft.label}` : ft.label}
                    </span>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && <div className="py-12 text-center text-slate-600 text-sm">Tidak ada atlet sesuai filter.</div>}
          </div>
        </div>
      )}
      <div className="text-[11px] text-slate-600 mt-2">{filtered.length} dari {rows.length} atlet</div>

      {/* Detail drawer */}
      {sel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-end" onClick={() => setSel(null)}>
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-lg font-black text-sky-300">
                  {sel.nama_lengkap.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-bold">{sel.nama_lengkap}</div>
                  <div className="text-[11px] text-slate-500">{genderLabel(sel.gender)} · {umurDari(sel.tgl_lahir) ?? '?'} thn</div>
                </div>
              </div>
              <button onClick={() => setSel(null)} className="p-2 text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['No. KTP', sel.no_ktp], ['Nomor Peserta', sel.nomor_peserta],
                ['Status Registrasi', sel.status_registrasi], ['Status Verifikasi', sel.status_verifikasi],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between gap-3 border-b border-slate-800/60 pb-2">
                  <span className="text-slate-500 text-xs">{l}</span>
                  <span className="text-slate-200 text-xs text-right">{(v as string) || '—'}</span>
                </div>
              ))}
              <div className="rounded-xl p-3 mt-2" style={{ background: fitnessTier(sel.fitnes).bg }}>
                <div className="flex items-center gap-2 mb-1"><Activity size={13} style={{ color: fitnessTier(sel.fitnes).color }} /><span className="text-xs font-semibold" style={{ color: fitnessTier(sel.fitnes).color }}>Kesiapan Fisik</span></div>
                <div className="text-2xl font-black text-white">{sel.fitnes != null ? `${sel.fitnes}%` : 'Belum tes'}</div>
                <div className="text-[11px] text-slate-400">{sel.fitnes_kat ?? fitnessTier(sel.fitnes).label}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
