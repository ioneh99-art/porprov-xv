// src/app/api/lapor/catatan/route.ts
// PIC mengirim catatan kejadian di lapangan (tidak sesuai aturan, masalah teknis,
// di luar teknis), boleh disertai satu foto. Catatan tidak mengubah angka apa pun;
// KONIDA yang menindaklanjutinya.

import { NextRequest, NextResponse } from 'next/server'
import { periksaCatatan } from '@/lib/catatan'
import { tanggalWIB } from '@/lib/lapor'
import { WADAH_BUKTI, ambilSesiLapor, atletCabor, bacaKiriman, dbLapor, pendaftaranCabor, simpanFotoBukti } from '@/lib/lapor-sesi'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAudit, reqMeta } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const s = await ambilSesiLapor()
  if (!s) return NextResponse.json({ error: 'Sesi habis. Masukkan kode lapor lagi.' }, { status: 401 })
  const terbatas = checkRateLimit(req, { limit: 20, windowMs: 60_000, key: 'lapor-catatan' })
  if (terbatas) return terbatas

  const kiriman = await bacaKiriman(req)
  if (!kiriman) return NextResponse.json({ error: 'Kiriman tidak terbaca. Coba lagi.' }, { status: 400 })
  const hasil = periksaCatatan(kiriman.mentah)
  if ('galat' in hasil) return NextResponse.json({ error: hasil.galat }, { status: 422 })
  const isi = hasil.isi

  // Atlet yang disebut harus termasuk atlet yang boleh dilaporkan lewat kode ini.
  if (isi.atlet_ids.length) {
    const daftar = await pendaftaranCabor(s.kontingen_id, s.cabor_id)
    const boleh = new Set((await atletCabor(s.kontingen_id, s.cabor_id, daftar)).map(a => a.id))
    if (isi.atlet_ids.some(id => !boleh.has(id)))
      return NextResponse.json({ error: 'Ada atlet yang bukan dari cabor Anda.' }, { status: 403 })
  }

  const tanggal = tanggalWIB()
  let foto_path: string | null = null
  if (kiriman.foto) {
    const unggah = await simpanFotoBukti(`${s.kontingen_id}/catatan/${tanggal}`, kiriman.foto)
    if ('error' in unggah) return NextResponse.json({ error: unggah.error }, { status: unggah.status })
    foto_path = unggah.path
  }

  const db = dbLapor()
  const { data: baru, error } = await db.from('catatan_lapangan').insert({
    kontingen_id: s.kontingen_id, cabor_id: s.cabor_id, ...isi, tanggal, foto_path,
    akses_id: s.akses_id, pelapor_nama: s.nama_pic, pelapor_wa: s.no_wa,
  }).select('id').single()
  if (error) {
    if (foto_path) await db.storage.from(WADAH_BUKTI).remove([foto_path])   // jangan tinggalkan foto yatim
    return NextResponse.json({ error: 'Gagal menyimpan. Coba lagi.' }, { status: 500 })
  }

  await writeAudit({
    action: 'LAPOR_CATATAN_KIRIM', resource: 'catatan_lapangan', resource_id: baru.id,
    actor_id: `lapor_akses:${s.akses_id}`, actor_email: s.nama_pic, actor_role: 'pic_lapangan',
    kontingen_id: s.kontingen_id, payload: { cabor_id: s.cabor_id, jenis: isi.jenis, mendesak: isi.mendesak, foto: !!foto_path },
    ...reqMeta(req),
  })
  return NextResponse.json({ ok: true, id: baru.id })
}
