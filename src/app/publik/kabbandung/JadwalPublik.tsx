'use client'
// Tampilan halaman publik jadwal kontingen Kab. Bandung — dirancang untuk HP.
// Status (berlangsung/akan datang/selesai) dihitung di peramban dengan tanggal
// WIB, supaya tetap benar walau halaman tersimpan di cache server.

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, LayoutDashboard, LogIn, MapPin, Search, Trophy } from 'lucide-react'
import { tanggalWIB, hariPorprov, PORPROV_MULAI } from '@/lib/lapor'
import { hitungMundur } from '@/lib/layar'
import {
  LABEL_STATUS, cocokCari, deretTanggal, hariKe, kegiatanPada, namaHari, rentangSingkat, statusKegiatan,
  tanggalAwal, tglPanjang, urutDaftar, type BarisPublik, type StatusKegiatan,
} from '@/lib/jadwal-publik'

const WARNA: Record<StatusKegiatan, string> = { berlangsung: '#34d399', akan: '#38bdf8', selesai: '#64748b', tanpa_tanggal: '#64748b' }
const BULAN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

function Lencana({ status }: { status: StatusKegiatan }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ color: WARNA[status], background: WARNA[status] + '1a', border: `1px solid ${WARNA[status]}40` }}>
      {status === 'berlangsung' && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: WARNA[status] }} />}
      {LABEL_STATUS[status]}
    </span>
  )
}

function Kartu({ b, hariIni, tanggal }: { b: BarisPublik; hariIni: string; tanggal?: string }) {
  const status = statusKegiatan(b, hariIni)
  const upacara = b.jenis === 'upacara'
  const urutan = tanggal ? hariKe(b, tanggal) : null
  const tampilCabor = b.cabor && !norm(b.kegiatan).includes(norm(b.cabor))
  const warna = upacara ? '#fbbf24' : WARNA[status]
  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-900/70 pl-4 pr-3 py-3 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: warna }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-white font-semibold text-[15px] leading-snug">
            {upacara && <Trophy size={14} className="text-amber-400 shrink-0" />}
            <span className="break-words">{upacara ? b.kegiatan.replace(/\s*PORPROV XV 2026$/i, '') : b.kegiatan}</span>
          </div>
          {tampilCabor && <div className="text-slate-400 text-xs mt-0.5">{b.cabor}</div>}
          {b.venue && (
            <div className="flex items-start gap-1 text-slate-300 text-[13px] mt-1.5">
              <MapPin size={13} className="text-sky-400 shrink-0 mt-0.5" />
              <span className="break-words">{b.venue.replace(/ \| /g, ' · ')}</span>
            </div>
          )}
          {b.kota && <div className="text-slate-500 text-xs mt-0.5 pl-[17px]">{b.kota}{b.wilayah ? ` · ${b.wilayah}` : ''}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-white text-[13px] font-semibold whitespace-nowrap">{rentangSingkat(b.mulai, b.selesai)}</div>
          <div className="mt-1"><Lencana status={status} /></div>
          {urutan && urutan.dari > 1 && <div className="text-slate-500 text-[10px] mt-1 whitespace-nowrap">Hari ke-{urutan.ke} dari {urutan.dari}</div>}
        </div>
      </div>
    </div>
  )
}

