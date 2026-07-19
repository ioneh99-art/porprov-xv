// src/app/api/atlet/edit/route.ts
// J2-4 — update atlet lewat server (service key). Ganti update anon dari browser.
// Wajib sesi. Non-admin: atlet sasaran harus dalam kontingen (konida) / cabor (operator)
// sesi. Whitelist kolom (tak boleh pindah id/kontingen_id). Audit.

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

// Kolom yang boleh diubah (TANPA id/kontingen_id — cegah pindah kepemilikan).
const FIELDS = [
  'nama_lengkap','no_ktp','no_kk','gender','tgl_lahir','tempat_lahir','cabor_id','telepon','email',
  'alamat','kecamatan','status_registrasi','status_verifikasi','catatan_verifikasi','catatan_admin',
  'is_posted','updated_at','cabor_nama_raw','kode_asal_daerah','nama_asal_daerah','ukuran_kemeja',
  'ukuran_sepatu','nama_bank','no_rekening',
]
const isAdmin = (s: any) => ['superadmin','admin','koni_jabar'].includes(s.role) || ['superadmin','koni_jabar'].includes(s.level)

export async function PATCH(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const ids: any[] = body.ids ?? (body.id != null ? [body.id] : [])
  if (!ids.length) return NextResponse.json({ error: 'id/ids wajib.' }, { status: 400 })

  const set: any = {}
  const src = body.set ?? body
  for (const k of FIELDS) if (src[k] !== undefined) set[k] = src[k]
  if (set.cabor_id !== undefined && set.cabor_id !== null) set.cabor_id = parseInt(set.cabor_id)
  if (!Object.keys(set).length) return NextResponse.json({ error: 'Tidak ada field yang diubah.' }, { status: 400 })

  const db = sb()
  // Cek kepemilikan: konida→kontingen, operator→cabor. Admin bebas.
  if (!isAdmin(s)) {
    const { data: rows } = await db.from('atlet').select('id,kontingen_id,cabor_id').in('id', ids)
    if (!rows || rows.length !== ids.length)
      return NextResponse.json({ error: 'Sebagian atlet tidak ditemukan.' }, { status: 404 })
    if (s.kontingen_id != null) {
      if (rows.some(r => Number(r.kontingen_id) !== Number(s.kontingen_id)))
        return NextResponse.json({ error: 'Ada atlet di luar kontingen Anda.' }, { status: 403 })
    } else if (s.cabor_id != null) {
      if (rows.some(r => Number(r.cabor_id) !== Number(s.cabor_id)))
        return NextResponse.json({ error: 'Ada atlet di luar cabor Anda.' }, { status: 403 })
    } else {
      return NextResponse.json({ error: 'Sesi tak punya scope.' }, { status: 403 })
    }
  }

  const { error } = await db.from('atlet').update(set).in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    action: 'UPDATE_ATLET', resource: 'atlet', resource_id: ids.length === 1 ? ids[0] : null,
    actor_id: s.id != null ? String(s.id) : null, actor_email: s.username ?? null, actor_role: s.role ?? s.level ?? null,
    kontingen_id: s.kontingen_id ?? null,
    payload: { ids_count: ids.length, fields: Object.keys(set) },
    severity: ('status_registrasi' in set) ? 'warning' : 'info', ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, count: ids.length })
}
