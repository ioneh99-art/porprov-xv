/**
 * PentaScore API — Single tenant
 * PUT    /api/pentascore/tenants/[id]  → update
 * DELETE /api/pentascore/tenants/[id]  → delete (cascade)
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Get current state for audit
  const { data: before } = await pscDb
    .from('ps_tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (!before) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Whitelist allowed fields (do NOT allow slug change after creation)
  const allowed = [
    'nama','nama_pendek','tipe','level',
    'color_primary','color_secondary','logo_url','tagline',
    'email_kontak','telepon','alamat',
    'is_active','notes',
  ]
  const update: any = {}
  for (const k of allowed) {
    if (k in body) update[k] = body[k]
  }

  const { data, error } = await pscDb
    .from('ps_tenants')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    tenantId:       id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'update',
    targetTable:    'ps_tenants',
    targetId:       id,
    oldValues:      before,
    newValues:      update,
  })

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only superadmin or tenant_admin can delete
  if (!['superadmin','tenant_admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const { data: before } = await pscDb
    .from('ps_tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (!before) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { error } = await pscDb.from('ps_tenants').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'delete',
    targetTable:    'ps_tenants',
    targetId:       id,
    oldValues:      before,
    reason:         'Tenant deletion by user request',
  })

  return NextResponse.json({ deleted: true, id })
}
