// src/lib/intel.ts
// Parser File B (Analisis Strategis) + cocok nama reuse atlet_id Fase 1 (BRIEF §2B, §7b).
// Kolom kotor CAPAIAN/TARGET → 2 field: target_medali (enum, toleransi typo) + capaian_catatan (mentah).

import * as XLSX from 'xlsx'
import { norm, simNama, type DbAtlet } from './rekonsiliasi'

function numN(v: any): number | null {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
// Deteksi medali dari teks kotor (toleransi typo EMASS/PEARAK).
export function medaliDari(t: any): 'emas' | 'perak' | 'perunggu' | null {
  const s = norm(t); if (!s) return null
  const w = s.split(' ')[0]
  if (/^EMAS/.test(w)) return 'emas'
  if (/^PE[A]?RAK/.test(w) || w === 'PEARAK') return 'perak'
  if (/^PERUN/.test(w)) return 'perunggu'
  return null
}

export interface IntelAtlet {
  nama: string; cabang: string
  target_medali: 'emas' | 'perak' | 'perunggu' | null
  capaian_catatan: string; pesaing: string; analisis: string
}
export interface IntelCabang { cabang: string; target_cabor_emas: number | null; target_koni_emas: number | null; probability: number | null }

export interface ParsedFileB {
  atlet: IntelAtlet[]
  cabang: IntelCabang[]
  totalAtlet: number
  totalCabang: number
  totalCaborEmas: number
  totalKoniEmas: number
}

/** Parse File B. Target cabor/koni HANYA di baris pertama grup (baca saat grup mulai, jangan carry-over). */
export function parseFileB(buffer: ArrayBuffer | Buffer): ParsedFileB {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
  let hi = -1
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const c = raw[i].map(norm)
    if (c.some(x => x.includes('NAMA')) && c.some(x => x.includes('PESAING') || x.includes('CAPAIAN'))) { hi = i; break }
  }
  const cabangMap = new Map<string, IntelCabang>()
  const atlet: IntelAtlet[] = []
  let cabang = ''
  for (const r of raw.slice(hi + 1)) {
    const cb = norm(r[1])
    if (cb) { cabang = cb; if (!cabangMap.has(cabang)) cabangMap.set(cabang, { cabang, target_cabor_emas: numN(r[10]), target_koni_emas: numN(r[11]), probability: numN(r[12]) }) }
    const nama = norm(r[4]); const g = norm(r[5])
    if (!nama || /^\d+$/.test(nama) || (g !== 'L' && g !== 'P')) continue   // saring footer
    atlet.push({
      nama, cabang,
      target_medali: medaliDari(r[7]),
      capaian_catatan: String(r[7] ?? '').trim(),   // MENTAH — jangan dibuang
      pesaing: String(r[8] ?? '').trim(),
      analisis: String(r[9] ?? '').trim(),
    })
  }
  const cabangArr = Array.from(cabangMap.values())
  return {
    atlet, cabang: cabangArr,
    totalAtlet: atlet.length, totalCabang: cabangArr.length,
    totalCaborEmas: cabangArr.reduce((a, b) => a + (b.target_cabor_emas || 0), 0),
    totalKoniEmas: cabangArr.reduce((a, b) => a + (b.target_koni_emas || 0), 0),
  }
}

export interface IntelRow extends IntelAtlet {
  atlet_id: number | null
  atlet_nama: string | null
  match_method: 'nama_exact' | 'nama_fuzzy' | 'manual' | 'tidak_ketemu' | 'nik'
  match_score: number | null
  kandidat: { atlet_id: number; nama: string; score: number } | null
}

/** Cocok nama File B → atlet_id. Reuse peta Fase 1 (nama_norm→atlet_id) dulu, lalu DB. §7b. */
export function matchIntel(parsed: ParsedFileB, fase1Map: Map<string, { atlet_id: number; nama: string }>, db: DbAtlet[]): { rows: IntelRow[]; summary: any } {
  const dbByNama = new Map<string, DbAtlet>(); db.forEach(a => { const k = norm(a.nama_lengkap); if (!dbByNama.has(k)) dbByNama.set(k, a) })
  const rows: IntelRow[] = []
  const s = { fase1: 0, exact: 0, fuzzy: 0, tidak: 0 }
  const FUZZY = 0.55
  for (const a of parsed.atlet) {
    // 1. reuse Fase 1 (nama exact ke hasil rekonsiliasi)
    const f1 = fase1Map.get(a.nama)
    if (f1) { s.fase1++; rows.push({ ...a, atlet_id: f1.atlet_id, atlet_nama: f1.nama, match_method: 'nama_exact', match_score: 1, kandidat: null }); continue }
    // 2. nama exact ke DB
    const ex = dbByNama.get(a.nama)
    if (ex) { s.exact++; rows.push({ ...a, atlet_id: ex.id, atlet_nama: ex.nama_lengkap, match_method: 'nama_exact', match_score: 1, kandidat: null }); continue }
    // 3. fuzzy
    let best: DbAtlet | null = null, bs = 0
    for (const d of db) { const sc = simNama(a.nama, norm(d.nama_lengkap)); if (sc > bs) { bs = sc; best = d } }
    if (best && bs >= FUZZY) { s.fuzzy++; rows.push({ ...a, atlet_id: null, atlet_nama: null, match_method: 'nama_fuzzy', match_score: Number(bs.toFixed(3)), kandidat: { atlet_id: best.id, nama: best.nama_lengkap, score: Number(bs.toFixed(3)) } }) }
    else { s.tidak++; rows.push({ ...a, atlet_id: null, atlet_nama: null, match_method: 'tidak_ketemu', match_score: best ? Number(bs.toFixed(3)) : null, kandidat: best ? { atlet_id: best.id, nama: best.nama_lengkap, score: Number(bs.toFixed(3)) } : null }) }
  }
  return {
    rows,
    summary: {
      total_atlet: parsed.totalAtlet, total_cabang: parsed.totalCabang,
      total_cabor_emas: parsed.totalCaborEmas, total_koni_emas: parsed.totalKoniEmas,
      reuse_fase1: s.fase1, nama_exact: s.exact, perlu_konfirmasi: s.fuzzy, tidak_ketemu: s.tidak,
      auto: s.fase1 + s.exact,
    },
  }
}
