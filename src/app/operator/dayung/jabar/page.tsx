'use client'
// src/app/operator/dayung/jabar/page.tsx
// PODSI Jabar — Dayung se-Jawa Barat: semua atlet Dayung dari 27 kontingen PORPROV XV,
// klasemen medali Dayung per kontingen, dan sebaran atlet per kontingen/disiplin.
// Sumber: situs panitia (dibaca scripts/tarik-dayung-jabar.ts ke tabel dayung_jabar_*).

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Waves, Users, Trophy, Flag, RefreshCw, Search, ExternalLink, ChevronDown, ChevronRight, Medal } from 'lucide-react'
import {
  muatJabar, labelDisiplin, klasemenKontingen, waktuDibaca, WARNA_DISIPLIN, WARNA_MEDALI, SITUS_PANITIA,
  type JabarData,
} from '@/lib/sport-plugins/dayung/jabar-data'

const ACCENT = '#38bdf8'
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const gLabel = (g: string | null) => (g === 'L' ? 'Putra' : g === 'P' ? 'Putri' : g === 'MIX' ? 'Campuran' : '—')

function Medali({ e, p, u }: { e: number; p: number; u: number }) {
  if (!e && !p && !u) return <span className="text-slate-600">—</span>
  return (
    <span className="inline-flex gap-2 tabular-nums font-bold">
      {e > 0 && <span style={{ color: WARNA_MEDALI.emas }}>{e}E</span>}
      {p > 0 && <span style={{ color: WARNA_MEDALI.perak }}>{p}P</span>}
      {u > 0 && <span style={{ color: WARNA_MEDALI.perunggu }}>{u}Pr</span>}
    </span>
  )
}

