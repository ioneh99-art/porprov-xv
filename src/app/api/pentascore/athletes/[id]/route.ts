import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: before } = await pscDb
    .from('ps_athletes').select('*').eq('id', id).single()
  if (!before) return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })

  const { error } = await pscDb.from('ps_athletes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    tenantId:       before.tenant_id,
    actorUsername:  session.username,
    actorRole:      session.role,
    actionType:     'delete',
    targetTable:    'ps_athletes',
    targetId:       id,
    oldValues:      before,
  })

  return NextResponse.json({ deleted: true })
}
