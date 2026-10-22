'use client'
// src/app/konida/lappertandingan/kabbandung/page.tsx
// Report Pertandingan: antrean pengesahan laporan PIC lapangan, catatan lapangan
// yang perlu ditindaklanjuti, jurnal harian dari laporan yang sudah disahkan,
// laporan monitoring per cabor, dan pengelolaan kode lapor PIC.
// Semua data lewat rute server — tidak ada yang disimpan di peramban.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, ClipboardList, Copy, Download, FileText, KeyRound, Pencil, Printer, RefreshCw, RotateCcw, Trophy, XCircle } from 'lucide-react'
import { LABEL_JENIS, LABEL_STATUS_CATATAN, tautanWA, urutCatatan, type JenisCatatan, type StatusCatatan } from '@/lib/catatan'
import { HASIL, LABEL_HASIL, PORPROV_HARI, PORPROV_MULAI, hariPorprov, rekapMedali, tulisHasil, type Hasil } from '@/lib/lapor'
import { htmlLaporanCabor, type BahanLaporanCabor } from '@/lib/laporan-cabor'
import { KEPALA_MATRIKS, lembarMatriks, type BarisMatriks } from '@/lib/matriks'
import { ALAMAT_RESMI_KABBANDUNG, DOMAIN_RESMI_KABBANDUNG } from '@/lib/alamat'

const ACCENT = '#38bdf8'
const KONTINGEN_ID = 4
const Q = `?kontingen_id=${KONTINGEN_ID}`   // hanya dipakai admin pusat; untuk KONIDA kontingen diambil dari sesi

interface Laporan {
  id: number; cabor: string; cabor_id: number; nomor_teks: string; atlet: string[]; hasil: Hasil; peringkat: number | null
  nilai_teks: string | null; keterangan: string | null; lawan: string | null; jam: string | null; tanggal: string; pelapor_nama: string; pelapor_wa: string | null
  status: 'menunggu' | 'disahkan' | 'ditolak'; diputus_oleh: string | null; alasan_tolak: string | null; created_at: string; ada_foto?: boolean
}
interface Akses { id: number; cabor: string; cabor_id: number; kode_ujung: string; nama_pic: string; no_wa: string | null; aktif: boolean; terakhir_dipakai: string | null; jumlah_laporan: number }
interface Cabor { id: number; nama: string; atlet: number }
interface Catatan {
  id: number; cabor: string; cabor_id: number; jenis: JenisCatatan; mendesak: boolean; tanggal: string; jam: string | null
  nomor_teks: string | null; atlet: string[]; isi: string; pelapor_nama: string; pelapor_wa: string | null
  status: StatusCatatan; tanggapan: string | null; ditangani_oleh: string | null; ditangani_at: string | null; created_at: string; ada_foto?: boolean
}

const WARNA: Record<Hasil, string> = { emas: '#ffd700', perak: '#c0c0c0', perunggu: '#cd7f32', peringkat: ACCENT, lolos: '#34d399', gugur: '#6b7280' }
const WARNA_JENIS: Record<JenisCatatan, string> = { aturan: '#fbbf24', teknis: '#38bdf8', nonteknis: '#a78bfa' }
const WARNA_STATUS: Record<StatusCatatan, string> = { baru: '#fbbf24', ditangani: '#38bdf8', selesai: '#34d399', diabaikan: '#64748b' }
type FilterCatatan = 'aktif' | 'selesai' | 'diabaikan' | 'semua'

const tglTampil = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const tglLaporTampil = (ts: string) => new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' })
const jamTampil = (ts: string) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const HARI_PORPROV = Array.from({ length: PORPROV_HARI }, (_, i) => new Date(Date.parse(PORPROV_MULAI + 'T00:00:00Z') + i * 86_400_000).toISOString().slice(0, 10))
const aman = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

const kotak = 'w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400'
const kartu = 'rounded-xl border border-slate-800 bg-slate-900/60'

