// src/app/api/operator/nomor/route.ts
// J2-3 — tulis nomor_pertandingan lewat server. cabor_id dipaksa dari sesi;
// hapus hanya nomor milik cabor sendiri (kecuali admin/superadmin). Audit.

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

const FIELDS = ['nama','gender','tipe_skor','satuan','disiplin_id','venue_id','tanggal_pertandingan','waktu_mulai','is_active','status']
function pick(src: any) {
  const out: any = {}
  for (const k of FIELDS) if (src[k] !== undefined) out[k] = src[k]
  if (out.venue_id === '' ) out.venue_id = null
  if (out.tanggal_pertandingan === '') out.tanggal_pertandingan = null
  if (out.waktu_mulai === '') out.waktu_mulai = null
  return out
}
const isAdmin = (s: any) => ['superadmin','admin','koni_jabar'].includes(s.role) || ['superadmin','koni_jabar'].includes(s.level)

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const cabor_id = s.cabor_id ?? (isAdmin(s) ? Number(body.cabor_id) : null)
  if (!cabor_id) return NextResponse.json({ error: 'Cabor tidak diketahui dari sesi.' }, { status: 403 })

  const row = { ...pick(body), cabor_id }
  if (!row.nama) return NextResponse.json({ error: 'Nama nomor wajib.' }, { status: 422 })

  const { data, error } = await sb().from('nomor_pertandingan').insert(row).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({
    action: 'CREATE_NOMOR', resource: 'nomor_pertandingan', resource_id: (data as any)?.id,
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null,
    actor_role: s.role ?? s.level ?? null, payload: { nama: row.nama, cabor_id }, ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, id: (data as any)?.id })
}

export async function DELETE(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

  const db = sb()
  // Cek kepemilikan: operator hanya boleh hapus nomor cabornya.
  if (!isAdmin(s)) {
    const { data: row } = await db.from('nomor_pertandingan').select('cabor_id').eq('id', id).single()
    if (!row) return NextResponse.json({ error: 'Nomor tidak ditemukan' }, { status: 404 })
    if (row.cabor_id !== s.cabor_id) return NextResponse.json({ error: 'Bukan nomor cabor Anda.' }, { status: 403 })
  }
  const { error } = await db.from('nomor_pertandingan').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({
    action: 'DELETE_NOMOR', resource: 'nomor_pertandingan', resource_id: id,
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null,
    actor_role: s.role ?? s.level ?? null, severity: 'warning', ...reqMeta(req),
  })
  return NextResponse.json({ ok: true })
}
