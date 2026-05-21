'use client'
// src/app/konida/dashboard/page.tsx — FIXED router

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const DashboardDefault  = dynamic(() => import('@/components/dashboard/DashboardDefault'))
const DashboardBekasi   = dynamic(() => import('@/components/dashboard/DashboardBekasi'))
const DashboardBogor    = dynamic(() => import('@/components/dashboard/DashboardBogor'))
const DashboardDepok    = dynamic(() => import('@/components/dashboard/DashboardDepok'))
const DashboardKabBogor = dynamic(() => import('@/app/konida/dashboard/kabbogor/page'))
const DashboardPremium  = dynamic(() => import('@/app/konida/dashboard/premium/page'))

export default function KonidaDashboardPage() {
  const [tenant, setTenant] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) { setTenant('default'); return }
        const id   = data.kontingen_id
        const plan = data.plan_id ?? 'basic'

        // Penyelenggara (Kota)
        if (id === 23) { setTenant('bekasi');  return }
        if (id === 19) { setTenant('bogor');   return }
        if (id === 24) { setTenant('depok');   return }

        // Premium custom dashboard per kontingen
        if (id === 1)  { setTenant('kabbogor');  return }
        if (id === 16) { setTenant('kabbekasi'); return }

        // Premium generic
        if (plan === 'premium' || plan === 'enterprise') {
          setTenant('premium'); return
        }

        setTenant('default')
      })
      .catch(() => setTenant('default'))
  }, [])

  if (!tenant) return (
    <div className="flex items-center justify-center h-64">
      <div style={{ width:28, height:28, border:'3px solid rgba(6,95,70,0.15)', borderTopColor:'#065f46', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (tenant === 'bekasi')   return <DashboardBekasi/>
  if (tenant === 'bogor')    return <DashboardBogor/>
  if (tenant === 'depok')    return <DashboardDepok/>
  if (tenant === 'kabbogor') return <DashboardKabBogor/>
  if (tenant === 'premium')  return <DashboardPremium/>
  return <DashboardDefault/>
}