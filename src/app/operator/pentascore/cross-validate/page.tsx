/**
 * Cross-Validation Tool (Defense Layer L2)
 * /operator/pentascore/cross-validate
 */
import { redirect } from 'next/navigation'
import { getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import CrossValidateClient from '@/components/pentascore/CrossValidateClient'

export const dynamic = 'force-dynamic'

export default async function CrossValidatePage() {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login?next=/operator/pentascore/cross-validate')

  return (
    <PentascoreShell
      title="Cross-Validation Tool"
      subtitle="Compare PentaScore output vs. official UIPM published results (Defense Layer L2)"
      crumbs={[{ label: 'Cross-Validation' }]}
    >
      <CrossValidateClient />
    </PentascoreShell>
  )
}
