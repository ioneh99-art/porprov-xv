// src/app/publik/kabbandung/page.tsx
// Halaman awal www.konikab-bdg.com dan kab-bandung.vercel.app (lihat middleware): jadwal pertandingan
// kontingen Kab. Bandung, terbuka tanpa login. Datanya jadwal_cabor yang
// tampil_publik — dikelola admin di Kelola Jadwal. Kolom internal
// (akomodasi, kontak panitia, catatan) sengaja tidak dibaca.
// Perolehan medali: hanya laporan lapangan yang sudah disahkan KONIDA.

import type { Metadata } from 'next'
import { Barlow_Condensed } from 'next/font/google'
import { createClient } from '@supabase/supabase-js'
import { tanggalWIB } from '@/lib/lapor'
import { adalahMedali, type AngkaKontingen, type BarisPublik, type MedaliPublik, type PartaiPublik } from '@/lib/jadwal-publik'
import { ambilSemua } from '@/lib/lapor-sesi'
import { ALAMAT_RESMI_KABBANDUNG } from '@/lib/alamat'
import JadwalPublik from './JadwalPublik'

// Huruf judul dan angka besar bergaya papan skor.
const hurufTampil = Barlow_Condensed({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-tampil', display: 'swap' })

// Perubahan dari Kelola Jadwal tampil di sini paling lama satu menit kemudian.
export const revalidate = 60

const JUDUL = 'Jadwal Pertandingan Kontingen Kabupaten Bandung · PORPROV XV Jawa Barat 2026'
const URAIAN = 'Jadwal, venue, dan kota tuan rumah seluruh cabor kontingen Kabupaten Bandung di PORPROV XV Jawa Barat 2026. Kabupaten Bandung BEDAS!'
export const metadata: Metadata = {
  metadataBase: new URL(ALAMAT_RESMI_KABBANDUNG),
  title: JUDUL,
  description: URAIAN,
  // Pratinjau saat tautan dibagikan di WhatsApp/Facebook.
  openGraph: { title: JUDUL, description: URAIAN, url: '/', siteName: 'KONI Kabupaten Bandung', locale: 'id_ID', type: 'website',
    images: [{ url: '/logos/og-kabbandung.jpg', width: 1200, height: 630, alt: 'Menara Soreang, Kabupaten Bandung' }] },
  twitter: { card: 'summary_large_image', title: JUDUL, description: URAIAN, images: ['/logos/og-kabbandung.jpg'] },
}

const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } })

/** Angka gabungan dari daftar pendaftaran resmi KONI — tanpa nama atau data pribadi atlet. */
async function ambilAngka(): Promise<AngkaKontingen | null> {
  try {
    const baris = await ambilSemua<{ atlet_id: number | null; nama_berkas: string | null; cabor_id: number; nomor: string }>((d, s) =>
      sb().from('pendaftaran_nomor').select('atlet_id,nama_berkas,cabor_id,nomor').eq('kontingen_id', 4).order('id').range(d, s))
    if (!baris.length) return null
    return {
      atlet: new Set(baris.map(b => b.atlet_id != null ? `a${b.atlet_id}` : `n${(b.nama_berkas ?? '').trim().toUpperCase()}`)).size,
      nomor: new Set(baris.map(b => `${b.cabor_id}|${b.nomor}`)).size,
      cabor: new Set(baris.map(b => b.cabor_id)).size,
    }
  } catch { return null }
}

/** Jadwal partai kontingen (kecuali yang batal), dengan nama cabor dan nama atlet. */
async function ambilPartai(): Promise<PartaiPublik[]> {
  try {
    const db = sb()
    const { data, error } = await db.from('jadwal_partai')
      .select('id,cabor_id,tanggal,jam,nomor_teks,babak,atlet_ids,lawan,venue,status')
      .eq('kontingen_id', 4).neq('status', 'batal').order('tanggal').limit(3000)
    if (error || !data?.length) return []
    const idAtlet = Array.from(new Set(data.flatMap((p: any) => p.atlet_ids as number[])))
    const idCabor = Array.from(new Set(data.map((p: any) => p.cabor_id as number)))
    const [{ data: atlet }, { data: cabor }] = await Promise.all([
      idAtlet.length ? db.from('atlet').select('id,nama_lengkap').eq('kontingen_id', 4).in('id', idAtlet) : Promise.resolve({ data: [] as any[] }),
      db.from('cabang_olahraga').select('id,nama').in('id', idCabor),
    ])
    const nama = new Map((atlet ?? []).map((a: any) => [a.id, a.nama_lengkap as string]))
    const namaCabor = new Map((cabor ?? []).map((c: any) => [c.id, c.nama as string]))
    return data.map((p: any) => ({
      id: p.id, cabor: namaCabor.get(p.cabor_id) ?? '', tanggal: p.tanggal, jam: p.jam, nomor: p.nomor_teks, babak: p.babak,
      atlet: (p.atlet_ids as number[]).map(id => nama.get(id)).filter((x): x is string => !!x), lawan: p.lawan, venue: p.venue, status: p.status,
    }))
  } catch { return [] }
}

