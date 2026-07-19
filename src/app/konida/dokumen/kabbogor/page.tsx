'use client'
// src/app/konida/dokumen/kabbogor/page.tsx — v2
// 2 TAB: Dokumen Compliance + Perlengkapan Atlet
// Modal CENTER (bukan slide-out side panel)

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  FileText, CheckCircle, XCircle, Clock, AlertTriangle,
  Search, Filter, Download, Mail, Eye, X, Save,
  CreditCard, Users as UsersIcon, GraduationCap, Heart,
  Camera, Image as ImageIcon, Receipt, Banknote, Syringe,
  Loader2, RefreshCw, Upload, ExternalLink, Calendar,
  Activity, FileCheck, Send, Shirt, Package,
  Footprints, Hash, Edit3, ShoppingBag,
} from 'lucide-react'
import {
  STATUS_CFG, COMPLIANCE_CFG,
  type ComplianceStats, type DokumenStats, type AtletDokumen, type JenisDokumen,
  computeComplianceScore, checkExpiry, formatRelativeTime,
} from '@/lib/dokumen-helpers'
import { CriticalAlertsCard, type CriticalAlert } from '@/components/konida/DashboardHelpers'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 1
const ACCENT = '#00ffaa'

const ICON_MAP: Record<string, any> = {
  CreditCard, Users: UsersIcon, FileText, GraduationCap, Heart,
  Syringe, Receipt, Banknote, Camera, Image: ImageIcon,
}

type FilterCompliance = 'all' | 'complete' | 'pending_review' | 'partial' | 'empty'
type FilterPerlengkapan = 'all' | 'lengkap' | 'sebagian' | 'belum_diisi'
type MainTab = 'dokumen' | 'perlengkapan'

interface AtletInfo {
  id: number
  nama_lengkap: string
  no_ktp: string
  cabor_nama_raw: string
  status_registrasi: string
}

interface Perlengkapan {
  id?: number
  atlet_id: number
  ukuran_kemeja?: string | null
  ukuran_jaket?: string | null
  ukuran_kaos?: string | null
  ukuran_celana?: string | null
  ukuran_sepatu?: string | null
  ukuran_topi?: string | null
  ukuran_training_set?: string | null
  catatan?: string | null
}

// ── Konfigurasi ukuran ──
const UKURAN_BAJU = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const UKURAN_CELANA = ['28', '30', '32', '34', '36', '38', '40']
const UKURAN_SEPATU = ['37', '38', '39', '40', '41', '42', '43', '44', '45']
const UKURAN_TOPI = ['S', 'M', 'L', 'ALL']

const ITEM_PERLENGKAPAN_CFG = [
  { key: 'ukuran_kemeja',       label: 'Kemeja',        icon: Shirt,      options: UKURAN_BAJU,   color: '#3b82f6' },
  { key: 'ukuran_jaket',        label: 'Jaket',         icon: Package,    options: UKURAN_BAJU,   color: '#8b5cf6' },
  { key: 'ukuran_kaos',         label: 'Kaos',          icon: Shirt,      options: UKURAN_BAJU,   color: '#06b6d4' },
  { key: 'ukuran_celana',       label: 'Celana',        icon: Package,    options: UKURAN_CELANA, color: '#f59e0b' },
  { key: 'ukuran_sepatu',       label: 'Sepatu',        icon: Footprints, options: UKURAN_SEPATU, color: '#10b981' },
  { key: 'ukuran_topi',         label: 'Topi',          icon: Hash,       options: UKURAN_TOPI,   color: '#ec4899' },
  { key: 'ukuran_training_set', label: 'Training Set',  icon: Shirt,      options: UKURAN_BAJU,   color: '#a855f7' },
] as const

type ItemKey = (typeof ITEM_PERLENGKAPAN_CFG)[number]['key']

