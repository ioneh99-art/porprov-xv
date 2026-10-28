// src/app/api/konida/laporan-cabor/route.ts
// Bahan laporan monitoring satu cabor (?cabor_id=…): jadwal, daftar resmi,
// hasil yang sudah disahkan, dan catatan lapangan. Disusun menjadi HTML di
// peramban oleh src/lib/laporan-cabor.ts — rute ini hanya mengumpulkan data.

import { NextRequest, NextResponse } from 'next/server'
import { tanggalWIB } from '@/lib/lapor'
import { ambilAdminLapor } from '@/lib/lapor-admin'
import { ambilSemua, dbLapor, keluargaCabor } from '@/lib/lapor-sesi'
import { jadwalUntukCabor, type BahanLaporanCabor, type NomorLaporan } from '@/lib/laporan-cabor'
import type { BarisJadwal } from '@/lib/matriks'
import { targetAtlet, targetTim } from '@/lib/target-atlet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const a = await ambilAdminLapor(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const caborId = Number(new URL(req.url).searchParams.get('cabor_id'))
  if (!Number.isInteger(caborId) || caborId <= 0) return NextResponse.json({ error: 'Pilih cabornya.' }, { status: 400 })

  const db = dbLapor()
  const keluarga = await keluargaCabor(caborId)
  if (!keluarga.length) return NextResponse.json({ error: 'Cabor tidak dikenali.' }, { status: 404 })
  const idKeluarga = keluarga.map(k => k.id)

  let daftar: any[], hasil: any[], catatan: any[]
  try {
    [daftar, hasil, catatan] = await Promise.all([
      ambilSemua((d, s) => db.from('pendaftaran_nomor').select('disiplin,nomor,atlet_id,nama_berkas')
        .eq('kontingen_id', a.kontingen_id).in('cabor_id', idKeluarga).order('id').range(d, s)),
      ambilSemua((d, s) => db.from('laporan_hasil')
        .select('id,tanggal,jam,nomor_teks,atlet_ids,hasil,peringkat,nilai_teks,lawan,pelapor_nama,diputus_oleh,foto_path')
        .eq('kontingen_id', a.kontingen_id).in('cabor_id', idKeluarga).eq('status', 'disahkan').order('id').range(d, s)),
      ambilSemua((d, s) => db.from('catatan_lapangan')
        .select('id,jenis,mendesak,tanggal,jam,nomor_teks,atlet_ids,isi,status,tanggapan,pelapor_nama,ditangani_oleh,foto_path')
        .eq('kontingen_id', a.kontingen_id).in('cabor_id', idKeluarga).neq('status', 'diabaikan').order('id').range(d, s)),
    ])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  const [{ data: jadwal }, { data: kontingen }, { data: akses }] = await Promise.all([
    db.from('jadwal_cabor').select('cabor_disiplin,cabor_nama_raw,jenis,wilayah,tuan_rumah,mulai,selesai,venue'),
    db.from('kontingen').select('nama').eq('id', a.kontingen_id).maybeSingle(),
    db.from('lapor_akses').select('nama_pic').eq('kontingen_id', a.kontingen_id).in('cabor_id', idKeluarga).eq('aktif', true).eq('jalur', 'pic').order('created_at'),
  ])

  const idAtlet = Array.from(new Set([...hasil, ...catatan].flatMap(x => x.atlet_ids as number[])))
  const namaAtlet: Record<number, string> = {}
  for (let i = 0; i < idAtlet.length; i += 500) {
    const { data } = await db.from('atlet').select('id,nama_lengkap').in('id', idAtlet.slice(i, i + 500))
    for (const r of (data ?? [])) namaAtlet[r.id] = r.nama_lengkap
  }
  const nama = (id: number) => namaAtlet[id] ?? `Atlet ${id}`
  const target = hasil.length ? await targetAtlet(db, a.kontingen_id) : {}

  // Daftar resmi: satu baris = satu atlet di satu nomor. Nama ditulis seperti di
  // berkas resmi, termasuk atlet yang belum ada di sistem.
  const perNomor = new Map<string, NomorLaporan>()
  const orang = new Set<string>()
  for (const r of daftar) {
    const kunci = `${r.disiplin}|${r.nomor}`
    const n: NomorLaporan = perNomor.get(kunci) ?? { disiplin: r.disiplin, nomor: r.nomor, atlet: [] }
    if (!n.atlet.includes(r.nama_berkas)) n.atlet.push(r.nama_berkas)
    perNomor.set(kunci, n)
    orang.add(r.atlet_id != null ? `id:${r.atlet_id}` : `nama:${r.nama_berkas}`)
  }
  const nomor = Array.from(perNomor.values()).sort((x, y) =>
    x.disiplin.localeCompare(y.disiplin) || x.nomor.localeCompare(y.nomor, 'id', { numeric: true }))

  let jumlahAtlet = orang.size
  if (!daftar.length) {
    // Cabor tanpa daftar resmi: hitung atlet di sistem.
    const { count } = await db.from('atlet').select('id', { count: 'exact', head: true }).eq('kontingen_id', a.kontingen_id).in('cabor_id', idKeluarga)
    jumlahAtlet = count ?? 0
  }

  const bahan: BahanLaporanCabor = {
    kontingen: kontingen?.nama ?? '',
    cabor: keluarga[0].nama,
    jadwal: jadwalUntukCabor((jadwal ?? []) as BarisJadwal[], keluarga.map(k => k.nama)),
    nomor,
    jumlah_atlet: jumlahAtlet,
    pic: Array.from(new Set((akses ?? []).map((x: any) => x.nama_pic as string))),
    hasil: hasil.map(h => ({
      id: h.id, tanggal: h.tanggal, jam: h.jam, nomor_teks: h.nomor_teks, atlet: (h.atlet_ids as number[]).map(nama),
      hasil: h.hasil, peringkat: h.peringkat, nilai_teks: h.nilai_teks, lawan: h.lawan,
      target: targetTim(h.atlet_ids as number[], target), pelapor_nama: h.pelapor_nama, diputus_oleh: h.diputus_oleh, ada_foto: !!h.foto_path,
    })),
    catatan: catatan.map(c => ({
      id: c.id, jenis: c.jenis, mendesak: c.mendesak, tanggal: c.tanggal, jam: c.jam, nomor_teks: c.nomor_teks,
      atlet: (c.atlet_ids as number[]).map(nama), isi: c.isi, status: c.status, tanggapan: c.tanggapan,
      pelapor_nama: c.pelapor_nama, ditangani_oleh: c.ditangani_oleh, ada_foto: !!c.foto_path,
    })),
    dibuat: tanggalWIB(),
  }
  return NextResponse.json(bahan)
}
