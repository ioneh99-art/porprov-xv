// src/app/publik/kabbandung/page.tsx
// Halaman awal kab-bandung.vercel.app (lihat middleware): jadwal pertandingan
// kontingen Kab. Bandung, terbuka tanpa login. Datanya jadwal_cabor yang
// tampil_publik — dikelola admin di Kelola Jadwal. Kolom internal
// (akomodasi, kontak panitia, catatan) sengaja tidak dibaca.

import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { tanggalWIB } from '@/lib/lapor'
import type { BarisPublik } from '@/lib/jadwal-publik'
import JadwalPublik from './JadwalPublik'

// Perubahan dari Kelola Jadwal tampil di sini paling lama satu menit kemudian.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Jadwal Pertandingan · Kontingen Kab. Bandung · PORPROV XV 2026',
  description: 'Jadwal dan venue pertandingan seluruh cabor kontingen Kabupaten Bandung di PORPROV XV Jawa Barat 2026.',
}

async function ambilJadwal(): Promise<{ jadwal: BarisPublik[]; diperbarui: string | null; galat: boolean }> {
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } })
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
  const { jadwal, diperbarui, galat } = await ambilJadwal()
  return <JadwalPublik jadwal={jadwal} diperbarui={diperbarui} hariIniServer={tanggalWIB()} galat={galat} />
}
