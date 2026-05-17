// hooks/useTenant.ts
'use client'
import { useState, useEffect } from 'react'
import { TenantConfig, TenantId, TENANTS, getTenantConfig } from '@/lib/tenants'

const VALID_TENANTS: TenantId[] = ['jabar', 'bekasi', 'bogor', 'depok']

// Cek apakah user sedang logged in (ada session cookie)
function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return document.cookie
    .split('; ')
    .some(c => c.trim().startsWith('porprov_session='))
}

function detectTenant(): TenantId {
  if (typeof window === 'undefined') return 'jabar'

  // 1. Query param — SELALU prioritas tertinggi
  const params = new URLSearchParams(window.location.search)
  const q = params.get('tenant') as TenantId | null
  if (q && VALID_TENANTS.includes(q)) {
    try { localStorage.setItem('tenant_id', q) } catch {}
    document.cookie = `tenant_id=${q}; path=/; max-age=86400; samesite=lax`
    return q
  }

  // ── KUNCI FIX: kalau tidak ada session, jangan baca localStorage ──
  // Ini mencegah branding tenant lama muncul di halaman login setelah logout
  if (!isLoggedIn()) {
    // Bersihkan tenant_id cookie yang mungkin masih tersisa
    try { localStorage.removeItem('tenant_id') } catch {}
    document.cookie = 'tenant_id=; path=/; max-age=0; samesite=lax'

    // Baca login_origin untuk tahu halaman login mana yang aktif
    const loginOrigin = document.cookie
      .split('; ')
      .find(c => c.trim().startsWith('login_origin='))
      ?.split('=')[1]

    // Map login_origin ke tenant
    const originToTenant: Record<string, TenantId> = {
      bekasi: 'bekasi',
      bogor:  'bogor',
      depok:  'depok',
      jabar:  'jabar',
      konida: 'jabar',
      koni_jabar: 'jabar',
      superadmin: 'jabar',
    }

    if (loginOrigin && originToTenant[loginOrigin]) {
      return originToTenant[loginOrigin]
    }

    // Tidak ada hint apapun → default jabar
    return 'jabar'
  }

  // ── User sedang login → baca tenant dari storage ──────────────
  // 2. localStorage
  try {
    const ls = localStorage.getItem('tenant_id') as TenantId | null
    if (ls && VALID_TENANTS.includes(ls)) return ls
  } catch {}

  // 3. Cookie tenant_id
  const tc = document.cookie
    .split(';')
    .find(c => c.trim().startsWith('tenant_id='))
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
  }, [])

  return tenant
}

// Dipanggil saat login berhasil — set tenant untuk sesi ini
export function setTenantPersist(tenantId: TenantId) {
  try { localStorage.setItem('tenant_id', tenantId) } catch {}
  document.cookie = `tenant_id=${tenantId}; path=/; max-age=86400; samesite=lax`
}

// Dipanggil saat logout — clear semua tenant data
export function clearTenant() {
  try { localStorage.removeItem('tenant_id') } catch {}
  document.cookie = 'tenant_id=; path=/; max-age=0; samesite=lax'
}