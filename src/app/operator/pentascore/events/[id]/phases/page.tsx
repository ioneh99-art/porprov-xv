/**
 * PentaScore Phases Setup page
 * /operator/pentascore/events/[id]/phases
 */
import { redirect, notFound } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import EventSubnav from '@/components/pentascore/EventSubnav'
import PhasesSetupClient from '@/components/pentascore/PhasesSetupClient'

export const dynamic = 'force-dynamic'

export default async function PhasesPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login')
  const { id } = await params

  const { data: ev } = await pscDb
    .from('ps_events').select('*, ps_tenants(nama_pendek)').eq('id', id).single()
  if (!ev) notFound()

  const { data: phases } = await pscDb
    .from('ps_event_phases')
    .select(`
      *,
      ps_groups(id, group_label, expected_size, sort_order,
        ps_group_athletes(id, ps_event_athletes(id, nama_lengkap, gender, start_number)))
    `)
    .eq('event_id', id)
    .order('sort_order')

  const { count: enrolledCount } = await pscDb
    .from('ps_event_athletes').select('id', { count: 'exact', head: true }).eq('event_id', id)

  return (
    <PentascoreShell
      title="Phases & Groups Setup"
      subtitle={`${ev.nama} — manage rounds, groups, and athlete distribution`}
      crumbs={[
        { label: 'Events', href: '/operator/pentascore/events' },
        { label: ev.nama, href: `/operator/pentascore/events/${id}` },
        { label: 'Phases' },
      ]}
    >
      <EventSubnav eventId={id} />
      <PhasesSetupClient
        eventId={id}
        event={ev}
        initialPhases={phases ?? []}
        enrolledCount={enrolledCount ?? 0}
      />
    </PentascoreShell>
  )
}
