// src/app/publik/kabbandung/page.tsx
// Halaman awal kab-bandung.vercel.app (lihat middleware): jadwal pertandingan
// kontingen Kab. Bandung, terbuka tanpa login. Datanya jadwal_cabor yang
// tampil_publik — dikelola admin di Kelola Jadwal. Kolom internal
// (akomodasi, kontak panitia, catatan) sengaja tidak dibaca.

import type { Metadata } from 'next'
import { Barlow_Condensed } from 'next/font/google'
import { createClient } from '@supabase/supabase-js'
import { tanggalWIB } from '@/lib/lapor'
import type { AngkaKontingen, BarisPublik } from '@/lib/jadwal-publik'
import { ambilSemua } from '@/lib/lapor-sesi'
import JadwalPublik from './JadwalPublik'

// Huruf judul dan angka besar bergaya papan skor.
const hurufTampil = Barlow_Condensed({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-tampil', display: 'swap' })

// Perubahan dari Kelola Jadwal tampil di sini paling lama satu menit kemudian.
export const revalidate = 60

const JUDUL = 'Jadwal Pertandingan Kontingen Kabupaten Bandung · PORPROV XV Jawa Barat 2026'
const URAIAN = 'Jadwal, venue, dan kota tuan rumah seluruh cabor kontingen Kabupaten Bandung di PORPROV XV Jawa Barat 2026. Kabupaten Bandung BEDAS!'
export const metadata: Metadata = {
  metadataBase: new URL('https://kab-bandung.vercel.app'),
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
  const [{ jadwal, diperbarui, galat }, angka] = await Promise.all([ambilJadwal(), ambilAngka()])
  return (
    <div className={hurufTampil.variable}>
      <JadwalPublik jadwal={jadwal} diperbarui={diperbarui} hariIniServer={tanggalWIB()} galat={galat} angka={angka} />
    </div>
  )
}
