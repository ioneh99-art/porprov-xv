// src/lib/persaingan.ts — Persaingan PORPROV XV (hitungan murni): rekor menang–kalah
// antar kontingen dari laga tanding (duel), per cabor, dan duel atlet yang berulang.
// Laga dihitung bila selesai, dua sisi dari dua kontingen berbeda. Tanpa pemenang = seri.

export interface BahanLagaP { ref: number; caborSitusId: number | null; cabor: string | null; nomor: string | null; babak: string | null; tanggal: string | null; bentuk: string | null; selesai: boolean }
export interface BahanPesertaP { lagaRef: number; kontingenSitusId: number | null; menang: boolean | null; skor: number | null; atletSitusIds: number[]; atletNama: string[] }

export interface Rekor { menang: number; kalah: number; seri: number }
/** Rekor kontingen `a` melawan `b` di satu cabor (arah a → b; baris b → a juga ada). */
export interface BarisRekor extends Rekor { a: number; b: number; caborSitusId: number | null }

export interface AtletRingkas { situsId: number; nama: string; kontingenSitusId: number }
export interface PertemuanAtlet { ref: number; tanggal: string | null; cabor: string | null; nomor: string | null; babak: string | null; hasilA: 'menang' | 'kalah' | 'seri'; skorA: number | null; skorB: number | null }
export interface DuelBerulang { a: AtletRingkas; b: AtletRingkas; menangA: number; menangB: number; seri: number; laga: PertemuanAtlet[] }

export interface Persaingan { rekor: BarisRekor[]; duelBerulang: DuelBerulang[]; jumlahLaga: number; jumlahSeri: number }

export const MIN_PERTEMUAN_BERULANG = 2

const kosong = (): Rekor => ({ menang: 0, kalah: 0, seri: 0 })

export function hitungPersaingan(b: { laga: BahanLagaP[]; peserta: BahanPesertaP[] }): Persaingan {
  const laga = new Map(b.laga.filter(l => l.bentuk === 'duel' && l.selesai).map(l => [l.ref, l]))
  const sisi = new Map<number, BahanPesertaP[]>()
  for (const p of b.peserta) if (laga.has(p.lagaRef)) sisi.set(p.lagaRef, [...(sisi.get(p.lagaRef) ?? []), p])

  const rekor = new Map<string, BarisRekor>()
  const tambah = (a: number, bb: number, cabor: number | null, hasil: keyof Rekor) => {
    const k = `${a}|${bb}|${cabor}`
    const r = rekor.get(k) ?? { a, b: bb, caborSitusId: cabor, ...kosong() }
    r[hasil]++
    rekor.set(k, r)
  }
  const duel = new Map<string, DuelBerulang>()
  let jumlahLaga = 0, jumlahSeri = 0

  const urut = Array.from(sisi.entries()).sort((x, y) => {
    const lx = laga.get(x[0])!, ly = laga.get(y[0])!
    return (lx.tanggal ?? '').localeCompare(ly.tanggal ?? '') || x[0] - y[0]
  })
  for (const [ref, ps] of urut) {
    if (ps.length !== 2) continue
    const [p, q] = ps
    if (p.kontingenSitusId == null || q.kontingenSitusId == null || p.kontingenSitusId === q.kontingenSitusId) continue
    if (p.menang && q.menang) continue
    const l = laga.get(ref)!
    jumlahLaga++
    const hasilP: keyof Rekor = p.menang ? 'menang' : q.menang ? 'kalah' : 'seri'
    const hasilQ: keyof Rekor = hasilP === 'menang' ? 'kalah' : hasilP === 'kalah' ? 'menang' : 'seri'
    if (hasilP === 'seri') jumlahSeri++
    tambah(p.kontingenSitusId, q.kontingenSitusId, l.caborSitusId, hasilP)
    tambah(q.kontingenSitusId, p.kontingenSitusId, l.caborSitusId, hasilQ)

    // Duel atlet perorangan (satu atlet per sisi)
    if (p.atletSitusIds.length === 1 && q.atletSitusIds.length === 1) {
      const [x, y] = p.atletSitusIds[0] < q.atletSitusIds[0] ? [p, q] : [q, p]
      const k = `${x.atletSitusIds[0]}|${y.atletSitusIds[0]}`
      const d = duel.get(k) ?? {
        a: { situsId: x.atletSitusIds[0], nama: x.atletNama[0] ?? '', kontingenSitusId: x.kontingenSitusId! },
        b: { situsId: y.atletSitusIds[0], nama: y.atletNama[0] ?? '', kontingenSitusId: y.kontingenSitusId! },
        menangA: 0, menangB: 0, seri: 0, laga: [],
      }
      const hasilA = x.menang ? 'menang' : y.menang ? 'kalah' : 'seri'
      if (hasilA === 'menang') d.menangA++; else if (hasilA === 'kalah') d.menangB++; else d.seri++
      d.laga.push({ ref, tanggal: l.tanggal, cabor: l.cabor, nomor: l.nomor, babak: l.babak, hasilA, skorA: x.skor, skorB: y.skor })
      duel.set(k, d)
    }
  }

  return {
    rekor: Array.from(rekor.values()),
    duelBerulang: Array.from(duel.values()).filter(d => d.laga.length >= MIN_PERTEMUAN_BERULANG)
      .sort((x, y) => y.laga.length - x.laga.length || x.a.nama.localeCompare(y.a.nama)),
    jumlahLaga, jumlahSeri,
  }
}

/** Jumlahkan baris rekor (mis. semua cabor satu pasangan). */
export function jumlahRekor(baris: Rekor[]): Rekor {
  return baris.reduce((t, r) => ({ menang: t.menang + r.menang, kalah: t.kalah + r.kalah, seri: t.seri + r.seri }), kosong())
}

/** Persentase menang (seri dihitung setengah); null bila belum pernah bertemu. */
export function persenMenang(r: Rekor): number | null {
  const n = r.menang + r.kalah + r.seri
  return n ? (r.menang + r.seri / 2) / n : null
}
