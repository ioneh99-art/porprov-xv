// src/lib/bahan-porprov-db.ts — muat bahan jadwal/venue/nomor dari gudang porprov15_* (server saja).
import { dbLapor } from './lapor-sesi'
import { hitungBahan, type BahanPorprov } from './bahan-porprov'

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

let tembolok: { data: BahanPorprov; sampai: number } | null = null
const UMUR_TEMBOLOK_MS = 10 * 60_000

export async function muatBahan(): Promise<BahanPorprov> {
  if (tembolok && tembolok.sampai > Date.now()) return tembolok.data
  const db = dbLapor()
  const [laga, nomor, medali] = await Promise.all([
    semua<any>((a, b) => db.from('porprov15_laga').select('ref, tanggal, jam, cabor_situs_id, venue, klaster, status, perebutan_medali').order('ref').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_nomor').select('situs_id, nama, cabor_situs_id, disiplin, gender, jumlah_peserta').order('situs_id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_medali').select('nomor_situs_id, medali, kontingen_situs_id').order('id').range(a, b)),
  ])
  const data = hitungBahan({
    laga: laga.map(l => ({ ref: l.ref, tanggal: l.tanggal, jam: l.jam, caborSitusId: l.cabor_situs_id, venue: l.venue, klaster: l.klaster, status: l.status, perebutanMedali: !!l.perebutan_medali })),
    nomor: nomor.map(n => ({ situsId: n.situs_id, nama: n.nama, caborSitusId: n.cabor_situs_id, disiplin: n.disiplin, gender: n.gender, jumlahPeserta: n.jumlah_peserta })),
    medali: medali.map(m => ({ nomorSitusId: m.nomor_situs_id, medali: m.medali, kontingenSitusId: m.kontingen_situs_id })),
  })
  tembolok = { data, sampai: Date.now() + UMUR_TEMBOLOK_MS }
  return data
}
