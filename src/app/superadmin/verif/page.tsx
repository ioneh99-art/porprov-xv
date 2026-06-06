'use client'
// src/app/superadmin/verif/page.tsx
// VERIFICATION COMMAND CENTER — bulk approve/reject lintas kontingen

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  CheckCircle, ChevronDown, Filter, Loader2,
  RefreshCw, Search, Shield, ShieldCheck,
  ThumbsDown, ThumbsUp, User, XCircle, Zap,
  AlertTriangle, Clock, Users,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const C = {
  primary:   '#00f3ff',
  secondary: '#00ff66',
  accent:    '#ffb000',
  alert:     '#ff3366',
  purple:    '#a855f7',
  bg:        'rgba(10,25,47,0.4)',
  border:    'rgba(0,243,255,0.2)',
  muted:     '#7a8b9e',
}

const STATUSES = [
  { key: 'Draft',             label: 'DRAFT',            color: C.muted,      short: 'DRF' },
  { key: 'Menunggu Cabor',    label: 'MENUNGGU_CABOR',   color: C.accent,     short: 'MCB' },
  { key: 'Menunggu Admin',    label: 'MENUNGGU_ADMIN',   color: C.primary,    short: 'MAD' },
  { key: 'Ditolak Cabor',     label: 'DITOLAK_CABOR',    color: '#f97316',    short: 'DCB' },
  { key: 'Ditolak Admin',     label: 'DITOLAK_ADMIN',    color: C.alert,      short: 'DAD' },
  { key: 'Verified',          label: 'VERIFIED',         color: C.secondary,  short: 'VRF' },
  { key: 'Posted',            label: 'POSTED',           color: C.purple,     short: 'PST' },
]

const ACTIONABLE = ['Menunggu Admin', 'Draft', 'Menunggu Cabor']

interface Atlet {
  id:               string
  nama:             string
  nik:              string | null
  gender:           'L' | 'P' | null
  cabor_nama_raw:   string | null
  status_registrasi:string
  catatan_admin:    string | null
  foto_url:         string | null
  kontingen_id:     number
  updated_at:       string
  kontingen_nama?:  string
}

