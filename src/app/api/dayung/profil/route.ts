// src/app/api/dayung/profil/route.ts
// Data atlet lokal (contoh Kab. Bandung) untuk Profil Atlet Dayung PODSI Jabar.
// Wajib sesi admin atau operator Dayung. Hanya atlet cabor Dayung (147).
// TIDAK mengirim NIK/KK/rekening/alamat/telepon/nomor BPJS — BPJS hanya ada/tidak.
//   GET ?ids=1,2,3            → ringkasan kelengkapan per atlet
//   GET ?ids=1&rinci=1        → + tes fisik per item, riwayat prestasi, perlengkapan, dokumen, target

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sesiDayung } from '@/lib/dayung-akses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const CABOR_DAYUNG = 147

export async function GET(req: NextRequest) {
  const s = await sesiDayung()
  if (!s) return NextResponse.json({ error: 'Tidak berwenang.' }, { status: 401 })
  const ids = Array.from(new Set((req.nextUrl.searchParams.get('ids') ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0))).slice(0, 600)
  const rinci = req.nextUrl.searchParams.get('rinci') === '1'
  if (!ids.length) return NextResponse.json({ atlet: {} })
  const db = sb()

  const { data: atlet, error } = await db.from('atlet')
    .select('id, tgl_lahir, status_registrasi, status_verifikasi, ukuran_kemeja, ukuran_sepatu')
    .in('id', ids).eq('cabor_id', CABOR_DAYUNG)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const sah = (atlet ?? []).map(a => a.id)
  if (!sah.length) return NextResponse.json({ atlet: {} })

  const [tes, bpjs, riw, perl, dok, target] = await Promise.all([
    db.from('atlet_tes_fisik').select('id, atlet_id, tanggal_tes, tahap, lembaga_penguji, tinggi_badan, berat_badan, bmi, kesimpulan_persen, kesimpulan_kategori').in('atlet_id', sah).order('tanggal_tes', { ascending: false }),
    db.from('kartu_bpjs').select('atlet_id, berlaku').in('atlet_id', sah),
    db.from('riwayat_prestasi').select('atlet_id, event, tahun, lokasi, nomor_tanding, hasil, level_event').in('atlet_id', sah).order('tahun', { ascending: false }),
    db.from('atlet_perlengkapan').select('atlet_id, ukuran_kemeja, ukuran_jaket, ukuran_kaos, ukuran_celana, ukuran_sepatu, ukuran_topi, ukuran_training_set').in('atlet_id', sah),
    db.from('atlet_dokumen').select('atlet_id, status, dokumen_jenis(nama)').in('atlet_id', sah),
    rinci ? db.from('intel_target_atlet').select('atlet_id, target_medali, capaian_catatan, pesaing').in('atlet_id', sah) : Promise.resolve({ data: [] as any[] }),
  ])

  // Item tes fisik hanya untuk tampilan rinci, dari tes terbaru tiap atlet
  const tesTerbaru = new Map<number, any>()
  for (const t of tes.data ?? []) if (!tesTerbaru.has(t.atlet_id)) tesTerbaru.set(t.atlet_id, t)
  let item: any[] = []
  if (rinci && tesTerbaru.size) {
    const { data } = await db.from('atlet_tes_fisik_item')
      .select('tes_fisik_id, no_urut, komponen, item_tes, hasil_nilai, hasil_satuan, norma_nilai, norma_satuan, capaian_persen, kategori')
      .in('tes_fisik_id', Array.from(tesTerbaru.values()).map(t => t.id)).order('no_urut')
    item = data ?? []
  }

  const hasil: Record<number, any> = {}
  for (const a of atlet ?? []) {
    const t = tesTerbaru.get(a.id)
    const p = (perl.data ?? []).find(x => x.atlet_id === a.id)
    const adaUkuranPerl = !!p && Object.entries(p).some(([k, v]) => k !== 'atlet_id' && v)
    const dokumen = (dok.data ?? []).filter(x => x.atlet_id === a.id).map((x: any) => ({ nama: x.dokumen_jenis?.nama ?? '-', status: x.status }))
    hasil[a.id] = {
      tgl_lahir: a.tgl_lahir,
      status_registrasi: a.status_registrasi,
      status_verifikasi: a.status_verifikasi,
      terverifikasi: ['Verified', 'Posted'].includes(a.status_registrasi ?? '') || a.status_verifikasi === 'Verified',
      tes: t ? {
        tanggal: t.tanggal_tes, tahap: t.tahap, lembaga: t.lembaga_penguji,
        tinggi: t.tinggi_badan, berat: t.berat_badan, bmi: t.bmi,
        persen: t.kesimpulan_persen, kategori: t.kesimpulan_kategori,
        jumlah_tes: (tes.data ?? []).filter(x => x.atlet_id === a.id).length,
        item: rinci ? item.filter(i => i.tes_fisik_id === t.id).map(({ tes_fisik_id, ...i }) => i) : undefined,
      } : null,
      bpjs: (bpjs.data ?? []).some(x => x.atlet_id === a.id),
      bpjs_berlaku: (bpjs.data ?? []).find(x => x.atlet_id === a.id)?.berlaku ?? null,
      riwayat: rinci ? (riw.data ?? []).filter(x => x.atlet_id === a.id).map(({ atlet_id, ...r }) => r) : undefined,
      jumlah_riwayat: (riw.data ?? []).filter(x => x.atlet_id === a.id).length,
      perlengkapan: rinci ? (p ? (({ atlet_id, ...r }) => r)(p) : null) : undefined,
      ada_perlengkapan: adaUkuranPerl || !!(a.ukuran_kemeja || a.ukuran_sepatu),
      dokumen: rinci ? dokumen : undefined,
      jumlah_dokumen: dokumen.length,
      target: rinci ? ((target.data ?? []) as any[])
        .filter(x => x.atlet_id === a.id && (x.target_medali || x.capaian_catatan?.trim() || x.pesaing?.trim()))
        .map(({ atlet_id, ...r }) => r) : undefined,
    }
  }
  return NextResponse.json({ atlet: hasil })
}
