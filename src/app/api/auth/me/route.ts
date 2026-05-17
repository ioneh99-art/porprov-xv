// src/app/api/auth/me/route.ts
// Update: tambah features dari subscription ke response
// Komponen bisa langsung cek features tanpa query subscription lagi

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSubscription, F } from '../../../../lib/subscriptions'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('porprov_session')?.value
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const session = JSON.parse(sessionCookie)

    // Ambil data user fresh dari DB
    const { data: user, error } = await sb
      .from('users')
      .select(`
        id, username, nama, email, role, level,
        kontingen_id, cabor_id, is_active,
        kontingen (id, nama),
        cabang_olahraga (id, nama)
      `)
      .eq('id', session.id)
      .single()

    if (error || !user || !user.is_active) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    }

    // ── Ambil features dari subscription ──────────────────
    let features: string[] = [F.DASHBOARD_BASIC]
    let plan_id = 'basic'
    let subscription_valid_until = null
    let is_trial = false

    if (user.role === 'superadmin') {
      // Superadmin dapat semua fitur
      features = Object.values(F)
      plan_id  = 'enterprise'
    } else if (user.kontingen_id) {
      const sub = await getSubscription(user.kontingen_id)
      if (sub && !sub.is_expired) {
        features                 = sub.features
        plan_id                  = sub.plan_id
        subscription_valid_until = sub.valid_until
        is_trial                 = sub.is_trial
      }
    }

    return NextResponse.json({
      // User data
      id:            user.id,
      username:      user.username,
      nama:          user.nama,
      email:         user.email,
      role:          user.role,
      level:         user.level,
      kontingen_id:  user.kontingen_id,
      kontingen_nama:(user.kontingen as any)?.nama ?? null,
      cabor_id:      user.cabor_id,
      cabor_nama:    (user.cabang_olahraga as any)?.nama ?? null,

      // Subscription
      plan_id,
      features,
      subscription_valid_until,
      is_trial,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}