// src/lib/sport-plugins/dayung/jabar-data.ts
// Pemuat data Dayung se-Jawa Barat (tabel dayung_jabar_*, diisi scripts/tarik-dayung-jabar.ts
// dari situs panitia PORPROV XV). Dipakai halaman PODSI Jabar di /operator/dayung.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export const SITUS_PANITIA = 'https://porprov.konijabar.or.id'

export interface JabarAtlet {
  situs_id: number; slug: string; nama: string; kontingen: string; kontingen_id: number | null
  gender: 'L' | 'P' | 'MIX' | null; disiplin: string | null; emas: number; perak: number; perunggu: number
  atlet_id: number | null
}
export interface JabarLaga {
  ref: number; tanggal: string | null; jam: string | null; disiplin: string | null; nomor: string
  gender: string | null; babak: string | null; kode: string | null; venue: string | null; status: string | null
  selesai: boolean; perebutan_medali: boolean
}
export interface JabarPeserta {
  laga_ref: number; urutan: number; kontingen: string; peringkat: number | null
  medali: 'emas' | 'perak' | 'perunggu' | null; waktu: string | null; waktu_detik: number | null
  atlet_situs_ids: number[]; atlet_nama: string[]
}
export interface JabarData { atlet: JabarAtlet[]; laga: JabarLaga[]; peserta: JabarPeserta[]; dibaca: string | null }

export async function muatJabar(): Promise<JabarData> {
  const [a, l, p, s] = await Promise.all([
    sb.from('dayung_jabar_atlet').select('situs_id,slug,nama,kontingen,kontingen_id,gender,disiplin,emas,perak,perunggu,atlet_id').order('nama').limit(2000),
    sb.from('dayung_jabar_laga').select('*').order('tanggal').order('jam').limit(2000),
    sb.from('dayung_jabar_peserta').select('laga_ref,urutan,kontingen,peringkat,medali,waktu,waktu_detik,atlet_situs_ids,atlet_nama').limit(5000),
    sb.from('dayung_jabar_sinkron').select('selesai').order('id', { ascending: false }).limit(1),
  ])
  return {
    atlet: (a.data ?? []) as JabarAtlet[],
    laga: (l.data ?? []) as JabarLaga[],
    peserta: ((p.data ?? []) as any[]).map(x => ({ ...x, waktu_detik: x.waktu_detik == null ? null : Number(x.waktu_detik) })),
    dibaca: (s.data?.[0] as any)?.selesai ?? null,
  }
}

/** "Dayung Canoeing" → "Canoeing", "Dayung Dbr" → "DBR". */
export function labelDisiplin(d: string | null | undefined): string {
  const t = (d ?? '').replace(/^dayung\s*/i, '').trim()
  if (!t) return 'Lainnya'
  return /^dbr$/i.test(t) ? 'DBR' : t.charAt(0).toUpperCase() + t.slice(1)
}

export const WARNA_DISIPLIN: Record<string, string> = { Canoeing: '#38bdf8', Rowing: '#a78bfa', DBR: '#f59e0b', Lainnya: '#64748b' }
export const WARNA_MEDALI = { emas: '#fbbf24', perak: '#cbd5e1', perunggu: '#d97706' } as const

/** Klasemen medali per kontingen: satu medali per perahu (bukan per awak). */
export function klasemenKontingen(peserta: JabarPeserta[]) {
  const peta = new Map<string, { kontingen: string; emas: number; perak: number; perunggu: number; total: number }>()
  for (const p of peserta) {
    if (!p.medali) continue
    const r = peta.get(p.kontingen) ?? { kontingen: p.kontingen, emas: 0, perak: 0, perunggu: 0, total: 0 }
    r[p.medali]++; r.total++
    peta.set(p.kontingen, r)
  }
  return Array.from(peta.values()).sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu || a.kontingen.localeCompare(b.kontingen))
}

export const tanggalPanjang = (t: string | null) =>
  t ? new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Tanggal belum ditentukan'

export const waktuDibaca = (t: string | null) =>
  t ? new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'belum pernah'

/* ---------- Mode demo ---------- */

export interface DemoWaktu { laga_ref: number; urutan: number; waktu_detik: number | null; status: 'ok' | 'DNS' | 'DNF' | 'DSQ'; diisi_oleh: string | null; updated_at: string }

export async function muatDemo(): Promise<DemoWaktu[]> {
  const { data } = await sb.from('dayung_demo_waktu').select('*').limit(5000)
  return ((data ?? []) as any[]).map(x => ({ ...x, waktu_detik: x.waktu_detik == null ? null : Number(x.waktu_detik) }))
}

/** Ketikan operator → detik. Terima "1:29.96", "1.29.96", "89.96", "1:29,96". */
export function bacaKetikan(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!t) return null
  const tiga = t.match(/^(\d{1,2})[:.](\d{1,2})[.:](\d{1,3})$/)
  if (tiga) return Math.round((Number(tiga[1]) * 60 + Number(tiga[2]) + Number(`0.${tiga[3]}`)) * 1000) / 1000
  const mnt = t.match(/^(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/)
  if (mnt) return Math.round((Number(mnt[1]) * 60 + Number(mnt[2])) * 1000) / 1000
  const det = t.match(/^\d+(\.\d+)?$/)
  return det ? Number(t) : null
}
