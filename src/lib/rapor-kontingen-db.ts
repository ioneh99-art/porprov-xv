// src/lib/rapor-kontingen-db.ts — muat bahan Rapor Kontingen dari gudang porprov15_* (server saja)
// + aturan akses fitur & saklar buka/kunci per kontingen (tabel fitur_kontingen, migrasi 081).

import { dbLapor } from './lapor-sesi'
import { hitungRapor, type Rapor } from './rapor-kontingen'

export const FITUR_RAPOR = 'rapor_kontingen'
/** Kontingen yang boleh diberi akses Rapor Kontingen lewat saklar (KONI Kab. Bandung). */
export const KONTINGEN_RAPOR_BERSAKLAR = 4

/** Akses penuh tanpa saklar: Superadministrator & akun KONI Jabar. */
export const adminPusat = (s: any) =>
  !!s && (['superadmin', 'koni_jabar'].includes(s.role) || ['superadmin', 'koni_jabar'].includes(s.level))
/** Akun KONIDA (bukan operator cabor/PIC) milik kontingen yang bersaklar. */
export const akunKonidaBersaklar = (s: any) => !!s && s.role === 'konida' && Number(s.kontingen_id) === KONTINGEN_RAPOR_BERSAKLAR
export const superadmin = (s: any) => !!s && (s.role === 'superadmin' || s.level === 'superadmin')

export interface StatusFitur { terbuka: boolean; diubah_oleh: string | null; diubah_at: string | null }

export async function statusFitur(kontingenId: number, fitur = FITUR_RAPOR): Promise<StatusFitur> {
  const { data } = await dbLapor().from('fitur_kontingen').select('terbuka, diubah_oleh, diubah_at')
    .eq('kontingen_id', kontingenId).eq('fitur', fitur).maybeSingle()
  return { terbuka: !!data?.terbuka, diubah_oleh: data?.diubah_oleh ?? null, diubah_at: data?.diubah_at ?? null }
}

/**
 * Boleh melihat Rapor Kontingen?
 * - Superadministrator & KONI Jabar: selalu.
 * - Akun KONIDA Kab. Bandung: hanya bila saklar fitur dibuka (operator cabor/PIC tidak).
 */
export async function bolehLihatRapor(s: any): Promise<{ boleh: boolean; alasan?: 'masuk' | 'terkunci' | 'bukan_kontingen' }> {
  if (!s) return { boleh: false, alasan: 'masuk' }
  if (adminPusat(s)) return { boleh: true }
  if (!akunKonidaBersaklar(s)) return { boleh: false, alasan: 'bukan_kontingen' }
  const st = await statusFitur(KONTINGEN_RAPOR_BERSAKLAR)
  return st.terbuka ? { boleh: true } : { boleh: false, alasan: 'terkunci' }
}

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

// Data gudang sudah final (setelah penutupan) — simpan hasil hitung sebentar di memori server.
let tembolok: { rapor: Rapor & { arsip: string | null }; sampai: number } | null = null
const UMUR_TEMBOLOK_MS = 10 * 60_000

export async function muatRapor(): Promise<Rapor & { arsip: string | null }> {
  if (tembolok && tembolok.sampai > Date.now()) return tembolok.rapor
  const db = dbLapor()
  const [kontingen, cabor, nomor, medali, atletKC, laga, sinkron] = await Promise.all([
    semua<any>((a, b) => db.from('porprov15_kontingen').select('situs_id, nama, slug, peringkat, emas, perak, perunggu, jumlah_atlet, jumlah_laga, jumlah_menang, kontingen_id').order('situs_id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_cabor').select('situs_id, nama, jumlah_nomor').order('situs_id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_nomor').select('situs_id, cabor_situs_id').order('situs_id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_medali').select('nomor_situs_id, medali, kontingen_situs_id').order('id').range(a, b)),
    semua<any>((a, b) => db.from('porprov15_atlet_kontingen_cabor').select('kontingen_situs_id, cabor_situs_id, jumlah').range(a, b)),
    db.from('porprov15_laga').select('ref', { count: 'exact', head: true }),
    db.from('porprov15_sinkron').select('arsip').order('id', { ascending: false }).limit(1).maybeSingle(),
  ])
  const rapor = hitungRapor({
    kontingen: kontingen.map(k => ({
      situsId: k.situs_id, nama: k.nama, slug: k.slug, peringkat: k.peringkat, emas: k.emas, perak: k.perak, perunggu: k.perunggu,
      jumlahAtlet: k.jumlah_atlet, jumlahLaga: k.jumlah_laga, jumlahMenang: k.jumlah_menang, kontingenId: k.kontingen_id,
    })),
    cabor: cabor.map(c => ({ situsId: c.situs_id, nama: c.nama, jumlahNomor: c.jumlah_nomor })),
    nomor: nomor.map(n => ({ situsId: n.situs_id, caborSitusId: n.cabor_situs_id })),
    medali: medali.map(m => ({ nomorSitusId: m.nomor_situs_id, medali: m.medali, kontingenSitusId: m.kontingen_situs_id })),
    atletKC: atletKC.map(a => ({ kontingenSitusId: a.kontingen_situs_id, caborSitusId: a.cabor_situs_id, jumlah: a.jumlah })),
    jumlahLaga: laga.count ?? 0,
  })
  const hasil = { ...rapor, arsip: (sinkron.data as any)?.arsip ?? null }
  tembolok = { rapor: hasil, sampai: Date.now() + UMUR_TEMBOLOK_MS }
  return hasil
}
