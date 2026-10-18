import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function PATCH(req: NextRequest) {
  // Sesi terverifikasi HMAC — id dari cookie mentah bisa dipalsukan untuk mengubah email user lain.
  const user = await getServerSession()
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await req.json()

  const { error } = await sb()
    .from('users')
    .update({ email: email || null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}