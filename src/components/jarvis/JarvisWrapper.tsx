'use client'
import { usePathname } from 'next/navigation'
import { JarvisStatusBar } from './JarvisStatusBar'
import { JarvisChatButton } from './JarvisChatButton'

// Jarvis hanya aktif untuk rute kabbandung
const JARVIS_ROUTES = ['/konida/dashboard/kabbandung', '/konida/atlet/kabbandung', '/konida/warroom/kabbandung']

export function JarvisWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = JARVIS_ROUTES.some(r => pathname?.startsWith(r))

  return (
    <>
      {isActive && <JarvisStatusBar />}
      {children}
      {isActive && <JarvisChatButton />}
    </>
  )
}
