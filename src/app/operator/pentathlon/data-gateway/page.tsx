'use client'
// src/app/operator/pentathlon/data-gateway/page.tsx
// Data Gateway Operator Pentathlon — CRUD Prestasi + Export + Stats, amber accent

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Database, Download, Plus, Trash2, Edit3, CheckCircle,
  AlertTriangle, RefreshCw, ArrowLeft, Loader2, X,
  Trophy, Users, BarChart2, FileSpreadsheet, Save,
  Activity, Medal, Calendar,
} from 'lucide-react'
import Link from 'next/link'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ACCENT = '#f59e0b'

type Tab = 'prestasi' | 'export' | 'stats'

interface AtletRow { id: number; nama_lengkap: string; gender: string }
interface PrestasRow {
  id: number; atlet_id: number; event: string; tahun: number; lokasi: string
  nomor_tanding: string; hasil: string; catatan: string; level_event: string; is_demo: boolean
}

const HASIL_OPTIONS = ['Emas', 'Perak', 'Perunggu', 'Juara 4', 'Peserta']
const LEVEL_OPTIONS = ['Internasional', 'Nasional', 'Provinsi', 'Kabupaten', 'Lokal']

function Bar({ value, max, color, h = 5 }: { value: number; max: number; color: string; h?: number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height: h, background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${max > 0 ? Math.min(value / max * 100, 100) : 0}%`, background: color }} />
    </div>
  )
}

// ── Form Add Prestasi ─────────────────────────────────────
function AddPrestasiForm({ atlets, onSave, onCancel }: { atlets: AtletRow[]; onSave: (d: any) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({ atlet_id: '', event: '', tahun: String(new Date().getFullYear()), lokasi: '', nomor_tanding: '', hasil: 'Emas', catatan: '', level_event: 'Provinsi' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const upd = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.atlet_id) { setErr('Pilih atlet dulu'); return }
    if (!form.event.trim()) { setErr('Isi nama event'); return }
    setSaving(true); setErr('')
    try {
      await onSave({ ...form, atlet_id: parseInt(form.atlet_id), tahun: parseInt(form.tahun) })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}20` }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus size={14} style={{ color: ACCENT }} /> Input Prestasi Baru
        </h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-800 text-zinc-500 hover:text-white transition">
          <X size={14} />
        </button>
      </div>

      {err && <div className="text-xs text-red-400 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">{err}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Atlet *</label>
          <select value={form.atlet_id} onChange={e => upd('atlet_id', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
            <option value="">-- Pilih Atlet --</option>
            {atlets.map(a => <option key={a.id} value={a.id}>{a.nama_lengkap} ({a.gender === 'L' ? 'Putra' : 'Putri'})</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Nama Event *</label>
          <input value={form.event} onChange={e => upd('event', e.target.value)} placeholder="cth: PORPROV XV Jabar 2026"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Hasil *</label>
          <select value={form.hasil} onChange={e => upd('hasil', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
            {HASIL_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Level Event</label>
          <select value={form.level_event} onChange={e => upd('level_event', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
            {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Tahun</label>
          <input type="number" value={form.tahun} onChange={e => upd('tahun', e.target.value)} min={2000} max={2030}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Lokasi</label>
          <input value={form.lokasi} onChange={e => upd('lokasi', e.target.value)} placeholder="cth: Bandung"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Nomor Tanding</label>
          <input value={form.nomor_tanding} onChange={e => upd('nomor_tanding', e.target.value)} placeholder="cth: Perorangan Putra"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Catatan</label>
          <input value={form.catatan} onChange={e => upd('catatan', e.target.value)} placeholder="Opsional"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-slate-800 transition">
          Batal
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition"
          style={{ background: ACCENT, color: '#111' }}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function PageDataGateway() {
  const [tab,         setTab]         = useState<Tab>('prestasi')
  const [atlets,      setAtlets]      = useState<AtletRow[]>([])
  const [prestasis,   setPrestasis]   = useState<PrestasRow[]>([])
  const [caborNama,   setCaborNama]   = useState('Modern Pentathlon')
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [deleting,    setDeleting]    = useState<number | null>(null)
  const [msg,         setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [animIn,      setAnimIn]      = useState(false)
  const [filterAtlet, setFilterAtlet] = useState('all')

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  useEffect(() => {
    async function load() {
      try {
        const me = await fetch('/api/auth/me').then(r => r.json())
        const caborId = me.cabor_id
        if (me.cabor_nama) setCaborNama(me.cabor_nama)

        const atletRes = await sb
          .from('atlet')
          .select('id, nama_lengkap, gender')
          .eq('cabor_id', caborId)
          .order('nama_lengkap', { ascending: true })
        setAtlets((atletRes.data ?? []) as AtletRow[])

        const res = await fetch('/api/operator/prestasi')
        const json = await res.json()
        setPrestasis(json.data ?? [])
      } catch (e) {
        console.error('[DataGateway]', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function handleSavePrestasi(data: any) {
    const res = await fetch('/api/operator/prestasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error || 'Gagal menyimpan')
    setPrestasis(prev => [json.data, ...prev])
    setShowForm(false)
    setMsg({ type: 'ok', text: 'Prestasi berhasil ditambahkan' })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus data prestasi ini?')) return
    setDeleting(id)
    try {
      const res = await fetch('/api/operator/prestasi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error)
      setPrestasis(prev => prev.filter(p => p.id !== id))
      setMsg({ type: 'ok', text: 'Data berhasil dihapus' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setDeleting(null)
    }
  }

  async function exportExcel() {
    try {
      const XLSX = await import('xlsx')
      const atletMap = new Map(atlets.map(a => [a.id, a]))
      const rows = prestasis.map(p => ({
        'Nama Atlet':    atletMap.get(p.atlet_id)?.nama_lengkap ?? `ID:${p.atlet_id}`,
        'Gender':        atletMap.get(p.atlet_id)?.gender === 'L' ? 'Putra' : 'Putri',
        'Event':         p.event,
        'Tahun':         p.tahun,
        'Lokasi':        p.lokasi,
        'Nomor Tanding': p.nomor_tanding,
        'Hasil':         p.hasil,
        'Level Event':   p.level_event,
        'Catatan':       p.catatan,
        'Status Data':   p.is_demo ? 'Demo' : 'Real',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 20 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Prestasi')

      const atletRows = atlets.map(a => ({ 'ID': a.id, 'Nama Lengkap': a.nama_lengkap, 'Gender': a.gender === 'L' ? 'Putra' : 'Putri' }))
      const wsA = XLSX.utils.json_to_sheet(atletRows)
      XLSX.utils.book_append_sheet(wb, wsA, 'Data Atlet')

      XLSX.writeFile(wb, `DataGateway_Pentathlon_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e: any) {
      setMsg({ type: 'err', text: 'Gagal export: ' + e.message })
    }
  }

  const atletMap = useMemo(() => new Map(atlets.map(a => [a.id, a])), [atlets])

  const filteredPrestasi = useMemo(() => {
    if (filterAtlet === 'all') return prestasis
    return prestasis.filter(p => String(p.atlet_id) === filterAtlet)
  }, [prestasis, filterAtlet])

  const stats = useMemo(() => {
    const totalEmas     = prestasis.filter(p => p.hasil === 'Emas').length
    const totalPerak    = prestasis.filter(p => p.hasil === 'Perak').length
    const totalPerunggu = prestasis.filter(p => p.hasil === 'Perunggu').length
    const atletDenganPrestasi = new Set(prestasis.map(p => p.atlet_id)).size
    const byLevel: Record<string, number> = {}
    prestasis.forEach(p => { byLevel[p.level_event] = (byLevel[p.level_event] || 0) + 1 })
    const recentYears = Array.from(new Set(prestasis.map(p => p.tahun))).sort((a, b) => b - a).slice(0, 5)
    const byYear: Record<number, number> = {}
    prestasis.forEach(p => { byYear[p.tahun] = (byYear[p.tahun] || 0) + 1 })
    return { totalEmas, totalPerak, totalPerunggu, atletDenganPrestasi, byLevel, byYear, recentYears }
  }, [prestasis])

  const HASIL_COLOR: Record<string, string> = {
    'Emas': '#ffd700', 'Perak': '#c0c0c0', 'Perunggu': '#cd7f32',
    'Juara 4': '#6b7280', 'Peserta': '#374151',
  }

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020a14' }}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: ACCENT }} />
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>Memuat Data Gateway...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col"
      style={{ background: 'linear-gradient(135deg,#020a14 0%,#020c18 100%)' }}>
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`, backgroundSize: '24px 24px', zIndex: 0 }} />

      {/* HEADER */}
      <div className="sticky top-0 z-40 border-b backdrop-blur-xl px-6 py-4"
        style={{ background: 'rgba(2,10,20,0.95)', borderColor: `${ACCENT}12` }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/operator/pentathlon" className="p-2 rounded-xl transition hover:bg-amber-500/10" style={{ border: `1px solid ${ACCENT}20` }}>
              <ArrowLeft size={16} style={{ color: ACCENT }} />
            </Link>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}25` }}>
              <Database size={20} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Data Gateway</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {atlets.length} atlet · {prestasis.length} prestasi · {caborNama}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[
              { k: 'prestasi', l: 'Riwayat Prestasi', icon: Trophy },
              { k: 'export',   l: 'Export Data',      icon: Download },
              { k: 'stats',    l: 'Statistik DB',     icon: BarChart2 },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as Tab)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition"
                style={{ background: tab === t.k ? `${ACCENT}15` : 'transparent', color: tab === t.k ? ACCENT : 'rgba(255,255,255,0.4)', border: tab === t.k ? `1px solid ${ACCENT}25` : '1px solid transparent' }}>
                <t.icon size={12} /> {t.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto relative z-10 space-y-5">

        {/* Feedback msg */}
        {msg && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-bold ${msg.type === 'ok' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
            {msg.type === 'ok' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {msg.text}
          </div>
        )}

        {/* ── TAB: PRESTASI ── */}
        {tab === 'prestasi' && (
          <div {...ani(0)} className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <select value={filterAtlet} onChange={e => setFilterAtlet(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500">
                  <option value="all">Semua Atlet ({prestasis.length})</option>
                  {atlets.map(a => <option key={a.id} value={a.id}>{a.nama_lengkap} ({prestasis.filter(p => p.atlet_id === a.id).length})</option>)}
                </select>
              </div>
              <button onClick={() => { setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background: ACCENT, color: '#111' }}>
                <Plus size={13} /> Input Prestasi
              </button>
            </div>

            {/* Form */}
            {showForm && (
              <AddPrestasiForm
                atlets={atlets}
                onSave={handleSavePrestasi}
                onCancel={() => setShowForm(false)}
              />
            )}

            {/* KPI mini */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { l: 'Total',    v: filteredPrestasi.length, c: ACCENT },
                { l: 'Emas',     v: filteredPrestasi.filter(p => p.hasil === 'Emas').length,     c: '#ffd700' },
                { l: 'Perak',    v: filteredPrestasi.filter(p => p.hasil === 'Perak').length,    c: '#c0c0c0' },
                { l: 'Perunggu', v: filteredPrestasi.filter(p => p.hasil === 'Perunggu').length, c: '#cd7f32' },
              ].map(k => (
                <div key={k.l} className="rounded-2xl p-4 text-center" style={{ background: `${k.c}08`, border: `1px solid ${k.c}20` }}>
                  <div className="text-3xl font-light" style={{ color: k.c }}>{k.v}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{k.l}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {filteredPrestasi.length === 0 ? (
                <div className="py-16 text-center">
                  <Trophy size={40} className="mx-auto mb-3 opacity-15" />
                  <div className="text-sm font-bold text-zinc-500 mb-1">Belum Ada Data Prestasi</div>
                  <p className="text-xs text-zinc-600 mb-3">Klik tombol "Input Prestasi" untuk menambah data riwayat kompetisi.</p>
                  <button onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                    style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, color: ACCENT }}>
                    <Plus size={12} /> Input Prestasi
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(2,10,20,0.5)' }}>
                      {['Atlet', 'Event', 'Tahun', 'Lokasi', 'Nomor', 'Hasil', 'Level', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrestasi.map(p => {
                      const atlet = atletMap.get(p.atlet_id)
                      const color = HASIL_COLOR[p.hasil] ?? '#6b7280'
                      return (
                        <tr key={p.id} className="border-b hover:bg-slate-800/30 transition"
                          style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <td className="px-4 py-3 text-white text-xs font-medium">{atlet?.nama_lengkap ?? `ID:${p.atlet_id}`}</td>
                          <td className="px-4 py-3 text-zinc-300 text-xs max-w-[180px] truncate" title={p.event}>{p.event}</td>
                          <td className="px-4 py-3 text-zinc-400 text-xs">{p.tahun}</td>
                          <td className="px-4 py-3 text-zinc-500 text-xs">{p.lokasi || '—'}</td>
                          <td className="px-4 py-3 text-zinc-500 text-xs">{p.nomor_tanding || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                              {p.hasil}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs">{p.level_event}</td>
                          <td className="px-4 py-3">
                            {p.is_demo
                              ? <span className="text-[9px] px-1.5 py-0.5 rounded font-black" style={{ background: 'rgba(245,158,11,0.15)', color: ACCENT }}>DEMO</span>
                              : <span className="text-[9px] px-1.5 py-0.5 rounded font-black text-emerald-400 bg-emerald-500/10">REAL</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {!p.is_demo && (
                              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40">
                                {deleting === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: EXPORT ── */}
        {tab === 'export' && (
          <div {...ani(0)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Export Semua Data',
                  desc: 'Export daftar atlet + riwayat prestasi ke Excel (.xlsx). Cocok untuk arsip atau laporan offline.',
                  icon: FileSpreadsheet, color: '#22d3ee',
                  action: exportExcel, label: 'Download Excel',
                },
                {
                  title: 'Export CSV Prestasi',
                  desc: 'Export riwayat prestasi saja ke format CSV. Kompatibel dengan Excel, Google Sheets, dan tools lainnya.',
                  icon: Download, color: ACCENT,
                  action: () => {
                    const atletMap2 = new Map(atlets.map(a => [a.id, a]))
                    const cols = ['Nama Atlet', 'Gender', 'Event', 'Tahun', 'Lokasi', 'Nomor Tanding', 'Hasil', 'Level Event', 'Catatan']
                    const rows = prestasis.map(p => {
                      const a = atletMap2.get(p.atlet_id)
                      return [a?.nama_lengkap ?? '', a?.gender === 'L' ? 'Putra' : 'Putri', p.event, p.tahun, p.lokasi, p.nomor_tanding, p.hasil, p.level_event, p.catatan]
                    })
                    const csv = [cols, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const el = document.createElement('a')
                    el.href = url; el.download = `Prestasi_Pentathlon_${new Date().toISOString().slice(0, 10)}.csv`
                    el.click(); URL.revokeObjectURL(url)
                  },
                  label: 'Download CSV',
                },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" />
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}12`, border: `1px solid ${item.color}25` }}>
                      <item.icon size={22} style={{ color: item.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                  <button onClick={item.action}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition"
                    style={{ background: `${item.color}12`, border: `1px solid ${item.color}25`, color: item.color }}>
                    <Download size={13} /> {item.label}
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}18` }}>
              <AlertTriangle size={14} style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }} />
              <div className="text-[11px] text-amber-200/80 leading-relaxed">
                Data yang diexport mencakup semua data termasuk data demo (is_demo = true). Data tes fisik dapat diexport dari halaman <Link href="/operator/pentathlon/tes-fisik" className="font-bold underline">Tes Fisik / BioMotorik</Link>.
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: STATS ── */}
        {tab === 'stats' && (
          <div {...ani(0)} className="space-y-4">
            {/* Summary KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { l: 'Total Atlet',    v: atlets.length,                  c: ACCENT,    i: Users },
                { l: 'Total Prestasi', v: prestasis.length,               c: '#22d3ee', i: Medal },
                { l: 'Atlet Berprestasi', v: stats.atletDenganPrestasi,   c: '#a855f7', i: Trophy },
                { l: 'Emas + Perak',   v: stats.totalEmas + stats.totalPerak, c: '#ffd700', i: Activity },
              ].map(k => (
                <div key={k.l} className="rounded-2xl p-5" style={{ background: `${k.c}06`, border: `1px solid ${k.c}18` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <k.i size={14} style={{ color: k.c }} />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{k.l}</span>
                  </div>
                  <div className="text-4xl font-light" style={{ color: k.c }}>{k.v}</div>
                </div>
              ))}
            </div>

            {/* Distribusi Hasil */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Medal size={12} style={{ color: ACCENT }} /> Distribusi Hasil
                </h3>
                <div className="space-y-3">
                  {HASIL_OPTIONS.map(h => {
                    const count = prestasis.filter(p => p.hasil === h).length
                    const color = HASIL_COLOR[h] ?? '#6b7280'
                    return (
                      <div key={h}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span style={{ color }}>{h}</span>
                          <span className="text-zinc-400 font-bold">{count}</span>
                        </div>
                        <Bar value={count} max={prestasis.length || 1} color={color} h={4} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Calendar size={12} style={{ color: ACCENT }} /> Prestasi per Tahun (Top 5)
                </h3>
                {stats.recentYears.length === 0 ? (
                  <div className="text-zinc-600 text-xs text-center py-8">Belum ada data</div>
                ) : (
                  <div className="space-y-3">
                    {stats.recentYears.map(y => {
                      const count = stats.byYear[y] || 0
                      return (
                        <div key={y}>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span style={{ color: ACCENT }}>{y}</span>
                            <span className="text-zinc-400 font-bold">{count}</span>
                          </div>
                          <Bar value={count} max={Math.max(...Object.values(stats.byYear))} color={ACCENT} h={4} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Level Event */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={12} style={{ color: ACCENT }} /> Distribusi Level Event
              </h3>
              <div className="grid grid-cols-5 gap-3">
                {LEVEL_OPTIONS.map(l => {
                  const count = stats.byLevel[l] || 0
                  const colors: Record<string, string> = { 'Internasional': '#a855f7', 'Nasional': '#3b82f6', 'Provinsi': '#0ea5e9', 'Kabupaten': '#f59e0b', 'Lokal': '#6b7280' }
                  const c = colors[l] ?? ACCENT
                  return (
                    <div key={l} className="rounded-xl p-3 text-center" style={{ background: `${c}08`, border: `1px solid ${c}20` }}>
                      <div className="text-2xl font-light mb-0.5" style={{ color: c }}>{count}</div>
                      <div className="text-[9px] text-zinc-500">{l}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
