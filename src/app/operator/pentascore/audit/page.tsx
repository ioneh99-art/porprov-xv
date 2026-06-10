/**
 * PentaScore Audit Log Viewer
 * /operator/pentascore/audit
 */
import { redirect } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import AuditLogClient from '@/components/pentascore/AuditLogClient'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login?next=/operator/pentascore/audit')

  const [{ data: tenants }, { data: events }] = await Promise.all([
    pscDb.from('ps_tenants').select('id, slug, nama, nama_pendek').eq('is_active', true).order('nama'),
    pscDb.from('ps_events').select('id, nama, tenant_id, tanggal_mulai').order('tanggal_mulai', { ascending: false }).limit(100),
  ])

  return (
    <PentascoreShell
      title="Audit Log"
      subtitle="Immutable trail of all data mutations (Defense Layer L3)"
      crumbs={[{ label: 'Audit' }]}
    >
      <AuditLogClient tenants={tenants ?? []} events={events ?? []} />
    </PentascoreShell>
  )
}
