// src/lib/persaingan-db.ts — muat bahan Persaingan dari gudang porprov15_* (server saja).
import { dbLapor } from './lapor-sesi'
import { hitungPersaingan, type Persaingan } from './persaingan'

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

let tembolok: { data: Persaingan; sampai: number } | null = null
const UMUR_TEMBOLOK_MS = 10 * 60_000

export async function muatPersaingan(): Promise<Persaingan> {
  if (tembolok && tembolok.sampai > Date.now()) return tembolok.data
  const db = dbLapor()
  const [laga, peserta] = await Promise.all([
    semua<any>((a, b) => db.from('porprov15_laga').select('ref, cabor_situs_id, cabor, nomor, babak, tanggal, bentuk, selesai').eq('bentuk', 'duel').order('ref').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_laga_peserta').select('laga_ref, kontingen_situs_id, menang, skor, atlet_situs_ids, atlet_nama').not('menang', 'is', null).order('id').range(a, b)),
  ])
  const data = hitungPersaingan({
    laga: laga.map(l => ({ ref: l.ref, caborSitusId: l.cabor_situs_id, cabor: l.cabor, nomor: l.nomor, babak: l.babak, tanggal: l.tanggal, bentuk: l.bentuk, selesai: l.selesai })),
    peserta: peserta.map(p => ({ lagaRef: p.laga_ref, kontingenSitusId: p.kontingen_situs_id, menang: p.menang, skor: p.skor, atletSitusIds: p.atlet_situs_ids ?? [], atletNama: p.atlet_nama ?? [] })),
  })
  tembolok = { data, sampai: Date.now() + UMUR_TEMBOLOK_MS }
  return data
}
