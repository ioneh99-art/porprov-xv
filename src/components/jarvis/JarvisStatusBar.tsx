'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  AlertTriangle, CheckCircle2, Sparkles, RefreshCw, X,
  AlertCircle, Info, Download, ChevronDown,
} from 'lucide-react'

const KONTINGEN_ID = 4

interface Issue {
  id: number
  issue_type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  suggested_action: string
  detected_at: string
}

const SEV_ICON = {
  critical: <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />,
  warning:  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />,
  info:     <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />,
}

const SEV_BADGE: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/25',
  warning:  'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  info:     'bg-blue-500/15 text-blue-400 border border-blue-500/25',
}

const REPORT_OPTS = [
  { type: 'summary',    label: 'Summary QA',       desc: 'Ringkasan jumlah per tipe masalah' },
  { type: 'all_issues', label: 'Semua Issues',      desc: 'Detail lengkap tiap issue + saran' },
  { type: 'nik_issues', label: 'Masalah NIK',       desc: 'Format invalid, mismatch gender/tgl' },
  { type: 'cabor_null', label: 'Cabor Kosong',      desc: 'Atlet tanpa assignment cabor' },
  { type: 'ditolak',    label: 'Atlet Ditolak',     desc: 'Ditolak admin beserta alasannya' },
]

