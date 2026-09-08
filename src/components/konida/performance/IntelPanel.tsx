'use client'
// src/components/konida/performance/IntelPanel.tsx
// Panel intelijen strategis di Performance Center, dari berkas Analisis Strategis.
//
// Kenapa di sini dan bukan di Data Gateway: gerbang itu tempat MEMASUKKAN data.
// Papan ini untuk DILIHAT — dan Performance Center sebelumnya hanya bertumpu
// pada 50 atlet ber-baseline, sementara berkas analisis mencakup 658 atlet.
//
// Papan ini dibaca pimpinan, bukan operator. 658 baris sekaligus membuat orang
// menyerah sebelum menemukan apa pun, maka seluruh isi papan tunduk pada satu
// saringan medali dan terbuka pada EMAS — yang memang paling dicari.

import { useState, useEffect, useMemo } from 'react'
import {
  Target, Swords, Medal, Loader2, ChevronDown, ChevronRight, AlertTriangle, Trophy,
} from 'lucide-react'
import BadgeElite from '@/components/konida/BadgeElite'

interface AtletIntel {
  nama_file: string; cabang_file: string
  target_medali: string | null; capaian_catatan: string | null
  pesaing: string | null; analisis: string | null; atlet_id: number | null
}
interface CabangIntel {
  cabang: string; target_cabor_emas: number | null
  target_koni_emas: number | null; probability: number | null
}
interface Prioritas {
  id: number; nama_lengkap: string; cabor_nama_raw: string | null
  prioritas_emas: string; prioritas_capaian: string | null; foto_url: string | null
}

type Saringan = 'emas' | 'perak' | 'perunggu' | 'kosong' | 'semua'

const SARINGAN: { k: Saringan; label: string; warna: string }[] = [
  { k: 'emas',     label: 'Emas',          warna: '#facc15' },
  { k: 'perak',    label: 'Perak',         warna: '#cbd5e1' },
  { k: 'perunggu', label: 'Perunggu',      warna: '#fb923c' },
  { k: 'kosong',   label: 'Belum ditarget', warna: '#64748b' },
  { k: 'semua',    label: 'Semua',         warna: '#38bdf8' },
]

/** Pecah kolom pesaing jadi nama kontingen. Isinya tidak seragam —
 *  "KOTA BANDUNG", "1. Kota Bekasi", "Kab. Bogor, Kab. Bekasi". */
function pecahLawan(s: string | null): string[] {
  if (!s) return []
  return s.split(/[;,/]| dan /i)
    .map(x => x.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(x => x.length > 3 && !/^\d/.test(x))
    .map(x => x.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))
    .map(x => x.replace(/^Kab\.?\s*/i, 'Kab. ').replace(/\s+/g, ' ').trim())
}

