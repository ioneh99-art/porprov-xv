// hooks/useTenant.ts
'use client'
import { useState, useEffect } from 'react'
import { TenantConfig, TenantId, TENANTS, getTenantConfig } from '@/lib/tenants'

const VALID_TENANTS: TenantId[] = ['jabar', 'bekasi', 'bogor', 'depok']

function detectTenant(): TenantId {
  if (typeof window === 'undefined') return 'jabar'

  // 1. Query param — SELALU prioritas tertinggi, override apapun
  const params = new URLSearchParams(window.location.search)
  const q = params.get('tenant') as TenantId | null
  if (q && VALID_TENANTS.includes(q)) {
    // Update localStorage & cookie sesuai query param saat ini
    try { localStorage.setItem('tenant_id', q) } catch {}
    document.cookie = `tenant_id=${q}; path=/; max-age=86400; samesite=lax`
    return q
  }

  // 2. localStorage — hanya kalau tidak ada query param
  try {
    const ls = localStorage.getItem('tenant_id') as TenantId | null
    if (ls && VALID_TENANTS.includes(ls)) return ls
  } catch {}

  // 3. Cookie
  const tc = document.cookie.split(';').find(c => c.trim().startsWith('tenant_id='))
  if (tc) {
    const raw = tc.split('=')[1]?.trim() as TenantId
    if (VALID_TENANTS.includes(raw)) return raw
  }

  // 4. Hostname
  return getTenantConfig(window.location.host).id
}

export function useTenant(): TenantConfig {
  const [tenant, setTenant] = useState<TenantConfig>(TENANTS['jabar'])

  useEffect(() => {
    const id = detectTenant()
    setTenant(TENANTS[id])
  }, []) // jalan sekali saat mount

  return tenant
}

// Dipanggil saat login berhasil — set tenant untuk sesi ini
export function setTenantPersist(tenantId: TenantId) {
  try { localStorage.setItem('tenant_id', tenantId) } catch {}
  document.cookie = `tenant_id=${tenantId}; path=/; max-age=86400; samesite=lax`
}

// Dipanggil saat logout — clear tenant
export function clearTenant() {
  try { localStorage.removeItem('tenant_id') } catch {}
  document.cookie = 'tenant_id=; path=/; max-age=0'
}