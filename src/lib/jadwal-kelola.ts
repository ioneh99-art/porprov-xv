// src/lib/jadwal-kelola.ts
// Siapa yang boleh mengubah jadwal_cabor, dan pemeriksaan isiannya.
//
// jadwal_cabor dipakai bersama (halaman publik Kab. Bandung, War Room, Mode
// Layar, jurnal matriks), jadi yang boleh mengubah hanya superadmin dan
// KONIDA Kab. Bandung. Akun KONI Jabar sengaja tidak termasuk.

import { getServerSession } from './guard'
import { tanggalSah } from './lapor'

export const KONTINGEN_JADWAL = 4

export interface PengelolaJadwal { sesi: any; nama: string }

export async function ambilPengelolaJadwal(): Promise<PengelolaJadwal | { status: number; error: string }> {
  const s = await getServerSession()
  if (!s) return { status: 401, error: 'Silakan login dulu.' }
  const nama = s.nama || s.username || 'admin'
  if (s.role === 'superadmin' || s.level === 'superadmin') return { sesi: s, nama }
  if (s.role === 'konida' && Number(s.kontingen_id) === KONTINGEN_JADWAL) return { sesi: s, nama }
  return { status: 403, error: 'Hanya admin KONIDA Kab. Bandung yang boleh mengubah jadwal.' }
}

export const KOLOM_JADWAL = 'id,jenis,wilayah,tuan_rumah,cabor_disiplin,cabor_nama_raw,mulai,selesai,venue,akomodasi,catatan,sumber,tampil_publik,updated_at'

const teks = (v: unknown, maks: number): string | null => {
  if (v == null) return null
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/g, ' ').trim().slice(0, maks)
  return t || null
}

/**
 * Isian jadwal dari formulir. `parsial` = hanya kolom yang dikirim yang
 * diperiksa dan diubah (mis. tombol tampil/sembunyikan). Tanggal selesai
 * kosong berarti satu hari.
 */
export function periksaIsiJadwal(body: any, parsial: boolean): { isi: Record<string, any> } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Isian tidak terbaca.' }
  const ada = (k: string) => !parsial || Object.prototype.hasOwnProperty.call(body, k)
  const isi: Record<string, any> = {}

  if (ada('cabor_disiplin')) {
    const v = teks(body.cabor_disiplin, 120)
    if (!v) return { error: 'Nama kegiatan wajib diisi.' }
    isi.cabor_disiplin = v
  }
  if (ada('jenis')) {
    if (!['pertandingan', 'upacara'].includes(body.jenis ?? 'pertandingan')) return { error: 'Jenis harus pertandingan atau upacara.' }
    isi.jenis = body.jenis ?? 'pertandingan'
  }
  for (const [k, maks] of [['cabor_nama_raw', 80], ['wilayah', 40], ['tuan_rumah', 80], ['venue', 300], ['akomodasi', 120], ['catatan', 500]] as const) {
    if (ada(k)) isi[k] = teks(body[k], maks)
  }
  if (ada('mulai') || ada('selesai')) {
    const mulai = body.mulai || null, selesai = body.selesai || body.mulai || null
    if (!parsial || ada('mulai')) {
      if (!tanggalSah(mulai)) return { error: 'Tanggal mulai wajib diisi dengan benar.' }
    }
    if (mulai && !tanggalSah(mulai)) return { error: 'Tanggal mulai tidak dikenali.' }
    if (selesai && !tanggalSah(selesai)) return { error: 'Tanggal selesai tidak dikenali.' }
    if (mulai && selesai && selesai < mulai) return { error: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' }
    if (mulai && (mulai < '2026-06-01' || mulai > '2027-06-30')) return { error: 'Tanggal di luar masa PORPROV XV — periksa tahunnya.' }
    if (ada('mulai')) isi.mulai = mulai
    if (ada('selesai') || ada('mulai')) isi.selesai = selesai
  }
  if (ada('tampil_publik')) {
    if (typeof (body.tampil_publik ?? true) !== 'boolean') return { error: 'Pilihan tampil di publik tidak dikenali.' }
    isi.tampil_publik = body.tampil_publik ?? true
  }
  if (Object.keys(isi).length === 0) return { error: 'Tidak ada yang diubah.' }
  return { isi }
}
