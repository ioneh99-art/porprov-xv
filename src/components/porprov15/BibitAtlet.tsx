'use client'
// src/components/porprov15/BibitAtlet.tsx — Bibit Atlet PORPROV XV (tab di Rapor Kontingen).
// Prestasi untuk semua kontingen; kolom & saringan umur hanya muncul bila server mengirim umur
// (Superadministrator & KONIDA Kab. Bandung — umur atlet Kab. Bandung dari data kita).

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search, Sprout } from 'lucide-react'
import { LABEL_KRITERIA, PENJELASAN_KRITERIA, type BibitAtlet as BA, type Kriteria } from '@/lib/bibit-atlet'

const SITUS = 'https://porprov.konijabar.or.id'
const WARNA = { emas: '#F5C518', perak: '#cbd5e1', perunggu: '#d97706' }
const WARNA_KRITERIA: Record<Kriteria, string> = {
  multiEmas: '#F5C518', juaraPerorangan: '#fde68a', takTerkalahkan: '#34d399', beruntun: '#60a5fa', serbaBisa: '#c084fc',
}
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const PER_HALAMAN = 50
const pilih = 'px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200'

interface DataBibit { atlet: BA[]; kontingenKitaSitusId: number | null; acuanUmur: string }

function Medali({ e, p, g }: { e: number; p: number; g: number }) {
  return (
    <span className="font-mono tabular-nums text-xs">
      <span style={{ color: WARNA.emas }}>{e}</span><span className="text-slate-600">/</span>
      <span style={{ color: WARNA.perak }}>{p}</span><span className="text-slate-600">/</span>
      <span style={{ color: WARNA.perunggu }}>{g}</span>
    </span>
  )
}

