import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const DAYUNG_CABOR_MATCH = /dayung/i

// Guard akses Dayung. Navigasi ditangani OperatorSidebar (cabor-aware) di /operator/layout.
export default async function DayungLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get('porprov_session')?.value
  let user: any = null
  try { user = session ? JSON.parse(session) : null } catch {}

  if (!user) redirect('/login?next=/operator/dayung')

  const isAdmin = user.role === 'admin' || user.role === 'superadmin'
  const isDayungOperator = user.role === 'operator_cabor' && (
    DAYUNG_CABOR_MATCH.test(user.cabor_nama ?? '') ||
    DAYUNG_CABOR_MATCH.test(user.username ?? '')
  )

  if (!isAdmin && !isDayungOperator) redirect('/operator/dashboard')

  return <>{children}</>
}
