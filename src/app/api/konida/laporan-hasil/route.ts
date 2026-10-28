// src/app/api/konida/laporan-hasil/route.ts
// Antrean pengesahan laporan lapangan. Hanya laporan berstatus 'disahkan' yang
// dihitung sebagai medali — keputusan itu milik KONIDA, bukan PIC.

import { NextRequest, NextResponse } from 'next/server'
import { HASIL, periksaJam, tanggalSah } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor } from '@/lib/lapor-sesi'
import { writeAudit, reqMeta } from '@/lib/audit'
import { segarkanPublik } from '@/lib/partai-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const db = dbLapor()

  let laporan: any[]
  try {
    laporan = await ambilSemua((dari, sampai) => db.from('laporan_hasil')
      .select('id,cabor_id,nomor_id,nomor_teks,disiplin,atlet_ids,hasil,peringkat,nilai_teks,keterangan,lawan,jam,foto_path,tanggal,pelapor_nama,pelapor_wa,status,diputus_oleh,diputus_at,alasan_tolak,created_at')
      .eq('kontingen_id', a.kontingen_id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(dari, sampai))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const idAtlet = Array.from(new Set(laporan.flatMap((l: any) => l.atlet_ids as number[])))
  const idCabor = Array.from(new Set(laporan.map((l: any) => l.cabor_id)))
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
    laporan: laporan.map(({ foto_path, ...l }: any) => ({
      ...l,
      ada_foto: !!foto_path,
      cabor: namaCabor[l.cabor_id] ?? `Cabor ${l.cabor_id}`,
      atlet: (l.atlet_ids as number[]).map(id => namaAtlet[id] ?? `Atlet ${id}`),
    })),
  })
}

export async function POST(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const b = await req.json().catch(() => ({}))
  const id = Number(b?.id)
  const aksi = String(b?.aksi ?? '')
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Laporan tidak dikenali.' }, { status: 400 })

  const db = dbLapor()
  const { data: lama } = await db.from('laporan_hasil')
    .select('id,status,hasil,peringkat,nilai_teks,nomor_teks,tanggal,lawan,jam').eq('id', id).eq('kontingen_id', a.kontingen_id).maybeSingle()
  if (!lama) return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 })

  const kini = new Date().toISOString()
  let ubah: Record<string, any>
  if (aksi === 'sahkan') {
    ubah = { status: 'disahkan', diputus_oleh: a.nama, diputus_at: kini, alasan_tolak: null }
  } else if (aksi === 'tolak') {
    const alasan = typeof b?.alasan === 'string' ? b.alasan.trim().slice(0, 200) : ''
    if (!alasan) return NextResponse.json({ error: 'Tulis alasan penolakan supaya PIC tahu apa yang salah.' }, { status: 422 })
    ubah = { status: 'ditolak', diputus_oleh: a.nama, diputus_at: kini, alasan_tolak: alasan }
  } else if (aksi === 'kembalikan') {
    ubah = { status: 'menunggu', diputus_oleh: null, diputus_at: null, alasan_tolak: null }
  } else if (aksi === 'perbaiki') {
    // Koreksi isi hanya selagi menunggu — laporan yang sudah disahkan harus
    // dikembalikan dulu, supaya angka rekap tidak berubah diam-diam.
    if (lama.status !== 'menunggu')
      return NextResponse.json({ error: 'Kembalikan dulu ke antrean sebelum memperbaiki.' }, { status: 409 })
    if (!HASIL.includes(b?.hasil)) return NextResponse.json({ error: 'Hasil tidak dikenali.' }, { status: 422 })
    let peringkat: number | null = null
    if (b.hasil === 'peringkat') {
      peringkat = Number(b?.peringkat)
      if (!Number.isInteger(peringkat) || peringkat < 4 || peringkat > 999)
        return NextResponse.json({ error: 'Isi peringkatnya (4 ke atas).' }, { status: 422 })
    }
    const nomor = typeof b?.nomor_teks === 'string' ? b.nomor_teks.replace(/\s+/g, ' ').trim().slice(0, 120) : ''
    if (!nomor) return NextResponse.json({ error: 'Nomor pertandingan tidak boleh kosong.' }, { status: 422 })
    ubah = {
      hasil: b.hasil, peringkat, nomor_teks: nomor,
      nilai_teks: typeof b?.nilai_teks === 'string' ? (b.nilai_teks.trim().slice(0, 80) || null) : null,
    }
    // Lawan dan jam hanya diubah bila ikut dikirim — form lama yang belum mengenalnya tidak menghapusnya.
    if (typeof b?.lawan === 'string') ubah.lawan = b.lawan.replace(/\s+/g, ' ').trim().slice(0, 120) || null
    if (b?.jam !== undefined) {
      const jam = periksaJam(b.jam)
      if (jam === false) return NextResponse.json({ error: 'Jam tanding tidak dikenali. Tulis seperti 14:30.' }, { status: 422 })
      ubah.jam = jam
    }
    // Laporan yang dikirim lewat tengah malam tercatat di hari berikutnya; KONIDA boleh membetulkannya.
    if (b?.tanggal != null && b.tanggal !== '') {
      if (!tanggalSah(b.tanggal)) return NextResponse.json({ error: 'Tanggal tidak dikenali.' }, { status: 422 })
      ubah.tanggal = b.tanggal
    }
  } else {
    return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 })
  }

  const { error } = await db.from('laporan_hasil').update({ ...ubah, updated_at: kini }).eq('id', id).eq('kontingen_id', a.kontingen_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAudit({
    action: `LAPOR_HASIL_${aksi.toUpperCase()}`, resource: 'laporan_hasil', resource_id: id,
    actor_id: a.sesi.id != null ? String(a.sesi.id) : null, actor_email: a.sesi.username ?? null,
    actor_role: a.sesi.role ?? a.sesi.level ?? null, kontingen_id: a.kontingen_id,
    payload: { sebelum: lama, sesudah: ubah }, ...reqMeta(req),
  })
  // Perolehan medali di halaman publik dihitung dari laporan yang disahkan.
  if (lama.status === 'disahkan' || ubah.status === 'disahkan') segarkanPublik()
  return NextResponse.json({ ok: true })
}
