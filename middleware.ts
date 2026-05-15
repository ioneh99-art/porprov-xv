// middleware.ts — taruh di ROOT project (sejajar dengan src/)
import { NextRequest, NextResponse } from 'next/server'
import { getTenantId, TenantId } from '@/lib/tenants'

const VALID_TENANTS: TenantId[] = ['jabar', 'bekasi', 'bogor', 'depok']

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? 'localhost:3000'

  // Cek query param ?tenant=bekasi dulu (untuk testing/dev)
  const url = req.nextUrl
  const queryTenant = url.searchParams.get('tenant') as TenantId | null
  const tenantId: TenantId = (queryTenant && VALID_TENANTS.includes(queryTenant))
    ? queryTenant
    : getTenantId(host)

  const res = NextResponse.next()
  res.headers.set('x-tenant-id', tenantId)

  // Set cookie tenant — persist saat navigate antar halaman
  res.cookies.set('tenant_id', tenantId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24, // 1 hari
  })

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
}