export default function PageLapPertandingan() {
  const [tab, setTab] = useState<'antrean' | 'catatan' | 'jurnal' | 'cabor' | 'kode'>('antrean')
  const [laporan, setLaporan] = useState<Laporan[]>([])
  const [catatan, setCatatan] = useState<Catatan[]>([])
  const [filterCatatan, setFilterCatatan] = useState<FilterCatatan>('aktif')
  const [menanggapi, setMenanggapi] = useState<{ id: number; aksi: 'tangani' | 'selesai' | 'abaikan' } | null>(null)
  const [teksTanggapan, setTeksTanggapan] = useState('')
  const [sibukCabor, setSibukCabor] = useState<number | null>(null)
  const [akses, setAkses] = useState<Akses[]>([])
  const [cabor, setCabor] = useState<Cabor[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState<number | null>(null)
  const [tanggal, setTanggal] = useState<string | null>(null)

  const [menolak, setMenolak] = useState<number | null>(null)
  const [alasan, setAlasan] = useState('')
  const [memperbaiki, setMemperbaiki] = useState<number | null>(null)
  const [koreksi, setKoreksi] = useState({ nomor_teks: '', hasil: 'emas' as Hasil, peringkat: '', nilai_teks: '', tanggal: '', lawan: '', jam: '' })
  const [sibukMatriks, setSibukMatriks] = useState(false)

  const [formKode, setFormKode] = useState({ cabor_id: '', nama_pic: '', no_wa: '' })
  const [kodeBaru, setKodeBaru] = useState<{ kode: string; cabor: string; nama: string; wa: string } | null>(null)
  const [tersalin, setTersalin] = useState(false)
  const [mengubahPic, setMengubahPic] = useState<number | null>(null)
  const [formPic, setFormPic] = useState({ nama_pic: '', no_wa: '', cabor_id: '' })

  const muatLaporan = useCallback(async () => {
    const r = await fetch(`/api/konida/laporan-hasil${Q}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setGalat(j.error ?? 'Gagal memuat laporan.'); return }
    setGalat(''); setLaporan(j.laporan ?? [])
  }, [])
  const muatAkses = useCallback(async () => {
    const r = await fetch(`/api/konida/lapor-akses${Q}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (r.ok) { setAkses(j.akses ?? []); setCabor(j.cabor ?? []) }
  }, [])
  const muatCatatan = useCallback(async () => {
    const r = await fetch(`/api/konida/catatan-lapangan${Q}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (r.ok) setCatatan(j.catatan ?? [])
  }, [])

  useEffect(() => {
    Promise.all([muatLaporan(), muatAkses(), muatCatatan()]).finally(() => setMemuat(false))
    // Antrean dan catatan disegarkan sendiri supaya yang baru muncul tanpa menekan apa pun.
    const iv = setInterval(() => { if (document.visibilityState === 'visible') { muatLaporan(); muatCatatan() } }, 20_000)
    return () => clearInterval(iv)
  }, [muatLaporan, muatAkses, muatCatatan])

  const menunggu = useMemo(() => laporan.filter(l => l.status === 'menunggu'), [laporan])
  const ditolak = useMemo(() => laporan.filter(l => l.status === 'ditolak'), [laporan])
  const disahkan = useMemo(() => laporan.filter(l => l.status === 'disahkan'), [laporan])
  const rekapSemua = useMemo(() => rekapMedali(laporan), [laporan])
  const catatanBaru = useMemo(() => catatan.filter(c => c.status === 'baru'), [catatan])
  const mendesakBaru = useMemo(() => catatanBaru.filter(c => c.mendesak), [catatanBaru])
  const catatanTampil = useMemo(() => urutCatatan(catatan.filter(c =>
    filterCatatan === 'semua' ? true
      : filterCatatan === 'aktif' ? c.status === 'baru' || c.status === 'ditangani'
      : c.status === filterCatatan)), [catatan, filterCatatan])

  // Ringkasan per cabor untuk tab Laporan Cabor: yang sudah ada kegiatannya di atas.
  const ringkasCabor = useMemo(() => cabor.map(c => {
    const hasilC = disahkan.filter(l => l.cabor_id === c.id)
    const catatanC = catatan.filter(x => x.cabor_id === c.id && x.status !== 'diabaikan')
    return {
      ...c, rekap: rekapMedali(hasilC), hasil: hasilC.length, catatan: catatanC.length,
      catatanBaru: catatanC.filter(x => x.status === 'baru').length,
      pic: Array.from(new Set(akses.filter(a => a.cabor_id === c.id && a.aktif).map(a => a.nama_pic))),
    }
  }).sort((a, b) => (b.hasil + b.catatan) - (a.hasil + a.catatan) || a.nama.localeCompare(b.nama)), [cabor, disahkan, catatan, akses])

  // Pilihan tanggal: 14 hari PORPROV, ditambah tanggal lain yang ternyata punya laporan.
  const daftarTanggal = useMemo(() => {
    const luar = Array.from(new Set(disahkan.map(l => l.tanggal).filter(t => hariPorprov(t) == null))).sort()
    return [...luar, ...HARI_PORPROV]
  }, [disahkan])
  const tanggalAktif = tanggal ?? (disahkan[0]?.tanggal ?? HARI_PORPROV[0])
  const jurnal = useMemo(() => disahkan.filter(l => l.tanggal === tanggalAktif).sort((a, b) => a.created_at.localeCompare(b.created_at)), [disahkan, tanggalAktif])
  const rekapHari = useMemo(() => rekapMedali(jurnal), [jurnal])

  async function putuskan(id: number, body: Record<string, unknown>) {
    setSibuk(id); setGalat('')
    try {
      const r = await fetch(`/api/konida/laporan-hasil${Q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setGalat(j.error ?? 'Gagal menyimpan.'); return false }
      await muatLaporan(); return true
    } finally { setSibuk(null) }
  }

  async function tindakCatatan(id: number, aksi: 'tangani' | 'selesai' | 'abaikan' | 'buka', tanggapan = '') {
    setSibuk(id); setGalat('')
    try {
      const r = await fetch(`/api/konida/catatan-lapangan${Q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, aksi, tanggapan }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setGalat(j.error ?? 'Gagal menyimpan.'); return false }
      await muatCatatan(); return true
    } finally { setSibuk(null) }
  }

  // ── Laporan monitoring per cabor (kerangka format Monev, versi kontingen) ──
  async function laporanCabor(caborId: number, untuk: 'cetak' | 'word') {
    // Jendela cetak dibuka sebelum menunggu data, supaya tidak diblokir sebagai pop-up.
    const w = untuk === 'cetak' ? window.open('', '_blank') : null
    setSibukCabor(caborId); setGalat('')
    try {
      const r = await fetch(`/api/konida/laporan-cabor${Q}&cabor_id=${caborId}`, { cache: 'no-store' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { w?.close(); setGalat(j.error ?? 'Gagal menyusun laporan cabor.'); return }
      const bahan = j as BahanLaporanCabor
      const asal = window.location.origin
      if (untuk === 'cetak') {
        w?.document.write(htmlLaporanCabor(bahan, {
          // Lambang Kab. Bandung (latar transparen) — logo PORPROV berlatar gelap dan tampak sebagai kotak hitam di kertas.
          untuk: 'cetak', cetakOtomatis: true, logo: `${asal}/logos/kab-bandung.png`,
          alamatFoto: (jenis, id) => `${asal}/api/konida/${jenis === 'hasil' ? 'laporan-hasil' : 'catatan-lapangan'}/foto${Q}&id=${id}`,
        }))
        w?.document.close()
      } else {
        const tautan = document.createElement('a')
        tautan.href = URL.createObjectURL(new Blob([htmlLaporanCabor(bahan, { untuk: 'word' })], { type: 'application/msword' }))
        tautan.download = `Laporan_Monitoring_${bahan.cabor.replace(/[^A-Za-z0-9]+/g, '_')}_${bahan.dibuat}.doc`
        tautan.click()
        setTimeout(() => URL.revokeObjectURL(tautan.href), 10_000)
      }
    } catch { w?.close(); setGalat('Tidak ada sambungan.') } finally { setSibukCabor(null) }
  }

  async function buatKode() {
    setGalat('')
    const r = await fetch(`/api/konida/lapor-akses${Q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aksi: 'buat', ...formKode, cabor_id: Number(formKode.cabor_id) }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setGalat(j.error ?? 'Gagal membuat kode.'); return }
    setKodeBaru({ kode: j.kode, cabor: cabor.find(c => c.id === Number(formKode.cabor_id))?.nama ?? '', nama: formKode.nama_pic, wa: formKode.no_wa })
    setFormKode({ cabor_id: '', nama_pic: '', no_wa: '' }); setTersalin(false)
    await muatAkses()
  }
  async function ubahAkses(id: number, aksi: 'aktifkan' | 'matikan') {
    await fetch(`/api/konida/lapor-akses${Q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aksi, id }) })
    await muatAkses()
  }
  async function simpanPic(id: number) {
    setGalat('')
    const r = await fetch(`/api/konida/lapor-akses${Q}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aksi: 'ubah', id, ...formPic, cabor_id: Number(formPic.cabor_id) }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setGalat(j.error ?? 'Gagal menyimpan perubahan.'); return }
    setMengubahPic(null)
    await muatAkses()
  }

  const pesanWA = kodeBaru
    ? `Yth. ${kodeBaru.nama},\nBerikut akses lapor hasil pertandingan PORPROV XV untuk cabor ${kodeBaru.cabor}.\n\nTautan: ${ALAMAT_RESMI_KABBANDUNG}/lapor#${kodeBaru.kode}\nKode: ${kodeBaru.kode}\n\nIsi jadwal tanding (jam, lawan, lapangan) di tab "Jadwal" — langsung tampil di ${DOMAIN_RESMI_KABBANDUNG}. Laporkan setiap nomor segera setelah selesai. Kejadian penting (tidak sesuai aturan, masalah teknis, akomodasi/transportasi) laporkan di tab "Catatan Lapangan". Mohon kode ini tidak dibagikan ke orang lain.`
    : ''

  // ── Jurnal dalam format "Matrix Jadwal Harian" KONI ──
  async function ambilMatriks(semua: boolean): Promise<{ kontingen: string; dari: string; sampai: string; baris: BarisMatriks[] } | null> {
    setGalat(''); setSibukMatriks(true)
    try {
      const r = await fetch(`/api/konida/matriks-harian${Q}&${semua ? 'semua=1' : `dari=${tanggalAktif}&sampai=${tanggalAktif}`}`, { cache: 'no-store' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setGalat(j.error ?? 'Gagal menyusun matriks.'); return null }
      return j
    } catch { setGalat('Tidak ada sambungan.'); return null } finally { setSibukMatriks(false) }
  }

  async function cetakMatriks() {
    // Jendela dibuka sebelum menunggu data: jendela yang dibuka sesudah jeda dianggap pop-up dan diblokir peramban.
    const w = window.open('', '_blank')
    const m = await ambilMatriks(false)
    if (!m) { w?.close(); return }
    const sel = (b: BarisMatriks) => [b.no, tglTampil(b.tanggal), b.jam, b.klaster, b.wilayah_venue, b.kegiatan, b.nomor, b.atlet, b.lawan, b.hasil, b.venue, b.status_target, b.pic]
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Matrix Jadwal Harian ${aman(m.dari)}</title><style>
      @page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:9px;color:#111}
      h2{font-size:13px;margin:0;text-align:center}h3{font-size:11px;margin:2px 0 10px;text-align:center;font-weight:normal}
      table{width:100%;border-collapse:collapse}th{background:#075985;color:#fff;padding:4px 5px;text-align:left;font-size:8.5px;border:1px solid #075985}
      td{padding:4px 5px;border:1px solid #cbd5e1;vertical-align:top}tr.isi td{background:#f0f9ff}.k{color:#64748b;font-size:8px;margin-top:8px}
    </style></head><body><h2>MATRIX JADWAL HARIAN PORPROV XV 2026</h2>
    <h3>KONTINGEN ${aman(m.kontingen.toUpperCase().replace(/^KAB\.\s*/, 'KABUPATEN '))} · ${aman(tglTampil(m.dari))}</h3>
    <table><thead><tr>${KEPALA_MATRIKS.map(k => `<th>${aman(k)}</th>`).join('')}</tr></thead><tbody>
    ${m.baris.map(b => `<tr class="${b.nomor ? 'isi' : ''}">${sel(b).map(c => `<td>${aman(c)}</td>`).join('')}</tr>`).join('')}
    </tbody></table>
    <p class="k">Kolom Nomor, Nama Atlet, Lawan, Hasil, Status Target, dan PIC terisi dari laporan PIC cabor yang sudah disahkan. Baris kosong berarti kegiatan terjadwal hari itu tetapi belum ada hasil yang disahkan.</p>
    <script>window.print()</script></body></html>`
    w?.document.write(html); w?.document.close()
  }

  async function unduhMatriks(semua: boolean) {
    const m = await ambilMatriks(semua)
    if (!m) return
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet(lembarMatriks(m.baris, m.kontingen))
    ws['!cols'] = [5, 11, 7, 13, 15, 26, 34, 34, 22, 24, 34, 26, 18].map(wch => ({ wch }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Matrix Jadwal Harian')
    XLSX.writeFile(wb, `Matrix_Jadwal_Harian_${semua ? `${m.dari}_sd_${m.sampai}` : m.dari}.xlsx`)
  }

  function cetak() {
    const baris = jurnal.map((l, i) => `<tr><td>${i + 1}</td><td>${aman(jamTampil(l.created_at))}</td><td><b>${aman(l.cabor)}</b></td><td>${aman(l.nomor_teks)}</td><td>${aman(l.atlet.join(', '))}</td><td><b>${aman(tulisHasil(l))}</b></td><td>${aman(l.nilai_teks ?? '—')}</td><td>${aman(l.pelapor_nama)}</td></tr>`).join('')
    const hari = hariPorprov(tanggalAktif)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Jurnal ${aman(tanggalAktif)}</title><style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px}h2{font-size:15px;margin:0 0 2px}p{color:#555;font-size:10px;margin:0 0 14px}
      table{width:100%;border-collapse:collapse}th{background:#075985;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
      td{padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}.r{margin-top:14px;padding:10px;border:1px solid #bae6fd;background:#f0f9ff}
    </style></head><body><h2>Jurnal Hasil Pertandingan Harian</h2>
    <p>${hari ? `Hari ke-${hari} · ` : ''}${aman(tglTampil(tanggalAktif))} · Kontingen Kab. Bandung · PORPROV XV Jawa Barat 2026 · hanya laporan yang sudah disahkan</p>
    <table><thead><tr><th>#</th><th>Lapor</th><th>Cabor</th><th>Nomor</th><th>Atlet</th><th>Hasil</th><th>Catatan angka</th><th>Pelapor</th></tr></thead><tbody>${baris}</tbody></table>
    <div class="r"><b>Rekap hari ini:</b> ${rekapHari.emas} emas · ${rekapHari.perak} perak · ${rekapHari.perunggu} perunggu · total ${rekapHari.total} medali dari ${rekapHari.laga} nomor</div>
    <script>window.print()</script></body></html>`
    const w = window.open('', '_blank'); w?.document.write(html); w?.document.close()
  }

  // Fungsi biasa, bukan komponen: komponen yang dibuat di dalam komponen lain
  // dipasang ulang tiap ketikan, sehingga kotak isian kehilangan fokus.
  const kartuLaporan = (l: Laporan) => (
    <div key={l.id} className={`${kartu} p-4`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: ACCENT }}>{l.cabor}</div>
          <div className="text-base font-bold text-white mt-0.5">{l.nomor_teks}</div>
          <div className="text-sm text-slate-300 mt-1">{l.atlet.join(', ')}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black" style={{ color: WARNA[l.hasil] }}>{tulisHasil(l)}</div>
          {l.nilai_teks && <div className="text-sm font-mono text-slate-300">{l.nilai_teks}</div>}
        </div>
      </div>
      {(l.lawan || l.jam) && (
        <p className="text-sm text-slate-300 mt-2">
          {l.lawan && <>Lawan: <span className="text-white">{l.lawan}</span></>}{l.lawan && l.jam ? ' · ' : ''}{l.jam && <>Jam tanding {l.jam}</>}
        </p>
      )}
      {l.keterangan && <p className="text-sm text-slate-400 mt-2">{l.keterangan}</p>}
      {l.ada_foto && (
        <a href={`/api/konida/laporan-hasil/foto${Q}&id=${l.id}`} target="_blank" rel="noopener" className="mt-3 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/konida/laporan-hasil/foto${Q}&id=${l.id}`} alt={`Foto bukti ${l.nomor_teks}`} loading="lazy"
            className="h-28 w-auto rounded-lg border border-slate-700 object-cover" />
        </a>
      )}
      <div className="text-xs text-slate-500 mt-2">
        Pertandingan {tglTampil(l.tanggal)} · dilaporkan {l.pelapor_nama}{l.pelapor_wa ? ` (${l.pelapor_wa})` : ''} pada {tglLaporTampil(l.created_at)} pukul {jamTampil(l.created_at)}
        {l.status !== 'menunggu' && l.diputus_oleh ? ` · ${l.status} oleh ${l.diputus_oleh}` : ''}
      </div>
      {l.status === 'ditolak' && l.alasan_tolak && <p className="text-xs text-red-300 mt-1">Alasan ditolak: {l.alasan_tolak}</p>}

      {menolak === l.id && (
        <div className="mt-3 flex gap-2 flex-wrap">
          <input autoFocus value={alasan} onChange={e => setAlasan(e.target.value)} placeholder="Alasan penolakan (terlihat oleh PIC)" aria-label="Alasan penolakan" className={`${kotak} flex-1 min-w-[200px]`} />
          <button onClick={async () => { if (await putuskan(l.id, { aksi: 'tolak', alasan })) { setMenolak(null); setAlasan('') } }} disabled={sibuk === l.id || !alasan.trim()} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Tolak</button>
          <button onClick={() => { setMenolak(null); setAlasan('') }} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Batal</button>
        </div>
      )}

      {memperbaiki === l.id && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={koreksi.nomor_teks} onChange={e => setKoreksi({ ...koreksi, nomor_teks: e.target.value })} aria-label="Nomor pertandingan" className={`${kotak} md:col-span-2`} />
          <select value={koreksi.hasil} onChange={e => setKoreksi({ ...koreksi, hasil: e.target.value as Hasil })} aria-label="Hasil" className={kotak}>
            {HASIL.map(h => <option key={h} value={h}>{LABEL_HASIL[h]}</option>)}
          </select>
          {koreksi.hasil === 'peringkat'
            ? <input value={koreksi.peringkat} onChange={e => setKoreksi({ ...koreksi, peringkat: e.target.value.replace(/\D/g, '') })} placeholder="Peringkat ke-" aria-label="Peringkat" className={kotak} />
            : <input value={koreksi.nilai_teks} onChange={e => setKoreksi({ ...koreksi, nilai_teks: e.target.value })} placeholder="Catatan angka" aria-label="Catatan angka" className={kotak} />}
          <label className="md:col-span-2 flex items-center gap-2 text-xs text-slate-400">
            Tanggal pertandingan
            <input type="date" value={koreksi.tanggal} onChange={e => setKoreksi({ ...koreksi, tanggal: e.target.value })} className={`${kotak} flex-1`} />
          </label>
          <input value={koreksi.lawan} onChange={e => setKoreksi({ ...koreksi, lawan: e.target.value })} placeholder="Lawan" aria-label="Lawan" className={kotak} />
          <input type="time" value={koreksi.jam} onChange={e => setKoreksi({ ...koreksi, jam: e.target.value })} aria-label="Jam tanding" className={kotak} />
          <div className="md:col-span-4 flex gap-2">
            <button onClick={async () => { if (await putuskan(l.id, { aksi: 'perbaiki', ...koreksi, peringkat: Number(koreksi.peringkat) })) setMemperbaiki(null) }} disabled={sibuk === l.id} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">Simpan perbaikan</button>
            <button onClick={() => setMemperbaiki(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Batal</button>
          </div>
        </div>
      )}

      {menolak !== l.id && memperbaiki !== l.id && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {l.status === 'menunggu' ? (
            <>
              <button onClick={() => putuskan(l.id, { aksi: 'sahkan' })} disabled={sibuk === l.id} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"><CheckCircle size={15} /> Sahkan</button>
              <button onClick={() => { setMemperbaiki(l.id); setKoreksi({ nomor_teks: l.nomor_teks, hasil: l.hasil, peringkat: l.peringkat ? String(l.peringkat) : '', nilai_teks: l.nilai_teks ?? '', tanggal: l.tanggal, lawan: l.lawan ?? '', jam: l.jam ?? '' }) }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"><Pencil size={14} /> Perbaiki</button>
              <button onClick={() => { setMenolak(l.id); setAlasan('') }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300"><XCircle size={15} /> Tolak</button>
            </>
          ) : (
            <button onClick={() => putuskan(l.id, { aksi: 'kembalikan' })} disabled={sibuk === l.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"><RotateCcw size={13} /> Kembalikan ke antrean</button>
          )}
        </div>
      )}
    </div>
  )

  const kartuCatatan = (c: Catatan) => {
    const wa = tautanWA(c.pelapor_wa)
    const sedangMenanggapi = menanggapi?.id === c.id
    return (
      <div key={c.id} className={`${kartu} p-4`} style={c.mendesak && c.status === 'baru' ? { borderColor: 'rgba(248,113,113,0.6)', background: 'rgba(127,29,29,0.18)' } : {}}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded px-2 py-0.5 text-xs font-black" style={{ color: WARNA_JENIS[c.jenis], background: `${WARNA_JENIS[c.jenis]}1f`, border: `1px solid ${WARNA_JENIS[c.jenis]}55` }}>{LABEL_JENIS[c.jenis]}</span>
            {c.mendesak && <span className={`rounded px-2 py-0.5 text-xs font-black text-red-200 bg-red-500/25 border border-red-400/50 ${c.status === 'baru' ? 'animate-pulse' : ''}`}>MENDESAK</span>}
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: ACCENT }}>{c.cabor}</span>
          </div>
          <span className="text-xs font-bold" style={{ color: WARNA_STATUS[c.status] }}>{LABEL_STATUS_CATATAN[c.status]}</span>
        </div>
        {(c.nomor_teks || c.atlet.length > 0) && (
          <div className="text-sm text-slate-300 mt-2">{[c.nomor_teks, c.atlet.join(', ')].filter(Boolean).join(' — ')}</div>
        )}
        <p className="text-sm text-white mt-2 whitespace-pre-line">{c.isi}</p>
        {c.ada_foto && (
          <a href={`/api/konida/catatan-lapangan/foto${Q}&id=${c.id}`} target="_blank" rel="noopener" className="mt-3 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/konida/catatan-lapangan/foto${Q}&id=${c.id}`} alt="Foto catatan" loading="lazy" className="h-28 w-auto rounded-lg border border-slate-700 object-cover" />
          </a>
        )}
        <div className="text-xs text-slate-500 mt-2">
          Kejadian {tglTampil(c.tanggal)}{c.jam ? ` pukul ${c.jam}` : ''} · dilaporkan {c.pelapor_nama} pada {tglLaporTampil(c.created_at)} pukul {jamTampil(c.created_at)}
          {wa && <> · <a href={wa} target="_blank" rel="noopener" className="font-bold text-emerald-300 underline underline-offset-2">Hubungi lewat WA</a></>}
          {!wa && c.pelapor_wa ? ` (${c.pelapor_wa})` : ''}
        </div>
        {c.tanggapan && (
          <p className="text-xs text-sky-200 mt-2 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-2">
            Tanggapan: {c.tanggapan}{c.ditangani_oleh ? <span className="text-slate-400"> — {c.ditangani_oleh}</span> : null}
          </p>
        )}

        {sedangMenanggapi && menanggapi && (
          <div className="mt-3 flex gap-2 flex-wrap">
            <input autoFocus value={teksTanggapan} onChange={e => setTeksTanggapan(e.target.value)} maxLength={500}
              placeholder={menanggapi.aksi === 'abaikan' ? 'Alasan diabaikan (terlihat oleh PIC)' : 'Tanggapan / tindak lanjut (terlihat oleh PIC, boleh kosong)'}
              aria-label="Tanggapan" className={`${kotak} flex-1 min-w-[220px]`} />
            <button onClick={async () => { if (await tindakCatatan(c.id, menanggapi.aksi, teksTanggapan)) { setMenanggapi(null); setTeksTanggapan('') } }}
              disabled={sibuk === c.id || (menanggapi.aksi === 'abaikan' && !teksTanggapan.trim())}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40">
              {menanggapi.aksi === 'tangani' ? 'Simpan · sedang ditangani' : menanggapi.aksi === 'selesai' ? 'Simpan · selesai' : 'Abaikan'}
            </button>
            <button onClick={() => { setMenanggapi(null); setTeksTanggapan('') }} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Batal</button>
          </div>
        )}

        {!sedangMenanggapi && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {(c.status === 'baru' || c.status === 'ditangani') && (
              <>
                <button onClick={() => { setMenanggapi({ id: c.id, aksi: 'tangani' }); setTeksTanggapan(c.tanggapan ?? '') }} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/50 px-3 py-1.5 text-xs font-bold text-sky-200">
                  {c.status === 'baru' ? 'Tangani' : 'Ubah tanggapan'}
                </button>
                <button onClick={() => { setMenanggapi({ id: c.id, aksi: 'selesai' }); setTeksTanggapan(c.tanggapan ?? '') }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950"><CheckCircle size={13} /> Selesai</button>
                {c.status === 'baru' && <button onClick={() => { setMenanggapi({ id: c.id, aksi: 'abaikan' }); setTeksTanggapan('') }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Abaikan</button>}
                {c.status === 'ditangani' && <button onClick={() => tindakCatatan(c.id, 'buka')} disabled={sibuk === c.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"><RotateCcw size={12} /> Jadikan belum ditangani</button>}
              </>
            )}
            {(c.status === 'selesai' || c.status === 'diabaikan') && (
              <button onClick={() => tindakCatatan(c.id, 'buka')} disabled={sibuk === c.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"><RotateCcw size={12} /> Buka lagi</button>
            )}
          </div>
        )}
      </div>
    )
  }

  const TombolTab = ({ id, label, jumlah, Ikon }: { id: typeof tab; label: string; jumlah?: number; Ikon: any }) => (
    <button onClick={() => setTab(id)} aria-pressed={tab === id}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold border ${tab === id ? 'text-slate-950' : 'text-slate-300 border-slate-700'}`}
      style={tab === id ? { background: ACCENT, borderColor: ACCENT } : {}}>
      <Ikon size={15} /> {label}
      {jumlah != null && jumlah > 0 && <span className={`rounded-full px-1.5 text-xs ${tab === id ? 'bg-slate-950/20' : 'bg-red-500 text-white'}`}>{jumlah}</span>}
    </button>
  )

  return (
    <div className="min-h-screen text-zinc-300" style={{ background: 'linear-gradient(135deg,#020a14 0%,#03101c 100%)' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-white">Report Pertandingan</h1>
            <p className="text-sm text-slate-400 mt-0.5">Laporan PIC cabor dari lapangan. Hanya yang disahkan yang dihitung sebagai medali.</p>
          </div>
          <button onClick={() => { muatLaporan(); muatAkses(); muatCatatan() }} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"><RefreshCw size={14} /> Muat ulang</button>
        </div>

        {mendesakBaru.length > 0 && (
          <button onClick={() => { setTab('catatan'); setFilterCatatan('aktif') }}
            className="mt-5 w-full flex items-center gap-3 rounded-xl border border-red-400/60 bg-red-500/15 px-4 py-3 text-left">
            <AlertTriangle size={20} className="text-red-300 shrink-0" />
            <span className="flex-1 text-sm font-bold text-red-200">
              {mendesakBaru.length} catatan MENDESAK belum ditangani · {Array.from(new Set(mendesakBaru.map(c => c.cabor))).join(', ')}
            </span>
            <span className="text-xs font-bold text-red-200 underline underline-offset-2">Buka</span>
          </button>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-5">
          {([['Emas', rekapSemua.emas, WARNA.emas], ['Perak', rekapSemua.perak, WARNA.perak], ['Perunggu', rekapSemua.perunggu, WARNA.perunggu], ['Total medali', rekapSemua.total, '#fff'], ['Menunggu disahkan', menunggu.length, menunggu.length ? '#fbbf24' : '#64748b'], ['Catatan belum ditangani', catatanBaru.length, mendesakBaru.length ? '#f87171' : catatanBaru.length ? '#fbbf24' : '#64748b']] as [string, number, string][]).map(([label, n, warna]) => (
            <div key={label} className={`${kartu} px-4 py-3`}>
              <div className="text-2xl font-black tabular-nums" style={{ color: warna }}>{n}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6 flex-wrap">
          <TombolTab id="antrean" label="Antrean" jumlah={menunggu.length} Ikon={ClipboardList} />
          <TombolTab id="catatan" label="Catatan Lapangan" jumlah={catatanBaru.length} Ikon={AlertTriangle} />
          <TombolTab id="jurnal" label="Jurnal Harian" Ikon={Trophy} />
          <TombolTab id="cabor" label="Laporan Cabor" Ikon={FileText} />
          <TombolTab id="kode" label="Kode PIC" Ikon={KeyRound} />
        </div>

        {galat && <p role="alert" className="mt-4 rounded-lg bg-red-500/15 border border-red-400/40 px-4 py-3 text-sm font-bold text-red-300">{galat}</p>}
        {memuat && <p className="mt-8 text-slate-400">Memuat…</p>}

        {!memuat && tab === 'antrean' && (
          <div className="mt-5 space-y-3">
            {menunggu.length === 0 && (
              <div className={`${kartu} p-8 text-center`}>
                <p className="text-slate-300 font-bold">Tidak ada laporan yang menunggu.</p>
                <p className="text-sm text-slate-500 mt-1">{akses.length === 0 ? 'Belum ada PIC yang punya kode lapor. Buat dulu di tab Kode PIC.' : 'Laporan baru dari PIC akan muncul di sini dengan sendirinya.'}</p>
              </div>
            )}
            {menunggu.map(kartuLaporan)}
            {ditolak.length > 0 && (
              <details className="pt-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-400">Ditolak ({ditolak.length})</summary>
                <div className="mt-3 space-y-3">{ditolak.map(kartuLaporan)}</div>
              </details>
            )}
          </div>
        )}

        {!memuat && tab === 'catatan' && (
          <div className="mt-5">
            <div className="flex gap-2 flex-wrap">
              {([['aktif', 'Perlu tindak lanjut', catatan.filter(c => c.status === 'baru' || c.status === 'ditangani').length], ['selesai', 'Selesai', catatan.filter(c => c.status === 'selesai').length], ['diabaikan', 'Diabaikan', catatan.filter(c => c.status === 'diabaikan').length], ['semua', 'Semua', catatan.length]] as [FilterCatatan, string, number][]).map(([f, label, n]) => (
                <button key={f} onClick={() => setFilterCatatan(f)} aria-pressed={filterCatatan === f}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${filterCatatan === f ? 'border-sky-400 bg-sky-500/15 text-sky-200' : 'border-slate-700 text-slate-400'}`}>
                  {label} ({n})
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Catatan dari PIC tentang kejadian di lapangan. Tidak mengubah angka medali. Tanggapan Anda terlihat oleh PIC di HP-nya, dan catatan yang tidak diabaikan masuk ke laporan cabor bagian III–V.</p>
            <div className="mt-3 space-y-3">
              {catatanTampil.length === 0 && (
                <div className={`${kartu} p-8 text-center`}>
                  <p className="text-slate-300 font-bold">{filterCatatan === 'aktif' ? 'Tidak ada catatan yang perlu ditindaklanjuti.' : 'Tidak ada catatan di sini.'}</p>
                  <p className="text-sm text-slate-500 mt-1">PIC mengirim catatan lewat tab “Catatan Lapangan” di halaman lapor.</p>
                </div>
              )}
              {catatanTampil.map(kartuCatatan)}
            </div>
          </div>
        )}

        {!memuat && tab === 'cabor' && (
          <div className="mt-5">
            <p className="text-sm text-slate-400">Laporan monitoring per cabor, berkerangka format Laporan Monitoring PORPROV XV: informasi umum, hasil, catatan lapangan (aturan/THB, teknis, non-teknis), pengesahan, dan lampiran. <b className="text-slate-300">Cetak</b> menyertakan foto bukti; <b className="text-slate-300">Word</b> bisa disunting tetapi tanpa foto.</p>
            <div className={`${kartu} mt-3 overflow-x-auto`}>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                  <th className="px-4 py-3">Cabor</th><th className="px-4 py-3">PIC</th><th className="px-4 py-3 text-right">Hasil disahkan</th><th className="px-4 py-3">Medali</th><th className="px-4 py-3 text-right">Catatan</th><th className="px-4 py-3"></th>
                </tr></thead>
                <tbody>
                  {ringkasCabor.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Belum ada cabor.</td></tr>}
                  {ringkasCabor.map(c => (
                    <tr key={c.id} className="border-b border-slate-800/60">
                      <td className="px-4 py-2.5"><div className="font-bold text-white">{c.nama}</div><div className="text-xs text-slate-500">{c.atlet} atlet</div></td>
                      <td className="px-4 py-2.5 text-xs text-slate-300">{c.pic.length ? c.pic.join(', ') : <span className="text-slate-600">belum ada kode</span>}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.hasil || <span className="text-slate-600">0</span>}</td>
                      <td className="px-4 py-2.5 text-xs tabular-nums whitespace-nowrap">
                        {c.rekap.total ? <><span style={{ color: WARNA.emas }}>{c.rekap.emas}E</span> · <span style={{ color: WARNA.perak }}>{c.rekap.perak}P</span> · <span style={{ color: WARNA.perunggu }}>{c.rekap.perunggu}Pr</span></> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.catatan || <span className="text-slate-600">0</span>}{c.catatanBaru ? <span className="ml-1 text-xs text-amber-300">({c.catatanBaru} baru)</span> : null}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => laporanCabor(c.id, 'cetak')} disabled={sibukCabor === c.id} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/50 px-3 py-1.5 text-xs font-bold text-sky-200 disabled:opacity-40"><Printer size={13} /> Cetak</button>
                        <button onClick={() => laporanCabor(c.id, 'word')} disabled={sibukCabor === c.id} className="ml-1.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40"><Download size={13} /> Word</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!memuat && tab === 'jurnal' && (
          <div className="mt-5">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {daftarTanggal.map(t => {
                const h = hariPorprov(t), n = disahkan.filter(l => l.tanggal === t).length, aktif = t === tanggalAktif
                return (
                  <button key={t} onClick={() => setTanggal(t)} aria-pressed={aktif}
                    className={`shrink-0 rounded-lg border px-3 py-2 text-left ${aktif ? 'border-sky-400 bg-sky-500/15' : 'border-slate-800 bg-slate-900/60'}`}>
                    <div className="text-xs font-bold text-white">{h ? `Hari ${h}` : 'Di luar jadwal'}</div>
                    <div className="text-[11px] text-slate-400">{tglTampil(t)}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: n ? ACCENT : '#475569' }}>{n} laporan</div>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <p className="text-sm text-slate-300">
                <b className="text-white">{tglTampil(tanggalAktif)}</b> · {rekapHari.emas} emas · {rekapHari.perak} perak · {rekapHari.perunggu} perunggu · {rekapHari.laga} nomor selesai
              </p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={cetak} disabled={jurnal.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-40"><Printer size={14} /> Cetak ringkas</button>
                <button onClick={cetakMatriks} disabled={sibukMatriks} className="inline-flex items-center gap-2 rounded-lg border border-sky-400/50 px-3 py-2 text-sm font-bold text-sky-200 disabled:opacity-40"><Printer size={14} /> Cetak format KONI</button>
                <button onClick={() => unduhMatriks(false)} disabled={sibukMatriks} className="inline-flex items-center gap-2 rounded-lg border border-sky-400/50 px-3 py-2 text-sm font-bold text-sky-200 disabled:opacity-40"><Download size={14} /> Excel hari ini</button>
                <button onClick={() => unduhMatriks(true)} disabled={sibukMatriks} className="inline-flex items-center gap-2 rounded-lg border border-sky-400/50 px-3 py-2 text-sm font-bold text-sky-200 disabled:opacity-40"><Download size={14} /> Excel seluruh jadwal</button>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {jurnal.length === 0 && <div className={`${kartu} p-8 text-center text-slate-400`}>Belum ada hasil yang disahkan untuk tanggal ini.</div>}
              {jurnal.map(kartuLaporan)}
            </div>
          </div>
        )}

        {!memuat && tab === 'kode' && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className={`${kartu} p-5 lg:col-span-2 h-fit`}>
              <h2 className="text-sm font-black text-white">Buat kode untuk PIC</h2>
              <div className="mt-3 space-y-3">
                <select value={formKode.cabor_id} onChange={e => setFormKode({ ...formKode, cabor_id: e.target.value })} aria-label="Cabor" className={kotak}>
                  <option value="">Pilih cabor…</option>
                  {cabor.map(c => <option key={c.id} value={c.id}>{c.nama} ({c.atlet} atlet)</option>)}
                </select>
                <input value={formKode.nama_pic} onChange={e => setFormKode({ ...formKode, nama_pic: e.target.value })} placeholder="Nama PIC" aria-label="Nama PIC" className={kotak} />
                <input value={formKode.no_wa} onChange={e => setFormKode({ ...formKode, no_wa: e.target.value })} placeholder="Nomor WhatsApp (boleh kosong)" aria-label="Nomor WhatsApp" inputMode="tel" className={kotak} />
                <button onClick={buatKode} disabled={!formKode.cabor_id || !formKode.nama_pic.trim()} className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40">Buat kode</button>
              </div>

              {kodeBaru && (
                <div className="mt-5 rounded-lg border border-amber-400/40 bg-amber-500/10 p-4">
                  <p className="text-xs font-bold text-amber-300">Kode ini hanya tampil sekali. Salin sekarang.</p>
                  <div className="text-2xl font-mono font-black text-white tracking-widest mt-2">{kodeBaru.kode}</div>
                  <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300 font-sans">{pesanWA}</pre>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button onClick={async () => { await navigator.clipboard.writeText(pesanWA); setTersalin(true) }} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white"><Copy size={13} /> {tersalin ? 'Tersalin' : 'Salin pesan'}</button>
                    <button onClick={() => setKodeBaru(null)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300">Sudah saya simpan</button>
                  </div>
                </div>
              )}
            </div>

            <div className={`${kartu} lg:col-span-3 overflow-x-auto`}>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                  <th className="px-4 py-3">Cabor</th><th className="px-4 py-3">PIC</th><th className="px-4 py-3">Kode</th><th className="px-4 py-3">Terakhir dipakai</th><th className="px-4 py-3"></th>
                </tr></thead>
                <tbody>
                  {akses.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Belum ada kode. Buat satu untuk tiap PIC cabor.</td></tr>}
                  {akses.map(a => mengubahPic === a.id ? (
                    // Saat mengubah, isian memakai satu baris penuh yang melipat sendiri
                    // di layar sempit — di dalam kolom tabel tombolnya terpotong ke kanan.
                    <tr key={a.id} className="border-b border-slate-800/60 bg-sky-500/5">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="text-xs text-slate-400 mb-2">Mengubah kode <span className="font-mono">••••-{a.kode_ujung}</span>. Kodenya tidak berubah.</div>
                        <div className="flex flex-wrap items-center gap-2">
                          {a.jumlah_laporan === 0 ? (
                            <select value={formPic.cabor_id} onChange={e => setFormPic({ ...formPic, cabor_id: e.target.value })} aria-label="Cabor" className={`${kotak} !w-auto min-w-[150px] flex-1`}>
                              {cabor.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                            </select>
                          ) : (
                            <span className="font-bold text-white">{a.cabor}</span>
                          )}
                          <input autoFocus value={formPic.nama_pic} onChange={e => setFormPic({ ...formPic, nama_pic: e.target.value })} placeholder="Nama PIC" aria-label="Nama PIC" className={`${kotak} !w-auto min-w-[140px] flex-1`} />
                          <input value={formPic.no_wa} onChange={e => setFormPic({ ...formPic, no_wa: e.target.value })} placeholder="Nomor WhatsApp" aria-label="Nomor WhatsApp" inputMode="tel" className={`${kotak} !w-auto min-w-[140px] flex-1`} />
                          <button onClick={() => simpanPic(a.id)} disabled={!formPic.nama_pic.trim()} className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-40">Simpan</button>
                          <button onClick={() => setMengubahPic(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300">Batal</button>
                        </div>
                        {a.jumlah_laporan > 0 && <div className="text-[11px] text-slate-500 mt-2">Kode ini sudah dipakai melapor, jadi cabornya tidak bisa diganti. Untuk cabor lain, buat kode baru.</div>}
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id} className={`border-b border-slate-800/60 ${a.aktif ? '' : 'opacity-50'}`}>
                      <td className="px-4 py-3 font-bold text-white">{a.cabor}</td>
                      <td className="px-4 py-3">{a.nama_pic}<div className="text-xs text-slate-500">{a.no_wa ?? 'tanpa nomor WA'}</div></td>
                      <td className="px-4 py-3 font-mono text-slate-400">••••-{a.kode_ujung}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{a.terakhir_dipakai ? new Date(a.terakhir_dipakai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) : 'Belum pernah'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => { setMengubahPic(a.id); setFormPic({ nama_pic: a.nama_pic, no_wa: a.no_wa ?? '', cabor_id: String(a.cabor_id) }) }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Ubah</button>
                        <button onClick={() => ubahAkses(a.id, a.aktif ? 'matikan' : 'aktifkan')} className="ml-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300">{a.aktif ? 'Matikan' : 'Aktifkan'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
