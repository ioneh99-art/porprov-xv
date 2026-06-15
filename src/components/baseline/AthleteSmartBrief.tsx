'use client'
// src/components/baseline/AthleteSmartBrief.tsx
// AI Smart Brief per atlet — memanggil /api/baseline/smart-brief (Anthropic Claude).

import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { ACCENT } from '@/lib/baseline/cabor-map'

export default function AthleteSmartBrief({ atletId }: { atletId: number }) {
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/baseline/smart-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atletId }),
      })
      const data = await res.json()
      if (data.success) setBrief(data.brief)
      else setError(data.error || 'Gagal generate brief')
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { generate() }, [atletId])

  return (
    <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: ACCENT }} />
          <h3 className="text-sm font-bold text-white">AI Smart Brief</h3>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Claude</span>
        </div>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white disabled:opacity-50 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Regenerate
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-800 rounded w-11/12" />
          <div className="h-3 bg-slate-800 rounded w-10/12" />
          <div className="h-3 bg-slate-800 rounded w-9/12" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 text-xs text-red-400/90">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{brief}</p>
      )}
    </div>
  )
}