// ════════════════════════════════════════════════════════════
export default function PageDokumenAtlet() {
  const [mainTab, setMainTab] = useState<MainTab>('dokumen')
  const [loading, setLoading] = useState(true)
  
  // Dokumen state
  const [jenisList, setJenisList] = useState<JenisDokumen[]>([])
  const [dokumens, setDokumens] = useState<AtletDokumen[]>([])
  const [atlets, setAtlets] = useState<AtletInfo[]>([])
  const [dokumenStats, setDokumenStats] = useState<DokumenStats[]>([])
  
  // Perlengkapan state
  const [perlengkapanList, setPerlengkapanList] = useState<Perlengkapan[]>([])
  
  const [animIn, setAnimIn] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCompliance, setFilterCompliance] = useState<FilterCompliance>('all')
  const [filterPerlengkapan, setFilterPerlengkapan] = useState<FilterPerlengkapan>('all')
  const [selectedAtlet, setSelectedAtlet] = useState<AtletInfo | null>(null)
  const [modalType, setModalType] = useState<'dokumen' | 'perlengkapan'>('dokumen')
  
  // Edit form perlengkapan
  const [editForm, setEditForm] = useState<Partial<Perlengkapan>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  useEffect(() => {
    async function load() {
      try {
        const [jenisRes, dokRes, atletRes, statsRes, perlengkapanRes] = await Promise.all([
          sb.from('dokumen_jenis').select('*').order('urutan'),
          sb.from('atlet_dokumen').select('*'),
          sb.from('atlet')
            .select('id,nama_lengkap,no_ktp,cabor_nama_raw,status_registrasi')
            .eq('kontingen_id', KONTINGEN_ID),
          sb.from('v_dokumen_stats').select('*'),
          sb.from('atlet_perlengkapan').select('*'),
        ])

        if (jenisRes.data) setJenisList(jenisRes.data as JenisDokumen[])
        if (dokRes.data) setDokumens(dokRes.data as AtletDokumen[])
        if (atletRes.data) setAtlets(atletRes.data as AtletInfo[])
        if (statsRes.data) setDokumenStats(statsRes.data as DokumenStats[])
        if (perlengkapanRes.data) setPerlengkapanList(perlengkapanRes.data as Perlengkapan[])
      } catch (e) {
        console.error('[Dokumen] Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // ═════════ DOKUMEN COMPUTATIONS ═════════
  const totalMandatory = useMemo(() =>
    jenisList.filter(j => j.is_mandatory).length,
  [jenisList])

  const atletCompliance = useMemo(() => {
    return atlets.map(a => {
      const score = computeComplianceScore(a.id, dokumens, totalMandatory)
      return { ...a, ...score }
    })
  }, [atlets, dokumens, totalMandatory])

  // ═════════ PERLENGKAPAN COMPUTATIONS ═════════
  const perlengkapanByAtlet = useMemo(() => {
    const m: Record<number, Perlengkapan> = {}
    perlengkapanList.forEach(p => { m[p.atlet_id] = p })
    return m
  }, [perlengkapanList])

  const atletWithPerlengkapan = useMemo(() => {
    return atlets.map(a => {
      const p = perlengkapanByAtlet[a.id]
      const filled = p ? ITEM_PERLENGKAPAN_CFG.filter(c => p[c.key as ItemKey]).length : 0
      const total = ITEM_PERLENGKAPAN_CFG.length
      const pct = Math.round((filled / total) * 100)
      const status: FilterPerlengkapan = !p ? 'belum_diisi' : filled >= total ? 'lengkap' : 'sebagian'
      return { ...a, perlengkapan: p, filled, total, pct, status }
    })
  }, [atlets, perlengkapanByAtlet])

  // Stats per ukuran per item (untuk PO)
  const ukuranStats = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {}
    ITEM_PERLENGKAPAN_CFG.forEach(cfg => {
      stats[cfg.key] = { BELUM_DIISI: 0 }
      cfg.options.forEach(opt => stats[cfg.key][opt] = 0)
    })
    atletWithPerlengkapan.forEach(a => {
      ITEM_PERLENGKAPAN_CFG.forEach(cfg => {
        const val = a.perlengkapan?.[cfg.key as ItemKey] || 'BELUM_DIISI'
        if (stats[cfg.key][val] !== undefined) {
          stats[cfg.key][val]++
        } else {
          stats[cfg.key][val] = 1
        }
      })
    })
    return stats
  }, [atletWithPerlengkapan])

  // ═════════ FILTER + SEARCH ═════════
  const displayedAtlets = useMemo(() => {
    if (mainTab === 'dokumen') {
      let list = atletCompliance
      if (filterCompliance !== 'all') list = list.filter(a => a.status === filterCompliance)
      if (search) {
        const q = search.toLowerCase()
        list = list.filter(a =>
          a.nama_lengkap.toLowerCase().includes(q) ||
          a.cabor_nama_raw.toLowerCase().includes(q) ||
          a.no_ktp?.includes(q)
        )
      }
      return list.sort((a, b) => a.pct - b.pct)
    } else {
      let list = atletWithPerlengkapan
      if (filterPerlengkapan !== 'all') list = list.filter(a => a.status === filterPerlengkapan)
      if (search) {
        const q = search.toLowerCase()
        list = list.filter(a =>
          a.nama_lengkap.toLowerCase().includes(q) ||
          a.cabor_nama_raw.toLowerCase().includes(q) ||
          a.no_ktp?.includes(q)
        )
      }
      return list.sort((a, b) => a.pct - b.pct)
    }
  }, [mainTab, atletCompliance, atletWithPerlengkapan, filterCompliance, filterPerlengkapan, search])

  // ═════════ SUMMARY ═════════
  const summaryDokumen = useMemo(() => {
    let complete = 0, pendingReview = 0, partial = 0, empty = 0, expired = 0
    atletCompliance.forEach(a => {
      if (a.status === 'complete') complete++
      else if (a.status === 'pending_review') pendingReview++
      else if (a.status === 'partial') partial++
      else if (a.status === 'empty') empty++
    })
    dokumens.forEach(d => {
      const exp = checkExpiry(d.tanggal_expired)
      if (exp.isExpired) expired++
    })
    return { complete, pendingReview, partial, empty, expired, total: atletCompliance.length }
  }, [atletCompliance, dokumens])

  const summaryPerlengkapan = useMemo(() => {
    let lengkap = 0, sebagian = 0, belum = 0
    atletWithPerlengkapan.forEach(a => {
      if (a.status === 'lengkap') lengkap++
      else if (a.status === 'sebagian') sebagian++
      else belum++
    })
    return { lengkap, sebagian, belum, total: atletWithPerlengkapan.length }
  }, [atletWithPerlengkapan])

  // ═════════ CRITICAL ALERT ARRAYS ═════════
  const docAlerts = useMemo<CriticalAlert[]>(() => {
    const alerts: CriticalAlert[] = []
    if (summaryDokumen.empty > 0)
      alerts.push({ severity: 'urgent', icon: XCircle, title: 'Dokumen Kosong', message: `${summaryDokumen.empty} atlet belum upload dokumen wajib apapun`, count: summaryDokumen.empty })
    if (summaryDokumen.expired > 0)
      alerts.push({ severity: 'urgent', icon: Calendar, title: 'Dokumen Expired', message: `${summaryDokumen.expired} dokumen sudah kadaluarsa, perlu renewal segera`, count: summaryDokumen.expired })
    if (summaryDokumen.pendingReview > 0)
      alerts.push({ severity: 'important', icon: Clock, title: 'Menunggu Verifikasi', message: `${summaryDokumen.pendingReview} atlet dokumennya sudah diupload, belum diverifikasi`, count: summaryDokumen.pendingReview })
    if (summaryDokumen.partial > 0)
      alerts.push({ severity: 'important', icon: AlertTriangle, title: 'Dokumen Tidak Lengkap', message: `${summaryDokumen.partial} atlet baru upload sebagian dokumen wajib`, count: summaryDokumen.partial })
    if (alerts.length === 0)
      alerts.push({ severity: 'info', icon: CheckCircle, title: 'Dokumen Aman', message: `${summaryDokumen.complete} dari ${summaryDokumen.total} atlet sudah dokumen lengkap` })
    return alerts
  }, [summaryDokumen])

  const perlengkapanAlerts = useMemo<CriticalAlert[]>(() => {
    const alerts: CriticalAlert[] = []
    if (summaryPerlengkapan.belum > 0)
      alerts.push({ severity: 'urgent', icon: AlertTriangle, title: 'Ukuran Belum Diisi', message: `${summaryPerlengkapan.belum} atlet belum mengisi data ukuran perlengkapan sama sekali`, count: summaryPerlengkapan.belum })
    if (summaryPerlengkapan.sebagian > 0)
      alerts.push({ severity: 'important', icon: Package, title: 'Perlengkapan Tidak Lengkap', message: `${summaryPerlengkapan.sebagian} atlet baru mengisi sebagian ukuran perlengkapan`, count: summaryPerlengkapan.sebagian })
    if (alerts.length === 0)
      alerts.push({ severity: 'info', icon: CheckCircle, title: 'Perlengkapan Lengkap', message: `Semua ${summaryPerlengkapan.total} atlet sudah lengkap data perlengkapan` })
    return alerts
  }, [summaryPerlengkapan])

  // ═════════ HANDLERS ═════════
  function openDokumenDetail(atlet: AtletInfo) {
    setSelectedAtlet(atlet)
    setModalType('dokumen')
  }

  function openPerlengkapanDetail(atlet: AtletInfo) {
    setSelectedAtlet(atlet)
    setModalType('perlengkapan')
    const existing = perlengkapanByAtlet[atlet.id]
    setEditForm(existing || { atlet_id: atlet.id })
  }

  function closeModal() {
    setSelectedAtlet(null)
    setEditForm({})
    setSaveSuccess(false)
  }

  async function handleSavePerlengkapan() {
    if (!selectedAtlet) return
    setIsSaving(true)
    try {
      const payload = {
        atlet_id: selectedAtlet.id,
        ukuran_kemeja:       editForm.ukuran_kemeja       || null,
        ukuran_jaket:        editForm.ukuran_jaket        || null,
        ukuran_kaos:         editForm.ukuran_kaos         || null,
        ukuran_celana:       editForm.ukuran_celana       || null,
        ukuran_sepatu:       editForm.ukuran_sepatu       || null,
        ukuran_topi:         editForm.ukuran_topi         || null,
        ukuran_training_set: editForm.ukuran_training_set || null,
        catatan:             editForm.catatan             || null,
        diisi_oleh:          'Admin',
      }

      const _res = await fetch('/api/operator/perlengkapan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const _out = await _res.json().catch(() => ({}))
      const data = _out.data
      const error = _res.ok ? null : { message: _out?.error || 'Gagal simpan perlengkapan' }
      
      if (error) throw error
      
      // Update local state
      setPerlengkapanList(prev => {
        const idx = prev.findIndex(p => p.atlet_id === selectedAtlet.id)
        if (idx >= 0) {
          const next = [...prev]; next[idx] = data; return next
        }
        return [...prev, data]
      })
      
      setSaveSuccess(true)
      setTimeout(() => { setSaveSuccess(false); closeModal() }, 1200)
    } catch (e) {
      console.error('[Save Perlengkapan]', e)
      alert('Gagal simpan data perlengkapan: ' + (e as any).message)
    } finally {
      setIsSaving(false)
    }
  }

  function placeholderAction(name: string) {
    alert(`🚧 Fitur "${name}" akan tersedia di update berikutnya.`)
  }

  function exportPerlengkapanPO() {
    // Generate CSV: per item, per ukuran, jumlah
    const rows = [['Item', 'Ukuran', 'Jumlah']]
    ITEM_PERLENGKAPAN_CFG.forEach(cfg => {
      cfg.options.forEach(opt => {
        const count = ukuranStats[cfg.key][opt] || 0
        if (count > 0) rows.push([cfg.label, opt, String(count)])
      })
      const belum = ukuranStats[cfg.key]['BELUM_DIISI'] || 0
      if (belum > 0) rows.push([cfg.label, 'Belum Diisi', String(belum)])
    })
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `perlengkapan_PO_kabbogor_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getAtletDokumen(atletId: number): Array<AtletDokumen & { jenis: JenisDokumen }> {
    return dokumens
      .filter(d => d.atlet_id === atletId)
      .map(d => ({ ...d, jenis: jenisList.find(j => j.id === d.jenis_id)! }))
      .filter(d => d.jenis)
  }

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  // ═════════════ RENDER ═════════════
  return (
    <div className="min-h-screen text-zinc-300 font-sans flex flex-col relative"
      style={{ background: 'linear-gradient(135deg,#020d06 0%,#040f08 100%)' }}>

      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`, backgroundSize: '32px 32px', zIndex: 0 }} />

      {/* HEADER */}
      <div className="sticky top-0 z-30 border-b backdrop-blur-xl px-6 py-4"
        style={{ background: 'rgba(2,13,6,0.95)', borderColor: `${ACCENT}12` }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}25` }}>
              <FileCheck size={20} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Dokumen & Perlengkapan Atlet</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Compliance & Logistik · Kab. Bogor · PORPROV XV
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {mainTab === 'perlengkapan' && (
              <button onClick={exportPerlengkapanPO}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
                <ShoppingBag size={12} /> Export PO Excel
              </button>
            )}
            {mainTab === 'dokumen' && (
              <>
                <button onClick={() => placeholderAction('Bulk Download ZIP')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#3b82f6' }}>
                  <Download size={12} /> Bulk Download
                </button>
                <button onClick={() => placeholderAction('Email Reminder Massal')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                  <Mail size={12} /> Send Reminder
                </button>
              </>
            )}
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center" style={{ color: ACCENT }}>
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-mono text-xs tracking-widest uppercase">Memuat data...</p>
          </div>
        ) : (
          <>
            {/* ════════ MAIN TABS ════════ */}
            <div {...ani(0)} className="grid grid-cols-2 gap-3">
              {[
                {
                  k: 'dokumen' as MainTab,
                  l: 'Dokumen Compliance',
                  sub: `${summaryDokumen.complete}/${summaryDokumen.total} lengkap`,
                  icon: FileText,
                  c: ACCENT,
                },
                {
                  k: 'perlengkapan' as MainTab,
                  l: 'Perlengkapan Atlet',
                  sub: `${summaryPerlengkapan.lengkap}/${summaryPerlengkapan.total} terisi`,
                  icon: Package,
                  c: '#a855f7',
                },
              ].map(t => {
                const active = mainTab === t.k
                const Icon = t.icon
                return (
                  <button key={t.k} onClick={() => setMainTab(t.k)}
                    className="rounded-2xl p-4 text-left transition-all relative overflow-hidden"
                    style={{
                      background: active ? `${t.c}10` : 'rgba(255,255,255,0.025)',
                      border: active ? `1px solid ${t.c}40` : '1px solid rgba(255,255,255,0.07)',
                      boxShadow: active ? `0 0 20px ${t.c}20` : 'none',
                    }}>
                    {active && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: t.c }} />}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: active ? `${t.c}20` : 'rgba(255,255,255,0.05)' }}>
                        <Icon size={18} style={{ color: active ? t.c : 'rgba(255,255,255,0.4)' }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold mb-0.5" style={{ color: active ? 'white' : 'rgba(255,255,255,0.7)' }}>
                          {t.l}
                        </div>
                        <div className="text-[10px]" style={{ color: active ? `${t.c}90` : 'rgba(255,255,255,0.4)' }}>
                          {t.sub}
                        </div>
                      </div>
                      {active && (
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: t.c }}>
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* ════════ CRITICAL ALERTS ════════ */}
            <div {...ani(10)} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CriticalAlertsCard
                primary={ACCENT}
                title="Dokumen Compliance"
                alerts={docAlerts}
              />
              <CriticalAlertsCard
                primary="#a855f7"
                title="Perlengkapan Atlet"
                alerts={perlengkapanAlerts}
              />
            </div>

            {/* ════════ TAB: DOKUMEN ════════ */}
            {mainTab === 'dokumen' && (
              <>
                {/* KPI Strip */}
                <div {...ani(20)} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { l: 'Lengkap',         v: summaryDokumen.complete,      c: '#10b981', icon: CheckCircle  },
                    { l: 'Pending Review',  v: summaryDokumen.pendingReview, c: '#3b82f6', icon: Clock        },
                    { l: 'Partial',         v: summaryDokumen.partial,       c: '#f59e0b', icon: AlertTriangle },
                    { l: 'Kosong',          v: summaryDokumen.empty,         c: '#ef4444', icon: XCircle      },
                    { l: 'Expired',         v: summaryDokumen.expired,       c: '#a855f7', icon: Calendar     },
                  ].map(s => (
                    <div key={s.l} className="rounded-2xl p-4 relative overflow-hidden"
                      style={{ background: `${s.c}08`, border: `1px solid ${s.c}25` }}>
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.c }} />
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-2">
                        <s.icon size={12} style={{ color: s.c }} />
                        {s.l}
                      </div>
                      <div className="text-3xl font-light" style={{ color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* Per Jenis Dokumen */}
                <div {...ani(30)} className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} style={{ color: ACCENT }} />
                    <h2 className="text-sm font-bold text-white">Status Per Jenis Dokumen</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {dokumenStats.map(stat => {
                      const Icon = ICON_MAP[stat.icon] || FileText
                      const pct = stat.total_atlet > 0 ? Math.round((stat.verified / stat.total_atlet) * 100) : 0
                      const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={stat.jenis_id} className="rounded-xl p-3"
                          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: `${barColor}15`, border: `1px solid ${barColor}30` }}>
                              <Icon size={13} style={{ color: barColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-bold text-zinc-200 truncate">{stat.nama}</div>
                              {!stat.is_mandatory && <span className="text-[8px] font-mono uppercase text-zinc-500">opsional</span>}
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1 mb-1.5">
                            <span className="text-xl font-black" style={{ color: barColor }}>{stat.verified}</span>
                            <span className="text-[10px] text-zinc-500">/ {stat.total_atlet}</span>
                            <span className="text-[10px] font-mono font-bold ml-auto" style={{ color: barColor }}>{pct}%</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Filter + Table */}
                <div {...ani(40)} className="rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Filter size={13} className="text-zinc-500" />
                  {([
                    { k: 'all',            l: `Semua (${summaryDokumen.total})`,            c: ACCENT    },
                    { k: 'complete',       l: `✅ Lengkap (${summaryDokumen.complete})`,    c: '#10b981' },
                    { k: 'pending_review', l: `⏳ Review (${summaryDokumen.pendingReview})`, c: '#3b82f6' },
                    { k: 'partial',        l: `⚠ Partial (${summaryDokumen.partial})`,      c: '#f59e0b' },
                    { k: 'empty',          l: `❌ Kosong (${summaryDokumen.empty})`,         c: '#ef4444' },
                  ] as const).map(f => (
                    <button key={f.k} onClick={() => setFilterCompliance(f.k as FilterCompliance)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        background: filterCompliance === f.k ? `${f.c}20` : 'rgba(255,255,255,0.04)',
                        color: filterCompliance === f.k ? f.c : 'rgba(255,255,255,0.4)',
                        border: filterCompliance === f.k ? `1px solid ${f.c}40` : '1px solid transparent',
                      }}>
                      {f.l}
                    </button>
                  ))}
                  <div className="relative ml-auto">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Cari nama, cabor, NIK..."
                      className="bg-transparent border rounded-xl pl-8 pr-4 py-2 text-xs text-zinc-200 outline-none w-64"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="max-h-[600px] overflow-y-auto"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}25 transparent` }}>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[9px] uppercase tracking-widest sticky top-0 z-10"
                          style={{ background: 'rgba(2,13,6,0.95)', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th className="px-4 py-3 font-bold">Atlet</th>
                          <th className="px-3 py-3 font-bold">Cabor</th>
                          <th className="px-3 py-3 font-bold text-center">Compliance</th>
                          <th className="px-3 py-3 font-bold text-center">Status</th>
                          <th className="px-3 py-3 font-bold text-center">Dokumen</th>
                          <th className="px-3 py-3 font-bold text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(displayedAtlets as any[]).map(a => {
                          const cfg = COMPLIANCE_CFG[a.status]
                          const barColor = a.pct >= 80 ? '#10b981' : a.pct >= 50 ? '#3b82f6' : a.pct >= 30 ? '#f59e0b' : '#ef4444'
                          return (
                            <tr key={a.id} className="border-b transition-colors hover:bg-white/[0.02]"
                              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                              <td className="px-4 py-3">
                                <div className="text-sm font-bold text-zinc-200">{a.nama_lengkap}</div>
                                <div className="text-[10px] font-mono mt-0.5 text-zinc-600">{a.no_ktp}</div>
                              </td>
                              <td className="px-3 py-3 text-[11px] text-zinc-400">{a.cabor_nama_raw}</td>
                              <td className="px-3 py-3">
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className="text-lg font-black" style={{ color: barColor }}>{a.pct}%</span>
                                  <div className="h-1 w-20 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: barColor }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                                  style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center text-[10px] font-mono">
                                <span className="text-emerald-400 font-bold">{a.total_verified}</span>
                                <span className="text-zinc-600 mx-1">/</span>
                                <span className="text-zinc-400">{totalMandatory}</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button onClick={() => openDokumenDetail(a)}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                                  <Eye size={11} className="inline mr-1" /> Detail
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ════════ TAB: PERLENGKAPAN ════════ */}
            {mainTab === 'perlengkapan' && (
              <>
                {/* KPI Strip */}
                <div {...ani(20)} className="grid grid-cols-3 gap-3">
                  {[
                    { l: 'Lengkap (7/7)',  v: summaryPerlengkapan.lengkap,  c: '#10b981', icon: CheckCircle },
                    { l: 'Sebagian',       v: summaryPerlengkapan.sebagian, c: '#f59e0b', icon: AlertTriangle },
                    { l: 'Belum Diisi',    v: summaryPerlengkapan.belum,    c: '#ef4444', icon: XCircle },
                  ].map(s => (
                    <div key={s.l} className="rounded-2xl p-4 relative overflow-hidden"
                      style={{ background: `${s.c}08`, border: `1px solid ${s.c}25` }}>
                      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.c }} />
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-2">
                        <s.icon size={12} style={{ color: s.c }} />
                        {s.l}
                      </div>
                      <div className="text-3xl font-light" style={{ color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* Stats per item per ukuran (purchase order summary) */}
                <div {...ani(30)} className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingBag size={14} style={{ color: '#a855f7' }} />
                    <h2 className="text-sm font-bold text-white">Rekap Pengadaan per Ukuran</h2>
                    <span className="ml-auto text-[10px] font-mono text-zinc-500">Untuk siap ke supplier</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {ITEM_PERLENGKAPAN_CFG.map(cfg => {
                      const Icon = cfg.icon
                      const stats = ukuranStats[cfg.key] || {}
                      const total = cfg.options.reduce((s, opt) => s + (stats[opt] || 0), 0)
                      return (
                        <div key={cfg.key} className="rounded-xl p-3"
                          style={{ background: `${cfg.color}06`, border: `1px solid ${cfg.color}25` }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                              <Icon size={13} style={{ color: cfg.color }} />
                            </div>
                            <div className="text-sm font-bold text-zinc-200">{cfg.label}</div>
                            <div className="ml-auto text-[10px] font-mono">
                              <span className="font-bold" style={{ color: cfg.color }}>{total}</span>
                              <span className="text-zinc-500"> diisi</span>
                              {stats.BELUM_DIISI > 0 && (
                                <>
                                  <span className="text-zinc-600"> · </span>
                                  <span className="text-red-400 font-bold">{stats.BELUM_DIISI}</span>
                                  <span className="text-zinc-500"> belum</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {cfg.options.map(opt => {
                              const count = stats[opt] || 0
                              if (count === 0) return null
                              return (
                                <div key={opt} className="px-2 py-1 rounded-md text-[10px] font-mono"
                                  style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}25` }}>
                                  <span className="font-bold" style={{ color: cfg.color }}>{opt}</span>
                                  <span className="text-zinc-400 ml-1">×{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Filter + Table */}
                <div {...ani(40)} className="rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Filter size={13} className="text-zinc-500" />
                  {([
                    { k: 'all',         l: `Semua (${summaryPerlengkapan.total})`,         c: ACCENT    },
                    { k: 'lengkap',     l: `✅ Lengkap (${summaryPerlengkapan.lengkap})`,  c: '#10b981' },
                    { k: 'sebagian',    l: `⚠ Sebagian (${summaryPerlengkapan.sebagian})`, c: '#f59e0b' },
                    { k: 'belum_diisi', l: `❌ Belum (${summaryPerlengkapan.belum})`,       c: '#ef4444' },
                  ] as const).map(f => (
                    <button key={f.k} onClick={() => setFilterPerlengkapan(f.k as FilterPerlengkapan)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        background: filterPerlengkapan === f.k ? `${f.c}20` : 'rgba(255,255,255,0.04)',
                        color: filterPerlengkapan === f.k ? f.c : 'rgba(255,255,255,0.4)',
                        border: filterPerlengkapan === f.k ? `1px solid ${f.c}40` : '1px solid transparent',
                      }}>
                      {f.l}
                    </button>
                  ))}
                  <div className="relative ml-auto">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Cari nama, cabor, NIK..."
                      className="bg-transparent border rounded-xl pl-8 pr-4 py-2 text-xs text-zinc-200 outline-none w-64"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="max-h-[600px] overflow-y-auto"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}25 transparent` }}>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[9px] uppercase tracking-widest sticky top-0 z-10"
                          style={{ background: 'rgba(2,13,6,0.95)', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th className="px-4 py-3 font-bold">Atlet</th>
                          <th className="px-3 py-3 font-bold">Cabor</th>
                          {ITEM_PERLENGKAPAN_CFG.map(cfg => (
                            <th key={cfg.key} className="px-2 py-3 font-bold text-center">{cfg.label}</th>
                          ))}
                          <th className="px-3 py-3 font-bold text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(displayedAtlets as any[]).map(a => (
                          <tr key={a.id} className="border-b transition-colors hover:bg-white/[0.02]"
                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                            <td className="px-4 py-3">
                              <div className="text-sm font-bold text-zinc-200">{a.nama_lengkap}</div>
                              <div className="text-[10px] font-mono mt-0.5 text-zinc-600">{a.no_ktp}</div>
                            </td>
                            <td className="px-3 py-3 text-[11px] text-zinc-400">{a.cabor_nama_raw}</td>
                            {ITEM_PERLENGKAPAN_CFG.map(cfg => {
                              const val = a.perlengkapan?.[cfg.key as ItemKey]
                              return (
                                <td key={cfg.key} className="px-2 py-3 text-center">
                                  {val ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                                      style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                                      {val}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-zinc-600">—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="px-3 py-3 text-center">
                              <button onClick={() => openPerlengkapanDetail(a)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7' }}>
                                <Edit3 size={11} className="inline mr-1" /> Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* ════════ MODAL CENTER ════════ */}
      {selectedAtlet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={closeModal}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: '#040f08',
              border: `1px solid ${modalType === 'dokumen' ? ACCENT : '#a855f7'}20`,
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              maxHeight: '90vh',
            }}>

            {/* Modal header */}
            <div className="flex items-start justify-between p-6 border-b flex-shrink-0"
              style={{ borderColor: `${modalType === 'dokumen' ? ACCENT : '#a855f7'}15`, background: `${modalType === 'dokumen' ? ACCENT : '#a855f7'}04` }}>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-1"
                  style={{ color: modalType === 'dokumen' ? ACCENT : '#a855f7' }}>
                  {modalType === 'dokumen' ? '📑 Dokumen Atlet' : '👕 Perlengkapan Atlet'}
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedAtlet.nama_lengkap}</h2>
                <div className="text-xs mt-1 text-zinc-500">
                  {selectedAtlet.cabor_nama_raw} · NIK: {selectedAtlet.no_ktp}
                </div>
              </div>
              <button onClick={closeModal}
                className="p-2 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6"
              style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}25 transparent` }}>

              {/* ── DOKUMEN MODE ── */}
              {modalType === 'dokumen' && (() => {
                const docs = getAtletDokumen(selectedAtlet.id)
                const score = computeComplianceScore(selectedAtlet.id, dokumens, totalMandatory)
                const cfg = COMPLIANCE_CFG[score.status]
                return (
                  <div className="space-y-4">
                    <div className="rounded-2xl p-4"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: cfg.color }}>
                            Compliance Score
                          </div>
                          <div className="text-4xl font-black mt-1" style={{ color: cfg.color }}>{score.pct}%</div>
                          <div className="text-xs font-bold mt-1" style={{ color: cfg.color }}>{cfg.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-zinc-500">Dokumen</div>
                          <div className="text-2xl font-black text-white">{score.verified}<span className="text-sm text-zinc-500">/{totalMandatory}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {jenisList.map(jenis => {
                        const dok = docs.find(d => d.jenis_id === jenis.id)
                        const Icon = ICON_MAP[jenis.icon] || FileText
                        const status: keyof typeof STATUS_CFG = dok ? dok.status : 'pending'
                        const stCfg = STATUS_CFG[status]
                        const expiry = dok ? checkExpiry(dok.tanggal_expired) : null

                        return (
                          <div key={jenis.id} className="rounded-xl p-3"
                            style={{
                              background: dok ? `${stCfg.color}06` : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${dok ? stCfg.color + '20' : 'rgba(255,255,255,0.05)'}`,
                            }}>
                            <div className="flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: `${stCfg.color}15`, border: `1px solid ${stCfg.color}30` }}>
                                <Icon size={12} style={{ color: stCfg.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <h4 className="text-xs font-bold text-zinc-200">{jenis.nama}</h4>
                                  {jenis.is_mandatory && (
                                    <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded"
                                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Wajib</span>
                                  )}
                                </div>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded inline-block"
                                  style={{ background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.color}30` }}>
                                  {stCfg.label}
                                </span>
                                {dok?.catatan && (
                                  <div className="mt-1.5 p-1.5 rounded text-[10px] text-zinc-400"
                                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                    💬 {dok.catatan}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="pt-4 border-t flex gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <button onClick={() => placeholderAction('Upload Dokumen')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, color: ACCENT }}>
                        <Upload size={13} /> Upload Dokumen
                      </button>
                      <button onClick={() => placeholderAction('Send Email Reminder')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                        <Send size={13} /> Kirim Reminder
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* ── PERLENGKAPAN MODE ── */}
              {modalType === 'perlengkapan' && (
                <div className="space-y-4">
                  <div className="text-[11px] text-zinc-400 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
                    <Package size={12} className="text-purple-400" />
                    Pilih ukuran perlengkapan untuk pengadaan kontingen
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ITEM_PERLENGKAPAN_CFG.map(cfg => {
                      const Icon = cfg.icon
                      const currentVal = editForm[cfg.key as ItemKey]
                      return (
                        <div key={cfg.key} className="rounded-xl p-3"
                          style={{ background: `${cfg.color}06`, border: `1px solid ${cfg.color}20` }}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                              <Icon size={13} style={{ color: cfg.color }} />
                            </div>
                            <span className="text-sm font-bold text-zinc-200">{cfg.label}</span>
                            {currentVal && (
                              <span className="ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                                style={{ background: `${cfg.color}20`, color: cfg.color }}>
                                {currentVal}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {cfg.options.map(opt => {
                              const isActive = currentVal === opt
                              return (
                                <button key={opt}
                                  onClick={() => setEditForm(f => ({ ...f, [cfg.key]: isActive ? null : opt }))}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                                  style={{
                                    background: isActive ? cfg.color : 'rgba(255,255,255,0.03)',
                                    color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                                    border: `1px solid ${isActive ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                                  }}>
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 block mb-1.5">
                      Catatan (Opsional)
                    </label>
                    <textarea
                      value={editForm.catatan || ''}
                      onChange={e => setEditForm(f => ({ ...f, catatan: e.target.value }))}
                      placeholder="Misal: sepatu cadangan, ukuran kepala besar perlu custom..."
                      rows={2}
                      className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none resize-none"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer (perlengkapan only) */}
            {modalType === 'perlengkapan' && (
              <div className="p-4 border-t flex items-center gap-3 flex-shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 mr-auto">
                    <CheckCircle size={12} /> Berhasil disimpan!
                  </div>
                )}
                <button onClick={closeModal} disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                  Batal
                </button>
                <button onClick={handleSavePerlengkapan} disabled={isSaving || !selectedAtlet}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40"
                  style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc' }}>
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {isSaving ? 'Menyimpan...' : 'Simpan Perlengkapan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}