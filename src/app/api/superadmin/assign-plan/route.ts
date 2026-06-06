// src/app/api/superadmin/assign-plan/route.ts
// ═══════════════════════════════════════════════════════════
// API endpoint untuk assign plan + level — BYPASS RLS via SERVICE_ROLE_KEY
// Solves: "new row violates row-level security policy"
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Server-side client dengan SERVICE_ROLE_KEY (bypass RLS) ──
const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

type UserLevel = 'superadmin' | 'koni_jabar' | 'level1' | 'level2' | 'level3'
const VALID_LEVELS: UserLevel[] = ['superadmin', 'koni_jabar', 'level1', 'level2', 'level3']

interface AssignPayload {
  kontingen_id:     number
  plan_id:          string
  level?:           UserLevel
  valid_until?:     string | null
  max_users?:       number
  max_atlet?:       number
  features_add?:    string[]
  features_remove?: string[]
  catatan?:         string
  created_by:       string
  is_trial?:        boolean
}

// ═══════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  console.log('[API /assign-plan] received request')

  // Verifikasi env vars
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
    console.error('[API /assign-plan] ❌ SERVICE_ROLE_KEY tidak ter-set!')
    return NextResponse.json({
      ok: false,
      error: 'Server config error: SUPABASE_SERVICE_ROLE_KEY tidak ada di environment',
    }, { status: 500 })
  }

  let body: AssignPayload
  try {
    body = await req.json()
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  console.log('[API /assign-plan] payload:', body)

  // Validasi input
  if (!body.kontingen_id) {
    return NextResponse.json({ ok: false, error: 'kontingen_id wajib diisi' }, { status: 400 })
  }
  if (!body.plan_id) {
    return NextResponse.json({ ok: false, error: 'plan_id wajib diisi' }, { status: 400 })
  }
  if (body.level && !VALID_LEVELS.includes(body.level)) {
    return NextResponse.json({ ok: false, error: `Level invalid: ${body.level}` }, { status: 400 })
  }

  const warnings: string[] = []

  try {
    // ════ STEP 1: Nonaktifkan subscription lama ════
    console.log('[API] Step 1: Deactivate old subscriptions')
    const { error: deactErr } = await sbAdmin
      .from('subscriptions')
      .update({ is_active: false })
      .eq('kontingen_id', body.kontingen_id)
      .eq('is_active', true)

    if (deactErr) {
      console.error('[API] deactivate error:', deactErr)
      warnings.push(`Deactivate old: ${deactErr.message}`)
    }

    // ════ STEP 2: Ambil features dari plan ════
    console.log('[API] Step 2: Fetch plan features')
    const { data: planData, error: planErr } = await sbAdmin
      .from('plans')
      .select('features')
      .eq('id', body.plan_id)
      .single()

    if (planErr || !planData) {
      console.error('[API] plan fetch error:', planErr)
      return NextResponse.json({
        ok: false,
        error: `Plan "${body.plan_id}" tidak ditemukan: ${planErr?.message ?? 'unknown'}`,
      }, { status: 404 })
    }

    const planFeatures = (planData.features ?? []) as string[]
    const featuresAdd  = body.features_add ?? []
    const featuresRemove = body.features_remove ?? []
    const resolvedFeatures = Array.from(new Set(planFeatures.concat(featuresAdd)))
      .filter(f => !featuresRemove.includes(f))

    // ════ STEP 3: Insert subscription baru ════
    console.log('[API] Step 3: Insert new subscription')
    const { error: insertErr } = await sbAdmin.from('subscriptions').insert({
      kontingen_id:     body.kontingen_id,
      plan_id:          body.plan_id,
      features:         resolvedFeatures,
      valid_until:      body.valid_until ?? null,
      max_users:        body.max_users ?? null,
      max_atlet:        body.max_atlet ?? null,
      features_add:     body.features_add ?? [],
      features_remove:  body.features_remove ?? [],
      catatan:          body.catatan ?? null,
      created_by:       body.created_by ?? 'superadmin',
      is_active:        true,
      is_trial:         body.is_trial ?? false,
    })

    if (insertErr) {
      console.error('[API] insert error:', insertErr)
      return NextResponse.json({
        ok: false,
        error: `Insert subscription: ${insertErr.message}`,
        details: insertErr,
      }, { status: 500 })
    }

    // ════ STEP 4: Sync level + plan_id ke tabel tenants ════
    if (body.level || body.plan_id) {
      console.log('[API] Step 4: Sync tenants.level + tenants.plan_id')

      // Cek tenant exists
      const { data: existingTenant } = await sbAdmin
        .from('tenants')
        .select('id, kontingen_id')
        .eq('kontingen_id', body.kontingen_id)
        .maybeSingle()

      const tenantUpdate: any = { plan_id: body.plan_id }
      if (body.level) tenantUpdate.level = body.level

      if (existingTenant) {
        // Update existing tenant
        const { error: updateErr } = await sbAdmin
          .from('tenants')
          .update(tenantUpdate)
          .eq('kontingen_id', body.kontingen_id)

        if (updateErr) {
          console.error('[API] tenant update error:', updateErr)
          warnings.push(`Sync tenants: ${updateErr.message}`)
        }
      } else {
        // Tenant gak ada → bikin minimal row
        console.warn('[API] tenant row not found, creating minimal')
        const { data: kontingen } = await sbAdmin
          .from('kontingen')
          .select('nama')
          .eq('id', body.kontingen_id)
          .single()

        const namaKontingen = kontingen?.nama ?? `Kontingen ${body.kontingen_id}`

        const { error: insertTenantErr } = await sbAdmin.from('tenants').insert({
          kontingen_id: body.kontingen_id,
          nama:         namaKontingen,
          nama_pendek:  namaKontingen.split(' ').slice(-1)[0] ?? `K${body.kontingen_id}`,
          login_slug:   `k${body.kontingen_id}`,
          level:        body.level ?? 'level3',
          plan_id:      body.plan_id,
          is_active:    true,
        })
        if (insertTenantErr) {
          console.error('[API] tenant insert error:', insertTenantErr)
          warnings.push(`Create tenant: ${insertTenantErr.message}`)
        }
      }
    }

    console.log('[API] ✅ SUCCESS', { warnings })

    return NextResponse.json({
      ok: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    })

  } catch (e: any) {
    console.error('[API] ❌ exception:', e)
    return NextResponse.json({
      ok: false,
      error: `Exception: ${e.message ?? 'unknown'}`,
    }, { status: 500 })
  }
}
