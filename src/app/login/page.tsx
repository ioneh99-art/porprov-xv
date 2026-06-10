'use client'
// src/app/login/page.tsx
// Wrap dalam Suspense karena LoginJabar pakai useSearchParams()

import { Suspense } from 'react'
import LoginJabar from '@/components/login/LoginJabar'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginJabar />
    </Suspense>
  )
}
