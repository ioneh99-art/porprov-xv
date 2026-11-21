'use client'
// src/components/porprov15/Persaingan.tsx — tab Persaingan di Rapor Kontingen:
// rekor menang–kalah satu kontingen melawan tiap kontingen (per cabor), matriks 27×27,
// dan duel atlet yang berulang. Data /api/porprov15/persaingan (laga tanding dari gudang).

import { Fragment, useEffect, useMemo, useState } from 'react'
import { Swords, ChevronDown, ChevronRight } from 'lucide-react'
import { jumlahRekor, persenMenang, type Persaingan as DataPersaingan, type Rekor } from '@/lib/persaingan'

const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const pilih = 'px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200'
/** Minimal laga supaya label "ditaklukkan"/"tembok" bermakna. */
const MIN_LAGA_LABEL = 5

interface KontingenP { situsId: number; nama: string; peringkat: number | null; kontingenId: number | null }

const warnaPersen = (p: number | null) => p == null ? 'transparent'
  : p >= 0.5 ? `rgba(52,211,153,${0.15 + (p - 0.5) * 1.5})` : `rgba(248,113,113,${0.15 + (0.5 - p) * 1.5})`
const teksRekor = (r: Rekor) => `${r.menang}–${r.kalah}${r.seri ? `–${r.seri}` : ''}`
const persen = (p: number | null) => (p == null ? '—' : `${Math.round(p * 100)}%`)

