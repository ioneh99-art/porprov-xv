// src/app/publik/bpjs/page.tsx
// Cetak kartu BPJS Ketenagakerjaan kontingen Kab. Bandung — terbuka tanpa login.
// Pemilik mencari namanya lalu memasukkan NIK-nya sendiri sebagai kata sandi.
// Semua pemeriksaan di /api/publik/bpjs; halaman ini tidak memegang data apa pun.

import type { Metadata } from 'next'
import CetakBpjs from './CetakBpjs'

export const metadata: Metadata = {
  title: 'Cetak Kartu BPJS Ketenagakerjaan · KONI Kabupaten Bandung',
  description: 'Unduh dan cetak kartu BPJS Ketenagakerjaan atlet & official kontingen Kabupaten Bandung PORPROV XV Jawa Barat 2026.',
  robots: { index: false, follow: false },
}

export default function Halaman() {
  return <CetakBpjs />
}
