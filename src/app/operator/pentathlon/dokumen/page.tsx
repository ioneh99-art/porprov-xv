'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  CheckCircle, Clock, XCircle, AlertTriangle, FileCheck,
  Search, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  STATUS_CFG, COMPLIANCE_CFG, type AtletDokumen, type JenisDokumen,
  computeComplianceScore,
} from '@/lib/dokumen-helpers'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STATUS_ICON: Record<string, any> = {
  Clock: Clock, FileCheck: FileCheck, CheckCircle: CheckCircle,
  XCircle: XCircle, AlertTriangle: AlertTriangle,
}

const UKURAN_FIELDS = [
  { key: 'ukuran_kemeja',    label: 'Kemeja' },
  { key: 'ukuran_jaket',     label: 'Jaket' },
  { key: 'ukuran_kaos',      label: 'Kaos' },
  { key: 'ukuran_celana',    label: 'Celana' },
  { key: 'ukuran_sepatu',    label: 'Sepatu' },
  { key: 'ukuran_topi',      label: 'Topi' },
  { key: 'training_set',     label: 'Training Set' },
]

interface Atlet {
  id: number
  nama_lengkap: string
  gender: string
  kontingen_id: number
  kontingen_nama: string
}

interface Perlengkapan {
  id?: number
  atlet_id: number
  [key: string]: any
}

