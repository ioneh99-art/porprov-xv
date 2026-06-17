import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { action, note } = await req.json()
    const validActions = ['resolved', 'dismissed', 'false_positive', 'in_progress']
    if (!validActions.includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    const { error } = await sb
      .from('jarvis_issues')
      .update({ status: action, resolution_note: note ?? null, resolved_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
