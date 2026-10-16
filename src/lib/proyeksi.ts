// src/lib/proyeksi.ts
// Proyeksi medali KONI (proyeksi_medali) disandingkan dengan realisasi: laporan
// lapangan yang sudah DISAHKAN. Murni hitungan tanpa database (npm run uji:proyeksi).

import { rentangTanggal } from './matriks'

export interface TitikProyeksi {
  tanggal: string
  proyeksi: number
  realisasi: number
  kum_proyeksi: number
  /** null sesudah batas — garis realisasi berhenti di hari yang sudah berjalan. */
  kum_realisasi: number | null
}
export interface CaborProyeksi { cabor: string; proyeksi: number; realisasi: number; selisih: number }
export type StatusProyeksi = 'belum_mulai' | 'di_depan' | 'sesuai' | 'di_belakang'
export interface RingkasProyeksi {
  hari: TitikProyeksi[]
  per_cabor: CaborProyeksi[]
  total_proyeksi: number
  total_realisasi: number
  /** Hari terakhir yang dihitung untuk realisasi; null bila belum ada yang berjalan. */
  batas: string | null
  /** Proyeksi kumulatif sampai batas — pembanding yang adil untuk realisasi. */
  proyeksi_sd_batas: number
  status: StatusProyeksi
}

/**
 * Batas = hari terakhir yang punya realisasi, atau hari ini bila lebih akhir
 * (dipotong ke rentang grafik). Sebelum hari pertama dan tanpa realisasi apa pun,
 * belum ada yang bisa dibandingkan.
 */
export function susunProyeksi(
  proyeksi: { tanggal: string; cabor: string }[],
  realisasi: { tanggal: string; cabor: string }[],
  hariIni: string,
): RingkasProyeksi {
  const semuaTanggal = [...proyeksi, ...realisasi].map(x => x.tanggal).sort()
  const hari: TitikProyeksi[] = []
  let batas: string | null = null

  if (semuaTanggal.length) {
    const awal = semuaTanggal[0], akhir = semuaTanggal[semuaTanggal.length - 1]
    const terakhirReal = realisasi.map(r => r.tanggal).sort().pop() ?? null
    const kini = hariIni < awal ? null : hariIni > akhir ? akhir : hariIni
    batas = [terakhirReal, kini].filter((x): x is string => !!x).sort().pop() ?? null

    let kp = 0, kr = 0
    for (const t of rentangTanggal(awal, akhir)) {
      const p = proyeksi.filter(x => x.tanggal === t).length
      const r = realisasi.filter(x => x.tanggal === t).length
      kp += p; kr += r
      hari.push({ tanggal: t, proyeksi: p, realisasi: r, kum_proyeksi: kp, kum_realisasi: batas && t <= batas ? kr : null })
    }
  }

  const titikBatas = batas ? hari.find(h => h.tanggal === batas) : undefined
  const proyeksi_sd_batas = titikBatas?.kum_proyeksi ?? 0
  const realisasi_sd_batas = titikBatas?.kum_realisasi ?? 0
  const status: StatusProyeksi = !batas ? 'belum_mulai'
    : realisasi_sd_batas > proyeksi_sd_batas ? 'di_depan'
    : realisasi_sd_batas === proyeksi_sd_batas ? 'sesuai' : 'di_belakang'

  const peta = new Map<string, CaborProyeksi>()
  const ambil = (c: string) => peta.get(c) ?? (peta.set(c, { cabor: c, proyeksi: 0, realisasi: 0, selisih: 0 }), peta.get(c)!)
  for (const p of proyeksi) ambil(p.cabor).proyeksi++
  for (const r of realisasi) ambil(r.cabor).realisasi++
  const per_cabor = Array.from(peta.values())
    .map(c => ({ ...c, selisih: c.realisasi - c.proyeksi }))
    // Yang paling tertinggal di atas; lalu yang proyeksinya besar.
    .sort((a, b) => a.selisih - b.selisih || b.proyeksi - a.proyeksi || a.cabor.localeCompare(b.cabor))

  return { hari, per_cabor, total_proyeksi: proyeksi.length, total_realisasi: realisasi.length, batas, proyeksi_sd_batas, status }
}

/** "2026-11-03" → "3 Nov" untuk sumbu grafik. */
export function labelTanggal(iso: string): string {
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${Number(m[2])} ${BLN[Number(m[1]) - 1]}` : iso
}
