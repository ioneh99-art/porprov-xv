// src/lib/head-to-head.ts
// Aturan murni Head-to-Head target emas: dari bagan situs panitia, File B (pesaing
// KONI), dan daftar peserta situs → lawan pasti, pesaing utama, calon lawan.

import type { BaganLuar } from './lawan-luar'
import { genderNomor, kontingenDisebut } from './lawan-luar'
import { namaCocok } from './warroom'

export const KONTINGEN_KITA_SITUS = 'Kab. Bandung'

export interface AtletLuarBaris { ref: number; slug: string; nama: string; kontingen: string; cabor_id: number | null; gender: 'L' | 'P' | null; foto: string | null }
export interface LawanPasti {
  laga: string | null; meta: string; status: string; kontingen: string; nama: string
  foto: string | null; skor_kita: string | null; skor_lawan: string | null; hasil: 'menang' | 'kalah' | null
}
export interface GrupKita { nama: string; posisi: number; jumlah: number; klasemen: { kontingen: string; main: number; poin: number }[] }
export interface CalonKontingen { kontingen: string; disebut: boolean; jumlah: number; atlet: { nama: string; foto: string | null; slug: string; disebut: boolean }[] }

const kita = (k: string | null | undefined) => (k ?? '').trim().toLowerCase() === KONTINGEN_KITA_SITUS.toLowerCase()

/** Laga yang melibatkan Kab. Bandung di bagan: kartu babak gugur/grup + matriks (tanpa kembar). */
export function lawanDariBagan(b: BaganLuar | null, fotoRef: Map<number, string | null>): LawanPasti[] {
  if (!b) return []
  const hasil: LawanPasti[] = []
  const lihat = new Set<string>()
  for (const k of b.kartu) {
    const iKita = k.sisi.findIndex(s => kita(s.kontingen) || (s.kontingen == null && kita(s.nama)))
    if (iKita < 0 || k.status === 'bye') continue
    const l = k.sisi.find((_, i) => i !== iKita)
    if (!l) continue
    if (k.laga) lihat.add(k.laga)
    hasil.push({
      laga: k.laga, meta: k.meta, status: k.status, kontingen: l.kontingen ?? l.nama, nama: l.nama,
      foto: l.atlet_ref != null ? fotoRef.get(l.atlet_ref) ?? null : null,
      skor_kita: k.sisi[iKita].skor, skor_lawan: l.skor, hasil: k.sisi[iKita].hasil,
    })
  }
  for (const m of b.matriks) {
    if (lihat.has(m.laga) || !(kita(m.baris) || kita(m.kolom))) continue
    lihat.add(m.laga)
    const lawan = kita(m.baris) ? m.kolom : m.baris
    const skor = m.status === 'selesai' ? m.teks.match(/^(\d+)\s*-\s*(\d+)$/) : null
    const [a, c] = skor ? (kita(m.baris) ? [skor[1], skor[2]] : [skor[2], skor[1]]) : [null, null]
    hasil.push({
      laga: m.laga, meta: m.status === 'jadwal' ? m.teks : '', status: m.status, kontingen: lawan, nama: lawan, foto: null,
      skor_kita: a, skor_lawan: c, hasil: a != null && c != null ? (Number(a) > Number(c) ? 'menang' : Number(a) < Number(c) ? 'kalah' : null) : null,
    })
  }
  return hasil
}

/** Posisi Kab. Bandung di klasemen grup (bila nomor memakai format grup). */
export function grupKita(b: BaganLuar | null): GrupKita | null {
  for (const g of b?.grup ?? []) {
    const i = g.klasemen.findIndex(r => kita(r.kontingen))
    if (i >= 0) return { nama: g.nama, posisi: i + 1, jumlah: g.klasemen.length, klasemen: g.klasemen.map(r => ({ kontingen: r.kontingen, main: r.main, poin: r.poin })) }
  }
  return null
}

/** Potongan nama orang di teks pesaing ("Karawang, Syaifahmi Riski (RIAU, …)") yang cocok dengan atlet lawan. */
export function namaDisebut(teksPesaing: string, nama: string): boolean {
  const potong = teksPesaing.split(/[,;()\n/]|\s-\s|\s–\s/).map(x => x.trim()).filter(x => x.split(/\s+/).length >= 2 && x.length <= 60)
  return potong.some(p => namaCocok(p, nama))
}

/**
 * Calon lawan: atlet kontingen lain di cabor & putra/putri yang sama, dikelompokkan
 * per kontingen. Kontingen/nama yang disebut File B diletakkan paling atas.
 */
export function calonLawan(nomor: string | null, caborId: number | null, kolam: AtletLuarBaris[], teksPesaing: string, kontingenSemua: string[], maksAtlet = 12): CalonKontingen[] {
  if (caborId == null) return []
  const g = genderNomor(nomor)
  const disebutK = new Set(kontingenDisebut(teksPesaing, kontingenSemua))
  const per = new Map<string, CalonKontingen>()
  for (const a of kolam) {
    if (a.cabor_id !== caborId || kita(a.kontingen)) continue
    if (g && a.gender && a.gender !== g) continue
    const c = per.get(a.kontingen) ?? { kontingen: a.kontingen, disebut: disebutK.has(a.kontingen), jumlah: 0, atlet: [] }
    c.jumlah++
    c.atlet.push({ nama: a.nama, foto: a.foto, slug: a.slug, disebut: !!teksPesaing && namaDisebut(teksPesaing, a.nama) })
    per.set(a.kontingen, c)
  }
  return Array.from(per.values())
    .map(c => {
      const urut = [...c.atlet].sort((x, y) => Number(y.disebut) - Number(x.disebut) || Number(!!y.foto) - Number(!!x.foto) || x.nama.localeCompare(y.nama, 'id'))
      return { ...c, disebut: c.disebut || urut.some(x => x.disebut), atlet: urut.slice(0, maksAtlet) }
    })
    .sort((a, b) => Number(b.disebut) - Number(a.disebut) || b.jumlah - a.jumlah || a.kontingen.localeCompare(b.kontingen, 'id'))
}