export default function IntelPanel({ accent = '#38bdf8' }: { accent?: string }) {
  const [data, setData]   = useState<any>(null)
  const [sibuk, setSibuk] = useState(true)
  const [galat, setGalat] = useState('')
  const [bukaCabor, setBukaCabor] = useState<string | null>(null)
  // Terbuka pada emas: itu yang dicari pimpinan lebih dulu.
  const [saring, setSaring] = useState<Saringan>('emas')

  useEffect(() => {
    let hidup = true
    fetch('/api/rekonsiliasi/kbaas')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Gagal memuat')))
      .then(d => { if (hidup) setData(d) })
      .catch(e => { if (hidup) setGalat(e.message) })
      .finally(() => { if (hidup) setSibuk(false) })
    return () => { hidup = false }
  }, [])

  const atlet: AtletIntel[]    = data?.atlet ?? []
  const cabang: CabangIntel[]  = data?.cabang ?? []
  const prioritas: Prioritas[] = data?.prioritas ?? []

  /** id atlet yang bertanda ELITE — dipakai menandai baris tabel capaian. */
  const idElite = useMemo(() => {
    const m = new Map<number, Prioritas>()
    prioritas.forEach(p => m.set(p.id, p))
    return m
  }, [prioritas])

  const jumlah = useMemo(() => {
    const c: Record<Saringan, number> = { emas: 0, perak: 0, perunggu: 0, kosong: 0, semua: atlet.length }
    for (const a of atlet) {
      const t = (a.target_medali ?? '').toLowerCase()
      if (t === 'emas' || t === 'perak' || t === 'perunggu') c[t as Saringan]++
      else c.kosong++
    }
    return c
  }, [atlet])

  /** Satu saringan menggerakkan seluruh papan — daftar atlet maupun peta ancaman. */
  const tampil = useMemo(() => {
    if (saring === 'semua') return atlet
    return atlet.filter(a => {
      const t = (a.target_medali ?? '').toLowerCase()
      return saring === 'kosong'
        ? !['emas', 'perak', 'perunggu'].includes(t)
        : t === saring
    })
  }, [atlet, saring])

  // ── Peta ancaman: kontingen lawan tersering, mengikuti saringan ──
  const ancaman = useMemo(() => {
    const hit = new Map<string, { total: number; cabor: Map<string, number> }>()
    for (const a of tampil) {
      for (const l of pecahLawan(a.pesaing)) {
        if (!hit.has(l)) hit.set(l, { total: 0, cabor: new Map() })
        const e = hit.get(l)!
        e.total++
        e.cabor.set(a.cabang_file, (e.cabor.get(a.cabang_file) ?? 0) + 1)
      }
    }
    return Array.from(hit.entries())
      .map(([nama, v]) => ({
        nama, total: v.total,
        cabor: Array.from(v.cabor.entries()).sort((x, y) => y[1] - x[1]).slice(0, 6),
      }))
      .sort((a, b) => b.total - a.total)
  }, [tampil])

  // ── Selisih keyakinan cabor vs KONI ──
  const selisih = useMemo(() =>
    cabang
      .filter(c => c.target_cabor_emas != null && c.target_koni_emas != null)
      .map(c => ({ ...c, d: (c.target_cabor_emas ?? 0) - (c.target_koni_emas ?? 0) }))
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d)),
  [cabang])

  const prioTanpaFoto = prioritas.filter(p => !p.foto_url)
  const labelSaring = SARINGAN.find(s => s.k === saring)!.label

  if (sibuk) return (
    <div className="rounded-2xl border border-white/10 p-10 text-center">
      <Loader2 size={20} className="mx-auto animate-spin text-slate-600" />
    </div>
  )
  if (galat) return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{galat}</div>
  )
  if (!data?.ada) return (
    <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
      <Target size={26} className="mx-auto text-slate-700 mb-3" />
      <p className="text-sm text-slate-500">Berkas Analisis Strategis belum diunggah.</p>
      <p className="text-[12px] text-slate-600 mt-1">
        Unggah lewat Data Gateway → Sumber Lain → Target Medali (KBAAS).
      </p>
    </div>
  )

  const s = data.summary ?? {}
  return (
    <div className="space-y-5">

      {/* ── Target dua lapis ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kotak label="Target Cabor" nilai={s.total_target_cabor_emas ?? '—'} ket="emas · versi pengurus" warna="#fbbf24" tebal />
        <Kotak label="Target KONI"  nilai={s.total_target_koni_emas ?? '—'}  ket="emas · sasaran resmi" warna="#f97316" tebal />
        <Kotak label="Atlet ELITE" nilai={prioritas.length} ket="ditandai pengurus cabor" warna="#facc15" />
        <Kotak label="ELITE Belum Berfoto" nilai={prioTanpaFoto.length} ket="dari atlet ELITE"
          warna={prioTanpaFoto.length ? '#ef4444' : '#34d399'} />
      </div>

      {/* ── Saringan medali: menggerakkan seluruh papan di bawahnya ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 mr-1">Tampilkan target</span>
          {SARINGAN.map(f => {
            const aktif = saring === f.k
            return (
              <button key={f.k} onClick={() => { setSaring(f.k); setBukaCabor(null) }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                style={aktif
                  ? { background: `${f.warna}22`, color: f.warna, border: `1px solid ${f.warna}66` }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.38)', border: '1px solid transparent' }}>
                {f.label}
                <span className="ml-1.5 font-mono opacity-70">{jumlah[f.k]}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-600 mt-2">
          Saringan ini berlaku untuk Peta Ancaman dan daftar atlet di bawah — jadi
          &quot;siapa lawan kita&quot; terjawab khusus untuk target {labelSaring.toLowerCase()}.
        </p>
      </div>

      {/* ── Peta ancaman ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2.5">
          <Swords size={16} style={{ color: accent }} />
          <div>
            <h3 className="text-white font-bold text-sm">
              Peta Ancaman <span className="text-slate-500 font-normal">· target {labelSaring.toLowerCase()}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Kontingen lawan yang paling sering disebut pada {tampil.filter(a => a.pesaing).length} baris analisis.
            </p>
          </div>
        </div>
        <div className="p-4 space-y-1.5">
          {ancaman.length === 0 && (
            <p className="text-[12px] text-slate-600 px-3 py-4">
              Tidak ada catatan pesaing pada kelompok target ini.
            </p>
          )}
          {ancaman.slice(0, 8).map((l, i) => {
            const maks = ancaman[0]?.total || 1
            const buka = bukaCabor === l.nama
            return (
              <div key={l.nama}>
                <button onClick={() => setBukaCabor(buka ? null : l.nama)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                  <span className="text-[11px] font-mono w-5 shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-200 w-40 text-left truncate shrink-0">{l.nama}</span>
                  <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <span className="block h-full rounded-full"
                      style={{ width: `${Math.round(100 * l.total / maks)}%`,
                               background: i === 0 ? '#ef4444' : i < 3 ? '#f97316' : accent }} />
                  </span>
                  <span className="text-sm font-bold text-slate-300 w-10 text-right shrink-0">{l.total}</span>
                  {buka ? <ChevronDown size={14} className="text-slate-600 shrink-0" />
                        : <ChevronRight size={14} className="text-slate-600 shrink-0" />}
                </button>
                {buka && (
                  <div className="px-11 pb-2 flex flex-wrap gap-1.5">
                    {l.cabor.map(([c, n]) => (
                      <span key={c} className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.05] text-slate-400">
                        {c} · {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {ancaman[0] && (
            <p className="text-[12px] text-slate-500 px-3 pt-2 flex gap-2">
              <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Untuk target {labelSaring.toLowerCase()}, <b className="text-slate-300">{ancaman[0].nama}</b> adalah
                lawan terberat — disebut {ancaman[0].total} kali
                {ancaman[1] ? `, ${(ancaman[0].total / ancaman[1].total).toFixed(1)}× lebih sering daripada ${ancaman[1].nama}` : ', jauh di atas yang lain'}.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── Selisih keyakinan ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2.5">
          <Target size={16} style={{ color: accent }} />
          <div>
            <h3 className="text-white font-bold text-sm">Selisih Keyakinan Cabor vs KONI</h3>
            <p className="text-[11px] text-slate-500">
              Selisih positif berarti pengurus cabor lebih optimis daripada sasaran KONI.
            </p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {selisih.filter(c => c.d !== 0).slice(0, 10).map(c => (
            <div key={c.cabang} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02]">
              <span className="text-sm font-bold w-10 shrink-0"
                style={{ color: c.d > 0 ? '#fbbf24' : '#38bdf8' }}>
                {c.d > 0 ? `+${c.d}` : c.d}
              </span>
              <span className="text-sm text-slate-300 flex-1 truncate">{c.cabang}</span>
              <span className="text-[11px] text-slate-500 shrink-0">
                cabor {c.target_cabor_emas} · koni {c.target_koni_emas}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Atlet ELITE ── */}
      {prioritas.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2.5">
            <Trophy size={16} className="text-amber-400" />
            <div>
              <h3 className="text-white font-bold text-sm">Grup ELITE ({prioritas.length})</h3>
              <p className="text-[11px] text-slate-500">
                Atlet yang hampir dipastikan meraih emas — ditandai pengurus cabor pada berkas
                analisis, penilaian orang lapangan, bukan hitungan sistem.
              </p>
            </div>
          </div>
          <div className="max-h-80 overflow-auto">
            {prioritas.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.05] last:border-0">
                <BadgeElite prioritas={p.prioritas_emas} capaian={p.prioritas_capaian} ukuran="mini" />
                <span className="text-sm text-slate-200 flex-1 truncate">{p.nama_lengkap}</span>
                <span className="text-[11px] text-slate-500 w-32 truncate shrink-0">{p.cabor_nama_raw}</span>
                {p.prioritas_capaian && (
                  <span className="text-[10px] text-slate-600 w-40 truncate shrink-0 hidden md:block">
                    {p.prioritas_capaian}
                  </span>
                )}
                {!p.foto_url && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 shrink-0">
                    tanpa foto
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Capaian & pesaing per atlet ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2.5">
          <Medal size={16} style={{ color: accent }} />
          <div>
            <h3 className="text-white font-bold text-sm">
              Capaian Terbaik &amp; Pesaing ({tampil.length})
              {saring !== 'semua' && <span className="text-slate-500 font-normal"> · dari {atlet.length}</span>}
            </h3>
            <p className="text-[11px] text-slate-500">
              Kolom capaian mencatat prestasi yang <b className="text-slate-400">sudah diraih</b>, bukan proyeksi.
            </p>
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          {tampil.slice(0, 300).map((a, i) => {
            const el = a.atlet_id ? idElite.get(a.atlet_id) : undefined
            return (
              <div key={i} className="flex items-center gap-2.5 px-4 py-2 border-b border-white/[0.05] last:border-0">
                {el && <BadgeElite prioritas={el.prioritas_emas} capaian={el.prioritas_capaian} ukuran="mini" />}
                <span className="text-sm text-slate-200 flex-1 truncate">
                  {a.nama_file}
                  {!a.atlet_id && <span className="text-[10px] text-red-400 ml-1.5">blm di sistem</span>}
                </span>
                <span className="text-[11px] text-slate-500 w-32 truncate shrink-0">{a.cabang_file}</span>
                <span className="w-16 shrink-0">
                  {a.target_medali && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                      style={a.target_medali === 'emas' ? { background:'rgba(250,204,21,0.15)', color:'#facc15' }
                           : a.target_medali === 'perak' ? { background:'rgba(148,163,184,0.15)', color:'#cbd5e1' }
                           : { background:'rgba(249,115,22,0.15)', color:'#fb923c' }}>
                      {a.target_medali}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-600 w-40 truncate shrink-0 hidden md:block">
                  {a.pesaing || '—'}
                </span>
              </div>
            )
          })}
          {tampil.length > 300 && (
            <div className="px-4 py-2 text-[11px] text-slate-600">
              Menampilkan 300 dari {tampil.length} baris.
            </div>
          )}
          {tampil.length === 0 && (
            <div className="px-4 py-8 text-[12px] text-slate-600 text-center">
              Tidak ada atlet pada kelompok target ini.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Kotak({ label, nilai, ket, warna, tebal }: {
  label: string; nilai: any; ket: string; warna: string; tebal?: boolean
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`${tebal ? 'text-3xl' : 'text-2xl'} font-bold`} style={{ color: warna }}>{nilai}</div>
      <div className="text-[10px] text-slate-600 mt-0.5">{ket}</div>
    </div>
  )
}
