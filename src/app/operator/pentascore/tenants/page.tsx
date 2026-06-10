/**
 * PentaScore Tenants — CRUD page
 * Lists all tenants, allows create/edit/deactivate.
 */
import { redirect } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import TenantListClient from '@/components/pentascore/TenantListClient'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login?next=/operator/pentascore/tenants')

  const { data: tenants } = await pscDb
    .from('ps_tenants')
    .select('id, slug, nama, nama_pendek, tipe, level, color_primary, is_active, created_at')
    .order('nama')

  return (
    <PentascoreShell
      title="Tenants"
      subtitle="Configure federation, pengprov, or club organizations using PentaScore"
      crumbs={[{ label: 'Tenants' }]}
    >
      <TenantListClient initialTenants={tenants ?? []} />
    </PentascoreShell>
  )
}
