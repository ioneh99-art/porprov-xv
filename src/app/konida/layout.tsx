//app/konida/layout.tsx

import KonidaLayoutShell from '@/components/KonidaLayoutShell'
import { cookies } from 'next/headers'

export default function KonidaLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get('porprov_session')?.value
  let user = null
  try { user = session ? JSON.parse(session) : null } catch {}

  return (
    <KonidaLayoutShell user={user}>
      {children}
    </KonidaLayoutShell>
  )
}
