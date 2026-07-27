// src/lib/rekonsiliasi.ts
// Parser File A (Rekapitulasi) + algoritma pencocokan peserta (BRIEF §2A, §7).
// Dipakai route server /api/rekonsiliasi/*. Read-only terhadap DB (route yg query).

import * as XLSX from 'xlsx'

export function norm(s: any): string {
  return String(s ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Fuzzy (Levenshtein ratio + token-sort) ──
function lev(a: string, b: string): number {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[m][n]
}
const ratio = (a: string, b: string) => { const M = Math.max(a.length, b.length); return M ? 1 - lev(a, b) / M : 1 }
const tokenSort = (s: string) => norm(s).split(' ').sort().join(' ')
export function simNama(a: string, b: string): number {
  return Math.max(ratio(a, b), ratio(tokenSort(a), tokenSort(b)))
}

// ── Deteksi header (jangan hard-code offset) ──
function sheetMatrix(ws: XLSX.WorkSheet): any[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
}
function findHeader(raw: any[][], mustHave: string[]): number {
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const cells = raw[i].map(norm)
    if (mustHave.every(w => cells.some(c => c.includes(w)))) return i
  }
  return -1
}

export interface ReviuRow { nama: string; cabang: string; nomor: string }
export interface PortalRow { nama: string; nik: string | null }

export interface ParsedFileA {
  reviu: ReviuRow[]
  portal: PortalRow[]
  totalReviu: number
  totalPortal: number
  nikTerekstrak: number
}

/** Parse File A (3 sheet). CATATAN sheet ATLET: nama ter-merge, ada di kolom SEBELUM "L/P". */
export function parseFileA(buffer: ArrayBuffer | Buffer): ParsedFileA {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = (pred: (n: string) => boolean) => wb.Sheets[wb.SheetNames.find(n => pred(norm(n)))!]

  // DATA PORTAL: NAMA (GENDER/ NIK/CABOR)
  const pWs = sheet(n => n.includes('PORTAL'))
  const pRaw = sheetMatrix(pWs)
  const pHi = findHeader(pRaw, ['NAMA'])
  const pHead = pHi >= 0 ? pRaw[pHi].map(norm) : []
  const cNamaP = (() => { const i = pHead.findIndex(h => h.includes('NAMA ATLET')); return i >= 0 ? i : pHead.findIndex(h => h.includes('NAMA')) })()
  const portal: PortalRow[] = []
  for (const r of pRaw.slice(pHi + 1)) {
    const cell = String(r[cNamaP] ?? '')
    const nama = norm(cell.split('(')[0])
    if (!nama || /^\d+$/.test(nama)) continue
    portal.push({ nama, nik: cell.match(/\d{16}/)?.[0] ?? null })
  }

  // ATLET: NO, CABANG, NAMA(merge), L/P, NOMOR PERTANDINGAN
  const aWs = sheet(n => n === 'ATLET')
  const aRaw = sheetMatrix(aWs)
  const aHi = findHeader(aRaw, ['NOMOR'])
  const aHead = aRaw[aHi].map(norm)
  const cLP = aHead.findIndex(h => h === 'L P' || h === 'LP' || /^L *\/? *P$/.test(h))
  const cNamaA = cLP > 0 ? cLP - 1 : aHead.findIndex(h => h.includes('NAMA'))
  const cCabang = aHead.findIndex(h => h.includes('CABANG'))
  const cNomor = aHead.findIndex(h => h.includes('NOMOR'))
  const reviu: ReviuRow[] = []
  let cabang = ''
  for (const r of aRaw.slice(aHi + 1)) {
    const cb = norm(r[cCabang])
    if (cb) cabang = cb
    const nama = norm(r[cNamaA])
    if (!nama || /^\d+$/.test(nama)) continue
    // Baris peserta valid WAJIB punya gender L/P — menyaring baris footer (mis. "PREDIKSI HASIL ANALISIS").
    if (cLP >= 0) { const g = norm(r[cLP]); if (g !== 'L' && g !== 'P') continue }
    reviu.push({ nama, cabang, nomor: String(r[cNomor] ?? '').trim() })
  }

  return {
    reviu, portal,
    totalReviu: reviu.length,
    totalPortal: portal.length,
    nikTerekstrak: new Set(portal.filter(p => p.nik).map(p => p.nik)).size,
  }
}

export interface DbAtlet { id: number; no_ktp: string | null; nama_lengkap: string }

export interface ReconRow {
  nama_file: string
  nik_file: string | null
  cabang_file: string
  nomor_file: string
  atlet_id: number | null
  atlet_nama: string | null
  match_method: 'nik' | 'nama_exact' | 'nama_fuzzy' | 'tidak_ketemu'
  match_score: number | null
  status_peserta: 'peserta_resmi' | 'perlu_konfirmasi' | 'tidak_ketemu'
  kandidat: { atlet_id: number; nama: string; score: number } | null
}

export interface ReconResult {
  summary: {
    total_reviu: number; total_portal: number; total_db: number
    nik: number; nama_exact: number; nama_fuzzy: number; tidak_ketemu: number; auto: number
  }
  selisih: { hilang: number; pasca_ekspor: number; kolam: number }
  rows: ReconRow[]
}

const FUZZY_KONFIRM = 0.55   // >= → perlu_konfirmasi (punya kandidat; di UI ditingkat A/B/C by skor)

/** Cocokkan 674 reviu → DB (§7). Read-only; hanya menghitung, tidak menulis. */
export function reconcile(parsed: ParsedFileA, db: DbAtlet[]): ReconResult {
  const portalByNama = new Map(parsed.portal.map(p => [p.nama, p]))
  const portalNIK = new Set(parsed.portal.filter(p => p.nik).map(p => p.nik!))
  const dbByNIK = new Map(db.filter(a => a.no_ktp).map(a => [String(a.no_ktp), a]))
  const dbByNama = new Map<string, DbAtlet>(); db.forEach(a => { const k = norm(a.nama_lengkap); if (!dbByNama.has(k)) dbByNama.set(k, a) })
  const dbNIK = new Set(db.filter(a => a.no_ktp).map(a => String(a.no_ktp)))

  const rows: ReconRow[] = []
  const s = { nik: 0, nama_exact: 0, nama_fuzzy: 0, tidak_ketemu: 0 }
  const reviuNIK = new Set<string>()

  for (const rv of parsed.reviu) {
    const p = portalByNama.get(rv.nama)
    const base = { nama_file: rv.nama, nik_file: p?.nik ?? null, cabang_file: rv.cabang, nomor_file: rv.nomor }
    if (p?.nik) reviuNIK.add(p.nik)

    // 1. NIK (jangkar)
    if (p?.nik && dbByNIK.has(p.nik)) {
      const a = dbByNIK.get(p.nik)!; s.nik++
      rows.push({ ...base, atlet_id: a.id, atlet_nama: a.nama_lengkap, match_method: 'nik', match_score: 1, status_peserta: 'peserta_resmi', kandidat: null })
      continue
    }
    // 2. nama exact ke DB
    const ex = dbByNama.get(rv.nama)
    if (ex) {
      s.nama_exact++
      rows.push({ ...base, atlet_id: ex.id, atlet_nama: ex.nama_lengkap, match_method: 'nama_exact', match_score: 1, status_peserta: 'peserta_resmi', kandidat: null })
      continue
    }
    // 3. fuzzy → kandidat terbaik
    let best: DbAtlet | null = null, bestScore = 0
    for (const a of db) { const sc = simNama(rv.nama, norm(a.nama_lengkap)); if (sc > bestScore) { bestScore = sc; best = a } }
    if (best && bestScore >= FUZZY_KONFIRM) {
      s.nama_fuzzy++
      rows.push({ ...base, atlet_id: null, atlet_nama: null, match_method: 'nama_fuzzy', match_score: Number(bestScore.toFixed(3)), status_peserta: 'perlu_konfirmasi', kandidat: { atlet_id: best.id, nama: best.nama_lengkap, score: Number(bestScore.toFixed(3)) } })
      continue
    }
    // 4. tidak ketemu (tetap lampirkan kandidat lemah utk "cari manual")
    s.tidak_ketemu++
    rows.push({ ...base, atlet_id: null, atlet_nama: null, match_method: 'tidak_ketemu', match_score: best ? Number(bestScore.toFixed(3)) : null, status_peserta: 'tidak_ketemu', kandidat: best ? { atlet_id: best.id, nama: best.nama_lengkap, score: Number(bestScore.toFixed(3)) } : null })
  }

  return {
    summary: {
      total_reviu: parsed.totalReviu, total_portal: parsed.totalPortal, total_db: db.length,
      nik: s.nik, nama_exact: s.nama_exact, nama_fuzzy: s.nama_fuzzy, tidak_ketemu: s.tidak_ketemu, auto: s.nik + s.nama_exact,
    },
    selisih: {
      hilang: Array.from(portalNIK).filter(n => !dbNIK.has(n)).length,
      pasca_ekspor: Array.from(dbNIK).filter(n => !portalNIK.has(n)).length,
      kolam: Array.from(dbNIK).filter(n => !reviuNIK.has(n)).length,
    },
    rows,
  }
}
