import KonidaSidebar from '@/components/KonidaSidebar'
import ChatbotWidget from '@/components/ChatbotWidget'
import { cookies } from 'next/headers'

export default function KonidaLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get('porprov_session')?.value
  let user = null
  try { user = session ? JSON.parse(session) : null } catch {}

  return (
    <div className="flex min-h-screen bg-slate-950">
      <KonidaSidebar />
      <main className="ml-56 flex-1 p-7">
        {children}
      </main>
      <ChatbotWidget user={user} />
    </div>
  )
}