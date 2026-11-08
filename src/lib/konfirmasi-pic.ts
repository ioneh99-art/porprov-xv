// src/lib/konfirmasi-pic.ts
// Medali sah di cabor seorang PIC yang dicatat pihak lain (Superadministrator lewat Jalur Cepat,
// situs KONI Jabar, Input Langsung KONIDA) dan belum dibuktikan PIC. PIC melihatnya di HP sebagai
// "Medali menunggu konfirmasi Anda" dan cukup menekan "Benar" — tidak perlu mengetik ulang.

import { PORPROV_MULAI } from './lapor'
import { bukanDariPic, menungguPic } from './jalur-cepat'
import type { dbLapor } from './lapor-sesi'

type Db = ReturnType<typeof dbLapor>

/** id kode jalur KONIDA (Input Langsung tanpa kode PIC) milik kontingen ini. */
export async function aksesKonida(db: Db, kontingenId: number): Promise<Set<number>> {
  const { data } = await db.from('lapor_akses').select('id').eq('kontingen_id', kontingenId).eq('jalur', 'konida')
  return new Set((data ?? []).map((r: any) => r.id as number))
}

export const KOLOM_KONFIRMASI = 'id,cabor_id,disiplin,nomor_id,nomor_teks,atlet_ids,hasil,peringkat,nilai_teks,tanggal,status,validasi,ref_luar,akses_id,foto_path,pelapor_nama,keterangan,lawan,jam,partai_id'

/** Medali sah cabor ini (sejak PORPROV mulai) yang masih menunggu bukti PIC. */
export async function medaliMenungguPic(db: Db, kontingenId: number, caborId: number, disiplin: string | null): Promise<any[]> {
  const [{ data }, konida] = await Promise.all([
    db.from('laporan_hasil').select(KOLOM_KONFIRMASI)
      .eq('kontingen_id', kontingenId).eq('cabor_id', caborId).eq('status', 'disahkan')
      .in('hasil', ['emas', 'perak', 'perunggu']).gte('tanggal', PORPROV_MULAI)
      .or('validasi.eq.menunggu_pic,validasi.is.null').order('tanggal', { ascending: false }).limit(200),
    aksesKonida(db, kontingenId),
  ])
  return (data ?? [])
    .map((l: any) => ({ ...l, bukan_pic: bukanDariPic(l, konida) }))
    .filter((l: any) => menungguPic(l))
    // Kode per disiplin: hanya medali disiplin itu (medali tanpa disiplin ikut, asal atletnya termasuk — dicek pemanggil).
    .filter((l: any) => !disiplin || !l.disiplin || l.disiplin === disiplin)
}

/** Siapa yang mencatat medali itu — untuk ditampilkan ke PIC. */
export function pencatatMedali(l: { ref_luar?: string | null; validasi?: string | null; pelapor_nama?: string | null }): string {
  if (l.ref_luar) return 'Situs KONI Jabar'
  if (l.validasi === 'menunggu_pic') return 'KONI Kab. Bandung'
  return l.pelapor_nama?.replace(/^KONIDA · /, 'KONIDA · ') || 'KONI Kab. Bandung'
}
