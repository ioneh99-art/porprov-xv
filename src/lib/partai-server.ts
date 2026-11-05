// src/lib/partai-server.ts
// Bagian server jadwal partai yang dipakai rute PIC (/api/lapor/jadwal),
// rute KONIDA (/api/konida/jadwal-partai), dan impor matriks.

import { revalidatePath } from 'next/cache'
import { rapikan, tulisNomorResmi } from './pendaftaran'
import { atletCabor, dbLapor, pendaftaranCabor } from './lapor-sesi'
import type { IsiPartai } from './jadwal-partai'

export const KOLOM_PARTAI = 'id,kontingen_id,cabor_id,tanggal,jam,nomor_teks,disiplin,nomor_resmi,babak,atlet_ids,lawan,venue,status,keterangan,sumber,akses_id,dibuat_oleh,diubah_oleh,updated_at'

export const PESAN_SELESAI_TANPA_HASIL = 'Status "Selesai" baru bisa dipakai setelah hasil pertandingan ini dilaporkan. Laporkan hasilnya dulu — statusnya otomatis jadi Selesai.'

/**
 * "Selesai" hanya untuk partai yang hasilnya sudah dilaporkan (laporan yang tidak ditolak).
 * Status ini terisi otomatis saat hasil dikirim; memilihnya manual tanpa hasil membuat
 * partai hilang dari formulir lapor dan seolah-olah sudah dilaporkan. Null = boleh.
 */
export async function tolakSelesaiTanpaHasil(partaiId: number | null, statusBaru: unknown, statusLama: string | null): Promise<string | null> {
  if (statusBaru !== 'selesai' || statusLama === 'selesai') return null
  if (partaiId == null) return PESAN_SELESAI_TANPA_HASIL
  const { count } = await dbLapor().from('laporan_hasil').select('id', { count: 'exact', head: true }).eq('partai_id', partaiId).neq('status', 'ditolak')
  return count ? null : PESAN_SELESAI_TANPA_HASIL
}

/** Halaman publik langsung memuat perubahan; bila gagal, cukup menunggu cache satu menit. */
export function segarkanPublik() {
  try { revalidatePath('/publik/kabbandung') } catch { /* abaikan */ }
}

/**
 * Atlet dan nomor resmi kiriman peramban tidak dipercaya: atlet harus termasuk
 * cabor ini, dan nomor resmi harus ada di daftar pendaftaran cabornya — tulisan
 * nomornya disusun di server. Mengubah `isi` di tempat.
 */
export async function cocokkanPartai(kontingenId: number, caborId: number, mentah: any, isi: IsiPartai & { disiplin?: string | null; nomor_resmi?: string | null }, disiplinKode: string | null = null): Promise<string | null> {
  const perluAtlet = isi.atlet_ids && isi.atlet_ids.length > 0
  const perluNomor = mentah?.disiplin != null && mentah.disiplin !== ''
  if (!perluAtlet && !perluNomor) {
    if ('nomor_teks' in isi) { isi.disiplin = null; isi.nomor_resmi = null }
    return null
  }
  const daftar = await pendaftaranCabor(kontingenId, caborId, disiplinKode)
  if (perluAtlet) {
    const boleh = new Set((await atletCabor(kontingenId, caborId, daftar, !!disiplinKode)).map(a => a.id))
    if (isi.atlet_ids!.some(id => !boleh.has(id))) return 'Ada atlet yang bukan dari cabor ini.'
  }
  if (perluNomor) {
    const d = rapikan(mentah.disiplin), n = rapikan(mentah.nomor_resmi)
    if (!daftar.some(x => x.disiplin === d && x.nomor === n)) return 'Nomor itu tidak ada di daftar resmi cabor ini.'
    isi.disiplin = d; isi.nomor_resmi = n
    isi.nomor_teks = tulisNomorResmi(d, n, disiplinKode ? 2 : new Set(daftar.map(x => x.disiplin)).size)
  } else if ('nomor_teks' in isi) {
    isi.disiplin = null; isi.nomor_resmi = null
  }
  return null
}
