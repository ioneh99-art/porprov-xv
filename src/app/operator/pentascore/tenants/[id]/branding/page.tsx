/**
 * Tenant Branding page
 * /operator/pentascore/tenants/[id]/branding
 */
import { redirect, notFound } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import TenantBrandingClient from '@/components/pentascore/TenantBrandingClient'

export const dynamic = 'force-dynamic'

export default async function TenantBrandingPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login')
  const { id } = await params

  const { data: tenant } = await pscDb
    .from('ps_tenants').select('*').eq('id', id).single()
  if (!tenant) notFound()

  return (
    <PentascoreShell
      title="Tenant Branding"
      subtitle={`${tenant.nama} — customize logo, colors, and public display branding`}
      crumbs={[
        { label: 'Tenants', href: '/operator/pentascore/tenants' },
        { label: tenant.nama, href: `/operator/pentascore/tenants` },
        { label: 'Branding' },
      ]}
    >
      <TenantBrandingClient tenant={tenant} />
    </PentascoreShell>
  )
}
