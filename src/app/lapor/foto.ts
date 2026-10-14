// src/app/lapor/foto.ts
// Dipakai form hasil dan form catatan di HP PIC.

/**
 * Foto kamera HP bisa 5–10 MB. Dikecilkan di HP sebelum dikirim supaya tetap
 * terkirim di sinyal lemah — sisi terpanjang 1600 px sudah cukup untuk membaca lembar hasil.
 */
export async function kecilkanFoto(berkas: File): Promise<Blob> {
  const gambar = await createImageBitmap(berkas)
  const skala = Math.min(1, 1600 / Math.max(gambar.width, gambar.height))
  const kanvas = document.createElement('canvas')
  kanvas.width = Math.round(gambar.width * skala)
  kanvas.height = Math.round(gambar.height * skala)
  kanvas.getContext('2d')!.drawImage(gambar, 0, 0, kanvas.width, kanvas.height)
  gambar.close()
  return new Promise((ok, gagal) => kanvas.toBlob(b => b ? ok(b) : gagal(new Error('gagal')), 'image/jpeg', 0.82))
}
