// src/lib/target-emas-koni.ts
// Target emas KONI Kab. Bandung (rasionalisasi) — 54 emas, per cabor, dari berkas
// "CAPAIAN MEDALI EMAS PORPROV XV Fix.xlsx" (Sheet4, kolom target KONI) yang
// dirapikan 19 Nov 2026. Bos memutuskan grafik War Room & Mode Layar memakai
// target ini, bukan proyeksi PPT 74 emas.
//
// Hanya untuk TAMPILAN grafik. Tabel proyeksi_medali (74 baris bertanggal) tetap
// dipakai Mesin Emas & Misi Emas — jangan ditimpa dengan daftar ini.
// Target ini tidak punya tanggal, jadi grafik menggambarnya sebagai garis datar.

export const TARGET_KONI_KONTINGEN = 4
export const SUMBER_TARGET_KONI = 'Target emas KONI Kab. Bandung (rasionalisasi) — berkas Capaian Medali Emas Porprov XV'

export const TARGET_EMAS_KONI: { cabor_id: number; cabor: string; emas: number }[] = [
  { cabor_id: 147, cabor: 'Dayung', emas: 8 },
  { cabor_id: 48, cabor: 'Wushu', emas: 5 },
  { cabor_id: 25, cabor: 'Gulat', emas: 5 },
  { cabor_id: 55, cabor: 'Angkat Besi', emas: 4 },
  { cabor_id: 152, cabor: 'Menembak', emas: 2 },
  { cabor_id: 64, cabor: 'Sambo', emas: 2 },
  { cabor_id: 69, cabor: 'Panjat Tebing', emas: 2 },
  { cabor_id: 26, cabor: 'Kickboxing', emas: 2 },
  { cabor_id: 54, cabor: 'Angkat Berat', emas: 2 },
  { cabor_id: 146, cabor: 'Hockey', emas: 2 },
  { cabor_id: 70, cabor: 'Pencak Silat', emas: 2 },
  { cabor_id: 187, cabor: 'Senam', emas: 2 },
  { cabor_id: 42, cabor: 'Layar', emas: 1 },
  { cabor_id: 32, cabor: 'Jujitsu', emas: 1 },
  { cabor_id: 204, cabor: 'Pacuan', emas: 1 },
  { cabor_id: 200, cabor: 'Gantole', emas: 1 },
  { cabor_id: 10, cabor: 'Atletik', emas: 1 },
  { cabor_id: 156, cabor: 'Drumband', emas: 1 },
  { cabor_id: 85, cabor: 'Floorball', emas: 1 },
  { cabor_id: 191, cabor: 'Dancesport', emas: 1 },
  { cabor_id: 84, cabor: 'Karate', emas: 1 },
  { cabor_id: 56, cabor: 'Binaraga', emas: 1 },
  { cabor_id: 158, cabor: 'Sepak Takraw', emas: 1 },
  { cabor_id: 62, cabor: 'Kurash', emas: 1 },
  { cabor_id: 68, cabor: 'Panahan', emas: 1 },
  { cabor_id: 37, cabor: 'Esport', emas: 1 },
  { cabor_id: 87, cabor: 'Gateball', emas: 1 },
  { cabor_id: 58, cabor: 'Petanque', emas: 1 },
]
