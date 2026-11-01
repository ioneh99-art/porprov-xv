// src/app/api/konida/kartu-bpjs/route.ts
// Kartu BPJS Ketenagakerjaan untuk profil atlet (KONIDA). Bergerbang sesi dan
// kepemilikan kontingen diperiksa ulang di server. Gambar & PDF dibagikan lewat
// signed URL 10 menit dari bucket privat — tidak pernah lewat kunci anon.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { samarkanNik, namaBerkasUnduh } from '@/lib/kartu-bpjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const adminPusat = (s: any) =>
  ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)
const UMUR_URL = 600

async function tautan(db: ReturnType<typeof sb>, k: any) {
  const [g, p] = await Promise.all([
    db.storage.from('kartu-bpjs').createSignedUrl(k.berkas_gambar, UMUR_URL),
    db.storage.from('kartu-bpjs').createSignedUrl(k.berkas_pdf, UMUR_URL, { download: namaBerkasUnduh(k.nama_kartu) }),
  ])
  return {
    id: k.id, status_cocok: k.status_cocok, kpj: k.kpj, nik_samar: samarkanNik(k.nik), nama_kartu: k.nama_kartu,
    berlaku: k.berlaku, jumlah_unduh: k.jumlah_unduh, gambar_url: g.data?.signedUrl ?? null, pdf_url: p.data?.signedUrl ?? null,
  }
}

export async function GET(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })
  const u = new URL(req.url)
  const db = sb()
  const kolom = 'id,kontingen_id,status_cocok,kpj,nik,nama_kartu,berlaku,berkas_pdf,berkas_gambar,jumlah_unduh'

  // Satu kartu berdasarkan id — dipakai menu Kartu BPJS (termasuk kartu official).
  const kartuId = Number(u.searchParams.get('kartu_id'))
  if (u.searchParams.has('kartu_id')) {
    if (!Number.isFinite(kartuId) || kartuId <= 0) return NextResponse.json({ error: 'Kartu tidak dikenali.' }, { status: 400 })
    const { data: k } = await db.from('kartu_bpjs').select(kolom).eq('id', kartuId).maybeSingle()
    if (!k) return NextResponse.json({ error: 'Kartu tidak ditemukan.' }, { status: 404 })
    if (!adminPusat(s) && Number(s.kontingen_id) !== k.kontingen_id) return NextResponse.json({ error: 'Bukan kartu kontingen Anda.' }, { status: 403 })
    return NextResponse.json({ kartu: [await tautan(db, k)], calon: [] })
  }

  const atletId = Number(u.searchParams.get('atlet_id'))
  if (!Number.isFinite(atletId) || atletId <= 0) return NextResponse.json({ error: 'Atlet tidak dikenali.' }, { status: 400 })

  const { data: a } = await db.from('atlet').select('id,kontingen_id').eq('id', atletId).maybeSingle()
  if (!a) return NextResponse.json({ error: 'Atlet tidak ditemukan.' }, { status: 404 })
  if (!adminPusat(s) && Number(s.kontingen_id) !== a.kontingen_id) {
    return NextResponse.json({ error: 'Bukan atlet kontingen Anda.' }, { status: 403 })
  }

  const [{ data: milik }, { data: calon }] = await Promise.all([
    db.from('kartu_bpjs').select(kolom).eq('atlet_id', atletId).limit(3),
    db.from('kartu_bpjs').select(kolom).eq('kandidat_atlet_id', atletId).is('atlet_id', null).limit(3),
  ])
  return NextResponse.json({
    kartu: await Promise.all((milik ?? []).map(k => tautan(db, k))),
    // nama sama tapi NIK di kartu beda dengan NIK atlet — perlu diperiksa, belum ditautkan
    calon: await Promise.all((calon ?? []).map(k => tautan(db, k))),
  })
}
