'use client'
// src/components/konida/LayarMedali.tsx
// Mode layar War Room untuk videotron / command center. Empat halaman yang
// bergulir sendiri (bisa juga digulir manual):
//   1. Perolehan medali  2. Grafik perolehan emas  3. Medali per tanggal
//   4. Klasemen sementara & jadwal
// Hanya informasi yang pantas dilihat umum: tidak ada catatan lapangan,
// antrean pengesahan, data PIC, maupun target per atlet.
// Ukuran huruf mengikuti lebar layar (vw) supaya terbaca dari jauh di layar apa pun.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ambilRekapLapangan, type RekapLapangan } from '@/lib/lapor-klien'
import { timpaKlasemen } from '@/lib/lapor'
import { klasemenDimulai } from '@/lib/warroom'
import { kelompokPerTanggal, namaAtletLayar, type MedaliLayar } from '@/lib/layar'
import type { BarisJadwal } from '@/lib/matriks'
import { labelTanggal, type RingkasProyeksi } from '@/lib/proyeksi'

const WARNA = { emas: '#ffd700', perak: '#d7dde5', perunggu: '#d08a4a' } as const
const REAL = '#3987e5'      // realisasi — sama dengan grafik War Room
const PROY = '#d95926'      // proyeksi KONI
const JEDA_SEGAR_MS = 15_000
const JEDA_INFO_MS = 60_000
const JEDA_SENTUH_MS = 60_000      // sesudah layar disentuh/digulir, putar otomatis menunggu dulu
const LAMA_BAGIAN_DTK = [25, 25, 20, 25]   // halaman 3 paling sebentar 20 dtk, lalu menunggu daftarnya habis bergulir
const LAMA_DAFTAR_MAKS_MS = 180_000
const NAMA_BAGIAN = ['Perolehan medali', 'Grafik emas', 'Medali per tanggal', 'Klasemen & jadwal']

interface LayarInfo {
  kontingen: string; hari_ini: string; hitung_mundur: number | null
  jadwal: { tanggal: string; hari_ini: boolean; kegiatan: BarisJadwal[] } | null
  klasemen: { nama: string; emas: number; perak: number; perunggu: number; total: number }[]
}
type Proyeksi = { ada: false } | ({ ada: true } & RingkasProyeksi)

function Jam() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tulis = () => setT(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }))
    tulis(); const iv = setInterval(tulis, 1000); return () => clearInterval(iv)
  }, [])
  return <span className="tabular-nums font-mono">{t}</span>
}

const jam = (ts: string) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
const tanggalPanjang = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/** Piksel per 1vw, mengikuti ukuran layar — untuk huruf di dalam grafik. */
function useVw() {
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 12 : window.innerWidth / 100))
  useEffect(() => {
    const ubah = () => setVw(window.innerWidth / 100)
    window.addEventListener('resize', ubah); return () => window.removeEventListener('resize', ubah)
  }, [])
  return vw
}

const kotak = 'rounded-[1.2vw] bg-white/5 border border-white/10'
const judulKecil = 'uppercase tracking-[0.2em] text-slate-400 font-bold'

