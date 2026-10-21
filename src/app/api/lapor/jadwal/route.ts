// src/app/api/lapor/jadwal/route.ts
// PIC cabor menambah, mengubah, dan menghapus jadwal partai cabornya dari HP.
// Langsung tampil di halaman publik (keputusan Bos 21 Okt 2026). KONIDA bisa
// membetulkan dari Kelola Jadwal; setiap perubahan tercatat di audit_logs.

import { NextRequest, NextResponse } from 'next/server'
import { periksaPartai } from '@/lib/jadwal-partai'
import { KOLOM_PARTAI, cocokkanPartai, segarkanPublik } from '@/lib/partai-server'
import { ambilSesiLapor, dbLapor } from '@/lib/lapor-sesi'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Sesi = NonNullable<Awaited<ReturnType<typeof ambilSesiLapor>>>

async function siapkan(req: NextRequest) {
  const s = await ambilSesiLapor()
  if (!s) return { tolak: NextResponse.json({ error: 'Sesi habis. Masukkan kode lapor lagi.' }, { status: 401 }) }
  const terbatas = checkRateLimit(req, { limit: 60, windowMs: 60_000, key: 'lapor-jadwal' })
  if (terbatas) return { tolak: terbatas }
  return { s }
}

const jejak = (req: NextRequest, s: Sesi, action: string, id: number, payload: any, severity: 'info' | 'warning' = 'info') =>
  writeAudit({
    action, resource: 'jadwal_partai', resource_id: id, actor_id: `lapor_akses:${s.akses_id}`, actor_email: s.nama_pic,
    actor_role: 'pic_lapangan', kontingen_id: s.kontingen_id, payload: { cabor_id: s.cabor_id, ...payload }, severity, ...reqMeta(req),
  })

/** Baris partai milik cabor sesi ini, atau null. */
async function barisMilik(s: Sesi, id: number) {
  if (!Number.isInteger(id) || id <= 0) return null
  const { data } = await dbLapor().from('jadwal_partai').select(KOLOM_PARTAI).eq('id', id)
    .eq('kontingen_id', s.kontingen_id).eq('cabor_id', s.cabor_id).maybeSingle()
  return data as any
}

export async function POST(req: NextRequest) {
  const { s, tolak } = await siapkan(req)
  if (tolak) return tolak
  const mentah = await req.json().catch(() => null)
  const cek = periksaPartai(mentah, false)
  if ('galat' in cek) return NextResponse.json({ error: cek.galat }, { status: 422 })
  const isi: any = cek.isi
  const salah = await cocokkanPartai(s!.kontingen_id, s!.cabor_id, mentah, isi)
  if (salah) return NextResponse.json({ error: salah }, { status: 403 })

  const { data, error } = await dbLapor().from('jadwal_partai').insert({
    ...isi, kontingen_id: s!.kontingen_id, cabor_id: s!.cabor_id, sumber: 'pic', akses_id: s!.akses_id,
    dibuat_oleh: s!.nama_pic, diubah_oleh: s!.nama_pic,
  }).select(KOLOM_PARTAI).single()
  if (error) return NextResponse.json({ error: 'Gagal menyimpan. Coba lagi.' }, { status: 500 })
  await jejak(req, s!, 'LAPOR_JADWAL_TAMBAH', (data as any).id, { sesudah: data })
  segarkanPublik()
  return NextResponse.json({ ok: true, partai: data })
}

export async function PATCH(req: NextRequest) {
  const { s, tolak } = await siapkan(req)
  if (tolak) return tolak
  const mentah = await req.json().catch(() => null)
  const lama = await barisMilik(s!, Number(mentah?.id))
  if (!lama) return NextResponse.json({ error: 'Jadwal itu tidak ditemukan untuk cabor Anda.' }, { status: 404 })
  const { id: _id, ...isian } = mentah
  const cek = periksaPartai(isian, true)
  if ('galat' in cek) return NextResponse.json({ error: cek.galat }, { status: 422 })
  const isi: any = cek.isi
  const salah = await cocokkanPartai(s!.kontingen_id, s!.cabor_id, isian, isi)
  if (salah) return NextResponse.json({ error: salah }, { status: 403 })

  const { data, error } = await dbLapor().from('jadwal_partai')
    .update({ ...isi, diubah_oleh: s!.nama_pic, updated_at: new Date().toISOString() }).eq('id', lama.id).select(KOLOM_PARTAI).single()
  if (error) return NextResponse.json({ error: 'Gagal menyimpan. Coba lagi.' }, { status: 500 })
  const sebelum = Object.fromEntries(Object.keys(isi).map(k => [k, lama[k] ?? null]))
  await jejak(req, s!, 'LAPOR_JADWAL_UBAH', lama.id, { nomor: lama.nomor_teks, sebelum, sesudah: isi })
  segarkanPublik()
  return NextResponse.json({ ok: true, partai: data })
}

export async function DELETE(req: NextRequest) {
  const { s, tolak } = await siapkan(req)
  if (tolak) return tolak
  const lama = await barisMilik(s!, Number(new URL(req.url).searchParams.get('id')))
  if (!lama) return NextResponse.json({ error: 'Jadwal itu tidak ditemukan untuk cabor Anda.' }, { status: 404 })
  const { error } = await dbLapor().from('jadwal_partai').delete().eq('id', lama.id)
  if (error) return NextResponse.json({ error: 'Gagal menghapus. Coba lagi.' }, { status: 500 })
  // Isi lengkap disimpan di jejak supaya bisa dikembalikan bila salah hapus.
  await jejak(req, s!, 'LAPOR_JADWAL_HAPUS', lama.id, { baris: lama }, 'warning')
  segarkanPublik()
  return NextResponse.json({ ok: true })
}
