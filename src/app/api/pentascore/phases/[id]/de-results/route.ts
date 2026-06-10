/**
 * PentaScore API — DE Results Read
 * GET /api/pentascore/phases/[id]/de-results  → list existing DE positions
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: phaseId } = await params

  const { data, error } = await pscDb
    .from('ps_results_fencing_de')
    .select(`
      *,
      ps_event_athletes(id, nama_lengkap, gender, start_number, uipm_id)
    `)
    .eq('phase_id', phaseId)
    .order('de_position', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
