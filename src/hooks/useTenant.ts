'use client'
import { useState, useEffect } from 'react'

export type TenantId = string

export interface TenantShape {
  id:          string
  tenantId:    string
  setTenantId: (id: string) => void
  nama:        string
  namaLengkap: string
  primary:     string
  primaryDark: string
  gradient:    string
  logoBg:      string
  logo:        string
  badge:       string
  subtitle:    string
}

const FALLBACK = {
  nama:        'PORPROV XV',
  namaLengkap: 'PORPROV XV Jawa Barat 2026',
  primary:     '#2563eb',
  primaryDark: '#1d4ed8',
  gradient:    'linear-gradient(135deg, #020915, #0f172a)',
  logoBg:      'rgba(37,99,235,0.15)',
  logo:        '/logos/porprov.png',
  badge:       '',
  subtitle:    'Masuk ke portal PORPROV XV',
}

function getSlug(): string {
  if (typeof window === 'undefined') return 'jabar'
  const params = new URLSearchParams(window.location.search)
  if (params.get('tenant')) return params.get('tenant')!
  const fromLS = localStorage.getItem('tenant_id')
  if (fromLS) return fromLS
  const fromCookie = document.cookie.split('; ')
    .find(c => c.startsWith('tenant_id='))?.split('=')[1]
  if (fromCookie) return fromCookie
  return 'jabar'
}

export function useTenant(): TenantShape {
  const [tenantId, setTenantId] = useState<string>('jabar')
  const [data, setData] = useState(FALLBACK)

  useEffect(() => {
    const slug = getSlug()
    setTenantId(slug)
    if (slug === 'jabar') return
    fetch(`/api/tenant?slug=${slug}`)
      .then(r => r.json())
      .then(t => {
        if (!t?.id) return
        setData({
          nama:        t.nama ?? FALLBACK.nama,
          namaLengkap: t.tagline ?? t.nama ?? FALLBACK.namaLengkap,
          primary:     `#${t.color_primary}`,
          primaryDark: `#${t.color_secondary}`,
          gradient:    `linear-gradient(135deg, #${t.color_primary}15, #0f172a)`,
          logoBg:      'rgba(0,0,0,0.2)',
          logo:        t.logo_url ?? FALLBACK.logo,
          badge:       t.login_stats?.[0] ? `${t.login_stats[0].value} ${t.login_stats[0].label}` : '',
          subtitle:    t.login_subtitle ?? FALLBACK.subtitle,
        })
      })
      .catch(() => {})
  }, [])

  return { id:tenantId, tenantId, setTenantId, ...data }
}

export function setTenantPersist(id: TenantId) {
  if (typeof window === 'undefined') return
  localStorage.setItem('tenant_id', id)
  document.cookie = `tenant_id=${id}; path=/; max-age=${60*60*8}; samesite=lax`
}

export function clearTenant() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('tenant_id')
  document.cookie = 'tenant_id=; path=/; max-age=0'
}
