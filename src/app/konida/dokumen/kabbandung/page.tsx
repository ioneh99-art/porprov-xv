'use client'
// src/app/konida/dokumen/kabbandung/page.tsx — v2
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
  type AtletComplianceStatus,
  computeComplianceScore, checkExpiry, formatRelativeTime,
  classifyAtletCompliance, countByAtletStatus, getDocCellState,
} from '@/lib/dokumen-helpers'
import { CriticalAlertsCard, type CriticalAlert } from '@/components/konida/DashboardHelpers'
import { AtletDokumenRowV2, type AtletRowData } from '@/components/konida/AtletDokumenRowV2'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const KONTINGEN_ID = 4
const ACCENT = '#38bdf8'

const ICON_MAP: Record<string, any> = {
  CreditCard, Users: UsersIcon, FileText, GraduationCap, Heart,
  Syringe, Receipt, Banknote, Camera, Image: ImageIcon,
}

type FilterCompliance = 'all' | AtletComplianceStatus
type SortMode        = 'urgency' | 'pct_asc' | 'pct_desc' | 'name' | 'cabor'
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
  { key: 'ukuran_sepatu',       label: 'Sepatu',        icon: Footprints, options: UKURAN_SEPATU, color: '#0ea5e9' },
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
  const [sortMode, setSortMode]                           = useState<SortMode>('urgency')
  const [filterMissingJenis, setFilterMissingJenis]       = useState<number | null>(null)
  const [expandedAtletId, setExpandedAtletId]             = useState<number | null>(null)
  const [listLimit, setListLimit]                         = useState(10)

  useEffect(() => { setListLimit(10) }, [filterCompliance, filterMissingJenis, search, sortMode])
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
        // Atlet fetch dengan pagination (>1000 records)
        let allAtlets: any[] = []
        for (let page = 0; ; page++) {
          const { data, error } = await sb.from('atlet')
            .select('id,nama_lengkap,no_ktp,cabor_nama_raw,status_registrasi')
            .eq('kontingen_id', KONTINGEN_ID)
            .range(page * 1000, (page + 1) * 1000 - 1)
          if (error) throw error
          if (!data || data.length === 0) break
          allAtlets = allAtlets.concat(data)
          if (data.length < 1000) break
        }

        const [jenisRes, dokRes, statsRes, perlengkapanRes] = await Promise.all([
          sb.from('dokumen_jenis').select('*').order('urutan'),
          sb.from('atlet_dokumen').select('*'),
          sb.from('v_dokumen_stats').select('*'),
          sb.from('atlet_perlengkapan').select('*'),
        ])

        if (jenisRes.data) setJenisList(jenisRes.data as JenisDokumen[])
        if (dokRes.data) setDokumens(dokRes.data as AtletDokumen[])
        setAtlets(allAtlets as AtletInfo[])
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

  const atletCompliance = useMemo<AtletRowData[]>(() => {
    return atlets.map(a => {
      const cls = classifyAtletCompliance({ atletId: a.id, dokumens, jenisList })
      const pct = totalMandatory > 0
        ? Math.round((cls.verified / totalMandatory) * 100)
        : 0
      return {
        id:                a.id,
        nama_lengkap:      a.nama_lengkap,
        no_ktp:            a.no_ktp,
        cabor_nama_raw:    a.cabor_nama_raw,
        status_registrasi: a.status_registrasi,
        pct,
        status:            cls.status,
        urgencyScore:      cls.urgencyScore,
        verified:          cls.verified,
        pendingReview:     cls.pendingReview,
        rejected:          cls.rejected,
        expired:           cls.expired,
        expiringSoon:      cls.expiringSoon,
        empty:             cls.empty,
      }
    })
  }, [atlets, dokumens, jenisList, totalMandatory])

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

  // ═════════ FILTER + SORT + SEARCH ═════════
  const displayedAtlets = useMemo<any[]>(() => {
    if (mainTab === 'dokumen') {
      let list: AtletRowData[] = atletCompliance

      if (filterCompliance !== 'all')
        list = list.filter(a => a.status === filterCompliance)

      if (filterMissingJenis !== null) {
        list = list.filter(a => {
          const atletDocs = dokumens.filter(d => d.atlet_id === a.id)
          const state = getDocCellState({ id: filterMissingJenis! }, atletDocs)
          return state !== 'verified'
        })
      }

      if (search) {
        const q = search.toLowerCase()
        list = list.filter(a =>
          a.nama_lengkap.toLowerCase().includes(q) ||
          a.cabor_nama_raw.toLowerCase().includes(q) ||
          a.no_ktp?.includes(q)
        )
      }

      list = [...list].sort((a, b) => {
        switch (sortMode) {
          case 'urgency':  return b.urgencyScore - a.urgencyScore
          case 'pct_asc':  return a.pct - b.pct
          case 'pct_desc': return b.pct - a.pct
          case 'name':     return a.nama_lengkap.localeCompare(b.nama_lengkap)
          case 'cabor':    return a.cabor_nama_raw.localeCompare(b.cabor_nama_raw)
          default:         return 0
        }
      })

      return list
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
  }, [mainTab, atletCompliance, atletWithPerlengkapan, filterCompliance, filterMissingJenis, filterPerlengkapan, search, sortMode, dokumens])

  // ═════════ SUMMARY ═════════
  const summaryDokumen = useMemo(() => {
    const counts = countByAtletStatus(atletCompliance)
    let totalExpired = 0
    dokumens.forEach(d => {
      const exp = checkExpiry(d.tanggal_expired)
      if (exp.isExpired) totalExpired++
    })
    return { ...counts, expiredDocs: totalExpired, total: atletCompliance.length }
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
    if (summaryDokumen.critical > 0)
      alerts.push({ severity: 'urgent', icon: AlertTriangle, title: 'Status Critical',
        message: `${summaryDokumen.critical} atlet butuh perhatian segera (rejected/expired/zero verified)`,
        count: summaryDokumen.critical })
    if (summaryDokumen.expiring > 0)
      alerts.push({ severity: 'urgent', icon: Calendar, title: 'Dokumen Expiring Soon',
        message: `${summaryDokumen.expiring} atlet punya dokumen yang akan expired <30 hari`,
        count: summaryDokumen.expiring })
    if (summaryDokumen.in_review > 0)
      alerts.push({ severity: 'important', icon: Clock, title: 'Menunggu Verifikasi',
        message: `${summaryDokumen.in_review} atlet semua dokumennya sudah upload, belum diverifikasi`,
        count: summaryDokumen.in_review })
    if (summaryDokumen.incomplete > 0)
      alerts.push({ severity: 'important', icon: AlertTriangle, title: 'Dokumen Tidak Lengkap',
        message: `${summaryDokumen.incomplete} atlet baru upload sebagian dokumen wajib`,
        count: summaryDokumen.incomplete })
    if (alerts.length === 0)
      alerts.push({ severity: 'info', icon: CheckCircle, title: 'Dokumen Aman',
        message: `${summaryDokumen.compliant} dari ${summaryDokumen.total} atlet sudah lengkap & valid` })
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

      const { data, error } = await sb.from('atlet_perlengkapan')
        .upsert(payload, { onConflict: 'atlet_id' })
        .select()
        .single()
      
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
    a.download = `perlengkapan_PO_kabbandung_${new Date().toISOString().slice(0, 10)}.csv`
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
      style={{ background: 'linear-gradient(135deg,#020a14 0%,#03101c 100%)' }}>

      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${ACCENT}03 1px,transparent 1px),linear-gradient(90deg,${ACCENT}03 1px,transparent 1px)`, backgroundSize: '32px 32px', zIndex: 0 }} />

      {/* HEADER */}
      <div className="sticky top-0 z-30 border-b backdrop-blur-xl px-6 py-4"
        style={{ background: 'rgba(2,10,20,0.95)', borderColor: `${ACCENT}12` }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}25` }}>
              <FileCheck size={20} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Dokumen & Perlengkapan Atlet</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Compliance & Logistik · Kab. Bandung · PORPROV XV
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {mainTab === 'perlengkapan' && (
              <button onClick={exportPerlengkapanPO}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#0ea5e9' }}>
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
                  sub: `${summaryDokumen.compliant}/${summaryDokumen.total} lengkap`,
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
                {/* KPI Strip — 5 clickable status cards */}
                <div {...ani(20)} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {([
                    { k: 'critical',   l: 'Critical',   v: summaryDokumen.critical,   c: '#ef4444', icon: AlertTriangle },
                    { k: 'incomplete', l: 'Incomplete', v: summaryDokumen.incomplete, c: '#f59e0b', icon: AlertTriangle },
                    { k: 'in_review',  l: 'In Review',  v: summaryDokumen.in_review,  c: '#3b82f6', icon: Clock         },
                    { k: 'expiring',   l: 'Expiring',   v: summaryDokumen.expiring,   c: '#eab308', icon: Calendar      },
                    { k: 'compliant',  l: 'Compliant',  v: summaryDokumen.compliant,  c: '#10b981', icon: CheckCircle   },
                  ] as const).map(s => {
                    const Icon = s.icon
                    const active = filterCompliance === s.k
                    return (
                      <button key={s.k}
                        onClick={() => setFilterCompliance(active ? 'all' : s.k)}
                        className="rounded-2xl p-4 relative overflow-hidden text-left transition-all"
                        style={{
                          background:  active ? `${s.c}14` : `${s.c}08`,
                          border:      `1px solid ${active ? s.c + '60' : s.c + '25'}`,
                          boxShadow:   active ? `0 0 16px ${s.c}30` : 'none',
                        }}>
                        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.c }}/>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest font-mono mb-2">
                          <Icon size={12} style={{ color: s.c }}/> {s.l}
                        </div>
                        <div className="text-3xl font-light tabular-nums" style={{ color: s.c }}>{s.v}</div>
                      </button>
                    )
                  })}
                </div>

                {/* Per Jenis Dokumen — interactive (click to filter missing) */}
                <div {...ani(30)} className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} style={{ color: ACCENT }}/>
                    <h2 className="text-sm font-bold text-white">Status Per Jenis Dokumen</h2>
                    {filterMissingJenis !== null && (
                      <button onClick={() => setFilterMissingJenis(null)}
                        className="ml-auto text-[10px] font-bold px-2 py-1 rounded-md transition-all"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <X size={10} className="inline mr-1"/> Clear filter: missing {dokumenStats.find(s => s.jenis_id === filterMissingJenis)?.kode}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {dokumenStats.map(stat => {
                      const Icon = ICON_MAP[stat.icon] || FileText
                      const pct = stat.total_atlet > 0 ? Math.round((stat.verified / stat.total_atlet) * 100) : 0
                      const barColor = pct >= 80 ? '#0ea5e9' : pct >= 50 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#ef4444'
                      const active = filterMissingJenis === stat.jenis_id
                      return (
                        <button key={stat.jenis_id}
                          onClick={() => setFilterMissingJenis(active ? null : stat.jenis_id)}
                          title={`Klik untuk filter atlet yang missing ${stat.kode}`}
                          className="rounded-xl p-3 text-left transition-all hover:scale-[1.02]"
                          style={{
                            background: active ? `${barColor}15` : 'rgba(255,255,255,0.025)',
                            border:     `1px solid ${active ? barColor + '50' : 'rgba(255,255,255,0.06)'}`,
                          }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: `${barColor}15`, border: `1px solid ${barColor}30` }}>
                              <Icon size={13} style={{ color: barColor }}/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-bold text-zinc-200 truncate">{stat.nama}</div>
                              {!stat.is_mandatory && <span className="text-[8px] font-mono uppercase text-zinc-500">opsional</span>}
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1 mb-1.5">
                            <span className="text-xl font-black tabular-nums" style={{ color: barColor }}>{stat.verified}</span>
                            <span className="text-[10px] text-zinc-500">/ {stat.total_atlet}</span>
                            <span className="text-[10px] font-mono font-bold ml-auto tabular-nums" style={{ color: barColor }}>{pct}%</span>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-1000"
                              style={{ width: `${pct}%`, background: barColor }}/>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sort + Filter + Search bar */}
                <div {...ani(40)} className="rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Urutkan</span>
                    <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
                      className="text-[11px] px-3 py-1.5 rounded-lg outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}>
                      <option value="urgency">Urgensi (default)</option>
                      <option value="pct_asc">Compliance % (rendah dulu)</option>
                      <option value="pct_desc">Compliance % (tinggi dulu)</option>
                      <option value="name">Nama A-Z</option>
                      <option value="cabor">Cabor A-Z</option>
                    </select>
                  </div>

                  {filterCompliance !== 'all' && (
                    <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <button onClick={() => setFilterCompliance('all')}
                        className="text-[10px] font-bold px-2 py-1 rounded-md transition-all flex items-center gap-1"
                        style={{ background: 'rgba(56,189,248,0.10)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
                        <X size={10}/> Status: {filterCompliance}
                      </button>
                    </div>
                  )}

                  <div className="relative ml-auto">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Cari nama, cabor, NIK..."
                      className="bg-transparent border rounded-xl pl-8 pr-4 py-2 text-xs text-zinc-200 outline-none w-64"
                      style={{ borderColor: 'rgba(255,255,255,0.10)' }}/>
                  </div>
                </div>

                {/* Atlet List V2 — tampil 10, load more on demand */}
                {(() => {
                  const list         = displayedAtlets as AtletRowData[]
                  const visible      = list.slice(0, listLimit)
                  const remaining    = list.length - listLimit
                  const mandatoryFiltered = jenisList
                    .filter(j => j.is_mandatory)
                    .sort((x, y) => x.urutan - y.urutan)

                  return (
                    <div className="space-y-2">
                      {visible.map(a => {
                        const isExpanded    = expandedAtletId === a.id
                        const atletDokumens = dokumens.filter(d => d.atlet_id === a.id)
                        return (
                          <AtletDokumenRowV2
                            key={a.id}
                            atlet={a}
                            mandatoryJenis={mandatoryFiltered}
                            atletDokumens={atletDokumens}
                            isExpanded={isExpanded}
                            onToggle={() => setExpandedAtletId(isExpanded ? null : a.id)}
                            onAction={(action) => {
                              if (action === 'open_detail') {
                                openDokumenDetail({
                                  id: a.id, nama_lengkap: a.nama_lengkap, no_ktp: a.no_ktp,
                                  cabor_nama_raw: a.cabor_nama_raw, status_registrasi: a.status_registrasi,
                                })
                              } else if (action === 'send_reminder') {
                                placeholderAction('Send Reminder')
                              } else if (action === 'download') {
                                placeholderAction('Download verified')
                              }
                            }}
                          />
                        )
                      })}

                      {remaining > 0 && (
                        <button
                          onClick={() => setListLimit(l => l + 10)}
                          className="w-full py-3 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)' }}>
                          Lihat {remaining} atlet lainnya ↓
                        </button>
                      )}

                      {list.length === 0 && (
                        <div className="py-12 text-center rounded-xl"
                          style={{ border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }}>
                          <Search size={24} className="mx-auto mb-3 opacity-30"/>
                          <p className="text-sm">Tidak ada atlet yang cocok dengan filter</p>
                          {(filterCompliance !== 'all' || filterMissingJenis !== null || search) && (
                            <button
                              onClick={() => { setFilterCompliance('all'); setFilterMissingJenis(null); setSearch('') }}
                              className="mt-3 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                              style={{ background: 'rgba(56,189,248,0.10)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>
                              Reset semua filter
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
            )}

            {/* ════════ TAB: PERLENGKAPAN ════════ */}
            {mainTab === 'perlengkapan' && (
              <>
                {/* KPI Strip */}
                <div {...ani(20)} className="grid grid-cols-3 gap-3">
                  {[
                    { l: 'Lengkap (7/7)',  v: summaryPerlengkapan.lengkap,  c: '#0ea5e9', icon: CheckCircle },
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
                    { k: 'lengkap',     l: `✅ Lengkap (${summaryPerlengkapan.lengkap})`,  c: '#0ea5e9' },
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
                          style={{ background: 'rgba(2,10,20,0.95)', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
              background: '#03101c',
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
                  <div className="flex items-center gap-2 text-xs text-sky-400 mr-auto">
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