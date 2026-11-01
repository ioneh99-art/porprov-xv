'use client'
// src/app/konida/atlet/kabbandung/bpjs/page.tsx — menu "Kartu BPJS" KONIDA Kab. Bandung.
// Rekap kartu BPJS Ketenagakerjaan: tertaut, perlu dicek (nama sama NIK beda),
// official/pengurus, dan atlet yang belum punya kartu. Data lewat
// /api/konida/kartu-bpjs/* (bergerbang sesi) — tidak ada yang lewat kunci anon.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, Maximize2, Minimize2, Copy, Download, Eye, FileSpreadsheet, Link2, Link2Off,
  Loader2, RefreshCw, Search, ShieldCheck, UserX, Users, X,
} from 'lucide-react'
import { ALAMAT_RESMI_KABBANDUNG } from '@/lib/alamat'
import { namaKartuCocok, samarkanNik } from '@/lib/kartu-bpjs'

const ACCENT = '#34d399'
const PER_HALAMAN = 30
type Tab = 'tertaut' | 'periksa' | 'official' | 'tanpa'

interface Baris {
  id: number; atlet_id: number | null; status_cocok: string; nik: string; kpj: string; nama_kartu: string
  berlaku: string | null; jumlah_unduh: number; terakhir_diunduh: string | null; sumber_halaman: number | null
  atlet: { id: number; nama: string; cabor: string | null; nik: string | null } | null
}
interface TanpaKartu { id: number; nama: string; cabor: string | null; gender: string | null; nik: string | null }
interface Rekap {
  angka: { kartu: number; tertaut: number; periksa: number; official: number; atlet: number; tanpa: number; diunduh: number }
  tertaut: Baris[]; periksa: Baris[]; official: Baris[]; tanpa: TanpaKartu[]; atletPunyaKartu: number[]
}
interface KartuTampil { kpj: string; nik_samar: string; nama_kartu: string; berlaku: string | null; jumlah_unduh: number; gambar_url: string | null; pdf_url: string | null }

const TAB: { key: Tab; label: string; warna: string }[] = [
  { key: 'tertaut', label: 'Atlet tertaut', warna: '#34d399' },
  { key: 'periksa', label: 'Perlu dicek', warna: '#fbbf24' },
  { key: 'official', label: 'Official / pengurus', warna: '#38bdf8' },
  { key: 'tanpa', label: 'Atlet belum punya kartu', warna: '#f87171' },
]

const waktu = (s: string | null) => s
  ? new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
  : '—'

/** NIK atlet vs NIK kartu: digit yang beda ditandai. */
function NikBanding({ nik, lawan }: { nik: string; lawan: string }) {
  const a = nik.replace(/\D/g, ''), b = lawan.replace(/\D/g, '')
  return (
    <span className="font-mono tracking-wide">
      {a.split('').map((c, i) => <span key={i} className={c !== b[i] ? 'text-amber-300 font-bold underline decoration-amber-400/60' : ''}>{c}</span>)}
    </span>
  )
}

