/**
 * PentaScore Events — list + create
 */
import { redirect } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import EventListClient from '@/components/pentascore/EventListClient'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login?next=/operator/pentascore/events')

  const [{ data: events }, { data: tenants }] = await Promise.all([
    pscDb
      .from('ps_events')
      .select(`
        id, tenant_id, nama, slug, tanggal_mulai, tanggal_selesai, lokasi,
        age_group, gender_mode, format_type, status,
        has_quali, has_semi, has_final, disciplines,
        ps_tenants(nama_pendek, slug, color_primary)
      `)
      .order('tanggal_mulai', { ascending: false }),
    pscDb
      .from('ps_tenants')
      .select('id, slug, nama, nama_pendek, color_primary')
      .eq('is_active', true)
      .order('nama'),
  ])

  return (
    <PentascoreShell
      title="Events"
      subtitle="Pentathlon competitions, ranking events, and championship rounds"
      crumbs={[{ label: 'Events' }]}
    >
      <EventListClient
        initialEvents={(events ?? []) as any}
        tenants={tenants ?? []}
      />
    </PentascoreShell>
  )
}
