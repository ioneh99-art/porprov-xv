// src/app/api/atlet/create/route.ts
// Jenis 3 — Gerbang pembuatan atlet di server (eligibilitas + kuota).
// Ganti insert langsung dari browser (anon) yang tak tervalidasi. Pakai service key,
// kontingen_id DIPAKSA dari sesi (bukan dari body) agar tak bisa nyisipin kontingen lain.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Status yang tidak dihitung terhadap kuota (atlet yang ditolak tidak makan jatah).
const notCountedPrefix = 'Ditolak'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 }) }

  // ── kontingen_id: dipaksa dari sesi. Superadmin/koni_jabar (tanpa kontingen) boleh sebut di body. ──
  const isPusat = session.role === 'superadmin' || session.level === 'superadmin' || session.level === 'koni_jabar'
  const kontingen_id = session.kontingen_id ?? (isPusat ? Number(body.kontingen_id) : null)
  if (!kontingen_id) {
    return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })
  }

  // ── Validasi kelayakan (eligibilitas) ──
  const nama_lengkap = String(body.nama_lengkap ?? '').trim()
  const no_ktp       = String(body.no_ktp ?? '').trim()
  const gender       = String(body.gender ?? '').trim().toUpperCase()
  const tgl_lahir    = String(body.tgl_lahir ?? '').trim()
  const cabor_id     = parseInt(body.cabor_id)

  if (!nama_lengkap)                 return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 422 })
  if (!/^\d{16}$/.test(no_ktp))      return NextResponse.json({ error: 'NIK harus 16 digit angka.' }, { status: 422 })
  if (gender !== 'L' && gender !== 'P') return NextResponse.json({ error: 'Gender harus L atau P.' }, { status: 422 })
  if (!Number.isInteger(cabor_id))   return NextResponse.json({ error: 'Cabang olahraga wajib dipilih.' }, { status: 422 })

  // Umur wajar: tanggal valid, tidak di masa depan, usia 5–80 th.
  const dob = new Date(tgl_lahir)
  if (isNaN(dob.getTime()))          return NextResponse.json({ error: 'Tanggal lahir tidak valid.' }, { status: 422 })
  const usia = (Date.parse(new Date().toISOString()) - dob.getTime()) / (365.25 * 24 * 3600 * 1000)
  if (usia < 5 || usia > 80)         return NextResponse.json({ error: 'Usia di luar rentang wajar (5–80 th).' }, { status: 422 })

  const db = sb()

  // Cabor harus ada & aktif.
  const { data: cabor } = await db
    .from('cabang_olahraga').select('id,nama,is_active').eq('id', cabor_id).single()
  if (!cabor || cabor.is_active === false) {
    return NextResponse.json({ error: 'Cabang olahraga tidak ditemukan / tidak aktif.' }, { status: 422 })
  }

  // ── Cek kuota — MODE IMBAU (soft): kalau lewat kuota, DICATAT tapi tidak memblokir. ──
  // Angka di cabor_kuota masih perlu divalidasi resmi (banyak yang template). Bila sudah
  // final, ganti `quotaWarnings.push(...)` di bawah jadi `return 409`.
  const quotaWarnings: string[] = []
  const { data: kuota } = await db
    .from('cabor_kuota')
    .select('kuota_total,kuota_putra,kuota_putri')
    .eq('cabor_id', cabor_id).eq('kontingen_id', kontingen_id).maybeSingle()

  if (kuota) {
    // Hitung atlet eksisting di cabor+kontingen ini yang tidak ditolak.
    const { data: existing } = await db
      .from('atlet')
      .select('gender,status_registrasi')
      .eq('cabor_id', cabor_id).eq('kontingen_id', kontingen_id)
    const aktif = (existing ?? []).filter(a => !String(a.status_registrasi ?? '').startsWith(notCountedPrefix))
    const total = aktif.length
    const putra = aktif.filter(a => a.gender === 'L').length
    const putri = aktif.filter(a => a.gender === 'P').length

    if (kuota.kuota_total != null && total >= kuota.kuota_total)
      quotaWarnings.push(`Kuota total ${cabor.nama} terlampaui (${total + 1}/${kuota.kuota_total}).`)
    if (gender === 'L' && kuota.kuota_putra != null && putra >= kuota.kuota_putra)
      quotaWarnings.push(`Kuota putra ${cabor.nama} terlampaui (${putra + 1}/${kuota.kuota_putra}).`)
    if (gender === 'P' && kuota.kuota_putri != null && putri >= kuota.kuota_putri)
      quotaWarnings.push(`Kuota putri ${cabor.nama} terlampaui (${putri + 1}/${kuota.kuota_putri}).`)
  }

  // ── Insert (whitelist field; status dipaksa Draft) ──
  const row = {
    nama_lengkap,
    no_ktp,
    no_kk:        body.no_kk ? String(body.no_kk).trim() : null,
    gender,
    tgl_lahir,
    tempat_lahir: body.tempat_lahir ? String(body.tempat_lahir).trim() : null,
    cabor_id,
    kontingen_id,
    telepon:      body.telepon ? String(body.telepon).trim() : null,
    email:        body.email ? String(body.email).trim() : null,
    alamat:       body.alamat ? String(body.alamat).trim() : null,
    kecamatan:    body.kecamatan ? String(body.kecamatan).trim() : null,
    status_registrasi: 'Draft',
    status_verifikasi: 'Draft',
  }

  const { data: created, error } = await db.from('atlet').insert(row).select('id').single()

  if (error) {
    // Unique violation NIK.
    if ((error as any).code === '23505' || /duplicate|unique/i.test(error.message)) {
      return NextResponse.json({ error: 'NIK sudah terdaftar.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAudit({
    action: 'CREATE_ATLET', resource: 'atlet', resource_id: (created as any)?.id,
    actor_id: session.id != null ? String(session.id) : null,
    actor_email: session.username ?? session.nama ?? null,
    actor_role: session.role ?? session.level ?? null,
    kontingen_id,
    payload: { nama_lengkap, cabor_id, cabor: cabor.nama, gender, quota_warnings: quotaWarnings },
    // Lewat kuota = catat sebagai peringatan (biar kelihatan di log), tapi tetap sukses.
    severity: quotaWarnings.length ? 'warning' : 'info', ...reqMeta(req),
  })

  return NextResponse.json({ ok: true, id: (created as any)?.id, quota_warnings: quotaWarnings })
}
