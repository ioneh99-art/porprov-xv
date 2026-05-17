'use client'
// src/components/LogoutButton.tsx
// Logout universal — redirect ke login page yang SAMA saat masuk

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'

interface Props {
  className?: string
  iconOnly?: boolean
  label?: string
}

// Map origin → login page
const LOGIN_PAGES: Record<string, string> = {
  bekasi:     '/login/bekasi',
  bogor:      '/login/bogor',
  depok:      '/login/depok',
  superadmin: '/login/superadmin',
  jabar:      '/login/jabar',
  konida:     '/login/jabar',   // default konida pakai halaman jabar
}

function getLoginPageFromCookie(): string {
  // Baca cookie login_origin di client
  const match = document.cookie
    .split('; ')
    .find(r => r.startsWith('login_origin='))
  const origin = match?.split('=')[1] ?? 'konida'
  return LOGIN_PAGES[origin] ?? '/login/jabar'
}

export default function LogoutButton({ className, iconOnly, label = 'Keluar' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      const data = await res.json()

      // Prioritas: 1) dari API response, 2) dari cookie client-side
      const target = data?.redirect ?? getLoginPageFromCookie()
      router.push(target)
    } catch {
      // Fallback: baca cookie langsung
      const target = getLoginPageFromCookie()
      router.push(target)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className}
      title={label}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin" />
        : <LogOut size={14} />}
      {!iconOnly && <span>{loading ? 'Keluar...' : label}</span>}
    </button>
  )
}