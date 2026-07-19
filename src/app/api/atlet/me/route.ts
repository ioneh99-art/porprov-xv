// src/app/api/atlet/me/route.ts — FIXED kolom sesuai schema real

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { atletJwtSecret } from '@/lib/atlet-jwt'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('atlet_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token, atletJwtSecret())
    const nik = payload.nik as string

    const { data: atlet, error } = await sb
      .from('atlet')
      .select(`
        id, nama_lengkap, no_ktp, cabor_nama_raw,
        status_registrasi, gender, tgl_lahir,
        nama_asal_daerah, kode_asal_daerah,
        ukuran_kemeja, ukuran_celana, ukuran_sepatu,
        nama_bank, no_rekening, nama_pemilik_rekening,
        no_registrasi_koni, login_count, last_login,
        is_public, portal_aktif, kontingen_id,
        no_hp, email
      `)
      .eq('no_ktp', nik)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!atlet) return NextResponse.json({ error: 'Atlet tidak ditemukan' }, { status: 404 })

    return NextResponse.json(atlet)
  } catch {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
  }
}