export function JarvisStatusBar() {
  const [issues,       setIssues]       = useState<Issue[]>([])
  const [loading,      setLoading]      = useState(true)
  const [scanning,     setScanning]     = useState(false)
  const [showPanel,    setShowPanel]    = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [downloading,  setDownloading]  = useState<string | null>(null)
  const [lastScanned,  setLastScanned]  = useState<Date | null>(null)
  const [filterSev,    setFilterSev]    = useState<'all' | 'critical' | 'warning'>('all')
  const scanningRef   = useRef(false)
  const downloadRef   = useRef<HTMLDivElement>(null)

  const fetchIssues = useCallback(async () => {
    try {
      const res  = await fetch(`/api/jarvis/issues?kontingen_id=${KONTINGEN_ID}&status=open`)
      const data = await res.json()
      if (data.success) setIssues(data.issues)
    } catch {}
    finally { setLoading(false) }
  }, [])

  const triggerScan = useCallback(async () => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScanning(true)
    try {
      await fetch('/api/jarvis/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kontingenId: KONTINGEN_ID }),
      })
      setLastScanned(new Date())
    } catch {}
    finally {
      await fetchIssues()
      setScanning(false)
      scanningRef.current = false
    }
  }, [fetchIssues])

  const handleAction = async (id: number, action: string) => {
    await fetch(`/api/jarvis/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    fetchIssues()
  }

  const handleDownload = async (type: string) => {
    setDownloading(type)
    setShowDownload(false)
    try {
      const url = `/api/jarvis/export?type=${type}&kontingen_id=${KONTINGEN_ID}`
      const res  = await fetch(url)
      const blob = await res.blob()
      const cd   = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="(.+?)"/)
      const fname = match ? match[1] : `jarvis-${type}.xlsx`
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = fname
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {}
    finally { setDownloading(null) }
  }

  // Tutup dropdown download saat klik di luar
  useEffect(() => {
    if (!showDownload) return
    const handler = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node))
        setShowDownload(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDownload])

  useEffect(() => {
    fetchIssues()
    triggerScan()
    const interval = setInterval(fetchIssues, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return null

  const critical = issues.filter(i => i.severity === 'critical').length
  const warning  = issues.filter(i => i.severity === 'warning').length
  const isClean  = issues.length === 0

  const displayed = filterSev === 'all' ? issues
    : issues.filter(i => i.severity === filterSev)

  const barBg     = isClean ? 'rgba(16,185,129,0.08)' : critical > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'
  const barBorder = isClean ? 'rgba(16,185,129,0.2)'  : critical > 0 ? 'rgba(239,68,68,0.2)'  : 'rgba(245,158,11,0.2)'

  return (
    <div className="relative z-50">
      {/* ── Status bar ── */}
      <div className="flex items-center justify-between px-4 py-2 text-xs"
        style={{ background: barBg, borderBottom: `1px solid ${barBorder}` }}>

        {/* Kiri: label + issues summary */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-purple-400" />
            <span className="font-bold text-purple-300 tracking-wide">JARVIS QA</span>
          </div>
          <span className="text-zinc-700">·</span>
          {isClean ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={12} />
              <span>All clear · 0 issues</span>
            </div>
          ) : (
            <button onClick={() => { setShowPanel(v => !v); setFilterSev('all') }}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <AlertTriangle size={12} className={critical > 0 ? 'text-red-400' : 'text-amber-400'} />
              <span>
                <strong className={critical > 0 ? 'text-red-400' : 'text-amber-400'}>{issues.length} issues</strong>
                {critical > 0 && <span className="text-red-400"> · {critical} critical</span>}
                {warning  > 0 && <span className="text-amber-400"> · {warning} warning</span>}
              </span>
              <span className="text-zinc-600 underline decoration-dotted ml-1">
                {showPanel ? 'tutup' : 'lihat detail'}
              </span>
            </button>
          )}
        </div>

        {/* Kanan: scan time + re-scan + download */}
        <div className="flex items-center gap-3 text-zinc-600">
          {lastScanned && (
            <span>Scan: {lastScanned.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          <button onClick={triggerScan} disabled={scanning}
            className="flex items-center gap-1 hover:text-zinc-300 transition-colors disabled:opacity-40">
            <RefreshCw size={11} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning…' : 'Re-scan'}
          </button>

          {/* Download dropdown */}
          <div ref={downloadRef} className="relative">
            <button
              onClick={() => setShowDownload(v => !v)}
              disabled={!!downloading}
              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all disabled:opacity-40 hover:text-purple-300 hover:bg-purple-500/10"
              style={{ color: showDownload ? '#c4b5fd' : undefined }}>
              <Download size={11} className={downloading ? 'animate-pulse' : ''} />
              <span className="text-[11px] font-semibold">
                {downloading ? 'Mengunduh…' : 'Download'}
              </span>
              <ChevronDown size={10} className={`transition-transform ${showDownload ? 'rotate-180' : ''}`} />
            </button>

            {showDownload && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl shadow-2xl overflow-hidden z-50"
                style={{ background: '#0d1220', border: '1px solid rgba(139,92,246,0.25)' }}>
                <div className="px-3 py-2 border-b text-[10px] font-black uppercase tracking-widest text-purple-400"
                  style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
                  Download Laporan Excel
                </div>
                {REPORT_OPTS.map(opt => (
                  <button key={opt.type}
                    onClick={() => handleDownload(opt.type)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-purple-500/10 transition-colors group">
                    <Download size={11} className="text-purple-500 group-hover:text-purple-300 mt-0.5 shrink-0 transition-colors"/>
                    <div>
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">{opt.label}</div>
                      <div className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors leading-tight">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Issues panel ── */}
      {showPanel && issues.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 shadow-2xl flex flex-col"
          style={{
            background: '#0a0f1e',
            border: '1px solid rgba(139,92,246,0.2)',
            borderTop: 'none',
            maxHeight: '420px',
          }}>

          {/* Panel header + filter tabs */}
          <div className="sticky top-0 z-10 border-b"
            style={{ background: '#0a0f1e', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-1">
                {([
                  { k: 'all',      l: `Semua (${issues.length})` },
                  { k: 'critical', l: `Critical (${critical})` },
                  { k: 'warning',  l: `Warning (${warning})` },
                ] as const).map(f => (
                  <button key={f.k} onClick={() => setFilterSev(f.k)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: filterSev === f.k ? 'rgba(139,92,246,0.18)' : 'transparent',
                      color:      filterSev === f.k ? '#c4b5fd' : '#52525b',
                    }}>
                    {f.l}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPanel(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Issues list */}
          <div className="overflow-y-auto divide-y divide-zinc-800/50">
            {displayed.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-600 text-xs">Tidak ada issue dengan filter ini</div>
            ) : displayed.map(issue => (
              <div key={issue.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-start gap-2.5">
                  {SEV_ICON[issue.severity]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-white truncate flex-1">{issue.title}</p>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${SEV_BADGE[issue.severity]}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{issue.description}</p>
                    <p className="text-[11px] text-purple-400 mt-0.5">→ {issue.suggested_action}</p>
                    <div className="flex gap-1.5 mt-2">
                      {[
                        { a: 'resolved',       l: 'Resolved',       c: 'rgba(34,197,94,0.15)',   t: '#22c55e' },
                        { a: 'dismissed',      l: 'Dismiss',        c: 'rgba(100,116,139,0.12)', t: '#94a3b8' },
                        { a: 'false_positive', l: 'False Positive', c: 'rgba(100,116,139,0.12)', t: '#94a3b8' },
                      ].map(btn => (
                        <button key={btn.a} onClick={() => handleAction(issue.id, btn.a)}
                          className="text-[10px] px-2 py-1 rounded-lg transition-colors hover:brightness-110"
                          style={{ background: btn.c, color: btn.t }}>
                          {btn.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Panel footer */}
          <div className="border-t px-4 py-2 flex items-center justify-between"
            style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
            <span className="text-[10px] text-zinc-600">
              Menampilkan {displayed.length} dari {issues.length} issues
            </span>
            <button
              onClick={() => handleDownload('all_issues')}
              disabled={!!downloading}
              className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-40">
              <Download size={10}/>
              Download semua (.xlsx)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
