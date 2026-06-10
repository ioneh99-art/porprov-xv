import OperatorSidebar from '@/components/OperatorSidebar'
import ChatbotWidget from '@/components/ChatbotWidget'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const OPERATOR_ROLES = ['operator_cabor', 'operator', 'admin', 'superadmin']

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get('porprov_session')?.value
  let user: any = null
  try { user = session ? JSON.parse(session) : null } catch {}

  if (!user) redirect('/login')
  if (!OPERATOR_ROLES.includes(user.role)) redirect('/')

  return (
    <div className="flex min-h-screen bg-slate-950">
      <OperatorSidebar />
      <main className="flex-1 p-7 min-w-0">
        {children}
      </main>
      <ChatbotWidget user={user} />
    </div>
  )
}