interface Kontingen { id: number; nama: string }

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ══════════════════════════════════════════════════════════
export default function VerifPage() {
  const [atlet,       setAtlet]       = useState<Atlet[]>([])
  const [kontingens,  setKontingens]  = useState<Kontingen[]>([])
  const [loading,     setLoading]     = useState(true)
  const [processing,  setProcessing]  = useState(false)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [search,      setSearch]      = useState('')
  const [filterSt,    setFilterSt]    = useState<string>('Menunggu Admin')
  const [filterK,     setFilterK]     = useState<string>('all')
  const [filterCabor, setFilterCabor] = useState<string>('all')
  const [note,        setNote]        = useState('')
  const [showNote,    setShowNote]    = useState(false)
  const [pendingAction, setPendingAction] = useState<'approve'|'reject'|null>(null)
  const [animIn,      setAnimIn]      = useState(false)
  const [toast,       setToast]       = useState<{msg:string; ok:boolean}|null>(null)

  useEffect(() => { setTimeout(() => setAnimIn(true), 80) }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  async function load() {
    setLoading(true)
    const [aRes, kRes] = await Promise.all([
      sb.from('atlet')
        .select('id,nama,nik,gender,cabor_nama_raw,status_registrasi,catatan_admin,foto_url,kontingen_id,updated_at')
        .order('updated_at', { ascending: false })
        .limit(2000),
      sb.from('kontingen').select('id,nama').order('nama'),
    ])
    const kMap: Record<number, string> = {}
    kRes.data?.forEach(k => { kMap[k.id] = k.nama })
    const atletData = (aRes.data || []).map(a => ({ ...a, kontingen_nama: kMap[a.kontingen_id] || '—' }))
    setAtlet(atletData as Atlet[])
    setKontingens(kRes.data || [])
    setSelected(new Set())
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const cabors = useMemo(() => {
    const set = new Set(atlet.map(a => a.cabor_nama_raw).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [atlet])

  const filtered = useMemo(() => {
    return atlet.filter(a => {
      if (filterSt  !== 'all' && a.status_registrasi !== filterSt) return false
      if (filterK   !== 'all' && String(a.kontingen_id) !== filterK) return false
      if (filterCabor !== 'all' && a.cabor_nama_raw !== filterCabor) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          a.nama.toLowerCase().includes(q) ||
          (a.nik || '').includes(q) ||
          (a.cabor_nama_raw || '').toLowerCase().includes(q) ||
          (a.kontingen_nama || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [atlet, filterSt, filterK, filterCabor, search])

  // Status counts
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    atlet.forEach(a => { m[a.status_registrasi] = (m[a.status_registrasi] || 0) + 1 })
    return m
  }, [atlet])

  // Select all visible
  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(a => a.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  function initiateAction(action: 'approve' | 'reject') {
    if (!selected.size) return
    setPendingAction(action)
    setShowNote(true)
    setNote('')
  }

  async function executeAction() {
    if (!pendingAction || !selected.size) return
    setProcessing(true)
    const newStatus = pendingAction === 'approve' ? 'Verified' : 'Ditolak Admin'
    const ids = Array.from(selected)
    const { error } = await sb
      .from('atlet')
      .update({ status_registrasi: newStatus, catatan_admin: note || null, updated_at: new Date().toISOString() })
      .in('id', ids)
    if (error) {
      showToast(error.message, false)
    } else {
      showToast(`${ids.length} atlet ${pendingAction === 'approve' ? 'diverifikasi' : 'ditolak'}`, pendingAction === 'approve')
      await load()
    }
    setProcessing(false)
    setShowNote(false)
    setPendingAction(null)
  }

  const panel = { background: C.bg, border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)' }
  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  const canAction = ACTIONABLE.includes(filterSt) || filterSt === 'all'

  return (
    <div className="p-6 space-y-5 font-sci min-h-screen" style={{ color: '#f1f5f9' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 text-xs font-mono border backdrop-blur-md"
          style={{ background: toast.ok ? 'rgba(0,255,102,0.1)' : 'rgba(255,51,102,0.1)', borderColor: toast.ok ? C.secondary : C.alert, color: toast.ok ? C.secondary : C.alert }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Action confirm modal */}
      {showNote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background:'rgba(0,0,0,0.8)', backdropFilter:'blur(6px)' }}>
          <div className="p-6 max-w-md w-full font-mono" style={{ ...panel, borderColor: pendingAction==='approve' ? `${C.secondary}40` : `${C.alert}40` }}>
            <div className="font-lcd text-sm font-bold mb-1" style={{ color: pendingAction==='approve' ? C.secondary : C.alert }}>
              {pendingAction === 'approve' ? 'VERIFY_ATLET' : 'REJECT_ATLET'}
            </div>
            <div className="text-xs mb-4" style={{ color: C.muted }}>
              {selected.size} atlet akan diubah ke <strong className="text-white">{pendingAction==='approve' ? 'Verified' : 'Ditolak Admin'}</strong>
            </div>
            <div className="mb-4">
              <label className="block text-[9px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>Catatan (opsional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                className="w-full bg-transparent border px-2 py-1.5 text-xs text-white outline-none resize-none"
                style={{ borderColor: C.border }}
                placeholder="Tambahkan catatan untuk atlet..." />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowNote(false); setPendingAction(null) }} disabled={processing}
                className="flex-1 py-2 text-[10px] border uppercase tracking-wider"
                style={{ borderColor: C.border, color: C.muted }}>CANCEL</button>
              <button onClick={executeAction} disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] border uppercase tracking-wider"
                style={{
                  borderColor: pendingAction==='approve' ? C.secondary : C.alert,
                  color: pendingAction==='approve' ? C.secondary : C.alert,
                  background: pendingAction==='approve' ? 'rgba(0,255,102,0.08)' : 'rgba(255,51,102,0.08)',
                }}>
                {processing ? <Loader2 size={12} className="animate-spin" /> : pendingAction === 'approve' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                {processing ? 'PROCESSING...' : 'CONFIRM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div {...ani(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border flex items-center justify-center relative"
            style={{ borderColor: C.primary, background: 'rgba(0,243,255,0.08)' }}>
            <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(0,243,255,0.06)' }} />
            <ShieldCheck size={18} style={{ color: C.primary }} className="z-10" />
          </div>
          <div>
            <h1 className="font-lcd font-bold text-xl tracking-widest" style={{ color: C.primary, textShadow: `0 0 12px ${C.primary}` }}>
              VERIFICATION_CMD_CENTER
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
              {atlet.length} atlet total · {counts['Menunggu Admin'] || 0} pending admin · Bulk approve/reject
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono border uppercase tracking-wider disabled:opacity-40"
          style={{ borderColor: C.primary, color: C.primary, background: 'rgba(0,243,255,0.06)' }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          REFRESH
        </button>
      </div>

      {/* Pipeline funnel */}
      <div {...ani(40)} className="grid grid-cols-3 md:grid-cols-7 gap-2">
        {STATUSES.map(s => {
          const count = counts[s.key] || 0
          const isActive = filterSt === s.key
          return (
            <button key={s.key} onClick={() => { setFilterSt(isActive ? 'all' : s.key); setSelected(new Set()) }}
              className="p-3 relative overflow-hidden text-center transition-all"
              style={{
                ...panel,
                borderColor: isActive ? s.color : 'rgba(0,243,255,0.1)',
                background: isActive ? `${s.color}12` : 'rgba(10,25,47,0.3)',
              }}>
              {isActive && <div className="absolute top-0 left-0 right-0 h-px" style={{ background: s.color }} />}
              <div className="font-lcd font-bold text-xl" style={{ color: s.color }}>{count}</div>
              <div className="text-[8px] font-mono uppercase tracking-wider mt-0.5" style={{ color: isActive ? s.color : C.muted }}>
                {s.short}
              </div>
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div {...ani(80)} className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex items-center gap-2 border px-3 py-1.5 flex-1 min-w-48" style={{ borderColor: C.border }}>
          <Search size={11} style={{ color: C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / NIK / cabor..."
            className="bg-transparent text-xs font-mono text-white outline-none flex-1" />
        </div>
        {/* Kontingen */}
        <select value={filterK} onChange={e => setFilterK(e.target.value)}
          className="bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
          style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
          <option value="all" style={{ background: '#0a192f' }}>Semua kontingen</option>
          {kontingens.map(k => <option key={k.id} value={String(k.id)} style={{ background: '#0a192f' }}>{k.nama}</option>)}
        </select>
        {/* Cabor */}
        <select value={filterCabor} onChange={e => setFilterCabor(e.target.value)}
          className="bg-transparent border px-2 py-1.5 text-xs font-mono text-white outline-none"
          style={{ borderColor: C.border, background: 'rgba(10,25,47,0.6)' }}>
          <option value="all" style={{ background: '#0a192f' }}>Semua cabor</option>
          {cabors.map(c => <option key={c} value={c} style={{ background: '#0a192f' }}>{c}</option>)}
        </select>
        <span className="text-[9px] font-mono" style={{ color: C.muted }}>{filtered.length} atlet</span>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-mono" style={{ color: C.primary }}>{selected.size} dipilih</span>
            <button onClick={() => initiateAction('approve')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider"
              style={{ borderColor: C.secondary, color: C.secondary, background: 'rgba(0,255,102,0.08)' }}>
              <ThumbsUp size={11} /> APPROVE
            </button>
            <button onClick={() => initiateAction('reject')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border uppercase tracking-wider"
              style={{ borderColor: C.alert, color: C.alert, background: 'rgba(255,51,102,0.08)' }}>
              <ThumbsDown size={11} /> REJECT
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin" style={{ color: C.primary }} />
        </div>
      ) : (
        <div {...ani(120)} style={panel}>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="border-b" style={{ borderColor: C.border }}>
                  <th className="px-4 py-3">
                    <input type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-cyan-400 w-3 h-3" />
                  </th>
                  {['ATLET','NIK','GENDER','CABOR','KONTINGEN','STATUS','UPDATED','CATATAN'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-[9px] uppercase tracking-widest" style={{ color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const stMeta = STATUSES.find(s => s.key === a.status_registrasi)
                  const stColor = stMeta?.color || C.muted
                  const isSel  = selected.has(a.id)
                  return (
                    <tr key={a.id}
                      className="border-b cursor-pointer transition-colors"
                      style={{ borderColor: 'rgba(0,243,255,0.05)', background: isSel ? 'rgba(0,243,255,0.06)' : 'transparent' }}
                      onClick={() => toggleOne(a.id)}>
                      <td className="px-4 py-2.5">
                        <input type="checkbox" checked={isSel} onChange={() => {}}
                          className="accent-cyan-400 w-3 h-3 pointer-events-none" />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {a.foto_url
                            ? <img src={a.foto_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                            : <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[8px]"
                                style={{ background: `${C.primary}20`, color: C.primary }}>{a.nama[0]}</div>}
                          <span className="text-white font-semibold">{a.nama}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono" style={{ color: a.nik ? 'rgba(255,255,255,0.6)' : C.alert }}>
                        {a.nik || '— kosong'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 text-[9px]"
                          style={{ background: a.gender === 'L' ? 'rgba(0,243,255,0.1)' : 'rgba(255,51,102,0.1)', color: a.gender === 'L' ? C.primary : C.alert }}>
                          {a.gender || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {a.cabor_nama_raw || <span style={{ color: C.alert }}>—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[9px]" style={{ color: C.muted }}>
                        {a.kontingen_nama}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[9px] px-1.5 py-0.5 font-bold"
                          style={{ background: `${stColor}15`, color: stColor, border: `1px solid ${stColor}30` }}>
                          {stMeta?.short || '?'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[9px]" style={{ color: C.muted }}>
                        {timeAgo(a.updated_at)}
                      </td>
                      <td className="px-3 py-2.5 max-w-[120px] truncate text-[9px]" style={{ color: C.muted }}>
                        {a.catatan_admin || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <ShieldCheck size={32} className="mx-auto mb-3 opacity-30" style={{ color: C.secondary }} />
              <div className="font-lcd text-sm" style={{ color: C.secondary }}>QUEUE_CLEAR</div>
              <div className="text-xs font-mono mt-1" style={{ color: C.muted }}>Tidak ada atlet dengan filter ini</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
