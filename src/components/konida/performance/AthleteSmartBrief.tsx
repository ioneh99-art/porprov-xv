'use client'
// src/components/konida/performance/AthleteSmartBrief.tsx
// Upgraded dengan cache awareness + force regen

import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw, AlertCircle, Cloud, Clock } from 'lucide-react'

interface Props {
  atletId:    number
  accent:     string
  autoLoad?:  boolean   // default true
}

export default function AthleteSmartBrief({ atletId, accent, autoLoad = true }: Props) {
  const [brief, setBrief]       = useState('')
  const [loading, setLoading]   = useState(autoLoad)
  const [error, setError]       = useState('')
  const [fromCache, setFromCache] = useState(false)
  const [cacheAge, setCacheAge] = useState<number | null>(null)
  const [model, setModel]       = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  
  const generate = async (forceRegen = false) => {
    setLoading(true); setError(''); setBrief('')
    try {
      const res = await fetch('/api/performance/smart-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atletId, forceRegen }),
      })
      const data = await res.json()
      if (data.success) {
        setBrief(data.brief)
        setFromCache(!!data.from_cache)
        setCacheAge(data.cache_age_days ?? null)
        setModel(data.model || null)
        setGeneratedAt(data.generated_at || null)
      } else {
        setError(data.error || 'Gagal generate brief')
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => { if (autoLoad) generate(false) }, [atletId, autoLoad])
  
  return (
    <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: accent }}/>
          <h3 className="text-sm font-bold text-white">AI Smart Brief</h3>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Claude</span>
          {fromCache && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
              <Cloud size={9}/> Cache {cacheAge !== null ? `(${cacheAge}d)` : ''}
            </span>
          )}
        </div>
        <button onClick={() => generate(true)} disabled={loading}
          className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/>
          {fromCache ? 'Regenerate' : 'Refresh'}
        </button>
      </div>
      
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-slate-800 rounded w-full"/>
          <div className="h-3 bg-slate-800 rounded w-11/12"/>
          <div className="h-3 bg-slate-800 rounded w-10/12"/>
          <div className="h-3 bg-slate-800 rounded w-9/12"/>
          <div className="h-3 bg-slate-800 rounded w-full"/>
          <div className="h-3 bg-slate-800 rounded w-8/12"/>
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 text-xs text-red-400/90">
          <AlertCircle size={14} className="mt-0.5 shrink-0"/>
          <div>
            <div>{error}</div>
            <button onClick={() => generate(true)} className="text-slate-500 hover:text-white mt-1 transition-colors">Coba lagi →</button>
          </div>
        </div>
      ) : brief ? (
        <>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{brief}</p>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-600 flex items-center justify-between flex-wrap gap-1">
            <div className="flex items-center gap-2">
              {generatedAt && (
                <span className="flex items-center gap-1">
                  <Clock size={9}/> {new Date(generatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              )}
              {model && <span className="font-mono">{model}</span>}
            </div>
            <div>Hanya untuk referensi pelatih & manajemen</div>
          </div>
        </>
      ) : !autoLoad ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500">Analisa naratif lengkap: fisik, teknik, usia, konsistensi, & rekomendasi.</p>
          </div>
          <button onClick={() => generate(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
            style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
            ✨ Generate Brief
          </button>
        </div>
      ) : null}
    </div>
  )
}
