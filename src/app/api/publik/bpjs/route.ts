// src/app/api/publik/bpjs/route.ts
// Cetak kartu BPJS Ketenagakerjaan oleh pemiliknya sendiri, tanpa login.
//   GET  ?q=nama   → daftar nama pemegang kartu (hanya nama, tanpa data lain)
//   POST {id, nik} → bila NIK sama dengan NIK di kartu: tautan gambar + PDF (5 menit)
//
// NIK berperan sebagai kata sandi. NIK bukan rahasia kuat (tercetak di KTP &
// berpola), jadi tebakan dibatasi lewat catatan di DB: per kartu 5 gagal/30 mnt,
// per alamat IP 10 gagal/15 mnt. IP disimpan dalam bentuk sidik (hash), bukan asli.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAudit, reqMeta } from '@/lib/audit'
import { BATAS, bakukanNik, nikSama, putusanBatas, namaBerkasUnduh } from '@/lib/kartu-bpjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KONTINGEN_ID = 4
const UMUR_URL = 300
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const sidikIp = (req: NextRequest) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'tanpa-ip'
  return createHash('sha256').update(`${process.env.PORPROV_SESSION_SECRET ?? ''}|bpjs|${ip}`).digest('hex').slice(0, 32)
}
const sejak = (menit: number) => new Date(Date.now() - menit * 60_000).toISOString()

export async function GET(req: NextRequest) {
  const terbatas = checkRateLimit(req, { limit: 40, windowMs: 60_000, key: 'bpjs-cari' })
  if (terbatas) return terbatas
  const q = (new URL(req.url).searchParams.get('q') ?? '').replace(/[^A-Za-z .'-]/g, '').trim().replace(/\s+/g, ' ')
  if (q.length < 3) return NextResponse.json({ hasil: [] })
  const { data, error } = await sb().from('kartu_bpjs').select('id,nama_kartu')
    .eq('kontingen_id', KONTINGEN_ID).ilike('nama_kartu', `%${q.toUpperCase()}%`).order('nama_kartu').limit(10)
  if (error) return NextResponse.json({ error: 'Gagal mencari.' }, { status: 500 })
  return NextResponse.json({ hasil: (data ?? []).map(k => ({ id: k.id, nama: k.nama_kartu })) })
}

export async function POST(req: NextRequest) {
  const terbatas = checkRateLimit(req, { limit: 20, windowMs: 60_000, key: 'bpjs-buka' })
  if (terbatas) return terbatas
  const b = await req.json().catch(() => ({}))
  const id = Number(b?.id)
  const nik = bakukanNik(b?.nik)
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: 'Pilih nama Anda dulu.' }, { status: 400 })
  if (!nik) return NextResponse.json({ error: 'NIK harus 16 angka.' }, { status: 400 })

  const db = sb()
  const ip = sidikIp(req)
  const [{ count: gagalIp }, { count: gagalKartu }] = await Promise.all([
    db.from('kartu_bpjs_percobaan').select('id', { count: 'exact', head: true })
      .eq('ip_sidik', ip).eq('berhasil', false).gte('at', sejak(BATAS.jendelaIpMenit)),
    db.from('kartu_bpjs_percobaan').select('id', { count: 'exact', head: true })
      .eq('kartu_id', id).eq('berhasil', false).gte('at', sejak(BATAS.jendelaKartuMenit)),
  ])
  const tolak = putusanBatas(gagalIp ?? 0, gagalKartu ?? 0)
  if (tolak) return NextResponse.json({ error: tolak }, { status: 429 })

  const { data: k } = await db.from('kartu_bpjs')
    .select('id,nik,kpj,nama_kartu,berlaku,berkas_pdf,berkas_gambar,jumlah_unduh')
    .eq('id', id).eq('kontingen_id', KONTINGEN_ID).maybeSingle()
  if (!k || !nikSama(k.nik, nik)) {
    await db.from('kartu_bpjs_percobaan').insert({ kartu_id: k ? k.id : null, ip_sidik: ip, berhasil: false })
    const sisa = Math.max(0, BATAS.gagalKartu - (gagalKartu ?? 0) - 1)
    return NextResponse.json({
      error: sisa > 0 ? `NIK tidak cocok dengan kartu ini. Sisa ${sisa} percobaan.` : putusanBatas(0, BATAS.gagalKartu),
    }, { status: 401 })
  }

  const [g, p] = await Promise.all([
    db.storage.from('kartu-bpjs').createSignedUrl(k.berkas_gambar, UMUR_URL),
    db.storage.from('kartu-bpjs').createSignedUrl(k.berkas_pdf, UMUR_URL, { download: namaBerkasUnduh(k.nama_kartu) }),
  ])
  if (!g.data || !p.data) return NextResponse.json({ error: 'Berkas kartu belum tersedia. Hubungi KONI Kab. Bandung.' }, { status: 500 })

  await Promise.all([
    db.from('kartu_bpjs_percobaan').insert({ kartu_id: k.id, ip_sidik: ip, berhasil: true }),
    db.from('kartu_bpjs').update({ jumlah_unduh: (k.jumlah_unduh ?? 0) + 1, terakhir_diunduh: new Date().toISOString() }).eq('id', k.id),
    writeAudit({ action: 'KARTU_BPJS_DIBUKA_PUBLIK', resource: 'kartu_bpjs', resource_id: k.id, kontingen_id: KONTINGEN_ID, actor_email: 'publik (NIK pemilik)', ...reqMeta(req) }),
  ])
  return NextResponse.json({
    nama: k.nama_kartu, kpj: k.kpj, berlaku: k.berlaku,
    gambar_url: g.data.signedUrl, pdf_url: p.data.signedUrl,
  })
}
