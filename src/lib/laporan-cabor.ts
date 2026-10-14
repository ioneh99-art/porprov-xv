// src/lib/laporan-cabor.ts
// Laporan per cabang olahraga untuk KONI Kab. Bandung. Kerangkanya mengikuti
// format Laporan Monitoring PORPROV XV (KONI Jabar), dipersempit ke kepentingan
// kontingen sendiri:
//   I    Informasi umum      — dari jadwal dan daftar resmi pendaftaran
//   II   Hasil pertandingan  — rekap dari laporan PIC yang sudah disahkan
//   III–V                    — catatan lapangan PIC (aturan/THB, teknis, non-teknis)
//   VI   Pengesahan          — PIC pelapor dan KONIDA pengesah
//   VII  Lampiran            — foto, jadwal, hasil per nomor, daftar atlet per nomor
// Bagian format asli yang tidak dipakai: peserta kab/kota lain dan nomor yang
// pesertanya sedikit (datanya milik penyelenggara), serta tanda tangan Tim Monev.
//
// Murni penyusun teks tanpa database (npm run uji:laporan-cabor). Semua isian
// dari pengguna lewat aman() — HTML ini dibuka di jendela yang membawa sesi KONIDA.

import { JENIS_CATATAN, JUDUL_BAGIAN, LABEL_STATUS_CATATAN, type JenisCatatan, type StatusCatatan } from './catatan'
import { rekapMedali, tulisHasil } from './lapor'
import { statusTarget, tanggalIndonesia, type BarisJadwal } from './matriks'

export interface NomorLaporan { disiplin: string; nomor: string; atlet: string[] }
export interface HasilLaporan {
  id: number; tanggal: string; jam: string | null; nomor_teks: string; atlet: string[]
  hasil: string; peringkat: number | null; nilai_teks: string | null; lawan: string | null
  target: string | null; pelapor_nama: string; diputus_oleh: string | null; ada_foto: boolean
}
export interface CatatanLaporan {
  id: number; jenis: JenisCatatan; mendesak: boolean; tanggal: string; jam: string | null
  nomor_teks: string | null; atlet: string[]; isi: string; status: StatusCatatan; tanggapan: string | null
  pelapor_nama: string; ditangani_oleh: string | null; ada_foto: boolean
}
export interface BahanLaporanCabor {
  kontingen: string
  cabor: string
  /** Hanya baris jadwal cabor ini (lihat jadwalUntukCabor). */
  jadwal: BarisJadwal[]
  /** Daftar resmi pendaftaran; kosong bila cabor ini belum punya. */
  nomor: NomorLaporan[]
  jumlah_atlet: number
  pic: string[]
  /** Hanya laporan yang sudah disahkan. */
  hasil: HasilLaporan[]
  /** Tanpa catatan yang diabaikan. */
  catatan: CatatanLaporan[]
  /** Tanggal laporan dibuat (YYYY-MM-DD). */
  dibuat: string
}

export interface OpsiLaporanCabor {
  untuk: 'cetak' | 'word'
  /** Alamat gambar foto bukti; hanya dipakai untuk 'cetak'. */
  alamatFoto?: (jenis: 'hasil' | 'catatan', id: number) => string
  /** Alamat logo di kepala laporan (mutlak); hanya dipakai untuk 'cetak'. */
  logo?: string
  /** Buka dialog cetak setelah semua gambar termuat; hanya untuk 'cetak'. */
  cetakOtomatis?: boolean
}

// ── Potongan kecil ───────────────────────────────────────────────────────────
export const aman = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
/** Seperti aman(), dan pergantian baris dipertahankan. */
const amanBaris = (s: unknown) => aman(s).replace(/\r?\n/g, '<br>')
/** Isi string CSS (untuk kaki halaman @page). */
const cssString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

