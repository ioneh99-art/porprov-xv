'use client'
import { useEffect, useState } from 'react'
import { useTenant } from '@/hooks/useTenant'
import dynamic from 'next/dynamic'

const DashboardDefault = dynamic(() => import('@/components/dashboard/DashboardDefault'))
const DashboardBekasi  = dynamic(() => import('@/components/dashboard/DashboardBekasi'))
const DashboardBogor   = dynamic(() => import('@/components/dashboard/DashboardBogor'))
const DashboardDepok   = dynamic(() => import('@/components/dashboard/DashboardDepok'))

export default function KonidaDashboardPage() {
  const tenant = useTenant()
  const [mounted, setMounted] = useState(false)
  useEffect(()=>setMounted(true),[])

  if(!mounted) return (
    <div className="flex items-center justify-center h-64">
      <div style={{width:28,height:28,border:'2px solid rgba(255,255,255,0.05)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if(tenant.id==='bekasi') return <DashboardBekasi/>
  if(tenant.id==='bogor')  return <DashboardBogor/>
  if(tenant.id==='depok')  return <DashboardDepok/>
  return <DashboardDefault/>
}