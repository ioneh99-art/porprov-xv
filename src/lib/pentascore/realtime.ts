/**
 * PentaScore Realtime — Supabase Channel Subscription
 *
 * Subscribes to result table changes (INSERT/UPDATE/DELETE) and invokes
 * onChange callback. Used by client components for instant standings push.
 *
 * Graceful fallback: if Realtime not enabled or connection fails, caller
 * should rely on polling (existing behavior). NO error throw.
 *
 * Usage:
 *   const channel = subscribeEventResults(eventId, () => reload())
 *   return () => unsubscribe(channel)
 */
'use client'

import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

function getBrowserClient() {
  if (_client) return _client
  if (typeof window === 'undefined') return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  if (!url || !anon) return null
  _client = createBrowserClient(url, anon)
  return _client
}

type RealtimeStatus = 'connecting' | 'subscribed' | 'closed' | 'errored' | 'unavailable'

export type RealtimeHandle = {
  status: RealtimeStatus
  unsubscribe: () => void
}

/**
 * Subscribe to all result table changes for a given event.
 *
 * Note: Supabase Realtime filter clause supports basic eq. Since
 * ps_results_time has phase_id (not event_id), we filter at callback level
 * and the caller decides if it cares.
 *
 * Returns a handle even if connection fails — caller can check .status.
 */
export function subscribeEventResults(
  eventId: string,
  onChange: (payload: { table: string; eventType: string }) => void,
  onStatusChange?: (status: RealtimeStatus) => void,
): RealtimeHandle {
  const handle: RealtimeHandle = {
    status: 'connecting',
    unsubscribe: () => {},
  }

  const client = getBrowserClient()
  if (!client) {
    handle.status = 'unavailable'
    onStatusChange?.('unavailable')
    return handle
  }

  try {
    const channel = client
      .channel(`pentascore-event-${eventId}-${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ps_results_fencing_ranking' },
        (p: any) => onChange({ table: 'ps_results_fencing_ranking', eventType: p.eventType }))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ps_results_fencing_de' },
        (p: any) => onChange({ table: 'ps_results_fencing_de', eventType: p.eventType }))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ps_results_time' },
        (p: any) => onChange({ table: 'ps_results_time', eventType: p.eventType }))
      .subscribe((status: string) => {
        const mapped: RealtimeStatus =
          status === 'SUBSCRIBED' ? 'subscribed' :
          status === 'CLOSED' ? 'closed' :
          status === 'CHANNEL_ERROR' ? 'errored' :
          status === 'TIMED_OUT' ? 'errored' : 'connecting'
        handle.status = mapped
        onStatusChange?.(mapped)
      })

    handle.unsubscribe = () => {
      try { channel.unsubscribe() } catch {}
      try { client.removeChannel(channel) } catch {}
    }

    return handle
  } catch (e) {
    handle.status = 'errored'
    onStatusChange?.('errored')
    return handle
  }
}
