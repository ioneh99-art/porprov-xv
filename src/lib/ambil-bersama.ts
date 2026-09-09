// src/lib/ambil-bersama.ts
// Satu permintaan untuk beberapa komponen yang meminta hal yang sama.
//
// Latar: di halaman Performance, PanelJadwal dan PapanKeberangkatan sama-sama
// memanggil /api/konida/jadwal; di dasbor, PapanKerjaData dan halamannya
// sama-sama memanggil /api/konida/pekerjaan-data. Tiap panggilan memuat
// seluruh 1.142 atlet di server — jadi satu kali buka halaman berarti empat
// kali baca tabel penuh, padahal cukup dua.
//
// Alih-alih membongkar susunan komponen, permintaan yang sedang berjalan
// dibagi pakai. Komponen kedua yang meminta alamat sama akan menunggu
// permintaan pertama, bukan membuka permintaan baru.

const berjalan = new Map<string, Promise<any>>()
const hasil    = new Map<string, { data: any; waktu: number }>()

/** Berapa lama jawaban dianggap masih segar. Cukup untuk menampung beberapa
 *  komponen yang berangkat bersamaan saat halaman dibuka, tapi tidak sampai
 *  membuat data terasa basi setelah operator menyimpan perubahan. */
const UMUR_SEGAR_MS = 15_000

export async function ambilBersama<T = any>(alamat: string): Promise<T> {
  const tersimpan = hasil.get(alamat)
  if (tersimpan && Date.now() - tersimpan.waktu < UMUR_SEGAR_MS) return tersimpan.data as T

  const sedang = berjalan.get(alamat)
  if (sedang) return sedang as Promise<T>

  const janji = fetch(alamat)
    .then(async r => {
      if (!r.ok) throw new Error(`Gagal memuat ${alamat}`)
      const d = await r.json()
      hasil.set(alamat, { data: d, waktu: Date.now() })
      return d
    })
    .finally(() => { berjalan.delete(alamat) })

  berjalan.set(alamat, janji)
  return janji as Promise<T>
}

/** Buang simpanan supaya permintaan berikutnya menarik data segar.
 *  Dipanggil sesudah menyimpan perubahan. */
export function lupakanBersama(alamat?: string) {
  if (alamat) { hasil.delete(alamat); berjalan.delete(alamat) }
  else { hasil.clear(); berjalan.clear() }
}
