// src/app/api/konida/kategori-cabor/route.ts
// Peta ringan nama cabor → kategori & prioritas.
//
// Dipisah dari /api/konida/klasifikasi yang memuat seluruh data atlet:
// halaman Data Atlet dan Dokumen Atlet sudah punya daftar atletnya sendiri
// dan hanya perlu peta ini, bukan hitungan ulang yang sama.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data, error } = await db.from('v_klasifikasi_cabor')
    .select('cabor_nama_raw,kategori,prioritas,bk_emas,bk_perak,bk_perunggu')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const peta: Record<string, any> = {}
  for (const r of (data ?? [])) {
    if (!r.cabor_nama_raw) continue
    peta[r.cabor_nama_raw] = {
      kategori: r.kategori, prioritas: r.prioritas,
      bk_emas: r.bk_emas, bk_perak: r.bk_perak, bk_perunggu: r.bk_perunggu,
    }
  }
  return NextResponse.json({ peta, jumlah: Object.keys(peta).length })
}
