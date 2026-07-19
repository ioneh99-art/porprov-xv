// src/app/api/operator/hasil/route.ts
// J2-3 — upsert hasil_pertandingan lewat server (service key). Wajib sesi operator.
// Whitelist kolom + onConflict nomor_id,atlet_id. Non-admin: baris ber-cabor_id harus
// cocok dengan cabor sesi (cegah tulis hasil cabor lain). Audit INPUT_HASIL.

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

const FIELDS = ['nomor_id','atlet_id','peserta_id','kontingen_id','nilai','satuan_hasil','ranking','medali','catatan','cabor_id','nomor_lomba','posisi','satuan','diinput_oleh']
const isAdmin = (s: any) => ['superadmin','admin','koni_jabar'].includes(s.role) || ['superadmin','koni_jabar'].includes(s.level)

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : []
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada baris.' }, { status: 400 })
  if (rows.length > 2000) return NextResponse.json({ error: 'Maksimal 2000 baris.' }, { status: 413 })

  const clean: any[] = []
  for (const r of rows) {
    if (!r || r.nomor_id == null || r.atlet_id == null)
      return NextResponse.json({ error: 'nomor_id & atlet_id wajib tiap baris.' }, { status: 422 })
    // Non-admin: kalau baris menyebut cabor_id, harus cabor sendiri.
    if (!isAdmin(s) && r.cabor_id != null && s.cabor_id != null && Number(r.cabor_id) !== Number(s.cabor_id))
      return NextResponse.json({ error: 'Ada baris bukan cabor Anda.' }, { status: 403 })
    const o: any = {}
    for (const k of FIELDS) if (r[k] !== undefined) o[k] = r[k]
    clean.push(o)
  }

  const { error } = await sb().from('hasil_pertandingan').upsert(clean, { onConflict: 'nomor_id,atlet_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    action: 'INPUT_HASIL', resource: 'hasil_pertandingan',
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null,
    actor_role: s.role ?? s.level ?? null,
    payload: { baris: clean.length, nomor_ids: Array.from(new Set(clean.map(c => c.nomor_id))).slice(0, 20) },
    ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, count: clean.length })
}
