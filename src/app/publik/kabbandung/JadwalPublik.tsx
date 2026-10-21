'use client'
// Tampilan halaman publik jadwal kontingen Kab. Bandung — dirancang untuk HP.
// Status (berlangsung/akan datang/selesai) dihitung di peramban dengan tanggal
// WIB, supaya tetap benar walau halaman tersimpan di cache server.

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronRight, Clock, LayoutDashboard, LogIn, MapPin, Search, Share2, Sparkles, Users, Medal, Map as IkonPeta, Flag } from 'lucide-react'
import { tanggalWIB, hariPorprov, PORPROV_HARI, PORPROV_MULAI } from '@/lib/lapor'
import { hitungMundur } from '@/lib/layar'
import {
  LABEL_STATUS, cocokCari, deretTanggal, hariKe, ikonCabor, kegiatanPada, namaHari, rentangSingkat, ringkasWilayah,
  segeraMulai, statusKegiatan, tanggalAwal, tglPanjang, urutDaftar, type AngkaKontingen, type BarisPublik, type PartaiPublik, type StatusKegiatan,
} from '@/lib/jadwal-publik'
import { LABEL_STATUS_PARTAI, WARNA_STATUS_PARTAI } from '@/lib/jadwal-partai'

const WARNA: Record<StatusKegiatan, string> = { berlangsung: '#34d399', akan: '#38bdf8', selesai: '#64748b', tanpa_tanggal: '#64748b' }
const WARNA_WILAYAH: Record<string, { utama: string; latar: string }> = {
  'WILAYAH I':   { utama: '#38bdf8', latar: 'from-sky-500/25 via-sky-500/5' },
  'WILAYAH II':  { utama: '#f5c518', latar: 'from-amber-400/25 via-amber-400/5' },
  'WILAYAH III': { utama: '#34d399', latar: 'from-emerald-400/25 via-emerald-400/5' },
}
const warnaWilayah = (w: string | null) => WARNA_WILAYAH[(w ?? '').trim().toUpperCase()]?.utama ?? '#94a3b8'
const BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
const angkaID = (n: number) => n.toLocaleString('id-ID')
const TAMPIL = { fontFamily: 'var(--font-tampil), ui-sans-serif, system-ui' }

/** Angka yang menghitung naik saat pertama terlihat (dimatikan bila pengguna memilih gerak minimal). */
function AngkaNaik({ nilai }: { nilai: number }) {
  const [n, setN] = useState(nilai)
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let mulai: number | null = null, id = 0
    const langkah = (t: number) => {
      mulai ??= t
      const p = Math.min(1, (t - mulai) / 1100)
      setN(Math.round(nilai * (1 - Math.pow(1 - p, 3))))
      if (p < 1) id = requestAnimationFrame(langkah)
    }
    setN(0); id = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(id)
  }, [nilai])
  return <>{angkaID(n)}</>
}

function Lencana({ status }: { status: StatusKegiatan }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ color: WARNA[status], background: WARNA[status] + '1f', border: `1px solid ${WARNA[status]}55` }}>
      {status === 'berlangsung' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: WARNA[status] }} />}
      {status === 'berlangsung' ? 'Live' : LABEL_STATUS[status]}
    </span>
  )
}

