// src/lib/gateway/import.ts
// Pembaca berkas template + pencocokan baris ke atlet.
//
// Memakai pola rumah yang sama dengan Rekonsiliasi Peserta:
//   NIK (jangkar) → nama persis → nama mirip (WAJIB dikonfirmasi manusia) → tidak ketemu.
// Sistem tidak pernah menautkan nama mirip sendiri.

import * as XLSX from 'xlsx'
import { norm, type DbAtlet } from '@/lib/rekonsiliasi'
import { cocokkanNama, AMBANG_KONFIRMASI } from '@/lib/pencocokan'
import {
  TEMPLATES, LEMBAR_DATA, LEMBAR_PETUNJUK,
  hitungBmi, type JenisTemplate, type KolomTemplate,
} from './templates'

export { AMBANG_KONFIRMASI }

export type MetodeCocok = 'nik' | 'nama_persis' | 'nama_mirip' | 'nama_ambigu' | 'tidak_ketemu'

export interface BarisImpor {
  baris_ke: number                       // nomor baris di Excel (untuk pesan galat)
  nilai: Record<string, any>             // key kolom → nilai bersih
  nik: string | null
  nama: string
  atlet_id: number | null
  atlet_nama: string | null
  metode: MetodeCocok
  skor: number | null
  kandidat: { atlet_id: number; nama: string; skor: number } | null
  saingan: { atlet_id: number; nama: string; skor: number } | null   // terisi bila ambigu
  galat: string[]                        // pelanggaran aturan kolom
}

export interface HasilBaca {
  jenis: JenisTemplate
  versi_berkas: string | null
  versi_diharapkan: string
  versi_cocok: boolean
  baris: BarisImpor[]
  peringatan: string[]
  ringkasan: {
    total: number; nik: number; nama_persis: number
    nama_mirip: number; nama_ambigu: number; tidak_ketemu: number; bergalat: number
  }
}

// ── Pembersih nilai per tipe ────────────────────────────────────────────────
function keTanggal(v: any): string | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') {
    // serial tanggal Excel
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)          // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

function keAngka(v: any): number | null {
  if (v == null || v === '') return null
  // Buang satuan/huruf, TAPI jangan biarkan sisa kosong lolos: Number('') === 0,
  // sehingga "empat" akan tersimpan diam-diam sebagai 0.
  const bersih = String(v).replace(',', '.').replace(/[^\d.-]/g, '')
  if (!/\d/.test(bersih)) return null
  const n = Number(bersih)
  return Number.isFinite(n) ? n : null
}

function keTeks(v: any): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/** Cari baris judul: baris yang memuat header "NIK". */
function cariBarisJudul(raw: any[][]): number {
  for (let i = 0; i < Math.min(raw.length, 12); i++) {
    if (raw[i].some(c => norm(c) === 'NIK')) return i
  }
  return -1
}

/** Baca penanda versi dari lembar PETUNJUK (sel B2). Null bila lembar tak ada. */
function bacaVersi(wb: XLSX.WorkBook): string | null {
  const ws = wb.Sheets[LEMBAR_PETUNJUK]
  if (!ws) return null
  const sel = ws['B2']
  return sel ? String(sel.v ?? '').trim() || null : null
}

