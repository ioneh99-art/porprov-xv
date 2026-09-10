// src/lib/atlet-pii-klien.ts
// Melengkapi baris atlet dengan data pribadinya lewat rute bergerbang sesi.
//
// Sebelum ini, NIK dan nomor rekening ikut terbawa saat halaman bertanya
// langsung ke Supabase memakai kunci anon — kunci yang tertanam di halaman web
// dan bisa diambil siapa pun. Setelah hak bacanya dicabut, halaman mengambil
// kolom biasa seperti sebelumnya, lalu memanggil fungsi ini untuk menempelkan
// data pribadinya.
//
// Bentuk barisnya tidak berubah: sesudah dilengkapi, baris tetap punya
// no_ktp, no_rekening, dan nama_bank seperti dulu. Jadi kode tampilan di tiap
// halaman tidak perlu disentuh sama sekali.

interface PunyaId { id: number }

let simpanan: { data: Record<number, any>; waktu: number } | null = null
let berjalan: Promise<Record<number, any>> | null = null
const UMUR_SEGAR_MS = 15_000

async function ambilPeta(): Promise<Record<number, any>> {
  if (simpanan && Date.now() - simpanan.waktu < UMUR_SEGAR_MS) return simpanan.data
  if (berjalan) return berjalan

  berjalan = fetch('/api/konida/atlet-pii')
    .then(async r => {
      // Gagal memuat TIDAK boleh menjatuhkan halaman. Yang hilang cuma NIK-nya;
      // sisi lain halaman harus tetap bisa dipakai.
      if (!r.ok) return {}
      const d = await r.json()
      const peta = d?.pii ?? {}
      simpanan = { data: peta, waktu: Date.now() }
      return peta
    })
    .catch(() => ({}))
    .finally(() => { berjalan = null })

  return berjalan
}

/** Tempelkan no_ktp, no_rekening, dan nama_bank ke tiap baris. */
export async function lengkapiPii<T extends PunyaId>(baris: T[]): Promise<T[]> {
  if (!baris?.length) return baris
  const peta = await ambilPeta()
  return baris.map(b => {
    const p = peta[b.id]
    return p ? { ...b, no_ktp: p.no_ktp, no_rekening: p.no_rekening, nama_bank: p.nama_bank } : b
  })
}

/** Untuk satu atlet saja — halaman detail dan sunting. */
export async function lengkapiPiiSatu<T extends PunyaId>(baris: T | null): Promise<T | null> {
  if (!baris) return baris
  const [hasil] = await lengkapiPii([baris])
  return hasil ?? baris
}

/** Buang simpanan sesudah data diubah. */
export function lupakanPii() { simpanan = null }
