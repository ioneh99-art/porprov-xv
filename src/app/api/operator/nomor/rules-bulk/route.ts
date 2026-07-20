// src/app/api/operator/nomor/rules-bulk/route.ts
// Impor massal aturan eligibilitas per nomor (usia/tim). Match by nomor id.
// Wajib sesi. Non-admin: hanya nomor cabor sendiri. Hanya sentuh kolom aturan.

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
const RULE_FIELDS = ['usia_min', 'usia_maks', 'max_peserta_kontingen', 'max_nomor_per_atlet']
const isAdmin = (s: any) => ['superadmin', 'admin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

// '' / null / non-angka → null (tanpa batas); angka → integer.
function ruleVal(v: any): number | null {
  if (v === '' || v == null) return null
  const n = parseInt(v)
  return Number.isFinite(n) ? n : null
}

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : []
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada baris.' }, { status: 400 })
  if (rows.length > 5000) return NextResponse.json({ error: 'Maksimal 5000 baris.' }, { status: 413 })

  const db = sb()

  // Ambil cabor_id semua nomor yang disebut (utk cek kepemilikan).
  const ids = Array.from(new Set(rows.map(r => Number(r.id)).filter(Boolean)))
  const { data: nomors } = await db.from('nomor_pertandingan').select('id,cabor_id').in('id', ids)
  const caborMap = new Map<number, number>((nomors ?? []).map((n: any) => [n.id, n.cabor_id]))

  let updated = 0
  const skipped: { id: any; reason: string }[] = []
  for (const r of rows) {
    const id = Number(r.id)
    if (!id) { skipped.push({ id: r.id, reason: 'id kosong/invalid' }); continue }
    if (!caborMap.has(id)) { skipped.push({ id, reason: 'nomor tidak ditemukan' }); continue }
    if (!isAdmin(s) && s.cabor_id != null && Number(caborMap.get(id)) !== Number(s.cabor_id)) {
      skipped.push({ id, reason: 'bukan cabor Anda' }); continue
    }
    const updates: any = {}
    for (const k of RULE_FIELDS) if (k in r) updates[k] = ruleVal(r[k])
    if (!Object.keys(updates).length) { skipped.push({ id, reason: 'tak ada kolom aturan' }); continue }
    const { error } = await db.from('nomor_pertandingan').update(updates).eq('id', id)
    if (error) { skipped.push({ id, reason: error.message }); continue }
    updated++
  }

  await writeAudit({
    action: 'IMPORT_ATURAN_NOMOR', resource: 'nomor_pertandingan',
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
    payload: { diminta: rows.length, sukses: updated, gagal: skipped.length },
    severity: skipped.length ? 'warning' : 'info', ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, updated, skipped })
}