export default function LayarMedali({ kontingenId, onTutup }: { kontingenId: number; onTutup: () => void }) {
  const [data, setData] = useState<RekapLapangan | null>(null)
  const [proyeksi, setProyeksi] = useState<Proyeksi | null>(null)
  const [info, setInfo] = useState<LayarInfo | null>(null)
  const [galat, setGalat] = useState('')
  const [putar, setPutar] = useState(true)
  const [bagian, setBagian] = useState(0)
  const jedaSampai = useRef(0)
  const wadah = useRef<HTMLDivElement>(null)
  const halaman = useRef<(HTMLElement | null)[]>([])
  const daftar = useRef<HTMLDivElement>(null)
  const daftarSampaiBawah = useRef(false)
  const vw = useVw()

  // ── Data ──
  const muat = useCallback(async () => {
    const h = await ambilRekapLapangan(kontingenId)
    if (h.ok) { setData(h.data); setGalat('') }
    // Angka terakhir tetap dipajang; yang berubah hanya peringatannya.
    else setGalat(h.status === 401 ? 'Sesi login habis. Angka di layar tidak lagi diperbarui — login ulang di komputer ini.' : `Sambungan terputus (${h.pesan}). Mencoba lagi…`)
    try {
      const r = await fetch(`/api/konida/proyeksi-emas?kontingen_id=${kontingenId}`, { cache: 'no-store' })
      if (r.ok) setProyeksi(await r.json())
    } catch { /* grafik memakai data terakhir */ }
  }, [kontingenId])
  const muatInfo = useCallback(async () => {
    try {
      const r = await fetch(`/api/konida/layar-info?kontingen_id=${kontingenId}`, { cache: 'no-store' })
      if (r.ok) setInfo(await r.json())
    } catch { /* tetap pakai yang terakhir */ }
  }, [kontingenId])
  useEffect(() => { muat(); const iv = setInterval(muat, JEDA_SEGAR_MS); return () => clearInterval(iv) }, [muat])
  useEffect(() => { muatInfo(); const iv = setInterval(muatInfo, JEDA_INFO_MS); return () => clearInterval(iv) }, [muatInfo])

  // ── Pindah halaman ──
  const pindah = useCallback((i: number) => {
    const n = NAMA_BAGIAN.length, tujuan = ((i % n) + n) % n
    // Bukan scroll-snap: jam yang berdetak tiap detik membuat peramban "menarik"
    // layar kembali ke halaman yang sedang dikunci, sehingga perpindahan batal.
    const w = wadah.current
    // Halus bila terlihat; langsung bila jendela tersembunyi (peramban tidak menganimasikannya).
    if (w) w.scrollTo({ top: (halaman.current[tujuan]?.offsetTop ?? tujuan * w.clientHeight), behavior: document.visibilityState === 'visible' ? 'smooth' : 'auto' })
    setBagian(tujuan)
  }, [])
  const disentuh = useCallback(() => { jedaSampai.current = Date.now() + JEDA_SENTUH_MS }, [])

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onTutup()
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); disentuh(); pindah(bagian + 1) }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); disentuh(); pindah(bagian - 1) }
    }
    window.addEventListener('keydown', tekan); return () => window.removeEventListener('keydown', tekan)
  }, [onTutup, pindah, bagian, disentuh])

  // Halaman yang sedang tampil dibaca dari posisi gulir (bisa digeser manual).
  const saatGulir = () => {
    const w = wadah.current
    if (w && w.clientHeight) setBagian(Math.round(w.scrollTop / w.clientHeight))
  }

  // Putar otomatis: tiap halaman tampil beberapa puluh detik, lalu ke halaman berikutnya.
  // Halaman medali per tanggal baru berganti setelah daftarnya habis bergulir (paling lama 3 menit).
  useEffect(() => {
    if (!putar) return
    const mulai = Date.now()
    let t: ReturnType<typeof setTimeout>
    const cek = () => {
      const tungguDaftar = bagian === 2 && !daftarSampaiBawah.current && Date.now() - mulai < LAMA_DAFTAR_MAKS_MS
      if (Date.now() < jedaSampai.current || tungguDaftar) { t = setTimeout(cek, 2000); return }
      pindah(bagian + 1)
    }
    t = setTimeout(cek, LAMA_BAGIAN_DTK[bagian] * 1000)
    return () => clearTimeout(t)
  }, [putar, bagian, pindah])

  // Daftar medali per tanggal menggulir pelan sendiri saat halamannya tampil.
  useEffect(() => {
    if (bagian !== 2) return
    const el = daftar.current
    if (!el) return
    el.scrollTop = 0
    daftarSampaiBawah.current = false
    let tahan = 40   // ±2 detik diam di atas sebelum mulai bergerak
    let diBawah = false
    const iv = setInterval(() => {
      if (el.scrollHeight <= el.clientHeight) { daftarSampaiBawah.current = true; return }
      if (Date.now() < jedaSampai.current) return
      if (tahan > 0) { tahan--; return }
      if (diBawah) { diBawah = false; tahan = 40; el.scrollTop = 0; return }   // berputar lagi bila halaman ditahan
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) { diBawah = true; daftarSampaiBawah.current = true; tahan = 60; return }
      el.scrollTop += Math.max(1, vw * 0.06)
    }, 50)
    return () => clearInterval(iv)
  }, [bagian, vw])

  const layarPenuh = () => { document.fullscreenElement ? document.exitFullscreen() : wadah.current?.requestFullscreen?.() }

  // ── Turunan data ──
  const r = data?.rekap
  const t = data?.target
  const persenKoni = t && t.emas_koni > 0 && r ? Math.min(100, Math.round((r.emas / t.emas_koni) * 100)) : 0
  const caborMedali = (data?.per_cabor ?? []).filter(c => c.emas + c.perak + c.perunggu > 0).slice(0, 8)
  // Tanggal terbaru di atas: hasil hari ini langsung terbaca tanpa menunggu gulir.
  const perTanggal = useMemo(() => kelompokPerTanggal((data?.medali_semua ?? []) as MedaliLayar[]).reverse(), [data])
  const klasemen = useMemo(() => {
    if (!info) return []
    return r && data ? timpaKlasemen(info.klasemen, r, data.kontingen) : info.klasemen
  }, [info, r, data])
  const namaKita = (data?.kontingen || info?.kontingen || '').trim().toUpperCase()
  // Deretan nol tidak punya peringkat — tanpa ini layar menampilkan "#1" sebelum ada medali.
  const klasemenMulai = klasemenDimulai(klasemen)
  const peringkat = klasemenMulai ? klasemen.findIndex(k => k.nama.trim().toUpperCase() === namaKita) + 1 : 0
  const grafik = useMemo(() => {
    if (proyeksi && proyeksi.ada) return { ada_proyeksi: true, hari: proyeksi.hari.map(h => ({ ...h, label: labelTanggal(h.tanggal) })), total_proyeksi: proyeksi.total_proyeksi }
    let kum = 0
    const hari = (data?.per_hari ?? []).map(h => { kum += h.emas; return { tanggal: h.tanggal, label: labelTanggal(h.tanggal), proyeksi: 0, realisasi: h.emas, kum_proyeksi: 0, kum_realisasi: kum } })
    return { ada_proyeksi: false, hari, total_proyeksi: 0 }
  }, [proyeksi, data])
  const idxAkhirReal = grafik.hari.reduce((j, h, i) => h.kum_realisasi != null ? i : j, -1)

  const kontingenJudul = data?.kontingen ? `KONTINGEN ${data.kontingen}` : 'PEROLEHAN MEDALI'
  // Fungsi biasa, bukan komponen: komponen yang dibuat di dalam komponen lain dipasang
  // ulang tiap pembaruan data, sehingga daftar yang sedang bergulir melompat ke atas.
  const kepala = (judul: string) => (
    <div className="flex items-start justify-between gap-6 shrink-0">
      <div>
        <div className="font-black uppercase tracking-[0.25em] text-sky-300" style={{ fontSize: '1vw' }}>PORPROV XV Jawa Barat 2026 · {kontingenJudul}</div>
        <div className="font-black leading-none mt-[0.4vw]" style={{ fontSize: '3vw' }}>{judul}</div>
      </div>
      <div className="text-right">
        <div className="font-black text-sky-300 leading-none" style={{ fontSize: '2.6vw' }}><Jam /></div>
        <div className="text-slate-300 mt-[0.4vw]" style={{ fontSize: '1.1vw' }}>
          {data ? `${data.hari_ini.hari_ke ? `Hari ke-${data.hari_ini.hari_ke} · ` : ''}${tanggalPanjang(data.hari_ini.tanggal)}` : ''}
        </div>
      </div>
    </div>
  )
  const halamanKe = (i: number, isi: ReactNode) => (
    <section key={i} ref={el => { halaman.current[i] = el }} className="flex flex-col" style={{ height: '100vh', padding: '1.6vw 2vw 3.2vw' }}>
      {isi}
    </section>
  )
  const huruf = Math.round(vw * 0.85)
  const sumbu = { tick: { fill: '#94a3b8', fontSize: huruf }, tickLine: false, axisLine: { stroke: 'rgba(255,255,255,0.15)' } } as const
  const labelUjung = (idx: number, warna: string) => (p: any) =>
    p.index === idx && p.value != null
      ? <text x={p.x + vw * 0.5} y={p.y + huruf * 0.4} fill="#f8fafc" fontSize={Math.round(vw * 1.3)} fontWeight={900}>{p.value}<tspan fill={warna}> ●</tspan></text>
      : null

  return (
    <div ref={wadah} onScroll={saatGulir} onWheel={disentuh} onTouchStart={disentuh} onMouseDown={disentuh}
      className="fixed inset-0 z-[1000] overflow-y-auto text-white"
      style={{ background: 'radial-gradient(ellipse at top, #0b2545 0%, #050d1c 60%, #02060f 100%)' }}>

      {galat && <div role="alert" className="fixed left-1/2 -translate-x-1/2 top-[1vw] z-10 rounded-xl bg-red-600/90 font-bold text-center" style={{ fontSize: '1.3vw', padding: '0.6vw 1.4vw' }}>{galat}</div>}

      {/* ═══ 1. Perolehan medali ═══ */}
      {halamanKe(0, <>
        {kepala(kontingenJudul)}
        <div className="flex-1 min-h-0 grid gap-[1.6vw] mt-[1.4vw]" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
          <div className="flex flex-col gap-[1.2vw] min-h-0">
            <div className="grid grid-cols-3 gap-[1.2vw]">
              {(['emas', 'perak', 'perunggu'] as const).map(m => (
                <div key={m} className="rounded-[1.2vw] text-center" style={{ background: `${WARNA[m]}14`, border: `0.15vw solid ${WARNA[m]}66`, padding: '1.2vw 0.6vw' }}>
                  <div className="font-black leading-none tabular-nums" style={{ fontSize: '9vw', color: WARNA[m], textShadow: `0 0 3vw ${WARNA[m]}55` }}>{r ? r[m] : '–'}</div>
                  <div className="font-black uppercase tracking-[0.2em]" style={{ fontSize: '1.5vw', color: WARNA[m] }}>{m}</div>
                </div>
              ))}
            </div>

            <div className={`${kotak} flex items-center justify-between`} style={{ padding: '1vw 1.6vw' }}>
              <div>
                <div className={judulKecil} style={{ fontSize: '1vw' }}>Total medali</div>
                <div className="font-black leading-none tabular-nums" style={{ fontSize: '4.4vw' }}>{r ? r.total : '–'}</div>
              </div>
              {peringkat > 0 && (
                <div className="text-center">
                  <div className={judulKecil} style={{ fontSize: '1vw' }}>Peringkat sementara</div>
                  <div className="font-black leading-none tabular-nums text-sky-300" style={{ fontSize: '4.4vw' }}>#{peringkat}</div>
                </div>
              )}
              <div className="text-right">
                <div className={judulKecil} style={{ fontSize: '1vw' }}>Hari ini</div>
                <div className="font-black tabular-nums" style={{ fontSize: '2.2vw' }}>
                  <span style={{ color: WARNA.emas }}>{data?.hari_ini.rekap.emas ?? 0}</span>
                  <span className="text-slate-500"> · </span><span style={{ color: WARNA.perak }}>{data?.hari_ini.rekap.perak ?? 0}</span>
                  <span className="text-slate-500"> · </span><span style={{ color: WARNA.perunggu }}>{data?.hari_ini.rekap.perunggu ?? 0}</span>
                </div>
              </div>
            </div>

            {t?.ada && t.emas_koni > 0 && (
              <div className={kotak} style={{ padding: '1vw 1.6vw' }}>
                <div className="flex items-baseline justify-between">
                  <div className={judulKecil} style={{ fontSize: '1vw' }}>Target emas KONI</div>
                  <div className="font-black tabular-nums" style={{ fontSize: '2vw' }}>
                    <span style={{ color: WARNA.emas }}>{r?.emas ?? 0}</span><span className="text-slate-400"> / {t.emas_koni}</span>
                  </div>
                </div>
                <div className="rounded-full overflow-hidden bg-white/10 mt-[0.6vw]" style={{ height: '1.1vw' }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${persenKoni}%`, background: `linear-gradient(90deg, #b8860b, ${WARNA.emas})` }} />
                </div>
                <div className="text-slate-400 mt-[0.5vw]" style={{ fontSize: '0.95vw' }}>{persenKoni}% tercapai · target cabor {t.emas_cabor} emas</div>
              </div>
            )}

            {caborMedali.length > 0 && (
              <div className={`${kotak} flex-1 min-h-0 overflow-hidden`} style={{ padding: '0.9vw 1.6vw' }}>
                <div className={judulKecil} style={{ fontSize: '1vw' }}>Penyumbang medali</div>
                <div className="grid grid-cols-2 gap-x-[2vw] mt-[0.4vw]">
                  {caborMedali.map(c => (
                    <div key={c.cabor_id} className="flex items-center justify-between border-b border-white/5" style={{ fontSize: '1.25vw', padding: '0.35vw 0' }}>
                      <span className="font-bold truncate">{c.cabor}</span>
                      <span className="font-mono font-black tabular-nums shrink-0 ml-[1vw]">
                        <span style={{ color: WARNA.emas }}>{c.emas}</span> <span style={{ color: WARNA.perak }}>{c.perak}</span> <span style={{ color: WARNA.perunggu }}>{c.perunggu}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`${kotak} flex flex-col min-h-0`} style={{ padding: '1.2vw 1.6vw' }}>
            <div className={judulKecil} style={{ fontSize: '1vw' }}>Medali terbaru</div>
            <div className="flex-1 min-h-0 overflow-hidden mt-[0.6vw]">
              {data && data.medali_terbaru.length === 0 && (
                <div className="h-full flex items-center justify-center text-center text-slate-400" style={{ fontSize: '1.6vw' }}>
                  Belum ada medali yang disahkan.<br />Hasil pertama akan muncul di sini.
                </div>
              )}
              {(data?.medali_terbaru ?? []).slice(0, 7).map(m => (
                <div key={m.id} className="flex items-center gap-[1.2vw] border-b border-white/5" style={{ padding: '0.75vw 0' }}>
                  {/* Lencana lonjong: kata "PERUNGGU" tidak muat di lingkaran. */}
                  <div className="shrink-0 rounded-full flex items-center justify-center font-black text-slate-950 uppercase tracking-wide"
                    style={{ width: '7.6vw', height: '2.8vw', fontSize: '1vw', background: WARNA[m.hasil], boxShadow: `0 0 1.6vw ${WARNA[m.hasil]}66` }}>{m.hasil}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black leading-tight truncate" style={{ fontSize: '1.7vw' }}>{namaAtletLayar(m.atlet)}</div>
                    <div className="text-slate-300 truncate" style={{ fontSize: '1.15vw' }}>{m.cabor} · {m.nomor}{m.nilai ? ` · ${m.nilai}` : ''}</div>
                  </div>
                  <div className="shrink-0 text-slate-400 font-mono tabular-nums text-right" style={{ fontSize: '1.05vw' }}>{labelTanggal(m.tanggal)}<br />{jam(m.waktu)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>)}

      {/* ═══ 2. Grafik perolehan emas ═══ */}
      {halamanKe(1, <>
        {kepala('GRAFIK PEROLEHAN EMAS')}
        <div className="grid grid-cols-3 gap-[1.2vw] mt-[1.2vw] shrink-0">
          <div className={kotak} style={{ padding: '0.9vw 1.6vw' }}>
            <div className={judulKecil} style={{ fontSize: '1vw' }}>Emas diraih</div>
            <div className="font-black leading-none tabular-nums" style={{ fontSize: '4vw', color: WARNA.emas }}>{r?.emas ?? 0}</div>
          </div>
          <div className={kotak} style={{ padding: '0.9vw 1.6vw' }}>
            <div className={judulKecil} style={{ fontSize: '1vw' }}>{grafik.ada_proyeksi ? 'Proyeksi KONI' : 'Hari bertanding'}</div>
            <div className="font-black leading-none tabular-nums" style={{ fontSize: '4vw' }}>{grafik.ada_proyeksi ? grafik.total_proyeksi : grafik.hari.length}</div>
          </div>
          <div className={kotak} style={{ padding: '0.9vw 1.6vw' }}>
            <div className={judulKecil} style={{ fontSize: '1vw' }}>Hari paling banyak emas</div>
            {(() => {
              const top = [...grafik.hari].filter(h => h.kum_realisasi != null && h.realisasi > 0).sort((a, b) => b.realisasi - a.realisasi)[0]
              return top
                ? <div className="font-black leading-none" style={{ fontSize: '2.6vw', marginTop: '0.6vw' }}>{top.label} <span style={{ color: WARNA.emas }}>· {top.realisasi} emas</span></div>
                : <div className="text-slate-400" style={{ fontSize: '1.6vw', marginTop: '0.8vw' }}>Belum ada</div>
            })()}
          </div>
        </div>
        <div className="flex items-center gap-[2vw] mt-[1vw] shrink-0" style={{ fontSize: '1.1vw' }}>
          {grafik.ada_proyeksi && <span className="flex items-center gap-[0.6vw] text-slate-300"><svg width={vw * 2.4} height={vw * 0.4}><line x1="0" y1={vw * 0.2} x2={vw * 2.4} y2={vw * 0.2} stroke={PROY} strokeWidth={vw * 0.2} strokeDasharray={`${vw * 0.6} ${vw * 0.35}`} /></svg>Proyeksi KONI</span>}
          <span className="flex items-center gap-[0.6vw] text-slate-300"><svg width={vw * 2.4} height={vw * 0.4}><line x1="0" y1={vw * 0.2} x2={vw * 2.4} y2={vw * 0.2} stroke={REAL} strokeWidth={vw * 0.2} /></svg>Emas diraih (disahkan)</span>
        </div>
        <div className="flex-1 min-h-0 grid gap-[1.6vw] mt-[0.8vw]" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          <div className={`${kotak} flex flex-col min-h-0`} style={{ padding: '1vw 1.2vw' }}>
            <div className={judulKecil} style={{ fontSize: '1vw' }}>Akumulasi emas</div>
            <div className="flex-1 min-h-0 mt-[0.5vw]">
              {grafik.hari.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400" style={{ fontSize: '1.6vw' }}>Belum ada data.</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={grafik.hari} margin={{ top: vw, right: vw * 3.5, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="label" {...sumbu} interval="preserveStartEnd" minTickGap={vw} />
                    <YAxis {...sumbu} axisLine={false} allowDecimals={false} width={vw * 3} />
                    {grafik.ada_proyeksi && (
                      <Line type="linear" dataKey="kum_proyeksi" stroke={PROY} strokeWidth={Math.max(2, vw * 0.18)} strokeDasharray={`${vw * 0.6} ${vw * 0.35}`} dot={false} isAnimationActive={false}>
                        <LabelList dataKey="kum_proyeksi" content={labelUjung(grafik.hari.length - 1, PROY)} />
                      </Line>
                    )}
                    <Line type="linear" dataKey="kum_realisasi" stroke={REAL} strokeWidth={Math.max(2.5, vw * 0.24)} dot={false} connectNulls={false} isAnimationActive={false}>
                      <LabelList dataKey="kum_realisasi" content={labelUjung(idxAkhirReal, REAL)} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className={`${kotak} flex flex-col min-h-0`} style={{ padding: '1vw 1.2vw' }}>
            <div className={judulKecil} style={{ fontSize: '1vw' }}>Emas per hari</div>
            <div className="flex-1 min-h-0 mt-[0.5vw]">
              {grafik.hari.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400" style={{ fontSize: '1.6vw' }}>Belum ada data.</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafik.hari} margin={{ top: vw, right: vw * 0.5, left: 0, bottom: 0 }} barGap={2} barCategoryGap="18%">
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="label" {...sumbu} interval="preserveStartEnd" minTickGap={vw} />
                    <YAxis {...sumbu} axisLine={false} allowDecimals={false} width={vw * 3} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0b1622', border: '1px solid rgba(255,255,255,0.15)', fontSize: huruf }} />
                    {grafik.ada_proyeksi && <Bar dataKey="proyeksi" name="Proyeksi" fill={PROY} radius={[4, 4, 0, 0]} maxBarSize={vw * 1.1} isAnimationActive={false} />}
                    <Bar dataKey="realisasi" name="Emas diraih" fill={REAL} radius={[4, 4, 0, 0]} maxBarSize={vw * 1.1} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </>)}

      {/* ═══ 3. Medali per tanggal ═══ */}
      {halamanKe(2, <>
        {kepala('MEDALI PER TANGGAL')}
        <div className="flex items-center gap-[2vw] mt-[1vw] text-slate-300 shrink-0" style={{ fontSize: '1.2vw' }}>
          <span>{perTanggal.reduce((n, h) => n + h.medali.length, 0)} medali dari {perTanggal.length} hari · tanggal terbaru di atas</span>
          <span><span style={{ color: WARNA.emas }}>{r?.emas ?? 0} emas</span> · <span style={{ color: WARNA.perak }}>{r?.perak ?? 0} perak</span> · <span style={{ color: WARNA.perunggu }}>{r?.perunggu ?? 0} perunggu</span></span>
        </div>
        <div ref={daftar} className={`${kotak} flex-1 min-h-0 overflow-y-auto mt-[0.8vw]`} style={{ padding: '0 1.6vw 1vw' }}>
          {perTanggal.length === 0 && (
            <div className="h-full flex items-center justify-center text-slate-400" style={{ fontSize: '1.6vw' }}>Belum ada medali yang disahkan.</div>
          )}
          {perTanggal.map(h => (
            <div key={h.tanggal}>
              <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-white/10" style={{ background: '#0a1a30', padding: '0.8vw 0', fontSize: '1.4vw' }}>
                <span className="font-black">{tanggalPanjang(h.tanggal)}{h.hari_ke ? <span className="text-sky-300"> · Hari ke-{h.hari_ke}</span> : null}</span>
                <span className="font-mono font-black tabular-nums">
                  <span style={{ color: WARNA.emas }}>{h.emas}</span> <span className="text-slate-500">·</span> <span style={{ color: WARNA.perak }}>{h.perak}</span> <span className="text-slate-500">·</span> <span style={{ color: WARNA.perunggu }}>{h.perunggu}</span>
                </span>
              </div>
              {h.medali.map(m => (
                <div key={m.id} className="flex items-center gap-[1.2vw] border-b border-white/5" style={{ padding: '0.6vw 0' }}>
                  <div className="shrink-0 rounded-full flex items-center justify-center font-black text-slate-950 uppercase tracking-wide"
                    style={{ width: '7vw', height: '2.4vw', fontSize: '0.9vw', background: WARNA[m.hasil] }}>{m.hasil}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black leading-tight truncate" style={{ fontSize: '1.5vw' }}>{namaAtletLayar(m.atlet)}</div>
                    <div className="text-slate-300 truncate" style={{ fontSize: '1.05vw' }}>{m.cabor} · {m.nomor}{m.nilai ? ` · ${m.nilai}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>)}

      {/* ═══ 4. Klasemen & jadwal ═══ */}
      {halamanKe(3, <>
        {kepala('KLASEMEN & JADWAL')}
        <div className="flex-1 min-h-0 grid gap-[1.6vw] mt-[1.4vw]" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className={`${kotak} flex flex-col min-h-0`} style={{ padding: '1.2vw 1.6vw' }}>
            <div className="flex items-baseline justify-between">
              <div className={judulKecil} style={{ fontSize: '1vw' }}>Klasemen sementara</div>
              {peringkat > 0 && <div className="text-sky-300 font-black" style={{ fontSize: '1.4vw' }}>Kita #{peringkat} dari {klasemen.length}</div>}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden mt-[0.6vw]">
              {klasemen.length === 0 && <div className="h-full flex items-center justify-center text-slate-400" style={{ fontSize: '1.6vw' }}>Klasemen belum tersedia.</div>}
              {klasemen.length > 0 && !klasemenMulai && <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center" style={{ fontSize: '1.6vw' }}>Klasemen belum dimulai<span className="text-slate-500" style={{ fontSize: '1vw' }}>Semua kontingen masih 0 medali</span></div>}
              {klasemenMulai && (() => {
                const atas = klasemen.slice(0, 10)
                const kitaDiBawah = peringkat > 10 ? klasemen[peringkat - 1] : null
                const baris = (k: typeof klasemen[number], no: number) => {
                  const kita = k.nama.trim().toUpperCase() === namaKita
                  return (
                    <div key={`${no}-${k.nama}`} className="flex items-center gap-[1vw] rounded-[0.6vw]" style={{ padding: '0.45vw 0.8vw', fontSize: '1.35vw', background: kita ? 'rgba(56,189,248,0.15)' : 'transparent', border: kita ? '0.12vw solid rgba(56,189,248,0.6)' : '0.12vw solid transparent' }}>
                      <span className="w-[3vw] text-right font-black tabular-nums" style={{ color: no <= 3 ? [WARNA.emas, WARNA.perak, WARNA.perunggu][no - 1] : '#94a3b8' }}>{no}</span>
                      <span className={`flex-1 truncate font-bold ${kita ? 'text-sky-200' : ''}`}>{k.nama}</span>
                      <span className="font-mono font-black tabular-nums shrink-0">
                        <span style={{ color: WARNA.emas }}>{k.emas}</span> <span style={{ color: WARNA.perak }}>{k.perak}</span> <span style={{ color: WARNA.perunggu }}>{k.perunggu}</span>
                      </span>
                    </div>
                  )
                }
                return <>{atas.map((k, i) => baris(k, i + 1))}{kitaDiBawah && <><div className="text-center text-slate-500" style={{ fontSize: '1.2vw' }}>⋮</div>{baris(kitaDiBawah, peringkat)}</>}</>
              })()}
            </div>
            <div className="text-slate-500 mt-[0.4vw]" style={{ fontSize: '0.85vw' }}>Angka kontingen lain dari klasemen resmi; angka {data?.kontingen ?? 'kita'} dari laporan lapangan yang disahkan.</div>
          </div>

          <div className="flex flex-col gap-[1.2vw] min-h-0">
            {info?.hitung_mundur != null && (
              <div className="rounded-[1.2vw] text-center" style={{ background: 'rgba(56,189,248,0.1)', border: '0.15vw solid rgba(56,189,248,0.45)', padding: '1.2vw' }}>
                <div className={judulKecil} style={{ fontSize: '1vw' }}>Menuju pembukaan PORPROV XV · 7 November 2026</div>
                <div className="font-black leading-none text-sky-300 tabular-nums" style={{ fontSize: '6vw' }}>H-{info.hitung_mundur}</div>
              </div>
            )}
            <div className={`${kotak} flex-1 flex flex-col min-h-0`} style={{ padding: '1.2vw 1.6vw' }}>
              <div className={judulKecil} style={{ fontSize: '1vw' }}>
                {info?.jadwal ? (info.jadwal.hari_ini ? 'Bertanding hari ini' : `Jadwal terdekat · ${tanggalPanjang(info.jadwal.tanggal)}`) : 'Jadwal'}
              </div>
              <div className="flex-1 min-h-0 overflow-hidden mt-[0.6vw]">
                {!info?.jadwal && <div className="h-full flex items-center justify-center text-slate-400" style={{ fontSize: '1.6vw' }}>Tidak ada jadwal pertandingan lagi.</div>}
                {(info?.jadwal?.kegiatan ?? []).slice(0, 9).map((k, i) => (
                  <div key={i} className="border-b border-white/5" style={{ padding: '0.55vw 0' }}>
                    <div className="flex items-baseline justify-between gap-[1vw]">
                      <span className="font-black truncate" style={{ fontSize: '1.45vw' }}>{k.cabor_disiplin}</span>
                      <span className="text-sky-300 font-bold shrink-0" style={{ fontSize: '1.1vw' }}>{k.tuan_rumah ?? ''}</span>
                    </div>
                    <div className="text-slate-400 truncate" style={{ fontSize: '1vw' }}>{k.venue ?? ''}</div>
                  </div>
                ))}
                {(info?.jadwal?.kegiatan.length ?? 0) > 9 && <div className="text-slate-400 mt-[0.4vw]" style={{ fontSize: '1vw' }}>dan {(info?.jadwal?.kegiatan.length ?? 0) - 9} kegiatan lain</div>}
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* Kendali: titik halaman, putar otomatis, layar penuh, tutup */}
      <div className="fixed bottom-[0.8vw] left-[2vw] right-[2vw] flex items-center justify-between gap-[1vw] text-slate-500" style={{ fontSize: '0.85vw' }}>
        <span className="truncate">Sumber: laporan PIC cabor yang telah disahkan KONI Kabupaten Bandung{data ? ` · diperbarui ${jam(data.diperbarui)}` : ''}</span>
        <span className="flex items-center gap-[0.6vw] shrink-0">
          {NAMA_BAGIAN.map((n, i) => (
            <button key={n} onClick={() => { disentuh(); pindah(i) }} title={n} aria-label={`Ke halaman ${n}`}
              className="rounded-full transition-all" style={{ width: bagian === i ? '2.2vw' : '0.8vw', height: '0.8vw', background: bagian === i ? '#38bdf8' : 'rgba(255,255,255,0.3)' }} />
          ))}
          <button onClick={() => setPutar(p => !p)} className="ml-[0.6vw] rounded border border-white/20 text-slate-300" style={{ padding: '0.25vw 0.8vw' }}>
            {putar ? '⏸ Putar otomatis' : '▶ Putar otomatis'}
          </button>
          <button onClick={layarPenuh} className="rounded border border-white/20 text-slate-300" style={{ padding: '0.25vw 0.8vw' }}>Layar penuh</button>
          <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); onTutup() }} className="rounded border border-white/20 text-slate-300" style={{ padding: '0.25vw 0.8vw' }}>Tutup</button>
        </span>
      </div>
    </div>
  )
}
