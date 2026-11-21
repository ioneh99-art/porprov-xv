'use client'
// src/components/porprov15/RaporKontingen.tsx
// Rapor Kontingen & Peta Kekuatan PORPROV XV — dipakai di dasbor KONI Jabar dan (bila dibuka)
// aplikasi KONI Kab. Bandung. Data dari /api/porprov15/rapor-kontingen (gudang arsip situs panitia).

import { Fragment, useEffect, useMemo, useState } from 'react'
import { BarChart3, Grid3x3, Trophy, AlertTriangle, ChevronDown, ChevronRight, RefreshCw, Sprout } from 'lucide-react'
import BibitAtlet from './BibitAtlet'
import type { Rapor, RaporKontingen as RK, RingkasCabor, Persaingan } from '@/lib/rapor-kontingen'

const WARNA = { emas: '#F5C518', perak: '#cbd5e1', perunggu: '#d97706' }
const WARNA_PERSAINGAN: Record<Persaingan, string> = { Dikuasai: '#f87171', Bersaing: '#fbbf24', Merata: '#34d399', 'Belum ada emas': '#64748b' }
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const persen = (x: number | null, d = 0) => (x == null ? '—' : `${(x * 100).toFixed(d)}%`)
const angka = (x: number | null) => (x == null ? '—' : x.toLocaleString('id-ID', { maximumFractionDigits: 1 }))

type Tab = 'rapor' | 'peta' | 'cabor' | 'bibit'
type Urut = 'peringkat' | 'efisiensi' | 'emas100' | 'menang'

function Medali({ e, p, g, kecil }: { e: number; p: number; g: number; kecil?: boolean }) {
  const c = kecil ? 'text-[10px]' : 'text-xs'
  return (
    <span className={`font-mono tabular-nums ${c}`}>
      <span style={{ color: WARNA.emas }}>{e}</span><span className="text-slate-600">/</span>
      <span style={{ color: WARNA.perak }}>{p}</span><span className="text-slate-600">/</span>
      <span style={{ color: WARNA.perunggu }}>{g}</span>
    </span>
  )
}

function Batang({ nilai, maks, warna }: { nilai: number | null; maks: number; warna: string }) {
  const w = nilai == null || maks <= 0 ? 0 : Math.max(2, (nilai / maks) * 100)
  return <div className="h-1 rounded-full bg-white/5 mt-1"><div className="h-1 rounded-full" style={{ width: `${w}%`, background: warna }} /></div>
}

