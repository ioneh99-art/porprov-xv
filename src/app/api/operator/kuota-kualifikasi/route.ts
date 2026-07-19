// src/app/api/operator/kuota-kualifikasi/route.ts
// J2-3 — upsert kuota_kualifikasi lewat server. Wajib sesi; non-admin: nomor harus
// cabor sendiri. onConflict nomor_id,kontingen_id. Audit.

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

const FIELDS = ['nomor_id','kontingen_id','kuota_max','created_by']
const isAdmin = (s: any) => ['superadmin','admin','koni_jabar'].includes(s.role) || ['superadmin','koni_jabar'].includes(s.level)

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : []
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada baris.' }, { status: 400 })
  for (const r of rows) if (r?.nomor_id == null || r?.kontingen_id == null)
    return NextResponse.json({ error: 'nomor_id & kontingen_id wajib.' }, { status: 422 })

  const db = sb()
  // Non-admin: nomor harus cabor sendiri.
  if (!isAdmin(s) && s.cabor_id != null) {
    const uniq = Array.from(new Set(rows.map(r => r.nomor_id)))
    const { data } = await db.from('nomor_pertandingan').select('id,cabor_id').in('id', uniq)
    if ((data ?? []).length !== uniq.length || (data ?? []).some((n: any) => Number(n.cabor_id) !== Number(s.cabor_id)))
      return NextResponse.json({ error: 'Ada nomor bukan cabor Anda.' }, { status: 403 })
  }

  const clean = rows.map(r => { const o: any = {}; for (const k of FIELDS) if (r[k] !== undefined) o[k] = r[k]; return o })
  const { error } = await db.from('kuota_kualifikasi').upsert(clean, { onConflict: 'nomor_id,kontingen_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({ action: 'SET_KUOTA_KUALIFIKASI', resource: 'kuota_kualifikasi',
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
    payload: { baris: clean.length }, ...reqMeta(req) })
  return NextResponse.json({ ok: true, count: clean.length })
}
