/**
 * PentaScore Live Standings page
 * /operator/pentascore/events/[id]/standings
 */
import { redirect, notFound } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import EventSubnav from '@/components/pentascore/EventSubnav'
import StandingsClient from '@/components/pentascore/StandingsClient'

export const dynamic = 'force-dynamic'

export default async function StandingsPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ phase_id?: string }>
}) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login')
  const { id } = await params
  const sp = await searchParams

  const { data: ev } = await pscDb
    .from('ps_events').select('*, ps_tenants(nama_pendek, color_primary)').eq('id', id).single()
  if (!ev) notFound()

  const { data: phases } = await pscDb
    .from('ps_event_phases')
    .select('id, phase_type, phase_label, gender, sort_order, is_locked')
    .eq('event_id', id)
    .order('sort_order')

  return (
    <PentascoreShell
      title="Live Standings"
      subtitle={`${ev.nama} — klasemen aggregat 4 disiplin`}
      crumbs={[
        { label: 'Events', href: '/operator/pentascore/events' },
        { label: ev.nama, href: `/operator/pentascore/events/${id}` },
        { label: 'Standings' },
      ]}
    >
      <EventSubnav eventId={id} />
      <StandingsClient
        eventId={id}
        event={ev}
        phases={phases ?? []}
        defaultPhaseId={sp.phase_id}
      />
    </PentascoreShell>
  )
}
