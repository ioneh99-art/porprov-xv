// src/app/api/konida/kartu-bpjs/rekap/route.ts
// Menu "Kartu BPJS" KONIDA: rekap semua kartu + atlet yang belum punya kartu.
// Bergerbang sesi; hanya kontingen milik sesi. Berisi NIK (sama seperti
// /api/konida/atlet-pii) — tidak pernah lewat kunci anon.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { kelompokkanBpjs } from '@/lib/kartu-bpjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function GET() {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })
  const k = Number(s.kontingen_id)
  if (!Number.isFinite(k) || k <= 0) return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })

  const db = sb()
  let atlet: any[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('atlet').select('id,nama_lengkap,cabor_nama_raw,gender,no_ktp')
      .eq('kontingen_id', k).order('nama_lengkap').range(f, f + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    atlet = atlet.concat(data ?? []); if ((data ?? []).length < 1000) break
  }
  const { data: kartu, error } = await db.from('kartu_bpjs')
    .select('id,atlet_id,kandidat_atlet_id,status_cocok,nik,kpj,nama_kartu,berlaku,jumlah_unduh,terakhir_diunduh,sumber_halaman')
    .eq('kontingen_id', k).order('nama_kartu').range(0, 4999)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(kelompokkanBpjs(kartu ?? [], atlet))
}
