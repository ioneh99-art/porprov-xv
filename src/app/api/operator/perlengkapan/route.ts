// src/app/api/operator/perlengkapan/route.ts
// J2-4 — upsert atlet_perlengkapan lewat server (service key). Wajib sesi. Non-admin:
// atlet sasaran harus dalam kontingen (konida) / cabor (operator). onConflict atlet_id.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const FIELDS = ['atlet_id','ukuran_kemeja','ukuran_jaket','ukuran_kaos','ukuran_celana','ukuran_sepatu','ukuran_topi','ukuran_training_set','catatan','diisi_oleh','diisi_at']
const isAdmin = (s: any) => ['superadmin','admin','koni_jabar'].includes(s.role) || ['superadmin','koni_jabar'].includes(s.level)

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (body?.atlet_id == null) return NextResponse.json({ error: 'atlet_id wajib.' }, { status: 422 })

  const db = sb()
  // Cek kepemilikan atlet.
  if (!isAdmin(s)) {
    const { data: a } = await db.from('atlet').select('kontingen_id,cabor_id').eq('id', body.atlet_id).single()
    if (!a) return NextResponse.json({ error: 'Atlet tidak ditemukan.' }, { status: 404 })
    if (s.kontingen_id != null) {
      if (Number(a.kontingen_id) !== Number(s.kontingen_id)) return NextResponse.json({ error: 'Atlet di luar kontingen Anda.' }, { status: 403 })
    } else if (s.cabor_id != null) {
      if (Number(a.cabor_id) !== Number(s.cabor_id)) return NextResponse.json({ error: 'Atlet di luar cabor Anda.' }, { status: 403 })
    } else return NextResponse.json({ error: 'Sesi tak punya scope.' }, { status: 403 })
  }

  const row: any = {}
  for (const k of FIELDS) if (body[k] !== undefined) row[k] = body[k]
  const { data, error } = await db.from('atlet_perlengkapan').upsert(row, { onConflict: 'atlet_id' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({ action: 'SET_PERLENGKAPAN', resource: 'atlet_perlengkapan', resource_id: body.atlet_id,
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
    kontingen_id: s.kontingen_id ?? null, ...reqMeta(req) })
  return NextResponse.json({ ok: true, data })
}
