// src/lib/lapor-klien.ts
// Pengambil rekap laporan lapangan untuk halaman (Dashboard, Premium Report, War Room, layar).

import type { Rekap } from './lapor'

export interface MedaliTerbaru { id: number; cabor: string; nomor: string; hasil: 'emas' | 'perak' | 'perunggu'; tulis: string; nilai: string | null; tanggal: string; waktu: string; atlet: string[] }
export interface BarisCabor { cabor_id: number; cabor: string; emas: number; perak: number; perunggu: number; laga: number; target_koni: number; target_cabor: number }
export interface RekapLapangan {
  kontingen: string
  diperbarui: string
  hari_ini: { tanggal: string; hari_ke: number | null; rekap: Rekap }
  rekap: Rekap
  menunggu: number
  per_hari: ({ tanggal: string; hari_ke: number | null } & Rekap)[]
  per_cabor: BarisCabor[]
  medali_terbaru: MedaliTerbaru[]
  target: {
    ada: boolean; emas_koni: number; emas_cabor: number; atlet_emas: number
    tercapai: number; belum_emas: number; belum_turun: number; tautan_meragukan: number; cabang_tanpa_peta: number
    daftar: { atlet_id: number; nama: string; cabang: string; status: 'tercapai' | 'belum_emas'; terbaik: string | null; nomor: string | null }[]
  }
}

export type HasilAmbil = { ok: true; data: RekapLapangan } | { ok: false; status: number; pesan: string }

export async function ambilRekapLapangan(kontingenId: number): Promise<HasilAmbil> {
  try {
    const r = await fetch(`/api/konida/rekap-lapangan?kontingen_id=${kontingenId}`, { cache: 'no-store' })
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      return { ok: false, status: r.status, pesan: j.error ?? 'Gagal memuat rekap.' }
    }
    return { ok: true, data: await r.json() }
  } catch {
    return { ok: false, status: 0, pesan: 'Tidak ada sambungan.' }
  }
}
