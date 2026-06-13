'use client'

import { usePathname } from 'next/navigation'
import KonidaSidebar from './KonidaSidebar'
import ChatbotWidget from './ChatbotWidget'

interface Props {
  children: React.ReactNode
  user: Record<string, unknown> | null
}

export default function KonidaLayoutShell({ children, user }: Props) {
  const pathname = usePathname()
  const isLogin  = pathname.includes('/login')

  if (isLogin) return <>{children}</>

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
