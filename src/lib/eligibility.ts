// src/lib/eligibility.ts
// Gerbang eligibilitas atlet→nomor (meniru classification_events ISTIMEWA).
// Semua aturan "enforce bila diisi": kolom NULL = tanpa batas. Gender KERAS utk L/P.

export interface NomorRule {
  id: number
  gender: string | null                 // 'L' | 'P' | 'OPEN' | 'MIX'
  usia_min: number | null
  usia_maks: number | null
  max_peserta_kontingen: number | null
  max_nomor_per_atlet: number | null
  cabor_id: number | null
}
export interface AtletInfo {
  id: number
  gender: string | null                 // 'L' | 'P'
  tgl_lahir: string | null              // ISO date
  kontingen_id: number | null
}
export interface EligibilityContext {
  eventDate: string                                          // tanggal_mulai event (acuan umur)
  alreadyAssigned: (nomorId: number, atletId: number) => boolean
  countPerNomorKontingen: (nomorId: number, kontingenId: number) => number
  nomorCountForAtletCabor: (atletId: number, caborId: number) => number
}

/** Umur penuh (tahun) pada tanggal acuan. */
export function usiaPadaTanggal(tglLahir: string, ref: string): number {
  const b = new Date(tglLahir), r = new Date(ref)
  let age = r.getFullYear() - b.getFullYear()
  const m = r.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && r.getDate() < b.getDate())) age--
  return age
}

/** Return daftar alasan tolak (kosong = lolos). */
export function cekEligibilitas(atlet: AtletInfo, nomor: NomorRule, ctx: EligibilityContext): string[] {
  const errs: string[] = []

  // 1. Gender — KERAS: nomor L/P wajib cocok; OPEN/MIX bebas.
  if (nomor.gender === 'L' || nomor.gender === 'P') {
    if (atlet.gender && atlet.gender !== nomor.gender)
      errs.push(`gender atlet (${atlet.gender}) tidak cocok nomor ${nomor.gender === 'L' ? 'Putra' : 'Putri'}`)
  }

  // 2. Umur — relatif tanggal event; hanya bila batas diisi.
  if ((nomor.usia_min != null || nomor.usia_maks != null) && atlet.tgl_lahir) {
    const u = usiaPadaTanggal(atlet.tgl_lahir, ctx.eventDate)
    if (nomor.usia_min != null && u < nomor.usia_min) errs.push(`umur ${u} th di bawah minimal ${nomor.usia_min} th`)
    if (nomor.usia_maks != null && u > nomor.usia_maks) errs.push(`umur ${u} th di atas maksimal ${nomor.usia_maks} th`)
  }

  const barisBaru = !ctx.alreadyAssigned(nomor.id, atlet.id)

  // 3. Batas peserta per kontingen di nomor ini (hanya baris baru & bila diisi).
  if (nomor.max_peserta_kontingen != null && barisBaru && atlet.kontingen_id != null) {
    const c = ctx.countPerNomorKontingen(nomor.id, atlet.kontingen_id)
    if (c >= nomor.max_peserta_kontingen)
      errs.push(`slot nomor penuh utk kontingen (${c}/${nomor.max_peserta_kontingen})`)
  }

  // 4. Batas jumlah nomor per atlet dalam cabor (hanya baris baru & bila diisi).
  if (nomor.max_nomor_per_atlet != null && barisBaru && nomor.cabor_id != null) {
    const c = ctx.nomorCountForAtletCabor(atlet.id, nomor.cabor_id)
    if (c >= nomor.max_nomor_per_atlet)
      errs.push(`atlet sudah di ${c} nomor (maks ${nomor.max_nomor_per_atlet}) di cabor ini`)
  }

  return errs
}
