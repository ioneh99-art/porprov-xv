'use client'
// src/app/operator/dayung/profil/page.tsx
// PODSI Jabar — Profil Atlet Dayung: kelengkapan data per kontingen & per atlet
// (identitas, performa, manajemen). Klik atlet → rapor lengkap di /operator/dayung/profil/<id>.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Contact, Search, RefreshCw } from 'lucide-react'
import { muatJabar, labelDisiplin, WARNA_DISIPLIN, type JabarData } from '@/lib/sport-plugins/dayung/jabar-data'
import { BUTIR, kelengkapan, lagaAtlet, ringkasPerforma } from '@/lib/dayung-profil'

const ACCENT = '#38bdf8'
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const warnaPersen = (p: number) => (p >= 75 ? '#34d399' : p >= 45 ? '#fbbf24' : '#f87171')

function Batang({ p }: { p: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p}%`, background: warnaPersen(p) }} /></div>
      <span className="w-9 text-right tabular-nums font-bold text-[11px]" style={{ color: warnaPersen(p) }}>{p}%</span>
    </div>
  )
}

export default function DayungProfilIndeks() {
  const [data, setData] = useState<JabarData | null>(null)
  const [lokal, setLokal] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [fKontingen, setFKontingen] = useState('')
  const [urut, setUrut] = useState<'kelengkapan' | 'nama' | 'performa'>('kelengkapan')

  const load = async () => {
    setLoading(true)
    const d = await muatJabar()
    setData(d)
    const ids = d.atlet.map(a => a.atlet_id).filter(Boolean)
    if (ids.length) {
      const r = await fetch(`/api/dayung/profil?ids=${ids.join(',')}`).then(x => x.json()).catch(() => ({}))
      setLokal(r.atlet ?? {})
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const baris = useMemo(() => (data?.atlet ?? []).map(a => {
    const rows = lagaAtlet(a.situs_id, data!.laga, data!.peserta)
    const perf = ringkasPerforma(rows)
    const l = a.atlet_id ? lokal[a.atlet_id] : null
    const k = kelengkapan({
      tanggalLahir: !!l?.tgl_lahir, terverifikasi: !!l?.terverifikasi,
      hasilLomba: rows.some(r => r.waktuDetik != null), tesFisik: !!l?.tes, postur: !!(l?.tes?.tinggi && l?.tes?.berat),
      bpjs: !!l?.bpjs, riwayat: (l?.jumlah_riwayat ?? 0) > 0, perlengkapan: !!l?.ada_perlengkapan, dokumen: (l?.jumlah_dokumen ?? 0) > 0,
    })
    return { a, perf, k }
  }), [data, lokal])

  const perKontingen = useMemo(() => {
    const peta = new Map<string, typeof baris>()
    baris.forEach(b => peta.set(b.a.kontingen, [...(peta.get(b.a.kontingen) ?? []), b]))
    return Array.from(peta.entries()).map(([kontingen, xs]) => ({
      kontingen, n: xs.length,
      rata: Math.round(xs.reduce((s, x) => s + x.k.persen, 0) / xs.length),
      butir: Object.fromEntries(BUTIR.map(b => [b.kunci, Math.round(xs.filter(x => x.k.butir.find(y => y.kunci === b.kunci)?.ada).length / xs.length * 100)])),
    })).sort((a, b) => b.rata - a.rata || b.n - a.n)
  }, [baris])

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return baris.filter(b => (!q || b.a.nama.toLowerCase().includes(q)) && (!fKontingen || b.a.kontingen === fKontingen))
      .sort((x, y) => urut === 'nama' ? x.a.nama.localeCompare(y.a.nama)
        : urut === 'performa' ? (y.perf.persenTerbaik ?? -1) - (x.perf.persenTerbaik ?? -1)
        : y.k.persen - x.k.persen || x.a.nama.localeCompare(y.a.nama))
  }, [baris, cari, fKontingen, urut])

  const rataJabar = baris.length ? Math.round(baris.reduce((s, b) => s + b.k.persen, 0) / baris.length) : 0

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}><Contact size={20} style={{ color: ACCENT }} /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">PROFIL ATLET DAYUNG</h1>
            <div className="text-[11px] text-slate-500">Kelengkapan data atlet per kontingen · identitas, performa, manajemen</div>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Muat ulang</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-2xl p-3.5" style={kartu}><div className="text-[9px] uppercase tracking-wider text-slate-500">Atlet</div><div className="text-2xl font-black text-white">{loading ? '—' : baris.length}</div></div>
        <div className="rounded-2xl p-3.5" style={kartu}><div className="text-[9px] uppercase tracking-wider text-slate-500">Kelengkapan rata-rata</div><div className="text-2xl font-black" style={{ color: warnaPersen(rataJabar) }}>{loading ? '—' : `${rataJabar}%`}</div></div>
        <div className="rounded-2xl p-3.5" style={kartu}><div className="text-[9px] uppercase tracking-wider text-slate-500">Sudah ada hasil lomba</div><div className="text-2xl font-black text-white">{baris.filter(b => b.k.butir[2].ada).length}</div></div>
        <div className="rounded-2xl p-3.5" style={kartu}><div className="text-[9px] uppercase tracking-wider text-slate-500">Data awal terisi (tgl lahir)</div><div className="text-2xl font-black text-white">{baris.filter(b => b.k.butir[0].ada).length}</div></div>
      </div>

      {/* Kelengkapan per kontingen */}
      <div className="rounded-2xl p-5 mb-5" style={kartu}>
        <h3 className="text-sm font-bold text-white mb-1">Kelengkapan Data per Kontingen</h3>
        <div className="text-[11px] text-slate-500 mb-3">Persen atlet yang datanya sudah ada. Hasil lomba otomatis dari situs panitia; data lain diisi kontingen. Klik kontingen untuk menyaring daftar.</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="text-[9px] uppercase tracking-wider text-slate-500 border-b border-white/5">
              <th className="text-left py-2">Kontingen</th><th className="text-center">Atlet</th>
              {BUTIR.map(b => <th key={b.kunci} className="text-center px-1 font-semibold">{b.label}</th>)}
              <th className="text-left w-36 pl-2">Rata-rata</th>
            </tr></thead>
            <tbody>
              {perKontingen.map(k => (
                <tr key={k.kontingen} onClick={() => setFKontingen(f => f === k.kontingen ? '' : k.kontingen)}
                  className={`border-b border-white/5 cursor-pointer ${fKontingen === k.kontingen ? 'bg-sky-500/10' : 'hover:bg-white/[0.03]'}`}>
                  <td className="py-1.5 text-slate-200 font-medium whitespace-nowrap">{k.kontingen}</td>
                  <td className="text-center tabular-nums text-slate-400">{k.n}</td>
                  {BUTIR.map(b => {
                    const v = k.butir[b.kunci] as number
                    return <td key={b.kunci} className="text-center tabular-nums font-bold" style={{ color: v === 0 ? '#334155' : warnaPersen(v) }}>{v === 0 ? '·' : `${v}%`}</td>
                  })}
                  <td className="pl-2"><Batang p={k.rata} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daftar atlet */}
      <div className="rounded-2xl p-5" style={kartu}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="text-sm font-bold text-white">Atlet <span className="text-slate-500 font-normal">· {daftar.length}{fKontingen ? ` · ${fKontingen}` : ''}</span></h3>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search size={12} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama" className="pl-7 pr-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200 w-44" />
            </label>
            <select value={fKontingen} onChange={e => setFKontingen(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200">
              <option value="">Semua kontingen</option>{perKontingen.map(k => <option key={k.kontingen}>{k.kontingen}</option>)}
            </select>
            <select value={urut} onChange={e => setUrut(e.target.value as any)} className="px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200">
              <option value="kelengkapan">Urut: kelengkapan</option><option value="performa">Urut: kecepatan vs juara</option><option value="nama">Urut: nama</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5">
              <th className="text-left py-2">Nama</th><th className="text-left">Kontingen</th><th className="text-left">Disiplin</th>
              <th className="text-center">Laga</th><th className="text-center">Medali</th><th className="text-center">% kecepatan juara (terbaik)</th><th className="text-left w-40">Kelengkapan</th>
            </tr></thead>
            <tbody>
              {daftar.slice(0, 300).map(({ a, perf, k }) => {
                const d = labelDisiplin(a.disiplin)
                return (
                  <tr key={a.situs_id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="py-2"><Link href={`/operator/dayung/profil/${a.situs_id}`} className="text-sky-300 hover:underline font-medium">{a.nama}</Link></td>
                    <td className="text-slate-400">{a.kontingen}</td>
                    <td><span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `${WARNA_DISIPLIN[d] ?? '#64748b'}20`, color: WARNA_DISIPLIN[d] ?? '#94a3b8' }}>{d}</span></td>
                    <td className="text-center tabular-nums text-slate-400">{perf.laga || '—'}</td>
                    <td className="text-center tabular-nums">{perf.emas + perf.perak + perf.perunggu ? <span className="font-bold"><span className="text-amber-300">{perf.emas}</span>/<span className="text-slate-300">{perf.perak}</span>/<span className="text-orange-400">{perf.perunggu}</span></span> : <span className="text-slate-600">—</span>}</td>
                    <td className="text-center tabular-nums font-bold text-slate-200">{perf.persenTerbaik != null ? `${perf.persenTerbaik}%` : <span className="text-slate-600 font-normal">—</span>}</td>
                    <td><Batang p={k.persen} /></td>
                  </tr>
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