function Kartu({ b, hariIni, tanggal }: { b: BarisPublik; hariIni: string; tanggal?: string }) {
  const status = statusKegiatan(b, hariIni)
  const upacara = b.jenis === 'upacara'
  const urutan = tanggal ? hariKe(b, tanggal) : null
  const tampilCabor = b.cabor && !norm(b.kegiatan).includes(norm(b.cabor))
  const warna = upacara ? '#f5c518' : warnaWilayah(b.wilayah)
  return (
    <div className={`group relative rounded-2xl border p-3.5 overflow-hidden transition-colors ${upacara ? 'border-amber-400/40 bg-gradient-to-br from-amber-400/15 to-slate-900/80' : 'border-white/[0.07] bg-gradient-to-br from-white/[0.06] to-white/[0.02] hover:border-white/15'}`}>
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: warna }} />
      <div className="relative flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: `linear-gradient(135deg, ${warna}33, ${warna}0d)`, border: `1px solid ${warna}40` }}>
          {ikonCabor(b)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-white font-bold text-[15px] leading-snug break-words">
                {upacara ? b.kegiatan.replace(/\s*PORPROV XV 2026$/i, '') : b.kegiatan}
              </div>
              {tampilCabor && <div className="text-slate-400 text-xs">{b.cabor}</div>}
            </div>
            <Lencana status={status} />
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[13px] text-white/90 font-semibold">
            <CalendarDays size={13} className="text-sky-400 shrink-0" />
            {rentangSingkat(b.mulai, b.selesai)}
            {urutan && urutan.dari > 1 && <span className="text-slate-400 font-normal text-xs">· hari ke-{urutan.ke}/{urutan.dari}</span>}
          </div>
          {b.venue && (
            <div className="flex items-start gap-1.5 mt-1 text-[13px] text-slate-300">
              <MapPin size={13} className="shrink-0 mt-[3px]" style={{ color: warna }} />
              <span className="break-words">{b.venue.replace(/ \| /g, ' · ')}</span>
            </div>
          )}
          {b.kota && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide" style={{ color: warna, background: warna + '1a' }}>{b.kota}</span>
              {b.wilayah && <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white/5">{b.wilayah}</span>}
            </div>
          )}
          {urutan && status === 'berlangsung' && urutan.dari > 1 && (
            <div className="mt-2.5 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(urutan.ke / urutan.dari) * 100}%`, background: `linear-gradient(90deg, ${warna}, #34d399)` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Partai pada satu tanggal, urut jam (yang belum berjam di belakang). */
const partaiPada = (partai: PartaiPublik[], tanggal: string) =>
  partai.filter(p => p.tanggal === tanggal).sort((a, b) => (a.jam ?? '99:99').localeCompare(b.jam ?? '99:99') || a.cabor.localeCompare(b.cabor) || a.nomor.localeCompare(b.nomor))

function BarisPartai({ p }: { p: PartaiPublik }) {
  const w = WARNA_STATUS_PARTAI[p.status]
  return (
    <div className={`rounded-2xl border p-3 flex gap-3 ${p.status === 'berlangsung' ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-white/[0.08] bg-white/[0.04]'}`}>
      <div className="w-[58px] shrink-0 text-center">
        <div className="text-white text-[22px] leading-none font-extrabold" style={TAMPIL}>{p.jam ?? '--:--'}</div>
        <div className="text-[9px] font-bold uppercase mt-1 leading-tight" style={{ color: w }}>
          {p.status === 'berlangsung' ? '● Live' : LABEL_STATUS_PARTAI[p.status]}
        </div>
      </div>
      <div className="min-w-0 flex-1 border-l border-white/10 pl-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wide">
          <span className="text-base leading-none">{ikonCabor({ kegiatan: p.nomor, cabor: p.cabor })}</span>{p.cabor}
        </div>
        <div className="text-white font-bold text-[14px] leading-snug mt-0.5 break-words">{p.nomor}</div>
        {(p.babak || p.lawan) && (
          <div className="text-[13px] text-slate-300">{p.babak}{p.babak && p.lawan ? ' · ' : ''}{p.lawan && <>vs <b className="text-white">{p.lawan}</b></>}</div>
        )}
        {p.atlet.length > 0 && <div className="text-[12px] text-sky-200 mt-1 break-words">{p.atlet.join(', ')}</div>}
        {p.venue && <div className="text-[12px] text-slate-400 mt-1 flex items-start gap-1"><MapPin size={11} className="shrink-0 mt-[3px]" />{p.venue}</div>}
      </div>
    </div>
  )
}

function JudulBagian({ ikon, kecil, besar }: { ikon: React.ReactNode; kecil: string; besar: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold tracking-[0.2em] uppercase">{ikon}{kecil}</div>
      <h2 className="text-white text-[26px] leading-tight font-extrabold uppercase mt-0.5" style={TAMPIL}>{besar}</h2>
    </div>
  )
}

export default function JadwalPublik({ jadwal, diperbarui, hariIniServer, galat, angka, partai = [] }: {
  jadwal: BarisPublik[]; diperbarui: string | null; hariIniServer: string; galat: boolean; angka: AngkaKontingen | null; partai?: PartaiPublik[]
}) {
  const [hariIni, setHariIni] = useState(hariIniServer)
  const [masuk, setMasuk] = useState(false)
  const [tab, setTab] = useState<'tanggal' | 'semua'>('tanggal')
  const [pilih, setPilih] = useState<string | null>(() => tanggalAwal(jadwal, hariIniServer))
  const [cari, setCari] = useState('')
  const [saring, setSaring] = useState<'semua' | StatusKegiatan>('semua')
  const [tersalin, setTersalin] = useState(false)
  // Halaman awal sengaja ringan: jadwal lengkap dan peta baru dibuka lewat tombol,
  // atau langsung lewat tautan …/#jadwal (untuk dibagikan ke para PIC cabor).
  const [buka, setBuka] = useState(false)
  const [gulir, setGulir] = useState(0)
  const deretRef = useRef<HTMLDivElement>(null)
  const jadwalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const kini = tanggalWIB()
    setHariIni(kini)
    if (kini !== hariIniServer) setPilih(tanggalAwal(jadwal, kini))
    // Kuki user_level ada selama sesi admin masih terbuka; gerbang sebenarnya tetap di server.
    setMasuk(document.cookie.split('; ').some(c => c.startsWith('user_level=') && c.length > 'user_level='.length))
  }, [hariIniServer, jadwal])

  useEffect(() => {
    const periksa = () => { if (window.location.hash === '#jadwal') { setBuka(true); setGulir(g => g + 1) } }
    periksa()
    // Tautan …/#jadwal yang diketuk saat halaman sudah terbuka tidak memuat ulang halaman.
    window.addEventListener('hashchange', periksa)
    return () => window.removeEventListener('hashchange', periksa)
  }, [])

  useEffect(() => {
    if (!gulir) return
    const id = requestAnimationFrame(() => jadwalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => cancelAnimationFrame(id)
  }, [gulir])

  useEffect(() => {
    const el = deretRef.current?.querySelector<HTMLElement>('[data-pilih="1"]')
    if (el && deretRef.current) deretRef.current.scrollTo({ left: el.offsetLeft - deretRef.current.clientWidth / 2 + el.clientWidth / 2 })
  }, [pilih, tab])

  const pertandingan = jadwal.filter(b => b.jenis === 'pertandingan')
  const jumlahKota = new Set(pertandingan.map(b => norm(b.kota)).filter(Boolean)).size
  const berlangsungIni = pertandingan.filter(b => statusKegiatan(b, hariIni) === 'berlangsung')
  const deret = useMemo(() => deretTanggal(jadwal), [jadwal])
  const wilayah = useMemo(() => ringkasWilayah(jadwal), [jadwal])
  const segera = segeraMulai(jadwal, hariIni, 8)
  const padaTanggal = pilih ? kegiatanPada(jadwal, pilih) : []
  const partaiTanggal = pilih ? partaiPada(partai, pilih) : []
  // Sorotan partai: hari ini bila ada; bila tidak, tanggal terdekat sesudahnya.
  const tglSorot = partai.some(p => p.tanggal === hariIni) ? hariIni : partai.map(p => p.tanggal).filter(t => t > hariIni).sort()[0]
  const partaiSorot = tglSorot ? partaiPada(partai, tglSorot) : []
  const daftar = urutDaftar(jadwal, hariIni).filter(b => cocokCari(b, cari) && (saring === 'semua' || statusKegiatan(b, hariIni) === saring))

  const mundur = hitungMundur(hariIni)
  const hariKeBerapa = hariPorprov(hariIni)
  const pembukaan = jadwal.find(b => b.jenis === 'upacara' && /PEMBUKAAN/i.test(b.kegiatan))
  const sebelumBuka = pertandingan.filter(b => b.mulai && b.mulai < (pembukaan?.mulai ?? PORPROV_MULAI))
  const akhir = deret[deret.length - 1]?.tanggal

  const keJadwal = (tanggal?: string, kataCari?: string) => {
    if (tanggal) { setTab('tanggal'); setPilih(tanggal) }
    if (kataCari !== undefined) { setTab('semua'); setCari(kataCari); setSaring('semua') }
    setBuka(true); setGulir(g => g + 1)
    try { history.replaceState(null, '', '#jadwal') } catch { /* abaikan */ }
  }
  const tutupJadwal = () => {
    setBuka(false)
    try { history.replaceState(null, '', window.location.pathname) } catch { /* abaikan */ }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function bagikan() {
    const url = typeof window !== 'undefined' ? window.location.origin + '/' : 'https://kab-bandung.vercel.app/'
    const teks = `Jadwal pertandingan kontingen Kabupaten Bandung di PORPROV XV Jawa Barat 2026. Dukung atlet kita! Kabupaten Bandung BEDAS!`
    try {
      if (navigator.share) { await navigator.share({ title: 'Jadwal Kontingen Kab. Bandung', text: teks, url }); return }
    } catch { return }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${teks}\n${url}`)}`, '_blank', 'noopener')
    try { await navigator.clipboard.writeText(url); setTersalin(true); setTimeout(() => setTersalin(false), 2500) } catch { /* abaikan */ }
  }

  return (
    <div className="min-h-screen bg-[#050d1a] text-slate-200 overflow-x-hidden">
      <style>{'@keyframes muncul{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'}</style>
      {/* ══ HERO ══ */}
      <section className="relative isolate">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/peta_kabbandung.webp" alt="" fetchPriority="high"
          className="absolute inset-0 -z-20 w-full h-full object-cover object-[50%_35%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#050d1a]/70 via-[#050d1a]/80 to-[#050d1a]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(245,197,24,0.22),transparent_55%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,rgba(56,189,248,0.18),transparent_55%)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '36px 36px' }} />

        {/* Kepala */}
        <header className="max-w-3xl lg:max-w-6xl mx-auto px-4 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/kab-bandung-256.png" alt="Lambang Kabupaten Bandung" className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_0_12px_rgba(245,197,24,0.35)]" />
            <div className="min-w-0">
              <div className="text-white text-sm font-extrabold leading-tight truncate">KONI Kabupaten Bandung</div>
              <div className="text-amber-300/80 text-[10px] font-semibold tracking-wider leading-tight truncate">PORPROV XV JAWA BARAT 2026</div>
            </div>
          </div>
          <a href={masuk ? '/konida/dashboard/kabbandung' : '/konida/login/kabbandung'}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-white/20 transition-colors">
            {masuk ? <><LayoutDashboard size={14} /> Dashboard</> : <><LogIn size={14} /> Masuk</>}
          </a>
        </header>

        <div className="max-w-3xl lg:max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-8 lg:pt-14 lg:pb-20 lg:grid lg:grid-cols-[1.3fr_1fr] lg:gap-x-14 lg:items-center">
          <div className="lg:col-start-1 lg:row-start-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[11px] font-bold tracking-wider text-amber-200">
            <Sparkles size={12} /> 7 – 20 NOVEMBER 2026 · JAWA BARAT
          </div>
          <h1 className="mt-4 uppercase leading-[0.9] font-extrabold text-white text-[44px] sm:text-6xl lg:text-[64px]" style={TAMPIL}>
            Kontingen<br />Kabupaten Bandung
            <span className="block mt-1 bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent text-[64px] sm:text-[88px] lg:text-[124px] drop-shadow-[0_4px_30px_rgba(245,197,24,0.35)]">BEDAS!</span>
          </h1>
          <div className="mt-2 text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-sky-300/80">BANGKIT · EDUKATIF · DINAMIS · AGAMIS · SEJAHTERA</div>
          <p className="mt-4 text-slate-300 text-[15px] lg:text-[17px] leading-relaxed max-w-xl">
            Ikuti perjuangan atlet Kabupaten Bandung di PORPROV XV: jadwal, venue, dan kota tuan rumah seluruh cabor, diperbarui langsung oleh KONI Kabupaten Bandung.
          </p>
          </div>

          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">

          {/* Hitung mundur / hari ke */}
          {!galat && (mundur || hariKeBerapa) && (
            <div className="mt-6 lg:mt-0 relative rounded-3xl p-[1px] bg-gradient-to-br from-amber-300/70 via-white/10 to-sky-400/60">
              <div className="rounded-3xl bg-[#071426]/90 backdrop-blur px-5 py-4 lg:px-7 lg:py-6 flex items-center gap-5 lg:gap-7">
                <div className="text-center shrink-0">
                  <div className="text-[64px] lg:text-[88px] leading-none font-extrabold bg-gradient-to-b from-white to-amber-200 bg-clip-text text-transparent" style={TAMPIL}>
                    {mundur ?? hariKeBerapa}
                  </div>
                  <div className="text-[10px] font-bold tracking-[0.2em] text-amber-300 mt-1">{mundur ? 'HARI LAGI' : `HARI KE / ${PORPROV_HARI}`}</div>
                </div>
                <div className="min-w-0 border-l border-white/10 pl-5">
                  {mundur ? (
                    <>
                      <div className="text-white font-bold">Menuju Upacara Pembukaan</div>
                      <div className="text-slate-300 text-[13px] mt-0.5">{tglPanjang(pembukaan?.mulai ?? PORPROV_MULAI)}</div>
                      {pembukaan?.venue && <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-1"><MapPin size={11} />{pembukaan.venue}{pembukaan.kota ? `, ${pembukaan.kota}` : ''}</div>}
                    </>
                  ) : (
                    <>
                      <div className="text-white font-bold">PORPROV XV sedang berlangsung</div>
                      <div className="text-slate-300 text-[13px] mt-0.5">{tglPanjang(hariIni)}</div>
                      <div className="mt-2 h-1.5 w-40 max-w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400" style={{ width: `${((hariKeBerapa ?? 0) / PORPROV_HARI) * 100}%` }} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {!galat && mundur && sebelumBuka.length > 0 && (
            <button onClick={() => keJadwal(sebelumBuka.map(b => b.mulai as string).sort()[0])}
              className="mt-3 w-full text-left rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-[13px] text-emerald-200 flex items-center gap-2">
              <span className="text-lg">{ikonCabor(sebelumBuka[0])}</span>
              <span className="min-w-0 flex-1"><b>{sebelumBuka.length} kegiatan</b> bertanding lebih dulu sebelum pembukaan, mulai {rentangSingkat(sebelumBuka.map(b => b.mulai as string).sort()[0], null)}</span>
              <ChevronRight size={16} className="shrink-0" />
            </button>
          )}

          {/* Angka kontingen */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 lg:gap-3">
            {[
              { ikon: <Users size={16} />, nilai: angka?.atlet, label: 'Atlet', warna: '#f5c518' },
              { ikon: <Flag size={16} />, nilai: angka?.cabor, label: 'Cabang olahraga', warna: '#38bdf8' },
              { ikon: <Medal size={16} />, nilai: angka?.nomor, label: 'Nomor pertandingan', warna: '#34d399' },
              { ikon: <MapPin size={16} />, nilai: jumlahKota || undefined, label: 'Kota tuan rumah', warna: '#f472b6' },
            ].filter(x => x.nilai).map(x => (
              <div key={x.label} className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur px-3.5 py-3 lg:px-5 lg:py-4">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400" style={{ color: x.warna }}>{x.ikon}<span className="text-slate-400">{x.label}</span></div>
                <div className="text-white text-[32px] lg:text-[44px] leading-none font-extrabold mt-1.5" style={TAMPIL}><AngkaNaik nilai={x.nilai as number} /></div>
              </div>
            ))}
          </div>
          </div>

          <div className="mt-5 lg:mt-8 flex gap-2.5 lg:col-start-1 lg:row-start-2 lg:self-start">
            <button onClick={() => keJadwal(tanggalAwal(jadwal, hariIni) ?? undefined)}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 px-4 lg:px-8 py-3 lg:py-3.5 text-[14px] font-extrabold text-[#1a1200] shadow-[0_8px_30px_rgba(245,197,24,0.35)] active:scale-[0.98] transition-transform">
              <CalendarDays size={17} /> Lihat Jadwal
            </button>
            <button onClick={bagikan}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 lg:px-6 py-3 lg:py-3.5 text-[14px] font-bold text-white active:scale-[0.98] transition-transform">
              <Share2 size={17} /> {tersalin ? 'Tersalin' : 'Bagikan'}
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-3xl lg:max-w-6xl mx-auto px-4 lg:px-8 pb-12">
        {galat ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-6 text-center text-sm text-red-300">
            Jadwal sedang tidak bisa dimuat. Silakan coba lagi beberapa saat lagi.
          </div>
        ) : jadwal.length === 0 ? (
          <div className="rounded-2xl border border-white/10 px-4 py-6 text-center text-sm text-slate-400">Jadwal belum diumumkan.</div>
        ) : (
          <>
            {/* ══ JADWAL PARTAI (hari ini / terdekat) ══ */}
            {partaiSorot.length > 0 && tglSorot && (
              <section className="pt-4">
                <JudulBagian ikon={<Clock size={12} />} kecil={tglSorot === hariIni ? 'Jadwal tanding hari ini' : `Jadwal tanding · ${tglPanjang(tglSorot)}`}
                  besar={`${partaiSorot.length} partai ${tglSorot === hariIni ? 'hari ini' : 'terdekat'}`} />
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {partaiSorot.slice(0, 6).map(p => <BarisPartai key={p.id} p={p} />)}
                </div>
                {partaiSorot.length > 6 && (
                  <button onClick={() => keJadwal(tglSorot)} className="mt-3 text-sm font-bold text-sky-300">Lihat semua {partaiSorot.length} partai →</button>
                )}
              </section>
            )}

            {/* ══ SEDANG BERLANGSUNG / SEGERA ══ */}
            {(berlangsungIni.length > 0 || segera.length > 0) && (
              <section className="pt-4">
                <JudulBagian ikon={<Clock size={12} />} kecil={berlangsungIni.length ? 'Hari ini' : 'Segera dimulai'}
                  besar={berlangsungIni.length ? `${berlangsungIni.length} kegiatan sedang berlangsung` : 'Pertandingan terdekat'} />
                <div className="-mx-4 px-4 flex gap-3 overflow-x-auto pb-2 snap-x lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible" style={{ scrollbarWidth: 'none' }}>
                  {(berlangsungIni.length ? berlangsungIni : segera).map(b => {
                    const w = warnaWilayah(b.wilayah)
                    const lagi = (b as any).hari_lagi as number | undefined
                    return (
                      <button key={b.id} onClick={() => keJadwal(berlangsungIni.length ? hariIni : b.mulai as string)}
                        className="snap-start shrink-0 w-[210px] lg:w-auto text-left rounded-2xl border border-white/10 p-3.5 lg:p-4 relative overflow-hidden hover:border-white/25 transition-colors"
                        style={{ background: `linear-gradient(160deg, ${w}26, rgba(255,255,255,0.03) 60%)` }}>
                        <div className="text-3xl">{ikonCabor(b)}</div>
                        <div className="text-white font-bold text-[14px] leading-snug mt-2 line-clamp-2">{b.kegiatan}</div>
                        <div className="text-slate-400 text-xs mt-1 truncate">{b.kota}</div>
                        <div className="mt-2.5 text-[12px] font-bold" style={{ color: berlangsungIni.length ? '#34d399' : w }}>
                          {berlangsungIni.length ? '● Live hari ini' : lagi === 1 ? 'Mulai besok' : `Mulai ${lagi} hari lagi`}
                        </div>
                        <div className="text-slate-500 text-[11px]">{rentangSingkat(b.mulai, b.selesai)}</div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {!buka ? (
              /* ══ JADWAL (terlipat) ══ */
              <section ref={jadwalRef} className="pt-8 scroll-mt-4">
                <button onClick={() => keJadwal(tanggalAwal(jadwal, hariIni) ?? undefined)}
                  className="w-full text-left relative overflow-hidden rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 via-[#0a1a30] to-amber-400/10 p-5 lg:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8 active:scale-[0.99] hover:border-sky-400/60 transition-all">
                  <div className="absolute -right-8 -bottom-10 text-[120px] leading-none opacity-[0.10] select-none">🏟️</div>
                  <div className="relative">
                  <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold tracking-[0.2em] uppercase"><CalendarDays size={12} /> Jadwal lengkap & peta perjuangan</div>
                  <div className="text-white text-[24px] lg:text-[34px] leading-tight font-extrabold uppercase mt-1" style={TAMPIL}>
                    {pertandingan.length} kegiatan · {jumlahKota} kota
                  </div>
                  <div className="text-slate-300 text-[13px] mt-1">{deret.length ? `${rentangSingkat(deret[0].tanggal, akhir ?? null)} 2026 · ` : ''}per tanggal, per cabor, dan per wilayah</div>
                  </div>
                  <div className="relative mt-4 lg:mt-0 shrink-0 inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-[13px] font-bold text-white shadow-lg shadow-sky-500/25 lg:px-6 lg:py-3 lg:text-[15px]">
                    Buka jadwal lengkap <ChevronRight size={15} />
                  </div>
                </button>
              </section>
            ) : (
            <div className="animate-[muncul_.45s_ease-out]">
            {/* ══ JADWAL ══ */}
            <section ref={jadwalRef} className="pt-8 scroll-mt-4">
              <JudulBagian ikon={<CalendarDays size={12} />} kecil="Jadwal lengkap" besar="Jadwal Pertandingan" />
              <div className="flex gap-1 rounded-2xl bg-white/[0.04] border border-white/10 p-1 mb-4 lg:max-w-md">
                {([['tanggal', 'Per Tanggal'], ['semua', 'Semua Kegiatan']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-all ${tab === k ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'tanggal' ? (
                <>
                  <div ref={deretRef} className="relative -mx-4 px-4 flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {deret.map((d, i) => {
                      const dipilih = d.tanggal === pilih, kini = d.tanggal === hariIni
                      const bulanBaru = i === 0 || d.tanggal.slice(5, 7) !== deret[i - 1].tanggal.slice(5, 7)
                      const upacara = kegiatanPada(jadwal, d.tanggal).some(b => b.jenis === 'upacara')
                      const maks = Math.max(1, ...deret.map(x => x.jumlah))
                      return (
                        <div key={d.tanggal} className="flex items-end gap-2 shrink-0">
                          {bulanBaru && i > 0 && <div className="self-stretch w-px bg-white/10 mx-0.5" />}
                          <button data-pilih={dipilih ? '1' : '0'} onClick={() => setPilih(d.tanggal)}
                            className={`relative w-[60px] rounded-2xl border pt-2 pb-2.5 text-center transition-all ${dipilih ? 'bg-gradient-to-b from-amber-300 to-amber-500 border-amber-300 text-[#1a1200] scale-105 shadow-lg shadow-amber-500/30' : kini ? 'border-emerald-400/60 bg-emerald-400/10 text-white' : 'border-white/10 bg-white/[0.04] text-slate-300'} ${d.jumlah === 0 && !dipilih && !upacara ? 'opacity-40' : ''}`}>
                            {upacara && <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[11px]">🏟️</span>}
                            <div className="text-[10px] font-bold uppercase">{namaHari(d.tanggal).slice(0, 3)}</div>
                            <div className="text-[22px] font-extrabold leading-tight" style={TAMPIL}>{Number(d.tanggal.slice(8))}</div>
                            <div className="text-[10px] font-semibold">{BULAN3[Number(d.tanggal.slice(5, 7)) - 1]}</div>
                            <div className="mx-auto mt-1.5 h-1 w-8 rounded-full bg-black/20 overflow-hidden">
                              <div className={`h-full rounded-full ${dipilih ? 'bg-[#1a1200]/60' : 'bg-sky-400'}`} style={{ width: `${(d.jumlah / maks) * 100}%` }} />
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {pilih && (
                    <div className="mt-4">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-white font-bold text-[17px]">{tglPanjang(pilih)}</h3>
                        {pilih === hariIni && <span className="text-[10px] font-extrabold rounded-full px-2 py-0.5 bg-emerald-400/15 text-emerald-300">HARI INI</span>}
                        {hariPorprov(pilih) && <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-amber-300/15 text-amber-200">HARI KE-{hariPorprov(pilih)}</span>}
                        <span className="text-slate-500 text-xs ml-auto">{padaTanggal.filter(b => b.jenis === 'pertandingan').length} kegiatan</span>
                      </div>
                      {partaiTanggal.length > 0 && (
                        <div className="mb-5">
                          <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-sky-300 mb-2">Jadwal tanding · {partaiTanggal.length} partai</div>
                          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{partaiTanggal.map(p => <BarisPartai key={p.id} p={p} />)}</div>
                        </div>
                      )}
                      {partaiTanggal.length > 0 && padaTanggal.length > 0 && (
                        <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-400 mb-2">Kegiatan cabor</div>
                      )}
                      {padaTanggal.length === 0
                        ? <div className="rounded-2xl border border-white/10 px-4 py-8 text-center text-sm text-slate-500">Tidak ada pertandingan kontingen pada tanggal ini.</div>
                        : <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">{padaTanggal.map(b => <Kartu key={b.id} b={b} hariIni={hariIni} tanggal={pilih} />)}</div>}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari cabor, kota, atau venue"
                      className="w-full rounded-2xl bg-white/[0.05] border border-white/10 pl-10 pr-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-300/60" />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1" style={{ scrollbarWidth: 'none' }}>
                    {(['semua', 'berlangsung', 'akan', 'selesai'] as const).map(s => (
                      <button key={s} onClick={() => setSaring(s)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold border transition-colors ${saring === s ? 'bg-amber-300 border-amber-300 text-[#1a1200]' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}>
                        {s === 'semua' ? 'Semua' : LABEL_STATUS[s]}
                      </button>
                    ))}
                  </div>
                  <div className="text-slate-500 text-xs mt-3 mb-2">
                    {daftar.filter(b => b.jenis === 'pertandingan').length} kegiatan
                    {daftar.some(b => b.jenis === 'upacara') && ` + ${daftar.filter(b => b.jenis === 'upacara').length} upacara`}
                  </div>
                  {daftar.length === 0
                    ? <div className="rounded-2xl border border-white/10 px-4 py-8 text-center text-sm text-slate-500">Tidak ada kegiatan yang cocok.</div>
                    : <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">{daftar.map(b => <Kartu key={b.id} b={b} hariIni={hariIni} tanggal={statusKegiatan(b, hariIni) === 'berlangsung' ? hariIni : undefined} />)}</div>}
                </>
              )}
            </section>

            {/* ══ WILAYAH ══ */}
            {wilayah.length > 0 && (
              <section className="pt-10">
                <JudulBagian ikon={<IkonPeta size={12} />} kecil="Peta perjuangan" besar={`Bertanding di ${jumlahKota} kota`} />
                <div className="grid gap-3 sm:grid-cols-3">
                  {wilayah.map(w => {
                    const g = WARNA_WILAYAH[w.wilayah] ?? { utama: '#94a3b8', latar: 'from-slate-400/20 via-slate-400/5' }
                    return (
                      <div key={w.wilayah} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${g.latar} to-transparent p-4`}>
                        <div className="flex items-baseline justify-between">
                          <div className="font-extrabold text-[20px] uppercase" style={{ ...TAMPIL, color: g.utama }}>{w.wilayah}</div>
                          <div className="text-white text-[13px] font-bold">{w.kegiatan} <span className="text-slate-400 font-normal">kegiatan</span></div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {w.kota.map(k => (
                            <button key={k.nama} onClick={() => keJadwal(undefined, k.nama.toLowerCase())}
                              className="rounded-lg bg-black/25 border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-white/30">
                              {k.nama} <span style={{ color: g.utama }}>{k.kegiatan}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <div className="pt-6 text-center">
              <button onClick={tutupJadwal} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white">
                Tutup jadwal ↑
              </button>
            </div>
            </div>
            )}

            {/* ══ AJAKAN ══ */}
            <section className="pt-10">
              <div className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-400/20 via-[#0a1a30] to-sky-500/20 p-6 lg:px-10 lg:py-8 text-center lg:text-left lg:flex lg:items-center lg:gap-8">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl" />
                <div className="text-4xl lg:text-6xl relative">🏆</div>
                <div className="relative lg:flex-1">
                <div className="text-white text-[28px] lg:text-[36px] leading-tight font-extrabold uppercase mt-2 lg:mt-0" style={TAMPIL}>Dukung Atlet Kabupaten Bandung</div>
                <p className="text-slate-300 text-sm mt-2 max-w-md mx-auto lg:mx-0 lg:max-w-xl">
                  {akhir ? `Dari ${rentangSingkat(deret[0].tanggal, null)} sampai ${rentangSingkat(akhir, null)}, ` : ''}bagikan jadwal ini ke keluarga, sekolah, dan klub agar semua bisa ikut mendukung.
                </p>
                </div>
                <button onClick={bagikan} className="relative mt-4 lg:mt-0 shrink-0 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-extrabold text-[#062b14] active:scale-[0.98] transition-transform">
                  <Share2 size={16} /> Bagikan lewat WhatsApp
                </button>
              </div>
            </section>
          </>
        )}

        <footer className="mt-10 pt-6 border-t border-white/10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/kab-bandung-256.png" alt="" className="w-12 h-12 mx-auto object-contain opacity-90" />
          <div className="text-white font-bold text-sm mt-2">KONI Kabupaten Bandung</div>
          <div className="text-slate-500 text-[11px] mt-0.5">PORPROV XV Jawa Barat 2026</div>
          <div className="text-slate-500 text-[11px] mt-3 space-y-0.5">
            {diperbarui && <div>Jadwal diperbarui {new Date(diperbarui).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</div>}
            <div>Jadwal dapat berubah sesuai keputusan panitia penyelenggara.</div>
          </div>
          <a href={masuk ? '/konida/dashboard/kabbandung' : '/konida/login/kabbandung'} className="inline-block mt-4 text-[11px] text-slate-500 hover:text-slate-300">
            {masuk ? 'Buka dashboard' : 'Masuk untuk admin'} →
          </a>
        </footer>
      </main>
    </div>
  )
}
