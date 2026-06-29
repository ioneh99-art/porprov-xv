'use client'
// src/app/login/page.tsx
// Wrap dalam Suspense karena LoginJabar pakai useSearchParams()
// + fallback: kalau diakses dari domain Dayung, arahkan ke login Dayung.

import { Suspense, useEffect, useState } from 'react'
import LoginJabar from '@/components/login/LoginJabar'

export default function LoginPage() {
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && /dayung/i.test(window.location.hostname)) {
      setRedirecting(true)
      window.location.replace('/login/dayung')
    }
  }, [])

  if (redirecting) {
    return <div style={{ minHeight: '100vh', background: '#020a14' }} />
  }

  return (
    <Suspense>
      <LoginJabar />
    </Suspense>
  )
}