export default function DayungJabarPage() {
  const [data, setData] = useState<JabarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [fKontingen, setFKontingen] = useState('')
  const [fDisiplin, setFDisiplin] = useState('')
  const [fGender, setFGender] = useState('')
  const [buka, setBuka] = useState<number | null>(null)

  const load = async () => { setLoading(true); setData(await muatJabar()); setLoading(false) }
  useEffect(() => { load() }, [])

  const m = useMemo(() => {
    const atlet = data?.atlet ?? [], laga = data?.laga ?? [], peserta = data?.peserta ?? []
    const kontingen = Array.from(new Set(atlet.map(a => a.kontingen))).sort()
    const disiplin = Array.from(new Set(atlet.map(a => labelDisiplin(a.disiplin)))).sort()
    const perKontingen = kontingen.map(k => {
      const xs = atlet.filter(a => a.kontingen === k)
      const d: Record<string, number> = {}
      xs.forEach(a => { const l = labelDisiplin(a.disiplin); d[l] = (d[l] ?? 0) + 1 })
      return { kontingen: k, total: xs.length, disiplin: d }
    }).sort((a, b) => b.total - a.total)
    const nomorJuara = new Set(laga.filter(l => l.perebutan_medali && peserta.some(p => p.laga_ref === l.ref && p.medali === 'emas')).map(l => l.nomor)).size
    const lagaPerAtlet = new Map<number, number[]>()
    peserta.forEach(p => p.atlet_situs_ids.forEach(id => lagaPerAtlet.set(id, [...(lagaPerAtlet.get(id) ?? []), p.laga_ref])))
    return {
      atlet, laga, peserta, kontingen, disiplin, perKontingen, nomorJuara, lagaPerAtlet,
      putra: atlet.filter(a => a.gender === 'L').length, putri: atlet.filter(a => a.gender === 'P').length,
      selesai: laga.filter(l => l.selesai).length,
      klasemen: klasemenKontingen(peserta),
      maxKontingen: Math.max(1, ...perKontingen.map(k => k.total)),
    }
  }, [data])

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return m.atlet.filter(a =>
      (!q || a.nama.toLowerCase().includes(q) || a.kontingen.toLowerCase().includes(q)) &&
      (!fKontingen || a.kontingen === fKontingen) &&
      (!fDisiplin || labelDisiplin(a.disiplin) === fDisiplin) &&
      (!fGender || a.gender === fGender))
  }, [m.atlet, cari, fKontingen, fDisiplin, fGender])

  const lagaPeta = useMemo(() => new Map(m.laga.map(l => [l.ref, l])), [m.laga])
  const kosong = !loading && m.atlet.length === 0

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      {/* Kepala */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}><Waves size={20} style={{ color: ACCENT }} /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">DAYUNG JAWA BARAT</h1>
            <div className="text-[11px] text-slate-500">Semua atlet Dayung PORPROV XV · sumber situs panitia · dibaca {waktuDibaca(data?.dibaca ?? null)}</div>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Muat ulang
        </button>
      </div>

      {kosong && <div className="rounded-2xl p-6 text-sm text-slate-400" style={kartu}>Data Dayung se-Jabar belum ditarik dari situs panitia.</div>}

      {/* Angka utama */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {[
          { l: 'Atlet', v: m.atlet.length, icon: Users, c: ACCENT },
          { l: 'Kontingen', v: m.kontingen.length, icon: Flag, c: '#34d399' },
          { l: 'Putra', v: m.putra, icon: Users, c: '#38bdf8' },
          { l: 'Putri', v: m.putri, icon: Users, c: '#f472b6' },
          { l: 'Laga selesai', v: `${m.selesai}/${m.laga.length}`, icon: Waves, c: '#a78bfa' },
          { l: 'Nomor berjuara', v: m.nomorJuara, icon: Trophy, c: WARNA_MEDALI.emas },
        ].map(k => (
          <div key={k.l} className="rounded-2xl p-3.5" style={kartu}>
            <div className="flex items-center gap-1.5 mb-1"><k.icon size={12} style={{ color: k.c }} /><span className="text-[9px] uppercase tracking-wider text-slate-500">{k.l}</span></div>
            <div className="text-2xl font-black text-white tabular-nums">{loading ? '—' : k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Klasemen medali */}
        <div className="rounded-2xl p-5" style={kartu}>
          <div className="flex items-center gap-2 mb-3"><Medal size={14} style={{ color: WARNA_MEDALI.emas }} /><h3 className="text-sm font-bold text-white">Klasemen Medali Dayung</h3></div>
          {m.klasemen.length === 0 ? <div className="text-xs text-slate-600">Belum ada medali.</div> : (
            <table className="w-full text-xs">
              <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="text-left py-1.5 w-8">#</th><th className="text-left">Kontingen</th>
                <th className="text-center w-12" style={{ color: WARNA_MEDALI.emas }}>Emas</th>
                <th className="text-center w-12" style={{ color: WARNA_MEDALI.perak }}>Perak</th>
                <th className="text-center w-14" style={{ color: WARNA_MEDALI.perunggu }}>Perunggu</th>
                <th className="text-center w-12">Total</th>
              </tr></thead>
              <tbody>
                {m.klasemen.map((r, i) => (
                  <tr key={r.kontingen} className="border-t border-white/5">
                    <td className="py-1.5 font-black text-slate-500">{i + 1}</td>
                    <td className="text-slate-200">{r.kontingen}</td>
                    <td className="text-center font-bold tabular-nums">{r.emas}</td>
                    <td className="text-center font-bold tabular-nums">{r.perak}</td>
                    <td className="text-center font-bold tabular-nums">{r.perunggu}</td>
                    <td className="text-center tabular-nums text-slate-400">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="text-[10px] text-slate-600 mt-3">Satu medali per perahu. Hanya laga yang sudah ada hasilnya di situs panitia.</div>
        </div>

        {/* Atlet per kontingen */}
        <div className="rounded-2xl p-5" style={kartu}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Atlet per Kontingen</h3>
            <div className="flex gap-2.5">
              {m.disiplin.map(d => <span key={d} className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-sm" style={{ background: WARNA_DISIPLIN[d] ?? '#64748b' }} />{d}</span>)}
            </div>
          </div>
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {m.perKontingen.map(k => (
              <button key={k.kontingen} onClick={() => setFKontingen(f => f === k.kontingen ? '' : k.kontingen)}
                className={`w-full flex items-center gap-2 text-[11px] rounded-lg px-1.5 py-0.5 ${fKontingen === k.kontingen ? 'bg-sky-500/10' : 'hover:bg-white/5'}`}>
                <span className="w-36 text-left truncate text-slate-300">{k.kontingen}</span>
                <span className="flex-1 flex h-2.5 rounded-full overflow-hidden bg-slate-800">
                  {m.disiplin.map(d => k.disiplin[d] ? <span key={d} style={{ width: `${k.disiplin[d] / m.maxKontingen * 100}%`, background: WARNA_DISIPLIN[d] ?? '#64748b' }} /> : null)}
                </span>
                <span className="w-7 text-right font-bold tabular-nums text-slate-200">{k.total}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daftar atlet */}
      <div className="rounded-2xl p-5" style={kartu}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="text-sm font-bold text-white">Daftar Atlet <span className="text-slate-500 font-normal">· {daftar.length} dari {m.atlet.length}</span></h3>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama / kontingen"
                className="pl-7 pr-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200 w-48" />
            </label>
            <select value={fKontingen} onChange={e => setFKontingen(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200">
              <option value="">Semua kontingen</option>{m.kontingen.map(k => <option key={k}>{k}</option>)}
            </select>
            <select value={fDisiplin} onChange={e => setFDisiplin(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200">
              <option value="">Semua disiplin</option>{m.disiplin.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={fGender} onChange={e => setFGender(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200">
              <option value="">Putra & putri</option><option value="L">Putra</option><option value="P">Putri</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5">
              <th className="text-left py-2 w-6"></th><th className="text-left">Nama</th><th className="text-left">Kontingen</th>
              <th className="text-left">Disiplin</th><th className="text-left">Gender</th><th className="text-center">Laga</th><th className="text-left">Medali</th>
            </tr></thead>
            <tbody>
              {daftar.slice(0, 300).map(a => {
                const refs = m.lagaPerAtlet.get(a.situs_id) ?? []
                const d = labelDisiplin(a.disiplin)
                return (
                  <Fragment key={a.situs_id}>
                    <tr onClick={() => setBuka(b => b === a.situs_id ? null : a.situs_id)} className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer">
                      <td className="py-2 text-slate-600">{refs.length ? (buka === a.situs_id ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}</td>
                      <td className="font-medium"><Link href={`/operator/dayung/profil/${a.situs_id}`} onClick={e => e.stopPropagation()} className="text-sky-300 hover:underline">{a.nama}</Link></td>
                      <td className="text-slate-400">{a.kontingen}</td>
                      <td><span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `${WARNA_DISIPLIN[d] ?? '#64748b'}20`, color: WARNA_DISIPLIN[d] ?? '#94a3b8' }}>{d}</span></td>
                      <td className="text-slate-400">{gLabel(a.gender)}</td>
                      <td className="text-center tabular-nums text-slate-400">{refs.length || '—'}</td>
                      <td><Medali e={a.emas} p={a.perak} u={a.perunggu} /></td>
                    </tr>
                    {buka === a.situs_id && (
                      <tr className="bg-slate-900/40"><td></td><td colSpan={6} className="py-2">
                        <div className="space-y-1">
                          {refs.map(ref => {
                            const l = lagaPeta.get(ref)
                            const p = m.peserta.find(x => x.laga_ref === ref && x.atlet_situs_ids.includes(a.situs_id))
                            return (
                              <div key={ref} className="flex flex-wrap items-center gap-x-3 text-[11px]">
                                <span className="text-slate-500 w-24">{l?.tanggal ?? '—'} {l?.jam ?? ''}</span>
                                <span className="text-slate-200">{l?.nomor}</span>
                                <span className="text-slate-500">{l?.babak}{l?.kode ? ` (${l.kode})` : ''}</span>
                                {p?.peringkat && <span className="text-slate-300">peringkat {p.peringkat}</span>}
                                {p?.waktu && <span className="font-mono text-sky-300">{p.waktu}</span>}
                                {p?.medali && <span className="font-bold capitalize" style={{ color: WARNA_MEDALI[p.medali] }}>{p.medali}</span>}
                                {p && p.atlet_nama.length > 1 && <span className="text-slate-500">bersama {p.atlet_nama.filter((_, i) => p.atlet_situs_ids[i] !== a.situs_id).join(', ')}</span>}
                              </div>
                            )
                          })}
                          <a href={`${SITUS_PANITIA}/atlet/${a.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline pt-1">Halaman atlet di situs panitia <ExternalLink size={10} /></a>
                        </div>
                      </td></tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {daftar.length > 300 && <div className="text-[11px] text-slate-500 pt-3">Menampilkan 300 pertama — persempit dengan pencarian atau filter.</div>}
        </div>
      </div>
    </div>
  )
}
