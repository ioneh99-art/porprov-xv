// src/app/api/gateway/foto/route.ts
// Simpan pasfoto atlet yang SUDAH dikonfirmasi operator.
//
// Peramban yang mengecilkan gambar (dari ~1,4 MB jadi ~60 KB) lalu mengirim
// per kelompok kecil. Alasannya: rute server hanya menerima kiriman sekitar
// 4,5 MB, jadi mengirim satu folder cabor mentah-mentah pasti gagal.
//
// Pengaman sama dengan /api/gateway/commit: wajib sesi, kontingen dari sesi,
// kepemilikan atlet diperiksa ulang di server.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { getServerSession } from '@/lib/guard'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WADAH = 'foto-atlet'
const MAKS_PER_KIRIM = 25
const MAKS_BYTE = 3 * 1024 * 1024

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const isAdmin = (s: any) =>
  ['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level)

interface Kiriman { atlet_id: number; nama_berkas?: string; mime: string; data: string }

/** Ambil jalur berkas di dalam wadah dari alamat publiknya. */
function jalurDariUrl(url: string | null): string | null {
  if (!url) return null
  const tanda = `/${WADAH}/`
  const i = url.indexOf(tanda)
  return i < 0 ? null : url.slice(i + tanda.length)
}

export async function POST(req: NextRequest) {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const kiriman: Kiriman[] = Array.isArray(body?.foto) ? body.foto : []
  if (!kiriman.length) return NextResponse.json({ error: 'Tidak ada foto dikirim.' }, { status: 400 })
  if (kiriman.length > MAKS_PER_KIRIM) {
    return NextResponse.json({ error: `Maksimal ${MAKS_PER_KIRIM} foto per pengiriman.` }, { status: 413 })
  }

  const kontingen_id = s.kontingen_id ?? (isAdmin(s) ? Number(body.kontingen_id) : null)
  if (!kontingen_id) return NextResponse.json({ error: 'Kontingen tidak diketahui dari sesi.' }, { status: 403 })

  const db = sb()

  // Kepemilikan diperiksa ulang di server — jangan percaya kiriman klien.
  const ids = Array.from(new Set(kiriman.map(f => Number(f.atlet_id)).filter(Boolean)))
  const { data: sahRows } = await db.from('atlet')
    .select('id, foto_url').eq('kontingen_id', kontingen_id).in('id', ids)
  const sah = new Map<number, string | null>((sahRows ?? []).map((a: any) => [a.id, a.foto_url]))
  const asing = ids.filter(id => !sah.has(id))
  if (asing.length) {
    return NextResponse.json({ error: `${asing.length} atlet di luar kontingen Anda. Dibatalkan.` }, { status: 403 })
  }

  const MIME_OK: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  let tersimpan = 0
  const gagal: string[] = []

  for (const f of kiriman) {
    const label = f.nama_berkas ?? `atlet ${f.atlet_id}`
    const ext = MIME_OK[f.mime]
    if (!ext) { gagal.push(`${label}: format ${f.mime} tidak didukung`); continue }

    let buf: Buffer
    try {
      buf = Buffer.from(String(f.data).replace(/^data:[^,]+,/, ''), 'base64')
    } catch { gagal.push(`${label}: data gambar rusak`); continue }
    if (!buf.length) { gagal.push(`${label}: data gambar kosong`); continue }
    if (buf.length > MAKS_BYTE) { gagal.push(`${label}: ukuran ${(buf.length / 1048576).toFixed(1)} MB melebihi batas`); continue }

    // Nama acak supaya alamat foto tidak bisa ditebak dari id atlet.
    const jalur = `atlet/${f.atlet_id}-${randomBytes(8).toString('hex')}.${ext}`
    const { error: upErr } = await db.storage.from(WADAH)
      .upload(jalur, buf, { contentType: f.mime, upsert: false })
    if (upErr) { gagal.push(`${label}: ${upErr.message}`); continue }

    const { data: urlData } = db.storage.from(WADAH).getPublicUrl(jalur)
    const { error: updErr } = await db.from('atlet')
      .update({ foto_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', f.atlet_id).eq('kontingen_id', kontingen_id)
    if (updErr) {
      await db.storage.from(WADAH).remove([jalur])   // jangan tinggalkan berkas yatim
      gagal.push(`${label}: ${updErr.message}`)
      continue
    }

    // Foto lama milik atlet ini dibuang supaya wadah tidak menumpuk sampah.
    const jalurLama = jalurDariUrl(sah.get(Number(f.atlet_id)) ?? null)
    if (jalurLama && jalurLama !== jalur) await db.storage.from(WADAH).remove([jalurLama])

    tersimpan++
  }

  await writeAudit({
    action: 'GATEWAY_SIMPAN_FOTO',
    resource: 'atlet', resource_id: null,
    actor_id: s.id != null ? String(s.id) : null,
    actor_email: s.username ?? s.nama ?? null,
    actor_role: s.role ?? s.level ?? null,
    kontingen_id,
    payload: { dikirim: kiriman.length, tersimpan, gagal: gagal.length },
    severity: 'warning', ...reqMeta(req),
  })

  return NextResponse.json({ ok: gagal.length === 0, tersimpan, gagal })
}
