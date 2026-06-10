/**
 * PentaScore DE Bracket Visualization
 * /operator/pentascore/events/[id]/bracket
 */
import { redirect, notFound } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import EventSubnav from '@/components/pentascore/EventSubnav'
import BracketClient from '@/components/pentascore/BracketClient'

export const dynamic = 'force-dynamic'

export default async function BracketPage({
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
    .from('ps_events').select('*').eq('id', id).single()
  if (!ev) notFound()

  // Only semi/final phases relevant for DE bracket
  const { data: phases } = await pscDb
    .from('ps_event_phases')
    .select('id, phase_type, phase_label, gender, sort_order, is_locked, expected_size')
    .eq('event_id', id)
    .in('phase_type', ['semi','final'])
    .order('sort_order')

  return (
    <PentascoreShell
      title="DE Bracket"
      subtitle={`${ev.nama} — Fencing Direct Elimination 18-position visualization`}
      crumbs={[
        { label: 'Events', href: '/operator/pentascore/events' },
        { label: ev.nama, href: `/operator/pentascore/events/${id}` },
        { label: 'Bracket' },
      ]}
    >
      <EventSubnav eventId={id} />
      <BracketClient
        eventId={id}
        phases={phases ?? []}
        defaultPhaseId={sp.phase_id}
      />
    </PentascoreShell>
  )
}