/** Baris jadwal pertandingan yang milik cabor ini (nama cabor di jadwal dibandingkan tanpa beda huruf besar/tanda baca). */
export function jadwalUntukCabor(jadwal: BarisJadwal[], namaCabor: string[]): BarisJadwal[] {
  const nama = new Set(namaCabor.map(norm).filter(Boolean))
  return jadwal
    .filter(j => j.jenis === 'pertandingan' && nama.has(norm(j.cabor_nama_raw)))
    .sort((a, b) => (a.mulai ?? '9').localeCompare(b.mulai ?? '9') || a.cabor_disiplin.localeCompare(b.cabor_disiplin))
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** "2026-11-04" → "4 November 2026". */
export function tanggalPanjang(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  return m ? `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}` : (iso ?? '')
}

/** "4–9 November 2026", "30 Oktober – 8 November 2026", atau satu tanggal saja. */
export function rentangPanjang(mulai: string | null, selesai: string | null): string {
  if (!mulai) return '-'
  if (!selesai || selesai === mulai) return tanggalPanjang(mulai)
  const [ta, ba] = [mulai.slice(0, 4), mulai.slice(5, 7)]
  const [tb, bb] = [selesai.slice(0, 4), selesai.slice(5, 7)]
  if (ta === tb && ba === bb) return `${Number(mulai.slice(8))}–${tanggalPanjang(selesai)}`
  if (ta === tb) return `${Number(mulai.slice(8))} ${BULAN[Number(ba) - 1]} – ${tanggalPanjang(selesai)}`
  return `${tanggalPanjang(mulai)} – ${tanggalPanjang(selesai)}`
}

/** "Kab. Bandung" / "KAB. BANDUNG" → "KABUPATEN BANDUNG", seperti kepala berkas KONI. */
export const namaKontingenResmi = (k: string) =>
  k.trim().toUpperCase().replace(/^KAB\.\s*/, 'KABUPATEN ')

/** "KAB. BANDUNG" → "Kabupaten Bandung", untuk kalimat biasa. */
export const namaKontingenBiasa = (k: string) =>
  namaKontingenResmi(k).toLowerCase().replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase())

/** Rentang tanggal semua laporan dan catatan; null bila belum ada satu pun. */
export function periodeLaporan(b: Pick<BahanLaporanCabor, 'hasil' | 'catatan'>): { dari: string; sampai: string } | null {
  const t = [...b.hasil.map(h => h.tanggal), ...b.catatan.map(c => c.tanggal)].filter(Boolean).sort()
  return t.length ? { dari: t[0], sampai: t[t.length - 1] } : null
}

/** Urutan lampiran "hasil per nomor": nomor, lalu tanggal, lalu jam. */
export function urutHasil<T extends Pick<HasilLaporan, 'nomor_teks' | 'tanggal' | 'jam' | 'id'>>(hasil: T[]): T[] {
  return [...hasil].sort((a, b) =>
    a.nomor_teks.localeCompare(b.nomor_teks, 'id', { numeric: true })
    || a.tanggal.localeCompare(b.tanggal)
    || (a.jam ?? '99:99').localeCompare(b.jam ?? '99:99')
    || a.id - b.id)
}

/** Baris pengesahan: setiap PIC yang tercatat, lalu setiap pengesah dari KONIDA. */
export function penandatangan(b: Pick<BahanLaporanCabor, 'kontingen' | 'pic' | 'hasil' | 'catatan'>): { peran: string; nama: string }[] {
  const unik = (xs: (string | null | undefined)[]) => Array.from(new Set(xs.map(x => (x ?? '').trim()).filter(Boolean)))
  const pic = unik([...b.pic, ...b.hasil.map(h => h.pelapor_nama), ...b.catatan.map(c => c.pelapor_nama)])
  const konida = unik([...b.hasil.map(h => h.diputus_oleh), ...b.catatan.map(c => c.ditangani_oleh)])
  const peranKonida = `KONIDA ${namaKontingenBiasa(b.kontingen)} (pengesah)`
  return [
    ...(pic.length ? pic : ['']).map(nama => ({ peran: 'PIC Cabor (pelapor)', nama })),
    ...(konida.length ? konida : ['']).map(nama => ({ peran: peranKonida, nama })),
  ]
}

