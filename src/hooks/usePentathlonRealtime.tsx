/**
 * usePentathlonRealtime — Shared hook untuk Supabase Realtime subscription
 * 
 * Listen ke perubahan di tabel related Pentathlon (hasil, kualifikasi, atlet)
 * dan trigger callback saat ada update.
 * 
 * Usage:
 *   const { realtimeStatus, lastUpdate } = usePentathlonRealtime({
 *     cabor_id: 67,
 *     tables: ['hasil_pertandingan', 'kualifikasi_atlet'],
 *     onUpdate: () => loadData(),
 *   })
 */

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type RealtimeStatus = 'connecting' | 'connected' | 'error' | 'idle'

type PentathlonTable = 'hasil_pertandingan' | 'kualifikasi_atlet' | 'atlet' | 'nomor_pertandingan'

interface UsePentathlonRealtimeOptions {
  cabor_id: number | null | undefined
  tables: PentathlonTable[]
  onUpdate: (table: PentathlonTable, eventType: string) => void
  enabled?: boolean
}

export function usePentathlonRealtime({
  cabor_id,
  tables,
  onUpdate,
  enabled = true,
}: UsePentathlonRealtimeOptions) {
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('idle')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const onUpdateRef = useRef(onUpdate)

  // Keep callback ref up-to-date without re-subscribing
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!enabled || !cabor_id) {
      setRealtimeStatus('idle')
      return
    }

    setRealtimeStatus('connecting')

    const channel = supabase.channel(`pentathlon-${cabor_id}-${tables.join('-')}`)

    // Subscribe ke setiap tabel
    for (const table of tables) {
      const filterColumn = table === 'atlet' || table === 'hasil_pertandingan' || table === 'nomor_pertandingan'
        ? 'cabor_id'
        : null

      const config: any = {
        event: '*',
        schema: 'public',
        table,
      }

      if (filterColumn) {
        config.filter = `${filterColumn}=eq.${cabor_id}`
      }

      channel.on('postgres_changes', config, (payload: any) => {
        console.log(`🔴 Realtime [${table}]:`, payload.eventType)
        setLastUpdate(new Date())
        onUpdateRef.current(table, payload.eventType)
      })
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setRealtimeStatus('connected')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error')
    })

    return () => {
      supabase.removeChannel(channel)
      setRealtimeStatus('idle')
    }
  }, [cabor_id, enabled, tables.join(',')])

  return { realtimeStatus, lastUpdate }
}

// ─────────────────────────────────────────────
// Status indicator component (reusable)
// ─────────────────────────────────────────────
import { Radio } from 'lucide-react'

export function RealtimeStatusBadge({
  status, lastUpdate,
}: { status: RealtimeStatus; lastUpdate: Date | null }) {
  const config = {
    connected: { color: 'emerald', label: 'Live · Realtime ON', pulse: true },
    connecting: { color: 'amber', label: 'Connecting...', pulse: false },
    error: { color: 'red', label: 'Connection error', pulse: false },
    idle: { color: 'slate', label: 'Idle', pulse: false },
  }
  const c = config[status]
  const colorClass = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }[c.color]

  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${colorClass}`}>
      <Radio size={12} className={c.pulse ? 'animate-pulse' : ''} />
      <span>{c.label}</span>
      {lastUpdate && status === 'connected' && (
        <span className="text-[10px] opacity-60">· {lastUpdate.toLocaleTimeString()}</span>
      )}
    </div>
  )
}
