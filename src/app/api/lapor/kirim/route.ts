// src/app/api/lapor/kirim/route.ts
// PIC mengirim satu laporan hasil, boleh disertai satu foto bukti. Selalu masuk
// sebagai 'menunggu' — tidak ada jalan dari sini untuk langsung mengubah rekap medali.

import { NextRequest, NextResponse } from 'next/server'
import { adalahFinal, kunciKembar, periksaLaporan, tanggalWIB } from '@/lib/lapor'
import { rapikan, tulisNomorResmi } from '@/lib/pendaftaran'
import { WADAH_BUKTI, ambilSesiLapor, atletCabor, bacaKiriman, dbLapor, keluargaCabor, pendaftaranCabor, simpanFotoBukti } from '@/lib/lapor-sesi'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAudit, reqMeta } from '@/lib/audit'
import { segarkanPublik } from '@/lib/partai-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const s = await ambilSesiLapor()
  if (!s) return NextResponse.json({ error: 'Sesi habis. Masukkan kode lapor lagi.' }, { status: 401 })
  const terbatas = checkRateLimit(req, { limit: 30, windowMs: 60_000, key: 'lapor-kirim' })
  if (terbatas) return terbatas

  const kiriman = await bacaKiriman(req)
  if (!kiriman) return NextResponse.json({ error: 'Kiriman tidak terbaca. Coba lagi.' }, { status: 400 })
  const { mentah, foto } = kiriman

  const hasil = periksaLaporan(mentah)
  if ('galat' in hasil) return NextResponse.json({ error: hasil.galat }, { status: 422 })
  const isi = hasil.isi
  const db = dbLapor()

  // Atlet yang dikirim peramban tidak dipercaya: semuanya harus termasuk atlet
  // yang boleh dilaporkan lewat kode ini (cabornya, atau terdaftar resmi di cabornya).
  const daftar = await pendaftaranCabor(s.kontingen_id, s.cabor_id)
  const boleh = new Set((await atletCabor(s.kontingen_id, s.cabor_id, daftar)).map(a => a.id))
  if (isi.atlet_ids.some(id => !boleh.has(id)))
    return NextResponse.json({ error: 'Ada atlet yang bukan dari cabor Anda.' }, { status: 403 })

  // Nomor dari daftar resmi: disiplin dan namanya dicocokkan ulang di server, dan
  // tulisan nomornya disusun di sini — bukan memakai tulisan kiriman peramban.
  let disiplin: string | null = null
  if (mentah?.disiplin != null && mentah.disiplin !== '') {
    const d = rapikan(mentah.disiplin), n = rapikan(mentah.nomor_resmi)
    if (!daftar.some(x => x.disiplin === d && x.nomor === n))
      return NextResponse.json({ error: 'Nomor itu tidak ada di daftar resmi cabor Anda.' }, { status: 422 })
    disiplin = d
    isi.nomor_id = null
    isi.nomor_teks = tulisNomorResmi(d, n, new Set(daftar.map(x => x.disiplin)).size)
  }

  if (isi.nomor_id != null) {
    const idKeluarga = (await keluargaCabor(s.cabor_id)).map(k => k.id)
    const { data: nomor } = await db.from('nomor_pertandingan').select('id,cabor_id').eq('id', isi.nomor_id).maybeSingle()
    if (!nomor || !idKeluarga.includes(nomor.cabor_id))
      return NextResponse.json({ error: 'Nomor pertandingan bukan dari cabor Anda.' }, { status: 403 })
  }

  // Laporan dari partai terjadwal: partainya harus milik cabor ini.
  let partai_id: number | null = null
  if (mentah?.partai_id != null && mentah.partai_id !== '') {
    const { data: p } = await db.from('jadwal_partai').select('id').eq('id', Number(mentah.partai_id))
      .eq('kontingen_id', s.kontingen_id).eq('cabor_id', s.cabor_id).maybeSingle()
    if (!p) return NextResponse.json({ error: 'Jadwal partai itu bukan dari cabor Anda.' }, { status: 403 })
    partai_id = p.id
  }

  const tanggal = tanggalWIB()
  const { data: sudahAda } = await db.from('laporan_hasil').select('nomor_teks,atlet_ids,tanggal,hasil')
    .eq('kontingen_id', s.kontingen_id).eq('cabor_id', s.cabor_id).eq('tanggal', tanggal).neq('status', 'ditolak')
  const kunci = kunciKembar({ ...isi, tanggal })
  if ((sudahAda ?? []).some((l: any) => adalahFinal(l.hasil) && kunciKembar(l) === kunci))
    return NextResponse.json({ error: 'Hasil akhir nomor ini untuk atlet yang sama sudah dilaporkan hari ini.' }, { status: 409 })

  let foto_path: string | null = null
  if (foto) {
    const unggah = await simpanFotoBukti(`${s.kontingen_id}/${tanggal}`, foto)
    if ('error' in unggah) return NextResponse.json({ error: unggah.error }, { status: unggah.status })
    foto_path = unggah.path
  }

  const { data: baru, error } = await db.from('laporan_hasil').insert({
    kontingen_id: s.kontingen_id, cabor_id: s.cabor_id,
    ...isi, disiplin, tanggal, foto_path, partai_id,
    akses_id: s.akses_id, pelapor_nama: s.nama_pic, pelapor_wa: s.no_wa,
  }).select('id').single()
  if (error) {
    if (foto_path) await db.storage.from(WADAH_BUKTI).remove([foto_path])   // jangan tinggalkan foto yatim
    return NextResponse.json({ error: 'Gagal menyimpan. Coba lagi.' }, { status: 500 })
  }

  await writeAudit({
    action: 'LAPOR_HASIL_KIRIM', resource: 'laporan_hasil', resource_id: baru.id,
    actor_id: `lapor_akses:${s.akses_id}`, actor_email: s.nama_pic, actor_role: s.jalur === 'konida' ? 'konida_langsung' : 'pic_lapangan',
    kontingen_id: s.kontingen_id, payload: { cabor_id: s.cabor_id, hasil: isi.hasil, nomor: isi.nomor_teks, foto: !!foto_path, partai_id },
    ...reqMeta(req),
  })
  // Partainya sudah dimainkan: tandai selesai supaya halaman publik ikut berubah.
  if (partai_id) {
    await db.from('jadwal_partai').update({ status: 'selesai', diubah_oleh: s.nama_pic, updated_at: new Date().toISOString() }).eq('id', partai_id)
    segarkanPublik()
  }
  return NextResponse.json({ ok: true, id: baru.id })
}