/** Label nomor: disiplin ikut ditulis bila cabornya punya lebih dari satu disiplin. */
function labelNomor(n: NomorLaporan, banyakDisiplin: boolean) {
  return banyakDisiplin ? `${n.disiplin} · ${n.nomor}` : n.nomor
}

const waktu = (tanggal: string, jam: string | null) => `${tanggalIndonesia(tanggal)}${jam ? ` ${jam}` : ''}`
const kosong = (teks: string) => `<p class="kosong">${aman(teks)}</p>`

// ── Penyusun HTML ────────────────────────────────────────────────────────────
export function htmlLaporanCabor(b: BahanLaporanCabor, o: OpsiLaporanCabor): string {
  const cetak = o.untuk === 'cetak'
  const kontingen = namaKontingenResmi(b.kontingen)
  const disiplin = Array.from(new Set(b.nomor.map(n => n.disiplin)))
  const banyakDisiplin = disiplin.length > 1
  const periode = periodeLaporan(b)
  const rekap = rekapMedali(b.hasil.map(h => ({ hasil: h.hasil, status: 'disahkan' })))
  const tuanRumah = Array.from(new Set(b.jadwal.map(j => j.tuan_rumah).filter(Boolean)))
  const satuKegiatan = b.jadwal.length === 1
  const perKegiatan = (isi: (j: BarisJadwal) => string) => b.jadwal.length === 0
    ? '<span class="kosong">Belum ada di jadwal</span>'
    : satuKegiatan ? aman(isi(b.jadwal[0])) : b.jadwal.map(j => `${aman(j.cabor_disiplin)}: ${aman(isi(j))}`).join('<br>')

  const s: string[] = []

  // Kepala: tabel tanpa garis, supaya sama rapinya di peramban dan di Word.
  s.push(`<table class="kepala"><tr>${cetak && o.logo ? `<td class="logo"><img src="${aman(o.logo)}" alt=""></td>` : ''}
    <td class="judul">LAPORAN MONITORING CABANG OLAHRAGA<br>KONTINGEN ${aman(kontingen)}<br>PORPROV XV JAWA BARAT TAHUN 2026</td></tr></table>`)

  // I. Informasi umum
  const baris = (label: string, isi: string, sub = false) => `<tr><td class="${sub ? 'sub' : ''}">${label}</td><td>${isi}</td></tr>`
  const daftarNomor = b.nomor.length
    ? `<ol class="rapat">${b.nomor.map(n => `<li>${aman(labelNomor(n, banyakDisiplin))}</li>`).join('')}</ol>`
    : '<span class="kosong">Belum ada daftar resmi pendaftaran untuk cabor ini</span>'
  s.push(`<h2>I. INFORMASI UMUM</h2><table class="info">
    ${baris('1. Cabang Olahraga', aman(b.cabor))}
    ${baris('2. Tuan Rumah', tuanRumah.length ? aman(tuanRumah.join(', ')) : '<span class="kosong">Belum ada di jadwal</span>')}
    ${baris('3. Waktu Penyelenggaraan', perKegiatan(j => rentangPanjang(j.mulai, j.selesai)))}
    ${baris('4. Tempat Pelaksanaan', perKegiatan(j => j.venue ?? '-'))}
    <tr><td colspan="2">5. Disiplin dan Nomor Pertandingan yang Diikuti:</td></tr>
    ${baris('a. Disiplin', disiplin.length ? aman(disiplin.join(', ')) : '<span class="kosong">-</span>', true)}
    ${baris('b. Nomor Pertandingan', daftarNomor, true)}
    <tr><td colspan="2">6. Atlet Kontingen:</td></tr>
    ${baris('a. Jumlah Atlet', `${b.jumlah_atlet} atlet`, true)}
    ${baris('b. Jumlah Nomor Diikuti', `${b.nomor.length} nomor`, true)}
    ${baris('7. PIC Cabor', b.pic.length ? aman(b.pic.join(', ')) : '<span class="kosong">Belum ada PIC</span>')}
    ${baris('8. Periode Laporan', periode ? aman(rentangPanjang(periode.dari, periode.sampai)) : '<span class="kosong">Belum ada laporan</span>')}
  </table>`)

  // II. Hasil pertandingan
  s.push('<h2>II. HASIL PERTANDINGAN</h2>')
  if (b.hasil.length === 0) {
    s.push(kosong('Belum ada hasil pertandingan yang disahkan.'))
  } else {
    s.push(`<p>Perolehan medali: <b>${rekap.emas} emas, ${rekap.perak} perak, ${rekap.perunggu} perunggu</b> (total ${rekap.total}) dari ${rekap.laga} nomor yang sudah selesai.</p>`)
    const medali = urutHasil(b.hasil.filter(h => h.hasil === 'emas' || h.hasil === 'perak' || h.hasil === 'perunggu'))
      .sort((x, y) => ['emas', 'perak', 'perunggu'].indexOf(x.hasil) - ['emas', 'perak', 'perunggu'].indexOf(y.hasil))
    if (medali.length) {
      s.push(`<table><thead><tr><th class="no">No</th><th>Nomor Pertandingan</th><th>Atlet</th><th>Medali</th></tr></thead><tbody>
        ${medali.map((h, i) => `<tr><td class="no">${i + 1}</td><td>${aman(h.nomor_teks)}</td><td>${aman(h.atlet.join(', '))}</td><td>${aman(tulisHasil(h))}</td></tr>`).join('')}
      </tbody></table>`)
    }
    const bertarget = b.hasil.filter(h => h.target)
    if (bertarget.length) {
      const st = bertarget.map(h => statusTarget(h.target, h.hasil))
      // ": tercapai" dengan titik dua — "belum tercapai" juga berakhiran "tercapai".
      const n = (akhiran: string) => st.filter(x => x.endsWith(akhiran)).length
      s.push(`<p>Capaian target: dari ${bertarget.length} nomor yang diikuti atlet bertarget, <b>${n(': tercapai')} tercapai</b>, ${n('belum tercapai')} belum tercapai, ${n('masih berjalan')} masih berjalan.</p>`)
    }
    s.push('<p class="catatan-kaki">Rincian setiap nomor ada di Lampiran 3. Hanya laporan yang sudah disahkan KONIDA yang dihitung.</p>')
  }

  // III–V. Catatan lapangan
  const ROMAWI = ['III', 'IV', 'V']
  JENIS_CATATAN.forEach((jenis, i) => {
    const daftar = b.catatan.filter(c => c.jenis === jenis).sort((x, y) => x.tanggal.localeCompare(y.tanggal) || (x.jam ?? '').localeCompare(y.jam ?? '') || x.id - y.id)
    s.push(`<h2>${ROMAWI[i]}. ${aman(JUDUL_BAGIAN[jenis])}</h2>`)
    if (daftar.length === 0) { s.push(kosong('Tidak ada catatan.')); return }
    s.push(`<table><thead><tr><th class="no">No</th><th class="waktu">Waktu</th><th>Uraian</th><th class="tindak">Tindak Lanjut</th></tr></thead><tbody>
      ${daftar.map((c, k) => {
        const terkait = [c.nomor_teks, c.atlet.length ? c.atlet.join(', ') : null].filter(Boolean).join(' — ')
        return `<tr><td class="no">${k + 1}</td>
          <td>${aman(waktu(c.tanggal, c.jam))}${c.mendesak ? '<br><b>MENDESAK</b>' : ''}</td>
          <td>${terkait ? `<i>${aman(terkait)}</i><br>` : ''}${amanBaris(c.isi)}<div class="oleh">Dilaporkan: ${aman(c.pelapor_nama)}</div></td>
          <td>${aman(LABEL_STATUS_CATATAN[c.status] ?? c.status)}${c.tanggapan ? `<br>${amanBaris(c.tanggapan)}` : ''}${c.ditangani_oleh ? `<div class="oleh">${aman(c.ditangani_oleh)}</div>` : ''}</td></tr>`
      }).join('')}
    </tbody></table>`)
  })

  // VI. Pengesahan
  s.push(`<h2>VI. PENGESAHAN</h2><table class="ttd"><thead><tr><th class="no">No</th><th>Peran</th><th>Nama</th><th class="kolom-ttd">TTD</th></tr></thead><tbody>
    ${penandatangan(b).map((p, i) => `<tr><td class="no">${i + 1}</td><td>${aman(p.peran)}</td><td>${p.nama ? aman(p.nama) : '&nbsp;'}</td><td>&nbsp;</td></tr>`).join('')}
  </tbody></table>`)

  // VII. Lampiran
  s.push('<h2>VII. LAMPIRAN</h2>')
  const foto = [
    ...urutHasil(b.hasil).filter(h => h.ada_foto).map(h => ({ jenis: 'hasil' as const, id: h.id, teks: `${tanggalIndonesia(h.tanggal)} · ${h.nomor_teks} · ${tulisHasil(h)}` })),
    ...b.catatan.filter(c => c.ada_foto).map(c => ({ jenis: 'catatan' as const, id: c.id, teks: `${tanggalIndonesia(c.tanggal)} · catatan: ${c.isi.slice(0, 60)}${c.isi.length > 60 ? '…' : ''}` })),
  ]
  s.push('<h3>1. Dokumentasi Kegiatan</h3>')
  if (foto.length === 0) s.push(kosong('Belum ada foto bukti.'))
  else if (cetak && o.alamatFoto) s.push(`<div>${foto.map(f => `<div class="foto"><img src="${aman(o.alamatFoto!(f.jenis, f.id))}" alt=""><div>${aman(f.teks)}</div></div>`).join('')}</div>`)
  else s.push(`<p>Terdapat ${foto.length} foto bukti di sistem. Foto tidak ikut dalam berkas Word; gunakan tombol Cetak di sistem untuk menyertakannya.</p>`)

  s.push('<h3>2. Jadwal Pertandingan</h3>')
  s.push(b.jadwal.length
    ? `<table><thead><tr><th>Kegiatan</th><th>Tanggal</th><th>Tuan Rumah</th><th>Venue</th></tr></thead><tbody>
        ${b.jadwal.map(j => `<tr><td>${aman(j.cabor_disiplin)}</td><td>${aman(rentangPanjang(j.mulai, j.selesai))}</td><td>${aman(j.tuan_rumah ?? '-')}</td><td>${aman(j.venue ?? '-')}</td></tr>`).join('')}
      </tbody></table>`
    : kosong('Cabor ini belum ada di jadwal.'))

  s.push('<h3>3. Hasil Pertandingan per Nomor</h3>')
  s.push(b.hasil.length
    ? `<table class="kecil"><thead><tr><th class="no">No</th><th>Waktu</th><th>Nomor</th><th>Atlet</th><th>Lawan</th><th>Hasil</th><th>Status Target</th></tr></thead><tbody>
        ${urutHasil(b.hasil).map((h, i) => `<tr><td class="no">${i + 1}</td><td>${aman(waktu(h.tanggal, h.jam))}</td><td>${aman(h.nomor_teks)}</td><td>${aman(h.atlet.join(', '))}</td><td>${aman(h.lawan ?? '')}</td><td>${aman([tulisHasil(h), h.nilai_teks].filter(Boolean).join(' · '))}</td><td>${aman(statusTarget(h.target, h.hasil))}</td></tr>`).join('')}
      </tbody></table>`
    : kosong('Belum ada hasil pertandingan yang disahkan.'))

  s.push('<h3>4. Daftar Atlet Kontingen per Nomor</h3>')
  s.push(b.nomor.length
    ? `<table class="kecil"><thead><tr><th class="no">No</th><th class="nomor">Nomor Pertandingan</th><th>Atlet</th></tr></thead><tbody>
        ${b.nomor.map((n, i) => `<tr><td class="no">${i + 1}</td><td>${aman(labelNomor(n, banyakDisiplin))}</td><td>${aman(n.atlet.join(', '))}</td></tr>`).join('')}
      </tbody></table><p class="catatan-kaki">Sumber: daftar resmi pendaftaran (klasifikasi_verified).</p>`
    : kosong('Belum ada daftar resmi pendaftaran untuk cabor ini.'))

  s.push(`<p class="catatan-kaki">Disusun dari sistem informasi kontingen pada ${aman(tanggalPanjang(b.dibuat))}.</p>`)

  // ── Bungkus ──
  const kaki = `Laporan Monitoring Cabor ${b.cabor} · Kontingen ${namaKontingenBiasa(b.kontingen)} · PORPROV XV Jawa Barat 2026`
  const gaya = `
    body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;color:#000}
    h2{font-size:12pt;margin:14pt 0 4pt}h3{font-size:12pt;font-weight:bold;margin:10pt 0 4pt}p{margin:0 0 6pt}
    table{width:100%;border-collapse:collapse;font-size:10.5pt;line-height:1.35;margin-bottom:6pt}
    td,th{border:1px solid #000;padding:3pt 6pt;vertical-align:top;text-align:left}
    th{background:#e5e7eb;font-weight:bold}
    table.kepala td{border:none;padding:0 0 6pt}table.kepala{border-bottom:3px double #000;margin-bottom:10pt}
    td.logo{width:70px}td.logo img{height:60px}
    td.judul{font-weight:bold;font-size:13pt;line-height:1.35;text-align:center}
    table.info td:first-child{width:38%}td.sub{padding-left:22pt}
    td.no,th.no{width:28pt;text-align:center}th.waktu{width:72pt}th.tindak{width:120pt}th.kolom-ttd{width:110pt}th.nomor{width:45%}
    table.ttd td{height:34pt}table.kecil{font-size:9.5pt}
    ol.rapat{margin:0;padding-left:20pt}
    .kosong{font-style:italic;color:#444}.oleh{font-size:9pt;color:#444;margin-top:2pt}.catatan-kaki{font-size:9pt;color:#444}`

  if (!cetak) {
    // Word membuka HTML ber-ekstensi .doc sebagai dokumen biasa yang bisa disunting.
    return `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${aman(kaki)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>@page WordSection1{size:21.0cm 29.7cm;margin:2.0cm 2.0cm 2.0cm 2.0cm}div.WordSection1{page:WordSection1}${gaya}</style></head>
<body><div class="WordSection1">${s.join('\n')}<p class="catatan-kaki">${aman(kaki)}</p></div></body></html>`
  }

  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${aman(kaki)}</title><style>
    @page{size:A4;margin:20mm 20mm 22mm;@bottom-left{content:${cssString(kaki)};font:8pt Arial,sans-serif;color:#555}@bottom-right{content:"Halaman " counter(page);font:8pt Arial,sans-serif;color:#555}}
    ${gaya}
    tr{page-break-inside:avoid}h2,h3{page-break-after:avoid}
    .foto{display:inline-block;width:48%;margin:0 1% 8pt;vertical-align:top;text-align:center;font-size:9pt;line-height:1.3;page-break-inside:avoid}
    .foto img{max-width:100%;max-height:70mm;border:1px solid #999}
  </style></head><body>${s.join('\n')}${o.cetakOtomatis ? '<script>window.onload=function(){window.print()}</script>' : ''}</body></html>`
}
