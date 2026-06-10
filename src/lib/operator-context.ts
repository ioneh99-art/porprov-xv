/**
 * Helper untuk dapetin context operator dari session/cookie/header.
 * Implementasi nyatanya tergantung auth setup PORPROV XV.
 * 
 * Saat ini fallback ke header X-Operator-Cabor (di-set middleware) atau default '—'.
 */

import { cookies, headers } from 'next/headers'

export type OperatorContext = {
  username: string
  cabor: string
  kontingen: string
  tier: 'BASIC' | 'PRO' | 'ELITE' | 'CHAMPION'
}

export async function getOperatorContext(): Promise<OperatorContext> {
  try {
    const h = await headers()
    const c = await cookies()

    const username = c.get('operator_username')?.value
      ?? h.get('x-operator-username')
      ?? 'operator'

    const cabor = c.get('operator_cabor')?.value
      ?? h.get('x-operator-cabor')
      ?? '—'

    const kontingen = c.get('operator_kontingen')?.value
      ?? h.get('x-operator-kontingen')
      ?? 'Kab. Bogor'

    const tierRaw = c.get('operator_tier')?.value
      ?? h.get('x-operator-tier')
      ?? 'CHAMPION'

    const tier = (['BASIC', 'PRO', 'ELITE', 'CHAMPION'].includes(tierRaw)
      ? tierRaw
      : 'CHAMPION') as OperatorContext['tier']

    return { username, cabor, kontingen, tier }
  } catch {
    return { username: 'operator', cabor: '—', kontingen: 'Kab. Bogor', tier: 'CHAMPION' }
  }
}

/**
 * Hari menuju event PORPROV XV (configurable via env)
 */
export function daysToEvent(): number | null {
  const eventDate = process.env.NEXT_PUBLIC_PORPROV_EVENT_DATE
  if (!eventDate) return null
  const target = new Date(eventDate).getTime()
  const now = Date.now()
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return diff
}
