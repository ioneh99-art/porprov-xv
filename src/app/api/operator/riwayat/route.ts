// src/app/api/operator/riwayat/route.ts
// J2-4 — tulis riwayat_kejuaraan (update verif) & riwayat_prestasi (insert) lewat server.
// Wajib sesi. Non-admin: atlet sasaran harus dalam kontingen/cabor sesi. Whitelist kolom.

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

const KEJUARAAN_SET = ['status','catatan_konida','approved_konida_by','approved_konida_at','catatan_cabor','approved_cabor_by','approved_cabor_at','catatan_admin','approved_admin_by','approved_admin_at']
const PRESTASI_INS = ['atlet_id','event','tahun','lokasi','nomor_tanding','hasil','catatan','level_event','is_demo','created_by','submitted_by','submission_status','verified_by','verified_at','rejected_reason','source_document_url','submitted_at']
const pick = (src: any, allow: string[]) => { const o: any = {}; for (const k of allow) if (src[k] !== undefined) o[k] = src[k]; return o }
const isAdmin = (s: any) => ['superadmin','admin','koni_jabar'].includes(s.role) || ['superadmin','koni_jabar'].includes(s.level)

// Return null bila OK, else NextResponse error.
async function assertOwnsAtlet(db: any, s: any, atletId: any) {
  if (isAdmin(s)) return null
  const { data: a } = await db.from('atlet').select('kontingen_id,cabor_id').eq('id', atletId).single()
  if (!a) return NextResponse.json({ error: 'Atlet tidak ditemukan.' }, { status: 404 })
  if (s.kontingen_id != null) {
    if (Number(a.kontingen_id) !== Number(s.kontingen_id)) return NextResponse.json({ error: 'Atlet di luar kontingen Anda.' }, { status: 403 })
  } else if (s.cabor_id != null) {
    if (Number(a.cabor_id) !== Number(s.cabor_id)) return NextResponse.json({ error: 'Atlet di luar cabor Anda.' }, { status: 403 })
  } else return NextResponse.json({ error: 'Sesi tak punya scope.' }, { status: 403 })
  return null
}

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const db = sb()

  // riwayat_prestasi: insert
  if (body.kind === 'prestasi') {
    const row = pick(body.row ?? body, PRESTASI_INS)
    if (row.atlet_id == null) return NextResponse.json({ error: 'atlet_id wajib.' }, { status: 422 })
    const own = await assertOwnsAtlet(db, s, row.atlet_id); if (own) return own
    const { data, error } = await db.from('riwayat_prestasi').insert(row).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit({ action: 'CREATE_PRESTASI', resource: 'riwayat_prestasi', resource_id: (data as any)?.id,
      actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
      kontingen_id: s.kontingen_id ?? null, ...reqMeta(req) })
    return NextResponse.json({ ok: true, data })
  }

  // riwayat_kejuaraan: update by id
  if (body.kind === 'kejuaraan') {
    if (body.id == null) return NextResponse.json({ error: 'id wajib.' }, { status: 400 })
    const set = pick(body.set ?? {}, KEJUARAAN_SET)
    if (!Object.keys(set).length) return NextResponse.json({ error: 'set kosong.' }, { status: 400 })
    const { data: r } = await db.from('riwayat_kejuaraan').select('atlet_id').eq('id', body.id).single()
    if (!r) return NextResponse.json({ error: 'Riwayat tidak ditemukan.' }, { status: 404 })
    const own = await assertOwnsAtlet(db, s, r.atlet_id); if (own) return own
    const { error } = await db.from('riwayat_kejuaraan').update(set).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit({ action: 'VERIF_KEJUARAAN', resource: 'riwayat_kejuaraan', resource_id: body.id,
      actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
      payload: { set }, severity: String(set.status ?? '').startsWith('Ditolak') ? 'warning' : 'info', ...reqMeta(req) })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'kind tidak dikenal (kejuaraan|prestasi).' }, { status: 400 })
}
