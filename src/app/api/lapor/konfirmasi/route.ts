// src/app/api/lapor/konfirmasi/route.ts
// PIC menekan "Benar" pada medali yang sudah dicatat pihak lain (Jalur Cepat, situs KONI Jabar,
// Input Langsung KONIDA). Hasilnya sama dengan PIC mengirim laporan yang sama persis:
//   • tercatat laporan PIC baru sebagai bukti (status 'ditolak' + memvalidasi_id, tidak dihitung dua kali),
//   • medalinya bertanda "✓ tervalidasi" atas nama PIC, foto PIC ikut melengkapi bila medalinya belum berfoto.
// Kalau datanya salah, PIC tidak memakai tombol ini — ia mengirim laporan biasa (jadi "bentrok").

import { NextRequest, NextResponse } from 'next/server'
import { ALASAN_VALIDASI, lengkapiDariPic } from '@/lib/jalur-cepat'
import { medaliMenungguPic } from '@/lib/konfirmasi-pic'
import { WADAH_BUKTI, ambilSesiLapor, atletCabor, bacaKiriman, dbLapor, pendaftaranCabor, simpanFotoBukti } from '@/lib/lapor-sesi'
import { checkRateLimit } from '@/lib/rate-limit'
import { writeAudit, reqMeta } from '@/lib/audit'
import { segarkanPublik } from '@/lib/partai-server'
import { periksaPengisi } from '@/lib/pengisi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const s = await ambilSesiLapor()
  if (!s) return NextResponse.json({ error: 'Sesi habis. Masukkan kode lapor lagi.' }, { status: 401 })
  if (s.jalur !== 'pic') return NextResponse.json({ error: 'Konfirmasi hanya untuk PIC cabor (dengan kode PIC).' }, { status: 403 })
  const terbatas = checkRateLimit(req, { limit: 30, windowMs: 60_000, key: 'lapor-konfirmasi' })
  if (terbatas) return terbatas

  const kiriman = await bacaKiriman(req)
  if (!kiriman) return NextResponse.json({ error: 'Kiriman tidak terbaca. Coba lagi.' }, { status: 400 })
  const { mentah, foto } = kiriman
  const cekPengisi = periksaPengisi(mentah)
  if ('galat' in cekPengisi) return NextResponse.json({ error: cekPengisi.galat }, { status: 422 })
  const { pengisi } = cekPengisi
  const id = Number(mentah?.laporan_id)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Medali tidak dikenali.' }, { status: 400 })

  const db = dbLapor()
  // Hanya medali yang memang tampil di daftar konfirmasi PIC ini.
  const daftar = await medaliMenungguPic(db, s.kontingen_id, s.cabor_id, s.disiplin)
  const m = daftar.find(l => l.id === id)
  if (!m) return NextResponse.json({ error: 'Medali ini sudah dikonfirmasi atau bukan dari cabor Anda. Muat ulang halaman.' }, { status: 409 })
  if (s.disiplin && !m.disiplin) {
    const boleh = new Set((await atletCabor(s.kontingen_id, s.cabor_id, await pendaftaranCabor(s.kontingen_id, s.cabor_id, s.disiplin), true)).map(a => a.id))
    if (!(m.atlet_ids ?? []).some((a: number) => boleh.has(a))) return NextResponse.json({ error: 'Medali ini bukan dari disiplin Anda.' }, { status: 403 })
  }

  let foto_path: string | null = null
  if (foto) {
    const unggah = await simpanFotoBukti(`${s.kontingen_id}/${m.tanggal}`, foto)
    if ('error' in unggah) return NextResponse.json({ error: unggah.error }, { status: unggah.status })
    foto_path = unggah.path
  }

  const kini = new Date().toISOString()
  const { data: bukti, error } = await db.from('laporan_hasil').insert({
    kontingen_id: s.kontingen_id, cabor_id: s.cabor_id, disiplin: m.disiplin, nomor_id: m.nomor_id, nomor_teks: m.nomor_teks,
    atlet_ids: m.atlet_ids ?? [], hasil: m.hasil, peringkat: m.peringkat, nilai_teks: m.nilai_teks, tanggal: m.tanggal,
    keterangan: `Dikonfirmasi PIC: hasil yang sudah dicatat (#${m.id}) benar.`, foto_path,
    akses_id: s.akses_id, pelapor_nama: s.nama_pic, pelapor_wa: s.no_wa,
    pengisi_nama: pengisi.nama, pengisi_jabatan: pengisi.jabatan,
    status: 'ditolak', diputus_oleh: 'Sistem · konfirmasi PIC', diputus_at: kini, alasan_tolak: ALASAN_VALIDASI(m.id), memvalidasi_id: m.id,
  }).select('id').single()
  if (error) {
    if (foto_path) await db.storage.from(WADAH_BUKTI).remove([foto_path])
    return NextResponse.json({ error: 'Gagal menyimpan. Coba lagi.' }, { status: 500 })
  }

  const { data: kena } = await db.from('laporan_hasil').update({
    validasi: 'tervalidasi', validasi_laporan_id: bukti.id, validasi_oleh: s.nama_pic, validasi_at: kini, updated_at: kini,
    ...lengkapiDariPic(m, { foto_path }),
  }).eq('id', m.id).eq('kontingen_id', s.kontingen_id).eq('status', 'disahkan').or('validasi.eq.menunggu_pic,validasi.is.null').select('id')
  if (!kena?.length) {
    // Didahului konfirmasi/laporan lain di saat bersamaan: bukti ini tidak dipakai.
    await db.from('laporan_hasil').delete().eq('id', bukti.id)
    if (foto_path) await db.storage.from(WADAH_BUKTI).remove([foto_path])
    return NextResponse.json({ error: 'Medali ini baru saja dikonfirmasi. Muat ulang halaman.' }, { status: 409 })
  }

  await writeAudit({
    action: 'LAPOR_HASIL_KONFIRMASI_PIC', resource: 'laporan_hasil', resource_id: m.id,
    actor_id: `lapor_akses:${s.akses_id}`, actor_email: s.nama_pic, actor_role: 'pic_lapangan', kontingen_id: s.kontingen_id,
    payload: { laporan_pic: bukti.id, hasil: m.hasil, nomor: m.nomor_teks, foto: !!foto_path, pengisi }, ...reqMeta(req),
  })
  segarkanPublik()
  return NextResponse.json({ ok: true, id: bukti.id, pesan: 'Terima kasih — medali ini sudah Anda konfirmasi. ✓' })
}
