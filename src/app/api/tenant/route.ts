// src/app/api/tenant/route.ts
// Public API — return tenant config by slug
// Dipakai oleh dynamic login page (client-side fetch)

import { NextRequest, NextResponse } from 'next/server'
import { getTenantBySlug } from '../../../lib/tenants'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const tenant = await getTenantBySlug(slug)

  // Jangan expose data sensitif
  const safe = {
    id:             tenant.id,
    nama:           tenant.nama,
    nama_pendek:    tenant.nama_pendek,
    color_primary:  tenant.color_primary,
    color_secondary:tenant.color_secondary,
    color_accent:   tenant.color_accent,
    logo_url:       tenant.logo_url,
    tagline:        tenant.tagline,
    login_title:    tenant.login_title,
    login_subtitle: tenant.login_subtitle,
    login_hero_text:tenant.login_hero_text,
    login_theme:    tenant.login_theme,
    login_layout:   tenant.login_layout,
    login_stats:    tenant.login_stats,
    login_venues:   tenant.login_venues,
    dashboard_type: tenant.dashboard_type,
    level:          tenant.level,
    plan_id:        tenant.plan_id,
    kontingen_id:   tenant.kontingen_id,
  }

  return NextResponse.json(safe, {
    headers: { 'Cache-Control': 'public, max-age=300' } // cache 5 menit
  })
}
