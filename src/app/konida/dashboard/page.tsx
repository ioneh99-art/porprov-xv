'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const DashboardDefault = dynamic(() => import('@/components/dashboard/DashboardDefault'))
const DashboardBekasi  = dynamic(() => import('@/components/dashboard/DashboardBekasi'))
const DashboardBogor   = dynamic(() => import('@/components/dashboard/DashboardBogor'))
const DashboardDepok   = dynamic(() => import('@/components/dashboard/DashboardDepok'))

export default function KonidaDashboardPage() {
  const [tenant, setTenant] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) { setTenant('default'); return }
        const id = data.kontingen_id
        if (id === 23) setTenant('bekasi')
        else if (id === 19) setTenant('bogor')
        else if (id === 24) setTenant('depok')
        else setTenant('default')
      })
      .catch(() => setTenant('default'))
  }, [])

  if (!tenant) return (
    <div className="flex items-center justify-center h-64">
      <div style={{ width:28, height:28, border:'2px solid rgba(255,255,255,0.05)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (tenant === 'bekasi') return <DashboardBekasi/>
  if (tenant === 'bogor')  return <DashboardBogor/>
  if (tenant === 'depok')  return <DashboardDepok/>
  return <DashboardDefault/>
}