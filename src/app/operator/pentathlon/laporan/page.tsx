'use client'
// src/app/operator/pentathlon/laporan/page.tsx
// Pusat Laporan Operator Pentathlon — mirror kab.bandung design, amber accent

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  FileText, Download, Printer, Users, ShieldCheck,
  FileSearch, CheckCircle, RefreshCw, AlertTriangle, X,
  BarChart2, Loader2, Info, Activity, Trophy, Star,
  XCircle, Clock, Eye, ArrowLeft, TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ACCENT    = '#f59e0b'
const NAMA_CABOR = 'PENTATHLON'

function hitungUmur(tgl: string) {
  if (!tgl) return 0
  return Math.floor((Date.now() - new Date(tgl).getTime()) / (365.25 * 24 * 3600 * 1000))
}

function Bar({ value, max, color, h = 5 }: { value: number; max: number; color: string; h?: number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height: h, background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${max > 0 ? Math.min(value / max * 100, 100) : 0}%`, background: color }} />
    </div>
  )
}

interface AtletDB {
  id: number; nama_lengkap: string; no_ktp: string; tgl_lahir: string
  gender: string; no_registrasi_koni: number | null; status_registrasi: string
  ukuran_kemeja: string | null; ukuran_sepatu: string | null
  nama_bank: string | null; no_rekening: string | null
  kode_asal_daerah: string | null; nama_asal_daerah: string | null
}
interface TesFisik { atlet_id: number; bmi: number | null; kesimpulan_persen: number | null; kesimpulan_kategori: string | null }
interface Riwayat  { atlet_id: number; hasil: string }

type ReportCategory = 'Admin' | 'Logistik' | 'Sport Science' | 'Prestasi' | 'Audit'
type TabFilter = 'Semua' | 'Featured' | ReportCategory

interface ReportDef {
  id: string; title: string; category: ReportCategory; desc: string
  icon: any; color: string; count: number; countLabel: string
  completion: number; completionLabel: string; isDemo: boolean; isFeatured?: boolean
}

// ── Preview Modal ──────────────────────────────────────────
function PreviewModal({ title, data, columns, isDemo, onClose, onExportCSV, onPrint }:
  { title: string; data: any[][]; columns: string[]; isDemo: boolean; onClose: () => void; onExportCSV: () => void; onPrint: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-[1000px] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#03101c', border: `1px solid ${isDemo ? 'rgba(245,158,11,0.3)' : `${ACCENT}20`}`, maxHeight: '85vh', boxShadow: '0 25px 60px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: `${ACCENT}12`, background: `${ACCENT}04` }}>
          <div className="flex-1">
            <div className="text-white font-bold flex items-center gap-2 flex-wrap">
              {title}
              {isDemo && <span className="text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest" style={{ background: 'rgba(245,158,11,0.15)', color: ACCENT, border: `1px solid rgba(245,158,11,0.35)` }}>⚠ DEMO</span>}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Preview {Math.min(data.length, 50)} dari {data.length} baris · {columns.length} kolom
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, color: ACCENT }}>
              <Download size={13} /> Export CSV
            </button>
            <button onClick={onPrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              <Printer size={13} /> Print
            </button>
            <button onClick={onClose} className="p-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              <X size={15} />
            </button>
          </div>
        </div>
        {isDemo && (
          <div className="px-6 py-2.5 flex items-center gap-2 text-[11px]"
            style={{ background: 'rgba(245,158,11,0.06)', borderBottom: `1px solid rgba(245,158,11,0.15)`, color: ACCENT }}>
            <AlertTriangle size={12} />
            <span>Laporan ini berisi data preview/dummy.</span>
          </div>
        )}
        <div className="overflow-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}25 transparent` }}>
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="sticky top-0" style={{ background: 'rgba(2,10,20,0.98)' }}>
                <th className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', width: 40 }}>No</th>
                {columns.map(c => <th key={c} className="px-4 py-3 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row, i) => (
                <tr key={i} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-2.5 text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{i + 1}</td>
                  {row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-xs text-zinc-300 whitespace-nowrap">{cell ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 50 && <div className="px-4 py-3 text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Preview 50 dari {data.length} baris. Export CSV untuk data lengkap.</div>}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
export default function PageLaporanPentathlon() {
  const [atlets,       setAtlets]       = useState<AtletDB[]>([])
  const [tesFisikData, setTesFisikData] = useState<TesFisik[]>([])
  const [riwayatData,  setRiwayatData]  = useState<Riwayat[]>([])
  const [caborNama,    setCaborNama]    = useState(NAMA_CABOR)
  const [loading,      setLoading]      = useState(true)
  const [generating,   setGenerating]   = useState<string | null>(null)
  const [activeTab,    setActiveTab]    = useState<TabFilter>('Featured')
  const [preview,      setPreview]      = useState<{ title: string; data: any[][]; columns: string[]; isDemo: boolean } | null>(null)
  const [animIn,       setAnimIn]       = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  useEffect(() => {
    async function load() {
      try {
        const me = await fetch('/api/auth/me').then(r => r.json())
        const caborId = me.cabor_id
        if (me.cabor_nama) setCaborNama(me.cabor_nama.toUpperCase())

        const atletRes = await sb
          .from('atlet')
          .select('id,nama_lengkap,no_ktp,tgl_lahir,gender,no_registrasi_koni,status_registrasi,ukuran_kemeja,ukuran_sepatu,nama_bank,no_rekening,kode_asal_daerah,nama_asal_daerah')
          .eq('cabor_id', caborId)
          .order('nama_lengkap', { ascending: true })

        const ids = (atletRes.data ?? []).map((a: any) => a.id)
        setAtlets((atletRes.data ?? []) as AtletDB[])

        if (ids.length > 0) {
          const [tesRes, riwayatRes] = await Promise.all([
            sb.from('atlet_tes_fisik').select('atlet_id,bmi,kesimpulan_persen,kesimpulan_kategori').in('atlet_id', ids),
            sb.from('riwayat_prestasi').select('atlet_id,hasil').in('atlet_id', ids),
          ])
          setTesFisikData((tesRes.data ?? []) as TesFisik[])
          setRiwayatData((riwayatRes.data ?? []) as Riwayat[])
        }
      } catch (e) {
        console.error('[Laporan] Load error:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const tesFisikMap = useMemo(() => {
    const m: Record<number, TesFisik> = {}
    tesFisikData.forEach(t => (m[t.atlet_id] = t))
    return m
  }, [tesFisikData])

  const analytics = useMemo(() => {
    const total        = atlets.length
    const verified     = atlets.filter(a => a.status_registrasi === 'Verified' || a.status_registrasi === 'Posted').length
    const hasApparel   = atlets.filter(a => a.ukuran_kemeja && a.ukuran_sepatu).length
    const hasRek       = atlets.filter(a => a.nama_bank && a.no_rekening).length
    const hasNIK       = atlets.filter(a => a.no_ktp && a.no_ktp.length === 16).length
    const sudahTes     = tesFisikData.length
    const skorTinggi   = tesFisikData.filter(t => (t.kesimpulan_persen || 0) >= 80).length
    const skorRendah   = tesFisikData.filter(t => (t.kesimpulan_persen || 0) < 50).length
    const avgSkor      = sudahTes > 0 ? Math.round(tesFisikData.reduce((s, t) => s + (t.kesimpulan_persen || 0), 0) / sudahTes) : 0
    const totalEmas    = riwayatData.filter(r => r.hasil === 'Emas').length
    const totalPerak   = riwayatData.filter(r => r.hasil === 'Perak').length
    const totalPerunggu = riwayatData.filter(r => r.hasil === 'Perunggu').length
    const atletDenganPrestasi = new Set(riwayatData.map(r => r.atlet_id)).size
    return { total, verified, hasApparel, hasRek, hasNIK, sudahTes, skorTinggi, skorRendah, avgSkor, totalEmas, totalPerak, totalPerunggu, atletDenganPrestasi }
  }, [atlets, tesFisikData, riwayatData])

  const getLaporanData = useCallback((id: string): { title: string; columns: string[]; data: any[][]; isDemo: boolean } => {
    const verified = atlets.filter(a => a.status_registrasi === 'Verified' || a.status_registrasi === 'Posted')
    const tanggal  = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    const cabor    = caborNama

    switch (id) {
      case 'sk-cabor': {
        const cols = ['No Reg KONI', 'Nama Lengkap', 'NIK / KTP', 'Tgl Lahir', 'Usia', 'Gender', 'Status']
        const data = verified.map(a => [
          a.no_registrasi_koni || '-', a.nama_lengkap, a.no_ktp || '-', a.tgl_lahir,
          hitungUmur(a.tgl_lahir) + ' th',
          a.gender === 'L' ? 'Putra' : 'Putri',
          a.status_registrasi,
        ])
        return { title: `Rekapitulasi Atlet ${cabor} — ${tanggal}`, columns: cols, data, isDemo: false }
      }

      case 'apparel': {
        const cols = ['Nama Lengkap', 'Gender', 'Ukuran Kemeja', 'Ukuran Sepatu', 'Status']
        const data = atlets.map(a => [
          a.nama_lengkap, a.gender === 'L' ? 'Putra' : 'Putri',
          a.ukuran_kemeja || 'BELUM ISI', a.ukuran_sepatu || 'BELUM ISI',
          a.ukuran_kemeja && a.ukuran_sepatu ? 'Lengkap' : 'Belum Lengkap',
        ])
        return { title: `Logistik Apparel ${cabor} — ${tanggal}`, columns: cols, data, isDemo: false }
      }

      case 'rekening': {
        const cols = ['Nama Lengkap', 'Bank', 'No Rekening', 'Status']
        const data = atlets.map(a => [
          a.nama_lengkap,
          a.nama_bank || 'BELUM ISI', a.no_rekening || 'BELUM ISI',
          a.nama_bank && a.no_rekening ? 'Lengkap' : 'Belum Lengkap',
        ])
        return { title: `Daftar Rekening Atlet ${cabor} — ${tanggal}`, columns: cols, data, isDemo: false }
      }

      case 'biomotorik': {
        const cols = ['Nama Lengkap', 'Gender', 'Skor (%)', 'Kategori', 'BMI', 'Status Tes']
        const data = atlets.map(a => {
          const t = tesFisikMap[a.id]
          return [
            a.nama_lengkap, a.gender === 'L' ? 'Putra' : 'Putri',
            t?.kesimpulan_persen != null ? t.kesimpulan_persen + '%' : '—',
            t?.kesimpulan_kategori || '—',
            t?.bmi?.toFixed(1) || '—',
            t ? 'Sudah Tes' : 'Belum Tes',
          ]
        }).sort((a: any, b: any) => parseInt(b[2]) - parseInt(a[2]))
        return { title: `Laporan Tes Biomotorik ${cabor} — ${tanggal}`, columns: cols, data, isDemo: false }
      }

      case 'top-performer': {
        const cols = ['Rank', 'Nama Lengkap', 'Gender', 'Skor (%)', 'Kategori', 'BMI']
        const data = atlets
          .filter(a => tesFisikMap[a.id]?.kesimpulan_persen != null)
          .sort((a, b) => (tesFisikMap[b.id]!.kesimpulan_persen || 0) - (tesFisikMap[a.id]!.kesimpulan_persen || 0))
          .map((a, i) => {
            const t = tesFisikMap[a.id]!
            return [i + 1, a.nama_lengkap, a.gender === 'L' ? 'Putra' : 'Putri', t.kesimpulan_persen + '%', t.kesimpulan_kategori || '-', t.bmi?.toFixed(1) || '-']
          })
        return { title: `Top Performer Biomotorik ${cabor} — ${tanggal}`, columns: cols, data, isDemo: false }
      }

      case 'atlet-risk': {
        const cols = ['Nama Lengkap', 'Gender', 'Skor (%)', 'Kategori', 'BMI', 'Rekomendasi']
        const data = atlets
          .filter(a => { const t = tesFisikMap[a.id]; return t?.kesimpulan_persen != null && t.kesimpulan_persen < 50 })
          .map(a => {
            const t = tesFisikMap[a.id]!
            return [a.nama_lengkap, a.gender === 'L' ? 'Putra' : 'Putri', t.kesimpulan_persen + '%', t.kesimpulan_kategori || '-', t.bmi?.toFixed(1) || '-', 'Latihan tambahan diperlukan']
          })
          .sort((a: any, b: any) => parseInt(a[2]) - parseInt(b[2]))
        return { title: `Atlet Risk Performance ${cabor} — ${tanggal}`, columns: cols, data, isDemo: false }
      }

      case 'audit-nik': {
        const cols = ['Nama', 'NIK', 'Panjang', 'Valid?', 'Gender', 'Status']
        const data = atlets.map(a => [
          a.nama_lengkap, a.no_ktp || '-',
          String(a.no_ktp || '').length,
          String(a.no_ktp || '').length === 16 ? '✓ Valid' : '✗ Invalid',
          a.gender, a.status_registrasi,
        ])
        return { title: `Audit NIK Atlet ${cabor} — ${tanggal}`, columns: cols, data, isDemo: false }
      }

      case 'prestasi': {
        const cols = ['Nama Lengkap', 'Gender', 'Emas', 'Perak', 'Perunggu', 'Total Prestasi']
        const atletPrestasi: Record<number, { e: number; p: number; pg: number }> = {}
        riwayatData.forEach(r => {
          if (!atletPrestasi[r.atlet_id]) atletPrestasi[r.atlet_id] = { e: 0, p: 0, pg: 0 }
          if (r.hasil === 'Emas')     atletPrestasi[r.atlet_id].e++
          if (r.hasil === 'Perak')    atletPrestasi[r.atlet_id].p++
          if (r.hasil === 'Perunggu') atletPrestasi[r.atlet_id].pg++
        })
        const data = atlets
          .filter(a => atletPrestasi[a.id])
          .map(a => {
            const p = atletPrestasi[a.id]
            return [a.nama_lengkap, a.gender === 'L' ? 'Putra' : 'Putri', p.e, p.p, p.pg, p.e + p.p + p.pg]
          })
          .sort((a: any, b: any) => (b[2] + b[3] + b[4]) - (a[2] + a[3] + a[4]))
        return { title: `Rekap Prestasi Atlet ${cabor} — ${tanggal}`, columns: cols, data, isDemo: false }
      }

      default:
        return { title: '', columns: [], data: [], isDemo: false }
    }
  }, [atlets, tesFisikMap, riwayatData, caborNama])

  function exportCSV(id: string) {
    const { title, columns, data } = getLaporanData(id)
    const rows = [columns, ...data]
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const el   = document.createElement('a')
    el.href    = url
    el.download = `${id}_pentathlon_${new Date().toISOString().slice(0, 10)}.csv`
    el.click(); URL.revokeObjectURL(url)
  }

  function printLaporan(id: string) {
    const { title, columns, data, isDemo } = getLaporanData(id)
    const html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:20px}
      h2{font-size:13px;margin-bottom:4px}p{color:#666;margin-bottom:14px;font-size:10px}
      table{width:100%;border-collapse:collapse}
      th{background:#78350f;color:#fff;padding:5px 8px;text-align:left;font-size:9px;text-transform:uppercase}
      td{padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:9px}
      tr:nth-child(even){background:#fffbeb}
      .demo{background:#fef3c7;color:#92400e;padding:6px 12px;border:1px solid #fbbf24;border-radius:4px;margin-bottom:12px;font-weight:bold}
      @media print{button{display:none}}
    </style></head><body>
    <h2>${title}</h2>
    <p>${caborNama} · PORPROV XV Jawa Barat 2026 · ${data.length} baris</p>
    ${isDemo ? '<div class="demo">⚠ DATA DEMO/PREVIEW</div>' : ''}
    <button onclick="window.print()" style="margin-bottom:12px;padding:6px 16px;background:#78350f;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px">🖨 Print</button>
    <table><thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${data.map(row => `<tr>${row.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></body></html>`
    const w = window.open('', '_blank')
    w?.document.write(html); w?.document.close()
  }

  function handleGenerate(id: string, mode: 'preview' | 'csv' | 'print') {
    setGenerating(id)
    setTimeout(() => {
      if (mode === 'preview') {
        const { title, columns, data, isDemo } = getLaporanData(id)
        setPreview({ title, columns, data, isDemo })
      } else if (mode === 'csv') {
        exportCSV(id)
      } else {
        printLaporan(id)
      }
      setGenerating(null)
    }, 300)
  }

  const REPORTS: ReportDef[] = [
    { id: 'biomotorik',    title: 'Tes Biomotorik', category: 'Sport Science', desc: 'Skor fisik + kategori + BMI per atlet dari FPOK UPI.', icon: Activity, color: ACCENT, isFeatured: true, isDemo: false, count: analytics.sudahTes, countLabel: 'atlet tested', completion: analytics.total > 0 ? Math.round(analytics.sudahTes / analytics.total * 100) : 0, completionLabel: `avg skor ${analytics.avgSkor}%` },
    { id: 'top-performer', title: 'Top Performer', category: 'Sport Science', desc: 'Ranking atlet berdasarkan skor biomotorik tertinggi.', icon: Star, color: '#fbbf24', isFeatured: true, isDemo: false, count: analytics.skorTinggi, countLabel: 'atlet elit ≥80%', completion: analytics.sudahTes > 0 ? Math.round(analytics.skorTinggi / analytics.sudahTes * 100) : 0, completionLabel: 'dari yg sudah tes' },
    { id: 'sk-cabor',      title: 'SK Atlet Cabor', category: 'Admin', desc: 'Daftar atlet lolos verifikasi untuk lampiran SK.', icon: Users, color: '#22d3ee', isFeatured: true, isDemo: false, count: analytics.verified, countLabel: 'atlet lolos', completion: analytics.total > 0 ? Math.round(analytics.verified / analytics.total * 100) : 0, completionLabel: 'terverifikasi' },
    { id: 'prestasi',      title: 'Rekap Prestasi', category: 'Prestasi', desc: 'Akumulasi medali per atlet (PORPROV, PON, KEJURNAS).', icon: Trophy, color: '#fbbf24', isFeatured: true, isDemo: false, count: analytics.atletDenganPrestasi, countLabel: 'atlet berprestasi', completion: analytics.total > 0 ? Math.round(analytics.atletDenganPrestasi / analytics.total * 100) : 0, completionLabel: `${analytics.totalEmas}🥇 ${analytics.totalPerak}🥈 ${analytics.totalPerunggu}🥉` },
    { id: 'atlet-risk',    title: 'Atlet Risk Performance', category: 'Sport Science', desc: 'Atlet skor biomotorik < 50% — perlu latihan intensif.', icon: AlertTriangle, color: '#ef4444', isDemo: false, count: analytics.skorRendah, countLabel: 'atlet risk', completion: analytics.sudahTes > 0 ? Math.round(analytics.skorRendah / analytics.sudahTes * 100) : 0, completionLabel: 'dari yg sudah tes' },
    { id: 'apparel',       title: 'Logistik & Apparel', category: 'Logistik', desc: 'Rekap ukuran kemeja & sepatu per atlet.', icon: ShieldCheck, color: '#a855f7', isDemo: false, count: analytics.hasApparel, countLabel: 'data lengkap', completion: analytics.total > 0 ? Math.round(analytics.hasApparel / analytics.total * 100) : 0, completionLabel: `${analytics.total - analytics.hasApparel} belum isi` },
    { id: 'rekening',      title: 'Rekening & Keuangan', category: 'Admin', desc: 'Daftar bank & nomor rekening untuk transfer bonus.', icon: ShieldCheck, color: '#fbbf24', isDemo: false, count: analytics.hasRek, countLabel: 'rekening terdata', completion: analytics.total > 0 ? Math.round(analytics.hasRek / analytics.total * 100) : 0, completionLabel: `${analytics.total - analytics.hasRek} belum isi` },
    { id: 'audit-nik',     title: 'Audit NIK', category: 'Audit', desc: 'Cek NIK 16 digit + status kelengkapan data.', icon: XCircle, color: '#f87171', isDemo: false, count: analytics.hasNIK, countLabel: 'NIK valid', completion: analytics.total > 0 ? Math.round(analytics.hasNIK / analytics.total * 100) : 0, completionLabel: `${analytics.total - analytics.hasNIK} tidak valid` },
  ]

  const filtered = REPORTS.filter(r => {
    if (activeTab === 'Semua') return true
    if (activeTab === 'Featured') return r.isFeatured
    return r.category === activeTab
  })

  const tabCounts: Record<TabFilter, number> = {
    'Semua': REPORTS.length, 'Featured': REPORTS.filter(r => r.isFeatured).length,
    'Admin': REPORTS.filter(r => r.category === 'Admin').length,
    'Logistik': REPORTS.filter(r => r.category === 'Logistik').length,
    'Sport Science': REPORTS.filter(r => r.category === 'Sport Science').length,
    'Prestasi': REPORTS.filter(r => r.category === 'Prestasi').length,
    'Audit': REPORTS.filter(r => r.category === 'Audit').length,
  } as any

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.5s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020a14' }}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: ACCENT }} />
        <p className="font-mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>Memuat Pusat Laporan...</p>
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
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/operator/pentathlon" className="p-2 rounded-xl transition hover:bg-amber-500/10" style={{ border: `1px solid ${ACCENT}20` }}>
              <ArrowLeft size={16} style={{ color: ACCENT }} />
            </Link>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}25` }}>
              <FileSearch size={20} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Pusat Laporan Cabor</h1>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {REPORTS.length} laporan · {caborNama} · {analytics.total.toLocaleString('id')} atlet
              </p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto relative z-10 space-y-5">

        {/* ALERTS STRIP */}
        <div {...ani(0)} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Clock, color: '#fbbf24', label: 'Belum Tes Fisik', value: analytics.total - analytics.sudahTes, sub: `dari ${analytics.total} atlet` },
            { icon: AlertTriangle, color: '#ef4444', label: 'Atlet Risk (< 50%)', value: analytics.skorRendah, sub: 'skor biomotorik rendah' },
            { icon: TrendingUp, color: ACCENT, label: 'Rata-rata Skor', value: analytics.avgSkor > 0 ? `${analytics.avgSkor}%` : '—', sub: 'avg fitness score' },
          ].map((a, i) => (
            <div key={i} className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: `${a.color}06`, border: `1px solid ${a.color}18` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${a.color}12`, border: `1px solid ${a.color}25` }}>
                <a.icon size={18} style={{ color: a.color }} />
              </div>
              <div>
                <div className="text-2xl font-black" style={{ color: a.color }}>{a.value}</div>
                <div className="text-xs font-bold text-zinc-300">{a.label}</div>
                <div className="text-[10px] text-zinc-500">{a.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* TAB FILTER */}
        <div {...ani(20)} className="flex items-center gap-2 flex-wrap p-1 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['Featured', 'Semua', 'Admin', 'Logistik', 'Sport Science', 'Prestasi', 'Audit'] as TabFilter[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5"
              style={{ background: activeTab === t ? `${ACCENT}18` : 'transparent', color: activeTab === t ? ACCENT : 'rgba(255,255,255,0.4)', border: activeTab === t ? `1px solid ${ACCENT}30` : '1px solid transparent' }}>
              {t === 'Featured' && <Star size={11} />}
              {t} ({(tabCounts as any)[t] ?? 0})
            </button>
          ))}
        </div>

        {/* REPORT GRID */}
        <div {...ani(40)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => {
            const Icon  = r.icon
            const isGen = generating === r.id
            return (
              <div key={r.id} className="rounded-2xl p-5 relative overflow-hidden group transition-all"
                style={{ background: r.isDemo ? 'rgba(245,158,11,0.025)' : 'rgba(255,255,255,0.025)', border: `1px solid ${r.isDemo ? 'rgba(245,158,11,0.18)' : r.color + '18'}` }}>
                <div className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(90deg,transparent,${r.color}40,transparent)` }} />
                <div className="relative">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${r.color}12`, border: `1px solid ${r.color}25` }}>
                      <Icon size={22} style={{ color: r.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${r.color}80` }}>{r.category}</span>
                        {r.isFeatured && <span className="text-[8px] px-1.5 py-0.5 rounded font-black" style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>⭐ FEATURED</span>}
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">{r.title}</h3>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">{r.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div>
                      <div className="text-2xl font-light" style={{ color: r.color }}>{typeof r.count === 'number' ? r.count.toLocaleString('id') : r.count}</div>
                      <div className="text-[9px] text-zinc-600">{r.countLabel}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold" style={{ color: r.color }}>{r.completion}%</div>
                      <div className="text-[9px] text-zinc-600 max-w-[120px] truncate">{r.completionLabel}</div>
                    </div>
                  </div>
                  <Bar value={r.completion} max={100} color={r.color} h={3} />
                  <div className="flex gap-1.5 mt-3">
                    <button onClick={() => handleGenerate(r.id, 'preview')} disabled={isGen}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                      style={{ background: `${r.color}10`, color: r.color, border: `1px solid ${r.color}25` }}>
                      {isGen ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} Preview
                    </button>
                    <button onClick={() => handleGenerate(r.id, 'csv')} disabled={isGen}
                      className="flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-bold disabled:opacity-50"
                      style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Download size={12} />
                    </button>
                    <button onClick={() => handleGenerate(r.id, 'print')} disabled={isGen}
                      className="flex items-center justify-center px-3 py-2 rounded-xl disabled:opacity-50"
                      style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Printer size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* INFO */}
        <div {...ani(80)} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-start gap-3">
            <Info size={15} style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }} />
            <div>
              <div className="text-sm font-bold text-white mb-1">Tips Laporan</div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Laporan Sport Science menggunakan data tes biomotorik dari FPOK UPI. Pastikan data rekening dan apparel dilengkapi di Supabase untuk laporan keuangan dan logistik yang akurat. Prestasi bisa diinput via <Link href="/operator/pentathlon/data-gateway" style={{ color: ACCENT }} className="font-bold">Data Gateway</Link>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {preview && (
        <PreviewModal
          title={preview.title} data={preview.data} columns={preview.columns} isDemo={preview.isDemo}
          onClose={() => setPreview(null)}
          onExportCSV={() => { const found = REPORTS.find(r => getLaporanData(r.id).title === preview.title); if (found) exportCSV(found.id); setPreview(null) }}
          onPrint={() => { const found = REPORTS.find(r => getLaporanData(r.id).title === preview.title); if (found) printLaporan(found.id) }}
        />
      )}
    </div>
  )
}
