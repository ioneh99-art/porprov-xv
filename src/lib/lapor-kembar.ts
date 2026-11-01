// src/lib/lapor-kembar.ts
// Laporan kembar: laga yang sama masuk dua kali ke antrean — sekali dibaca dari
// situs KONI Jabar, sekali dilaporkan PIC/KONIDA. Laporan PIC selalu diutamakan:
// saat disahkan, data situs kembarannya keluar dari antrean (status 'ditolak'
// dengan alasan "Kembar …", barisnya tetap tersimpan sebagai jejak).

import { lawanSama } from './konijabar'

export interface LaporKembar {
  id: number; cabor_id: number; tanggal: string; lawan: string | null; partai_id?: number | null
  hasil: string; peringkat?: number | null; status: string; ref_luar?: string | null; pelapor_nama?: string | null
}

export interface InfoKembar {
  /** Laporan pasangannya. */
  id: number
  /** Pasangannya dari situs ('situs') atau dari PIC/KONIDA ('pic'). */
  sumber: 'situs' | 'pic'
  status: string
  pelapor_nama: string | null
  /** Hasil kedua laporan sama — hanya kalau sama laporan situs boleh ditutup otomatis. */
  hasil_sama: boolean
}

export const ALASAN_KEMBAR = (idPic: number) => `Kembar — digantikan laporan PIC #${idPic}`

/** Laporan situs `s` dan laporan PIC `p` menceritakan laga yang sama? */
export function lagaSama(s: LaporKembar, p: LaporKembar): boolean {
  if (!s.ref_luar || p.ref_luar) return false
  if (s.cabor_id !== p.cabor_id || s.tanggal !== p.tanggal) return false
  // Keduanya bertaut ke jadwal → partainya harus sama persis.
  if (s.partai_id && p.partai_id) return s.partai_id === p.partai_id
  return lawanSama(s.lawan ?? '', p.lawan)
}

export const hasilSama = (a: LaporKembar, b: LaporKembar) =>
  a.hasil === b.hasil && (a.hasil !== 'peringkat' || (a.peringkat ?? null) === (b.peringkat ?? null))

/**
 * Pasangkan laporan situs dengan laporan PIC untuk laga yang sama. Laporan yang
 * ditolak tidak ikut. Pasangan hanya dibuat bila jelas satu-satu — kalau satu
 * laporan cocok dengan lebih dari satu kandidat, tidak dipasangkan (KONIDA yang memilah).
 */
export function pasangKembar(laporan: LaporKembar[]): Map<number, InfoKembar> {
  const hidup = laporan.filter(l => l.status !== 'ditolak')
  const situs = hidup.filter(l => !!l.ref_luar)
  const pic = hidup.filter(l => !l.ref_luar)
  const calonPic = new Map<number, LaporKembar[]>()
  const calonSitus = new Map<number, LaporKembar[]>()
  for (const s of situs) for (const p of pic) {
    if (!lagaSama(s, p)) continue
    calonPic.set(s.id, [...(calonPic.get(s.id) ?? []), p])
    calonSitus.set(p.id, [...(calonSitus.get(p.id) ?? []), s])
  }
  const hasil = new Map<number, InfoKembar>()
  for (const s of situs) {
    const c = calonPic.get(s.id)
    if (c?.length !== 1) continue
    const p = c[0]
    if (calonSitus.get(p.id)?.length !== 1) continue
    const sama = hasilSama(s, p)
    hasil.set(s.id, { id: p.id, sumber: 'pic', status: p.status, pelapor_nama: p.pelapor_nama ?? null, hasil_sama: sama })
    hasil.set(p.id, { id: s.id, sumber: 'situs', status: s.status, pelapor_nama: s.pelapor_nama ?? null, hasil_sama: sama })
  }
  return hasil
}

export type RencanaSahkan =
  | { galat: string }
  | { sahkan: number | null; tutup: number | null }

/**
 * Apa yang terjadi bila KONIDA menekan "Sahkan" pada laporan `l`:
 *  - laporan situs yang punya kembaran PIC → yang disahkan laporan PIC, data situs ditutup;
 *  - laporan PIC yang punya kembaran situs (hasil sama) → PIC disahkan, situs ditutup;
 *  - hasil berbeda pada laporan situs → ditolak, KONIDA memilih dulu mana yang benar.
 */
export function rencanaSahkan(l: LaporKembar, k: InfoKembar | undefined): RencanaSahkan {
  if (!k) return { sahkan: l.id, tutup: null }
  if (l.ref_luar) {
    if (!k.hasil_sama)
      return { galat: `Laga ini juga dilaporkan PIC (laporan #${k.id}) dengan hasil berbeda. Perbaiki salah satunya atau tolak yang keliru dulu.` }
    return { sahkan: k.status === 'menunggu' ? k.id : null, tutup: l.id }
  }
  // Data situs yang sudah terlanjur disahkan ikut ditutup supaya medali tidak terhitung dua kali.
  if (!k.hasil_sama && k.status === 'disahkan')
    return { galat: `Data situs KONI Jabar untuk laga ini (laporan #${k.id}) sudah disahkan dengan hasil berbeda. Kembalikan dulu laporan itu ke antrean, lalu pilih yang benar.` }
  return { sahkan: l.id, tutup: k.hasil_sama ? k.id : null }
}
