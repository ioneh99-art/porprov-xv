/**
 * PentaScore API — Audit Log Browse
 * GET /api/pentascore/audit
 *   ?tenant_id  - filter by tenant
 *   ?event_id   - filter by event
 *   ?action     - filter by action_type (create|update|delete|lock|unlock|compute|import)
 *   ?actor      - filter by actor_username
 *   ?from       - ISO date (created_at >=)
 *   ?to         - ISO date (created_at <=)
 *   ?q          - search target_table OR target_id substring
 *   ?limit      - max rows (default 100, max 500)
 *   ?offset     - pagination offset
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenant_id')
  const eventId  = searchParams.get('event_id')
  const action   = searchParams.get('action')
  const actor    = searchParams.get('actor')
  const from     = searchParams.get('from')
  const to       = searchParams.get('to')
  const q        = searchParams.get('q')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
  const offset   = parseInt(searchParams.get('offset') ?? '0', 10)

  let query = pscDb
    .from('ps_audit_log')
    .select(`*,
      ps_tenants(id, slug, nama_pendek),
      ps_events(id, slug, nama)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tenantId)  query = query.eq('tenant_id', tenantId)
  if (eventId)   query = query.eq('event_id', eventId)
  if (action)    query = query.eq('action_type', action)
  if (actor)     query = query.ilike('actor_username', `%${actor}%`)
  if (from)      query = query.gte('created_at', from)
  if (to)        query = query.lte('created_at', to)
  if (q) {
    // Search target_table OR target_id
    query = query.or(`target_table.ilike.%${q}%,target_id.eq.${isUuid(q) ? q : '00000000-0000-0000-0000-000000000000'}`)
  }

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    rows: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
