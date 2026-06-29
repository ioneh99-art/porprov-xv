'use client'
// src/app/operator/dayung/brief/page.tsx
// Phase 3 — Strategic Brief Cabor Dayung (AI Anthropic).

import { useState } from 'react'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'

// Mini markdown renderer (## header, **bold**, - bullet) — aman, tanpa dangerouslySetInnerHTML
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: JSX.Element[] = []
  let bullets: string[] = []
  const flush = (k: number) => { if (bullets.length) { out.push(<ul key={`u${k}`} className="list-disc pl-5 space-y-1 my-2 text-slate-300 text-sm">{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>); bullets = [] } }
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="text-white">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)
  lines.forEach((ln, i) => {
    const t = ln.trim()
    if (t.startsWith('## ')) { flush(i); out.push(<h3 key={i} className="text-sm font-bold text-sky-300 mt-4 mb-1.5 uppercase tracking-wide">{t.slice(3)}</h3>) }
    else if (t.startsWith('### ')) { flush(i); out.push(<h4 key={i} className="text-xs font-bold text-slate-200 mt-3 mb-1">{t.slice(4)}</h4>) }
    else if (t.startsWith('- ') || t.startsWith('* ')) { bullets.push(t.slice(2)) }
    else if (t) { flush(i); out.push(<p key={i} className="text-sm text-slate-300 leading-relaxed my-1.5">{inline(t)}</p>) }
    else flush(i)
  })
  flush(999)
  return <>{out}</>
}

export default function DayungBriefPage() {
  const [brief, setBrief] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [at, setAt] = useState('')

  const generate = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/dayung/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kontingenId: 4 }) })
      const data = await res.json()
      if (data.success) { setBrief(data.brief); setStats(data.stats); setAt(new Date(data.generated_at).toLocaleString('id-ID')) }
      else setError(data.error || 'Gagal generate brief')
    } catch (e: any) { setError(e.message || 'Network error') } finally { setLoading(false) }
  }

  return (
    <div className="text-slate-200 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2"><Sparkles size={18} className="text-sky-400" /><h1 className="text-xl font-black text-white">Strategic Brief</h1><span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Claude</span></div>
        <button onClick={generate} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/40 disabled:opacity-50 hover:bg-sky-500/25">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {brief ? 'Regenerate' : 'Generate Brief'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-5">Analisa strategis Cabor Dayung berbasis roster + kesiapan fisik {at && `· ${at}`}</p>

      {error && <div className="flex items-center gap-2 text-xs text-red-400 mb-3"><AlertCircle size={14} />{error}</div>}

      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[['Atlet', stats.total], ['Tes Fisik', stats.tested], ['Avg Fisik', `${stats.avgFit}%`], ['ELITE', stats.dist?.elite ?? 0]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-slate-900/70 border border-slate-800 p-2.5 text-center"><div className="text-lg font-black text-white">{v as any}</div><div className="text-[9px] text-slate-500 uppercase">{l as string}</div></div>
          ))}
        </div>
      )}

      <div className="rounded-2xl p-6 bg-slate-900/70 border border-slate-800 min-h-[200px]">
        {loading ? (
          <div className="space-y-2 animate-pulse">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-3 bg-slate-800 rounded" style={{ width: `${90 - i * 6}%` }} />)}</div>
        ) : brief ? <Markdown text={brief} /> : (
          <div className="text-center py-12 text-slate-600 text-sm">Klik <b className="text-sky-400">Generate Brief</b> untuk analisa strategis AI Cabor Dayung.</div>
        )}
      </div>
    </div>
  )
}