export function bacaBerkas(buffer: Buffer | ArrayBuffer, jenis: JenisTemplate): HasilBaca {
  const def = TEMPLATES[jenis]
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const peringatan: string[] = []

  const versiBerkas = bacaVersi(wb)
  const versiDiharapkan = `${def.jenis}:${def.versi}`
  const versiCocok = versiBerkas === versiDiharapkan
  if (versiBerkas == null) {
    peringatan.push('Lembar PETUNJUK tidak ditemukan — versi template tidak dapat diperiksa. Pastikan Anda memakai template terbaru.')
  } else if (!versiCocok) {
    peringatan.push(`Versi template pada berkas "${versiBerkas}" berbeda dari yang diharapkan "${versiDiharapkan}". Unduh template terbaru bila kolomnya sudah berubah.`)
  }

  const ws = wb.Sheets[LEMBAR_DATA] ?? wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error(`Lembar ${LEMBAR_DATA} tidak ditemukan di berkas.`)
  if (!wb.Sheets[LEMBAR_DATA]) peringatan.push(`Lembar bernama ${LEMBAR_DATA} tidak ada — memakai lembar pertama.`)

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as any[][]
  const hi = cariBarisJudul(raw)
  if (hi < 0) throw new Error('Baris judul tidak ditemukan. Pastikan ada kolom bernama NIK.')

  const judul = raw[hi].map(c => norm(c))
  const petaKolom = new Map<number, KolomTemplate>()
  for (const k of def.kolom) {
    const idx = judul.findIndex(h => h === norm(k.header))
    if (idx >= 0) petaKolom.set(idx, k)
  }
  const terpetakan = Array.from(petaKolom.values())
  const hilang = def.kolom.filter(k => k.wajib && terpetakan.indexOf(k) < 0)
  if (hilang.length) throw new Error(`Kolom wajib tidak ada di berkas: ${hilang.map(k => k.header).join(', ')}`)

  const baris: BarisImpor[] = []
  const nikTerlihat = new Map<string, number>()

  for (let r = hi + 1; r < raw.length; r++) {
    const row = raw[r]
    if (!row || row.every(c => String(c ?? '').trim() === '')) continue

    const nilai: Record<string, any> = {}
    const galat: string[] = []

    Array.from(petaKolom.entries()).forEach(([idx, kol]) => {
      const mentah = row[idx]
      let v: any
      if (kol.tipe === 'tanggal') {
        v = keTanggal(mentah)
        if (mentah !== '' && mentah != null && v == null) galat.push(`${kol.header}: format tanggal tidak dikenali ("${mentah}") — pakai YYYY-MM-DD`)
      } else if (kol.tipe === 'angka') {
        v = keAngka(mentah)
        if (mentah !== '' && mentah != null && v == null) galat.push(`${kol.header}: bukan angka ("${mentah}")`)
      } else {
        v = keTeks(mentah)
      }
      if (kol.wajib && (v == null || v === '')) galat.push(`${kol.header}: wajib diisi`)
      if (v != null && kol.pilihan && !kol.pilihan.some((p: string) => norm(p) === norm(v))) {
        galat.push(`${kol.header}: nilai "${v}" tidak dikenali. Pilihan: ${kol.pilihan.join(' / ')}`)
      }
      nilai[kol.key] = v
    })

    // baris contoh bawaan template → lewati diam-diam
    const nikMentah = nilai.nik == null ? '' : String(nilai.nik)
    if (nikMentah === '3204010101070001' && norm(nilai.nama_lengkap ?? '') === 'SUCI LESTARI') continue

    const nik = nikMentah.replace(/\D/g, '') || null
    if (nik && nik.length !== 16) galat.push(`NIK: harus 16 digit, terbaca ${nik.length} digit`)
    if (nik) {
      const sebelumnya = nikTerlihat.get(nik)
      if (sebelumnya) galat.push(`NIK ganda dalam berkas ini — sudah muncul di baris ${sebelumnya}`)
      else nikTerlihat.set(nik, r + 1)
    }

    // BMI otomatis untuk biomotorik
    if (jenis === 'biomotorik') {
      nilai.bmi = hitungBmi(nilai.berat_badan ?? null, nilai.tinggi_badan ?? null)
    }

    baris.push({
      baris_ke: r + 1,
      nilai,
      nik,
      nama: String(nilai.nama_lengkap ?? '').trim(),
      atlet_id: null, atlet_nama: null,
      metode: 'tidak_ketemu', skor: null, kandidat: null, saingan: null,
      galat,
    })
  }

  return {
    jenis, versi_berkas: versiBerkas, versi_diharapkan: versiDiharapkan, versi_cocok: versiCocok,
    baris, peringatan,
    ringkasan: { total: baris.length, nik: 0, nama_persis: 0, nama_mirip: 0, nama_ambigu: 0, tidak_ketemu: 0, bergalat: 0 },
  }
}

/** Cocokkan baris ke atlet. Bertingkat, dan tidak pernah menebak sendiri.
 *  Tingkat nama memakai mesin bersama di @/lib/pencocokan — sama dengan yang
 *  dipakai penarikan foto, supaya perilakunya seragam. */
export function cocokkan(hasil: HasilBaca, db: DbAtlet[]): HasilBaca {
  const olehNik = new Map(db.filter(a => a.no_ktp).map(a => [String(a.no_ktp), a]))
  const daftar = db.map(a => ({ id: a.id, nama_lengkap: a.nama_lengkap }))

  const r = { nik: 0, nama_persis: 0, nama_mirip: 0, nama_ambigu: 0, tidak_ketemu: 0, bergalat: 0 }

  for (const b of hasil.baris) {
    if (b.galat.length) r.bergalat++

    // 1. NIK — jangkar, satu-satunya yang dipercaya penuh
    if (b.nik && olehNik.has(b.nik)) {
      const a = olehNik.get(b.nik)!
      b.atlet_id = a.id; b.atlet_nama = a.nama_lengkap
      b.metode = 'nik'; b.skor = 1; r.nik++
      continue
    }

    // 2-4. tingkat nama
    const c = cocokkanNama(b.nama, daftar)
    b.skor = c.skor
    b.kandidat = c.kandidat ? { atlet_id: c.kandidat.id, nama: c.kandidat.nama, skor: c.kandidat.skor } : null
    b.saingan = c.saingan ? { atlet_id: c.saingan.id, nama: c.saingan.nama, skor: c.saingan.skor } : null

    if (c.metode === 'persis') {
      b.atlet_id = c.id; b.atlet_nama = c.nama
      b.metode = 'nama_persis'; r.nama_persis++
    } else if (c.metode === 'mirip') {
      b.metode = 'nama_mirip'; r.nama_mirip++
    } else if (c.metode === 'ambigu') {
      b.metode = 'nama_ambigu'; r.nama_ambigu++
    } else {
      b.metode = 'tidak_ketemu'; r.tidak_ketemu++
    }
  }

  hasil.ringkasan = { total: hasil.baris.length, ...r }
  return hasil
}
