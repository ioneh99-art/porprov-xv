// src/app/api/konida/kartu-bpjs/tautkan/route.ts
// KONIDA menautkan kartu "perlu dicek" (nama sama, NIK beda) ke atletnya
// setelah memeriksa KTP, atau melepas tautan manual. Tercatat di audit_logs.
//   POST {aksi:'tautkan', kartu_id, atlet_id}
//   POST {aksi:'lepas',   kartu_id}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { writeAudit, reqMeta } from '@/lib/audit'
import { alasanTolakTaut } from '@/lib/kartu-bpjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })
  const kontingen = Number(s.kontingen_id)
  if (!Number.isFinite(kontingen) || kontingen <= 0) return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const kartuId = Number(b?.kartu_id)
  if (!Number.isFinite(kartuId) || kartuId <= 0) return NextResponse.json({ error: 'Kartu tidak dikenali.' }, { status: 400 })

  const db = sb()
  const { data: k } = await db.from('kartu_bpjs').select('id,kontingen_id,atlet_id,kandidat_atlet_id,status_cocok,nik,nama_kartu')
    .eq('id', kartuId).eq('kontingen_id', kontingen).maybeSingle()
  const aktor = { actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? s.nama ?? null, actor_role: s.role ?? null }

  if (b?.aksi === 'lepas') {
    if (!k || k.status_cocok !== 'manual' || k.atlet_id == null)
      return NextResponse.json({ error: 'Hanya tautan yang dibuat manual yang bisa dilepas.' }, { status: 400 })
    const { error } = await db.from('kartu_bpjs').update({ atlet_id: null, kandidat_atlet_id: k.atlet_id, status_cocok: 'nik_beda' }).eq('id', k.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await writeAudit({ action: 'KARTU_BPJS_DILEPAS', resource: 'kartu_bpjs', resource_id: k.id, kontingen_id: kontingen, ...aktor,
      payload: { atlet_id: k.atlet_id, nama_kartu: k.nama_kartu }, ...reqMeta(req) })
    return NextResponse.json({ ok: true })
  }

  if (b?.aksi !== 'tautkan') return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 })
  const atletId = Number(b?.atlet_id)
  if (!Number.isFinite(atletId) || atletId <= 0) return NextResponse.json({ error: 'Atlet tidak dikenali.' }, { status: 400 })
  const [{ data: a }, { count: sudah }] = await Promise.all([
    db.from('atlet').select('id,no_ktp').eq('id', atletId).eq('kontingen_id', kontingen).maybeSingle(),
    db.from('kartu_bpjs').select('id', { count: 'exact', head: true }).eq('atlet_id', atletId),
  ])
  const tolak = alasanTolakTaut(k, !!a, (sudah ?? 0) > 0)
  if (tolak || !k || !a) return NextResponse.json({ error: tolak ?? 'Data tidak lengkap.' }, { status: 400 })

  const { error } = await db.from('kartu_bpjs').update({ atlet_id: atletId, kandidat_atlet_id: null, status_cocok: 'manual' })
    .eq('id', k.id).is('atlet_id', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAudit({ action: 'KARTU_BPJS_DITAUTKAN', resource: 'kartu_bpjs', resource_id: k.id, kontingen_id: kontingen, ...aktor, severity: 'warning',
    payload: { atlet_id: atletId, nama_kartu: k.nama_kartu, nik_sama: String(a.no_ktp ?? '').replace(/\D/g, '') === k.nik }, ...reqMeta(req) })
  return NextResponse.json({ ok: true })
}
