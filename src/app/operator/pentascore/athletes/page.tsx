/**
 * PentaScore Athletes — list/search page
 */
import { redirect } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import AthleteListClient from '@/components/pentascore/AthleteListClient'

export const dynamic = 'force-dynamic'

export default async function AthletesPage({
  searchParams,
}: { searchParams: Promise<{ event_id?: string; tenant_id?: string }> }) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login?next=/operator/pentascore/athletes')

  const { event_id, tenant_id } = await searchParams

  // Load tenants for filter dropdown
  const { data: tenants } = await pscDb
    .from('ps_tenants')
    .select('id, slug, nama, nama_pendek, color_primary')
    .eq('is_active', true)
    .order('nama')

  // Load events for filter
  const { data: events } = await pscDb
    .from('ps_events')
    .select('id, nama, ps_tenants(nama_pendek)')
    .order('tanggal_mulai', { ascending: false })

  // If event filter — load enrolled athletes (event_athletes)
  let athletes: any[] = []
  let enrolledMode = false

  if (event_id) {
    enrolledMode = true
    const { data } = await pscDb
      .from('ps_event_athletes')
      .select(`
        id, athlete_id, nama_lengkap, uipm_id, gender, tanggal_lahir,
        negara_code, affiliation_nama, start_number, enrollment_status,
        enrolled_at
      `)
      .eq('event_id', event_id)
      .order('start_number', { ascending: true, nullsFirst: false })
    athletes = data ?? []
  } else {
    // Master list
    let q = pscDb
      .from('ps_athletes')
      .select(`
        id, uipm_id, nama_lengkap, gender, tanggal_lahir,
        negara_code, negara_nama, affiliation_nama, is_active, created_at,
        ps_tenants(nama_pendek, color_primary)
      `)
      .order('nama_lengkap')
      .limit(500)

    if (tenant_id) q = q.eq('tenant_id', tenant_id)
    const { data } = await q
    athletes = data ?? []
  }

  return (
    <PentascoreShell
      title="Athletes"
      subtitle={enrolledMode ? 'Enrolled athletes for this event' : 'Master athlete registry'}
      crumbs={[{ label: 'Athletes' }]}
    >
      <AthleteListClient
        initialAthletes={athletes}
        tenants={tenants ?? []}
        events={(events ?? []) as any}
        eventId={event_id}
        tenantId={tenant_id}
        enrolledMode={enrolledMode}
      />
    </PentascoreShell>
  )
}