export default function PentathlonDokumenPage() {
  const [me, setMe] = useState<any>(null)
  const [tab, setTab] = useState<'dokumen' | 'perlengkapan'>('dokumen')
  const [atlets, setAtlets] = useState<Atlet[]>([])
  const [jenisList, setJenisList] = useState<JenisDokumen[]>([])
  const [dokumens, setDokumens] = useState<AtletDokumen[]>([])
  const [perlengkapan, setPerlengkapan] = useState<Perlengkapan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedAtlet, setExpandedAtlet] = useState<number | null>(null)
  const [savingPerlengkapan, setSavingPerlengkapan] = useState<number | null>(null)
  const [editPerlengkapan, setEditPerlengkapan] = useState<Record<number, Record<string, string>>>({})

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const meData = me ?? await fetch('/api/auth/me').then(r => r.json())
      if (!me) setMe(meData)
      const cabor_id = meData?.cabor_id
      if (!cabor_id) return

      const [{ data: atletData }, { data: jenisData }] = await Promise.all([
        sb.from('atlet')
          .select('id, nama_lengkap, gender, kontingen_id, kontingen(nama)')
          .eq('cabor_id', cabor_id)
          .order('nama_lengkap'),
        sb.from('dokumen_jenis')
          .select('*')
          .order('urutan'),
      ])

      const atletIds = (atletData ?? []).map((a: any) => a.id)
      const atletList: Atlet[] = (atletData ?? []).map((a: any) => ({
        ...a,
        kontingen_nama: a.kontingen?.nama ?? '-',
      }))
      setAtlets(atletList)
      setJenisList((jenisData ?? []) as JenisDokumen[])

      if (atletIds.length === 0) {
        setDokumens([])
        setPerlengkapan([])
        setLoading(false)
        return
      }

      const [{ data: dokData }, { data: perlData }] = await Promise.all([
        sb.from('atlet_dokumen')
          .select('id, atlet_id, jenis_id, status, nomor_dokumen, tanggal_terbit, tanggal_expired, catatan, file_url')
          .in('atlet_id', atletIds),
        sb.from('atlet_perlengkapan')
          .select('*')
          .in('atlet_id', atletIds),
      ])

      setDokumens((dokData ?? []) as AtletDokumen[])
      setPerlengkapan(perlData ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [me])

  useEffect(() => { loadData() }, [])

  const mandatoryCount = useMemo(
    () => jenisList.filter(j => j.is_mandatory).length,
    [jenisList]
  )

  const complianceRows = useMemo(() => {
    return atlets
      .filter(a => !search || a.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || a.kontingen_nama.toLowerCase().includes(search.toLowerCase()))
      .map(a => {
        const score = computeComplianceScore(a.id, dokumens, mandatoryCount)
        return { ...a, ...score }
      })
  }, [atlets, dokumens, mandatoryCount, search])

  const overallStats = useMemo(() => ({
    complete: complianceRows.filter(r => r.status === 'complete').length,
    partial:  complianceRows.filter(r => r.status === 'partial' || r.status === 'pending_review').length,
    empty:    complianceRows.filter(r => r.status === 'empty').length,
  }), [complianceRows])

  const getPerlengkapan = (atletId: number): Perlengkapan =>
    perlengkapan.find(p => p.atlet_id === atletId) ?? { atlet_id: atletId }

  const getEditValue = (atletId: number, key: string) =>
    editPerlengkapan[atletId]?.[key] ?? getPerlengkapan(atletId)[key] ?? ''

  const setEditValue = (atletId: number, key: string, val: string) => {
    setEditPerlengkapan(prev => ({
      ...prev,
      [atletId]: { ...(prev[atletId] ?? {}), [key]: val },
    }))
  }

  const savePerlengkapan = async (atletId: number) => {
    const current = getPerlengkapan(atletId)
    const edits = editPerlengkapan[atletId] ?? {}
    const payload = { atlet_id: atletId, ...UKURAN_FIELDS.reduce((acc: any, f) => {
      acc[f.key] = edits[f.key] ?? current[f.key] ?? null
      return acc
    }, {}) }

    setSavingPerlengkapan(atletId)
    try {
      const _res = await fetch('/api/operator/perlengkapan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const _out = await _res.json().catch(() => ({}))
      if (!_res.ok) throw new Error(_out?.error || 'Gagal simpan perlengkapan')
      const data = _out.data
      setPerlengkapan(prev => {
        const i = prev.findIndex(p => p.atlet_id === atletId)
        if (i >= 0) { const n = [...prev]; n[i] = data; return n }
        return [...prev, data]
      })
      setEditPerlengkapan(prev => { const n = { ...prev }; delete n[atletId]; return n })
    } catch (e: any) {
      alert('Gagal menyimpan: ' + e.message)
    } finally {
      setSavingPerlengkapan(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  )
  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm">{error}</div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Dokumen Atlet Pentathlon</h1>
          <p className="text-slate-500 text-xs mt-1">
            {me?.cabor_nama ?? 'Pentathlon'} · {atlets.length} atlet · {mandatoryCount} dokumen wajib
          </p>
        </div>
        <button onClick={loadData}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-all">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <SummaryCard label="Dokumen Lengkap" value={overallStats.complete} total={atlets.length} color="emerald" />
        <SummaryCard label="Partial / Review" value={overallStats.partial} total={atlets.length} color="amber" />
        <SummaryCard label="Belum Ada Dokumen" value={overallStats.empty} total={atlets.length} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {(['dokumen', 'perlengkapan'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === t ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {t === 'dokumen' ? '📄 Dokumen Compliance' : '👕 Perlengkapan'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atlet atau kontingen..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-500/50"
        />
      </div>

      {/* TAB: Dokumen Compliance */}
      {tab === 'dokumen' && (
        <div className="space-y-2">
          {/* Jenis header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="text-white text-xs font-medium mb-3">Jenis Dokumen Wajib</div>
            <div className="flex flex-wrap gap-2">
              {jenisList.filter(j => j.is_mandatory).map(j => (
                <span key={j.id} className="text-[10px] px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  {j.nama}
                </span>
              ))}
            </div>
          </div>

          {complianceRows.map(row => {
            const cfg = COMPLIANCE_CFG[row.status] ?? COMPLIANCE_CFG.unknown
            const isExpanded = expandedAtlet === row.id
            const atletDoks = dokumens.filter(d => d.atlet_id === row.id)

            return (
              <div key={row.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedAtlet(isExpanded ? null : row.id)}
                  className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/30 transition-colors">
                  {/* Compliance pct */}
                  <div className="w-10 text-center">
                    <div className="text-sm font-bold" style={{ color: cfg.color }}>{row.pct}%</div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full transition-all" style={{ width: `${row.pct}%`, background: cfg.color }} />
                  </div>
                  {/* Name */}
                  <div className="flex-1 text-left">
                    <div className="text-xs font-medium text-slate-200">{row.nama_lengkap}</div>
                    <div className="text-[10px] text-slate-500">{row.kontingen_nama}</div>
                  </div>
                  {/* Status badge */}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                  </span>
                  {/* Counts */}
                  <div className="flex items-center gap-2 text-[10px] flex-shrink-0">
                    <span className="text-emerald-400">{row.total_verified}✓</span>
                    <span className="text-amber-400">{row.total_pending}⏳</span>
                    <span className="text-red-400">{row.total_rejected}✗</span>
                  </div>
                  {isExpanded ? <ChevronDown size={12} className="text-slate-500 flex-shrink-0" /> : <ChevronRight size={12} className="text-slate-500 flex-shrink-0" />}
                </button>

                {/* Expanded: per-jenis status */}
                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 py-4 bg-slate-900/50">
                    <div className="grid grid-cols-2 gap-2">
                      {jenisList.map(j => {
                        const dok = atletDoks.find(d => d.jenis_id === j.id)
                        const status = dok?.status ?? 'pending'
                        const scfg = STATUS_CFG[status]
                        const SIcon = STATUS_ICON[scfg.icon] ?? Clock
                        return (
                          <div key={j.id} className="flex items-center gap-2.5 p-2.5 rounded-lg"
                            style={{ background: scfg.bg }}>
                            <SIcon size={12} style={{ color: scfg.color, flexShrink: 0 }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-medium text-slate-200 truncate">{j.nama}</div>
                              <div className="text-[9px]" style={{ color: scfg.color }}>{scfg.text}</div>
                            </div>
                            {j.is_mandatory && (
                              <span className="text-[9px] text-slate-600 flex-shrink-0">wajib</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {dokumens.filter(d => d.atlet_id === row.id && d.catatan).length > 0 && (
                      <div className="mt-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-300/80">
                        {dokumens.filter(d => d.atlet_id === row.id && d.catatan).map(d => d.catatan).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* TAB: Perlengkapan */}
      {tab === 'perlengkapan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/40">
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-500 text-[10px] uppercase px-5 py-3 font-medium tracking-wider">Atlet</th>
                {UKURAN_FIELDS.map(f => (
                  <th key={f.key} className="text-center text-slate-500 text-[10px] uppercase px-2 py-3 font-medium tracking-wider whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
                <th className="text-center text-slate-500 text-[10px] uppercase px-3 py-3 font-medium tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {atlets
                .filter(a => !search || a.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || a.kontingen_nama.toLowerCase().includes(search.toLowerCase()))
                .map(a => {
                  const hasEdits = !!editPerlengkapan[a.id]
                  const isSaving = savingPerlengkapan === a.id
                  return (
                    <tr key={a.id} className={`border-b border-slate-800/30 transition-colors ${hasEdits ? 'bg-yellow-500/3' : 'hover:bg-slate-800/20'}`}>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-200">{a.nama_lengkap}</div>
                        <div className="text-[10px] text-slate-500">{a.kontingen_nama}</div>
                      </td>
                      {UKURAN_FIELDS.map(f => (
                        <td key={f.key} className="px-2 py-2 text-center">
                          <input
                            value={getEditValue(a.id, f.key)}
                            onChange={e => setEditValue(a.id, f.key, e.target.value)}
                            className="w-16 bg-slate-800 border border-slate-700 rounded-md px-1.5 py-1 text-center text-[11px] text-slate-200 focus:outline-none focus:border-yellow-500/50 focus:bg-slate-700 transition-colors"
                            placeholder="-"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        {hasEdits && (
                          <button
                            onClick={() => savePerlengkapan(a.id)}
                            disabled={isSaving}
                            className="text-[10px] px-2.5 py-1 rounded-md bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 disabled:opacity-50 transition-colors whitespace-nowrap">
                            {isSaving ? '...' : 'Simpan'}
                          </button>
                        )}
                        {!hasEdits && (
                          <span className="text-[10px] text-slate-700">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
          {atlets.length === 0 && (
            <div className="py-12 text-center text-slate-600 text-sm">Tidak ada atlet</div>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500/20 text-emerald-400',
    amber:   'border-amber-500/20 text-amber-400',
    red:     'border-red-500/20 text-red-400',
  }
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className={`bg-slate-900 border rounded-xl p-4 ${colorMap[color]}`}>
      <div className="text-2xl font-semibold leading-tight">{value}</div>
      <div className="text-[10px] text-slate-400 mt-1">{label}</div>
      <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-current opacity-60 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] opacity-60 mt-1">{pct}% dari {total} atlet</div>
    </div>
  )
}
