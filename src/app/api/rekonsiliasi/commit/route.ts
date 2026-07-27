// src/app/api/rekonsiliasi/commit/route.ts
// Fase 1 — tulis hasil rekonsiliasi (service key). Confirm-before-write: tolak bila
// masih ada baris 'perlu_konfirmasi' (§0.3, §9 item 5). Guard sesi + kontingen dari sesi.

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
const isAdmin = (s: any) => ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : []
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada baris.' }, { status: 400 })

  const kontingen_id = s.kontingen_id ?? (isAdmin(s) ? Number(body.kontingen_id) : null)
  if (!kontingen_id) return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })

  // Confirm-before-write: tak boleh ada yang masih perlu konfirmasi.
  const belum = rows.filter(r => r.status_peserta === 'perlu_konfirmasi').length
  if (belum > 0) return NextResponse.json({ error: `Masih ada ${belum} baris perlu dikonfirmasi. Selesaikan dulu.` }, { status: 422 })

  const db = sb()

  // Validasi kepemilikan atlet_id: hanya izinkan atlet_id milik kontingen ini.
  const atletIds = Array.from(new Set(rows.map(r => r.atlet_id).filter((x: any) => x != null)))
  const validAtlet = new Set<number>()
  if (atletIds.length) {
    const { data } = await db.from('atlet').select('id').eq('kontingen_id', kontingen_id).in('id', atletIds)
    ;(data ?? []).forEach((a: any) => validAtlet.add(a.id))
  }

  // Buat batch confirmed.
  const actorEmail = s.username ?? s.nama ?? null
  const { data: batch, error: be } = await db.from('rekonsiliasi_batch').insert({
    kontingen_id, nama_file: body.nama_file ?? null, sumber: 'KONI',
    total_reviu: body.summary?.total_reviu ?? rows.length,
    total_portal: body.summary?.total_portal ?? null,
    total_db: body.summary?.total_db ?? null,
    status: 'confirmed', dibuat_oleh: actorEmail,
  }).select('id').single()
  if (be) return NextResponse.json({ error: be.message }, { status: 500 })
  const batch_id = (batch as any).id

  // Susun baris (dedupe by nama_file+nik_file utk hormati UNIQUE constraint).
  const seen = new Set<string>()
  const toInsert = []
  for (const r of rows) {
    const key = `${r.nama_file}|${r.nik_file ?? ''}`
    if (seen.has(key)) continue; seen.add(key)
    const atlet_id = r.atlet_id != null && validAtlet.has(r.atlet_id) ? r.atlet_id : null
    const manual = r.match_method === 'manual' || (r.dikonfirmasi_oleh != null)
    toInsert.push({
      batch_id, kontingen_id,
      nama_file: r.nama_file, nik_file: r.nik_file ?? null, cabang_file: r.cabang_file ?? null, nomor_file: r.nomor_file ?? null,
      atlet_id,
      match_method: atlet_id ? (manual ? 'manual' : (r.match_method ?? 'nik')) : 'tidak_ketemu',
      match_score: r.match_score ?? null,
      status_peserta: atlet_id ? 'peserta_resmi' : 'tidak_ketemu',
      dikonfirmasi_oleh: manual ? actorEmail : null,
      dikonfirmasi_at: manual ? new Date().toISOString() : null,
    })
  }

  // Insert bertahap (batch 500).
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await db.from('rekonsiliasi_peserta').insert(toInsert.slice(i, i + 500))
    if (error) return NextResponse.json({ error: error.message, batch_id }, { status: 500 })
    inserted += Math.min(500, toInsert.length - i)
  }

  await writeAudit({
    action: 'REKONSILIASI_COMMIT', resource: 'rekonsiliasi_batch', resource_id: batch_id,
    actor_id: s.id != null ? String(s.id) : null, actor_email: actorEmail, actor_role: s.role ?? s.level ?? null,
    kontingen_id, payload: { baris: inserted, peserta_resmi: toInsert.filter(r => r.status_peserta === 'peserta_resmi').length },
    severity: 'warning', ...reqMeta(req),
  })

  return NextResponse.json({ ok: true, batch_id, inserted, peserta_resmi: toInsert.filter(r => r.status_peserta === 'peserta_resmi').length })
}
