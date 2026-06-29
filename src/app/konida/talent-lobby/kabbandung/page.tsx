'use client'
// src/app/konida/talent-lobby/kabbandung/page.tsx
// KBAAS Fase 3.11 — Talent Lobby (SENSITIF). Kandidat Jabar berprestasi nasional, belum ter-link.

import { useEffect, useState } from 'react'
import { Crosshair, AlertTriangle, Flag, Check, RefreshCw, X } from 'lucide-react'

const ACCENT = '#38bdf8'
const medalIcon = (m: string | null) => m === 'EMAS' ? '🥇' : m === 'PERAK' ? '🥈' : m === 'PERUNGGU' ? '🥉' : ''

export default function TalentLobbyPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<any | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/konida/talent-lobby').then(x => x.json()).catch(() => ({}))
    setRows(r.candidates ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const flag = async () => {
    if (!sel || !reason.trim()) return
    setSaving(true)
    await fetch('/api/konida/talent-lobby', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id: sel.event_id, reason }) })
    setSaving(false); setSel(null); setReason(''); load()
  }

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}><Crosshair size={20} style={{ color: ACCENT }} /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">TALENT LOBBY</h1>
            <div className="text-[11px] text-slate-500">Atlet Jabar berprestasi nasional, belum tergabung kontingen · scouting</div>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50" style={{ background: `${ACCENT}15`, color: ACCENT, borderColor: `${ACCENT}40` }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Sensitive warning */}
      <div className="rounded-2xl p-4 mb-5 flex items-start gap-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
        <AlertTriangle size={18} style={{ color: '#fbbf24' }} className="mt-0.5 shrink-0" />
        <div className="text-[11px] text-amber-200/90 leading-relaxed">
          <b className="text-amber-300">Fitur Sensitif.</b> Identifikasi atlet Jawa Barat (di luar Kab. Bandung) berprestasi nasional sebagai kandidat scouting.
          Semua aksi <b>di-log untuk audit</b>. Keputusan & pendekatan tetap kewenangan KONI/PASI Kab. Bandung dan menghormati regulasi perpindahan atlet.
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {loading ? <div className="py-16 text-center text-slate-600 text-sm">Memuat kandidat…</div>
          : rows.length === 0 ? <div className="py-16 text-center text-slate-600 text-sm">Tidak ada kandidat eligible saat ini.</div>
          : (
            <div className="divide-y divide-white/5">
              {rows.map(c => (
                <div key={c.event_id} className="p-4 flex items-start justify-between gap-4 hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100">{c.candidate_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{c.umur_2026} thn</span>
                      {c.medal && <span className="text-[11px]">{medalIcon(c.medal)} {c.medal}</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{c.cabor_nama} · {c.nomor_pertandingan} {c.kategori_umur} · <span className="font-mono text-slate-400">{c.mark}</span></div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{c.candidate_team} · {c.event_name}</div>
                  </div>
                  {c.flagged_for_recruitment
                    ? <span className="text-[11px] font-bold px-3 py-1 rounded-lg shrink-0" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>🚩 Flagged</span>
                    : <button onClick={() => setSel(c)} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg shrink-0" style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}40` }}><Flag size={12} /> Flag</button>}
                </div>
              ))}
            </div>
          )}
      </div>

      {sel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-5 max-w-md w-full" style={{ background: '#0a1524', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-bold text-white">Flag Kandidat Scouting</h3><button onClick={() => setSel(null)}><X size={16} className="text-slate-500" /></button></div>
            <p className="text-[11px] text-slate-400 mb-3"><b className="text-slate-200">{sel.candidate_name}</b> ({sel.umur_2026} thn) · {sel.cabor_nama} · {sel.medal} {sel.mark}</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan flag (wajib) — mis. potensi tinggi PORPROV XV, perlu koordinasi PASI Jabar" className="w-full rounded-lg p-2.5 text-[12px] text-slate-200 h-24" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div className="flex gap-2 mt-3">
              <button onClick={flag} disabled={!reason.trim() || saving} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold disabled:opacity-50" style={{ background: `${ACCENT}20`, color: ACCENT, border: `1px solid ${ACCENT}40` }}><Check size={13} /> {saving ? 'Menyimpan…' : 'Konfirmasi Flag'}</button>
              <button onClick={() => setSel(null)} className="px-4 py-2 rounded-lg text-xs border border-slate-700 text-slate-400">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
