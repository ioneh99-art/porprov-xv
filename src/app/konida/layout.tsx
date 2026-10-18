//app/konida/layout.tsx

import KonidaLayoutShell from '@/components/KonidaLayoutShell'
import { getServerSession } from '@/lib/guard'

export default async function KonidaLayout({ children }: { children: React.ReactNode }) {
  // Sesi terverifikasi HMAC (bukan JSON.parse cookie yg bisa dipalsukan).
  const user = await getServerSession()

  return (
    <KonidaLayoutShell user={user}>
      {children}
    </KonidaLayoutShell>
  )
}
