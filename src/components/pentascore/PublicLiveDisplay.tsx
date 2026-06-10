'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Trophy, Medal, RefreshCw, Loader2, AlertCircle, Sword, Waves,
  Mountain, Target, Wifi, WifiOff, Radio, Zap,
} from 'lucide-react'
import { subscribeEventResults } from '@/lib/pentascore/realtime'

export default function PublicLiveDisplay({
  eventId, tenantSlug, phases, primary, secondary, defaultPhaseId, broadcastMode,
}: {
  eventId: string
  tenantSlug: string
  phases: any[]
  primary: string
  secondary: string
  defaultPhaseId?: string
  broadcastMode: boolean
}) {
  const [phaseId, setPhaseId] = useState<string>(defaultPhaseId ?? phases[0]?.id ?? '')
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'subscribed' | 'closed' | 'errored' | 'unavailable'>('connecting')
  const [pushedAt, setPushedAt] = useState<number>(0)
  const loadRef = useRef<() => void>(() => {})

  const load = async (silent = false) => {
    if (!phaseId) return
    if (!silent) setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/public/events/${eventId}/standings?phase_id=${phaseId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json()).error)
      const json = await res.json()
      setData(json)
      setLastSync(new Date().toLocaleTimeString('id-ID'))
      setOnline(true)
    } catch (e: any) {
      setErrorMsg(e.message); setOnline(false)
    } finally {
      if (!silent) setLoading(false)
    }
  }
  loadRef.current = () => load(true)

  useEffect(() => { load() }, [phaseId])

  // Subscribe to realtime updates
  useEffect(() => {
    if (!eventId) return
    const handle = subscribeEventResults(
      eventId,
      () => {
        setPushedAt(Date.now())
        loadRef.current()
      },
      status => setRealtimeStatus(status),
    )
    return () => handle.unsubscribe()
  }, [eventId])

  // Polling fallback — slower interval if realtime is working
  useEffect(() => {
    if (!phaseId) return
    const isRealtime = realtimeStatus === 'subscribed'
    const interval = isRealtime
      ? 30000  // realtime working, just safety poll every 30s
      : broadcastMode ? 5000 : 10000
    const t = setInterval(() => load(true), interval)
    return () => clearInterval(t)
  }, [phaseId, broadcastMode, realtimeStatus])

  const isPushFresh = pushedAt && (Date.now() - pushedAt < 3000)

  if (phases.length === 0) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 py-12">
        <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: `${primary}30` }}>
          <AlertCircle size={32} className="mx-auto mb-3 opacity-40" />
          <div className="text-slate-400">Event ini belum mulai. Cek lagi nanti!</div>
        </div>
      </div>
    )
  }

  const standings = data?.standings ?? []

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
      {/* Phase pills + status */}
      <div className="flex items-center gap-2 flex-wrap">
        {phases.map(p => {
          const active = p.id === phaseId
          return (
            <button
              key={p.id}
              onClick={() => setPhaseId(p.id)}
              className="px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold uppercase tracking-wider transition whitespace-nowrap"
              style={{
                backgroundColor: active ? `${primary}25` : `${secondary}80`,
                color: active ? primary : '#94A3B8',
                border: active ? `1px solid ${primary}60` : '1px solid transparent',
              }}
            >
              {p.gender === 'L' ? '♂' : '♀'} {p.phase_label}
              {p.is_locked && ' 🔒'}
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-500">
          {/* Realtime indicator */}
          {realtimeStatus === 'subscribed' && (
            <div className="flex items-center gap-1 text-green-400">
              {isPushFresh ? <Zap size={11} className="animate-pulse" /> : <Radio size={11} />}
              <span>REALTIME</span>
            </div>
          )}
          {realtimeStatus !== 'subscribed' && (
            <div className="flex items-center gap-1">
              {online ? <Wifi size={11} className="text-amber-400" /> : <WifiOff size={11} className="text-red-400" />}
              <span>{online ? 'POLLING' : 'OFFLINE'}</span>
            </div>
          )}
          {lastSync && <span className="hidden md:inline">· {lastSync}</span>}
          <button
            onClick={() => load()}
            className="p-1 rounded hover:bg-slate-800/50 transition"
            disabled={loading}
            title="Refresh"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      <div
        className="rounded-xl border overflow-hidden transition"
        style={{
          borderColor: isPushFresh ? `${primary}60` : `${primary}20`,
          backgroundColor: `${secondary}40`,
          boxShadow: isPushFresh ? `0 0 20px ${primary}40` : 'none',
        }}
      >
        {!standings.length ? (
          <div className="text-center py-12 text-slate-500">
            <Trophy size={32} className="mx-auto mb-3 opacity-40" />
            <div className="text-sm">Belum ada hasil. Standings akan muncul saat result mulai diinput.</div>
          </div>
        ) : (
          <>
            {/* Desktop / broadcast: full table */}
            <div className="hidden md:block overflow-x-auto">
              <table className={`w-full ${broadcastMode ? 'text-base lg:text-lg' : 'text-sm'}`}>
                <thead className="sticky top-0 backdrop-blur" style={{ backgroundColor: `${secondary}E6`, borderBottom: `2px solid ${primary}30` }}>
                  <tr>
                    <Th width="60px" align="center">#</Th>
                    <Th>Atlet</Th>
                    <Th align="center" width="80px">Negara</Th>
                    <Th align="right" width="100px"><Sword size={11} className="inline mr-1" />Fencing</Th>
                    <Th align="right" width="100px"><Waves size={11} className="inline mr-1" />Swim</Th>
                    <Th align="right" width="100px"><Mountain size={11} className="inline mr-1" />Obstacle</Th>
                    <Th align="right" width="100px"><Target size={11} className="inline mr-1" />LR</Th>
                    <Th align="right" width="120px" highlight color={primary}>TOTAL MP</Th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((r: any, i: number) => (
                    <StandingsRow key={r.event_athlete_id} row={r} idx={i} primary={primary} broadcastMode={broadcastMode} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: `${primary}10` }}>
              {standings.map((r: any, i: number) => (
                <MobileRow key={r.event_athlete_id} row={r} idx={i} primary={primary} />
              ))}
            </div>
          </>
        )}
      </div>

      {data && (
        <div className="text-center text-[10px] text-slate-500">
          {realtimeStatus === 'subscribed'
            ? '⚡ Instant push via Supabase Realtime · 30s safety poll'
            : broadcastMode ? 'Polling 5s · ' : 'Polling 10s · '}
          Formula: <code style={{ color: primary }}>uipm-2026-v1</code>
        </div>
      )}
    </div>
  )
}

// ─── helpers (unchanged from Sprint 4) ────────────────────────────
function Th({ children, align = 'left', width, highlight, color }: any) {
  return (
    <th className="px-3 py-3 font-bold uppercase tracking-wider text-[10px]" style={{ textAlign: align, width, color: highlight ? color : '#64748B' }}>
      {children}
    </th>
  )
}

function StandingsRow({ row, idx, primary, broadcastMode }: any) {
  const medal = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : null
  const medalColors = {
    gold:   { row: `${primary}08`, text: primary,   icon: '#FBBF24', fill: 'rgba(251,191,36,0.3)' },
    silver: { row: '#CBD5E108',    text: '#E2E8F0', icon: '#CBD5E1', fill: 'rgba(203,213,225,0.3)' },
    bronze: { row: '#FB923C08',    text: '#FED7AA', icon: '#FB923C', fill: 'rgba(251,146,60,0.3)' },
  } as const
  const colors = medal ? medalColors[medal] : null

  return (
    <tr className="border-b transition" style={{ borderColor: '#1E293B40', backgroundColor: colors?.row }}>
      <td className="px-3 py-3 text-center">
        {colors
          ? <Medal size={broadcastMode ? 22 : 18} style={{ color: colors.icon, fill: colors.fill }} className="inline" />
          : <span className={`font-mono font-bold text-slate-400 ${broadcastMode ? 'text-xl' : 'text-base'}`}>{row.position}</span>}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {row.gender === 'L'
            ? <span className="text-blue-400 font-bold text-[11px] shrink-0 select-none">♂</span>
            : <span className="text-pink-400 font-bold text-[11px] shrink-0 select-none">♀</span>}
          <div className="min-w-0">
            <div className={`font-bold truncate ${broadcastMode ? 'text-lg' : ''}`} style={{ color: colors?.text ?? 'white' }}>
              {row.nama_lengkap}
            </div>
            {(row.affiliation_nama || row.start_number) && (
              <div className="text-[10px] text-slate-500 truncate">
                {row.start_number && <span className="font-mono mr-2" style={{ color: primary }}>#{row.start_number}</span>}
                {row.affiliation_nama}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-center font-mono text-xs text-slate-300">{row.negara_code ?? '—'}</td>
      <td className="px-3 py-3 text-right font-mono text-slate-200">{row.fencing_pts}</td>
      <td className="px-3 py-3 text-right font-mono text-slate-200">{row.swimming_pts}</td>
      <td className="px-3 py-3 text-right font-mono text-slate-200">{row.obstacle_pts}</td>
      <td className="px-3 py-3 text-right font-mono text-slate-200">{row.laserrun_pts}</td>
      <td className="px-3 py-3 text-right">
        <span className={`font-bold font-mono ${broadcastMode ? 'text-2xl' : 'text-base'}`} style={{ color: colors?.text ?? primary }}>
          {row.total_mp_points}
        </span>
      </td>
    </tr>
  )
}

function MobileRow({ row, idx, primary }: any) {
  const medal = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : null
  const medalColors = { gold: '#FBBF24', silver: '#CBD5E1', bronze: '#FB923C' } as const
  return (
    <div className="p-3 flex items-center gap-3">
      <div className="w-10 shrink-0 text-center">
        {medal
          ? <Medal size={20} style={{ color: medalColors[medal], fill: `${medalColors[medal]}40` }} className="inline" />
          : <span className="font-mono font-bold text-slate-400 text-base">{row.position}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {row.gender === 'L'
            ? <span className="text-blue-400 font-bold text-[10px] shrink-0 select-none">♂</span>
            : <span className="text-pink-400 font-bold text-[10px] shrink-0 select-none">♀</span>}
          <div className="text-sm font-bold text-white truncate">{row.nama_lengkap}</div>
        </div>
        <div className="text-[10px] text-slate-500 truncate">
          {row.start_number && <span style={{ color: primary }} className="font-mono mr-1.5">#{row.start_number}</span>}
          {row.negara_code} · {row.affiliation_nama}
        </div>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
          <span>F: {row.fencing_pts}</span>
          <span>S: {row.swimming_pts}</span>
          <span>O: {row.obstacle_pts}</span>
          <span>L: {row.laserrun_pts}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xl font-bold font-mono" style={{ color: primary }}>{row.total_mp_points}</div>
        <div className="text-[8px] uppercase text-slate-500">MP</div>
      </div>
    </div>
  )
}
