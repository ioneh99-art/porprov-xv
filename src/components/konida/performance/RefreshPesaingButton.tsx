'use client'
// src/components/konida/performance/RefreshPesaingButton.tsx
// KBAAS Fase 2.7 — refresh pesaing baseline dari data kejurnas terbaru.

import { useState } from 'react'
import { Swords, RefreshCw, Check } from 'lucide-react'

export default function RefreshPesaingButton({ atletId, onDone }: { atletId: number; onDone?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<{ pesaing?: string; count?: number; message?: string } | null>(null)

  const run = async () => {
    setLoading(true); setRes(null)
    try {
      const r = await fetch('/api/konida/refresh-pesaing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ atlet_id: atletId }) }).then(x => x.json())
      setRes(r); onDone?.()
    } catch (e: any) { setRes({ message: e.message }) } finally { setLoading(false) }
  }

  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.18)' }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2"><Swords size={13} style={{ color: '#a855f7' }} /><span className="text-[11px] font-bold text-slate-200">Pesaing dari Kejurnas Terbaru</span></div>
        <button onClick={run} disabled={loading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh Pesaing
        </button>
      </div>
      {res && (
        <div className="mt-2 text-[11px]">
          {res.pesaing ? (
            <div className="flex items-start gap-1.5 text-slate-300"><Check size={13} className="text-green-400 mt-0.5 shrink-0" /><span>{res.pesaing}</span></div>
          ) : (
            <div className="text-slate-500">{res.message || 'Tidak ada perubahan'}</div>
          )}
        </div>
      )}
    </div>
  )
}