export default function JadwalPublik({ jadwal, diperbarui, hariIniServer, galat }: {
  jadwal: BarisPublik[]; diperbarui: string | null; hariIniServer: string; galat: boolean
}) {
  const [hariIni, setHariIni] = useState(hariIniServer)
  const [masuk, setMasuk] = useState(false)
  const [tab, setTab] = useState<'tanggal' | 'semua'>('tanggal')
  const [pilih, setPilih] = useState<string | null>(() => tanggalAwal(jadwal, hariIniServer))
  const [cari, setCari] = useState('')
  const [saring, setSaring] = useState<'semua' | StatusKegiatan>('semua')
  const deretRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const kini = tanggalWIB()
    setHariIni(kini)
    if (kini !== hariIniServer) setPilih(tanggalAwal(jadwal, kini))
    // Kuki user_level ada selama sesi admin masih terbuka; gerbang sebenarnya tetap di server.
    setMasuk(document.cookie.split('; ').some(c => c.startsWith('user_level=') && c.length > 'user_level='.length))
  }, [hariIniServer, jadwal])

  useEffect(() => {
    deretRef.current?.querySelector<HTMLElement>('[data-pilih="1"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pilih, tab])

  const pertandingan = jadwal.filter(b => b.jenis === 'pertandingan')
  const jumlahCabor = new Set(pertandingan.map(b => norm(b.cabor ?? b.kegiatan))).size
  const jumlahKota = new Set(pertandingan.map(b => norm(b.kota)).filter(Boolean)).size
  const berlangsung = pertandingan.filter(b => statusKegiatan(b, hariIni) === 'berlangsung').length
  const deret = useMemo(() => deretTanggal(jadwal), [jadwal])
  const padaTanggal = pilih ? kegiatanPada(jadwal, pilih) : []
  const daftar = urutDaftar(jadwal, hariIni).filter(b => cocokCari(b, cari) && (saring === 'semua' || statusKegiatan(b, hariIni) === saring))

  const mundur = hitungMundur(hariIni)
  const hariKeBerapa = hariPorprov(hariIni)
  const pembukaan = jadwal.find(b => b.jenis === 'upacara' && /PEMBUKAAN/i.test(b.kegiatan))
  const pertama = urutDaftar(pertandingan.filter(b => statusKegiatan(b, hariIni) === 'akan'), hariIni)[0]

  return (
    <div className="min-h-screen bg-[#030b16] text-slate-200">
      {/* ── Kepala ── */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#030b16]/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/kab-bandung.png" alt="" className="w-8 h-8 object-contain shrink-0" />
            <div className="min-w-0">
              <div className="text-white text-sm font-bold leading-tight truncate">KONI Kabupaten Bandung</div>
              <div className="text-slate-500 text-[10px] leading-tight truncate">PORPROV XV Jawa Barat 2026</div>
            </div>
          </div>
          <a href={masuk ? '/konida/dashboard/kabbandung' : '/konida/login/kabbandung'}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-[13px] font-semibold text-white transition-colors">
            {masuk ? <><LayoutDashboard size={14} /> Dashboard</> : <><LogIn size={14} /> Masuk</>}
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-10">
        {/* ── Judul & ringkasan ── */}
        <section className="pt-6 pb-4">
          <div className="text-sky-400 text-[11px] font-bold tracking-[0.18em] uppercase">Kontingen Kabupaten Bandung</div>
          <h1 className="text-white text-2xl sm:text-3xl font-bold mt-1">Jadwal Pertandingan</h1>
          {!galat && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-400 mt-2">
              <span><b className="text-white">{pertandingan.length}</b> kegiatan</span>
              <span><b className="text-white">{jumlahCabor}</b> cabor</span>
              <span><b className="text-white">{jumlahKota}</b> kota</span>
              {berlangsung > 0 && <span className="text-emerald-400"><b>{berlangsung}</b> berlangsung hari ini</span>}
            </div>
          )}

          {!galat && (mundur || hariKeBerapa) && (
            <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 flex items-center gap-4">
              <div className="text-amber-300 font-black text-3xl leading-none whitespace-nowrap">
                {mundur ? `H-${mundur}` : `Hari ke-${hariKeBerapa}`}
              </div>
              <div className="min-w-0 text-[13px]">
                {mundur ? (
                  <>
                    <div className="text-white font-semibold">Upacara Pembukaan</div>
                    <div className="text-slate-400">{tglPanjang(pembukaan?.mulai ?? PORPROV_MULAI)}{pembukaan?.venue ? ` · ${pembukaan.venue}` : ''}</div>
                    {pertama && pertama.mulai && pertama.mulai < (pembukaan?.mulai ?? PORPROV_MULAI) && (
                      <div className="text-slate-500 text-xs mt-0.5">Pertandingan pertama: {pertama.kegiatan}, {rentangSingkat(pertama.mulai, pertama.mulai)}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-white font-semibold">PORPROV XV Jawa Barat 2026</div>
                    <div className="text-slate-400">{tglPanjang(hariIni)}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {galat ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-6 text-center text-sm text-red-300">
            Jadwal sedang tidak bisa dimuat. Silakan coba lagi beberapa saat lagi.
          </div>
        ) : jadwal.length === 0 ? (
          <div className="rounded-xl border border-slate-800 px-4 py-6 text-center text-sm text-slate-400">Jadwal belum diumumkan.</div>
        ) : (
          <>
            {/* ── Tab ── */}
            <div className="flex gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1 mb-4">
              {([['tanggal', 'Per Tanggal'], ['semua', 'Semua Kegiatan']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors ${tab === k ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'tanggal' ? (
              <>
                <div ref={deretRef} className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
                  {deret.map(d => {
                    const dipilih = d.tanggal === pilih, kini = d.tanggal === hariIni
                    return (
                      <button key={d.tanggal} data-pilih={dipilih ? '1' : '0'} onClick={() => setPilih(d.tanggal)}
                        className={`snap-center shrink-0 w-[58px] rounded-xl border py-2 text-center transition-colors ${dipilih ? 'bg-sky-600 border-sky-500 text-white' : kini ? 'border-emerald-500/50 bg-slate-900 text-white' : 'border-slate-800 bg-slate-900 text-slate-300'} ${d.jumlah === 0 && !dipilih ? 'opacity-40' : ''}`}>
                        <div className="text-[10px] uppercase">{namaHari(d.tanggal).slice(0, 3)}</div>
                        <div className="text-lg font-bold leading-tight">{Number(d.tanggal.slice(8))}</div>
                        <div className="text-[10px]">{BULAN3[Number(d.tanggal.slice(5, 7)) - 1]}</div>
                        <div className={`text-[10px] font-semibold mt-0.5 ${dipilih ? 'text-sky-100' : 'text-sky-400'}`}>{d.jumlah || '–'}</div>
                      </button>
                    )
                  })}
                </div>

                {pilih && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays size={16} className="text-sky-400" />
                      <h2 className="text-white font-semibold">{tglPanjang(pilih)}</h2>
                      {pilih === hariIni && <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-400">HARI INI</span>}
                    </div>
                    {padaTanggal.length === 0
                      ? <div className="rounded-xl border border-slate-800 px-4 py-6 text-center text-sm text-slate-500">Tidak ada pertandingan kontingen pada tanggal ini.</div>
                      : <div className="space-y-2">{padaTanggal.map(b => <Kartu key={b.id} b={b} hariIni={hariIni} tanggal={pilih} />)}</div>}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari cabor, kota, atau venue"
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500" />
                </div>
                <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1" style={{ scrollbarWidth: 'none' }}>
                  {(['semua', 'berlangsung', 'akan', 'selesai'] as const).map(s => (
                    <button key={s} onClick={() => setSaring(s)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${saring === s ? 'bg-sky-600 border-sky-500 text-white' : 'border-slate-800 bg-slate-900 text-slate-400'}`}>
                      {s === 'semua' ? 'Semua' : LABEL_STATUS[s]}
                    </button>
                  ))}
                </div>
                <div className="text-slate-500 text-xs mt-3 mb-2">
                  {daftar.filter(b => b.jenis === 'pertandingan').length} kegiatan
                  {daftar.some(b => b.jenis === 'upacara') && ` + ${daftar.filter(b => b.jenis === 'upacara').length} upacara`}
                </div>
                {daftar.length === 0
                  ? <div className="rounded-xl border border-slate-800 px-4 py-6 text-center text-sm text-slate-500">Tidak ada kegiatan yang cocok.</div>
                  : <div className="space-y-2">{daftar.map(b => <Kartu key={b.id} b={b} hariIni={hariIni} tanggal={statusKegiatan(b, hariIni) === 'berlangsung' ? hariIni : undefined} />)}</div>}
              </>
            )}
          </>
        )}

        <footer className="mt-10 pt-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
          {diperbarui && <div>Jadwal diperbarui {new Date(diperbarui).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</div>}
          <div>Jadwal dapat berubah sesuai keputusan panitia penyelenggara. Sumber: KONI Kabupaten Bandung.</div>
        </footer>
      </main>
    </div>
  )
}
