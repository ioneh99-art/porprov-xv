'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import KonidaSidebar from './KonidaSidebar'
import ChatbotWidget from './ChatbotWidget'
import { JarvisWrapper } from './jarvis/JarvisWrapper'

interface Props {
  children: React.ReactNode
  user: Record<string, unknown> | null
}

export default function KonidaLayoutShell({ children, user }: Props) {
  const pathname = usePathname()
  const isLogin  = pathname.includes('/login')
  // Di HP menu samping dilipat; tombol ☰ di bilah atas membukanya. Pindah halaman → tertutup lagi.
  const [menuBuka, setMenuBuka] = useState(false)
  useEffect(() => { setMenuBuka(false) }, [pathname])
  useEffect(() => {
    if (!menuBuka) return
    const tekan = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuBuka(false) }
    window.addEventListener('keydown', tekan)
    return () => window.removeEventListener('keydown', tekan)
  }, [menuBuka])

  if (isLogin) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-slate-950">
      <KonidaSidebar terbuka={menuBuka} tutup={() => setMenuBuka(false)} />
      {menuBuka && <div aria-hidden className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMenuBuka(false)} />}
      <main className="md:ml-56 flex-1 min-w-0">
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-3 py-2.5 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <button onClick={() => setMenuBuka(true)} aria-label="Buka menu" aria-expanded={menuBuka}
            className="rounded-lg p-2 -ml-1 text-slate-200 hover:bg-slate-800">
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-white">Menu</span>
        </div>
        <JarvisWrapper>
          <div className="p-3 md:p-7">{children}</div>
        </JarvisWrapper>
      </main>
      <ChatbotWidget user={user} />
    </div>
  )
}
