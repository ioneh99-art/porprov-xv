'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, Sparkles, RefreshCw, X, AlertCircle, Info } from 'lucide-react'

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

export function JarvisStatusBar() {
  const [issues,      setIssues]      = useState<Issue[]>([])
  const [loading,     setLoading]     = useState(true)
  const [scanning,    setScanning]    = useState(false)
  const [showPanel,   setShowPanel]   = useState(false)
  const [lastScanned, setLastScanned] = useState<Date | null>(null)
  const scanningRef = useRef(false)

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
      await fetchIssues()
      setLastScanned(new Date())
    } catch {}
    finally {
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

  const barBg = isClean ? 'rgba(16,185,129,0.08)' : critical > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'
  const barBorder = isClean ? 'rgba(16,185,129,0.2)' : critical > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'

  return (
    <div className="relative z-50">
      <div className="flex items-center justify-between px-4 py-2 text-xs"
        style={{ background: barBg, borderBottom: `1px solid ${barBorder}` }}>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-purple-400" />
            <span className="font-bold text-purple-300 tracking-wide">JARVIS QA</span>
          </div>
          <span className="text-zinc-600">·</span>
          {isClean ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={12} />
              <span>All clear · 0 issues</span>
            </div>
          ) : (
            <button onClick={() => setShowPanel(v => !v)}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <AlertTriangle size={12} className={critical > 0 ? 'text-red-400' : 'text-amber-400'} />
              <span className={critical > 0 ? 'text-red-400' : 'text-amber-400'}>
                <strong>{issues.length} issues</strong>
                {critical > 0 && <span className="text-red-400"> · {critical} critical</span>}
                {warning  > 0 && <span className="text-amber-400"> · {warning} warning</span>}
              </span>
              <span className="text-zinc-500 underline decoration-dotted ml-1">
                {showPanel ? 'tutup' : 'lihat detail'}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-zinc-600">
          {lastScanned && (
            <span>Scan: {lastScanned.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          <button onClick={triggerScan} disabled={scanning}
            className="flex items-center gap-1 hover:text-zinc-300 transition-colors disabled:opacity-40">
            <RefreshCw size={11} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning…' : 'Re-scan'}
          </button>
        </div>
      </div>

      {/* Issues panel */}
      {showPanel && issues.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 max-h-80 overflow-y-auto shadow-2xl"
          style={{ background: '#0a0f1e', border: '1px solid rgba(139,92,246,0.2)', borderTop: 'none' }}>
          <div className="sticky top-0 flex items-center justify-between px-4 py-2 border-b border-zinc-800/60 bg-[#0a0f1e]">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Open Issues ({issues.length})</span>
            <button onClick={() => setShowPanel(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {issues.map(issue => (
              <div key={issue.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-2">
                  {SEV_ICON[issue.severity]}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{issue.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{issue.description}</p>
                    <p className="text-[11px] text-purple-400 mt-0.5">→ {issue.suggested_action}</p>
                    <div className="flex gap-2 mt-2">
                      {[
                        { a: 'resolved',       l: 'Resolved',      c: 'rgba(34,197,94,0.15)',  t: '#22c55e' },
                        { a: 'dismissed',      l: 'Dismiss',       c: 'rgba(100,116,139,0.15)', t: '#94a3b8' },
                        { a: 'false_positive', l: 'False positive', c: 'rgba(100,116,139,0.15)', t: '#94a3b8' },
                      ].map(btn => (
                        <button key={btn.a} onClick={() => handleAction(issue.id, btn.a)}
                          className="text-[10px] px-2 py-1 rounded-lg transition-colors"
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
        </div>
      )}
    </div>
  )
}