export default function MenuKartuBpjs() {
  const [data, setData] = useState<Rekap | null>(null)
  const [galat, setGalat] = useState('')
  const [tab, setTab] = useState<Tab>('tertaut')
  const [q, setQ] = useState('')
  const [cabor, setCabor] = useState('')
  const [lihat, setLihat] = useState<{ id: number; judul: string } | null>(null)
  const [kartu, setKartu] = useState<KartuTampil | null>(null)
  const [kartuGalat, setKartuGalat] = useState('')
  const [proses, setProses] = useState<number | null>(null)
  const [pesan, setPesan] = useState('')
  // Daftar tampil ringkas dulu (30 baris) supaya halaman tidak panjang.
  const [batas, setBatas] = useState(PER_HALAMAN)
  useEffect(() => { setBatas(PER_HALAMAN) }, [tab, q, cabor])

  const muat = useCallback(async () => {
    setGalat('')
    try {
      const r = await fetch('/api/konida/kartu-bpjs/rekap', { cache: 'no-store' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Gagal memuat.')
      setData(d)
    } catch (e: any) { setGalat(e.message) }
  }, [])
  useEffect(() => { void muat() }, [muat])

  useEffect(() => {
    if (!lihat) { setKartu(null); return }
    setKartu(null); setKartuGalat('')
    fetch(`/api/konida/kartu-bpjs?kartu_id=${lihat.id}`)
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setKartu(d.kartu?.[0] ?? null) })
      .catch(e => setKartuGalat(e.message || 'Gagal memuat kartu.'))
  }, [lihat])

  const daftarCabor = useMemo(() => {
    if (!data) return []
    const s = new Set<string>()
    for (const r of [...data.tertaut, ...data.periksa]) if (r.atlet?.cabor) s.add(r.atlet.cabor)
    for (const a of data.tanpa) if (a.cabor) s.add(a.cabor)
    return Array.from(s).sort()
  }, [data])

  // cab === undefined → saringan cabor tidak berlaku (tab official tidak punya cabor)
  const cocokCari = useCallback((teks: (string | null | undefined)[], cab: string | null | undefined) => {
    const s = q.trim().toLowerCase()
    if (cabor && cab !== undefined && cab !== cabor) return false
    return !s || teks.some(t => t?.toLowerCase().includes(s))
  }, [q, cabor])

  const barisKartu = useMemo(() => {
    if (!data || tab === 'tanpa') return []
    return data[tab].filter(r => cocokCari([r.nama_kartu, r.atlet?.nama, r.kpj, r.atlet?.cabor], tab === 'official' ? undefined : (r.atlet?.cabor ?? null)))
  }, [data, tab, cocokCari, cabor])
  const barisTanpa = useMemo(() => data ? data.tanpa.filter(a => cocokCari([a.nama, a.cabor], a.cabor ?? null)) : [], [data, cocokCari])

  const punya = useMemo(() => new Set(data?.atletPunyaKartu ?? []), [data])

  async function ubahTaut(aksi: 'tautkan' | 'lepas', r: Baris) {
    const kalimat = aksi === 'tautkan'
      ? `Tautkan kartu "${r.nama_kartu}" ke atlet "${r.atlet?.nama}"?\n\nNIK di kartu BEDA dengan NIK atlet. Pastikan sudah dicek dengan KTP asli.`
      : `Lepas kartu "${r.nama_kartu}" dari atlet "${r.atlet?.nama}"? Kartu kembali ke daftar "Perlu dicek".`
    if (!window.confirm(kalimat)) return
    setProses(r.id); setPesan('')
    try {
      const res = await fetch('/api/konida/kartu-bpjs/tautkan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aksi, kartu_id: r.id, atlet_id: r.atlet?.id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Gagal.')
      setPesan(aksi === 'tautkan' ? `✓ Kartu ${r.nama_kartu} ditautkan.` : `✓ Tautan ${r.nama_kartu} dilepas.`)
      await muat()
    } catch (e: any) { setPesan(`✗ ${e.message}`) } finally { setProses(null) }
  }

  async function salinTautan() {
    const teks = `Kartu BPJS Ketenagakerjaan atlet & official KONI Kab. Bandung PORPROV XV 2026 bisa diunduh di ${ALAMAT_RESMI_KABBANDUNG}/bpjs — cari nama Anda lalu masukkan NIK (16 angka di KTP).`
    try { await navigator.clipboard.writeText(teks); setPesan('✓ Pesan + tautan /bpjs disalin. Tempel di WhatsApp.') }
    catch { window.prompt('Salin pesan ini:', teks) }
  }

  async function unduhExcel() {
    if (!data) return
    const XLSX = await import('xlsx')
    const judul = TAB.find(t => t.key === tab)!.label
    let baris: Record<string, any>[]
    if (tab === 'tanpa') {
      baris = barisTanpa.map((a, i) => ({ No: i + 1, 'Nama atlet': a.nama, Cabor: a.cabor ?? '', 'L/P': a.gender ?? '', NIK: a.nik ?? '' }))
    } else {
      baris = barisKartu.map((r, i) => ({
        No: i + 1, 'Nama di kartu': r.nama_kartu, 'NIK di kartu': r.nik, 'No. peserta (KPJ)': r.kpj, 'Berlaku s.d.': r.berlaku ?? '',
        ...(tab !== 'official' ? { 'Nama atlet': r.atlet?.nama ?? '', Cabor: r.atlet?.cabor ?? '', 'NIK atlet di sistem': r.atlet?.nik ?? '' } : {}),
        ...(tab === 'tertaut' ? { Tautan: r.status_cocok === 'manual' ? 'manual (dicek KONIDA)' : 'NIK sama' } : {}),
        'Diunduh pemilik': r.jumlah_unduh, 'Hal. PDF': r.sumber_halaman ?? '',
      }))
    }
    const ws = XLSX.utils.json_to_sheet(baris)
    ws['!cols'] = Object.keys(baris[0] ?? { a: 1 }).map(k => ({ wch: Math.max(8, Math.min(34, k.length + 6)) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, judul.slice(0, 30))
    const tgl = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    XLSX.writeFile(wb, `Kartu_BPJS_KabBandung_${judul.replace(/[^A-Za-z]+/g, '_')}_${tgl}.xlsx`)
  }

  const a = data?.angka
  const KOTAK = a ? [
    { label: 'Total kartu', nilai: a.kartu, ikon: ShieldCheck, warna: '#e2e8f0' },
    { label: 'Tertaut ke atlet', nilai: a.tertaut, ikon: CheckCircle2, warna: '#34d399', tab: 'tertaut' as Tab },
    { label: 'Perlu dicek', nilai: a.periksa, ikon: AlertTriangle, warna: '#fbbf24', tab: 'periksa' as Tab },
    { label: 'Official / pengurus', nilai: a.official, ikon: Users, warna: '#38bdf8', tab: 'official' as Tab },
    { label: `Atlet belum punya kartu (dari ${a.atlet})`, nilai: a.tanpa, ikon: UserX, warna: '#f87171', tab: 'tanpa' as Tab },
    { label: 'Sudah diunduh pemilik', nilai: a.diunduh, ikon: Download, warna: '#a78bfa' },
  ] : []

  return (
    <div className="min-h-screen text-zinc-300" style={{ background: 'linear-gradient(135deg,#020a14 0%,#03101c 100%)' }}>
      {/* HEADER */}
      <div className="sticky top-0 z-30 border-b backdrop-blur-xl px-4 md:px-6 py-4" style={{ background: 'rgba(2,10,20,0.95)', borderColor: `${ACCENT}18` }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}30` }}>
              <ShieldCheck size={20} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-white">Kartu BPJS Ketenagakerjaan</h1>
              <p className="text-[11px] text-zinc-500">Atlet & official · Kab. Bandung · PORPROV XV</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={salinTautan} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-300"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <Copy size={12} /> Salin tautan /bpjs
            </button>
            <button onClick={unduhExcel} disabled={!data} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-sky-300 disabled:opacity-40"
              style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)' }}>
              <FileSpreadsheet size={12} /> Unduh Excel
            </button>
            <button onClick={() => { setData(null); void muat() }} className="p-2 rounded-xl text-zinc-400 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.1)' }} aria-label="Muat ulang">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 space-y-5">
        {galat && <div className="rounded-xl px-4 py-3 text-sm text-rose-300" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>{galat}</div>}
        {pesan && <div className={`rounded-xl px-4 py-2.5 text-sm ${pesan.startsWith('✗') ? 'text-rose-300' : 'text-emerald-300'}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>{pesan}</div>}

        {!data && !galat && <div className="flex items-center gap-2 text-sm text-zinc-500 py-10 justify-center"><Loader2 size={16} className="animate-spin" /> Memuat kartu BPJS…</div>}

        {data && (
          <>
            {/* ANGKA */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {KOTAK.map(k => (
                <button key={k.label} onClick={() => k.tab && setTab(k.tab)} disabled={!k.tab}
                  className={`text-left rounded-2xl p-4 transition-colors ${k.tab ? 'hover:bg-white/[0.05] cursor-pointer' : 'cursor-default'}`}
                  style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${k.tab === tab ? k.warna + '60' : 'rgba(255,255,255,0.07)'}` }}>
                  <k.ikon size={15} style={{ color: k.warna }} />
                  <div className="text-2xl font-black text-white mt-2 tabular-nums">{k.nilai.toLocaleString('id-ID')}</div>
                  <div className="text-[11px] text-zinc-500 leading-tight mt-0.5">{k.label}</div>
                </button>
              ))}
            </div>

            {/* TAB + SARING */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
              <div className="flex gap-1.5 flex-wrap">
                {TAB.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${tab === t.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    style={{ background: tab === t.key ? `${t.warna}1f` : 'transparent', border: `1px solid ${tab === t.key ? t.warna + '55' : 'rgba(255,255,255,0.07)'}` }}>
                    {t.label} <span className="ml-1 tabular-nums opacity-70">{data.angka[t.key]}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 lg:w-64">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / KPJ…"
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-zinc-200 outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                {tab !== 'official' && (
                  <select value={cabor} onChange={e => setCabor(e.target.value)} className="max-w-[45%] px-3 py-2 rounded-xl text-sm text-zinc-200 outline-none"
                    style={{ background: '#07131f', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <option value="">Semua cabor</option>
                    {daftarCabor.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
            </div>

            {tab === 'periksa' && (
              <div className="rounded-xl px-4 py-3 text-xs text-amber-200/90 flex gap-2 items-start" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                <span>Nama di kartu sama dengan atlet, tetapi <b>NIK berbeda</b> (angka yang beda diberi garis bawah kuning). Cek KTP asli dulu. Kalau NIK di kartu yang salah, laporkan ke BPJS. Kalau NIK atlet di sistem yang salah, perbaiki data atletnya. Tekan <b>Tautkan</b> hanya bila yakin kartu ini milik atlet tersebut.</span>
              </div>
            )}

            {/* DAFTAR */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              {tab === 'tanpa' ? (
                barisTanpa.length === 0 ? <Kosong /> : (
                  <div className="divide-y divide-white/5">
                    {barisTanpa.slice(0, batas).map((t, i) => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="w-8 text-[11px] text-zinc-600 tabular-nums">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-zinc-200 truncate">{t.nama}</div>
                          <div className="text-[11px] text-zinc-500 truncate">{t.cabor || '—'}{t.gender ? ` · ${t.gender === 'L' ? 'Putra' : 'Putri'}` : ''}</div>
                        </div>
                        <span className="hidden sm:inline font-mono text-[11px] text-zinc-500">{t.nik ? samarkanNik(t.nik) : 'NIK kosong'}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : barisKartu.length === 0 ? <Kosong /> : (
                <div className="divide-y divide-white/5">
                  {barisKartu.slice(0, batas).map((r, i) => (
                    <div key={r.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="w-8 shrink-0 text-[11px] text-zinc-600 tabular-nums pt-0.5">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          {tab === 'periksa' && r.atlet ? (
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Di kartu BPJS</div>
                                <div className="font-semibold text-zinc-100">{r.nama_kartu}</div>
                                <NikBanding nik={r.nik} lawan={r.atlet.nik ?? ''} />
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Atlet di sistem · {r.atlet.cabor || '—'}</div>
                                <div className="font-semibold text-zinc-100">{r.atlet.nama}</div>
                                {r.atlet.nik ? <NikBanding nik={r.atlet.nik} lawan={r.nik} /> : <span className="text-zinc-500">NIK kosong</span>}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold text-zinc-200 truncate text-sm">
                                {r.atlet?.nama ?? r.nama_kartu}
                                {r.status_cocok === 'manual' && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold align-middle">DITAUT MANUAL</span>}
                              </div>
                              <div className="text-[11px] text-zinc-500 truncate">
                                {r.atlet?.cabor ? `${r.atlet.cabor} · ` : ''}KPJ <span className="font-mono">{r.kpj}</span> · NIK <span className="font-mono">{samarkanNik(r.nik)}</span>
                                {r.atlet && !namaKartuCocok(r.nama_kartu, r.atlet.nama) && <> · di kartu: {r.nama_kartu}</>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-11 md:pl-0 shrink-0">
                        <span className="text-[10px] text-zinc-500 w-28 md:text-right" title={r.terakhir_diunduh ? `Terakhir ${waktu(r.terakhir_diunduh)}` : ''}>
                          {r.jumlah_unduh > 0 ? `Diunduh ${r.jumlah_unduh}× · ${waktu(r.terakhir_diunduh)}` : 'Belum diunduh'}
                        </span>
                        <button onClick={() => setLihat({ id: r.id, judul: r.atlet?.nama ?? r.nama_kartu })}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-300 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                          <Eye size={12} /> Kartu
                        </button>
                        {tab === 'periksa' && r.atlet && (
                          <button onClick={() => ubahTaut('tautkan', r)} disabled={proses === r.id || punya.has(r.atlet.id)}
                            title={punya.has(r.atlet.id) ? 'Atlet ini sudah punya kartu lain' : ''}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-200 disabled:opacity-40"
                            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
                            {proses === r.id ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} Tautkan
                          </button>
                        )}
                        {tab === 'tertaut' && r.status_cocok === 'manual' && (
                          <button onClick={() => ubahTaut('lepas', r)} disabled={proses === r.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-rose-300 disabled:opacity-40"
                            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Link2Off size={12} /> Lepas
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <AturPanjang total={tab === 'tanpa' ? barisTanpa.length : barisKartu.length} batas={batas} setBatas={setBatas} />
            <p className="text-[11px] text-zinc-600">
              Atlet & official mengunduh kartunya sendiri di <span className="text-zinc-400">{ALAMAT_RESMI_KABBANDUNG.replace('https://', '')}/bpjs</span> dengan NIK yang tercetak di kartu.
              Kartu baru dari BPJS bisa ditambahkan dengan skrip impor (minta ke tim IT).
            </p>
          </>
        )}
      </div>

      {/* MODAL KARTU */}
      {lihat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setLihat(null)}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: '#07131f', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-white truncate">{lihat.judul}</div>
              <button onClick={() => setLihat(null)} className="p-1 text-zinc-500 hover:text-white" aria-label="Tutup"><X size={18} /></button>
            </div>
            {kartuGalat ? <div className="text-sm text-rose-300">{kartuGalat}</div>
              : !kartu ? <div className="flex items-center gap-2 text-sm text-zinc-500 py-8 justify-center"><Loader2 size={14} className="animate-spin" /> Memuat kartu…</div>
              : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {kartu.gambar_url && <img src={kartu.gambar_url} alt={`Kartu BPJS ${kartu.nama_kartu}`} className="w-full rounded-xl shadow-lg" />}
                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div><div className="text-[10px] text-zinc-500">No. peserta (KPJ)</div><div className="font-mono font-semibold text-zinc-200">{kartu.kpj}</div></div>
                    <div><div className="text-[10px] text-zinc-500">Berlaku s.d.</div><div className="font-semibold text-zinc-200">{kartu.berlaku || '—'}</div></div>
                    <div><div className="text-[10px] text-zinc-500">NIK di kartu</div><div className="font-mono font-semibold text-zinc-200">{kartu.nik_samar}</div></div>
                    <div><div className="text-[10px] text-zinc-500">Diunduh pemilik</div><div className="font-semibold text-zinc-200">{kartu.jumlah_unduh}×</div></div>
                  </div>
                  {kartu.pdf_url && (
                    <a href={kartu.pdf_url} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-[#04210f] bg-emerald-400 hover:bg-emerald-300">
                      <Download size={14} /> Unduh PDF
                    </a>
                  )}
                </>
              )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Tampilkan 30 lagi / semua / ringkas lagi. */
function AturPanjang({ total, batas, setBatas }: { total: number; batas: number; setBatas: (n: number) => void }) {
  if (total <= PER_HALAMAN) return null
  const tampil = Math.min(batas, total)
  const tombol = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold'
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <span className="text-[11px] text-zinc-500">Menampilkan {tampil.toLocaleString('id-ID')} dari {total.toLocaleString('id-ID')}</span>
      <div className="flex gap-2 flex-wrap">
        {tampil < total && (
          <>
            <button onClick={() => setBatas(batas + PER_HALAMAN)} className={`${tombol} text-emerald-300`}
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <ChevronDown size={13} /> Tampilkan {Math.min(PER_HALAMAN, total - tampil)} lagi
            </button>
            <button onClick={() => setBatas(total)} className={`${tombol} text-zinc-300`} style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              <Maximize2 size={12} /> Tampilkan semua
            </button>
          </>
        )}
        {tampil > PER_HALAMAN && (
          <button onClick={() => { setBatas(PER_HALAMAN); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className={`${tombol} text-zinc-300`}
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <Minimize2 size={12} /> Ringkas lagi
          </button>
        )}
      </div>
    </div>
  )
}

function Kosong() {
  return <div className="px-4 py-10 text-center text-sm text-zinc-500">Tidak ada data untuk saringan ini.</div>
}
