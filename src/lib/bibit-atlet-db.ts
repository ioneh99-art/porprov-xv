// src/lib/bibit-atlet-db.ts — muat bahan Bibit Atlet dari gudang porprov15_* (server saja).
// Umur hanya untuk atlet Kab. Bandung (tautan porprov15_atlet.atlet_id → atlet.tgl_lahir);
// yang dikirim ke peramban hanya umur dalam tahun, tidak pernah tanggal lahir.

import { dbLapor } from './lapor-sesi'
import { hitungBibit, umurPada, type BibitAtlet } from './bibit-atlet'
import { KONTINGEN_RAPOR_BERSAKLAR } from './rapor-kontingen-db'

/** Umur dihitung pada hari penutupan PORPROV XV. */
export const TANGGAL_ACUAN_UMUR = '2026-11-20'

async function semua<T>(q: (dari: number, ke: number) => any): Promise<T[]> {
  const hasil: T[] = []
  for (let p = 0; ; p++) {
    const { data, error } = await q(p * 1000, p * 1000 + 999)
    if (error) throw error
    hasil.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return hasil
}

export interface DataBibit {
  atlet: BibitAtlet[]
  /** situs_id kontingen Kab. Bandung (untuk sorotan & saringan "hanya Kab. Bandung"). */
  kontingenKitaSitusId: number | null
  acuanUmur: string
}

let tembolok: { data: DataBibit; umur: Map<number, number | null>; sampai: number } | null = null
const UMUR_TEMBOLOK_MS = 10 * 60_000

async function hitungSemua() {
  const db = dbLapor()
  const { data: kon } = await db.from('porprov15_kontingen').select('situs_id').eq('kontingen_id', KONTINGEN_RAPOR_BERSAKLAR).maybeSingle()
  const kita = kon?.situs_id ?? null
  const [atlet, podium, laga, peserta] = await Promise.all([
    semua<any>((a, b) => db.from('porprov15_atlet').select('situs_id, nama, slug, kontingen_situs_id, kontingen, cabor, disiplin, gender, emas, perak, perunggu, jumlah_laga, atlet_id').order('situs_id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_medali').select('atlet_situs_ids, medali').order('id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_laga').select('ref, tanggal, jam, bentuk, selesai').eq('bentuk', 'duel').order('ref').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_laga_peserta').select('laga_ref, atlet_situs_ids, menang').not('menang', 'is', null).order('id').range(a, b)),
  ])
  const hasil = hitungBibit({
    atlet: atlet.map(a => ({
      situsId: a.situs_id, nama: a.nama, slug: a.slug, kontingenSitusId: a.kontingen_situs_id, kontingen: a.kontingen,
      cabor: a.cabor, disiplin: a.disiplin, gender: a.gender, emas: a.emas, perak: a.perak, perunggu: a.perunggu, jumlahLaga: a.jumlah_laga,
    })),
    podium: podium.map(p => ({ atletSitusIds: p.atlet_situs_ids ?? [], medali: p.medali })),
    laga: laga.map(l => ({ ref: l.ref, tanggal: l.tanggal, jam: l.jam, bentuk: l.bentuk, selesai: l.selesai })),
    peserta: peserta.map(p => ({ lagaRef: p.laga_ref, atletSitusIds: p.atlet_situs_ids ?? [], menang: p.menang })),
    selaluSertakan: a => a.kontingenSitusId === kita,
  })

  // Umur atlet Kab. Bandung
  const tautan = new Map<number, number>()
  atlet.filter(a => a.kontingen_situs_id === kita && a.atlet_id).forEach(a => tautan.set(a.atlet_id, a.situs_id))
  const umur = new Map<number, number | null>()
  const ids = Array.from(tautan.keys())
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await db.from('atlet').select('id, tgl_lahir').in('id', ids.slice(i, i + 500))
    if (error) throw error
    for (const r of data ?? []) umur.set(tautan.get(r.id)!, umurPada(r.tgl_lahir, TANGGAL_ACUAN_UMUR))
  }
  return { data: { atlet: hasil, kontingenKitaSitusId: kita, acuanUmur: TANGGAL_ACUAN_UMUR }, umur }
}

/** Bibit Atlet; umur Kab. Bandung disertakan hanya bila `denganUmur`. */
export async function muatBibit(denganUmur: boolean): Promise<DataBibit> {
  if (!tembolok || tembolok.sampai <= Date.now()) tembolok = { ...(await hitungSemua()), sampai: Date.now() + UMUR_TEMBOLOK_MS }
  const { data, umur } = tembolok
  if (!denganUmur) return data
  return { ...data, atlet: data.atlet.map(a => (a.kontingenSitusId === data.kontingenKitaSitusId ? { ...a, umur: umur.get(a.situsId) ?? null } : a)) }
}
