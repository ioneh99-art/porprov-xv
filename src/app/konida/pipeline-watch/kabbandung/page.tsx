'use client'
// src/app/konida/pipeline-watch/kabbandung/page.tsx
// KBAAS Fase 0 — Pipeline Watch: monitoring atlet Jabar (incl. Kab. Bandung) di kejurnas eksternal.

import { useEffect, useMemo, useState } from 'react'
import { Radar, Trophy, Medal, Link2, Users, RefreshCw, AlertCircle } from 'lucide-react'

const ACCENT = '#38bdf8'

interface Row {
  id: number; event_date: string; event_short_name: string; cabor_nama: string
  kategori_umur: string; gender: string; nomor_pertandingan: string; round_type: string
  athlete_name_raw: string; year_of_birth: number; umur_2026: number; team_name: string
  atlet_id: number | null; atlet_db_nama: string | null; atlet_kontingen_id: number | null
  link_confidence: string; rank: number | null; mark: string; medal: string | null
  status: string; pipeline_tag: string
}

const TABS = [
  { key: 'kontingen', label: 'Kab. Bandung', icon: Trophy },
  { key: 'jabar', label: 'Jabar Lainnya', icon: Users },
  { key: 'unlinked', label: 'Belum Linked', icon: Link2 },
  { key: 'all', label: 'Semua', icon: Radar },
]

const medalIcon = (m: string | null) => m === 'EMAS' ? '🥇' : m === 'PERAK' ? '🥈' : m === 'PERUNGGU' ? '🥉' : ''
const confColor = (c: string) => c === 'EXACT' ? '#34d399' : c === 'HIGH' ? '#38bdf8' : c === 'MEDIUM' ? '#fbbf24' : c === 'UNLINKED' ? '#64748b' : '#f87171'

export default function PipelineWatchPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('kontingen')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/konida/pipeline-watch').then(x => x.json())
      if (r.error) setErr(r.error); else setRows(r.rows ?? [])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const count = (k: string) => rows.filter(r =>
    k === 'kontingen' ? r.atlet_kontingen_id === 4 :
    k === 'jabar' ? String(r.pipeline_tag).includes('JABAR') :
    k === 'unlinked' ? !r.atlet_id : true).length

  const filtered = useMemo(() => rows.filter(r =>
    tab === 'kontingen' ? r.atlet_kontingen_id === 4 :
    tab === 'jabar' ? String(r.pipeline_tag).includes('JABAR') :
    tab === 'unlinked' ? !r.atlet_id : true), [rows, tab])

  const medalists = useMemo(() => rows.filter(r => r.atlet_kontingen_id === 4 && r.medal), [rows])

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}><Radar size={20} style={{ color: ACCENT }} /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">PIPELINE WATCH</h1>
            <div className="text-[11px] text-slate-500">Atlet Jabar di kejurnas/kejurda nasional · deteksi calon & prestasi · Kab. Bandung</div>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50" style={{ background: `${ACCENT}15`, color: ACCENT, borderColor: `${ACCENT}40` }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {err && <div className="flex items-center gap-2 text-xs text-red-400 mb-4 rounded-lg p-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}><AlertCircle size={14} />{err}</div>}

      {/* Achievement Highlight — medali Kab. Bandung */}
      {medalists.length > 0 && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(120deg,rgba(251,191,36,0.12),rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.25)' }}>
          <div className="flex items-center gap-2 mb-3"><Medal size={15} style={{ color: '#fbbf24' }} /><h3 className="text-sm font-bold text-white">Prestasi Nasional — Atlet Kab. Bandung</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {medalists.map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-2xl">{medalIcon(r.medal)}</span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{r.atlet_db_nama ?? r.athlete_name_raw}</div>
                  <div className="text-[11px] text-slate-400 truncate">{r.medal} · {r.nomor_pertandingan} {r.kategori_umur} {r.gender} · <span className="font-mono text-slate-300">{r.mark}</span></div>
                  <div className="text-[10px] text-slate-600 truncate">{r.event_short_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: active ? `${ACCENT}1a` : 'rgba(255,255,255,0.02)', color: active ? ACCENT : '#94a3b8', border: `1px solid ${active ? ACCENT + '40' : 'rgba(255,255,255,0.06)'}` }}>
              <t.icon size={13} /> {t.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.3)', color: active ? ACCENT : '#64748b' }}>{count(t.key)}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {loading ? (
          <div className="py-16 text-center text-slate-600 text-sm">Memuat data pipeline…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-600 text-sm">Belum ada data untuk filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="p-3 font-semibold">Tanggal</th>
                  <th className="p-3 font-semibold">Atlet</th>
                  <th className="p-3 font-semibold">Nomor</th>
                  <th className="p-3 font-semibold">Hasil</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Link</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{r.event_date}</td>
                    <td className="p-3">
                      <div className="text-slate-200 font-medium">{r.athlete_name_raw}</div>
                      {r.atlet_db_nama && r.atlet_db_nama !== r.athlete_name_raw && <div className="text-[10px] text-slate-500">DB: {r.atlet_db_nama}</div>}
                      <div className="text-[10px] text-slate-600">{r.team_name} · {r.umur_2026} thn · {r.cabor_nama}</div>
                    </td>
                    <td className="p-3 text-slate-400">{r.nomor_pertandingan}<div className="text-[10px] text-slate-600">{r.kategori_umur} {r.gender}</div></td>
                    <td className="p-3 font-mono text-slate-200">{r.mark}{r.rank ? <span className="text-[10px] text-slate-500 ml-1">#{r.rank}</span> : null}</td>
                    <td className="p-3">
                      {r.medal ? <span className="font-bold text-white">{medalIcon(r.medal)} {r.medal}</span>
                        : r.status === 'Q' || r.status === 'q' ? <span style={{ color: ACCENT }}>Lolos</span>
                        : r.status === 'DNS' || r.status === 'DNF' ? <span className="text-red-400">{r.status}</span>
                        : <span className="text-slate-500">{r.status}</span>}
                    </td>
                    <td className="p-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: confColor(r.link_confidence), background: `${confColor(r.link_confidence)}18` }}>{r.link_confidence || 'UNLINKED'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-600 mt-3">📡 Fase 0 KBAAS · sumber: hasil kejurnas (event_kejurnas_results). Bulk import 164 entri Day-3 menyusul.</div>
    </div>
  )
}
