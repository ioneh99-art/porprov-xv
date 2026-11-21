// src/lib/rekonsiliasi-porprov.ts
// Rekonsiliasi akhir medali satu kontingen: podium resmi panitia (tabel porprov15_medali,
// dari arsip situs setelah penutupan) vs medali yang disahkan di aplikasi kita (laporan_hasil).
// Aturan "sama" mengikuti medaliTerlewat (medali-resmi.ts) yang dipakai selama pertandingan:
// jenis medali sama, cabor sama, lalu nama nomor sama ATAU ada atlet yang sama.
// Murni hitungan supaya bisa diuji: npm run uji:rekonsiliasi-porprov.

import { baku, nomorSama } from './konijabar'

export type JenisMedali = 'emas' | 'perak' | 'perunggu'
export interface MedaliResmi { id: number; nomorSitusId: number; cabor: string; caborId: number | null; nomor: string; jenis: JenisMedali; atlet: string[] }
export interface MedaliKita { id: number; caborId: number | null; nomor: string; jenis: JenisMedali; atlet: string[] }

export interface Pasangan { resmi: MedaliResmi; kita: MedaliKita; cocokNomor: boolean; atletBeda: { hanyaResmi: string[]; hanyaKita: string[] } }
export interface HasilRekonsiliasi {
  pasangan: Pasangan[]
  /** Medali resmi yang tidak ada pasangannya di data kita. */
  resmiSaja: MedaliResmi[]
  /** Medali kita (disahkan) yang tidak ada di podium resmi. */
  kitaSaja: MedaliKita[]
}

const namaSama = (a: string, b: string) => {
  const x = baku(a), y = baku(b)
  return x === y || (x.length >= 6 && y.length >= 6 && (x.startsWith(y) || y.startsWith(x)))
}

/** Pasangkan satu-satu. Urutan prioritas: nomor & atlet sama → nomor sama → atlet sama. */
export function rekonsiliasi(resmi: MedaliResmi[], kita: MedaliKita[]): HasilRekonsiliasi {
  const sisaKita = new Set(kita.map(k => k.id))
  const pasangan: Pasangan[] = []
  const resmiSaja: MedaliResmi[] = []
  const nilai = (r: MedaliResmi, k: MedaliKita) => {
    if (k.jenis !== r.jenis) return 0
    if (r.caborId != null && k.caborId != null && r.caborId !== k.caborId) return 0
    const nomor = nomorSama(r.nomor, k.nomor) || nomorSama(`${r.cabor} ${r.nomor}`, k.nomor)
    const atlet = r.atlet.some(a => k.atlet.some(b => namaSama(a, b)))
    return nomor && atlet ? 3 : nomor ? 2 : atlet ? 1 : 0
  }
  // Yang paling yakin dipasangkan dulu supaya tidak "mencuri" pasangan medali lain.
  const calon = resmi.flatMap(r => kita.map(k => ({ r, k, n: nilai(r, k) }))).filter(x => x.n > 0).sort((a, b) => b.n - a.n)
  const resmiTerpasang = new Set<number>()
  for (const { r, k, n } of calon) {
    if (resmiTerpasang.has(r.id) || !sisaKita.has(k.id)) continue
    resmiTerpasang.add(r.id); sisaKita.delete(k.id)
    pasangan.push({
      resmi: r, kita: k, cocokNomor: n >= 2,
      atletBeda: {
        hanyaResmi: r.atlet.filter(a => !k.atlet.some(b => namaSama(a, b))),
        hanyaKita: k.atlet.filter(b => !r.atlet.some(a => namaSama(a, b))),
      },
    })
  }
  for (const r of resmi) if (!resmiTerpasang.has(r.id)) resmiSaja.push(r)
  return { pasangan, resmiSaja, kitaSaja: kita.filter(k => sisaKita.has(k.id)) }
}
