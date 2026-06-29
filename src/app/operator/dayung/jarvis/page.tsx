'use client'
// src/app/operator/dayung/jarvis/page.tsx
// Phase 3 — JARVIS HUD: command center live (polling 6s) · Live Race · Anomali · System.

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Radio, AlertTriangle, Cpu, Activity, Database, Brain, Clock } from 'lucide-react'
import { DAYUNG } from '@/lib/sport-plugins/dayung/config'
import { detectAnomaly, SEVERITY_COLOR, reasonLabel, type Severity } from '@/lib/sport-plugins/dayung/anomaly'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`

export default function DayungJarvisHUD() {
  const [tab, setTab] = useState<'live' | 'anomaly' | 'system'>('live')
  const [tick, setTick] = useState('')
  const [data, setData] = useState<any>({ live: [], anomalies: [], sys: null })
  const [pulse, setPulse] = useState(true)
  const caborRef = useRef(DAYUNG.caborId)

  useEffect(() => {
    const c = setInterval(() => { setTick(new Date().toLocaleTimeString('id-ID')); setPulse(p => !p) }, 1000)
    return () => clearInterval(c)
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      const me = await fetch('/api/auth/me').then(r => r.json()).catch(() => ({}))
      const caborId = me?.cabor_id ?? DAYUNG.caborId; caborRef.current = caborId
      const { data: nomors } = await sb.from('nomor_pertandingan').select('id,nama').eq('cabor_id', caborId)
      const nIds = (nomors ?? []).map(n => n.id); const nameById: Record<number, string> = {}
      for (const n of nomors ?? []) nameById[n.id] = n.nama

      let live: any[] = [], anomalies: any[] = [], totalHasil = 0
      for (let i = 0; i < nIds.length; i += 50) {
        const { data: hasil } = await sb.from('hasil_pertandingan')
          .select('nomor_id,atlet_id,nilai,updated_at,atlet:atlet_id(nama_lengkap)')
          .in('nomor_id', nIds.slice(i, i + 50)).not('nilai', 'is', null)
        const byNomor: Record<number, any[]> = {}
        for (const h of hasil ?? []) { totalHasil++; (byNomor[h.nomor_id] ||= []).push(h); live.push({ ...h, nomor: nameById[h.nomor_id] }) }
        for (const nid in byNomor) {
          const sample = byNomor[+nid].map(r => Number(r.nilai))
          for (const r of byNomor[+nid]) { const res = detectAnomaly(Number(r.nilai), sample); if (res.is_anomaly) anomalies.push({ nama: (r.atlet as any)?.nama_lengkap ?? '?', nomor: nameById[+nid], waktu: Number(r.nilai), ...res }) }
        }
      }
      live.sort((a, b) => (new Date(b.updated_at || 0).getTime()) - (new Date(a.updated_at || 0).getTime()))
      anomalies.sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score))

      const { count: atletN } = await sb.from('atlet').select('*', { count: 'exact', head: true }).eq('cabor_id', caborId).eq('kontingen_id', me?.kontingen_id ?? DAYUNG.kontingenId)
      const { data: cache } = await sb.from('dayung_brief_cache').select('generated_at').eq('cache_key', 'strategic_4').maybeSingle()

      if (!alive) return
      setData({
        live: live.slice(0, 12), anomalies: anomalies.slice(0, 15),
        sys: { db: true, atlet: atletN ?? 0, nomor: nIds.length, hasil: totalHasil, lastBrief: cache?.generated_at ?? null, ai: true },
      })
    }
    load()
    const iv = setInterval(load, 6000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  const TabBtn = ({ id, icon: Icon, label, badge }: any) => (
    <button onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${tab === id ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}>
      <Icon size={13} /> {label}
      {badge > 0 && <span className="text-[9px] bg-rose-500 text-white px-1.5 rounded-full">{badge}</span>}
    </button>
  )

  return (
    <div className="text-slate-200" style={{ background: 'linear-gradient(160deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem', minHeight: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center"><Cpu size={16} className="text-sky-400" /></div>
          <div>
            <div className="text-white font-black tracking-wide flex items-center gap-2">JARVIS HUD <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${pulse ? 'opacity-100' : 'opacity-30'}`} />LIVE</span></div>
            <div className="text-[10px] text-slate-500">Dayung Command Center · refresh 6s</div>
          </div>
        </div>
        <div className="font-mono text-sm text-sky-300 tabular-nums">{tick}</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-800 pb-2">
        <TabBtn id="live" icon={Radio} label="Live Race" />
        <TabBtn id="anomaly" icon={AlertTriangle} label="Anomali" badge={data.anomalies.length} />
        <TabBtn id="system" icon={Activity} label="System" />
      </div>

      {tab === 'live' && (
        data.live.length === 0 ? (
          <div className="py-20 text-center"><Radio size={36} className="mx-auto mb-3 text-slate-700" /><div className="text-slate-400 text-sm">Standby — belum ada hasil lomba masuk.</div><div className="text-slate-600 text-xs mt-1">Feed aktif otomatis saat operator input waktu (PORPROV Nov 2026).</div></div>
        ) : (
          <div className="space-y-2">
            {data.live.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{h.atlet?.nama_lengkap ?? '?'}</div><div className="text-[11px] text-slate-500 truncate">{h.nomor}</div></div>
                <div className="font-mono text-sky-300 text-sm">{fmt(Number(h.nilai))}</div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'anomaly' && (
        data.anomalies.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm">✓ Tidak ada anomali aktif.</div>
        ) : (
          <div className="space-y-2">
            {data.anomalies.map((f: any, i: number) => {
              const sc = SEVERITY_COLOR[f.severity as Severity]
              return (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ color: sc.color, background: sc.bg }}>{f.severity.toUpperCase()}</span>
                  <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{f.nama}</div><div className="text-[11px] text-slate-500 truncate">{f.nomor}</div></div>
                  <div className="text-right"><div className="font-mono text-sky-300 text-xs">{fmt(f.waktu)}</div><div className="text-[10px] text-slate-500">z={f.z_score}σ · {reasonLabel[f.reason as keyof typeof reasonLabel]}</div></div>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === 'system' && data.sys && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { l: 'Database', v: data.sys.db ? 'ONLINE' : 'DOWN', icon: Database, ok: data.sys.db },
            { l: 'AI Engine', v: data.sys.ai ? 'READY' : 'OFF', icon: Brain, ok: data.sys.ai },
            { l: 'Atlet Terdaftar', v: data.sys.atlet, icon: Activity, ok: true },
            { l: 'Nomor Pertandingan', v: data.sys.nomor, icon: Activity, ok: true },
            { l: 'Hasil Masuk', v: data.sys.hasil, icon: Radio, ok: true },
            { l: 'Brief Terakhir', v: data.sys.lastBrief ? new Date(data.sys.lastBrief).toLocaleDateString('id-ID') : '—', icon: Clock, ok: !!data.sys.lastBrief },
          ].map(s => (
            <div key={s.l} className="rounded-2xl p-4 bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 mb-1.5"><s.icon size={13} className={s.ok ? 'text-emerald-400' : 'text-slate-500'} /><span className="text-[10px] uppercase tracking-wider text-slate-500">{s.l}</span></div>
              <div className={`text-xl font-black ${s.ok ? 'text-white' : 'text-slate-500'}`}>{s.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
