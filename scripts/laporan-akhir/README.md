# Laporan Akhir PORPROV XV — versi Kab. Bandung (Word)

Membuat ulang draf laporan dari data terbaru (hanya membaca database):

1. Data: `npx tsx scripts/data-laporan-akhir-kabbandung.ts <folder>/data.json`
2. Grafik: salin `grafik.py` ke `<folder>`, lalu di sana `python3 -m venv venv && ./venv/bin/pip install matplotlib && ./venv/bin/python grafik.py` → `grafik/*.png`
3. Word: salin `buat-docx.js` ke `<folder>`, lalu di sana `npm init -y && npm install docx@9.5.1 && node buat-docx.js Laporan.docx`

Pustaka `docx` (npm) dan `matplotlib` sengaja tidak dipasang di repo — pasang di folder kerja terpisah.
Draf pertama dibuat 21 Nov 2026 → `~/Downloads/Laporan_Akhir_PORPROV_XV_KabBandung_DRAF.docx`.
