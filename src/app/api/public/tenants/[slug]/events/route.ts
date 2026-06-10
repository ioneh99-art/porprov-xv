/**
 * PentaScore PUBLIC API — Tenant Event Lookup
 * GET /api/public/tenants/[slug]/events?status=live  → list active events for tenant
 * GET /api/public/tenants/[slug]/events/[eventSlugOrId] → resolve single event
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  // Resolve tenant by slug
  const { data: tenant } = await pscDb
    .from('ps_tenants')
    .select('id, slug, nama, nama_pendek, logo_url, color_primary, color_secondary, tagline, level, tipe')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Query events
  let q = pscDb
    .from('ps_events')
    .select('id, slug, nama, tanggal_mulai, tanggal_selesai, lokasi, age_group, gender_mode, status')
    .eq('tenant_id', tenant.id)
    .order('tanggal_mulai', { ascending: false })

  if (status === 'live') {
    q = q.in('status', ['ongoing', 'completed'])
  }

  const { data: events } = await q

  return NextResponse.json({
    tenant,
    events: events ?? [],
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
