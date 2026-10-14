// src/app/api/konida/catatan-lapangan/route.ts
// Catatan lapangan dari PIC untuk ditindaklanjuti KONIDA:
// baru → ditangani → selesai, atau diabaikan (wajib beralasan, terlihat oleh PIC).

import { NextRequest, NextResponse } from 'next/server'
import { rapikanTanggapan } from '@/lib/catatan'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()

  let catatan: any[]
  try {
    catatan = await ambilSemua((dari, sampai) => db.from('catatan_lapangan')
      .select('id,cabor_id,jenis,mendesak,tanggal,jam,nomor_teks,atlet_ids,isi,foto_path,pelapor_nama,pelapor_wa,status,tanggapan,ditangani_oleh,ditangani_at,created_at')
      .eq('kontingen_id', a.kontingen_id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(dari, sampai))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const idAtlet = Array.from(new Set(catatan.flatMap((c: any) => c.atlet_ids as number[])))
  const idCabor = Array.from(new Set(catatan.map((c: any) => c.cabor_id)))
  const namaAtlet: Record<number, string> = {}
  for (let i = 0; i < idAtlet.length; i += 500) {
    const { data } = await db.from('atlet').select('id,nama_lengkap').in('id', idAtlet.slice(i, i + 500))
    for (const r of (data ?? [])) namaAtlet[r.id] = r.nama_lengkap
  }
  const namaCabor: Record<number, string> = {}
  if (idCabor.length) {
    const { data } = await db.from('cabang_olahraga').select('id,nama').in('id', idCabor)
    for (const r of (data ?? [])) namaCabor[r.id] = r.nama
  }

  return NextResponse.json({
    // Alamat berkas foto tidak dikirim ke peramban — cukup tanda ada/tidaknya.
    catatan: catatan.map(({ foto_path, ...c }: any) => ({
      ...c,
      ada_foto: !!foto_path,
      cabor: namaCabor[c.cabor_id] ?? `Cabor ${c.cabor_id}`,
      atlet: (c.atlet_ids as number[]).map(id => namaAtlet[id] ?? `Atlet ${id}`),
    })),
  })
}

export async function POST(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const b = await req.json().catch(() => ({}))
  const id = Number(b?.id)
  const aksi = String(b?.aksi ?? '')
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Catatan tidak dikenali.' }, { status: 400 })

  const db = dbLapor()
  const { data: lama } = await db.from('catatan_lapangan')
    .select('id,status,tanggapan,ditangani_oleh').eq('id', id).eq('kontingen_id', a.kontingen_id).maybeSingle()
  if (!lama) return NextResponse.json({ error: 'Catatan tidak ditemukan.' }, { status: 404 })

  const kini = new Date().toISOString()
  const tanggapan = rapikanTanggapan(b?.tanggapan)
  let ubah: Record<string, any>
  if (aksi === 'tangani' || aksi === 'selesai') {
    // Tanggapan boleh kosong; bila kosong, tanggapan sebelumnya dipertahankan.
    ubah = { status: aksi === 'tangani' ? 'ditangani' : 'selesai', ditangani_oleh: a.nama, ditangani_at: kini }
    if (tanggapan) ubah.tanggapan = tanggapan
  } else if (aksi === 'abaikan') {
    if (!tanggapan) return NextResponse.json({ error: 'Tulis alasannya supaya PIC tahu kenapa catatannya diabaikan.' }, { status: 422 })
    ubah = { status: 'diabaikan', tanggapan, ditangani_oleh: a.nama, ditangani_at: kini }
  } else if (aksi === 'buka') {
    ubah = { status: 'baru' }
  } else {
    return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 })
  }

  const { error } = await db.from('catatan_lapangan').update({ ...ubah, updated_at: kini }).eq('id', id).eq('kontingen_id', a.kontingen_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    action: `LAPOR_CATATAN_${aksi.toUpperCase()}`, resource: 'catatan_lapangan', resource_id: id,
    actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
    actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id,
    payload: { sebelum: lama, sesudah: ubah }, ...reqMeta(req),
  })
  return NextResponse.json({ ok: true })
}
