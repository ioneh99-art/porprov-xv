// src/lib/saklar-menu.ts
// Saklar tampil/sembunyi menu. Halaman di baliknya tidak dihapus dan tetap
// bisa dibuka lewat alamatnya; yang diatur di sini hanya jalan masuknya.

/**
 * Menu "Premium Report" Kab. Bandung disembunyikan sementara (12 Okt 2026):
 * fiturnya diajukan belakangan, supaya cakupan pekerjaan saat ini lebih kecil.
 * Ubah ke true untuk menampilkannya lagi — menu dan tombol kembali ikut pulih.
 *
 * Selama tersembunyi, tiga halaman yang hanya bisa dicapai dari sana juga tidak
 * punya jalan masuk: Radar Prestasi, Pencarian Bakat, dan Laporan Bupati.
 */
export const PREMIUM_REPORT_KABBANDUNG_TAMPIL = false

/** Tujuan tombol kembali di Tes Biomotorik dan Heatmap Cabor Kab. Bandung. */
export const KEMBALI_DARI_PREMIUM_KABBANDUNG = PREMIUM_REPORT_KABBANDUNG_TAMPIL
  ? '/konida/Premiumreport/kabbandung'
  : '/konida/dashboard/kabbandung'
