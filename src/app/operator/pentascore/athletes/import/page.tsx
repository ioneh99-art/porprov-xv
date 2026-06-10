/**
 * PentaScore Excel Import Wizard
 */
import { redirect } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import ExcelImportWizard from '@/components/pentascore/ExcelImportWizard'

export const dynamic = 'force-dynamic'

export default async function ImportPage({
  searchParams,
}: { searchParams: Promise<{ event_id?: string; tenant_id?: string }> }) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login?next=/operator/pentascore/athletes/import')

  const { event_id, tenant_id } = await searchParams

  const [{ data: tenants }, { data: events }] = await Promise.all([
    pscDb.from('ps_tenants').select('id, slug, nama, nama_pendek, color_primary').eq('is_active', true).order('nama'),
    pscDb.from('ps_events').select('id, tenant_id, nama, tanggal_mulai, ps_tenants(nama_pendek)').order('tanggal_mulai', { ascending: false }),
  ])

  return (
    <PentascoreShell
      title="Excel Import Wizard"
      subtitle="Bulk import athletes from Excel template"
      crumbs={[
        { label: 'Athletes', href: '/operator/pentascore/athletes' },
        { label: 'Import' },
      ]}
    >
      <ExcelImportWizard
        tenants={tenants ?? []}
        events={(events ?? []) as any}
        defaultEventId={event_id}
        defaultTenantId={tenant_id}
      />
    </PentascoreShell>
  )
}
