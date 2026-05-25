// src/app/api/atlet/upload-dokumen/route.ts
// Upload bukti kejuaraan ke Supabase Storage

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const JWT_SECRET = new TextEncoder().encode(
  process.env.ATLET_JWT_SECRET || 'porprov-atlet-secret-2026'
)

export async function POST(req: NextRequest) {
  try {
    // Verifikasi token
    const token = req.cookies.get('atlet_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const nik = payload.nik as string

    const formData  = await req.formData()
    const file      = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    // Validasi ukuran & tipe
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: 'File terlalu besar (max 5MB)' }, { status: 400 })

    const allowed = ['application/pdf','image/jpeg','image/jpg','image/png']
    if (!allowed.includes(file.type))
      return NextResponse.json({ error: 'Format file tidak didukung (PDF/JPG/PNG)' }, { status: 400 })

    // Upload ke Supabase Storage
    const ext  = file.name.split('.').pop()
    const path = `kejuaraan/${nik}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await sb.storage
      .from('dokumen-atlet')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: urlData } = sb.storage
      .from('dokumen-atlet')
      .getPublicUrl(path)

    return NextResponse.json({ success:true, url: urlData.publicUrl, path })

  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload gagal' }, { status: 500 })
  }
}
