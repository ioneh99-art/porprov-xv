// src/app/api/atlet/bulk-create/route.ts
// Fase B — impor massal atlet lewat server (service key), ganti insert anon dari
// browser di tool export/data-gateway. Validasi per-baris + dedup NIK + kontingen
// dipaksa dari sesi. Baris gagal dilaporkan, tidak menggagalkan seluruh batch.

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

// Kolom yang boleh masuk (whitelist). Selain ini diabaikan; status dipaksa Draft.
function cleanRow(d: any, kontingen_id: number) {
  const gender = String(d.gender ?? '').toUpperCase() === 'L' || d.gender === 'Laki-laki' ? 'L' : 'P'
  return {
    nama_lengkap:     String(d.nama_lengkap ?? '').trim(),
    no_ktp:           String(d.no_ktp ?? '').trim(),
    tgl_lahir:        d.tgl_lahir || null,
    gender,
    cabor_nama_raw:   d.cabor_nama_raw ? String(d.cabor_nama_raw).trim() : null,
    kode_asal_daerah: d.kode_asal_daerah || null,
    nama_asal_daerah: d.nama_asal_daerah || null,
    ukuran_kemeja:    d.ukuran_kemeja || null,
    ukuran_sepatu:    d.ukuran_sepatu || null,
    nama_bank:        d.nama_bank || null,
    no_rekening:      d.no_rekening || null,
    kontingen_id,
    status_registrasi: 'Draft',
    status_verifikasi: 'Draft',
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : []
  if (!rows.length) return NextResponse.json({ error: 'Tidak ada baris untuk diimpor.' }, { status: 400 })
  if (rows.length > 5000) return NextResponse.json({ error: 'Maksimal 5000 baris per impor.' }, { status: 413 })

  const isPusat = session.role === 'superadmin' || session.level === 'superadmin' || session.level === 'koni_jabar'
  const kontingen_id = session.kontingen_id ?? (isPusat ? Number(body.kontingen_id) : null)
  if (!kontingen_id) return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })

  const db = sb()

  // NIK eksisting di kontingen ini (lewati cap 1000).
  const existing = new Set<string>()
  for (let p = 0; ; p++) {
    const { data } = await db.from('atlet').select('no_ktp').eq('kontingen_id', kontingen_id).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data || data.length === 0) break
    data.forEach(a => a.no_ktp && existing.add(String(a.no_ktp)))
    if (data.length < 1000) break
  }

  const errors: { index: number; reason: string }[] = []
  const valid: any[] = []
  const seenInBatch = new Set<string>()

  rows.forEach((raw, i) => {
    const r = cleanRow(raw, kontingen_id)
    if (!r.nama_lengkap)            { errors.push({ index: i, reason: 'Nama kosong' }); return }
    if (!/^\d{16}$/.test(r.no_ktp)) { errors.push({ index: i, reason: 'NIK bukan 16 digit' }); return }
    if (existing.has(r.no_ktp) || seenInBatch.has(r.no_ktp)) { errors.push({ index: i, reason: `NIK ${r.no_ktp} duplikat` }); return }
    seenInBatch.add(r.no_ktp)
    valid.push(r)
  })

  let ok = 0
  for (let i = 0; i < valid.length; i += 50) {
    const batch = valid.slice(i, i + 50)
    const { error } = await db.from('atlet').insert(batch)
    if (!error) { ok += batch.length; continue }
    // Batch gagal (mis. 1 NIK bentrok balapan) → coba per-baris untuk isolasi.
    for (const row of batch) {
      const { error: e2 } = await db.from('atlet').insert(row)
      if (e2) errors.push({ index: -1, reason: `${row.no_ktp}: ${e2.message}` })
      else ok++
    }
  }

  await writeAudit({
    action: 'BULK_CREATE_ATLET', resource: 'atlet',
    actor_id: session.id != null ? String(session.id) : null,
    actor_email: session.username ?? session.nama ?? null,
    actor_role: session.role ?? session.level ?? null,
    kontingen_id, payload: { diminta: rows.length, sukses: ok, gagal: errors.length },
    severity: errors.length ? 'warning' : 'info', ...reqMeta(req),
  })

  return NextResponse.json({ ok, err: errors.length, errors })
}
