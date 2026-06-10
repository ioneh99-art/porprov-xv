/**
 * Demo Seed Page
 * /operator/pentascore/demo-seed
 */
import { redirect } from 'next/navigation'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import DemoSeedClient from '@/components/pentascore/DemoSeedClient'

export const dynamic = 'force-dynamic'

export default async function DemoSeedPage() {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login?next=/operator/pentascore/demo-seed')

  const { data: tenants } = await pscDb
    .from('ps_tenants')
    .select('id, slug, nama, nama_pendek')
    .eq('is_active', true)
    .order('nama')

  return (
    <PentascoreShell
      title="Demo Seed"
      subtitle="One-click create a fully-populated demo event for showcase walkthrough"
      crumbs={[{ label: 'Demo Seed' }]}
    >
      <DemoSeedClient tenants={tenants ?? []} />
    </PentascoreShell>
  )
}