export default function RaporKontingen({ sorotKontingenId, aksen = '#38bdf8' }: { sorotKontingenId?: number; aksen?: string }) {
  const [data, setData] = useState<(Rapor & { arsip: string | null }) | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [tab, setTab] = useState<Tab>('rapor')
  const [urut, setUrut] = useState<Urut>('peringkat')
  const [buka, setBuka] = useState<number | null>(null)
  const [modePeta, setModePeta] = useState<'emas' | 'poin'>('emas')
  const [fPersaingan, setFPersaingan] = useState<Persaingan | ''>('')

  const muat = async () => {
    setMemuat(true); setGalat(null)
    try {
      const r = await fetch('/api/porprov15/rapor-kontingen', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Gagal memuat.')
      setData(j)
    } catch (e: any) { setGalat(e.message) }
    setMemuat(false)
  }
  useEffect(() => { muat() }, [])

  const g = useMemo(() => {
    if (!data) return null
    const namaCabor = new Map(data.cabor.map(c => [c.situsId, c.nama]))
    const kunci: Record<Urut, (k: RK) => number> = {
      peringkat: k => -(k.peringkat ?? 999),
      efisiensi: k => k.medaliPer100Atlet ?? -1,
      emas100: k => k.emasPer100Atlet ?? -1,
      menang: k => k.tingkatMenang ?? -1,
    }
    const kontingen = [...data.kontingen].sort((a, b) => kunci[urut](b) - kunci[urut](a))
    const maks = {
      eff: Math.max(...data.kontingen.map(k => k.medaliPer100Atlet ?? 0)),
      emas100: Math.max(...data.kontingen.map(k => k.emasPer100Atlet ?? 0)),
    }
    const tergantung = data.kontingen.filter(k => k.caborUtama && k.emas >= 3)
      .sort((a, b) => (b.caborUtama!.porsi - a.caborUtama!.porsi)).slice(0, 8)
    const caborPeta = data.cabor.filter(c => c.medali > 0)
    const maksSel = new Map(caborPeta.map(c => [c.situsId, Math.max(1, ...data.kontingen.map(k => {
      const s = data.peta[k.situsId]?.[c.situsId]; if (!s) return 0
      return modePeta === 'emas' ? s.emas : s.emas * 3 + s.perak * 2 + s.perunggu
    }))]))
    const label: Record<string, number> = {}
    data.cabor.forEach(c => { label[c.persaingan] = (label[c.persaingan] ?? 0) + 1 })
    return { namaCabor, kontingen, maks, tergantung, caborPeta, maksSel, label }
  }, [data, urut, modePeta])

  if (memuat && !data) return <div className="rounded-2xl p-6 text-sm text-slate-400" style={kartu}>Memuat rapor dari gudang PORPROV XV…</div>
  if (galat) return <div className="rounded-2xl p-6 text-sm text-red-300" style={kartu}>{galat} <button onClick={muat} className="underline ml-2">Coba lagi</button></div>
  if (!data || !g) return null

  const sorot = (k: { kontingenId: number | null }) => sorotKontingenId != null && k.kontingenId === sorotKontingenId
  const tombolTab = (t: Tab, label: string, Icon: any) => (
    <button onClick={() => setTab(t)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${tab === t ? 'text-white' : 'text-slate-400 border-white/10 hover:bg-white/5'}`}
      style={tab === t ? { background: `${aksen}20`, borderColor: `${aksen}60`, color: aksen } : {}}>
      <Icon size={13} /> {label}
    </button>
  )

  return (
    <div className="space-y-5">
      {/* Ringkas */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {([['Kontingen', data.ringkas.kontingen], ['Cabor', data.ringkas.cabor], ['Nomor', data.ringkas.nomor], ['Medali', data.ringkas.medali], ['Atlet', data.ringkas.atlet], ['Laga', data.ringkas.laga]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl px-3 py-2.5" style={kartu}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{l}</div>
            <div className="text-lg font-black text-white tabular-nums">{v.toLocaleString('id-ID')}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-slate-500 -mt-2">
        Sumber: arsip situs panitia PORPROV XV ({data.arsip ?? '—'}). Medali per kontingen {data.selisihKlasemen.length === 0
          ? <span className="text-emerald-400">sama dengan klasemen resmi (27/27)</span>
          : <span className="text-red-400">berbeda di {data.selisihKlasemen.length} kontingen</span>}. Beregu dihitung satu medali, sama seperti klasemen.
      </div>

      <div className="flex flex-wrap gap-2">
        {tombolTab('rapor', 'Rapor Kontingen', Trophy)}
        {tombolTab('peta', 'Peta Kekuatan', Grid3x3)}
        {tombolTab('cabor', 'Cabor & Penguasa', BarChart3)}
        {tombolTab('bibit', 'Bibit Atlet', Sprout)}
        <button onClick={muat} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-400 hover:bg-white/5">
          <RefreshCw size={12} className={memuat ? 'animate-spin' : ''} /> Muat ulang
        </button>
      </div>

      {tab === 'rapor' && (
        <>
          <div className="rounded-2xl p-4 overflow-x-auto" style={kartu}>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div>
                <div className="text-sm font-bold text-white">Rapor 27 kontingen</div>
                <div className="text-[11px] text-slate-500">Efisiensi = medali per 100 atlet yang dikirim. Tingkat menang = laga dimenangkan ÷ laga diikuti. Klik baris untuk rincian per cabor.</div>
              </div>
              <select value={urut} onChange={e => setUrut(e.target.value as Urut)} className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200">
                <option value="peringkat">Urut: peringkat klasemen</option>
                <option value="efisiensi">Urut: medali per 100 atlet</option>
                <option value="emas100">Urut: emas per 100 atlet</option>
                <option value="menang">Urut: tingkat menang</option>
              </select>
            </div>
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left">
                  <th className="py-2 w-8">#</th><th>Kontingen</th><th className="text-center">E/P/Pr</th><th className="text-right">Total</th>
                  <th className="text-right">Atlet</th><th className="pl-4 w-28">Medali/100</th><th className="pl-4 w-28">Emas/100</th><th className="pl-4 w-24">Menang</th>
                  <th className="text-center">Cabor ikut/medali/emas</th><th className="pl-3">Cabor utama</th>
                </tr>
              </thead>
              <tbody>
                {g.kontingen.map(k => {
                  const rinci = buka === k.situsId
                  const caborK = rinci ? Object.entries(data.peta[k.situsId] ?? {})
                    .map(([c, s]) => ({ nama: g.namaCabor.get(Number(c)) ?? c, ...s }))
                    .sort((a, b) => b.emas - a.emas || b.perak - a.perak || b.perunggu - a.perunggu || b.atlet - a.atlet) : []
                  return (
                    <Fragment key={k.situsId}>
                      <tr onClick={() => setBuka(rinci ? null : k.situsId)} className="border-t border-white/5 cursor-pointer hover:bg-white/[0.03]"
                        style={sorot(k) ? { background: `${aksen}14` } : {}}>
                        <td className="py-2 font-black text-slate-400">{k.peringkat}</td>
                        <td className="font-semibold text-slate-100">
                          <span className="inline-flex items-center gap-1">{rinci ? <ChevronDown size={12} /> : <ChevronRight size={12} className="text-slate-600" />}{k.nama}</span>
                          {sorot(k) && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${aksen}25`, color: aksen }}>KITA</span>}
                        </td>
                        <td className="text-center"><Medali e={k.emas} p={k.perak} g={k.perunggu} /></td>
                        <td className="text-right font-bold text-white tabular-nums">{k.total}</td>
                        <td className="text-right tabular-nums text-slate-300">{k.atlet.toLocaleString('id-ID')}</td>
                        <td className="pl-4"><span className="tabular-nums text-slate-200">{angka(k.medaliPer100Atlet)}</span><Batang nilai={k.medaliPer100Atlet} maks={g.maks.eff} warna={aksen} /></td>
                        <td className="pl-4"><span className="tabular-nums text-slate-200">{angka(k.emasPer100Atlet)}</span><Batang nilai={k.emasPer100Atlet} maks={g.maks.emas100} warna={WARNA.emas} /></td>
                        <td className="pl-4"><span className="tabular-nums text-slate-200">{persen(k.tingkatMenang)}</span><Batang nilai={k.tingkatMenang} maks={1} warna="#34d399" /></td>
                        <td className="text-center tabular-nums text-slate-400">{k.caborDiikuti}/{k.caborBermedali}/{k.caborBeremas}</td>
                        <td className="pl-3 text-slate-300">
                          {k.caborUtama ? <>{k.caborUtama.nama} <span className="text-slate-500">· {k.caborUtama.emas} emas · {persen(k.caborUtama.porsi)}</span></> : <span className="text-slate-600">—</span>}
                          {k.tergantung && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-300">TERGANTUNG</span>}
                        </td>
                      </tr>
                      {rinci && (
                        <tr className="bg-black/20">
                          <td />
                          <td colSpan={9} className="py-3 pr-2">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">{k.nama} — {caborK.length} cabor · {k.laga.toLocaleString('id-ID')} laga, {k.menang.toLocaleString('id-ID')} menang</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-1.5">
                              {caborK.map(c => (
                                <div key={c.nama} className="rounded-lg px-2 py-1.5 bg-white/[0.03] border border-white/5">
                                  <div className="text-[11px] text-slate-200 truncate" title={c.nama}>{c.nama}</div>
                                  <div className="flex items-center justify-between"><Medali e={c.emas} p={c.perak} g={c.perunggu} kecil /><span className="text-[10px] text-slate-500">{c.atlet} atlet</span></div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl p-4" style={kartu}>
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-400" /><span className="text-sm font-bold text-white">Ketergantungan pada satu cabor</span></div>
            <div className="text-[11px] text-slate-500 mb-3">Porsi emas dari cabor penyumbang terbesar (kontingen dengan minimal 3 emas). Di atas 50% ditandai TERGANTUNG: kalau cabor itu goyah, perolehan emas ikut runtuh.</div>
            <div className="space-y-1.5">
              {g.tergantung.map(k => (
                <div key={k.situsId} className="flex items-center gap-3 text-xs" style={sorot(k) ? { color: aksen } : {}}>
                  <div className="w-40 truncate text-slate-200">{k.nama}</div>
                  <div className="flex-1 h-2 rounded-full bg-white/5"><div className="h-2 rounded-full" style={{ width: `${(k.caborUtama!.porsi * 100).toFixed(0)}%`, background: k.tergantung ? '#f87171' : '#fbbf24' }} /></div>
                  <div className="w-56 text-slate-400 truncate">{k.caborUtama!.nama} · {k.caborUtama!.emas}/{k.emas} emas · <span className="font-bold text-slate-200">{persen(k.caborUtama!.porsi)}</span></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'peta' && (
        <div className="rounded-2xl p-4" style={kartu}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="text-sm font-bold text-white">Peta kekuatan: kontingen × cabor</div>
              <div className="text-[11px] text-slate-500">Makin terang makin kuat di cabor itu (dibanding kontingen lain). Angka = {modePeta === 'emas' ? 'emas' : 'poin medali (emas 3, perak 2, perunggu 1)'}. Arahkan kursor untuk rinciannya. Cabor diurut dari emas terbanyak.</div>
            </div>
            <div className="flex gap-1">
              {(['emas', 'poin'] as const).map(m => (
                <button key={m} onClick={() => setModePeta(m)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${modePeta === m ? 'text-white border-white/30 bg-white/10' : 'text-slate-400 border-white/10'}`}>{m === 'emas' ? 'Emas' : 'Semua medali'}</button>
              ))}
            </div>
          </div>
          <div className="overflow-auto max-h-[75vh]">
            <table className="text-[10px] border-separate" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 bg-slate-950 min-w-[130px]" />
                  {g.caborPeta.map(c => (
                    <th key={c.situsId} className="sticky top-0 z-10 bg-slate-950 align-bottom font-medium text-slate-400 px-0.5" title={`${c.nama} — ${c.emas} emas`}>
                      <div className="mx-auto h-28 flex items-end justify-center"><span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="whitespace-nowrap">{c.nama}</span></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.kontingen.map(k => (
                  <tr key={k.situsId}>
                    <td className="sticky left-0 z-10 bg-slate-950 pr-2 whitespace-nowrap font-semibold" style={{ color: sorot(k) ? aksen : '#e2e8f0' }}>{k.peringkat}. {k.nama}</td>
                    {g.caborPeta.map(c => {
                      const s = data.peta[k.situsId]?.[c.situsId]
                      const v = !s ? 0 : modePeta === 'emas' ? s.emas : s.emas * 3 + s.perak * 2 + s.perunggu
                      const t = v / (g.maksSel.get(c.situsId) ?? 1)
                      const ikut = (s?.atlet ?? 0) > 0
                      const warna = modePeta === 'emas' ? '245,197,24' : '56,189,248'
                      return (
                        <td key={c.situsId} className="w-7 h-6 text-center rounded tabular-nums"
                          title={`${k.nama} · ${c.nama}\n${s ? `${s.emas} emas, ${s.perak} perak, ${s.perunggu} perunggu · ${s.atlet} atlet` : 'tidak ikut'}`}
                          style={{ background: v > 0 ? `rgba(${warna},${0.15 + 0.85 * t})` : ikut ? 'rgba(255,255,255,0.04)' : 'transparent', color: t > 0.55 ? '#0f172a' : '#e2e8f0', outline: sorot(k) ? `1px solid ${aksen}40` : undefined }}>
                          {v > 0 ? v : ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-slate-500 mt-2">Kotak abu tipis = ikut tanpa medali · kosong = tidak mengirim atlet.</div>
        </div>
      )}

      {tab === 'bibit' && <BibitAtlet sorotKontingen={sorotKontingenId != null} aksen={aksen} />}

      {tab === 'cabor' && (
        <div className="rounded-2xl p-4 overflow-x-auto" style={kartu}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="text-sm font-bold text-white">Siapa menguasai tiap cabor</div>
              <div className="text-[11px] text-slate-500">Penguasa = kontingen dengan emas terbanyak. Porsi emas penguasa ≥ 50% <b style={{ color: WARNA_PERSAINGAN.Dikuasai }}>Dikuasai</b>, 30–50% <b style={{ color: WARNA_PERSAINGAN.Bersaing }}>Bersaing</b>, di bawah 30% <b style={{ color: WARNA_PERSAINGAN.Merata }}>Merata</b>.</div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['', 'Dikuasai', 'Bersaing', 'Merata'] as const).map(p => (
                <button key={p || 'semua'} onClick={() => setFPersaingan(p)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${fPersaingan === p ? 'text-white border-white/30 bg-white/10' : 'text-slate-400 border-white/10'}`}>
                  {p || 'Semua'} {p && <span className="text-slate-500">{g.label[p] ?? 0}</span>}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left">
                <th className="py-2">Cabor</th><th className="text-right">Nomor</th><th className="text-right">Emas</th><th className="text-right">Atlet</th>
                <th className="pl-4">Penguasa</th><th className="pl-4 w-36">Porsi emas</th><th className="text-center">Kontingen beremas</th><th className="text-center">Persaingan</th>
              </tr>
            </thead>
            <tbody>
              {data.cabor.filter(c => !fPersaingan || c.persaingan === fPersaingan).map((c: RingkasCabor) => {
                const kita = sorotKontingenId != null && data.peta && data.kontingen.find(k => k.kontingenId === sorotKontingenId)
                const selKita = kita ? data.peta[kita.situsId]?.[c.situsId] : undefined
                const penguasaKita = !!kita && c.penguasa?.situsId === kita.situsId
                return (
                  <tr key={c.situsId} className="border-t border-white/5" style={penguasaKita ? { background: `${aksen}14` } : {}}>
                    <td className="py-2 text-slate-100 font-medium">{c.nama}</td>
                    <td className="text-right tabular-nums text-slate-400">{c.nomor}</td>
                    <td className="text-right tabular-nums" style={{ color: WARNA.emas }}>{c.emas}</td>
                    <td className="text-right tabular-nums text-slate-400">{c.atlet.toLocaleString('id-ID')}</td>
                    <td className="pl-4 text-slate-200">
                      {c.penguasa ? <>{c.penguasa.nama} <Medali e={c.penguasa.emas} p={c.penguasa.perak} g={c.penguasa.perunggu} kecil /></> : <span className="text-slate-600">—</span>}
                      {kita && selKita && !penguasaKita && (selKita.emas + selKita.perak + selKita.perunggu) > 0 && (
                        <div className="text-[10px]" style={{ color: aksen }}>{kita.nama}: <Medali e={selKita.emas} p={selKita.perak} g={selKita.perunggu} kecil /></div>
                      )}
                    </td>
                    <td className="pl-4"><span className="tabular-nums text-slate-200">{persen(c.penguasa?.porsiEmas ?? null)}</span><Batang nilai={c.penguasa?.porsiEmas ?? null} maks={1} warna={WARNA_PERSAINGAN[c.persaingan]} /></td>
                    <td className="text-center tabular-nums text-slate-400">{c.kontingenBeremas} <span className="text-slate-600">/ {c.kontingenIkut} ikut</span></td>
                    <td className="text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${WARNA_PERSAINGAN[c.persaingan]}1f`, color: WARNA_PERSAINGAN[c.persaingan] }}>{c.persaingan}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
