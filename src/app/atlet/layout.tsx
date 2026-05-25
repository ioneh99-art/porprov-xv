// src/app/atlet/layout.tsx — v2 dengan sidebar
// Login page TIDAK pakai sidebar, dashboard DAN halaman lain pakai sidebar

'use client'
import { usePathname } from 'next/navigation'
import AtletSidebar from '../../components/atlet/AtletSidebar'

const NO_SIDEBAR = ['/atlet/login', '/atlet/daftar']

export default function AtletLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showSidebar = !NO_SIDEBAR.includes(pathname)

  if (!showSidebar) return <>{children}</>

  return (
    <div className="flex min-h-screen" style={{ background:'#020D06' }}>
      <AtletSidebar/>
      <main className="flex-1 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  )
}