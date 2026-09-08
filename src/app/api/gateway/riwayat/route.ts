// src/app/api/gateway/riwayat/route.ts
// Riwayat pemasukan data lewat Data Gateway, dibaca dari jejak audit.
//
// Melengkapi pratinjau: pratinjau menjawab "apa yang AKAN berubah", riwayat
// menjawab "apa yang SUDAH berubah, oleh siapa, kapan". Tanpa ini, begitu
// operator menekan simpan, tidak ada lagi cara menelusuri kembali.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const isAdmin = (s: any) =>
  ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

/** Aksi yang dianggap "pemasukan data" — sisanya tidak ditampilkan di sini. */
const AKSI = [
  'GATEWAY_IMPOR_IDENTITAS',
  'GATEWAY_IMPOR_PERLENGKAPAN',
  'GATEWAY_IMPOR_BIOMOTORIK',
  'GATEWAY_SIMPAN_FOTO',
  'GATEWAY_UBAH_STATUS_ATLET',
  'REKONSILIASI_COMMIT',
  'REKONSILIASI_COMMIT_INTEL',
  'SET_PERLENGKAPAN',
]

export async function GET(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  const u = new URL(req.url)
  const batas = Math.min(Number(u.searchParams.get('batas') ?? 50), 200)

  const db = sb()
  let q = db.from('audit_logs')
    .select('id,created_at,action,resource,actor_email,actor_role,kontingen_id,payload,severity')
    .in('action', AKSI)
    .order('created_at', { ascending: false })
    .limit(batas)

  // Kontingen sendiri saja, kecuali admin pusat.
  if (!isAdmin(s)) {
    if (s.kontingen_id == null) {
      return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })
    }
    q = q.eq('kontingen_id', s.kontingen_id)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ riwayat: data ?? [], total: (data ?? []).length })
}
