/**
 * PentaScore Results Entry page
 * /operator/pentascore/events/[id]/results
 */
import { redirect, notFound } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import EventSubnav from '@/components/pentascore/EventSubnav'
import ResultsEntryClient from '@/components/pentascore/ResultsEntryClient'

export const dynamic = 'force-dynamic'

export default async function ResultsPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ phase_id?: string; group_id?: string; discipline?: string }>
}) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login')
  const { id } = await params
  const sp = await searchParams

  const { data: ev } = await pscDb
    .from('ps_events').select('*, ps_tenants(nama_pendek)').eq('id', id).single()
  if (!ev) notFound()

  // Load phases + groups
  const { data: phases } = await pscDb
    .from('ps_event_phases')
    .select(`*, ps_groups(id, group_label, sort_order)`)
    .eq('event_id', id)
    .order('sort_order')

  return (
    <PentascoreShell
      title="Results Entry"
      subtitle={`${ev.nama} — input hasil pertandingan per discipline`}
      crumbs={[
        { label: 'Events', href: '/operator/pentascore/events' },
        { label: ev.nama, href: `/operator/pentascore/events/${id}` },
        { label: 'Results' },
      ]}
    >
      <EventSubnav eventId={id} />
      <ResultsEntryClient
        eventId={id}
        event={ev}
        phases={phases ?? []}
        defaultPhaseId={sp.phase_id}
        defaultGroupId={sp.group_id}
        defaultDiscipline={sp.discipline}
      />
    </PentascoreShell>
  )
}
