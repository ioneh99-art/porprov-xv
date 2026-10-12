// src/lib/lapor-sesi.ts
// Sesi PIC lapangan — terpisah total dari sesi admin (porprov_session).
//
// Tanda tangannya memakai kunci yang sama dengan sesi admin, jadi isinya WAJIB
// diberi awalan sebelum ditandatangani. Tanpa awalan, cookie PIC yang sah bisa
// disalin menjadi porprov_session + porprov_sig dan lolos sebagai sesi admin.

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { signValue } from './session'

const AWALAN_SESI = 'lapor-sesi:'
const AWALAN_KODE = 'lapor-kode:'
export const COOKIE_SESI = 'lapor_sesi'
export const COOKIE_SIG = 'lapor_sig'
export const UMUR_SESI_DETIK = 60 * 60 * 24 * 21   // menutup seluruh masa PORPROV

export interface SesiLapor { akses_id: number; kontingen_id: number; cabor_id: number; exp: number }

export const dbLapor = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

/** Sidik kode lapor (kode baku 8 huruf, tanpa tanda hubung). Kodenya sendiri tidak pernah disimpan. */
export const sidikKode = (kodeBaku: string) => signValue(AWALAN_KODE + kodeBaku)

export async function tandaTanganiSesi(s: SesiLapor): Promise<{ nilai: string; sig: string }> {
  const nilai = JSON.stringify(s)
  return { nilai, sig: await signValue(AWALAN_SESI + nilai) }
}

function samaPersis(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let beda = 0
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return beda === 0
}

/**
 * Sesi PIC yang sah DAN kodenya masih aktif. Baris akses dibaca ulang tiap
 * permintaan supaya kode yang dimatikan KONIDA langsung tidak berlaku.
 */
export async function ambilSesiLapor(): Promise<(SesiLapor & { nama_pic: string; no_wa: string | null }) | null> {
  const c = cookies()
  const nilai = c.get(COOKIE_SESI)?.value
  const sig = c.get(COOKIE_SIG)?.value
  if (!nilai || !sig) return null
  try {
    if (!samaPersis(await signValue(AWALAN_SESI + nilai), sig)) return null
    const s = JSON.parse(nilai) as SesiLapor
    if (!s || typeof s.exp !== 'number' || s.exp < Date.now()) return null
    const { data } = await dbLapor().from('lapor_akses')
      .select('id,kontingen_id,cabor_id,nama_pic,no_wa,aktif').eq('id', s.akses_id).maybeSingle()
    if (!data || !data.aktif) return null
    // Kontingen dan cabor diambil dari baris akses, bukan dari cookie.
    return { akses_id: data.id, kontingen_id: data.kontingen_id, cabor_id: data.cabor_id, exp: s.exp, nama_pic: data.nama_pic, no_wa: data.no_wa }
  } catch {
    return null
  }
}

/**
 * Cabor "keluarga": atlet Kab. Bandung terdaftar di cabor induk (mis. Dayung),
 * sedangkan nomor pertandingan menempel di anak-anaknya (Dayung - Canoe, ...).
 */
export async function keluargaCabor(caborId: number): Promise<{ id: number; nama: string }[]> {
  const db = dbLapor()
  const { data: induk } = await db.from('cabang_olahraga').select('id,nama').eq('id', caborId).maybeSingle()
  if (!induk) return []
  const { data: anak } = await db.from('cabang_olahraga').select('id,nama').ilike('nama', `${induk.nama} %`)
  const semua = [induk, ...(anak ?? []).filter((a: any) => a.id !== induk.id)]
  return semua
}

/**
 * Supabase memotong tiap jawaban di 1.000 baris, berapa pun range yang diminta.
 * Kab. Bandung punya 1.142 atlet — tanpa ini hitungan diam-diam kurang dan
 * cabor di ekor daftar hilang. Kueri WAJIB punya urutan yang tetap.
 */
export async function ambilSemua<T = any>(
  halaman: (dari: number, sampai: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const UKURAN = 1000
  const semua: T[] = []
  for (let dari = 0; ; dari += UKURAN) {
    const { data, error } = await halaman(dari, dari + UKURAN - 1)
    if (error) throw new Error(error.message)
    semua.push(...(data ?? []))
    if (!data || data.length < UKURAN) return semua
  }
}