/** Medali dari laporan lapangan yang SUDAH DISAHKAN KONIDA — yang menunggu atau ditolak tidak ikut. */
async function ambilMedali(): Promise<MedaliPublik[]> {
  try {
    const db = sb()
    const data = await ambilSemua<any>((d, s) => db.from('laporan_hasil')
      .select('id,cabor_id,tanggal,nomor_teks,hasil,atlet_ids').eq('kontingen_id', 4).eq('status', 'disahkan')
      .in('hasil', ['emas', 'perak', 'perunggu']).order('id').range(d, s))
    if (!data.length) return []
    const idAtlet = Array.from(new Set(data.flatMap((l: any) => l.atlet_ids as number[])))
    const idCabor = Array.from(new Set(data.map((l: any) => l.cabor_id as number)))
    const nama = new Map<number, string>()
    for (let i = 0; i < idAtlet.length; i += 500) {
      const { data: a } = await db.from('atlet').select('id,nama_lengkap').eq('kontingen_id', 4).in('id', idAtlet.slice(i, i + 500))
      for (const r of (a ?? [])) nama.set(r.id, r.nama_lengkap)
    }
    const { data: cabor } = await db.from('cabang_olahraga').select('id,nama').in('id', idCabor)
    const namaCabor = new Map((cabor ?? []).map((c: any) => [c.id, c.nama as string]))
    return data.filter((l: any) => adalahMedali(l.hasil)).map((l: any) => ({
      id: l.id, tanggal: l.tanggal, cabor: namaCabor.get(l.cabor_id) ?? '', nomor: l.nomor_teks, medali: l.hasil,
      atlet: (l.atlet_ids as number[]).map(id => nama.get(id)).filter((x): x is string => !!x),
    }))
  } catch { return [] }
}

async function ambilJadwal(): Promise<{ jadwal: BarisPublik[]; diperbarui: string | null; galat: boolean }> {
  try {
    const db = sb()
    const { data, error } = await db.from('jadwal_cabor')
      .select('id,jenis,cabor_disiplin,cabor_nama_raw,wilayah,tuan_rumah,venue,mulai,selesai,updated_at')
      .eq('tampil_publik', true).order('mulai', { nullsFirst: false })
    if (error) throw error
    const jadwal: BarisPublik[] = (data ?? []).map((r: any) => ({
      id: r.id, jenis: r.jenis === 'upacara' ? 'upacara' : 'pertandingan', kegiatan: r.cabor_disiplin,
      cabor: r.cabor_nama_raw, wilayah: r.wilayah, kota: r.tuan_rumah, venue: r.venue, mulai: r.mulai, selesai: r.selesai,
    }))
    const diperbarui = (data ?? []).map((r: any) => r.updated_at as string).filter(Boolean).sort().reverse()[0] ?? null
    return { jadwal, diperbarui, galat: false }
  } catch {
    return { jadwal: [], diperbarui: null, galat: true }
  }
}

export default async function HalamanPublikKabBandung() {
  const [{ jadwal, diperbarui, galat }, angka, partai, medali] = await Promise.all([ambilJadwal(), ambilAngka(), ambilPartai(), ambilMedali()])
  return (
    <div className={hurufTampil.variable}>
      <JadwalPublik jadwal={jadwal} diperbarui={diperbarui} hariIniServer={tanggalWIB()} galat={galat} angka={angka} partai={partai} medali={medali} />
    </div>
  )
}
