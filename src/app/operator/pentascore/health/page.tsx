/**
 * Health Check Dashboard
 * /operator/pentascore/health
 */
import { redirect } from 'next/navigation'
import { getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import HealthCheckClient from '@/components/pentascore/HealthCheckClient'

export const dynamic = 'force-dynamic'

export default async function HealthPage() {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login?next=/operator/pentascore/health')

  return (
    <PentascoreShell
      title="System Health"
      subtitle="Real-time check of all PentaScore subsystems (Database / Storage / Engine / Defense layers)"
      crumbs={[{ label: 'Health' }]}
    >
      <HealthCheckClient />
    </PentascoreShell>
  )
}
