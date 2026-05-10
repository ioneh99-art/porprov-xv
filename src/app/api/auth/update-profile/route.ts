import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function PATCH(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = JSON.parse(session)
  const { email } = await req.json()

  const { error } = await sb()
    .from('users')
    .update({ email: email || null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}