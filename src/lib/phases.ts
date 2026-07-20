// src/lib/phases.ts
// Gerbang fase waktu (isPhaseOpen), meniru isPhaseOpen() ISTIMEWA.
// "Enforce bila dikonfigurasi": kalau tak ada baris fase aktif utk tipe itu → OPEN
// (tidak memblokir). Kalau ada → cek now dalam [tanggal_buka, tanggal_tutup].

import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type FaseTipe = 'pendaftaran' | 'verifikasi' | 'kualifikasi' | 'kompetisi'

export interface PhaseResult { open: boolean; reason?: string }

/**
 * Cek apakah fase `tipe` sedang terbuka. Tanpa konfigurasi = terbuka (tidak memblokir).
 * Bila ada beberapa baris aktif, terbuka bila SALAH SATU sedang berlaku.
 */
export async function isPhaseOpen(tipe: FaseTipe): Promise<PhaseResult> {
  const { data, error } = await sb()
    .from('fase_kompetisi')
    .select('nama,tanggal_buka,tanggal_tutup')
    .eq('tipe', tipe).eq('is_active', true)
  if (error || !data || data.length === 0) return { open: true }   // tak dikonfigurasi → jangan blokir

  const now = Date.now()
  for (const f of data) {
    const buka = f.tanggal_buka ? Date.parse(f.tanggal_buka) : -Infinity
    const tutup = f.tanggal_tutup ? Date.parse(f.tanggal_tutup) : Infinity
    if (now >= buka && now <= tutup) return { open: true }
  }
  // Ada fase dikonfigurasi tapi sekarang di luar semua jendela.
  const f = data[0]
  const fmt = (d: any) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  return { open: false, reason: `Fase ${tipe} tutup (jadwal: ${fmt(f.tanggal_buka)} s/d ${fmt(f.tanggal_tutup)})` }
}