export default function BibitAtlet({ sorotKontingen, aksen }: { sorotKontingen: boolean; aksen: string }) {
  const [data, setData] = useState<DataBibit | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [fKontingen, setFKontingen] = useState('')
  const [fCabor, setFCabor] = useState('')
  const [fGender, setFGender] = useState('')
  const [fKriteria, setFKriteria] = useState<Kriteria | ''>('')
  const [fUmur, setFUmur] = useState('')
  const [hal, setHal] = useState(0)

  useEffect(() => {
    fetch('/api/porprov15/bibit-atlet', { cache: 'no-store' }).then(async r => {
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Gagal memuat.')
      setData(j)
      if (sorotKontingen && j.kontingenKitaSitusId) setFKontingen(String(j.kontingenKitaSitusId))
    }).catch(e => setGalat(e.message))
  }, [sorotKontingen])
  useEffect(() => { setHal(0) }, [q, fKontingen, fCabor, fGender, fKriteria, fUmur])

  const g = useMemo(() => {
    if (!data) return null
    const adaUmur = data.atlet.some(a => a.umur != null)
    const kontingen = Array.from(new Map(data.atlet.filter(a => a.kontingenSitusId != null).map(a => [a.kontingenSitusId!, a.kontingen])).entries()).sort((a, b) => a[1].localeCompare(b[1]))
    const cabor = Array.from(new Set(data.atlet.map(a => a.cabor ?? '').filter(Boolean))).sort()
    const kata = q.trim().toLowerCase()
    const umurMaks = fUmur ? Number(fUmur) : null
    const dasar = data.atlet.filter(a =>
      (!fKontingen || String(a.kontingenSitusId) === fKontingen) &&
      (!fCabor || a.cabor === fCabor) &&
      (!fGender || a.gender === fGender) &&
      (!kata || a.nama.toLowerCase().includes(kata)) &&
      (umurMaks == null || (a.umur != null && a.umur <= umurMaks)))
    const hitungKriteria: Record<string, number> = {}
    dasar.forEach(a => a.kriteria.forEach(k => { hitungKriteria[k] = (hitungKriteria[k] ?? 0) + 1 }))
    const tersaring = fKriteria ? dasar.filter(a => a.kriteria.includes(fKriteria)) : dasar
    const kita = data.kontingenKitaSitusId
    const mudaKita = adaUmur ? data.atlet.filter(a => a.kontingenSitusId === kita && a.umur != null && a.umur <= 20) : []
    return { adaUmur, kontingen, cabor, tersaring, hitungKriteria, mudaKita }
  }, [data, q, fKontingen, fCabor, fGender, fKriteria, fUmur])

  if (galat) return <div className="rounded-2xl p-6 text-sm text-red-300" style={kartu}>{galat}</div>
  if (!data || !g) return <div className="rounded-2xl p-6 text-sm text-slate-400" style={kartu}>Menghitung bibit atlet dari 13.325 atlet dan 7.607 laga…</div>

  const halaman = g.tersaring.slice(hal * PER_HALAMAN, hal * PER_HALAMAN + PER_HALAMAN)
  const jumlahHal = Math.max(1, Math.ceil(g.tersaring.length / PER_HALAMAN))
  const kitaId = data.kontingenKitaSitusId

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={kartu}>
        <div className="flex items-center gap-2 mb-1"><Sprout size={15} style={{ color: aksen }} /><span className="text-sm font-bold text-white">Bibit atlet PORPROV XV</span></div>
        <div className="text-[11px] text-slate-400 leading-relaxed">
          Situs panitia tidak mencantumkan umur, jadi bibit se-Jabar dinilai dari <b className="text-slate-200">prestasi</b>.
          Urutan: emas perorangan → emas → medali perorangan → total medali → tingkat menang.
          Medali disebut <i>perorangan</i> bila podiumnya satu atlet; menang–kalah dan beruntun hanya dari laga tanding perorangan.
          {g.adaUmur
            ? <> Umur hanya tersedia untuk atlet Kab. Bandung (data atlet kita, dihitung per {new Date(data.acuanUmur).toLocaleDateString('id-ID', { dateStyle: 'long' })}).</>
            : <> Umur tidak ditampilkan di tampilan ini.</>}
        </div>
        {g.adaUmur && g.mudaKita.length > 0 && (
          <div className="mt-3 text-xs rounded-xl px-3 py-2" style={{ background: `${aksen}12`, border: `1px solid ${aksen}35`, color: aksen }}>
            Bibit muda Kab. Bandung: <b>{g.mudaKita.length}</b> atlet bermedali berumur 20 tahun ke bawah, {g.mudaKita.filter(a => a.emas > 0).length} di antaranya meraih emas.
            <button onClick={() => { setFKontingen(String(kitaId)); setFUmur('20'); setFKriteria('') }} className="ml-2 underline font-bold">Tampilkan</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFKriteria('')} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${!fKriteria ? 'text-white border-white/30 bg-white/10' : 'text-slate-400 border-white/10'}`}>Semua kandidat</button>
        {(Object.keys(LABEL_KRITERIA) as Kriteria[]).map(k => (
          <button key={k} onClick={() => setFKriteria(fKriteria === k ? '' : k)} title={PENJELASAN_KRITERIA[k]}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border"
            style={fKriteria === k ? { background: `${WARNA_KRITERIA[k]}22`, borderColor: `${WARNA_KRITERIA[k]}80`, color: WARNA_KRITERIA[k] } : { borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
            {LABEL_KRITERIA[k]} <span className="opacity-70 tabular-nums">{g.hitungKriteria[k] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atlet" className={`${pilih} pl-7 w-48`} />
        </div>
        <select value={fKontingen} onChange={e => setFKontingen(e.target.value)} className={pilih}>
          <option value="">Semua kontingen</option>
          {g.kontingen.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select value={fCabor} onChange={e => setFCabor(e.target.value)} className={pilih}>
          <option value="">Semua cabor</option>{g.cabor.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={fGender} onChange={e => setFGender(e.target.value)} className={pilih}>
          <option value="">Putra & putri</option><option value="L">Putra</option><option value="P">Putri</option>
        </select>
        {g.adaUmur && (
          <select value={fUmur} onChange={e => setFUmur(e.target.value)} className={pilih} title="Hanya atlet Kab. Bandung yang punya data umur">
            <option value="">Semua umur</option><option value="17">≤ 17 tahun</option><option value="20">≤ 20 tahun</option><option value="23">≤ 23 tahun</option>
          </select>
        )}
        <span className="text-[11px] text-slate-500">{g.tersaring.length.toLocaleString('id-ID')} atlet</span>
      </div>

      <div className="rounded-2xl p-4 overflow-x-auto" style={kartu}>
        <table className="w-full text-xs min-w-[980px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 text-left">
              <th className="py-2 w-10">#</th><th>Atlet</th><th>Kontingen</th><th>Cabor</th>
              <th className="text-center">Medali</th><th className="text-center">Perorangan</th>
              <th className="text-center">Tanding M–K</th><th className="text-center">Beruntun</th>
              {g.adaUmur && <th className="text-center">Umur</th>}
              <th className="pl-3">Kriteria</th>
            </tr>
          </thead>
          <tbody>
            {halaman.map((a, i) => (
              <tr key={a.situsId} className="border-t border-white/5" style={a.kontingenSitusId === kitaId && sorotKontingen ? { background: `${aksen}10` } : {}}>
                <td className="py-2 text-slate-500 tabular-nums">{hal * PER_HALAMAN + i + 1}</td>
                <td>
                  <a href={`${SITUS}/atlet/${a.slug}`} target="_blank" rel="noopener" className="font-semibold text-slate-100 hover:underline inline-flex items-center gap-1">
                    {a.nama}<ExternalLink size={10} className="text-slate-600" />
                  </a>
                  <span className="ml-1.5 text-[10px] text-slate-500">{a.gender === 'P' ? 'Pi' : a.gender === 'L' ? 'Pa' : ''}</span>
                </td>
                <td className="text-slate-300" style={a.kontingenSitusId === kitaId && sorotKontingen ? { color: aksen } : {}}>{a.kontingen}</td>
                <td className="text-slate-400">{a.cabor}{a.disiplin && a.disiplin !== a.cabor ? <span className="text-slate-600"> · {a.disiplin.replace(a.cabor ?? '', '').trim()}</span> : null}</td>
                <td className="text-center"><Medali e={a.emas} p={a.perak} g={a.perunggu} /></td>
                <td className="text-center">{a.emasP + a.perakP + a.perungguP > 0 ? <Medali e={a.emasP} p={a.perakP} g={a.perungguP} /> : <span className="text-slate-600">—</span>}</td>
                <td className="text-center tabular-nums text-slate-300">
                  {a.duelMenang + a.duelKalah > 0 ? <>{a.duelMenang}–{a.duelKalah} <span className="text-slate-500 text-[10px]">{Math.round((a.tingkatMenang ?? 0) * 100)}%</span></> : <span className="text-slate-600">—</span>}
                </td>
                <td className="text-center tabular-nums" style={{ color: a.beruntun >= 4 ? '#60a5fa' : '#64748b' }}>{a.beruntun || '—'}</td>
                {g.adaUmur && <td className="text-center tabular-nums text-slate-200">{a.umur ?? <span className="text-slate-700">·</span>}</td>}
                <td className="pl-3">
                  <div className="flex flex-wrap gap-1">
                    {a.kriteria.map(k => (
                      <span key={k} title={PENJELASAN_KRITERIA[k]} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${WARNA_KRITERIA[k]}1c`, color: WARNA_KRITERIA[k] }}>{LABEL_KRITERIA[k]}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {g.tersaring.length === 0 && <div className="text-sm text-slate-500 py-6 text-center">Tidak ada atlet yang cocok dengan saringan.</div>}
        {jumlahHal > 1 && (
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <button disabled={hal === 0} onClick={() => setHal(h => h - 1)} className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-30">‹ Sebelumnya</button>
            <span>Halaman {hal + 1} dari {jumlahHal}</span>
            <button disabled={hal >= jumlahHal - 1} onClick={() => setHal(h => h + 1)} className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-30">Berikutnya ›</button>
          </div>
        )}
      </div>
    </div>
  )
}