export default function Persaingan({ kontingen, namaCabor, sorotSitusId, aksen }: {
  kontingen: KontingenP[]; namaCabor: Map<number, string>; sorotSitusId: number | null; aksen: string
}) {
  const [data, setData] = useState<DataPersaingan | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [pilihan, setPilihan] = useState<number | null>(sorotSitusId ?? kontingen[0]?.situsId ?? null)
  const [buka, setBuka] = useState<number | null>(null)
  const [tampilMatriks, setTampilMatriks] = useState(false)

  useEffect(() => {
    fetch('/api/porprov15/persaingan', { cache: 'no-store' }).then(async r => {
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Gagal memuat.')
      setData(j)
    }).catch(e => setGalat(e.message))
  }, [])

  const nama = useMemo(() => new Map(kontingen.map(k => [k.situsId, k.nama])), [kontingen])

  const g = useMemo(() => {
    if (!data || pilihan == null) return null
    const milik = data.rekor.filter(r => r.a === pilihan)
    const perLawan = new Map<number, typeof milik>()
    milik.forEach(r => perLawan.set(r.b, [...(perLawan.get(r.b) ?? []), r]))
    const lawan = Array.from(perLawan.entries()).map(([b, rs]) => {
      const t = jumlahRekor(rs), n = t.menang + t.kalah + t.seri, p = persenMenang(t)
      return {
        b, ...t, n, p,
        label: n >= MIN_LAGA_LABEL && p != null ? (p >= 0.65 ? 'Ditaklukkan' : p <= 0.35 ? 'Tembok' : null) : null,
        cabor: rs.map(r => ({ nama: r.caborSitusId != null ? namaCabor.get(r.caborSitusId) ?? `Cabor ${r.caborSitusId}` : '—', ...r, p: persenMenang(r) }))
          .sort((x, y) => (y.menang + y.kalah + y.seri) - (x.menang + x.kalah + x.seri)),
      }
    }).sort((x, y) => y.n - x.n || (y.p ?? 0) - (x.p ?? 0))
    const total = jumlahRekor(milik)
    const layak = lawan.filter(l => l.n >= MIN_LAGA_LABEL)
    const terberat = [...layak].sort((x, y) => (x.p ?? 1) - (y.p ?? 1) || y.n - x.n).slice(0, 3)
    const ditaklukkan = [...layak].sort((x, y) => (y.p ?? 0) - (x.p ?? 0) || y.menang - x.menang).slice(0, 3)
    const duel = data.duelBerulang.filter(d => d.a.kontingenSitusId === pilihan || d.b.kontingenSitusId === pilihan)
      .map(d => d.a.kontingenSitusId === pilihan ? d : {
        a: d.b, b: d.a, menangA: d.menangB, menangB: d.menangA, seri: d.seri,
        laga: d.laga.map(l => ({ ...l, hasilA: l.hasilA === 'menang' ? 'kalah' as const : l.hasilA === 'kalah' ? 'menang' as const : 'seri' as const, skorA: l.skorB, skorB: l.skorA })),
      })
    // Matriks: total rekor a→b semua cabor
    const matriks = new Map<string, Rekor>()
    data.rekor.forEach(r => {
      const k = `${r.a}|${r.b}`, t = matriks.get(k) ?? { menang: 0, kalah: 0, seri: 0 }
      matriks.set(k, { menang: t.menang + r.menang, kalah: t.kalah + r.kalah, seri: t.seri + r.seri })
    })
    return { lawan, total, terberat, ditaklukkan, duel, matriks }
  }, [data, pilihan, namaCabor])

  if (galat) return <div className="rounded-2xl p-6 text-sm text-red-300" style={kartu}>{galat}</div>
  if (!data || !g) return <div className="rounded-2xl p-6 text-sm text-slate-400" style={kartu}>Menghitung persaingan dari laga tanding…</div>

  const namaPilihan = nama.get(pilihan!) ?? ''
  const urutK = [...kontingen].sort((a, b) => (a.peringkat ?? 999) - (b.peringkat ?? 999))

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={kartu}>
        <div className="flex items-center gap-2 mb-1"><Swords size={15} style={{ color: aksen }} /><span className="text-sm font-bold text-white">Persaingan antar kontingen</span></div>
        <div className="text-[11px] text-slate-400 leading-relaxed">
          Dari {data.jumlahLaga.toLocaleString('id-ID')} laga tanding yang mempertemukan dua kontingen ({data.jumlahSeri} berakhir seri).
          Laga peringkat (renang, atletik, dll.) tidak termasuk karena tidak ada lawan langsung.
          Rekor ditulis menang–kalah(–seri). <b className="text-emerald-300">Ditaklukkan</b> = menang ≥ 65%, <b className="text-red-300">Tembok</b> = menang ≤ 35% (minimal {MIN_LAGA_LABEL} laga).
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-3">
          <select value={pilihan ?? ''} onChange={e => { setPilihan(Number(e.target.value)); setBuka(null) }} className={pilih}>
            {urutK.map(k => <option key={k.situsId} value={k.situsId}>{k.peringkat}. {k.nama}</option>)}
          </select>
          <span className="text-sm text-white font-bold tabular-nums">{teksRekor(g.total)}</span>
          <span className="text-xs text-slate-400">{(g.total.menang + g.total.kalah + g.total.seri).toLocaleString('id-ID')} laga · menang {persen(persenMenang(g.total))} · {g.lawan.length} lawan</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={kartu}>
          <div className="text-[10px] uppercase tracking-wider text-red-300 font-bold mb-2">Lawan terberat {namaPilihan}</div>
          {g.terberat.length === 0 ? <div className="text-xs text-slate-500">Belum ada lawan dengan minimal {MIN_LAGA_LABEL} laga.</div> : g.terberat.map(l => (
            <div key={l.b} className="flex items-center justify-between text-xs py-1"><span className="text-slate-200">{nama.get(l.b)}</span><span className="tabular-nums text-slate-400">{teksRekor(l)} · <b className="text-red-300">{persen(l.p)}</b></span></div>
          ))}
        </div>
        <div className="rounded-2xl p-4" style={kartu}>
          <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold mb-2">Paling dikuasai {namaPilihan}</div>
          {g.ditaklukkan.length === 0 ? <div className="text-xs text-slate-500">Belum ada lawan dengan minimal {MIN_LAGA_LABEL} laga.</div> : g.ditaklukkan.map(l => (
            <div key={l.b} className="flex items-center justify-between text-xs py-1"><span className="text-slate-200">{nama.get(l.b)}</span><span className="tabular-nums text-slate-400">{teksRekor(l)} · <b className="text-emerald-300">{persen(l.p)}</b></span></div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4 overflow-x-auto" style={kartu}>
        <div className="text-sm font-bold text-white mb-1">{namaPilihan} melawan tiap kontingen</div>
        <div className="text-[11px] text-slate-500 mb-3">Klik baris untuk rincian per cabor. Diurut dari yang paling sering bertemu.</div>
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left">
              <th className="py-2">Lawan</th><th className="text-right">Laga</th><th className="text-center">Rekor</th><th className="pl-4 w-48">Menang</th><th className="text-center">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {g.lawan.map(l => (
              <Fragment key={l.b}>
                <tr onClick={() => setBuka(buka === l.b ? null : l.b)} className="border-t border-white/5 cursor-pointer hover:bg-white/[0.03]" style={l.b === sorotSitusId ? { background: `${aksen}12` } : {}}>
                  <td className="py-2 text-slate-100 font-medium"><span className="inline-flex items-center gap-1">{buka === l.b ? <ChevronDown size={12} /> : <ChevronRight size={12} className="text-slate-600" />}{nama.get(l.b)}</span></td>
                  <td className="text-right tabular-nums text-slate-400">{l.n}</td>
                  <td className="text-center tabular-nums text-slate-200">{teksRekor(l)}</td>
                  <td className="pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-red-400/30 overflow-hidden"><div className="h-1.5 bg-emerald-400" style={{ width: `${(l.p ?? 0) * 100}%` }} /></div>
                      <span className="tabular-nums text-slate-300 w-9 text-right">{persen(l.p)}</span>
                    </div>
                  </td>
                  <td className="text-center">{l.label && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${l.label === 'Tembok' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{l.label}</span>}</td>
                </tr>
                {buka === l.b && (
                  <tr className="bg-black/20"><td colSpan={5} className="py-2 px-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                      {l.cabor.map(c => (
                        <div key={c.nama} className="rounded-lg px-2 py-1.5 border border-white/5" style={{ background: warnaPersen(c.p) }}>
                          <div className="text-[11px] text-slate-100 truncate" title={c.nama}>{c.nama}</div>
                          <div className="text-[11px] tabular-nums text-slate-200">{teksRekor(c)}</div>
                        </div>
                      ))}
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl p-4" style={kartu}>
        <div className="text-sm font-bold text-white mb-1">Duel atlet berulang — {namaPilihan}</div>
        <div className="text-[11px] text-slate-500 mb-3">Atlet {namaPilihan} yang bertemu lawan yang sama dua kali atau lebih di laga perorangan ({g.duel.length} pasangan). Bahan pengintaian untuk pertemuan berikutnya.</div>
        {g.duel.length === 0 ? <div className="text-xs text-slate-500">Tidak ada.</div> : (
          <div className="grid md:grid-cols-2 gap-2">
            {g.duel.map(d => (
              <div key={`${d.a.situsId}-${d.b.situsId}`} className="rounded-xl px-3 py-2 border border-white/5 bg-white/[0.02] min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                  <span className="text-slate-100 font-semibold truncate min-w-0 flex-1">{d.a.nama}</span>
                  <span className={`tabular-nums font-bold shrink-0 whitespace-nowrap ${d.menangA > d.menangB ? 'text-emerald-300' : d.menangA < d.menangB ? 'text-red-300' : 'text-slate-300'}`}>{d.menangA}–{d.menangB}{d.seri ? `–${d.seri}` : ''}</span>
                  <span className="text-slate-300 truncate text-right min-w-0 flex-1" title={`${d.b.nama} (${nama.get(d.b.kontingenSitusId)})`}>{d.b.nama} <span className="text-slate-500">({nama.get(d.b.kontingenSitusId)})</span></span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {d.laga.map(l => (
                    <span key={l.ref} title={`${l.tanggal ?? ''} · ${l.nomor ?? ''} · ${l.babak ?? ''}`} className={`text-[10px] px-1.5 py-0.5 rounded tabular-nums ${l.hasilA === 'menang' ? 'bg-emerald-500/15 text-emerald-300' : l.hasilA === 'kalah' ? 'bg-red-500/15 text-red-300' : 'bg-slate-500/20 text-slate-300'}`}>
                      {l.cabor} {l.babak ?? ''}{l.skorA != null && l.skorB != null ? ` ${l.skorA}–${l.skorB}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={kartu}>
        <button onClick={() => setTampilMatriks(v => !v)} className="flex items-center gap-1.5 text-sm font-bold text-white">
          {tampilMatriks ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Matriks persaingan 27 × 27
        </button>
        <div className="text-[11px] text-slate-500 mt-1">Baris = kontingen, kolom = lawan. Hijau = baris unggul, merah = baris kalah. Arahkan kursor untuk rekornya.</div>
        {tampilMatriks && (
          <div className="overflow-auto max-h-[75vh] mt-3">
            <table className="text-[10px] border-separate" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 bg-slate-950 min-w-[130px]" />
                  {urutK.map(k => (
                    <th key={k.situsId} className="sticky top-0 z-10 bg-slate-950 align-bottom font-medium text-slate-400 px-0.5">
                      <div className="h-24 flex items-end justify-center"><span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="whitespace-nowrap">{k.nama}</span></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {urutK.map(a => (
                  <tr key={a.situsId}>
                    <td className="sticky left-0 z-10 bg-slate-950 pr-2 whitespace-nowrap font-semibold cursor-pointer" onClick={() => setPilihan(a.situsId)}
                      style={{ color: a.situsId === pilihan ? aksen : '#e2e8f0' }}>{a.peringkat}. {a.nama}</td>
                    {urutK.map(b => {
                      if (a.situsId === b.situsId) return <td key={b.situsId} className="w-9 h-6 rounded bg-white/[0.06]" />
                      const r = g.matriks.get(`${a.situsId}|${b.situsId}`)
                      const p = r ? persenMenang(r) : null
                      return (
                        <td key={b.situsId} className="w-9 h-6 px-1 text-center rounded tabular-nums text-slate-100 whitespace-nowrap"
                          title={r ? `${a.nama} vs ${b.nama}: ${teksRekor(r)} (${persen(p)})` : `${a.nama} vs ${b.nama}: belum bertemu`}
                          style={{ background: warnaPersen(p), outline: a.situsId === pilihan ? `1px solid ${aksen}50` : undefined }}>
                          {r ? `${r.menang}-${r.kalah}` : ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
