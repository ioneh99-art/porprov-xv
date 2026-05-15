'use client'
import { useEffect, useState } from 'react'
import { useTenant } from '@/hooks/useTenant'

// Lazy import per tenant
import dynamic from 'next/dynamic'

const LoginJabar  = dynamic(() => import('@/components/login/LoginJabar'))
const LoginBekasi = dynamic(() => import('@/components/login/LoginBekasi'))
const LoginBogor  = dynamic(() => import('@/components/login/LoginBogor'))
const LoginDepok  = dynamic(() => import('@/components/login/LoginDepok'))

export default function LoginPage() {
  const tenant = useTenant()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return (
    <div style={{ minHeight:'100vh', background:'#080f1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (tenant.id === 'bekasi') return <LoginBekasi />
  if (tenant.id === 'bogor')  return <LoginBogor />
  if (tenant.id === 'depok')  return <LoginDepok />
  return <LoginJabar />
}