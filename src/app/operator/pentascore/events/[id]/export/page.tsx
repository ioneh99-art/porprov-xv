/**
 * Event Export Center
 * /operator/pentascore/events/[id]/export
 */
import { redirect, notFound } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import EventSubnav from '@/components/pentascore/EventSubnav'
import EventExportPanel from '@/components/pentascore/EventExportPanel'

export const dynamic = 'force-dynamic'

export default async function ExportPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login')
  const { id } = await params

  const { data: ev } = await pscDb
    .from('ps_events')
    .select('*, ps_tenants(slug, nama, nama_pendek, color_primary, logo_url)')
    .eq('id', id)
    .single()
  if (!ev) notFound()

  const { data: phases } = await pscDb
    .from('ps_event_phases')
    .select('id, phase_type, phase_label, gender, is_locked, sort_order')
    .eq('event_id', id)
    .order('sort_order')

  return (
    <PentascoreShell
      title="Export Center"
      subtitle={`${ev.nama} — UIPM-format export & PDF certificates`}
      crumbs={[
        { label: 'Events', href: '/operator/pentascore/events' },
        { label: ev.nama, href: `/operator/pentascore/events/${id}` },
        { label: 'Export' },
      ]}
    >
      <EventSubnav eventId={id} tenantSlug={ev.ps_tenants?.slug} eventSlug={ev.slug} />
      <EventExportPanel
        eventId={id}
        eventName={ev.nama}
        phases={phases ?? []}
      />
    </PentascoreShell>
  )
}
