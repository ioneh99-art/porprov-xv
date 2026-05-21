import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// GET — semua subscriptions
export async function GET() {
  const { data, error } = await sb
    .from('subscriptions')
    .select('*, kontingen(id, nama), plans(id, name, display_name)')
    .order('kontingen_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT — update plan kontingen
export async function PUT(req: NextRequest) {
  const { kontingen_id, plan_id } = await req.json()
  if (!kontingen_id || !plan_id)
    return NextResponse.json({ error: 'kontingen_id dan plan_id required' }, { status: 400 })

  const { data, error } = await sb
    .from('subscriptions')
    .update({ plan_id, updated_at: new Date().toISOString() })
    .eq('kontingen_id', kontingen_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update juga di tabel tenants
  await sb.from('tenants')
    .update({ plan_id, updated_at: new Date().toISOString() })
    .eq('kontingen_id', kontingen_id)

  return NextResponse.json(data)
}
