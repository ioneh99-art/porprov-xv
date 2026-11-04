// src/lib/grup-medali.ts
// Medali dari kelas sistem grup murni (setengah kompetisi / round robin): semua peserta
// saling bertemu dalam SATU grup dan juara ditentukan klasemen grup — tidak ada laga
// "Final" atau "Perebutan juara 3". Di situs KONI Jabar semua laganya berlabel
// "Penyisihan", sehingga pembaca laga biasa hanya melihat "menang"/"kalah"
// (kasus Gulat Grego 87 kg, 4 Nov 2026: Ikbar Gustiana juara grup = emas, tidak terbaca).
//
// Fungsi di sini murni (tanpa I/O) — dibaca dari halaman /bagan?nomor=<ref>.

import { SITUS_KONIJABAR, baku } from './konijabar'

export interface PesertaGrup { peringkat: number; nama: string; kontingen: string | null; poin: number | null }
export interface GrupMurni {
  /** Satu grup saja dan tidak ada babak gugur sesudahnya. */
  murni: boolean
  /** Semua laga grup sudah selesai. */
  selesai: boolean
  laga: { selesai: number; total: number } | null
  peserta: PesertaGrup[]
}
export interface MedaliGrup { hasil: 'emas' | 'perak' | 'perunggu'; peserta: PesertaGrup; jumlahPeserta: number }

const dekode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
const teks = (s: string) => dekode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

export const urlBaganGrup = (ref: number | string) => `${SITUS_KONIJABAR}/bagan?nomor=${ref}`
/** ref_luar laporan medali grup: "grup-<ref bagan>" (beda dengan ref laga yang berupa angka). */
export const refGrup = (bagan: number, peringkat: number) => `grup-${bagan}-${peringkat}`
export const baganDariRef = (ref: string) => { const m = ref.match(/^grup-(\d+)/); return m ? Number(m[1]) : null }

/** "Ikbar Gustiana (kab. Bandung)" → nama + kontingen; tanpa kurung (nomor beregu) → nama = kontingen. */
function pisahPeserta(s: string): { nama: string; kontingen: string | null } {
  const m = s.match(/^(.*?)\s*\(([^()]+)\)\s*$/)
  return m ? { nama: m[1].trim(), kontingen: m[2].trim() } : { nama: s.trim(), kontingen: null }
}

export function bacaGrupMurni(html: string): GrupMurni {
  const grup = Array.from(html.matchAll(/<section class="sg-group[\s\S]*?<\/section>/g)).map(m => m[0])
  const hitung = grup[0]?.match(/(\d+)\s*\/\s*(\d+)\s*laga selesai/)
  const laga = hitung ? { selesai: Number(hitung[1]), total: Number(hitung[2]) } : null

  // Kartu bagan: laga grup bermeta "A3 vs A4, …"; kotak penutup "Klasemen akhir …".
  // Kartu lain (P101, Semifinal, Final, …) berarti ada babak gugur sesudah grup.
  const meta = Array.from(html.matchAll(/class="bk-meta"[^>]*>([\s\S]*?)<\/span>/g), m => teks(m[1]))
  const adaGugur = meta.some(m => !/^[A-Z]\d+\s+vs\s+[A-Z]\d+\b/i.test(m) && !/^Klasemen akhir/i.test(m))

  const peserta: PesertaGrup[] = []
  const isi = grup[0] ?? ''
  const tabel = isi.match(/data-pane="klasemen"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1]
  if (tabel) {
    for (const r of Array.from(tabel.matchAll(/<tr>([\s\S]*?)<\/tr>/g))) {
      const sel = Array.from(r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g), x => teks(x[1]))
      if (sel.length < 3) continue
      const n = Number(sel[0]), poin = Number(sel[sel.length - 1])
      if (!Number.isFinite(n) || !sel[1]) continue
      peserta.push({ peringkat: n, ...pisahPeserta(sel[1]), poin: Number.isFinite(poin) ? poin : null })
    }
  } else {
    for (const li of Array.from(isi.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g))) {
      const rank = li[1].match(/class="sg-rank">\s*(\d+)/)?.[1]
      const nama = li[1].match(/class="sg-name">([\s\S]*?)<\/span>/)?.[1]
      if (!rank || !nama) continue
      const poin = li[1].match(/class="sg-pts">\s*(\d+)/)?.[1]
      peserta.push({ peringkat: Number(rank), ...pisahPeserta(teks(nama)), poin: poin != null ? Number(poin) : null })
    }
  }

  return {
    murni: grup.length === 1 && !adaGugur && peserta.length >= 2,
    selesai: !!laga && laga.total > 0 && laga.selesai === laga.total,
    laga, peserta,
  }
}

/**
 * Medali kontingen kita dari klasemen grup murni yang SUDAH selesai: peringkat 1 emas,
 * 2 perak, 3 perunggu. Kosong bila grup belum selesai, bukan grup murni, atau kita di luar 3 besar.
 * KONIDA tetap memeriksa (laporan masuk Antrean berstatus menunggu).
 */
export function medaliGrup(g: GrupMurni, namaKontingen: string): MedaliGrup[] {
  if (!g.murni || !g.selesai) return []
  const kita = baku(namaKontingen)
  const JENIS = ['emas', 'perak', 'perunggu'] as const
  return g.peserta
    .filter(p => baku(p.kontingen ?? p.nama) === kita && p.peringkat >= 1 && p.peringkat <= 3)
    .map(p => ({ hasil: JENIS[p.peringkat - 1], peserta: p, jumlahPeserta: g.peserta.length }))
}

/** Babak pool/grup/penyisihan — laga yang medalinya mungkin baru jelas dari klasemen grup. */
export const babakGrup = (babak: string | null | undefined) => /penyisihan|pool|grup|group|round ?robin|setengah kompetisi/i.test(babak ?? '')
