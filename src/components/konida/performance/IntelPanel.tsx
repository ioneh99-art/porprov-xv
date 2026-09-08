'use client'
// src/components/konida/performance/IntelPanel.tsx
// Panel intelijen strategis di Performance Center, dari berkas Analisis Strategis.
//
// Kenapa di sini dan bukan di Data Gateway: gerbang itu tempat MEMASUKKAN data.
// Papan ini untuk DILIHAT — dan Performance Center sebelumnya hanya bertumpu
// pada 50 atlet ber-baseline, sementara berkas analisis mencakup 658 atlet.
// Jadi memindahkannya ke sini bukan sekadar merapikan menu, tapi menambal
// kekurangan cakupan terbesar halaman ini.

import { useState, useEffect, useMemo } from 'react'
import {
  Target, Swords, Medal, Loader2, ChevronDown, ChevronRight, AlertTriangle, Trophy,
} from 'lucide-react'

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

  useEffect(() => {
    let hidup = true
    fetch('/api/rekonsiliasi/kbaas')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Gagal memuat')))
      .then(d => { if (hidup) setData(d) })
      .catch(e => { if (hidup) setGalat(e.message) })
      .finally(() => { if (hidup) setSibuk(false) })
    return () => { hidup = false }
  }, [])

  const atlet: AtletIntel[]   = data?.atlet ?? []
  const cabang: CabangIntel[] = data?.cabang ?? []
  const prioritas: Prioritas[] = data?.prioritas ?? []

  // ── Peta ancaman: kontingen lawan tersering ──
  const ancaman = useMemo(() => {
    const hit = new Map<string, { total: number; cabor: Map<string, number> }>()
    for (const a of atlet) {
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
  }, [atlet])

  // ── Selisih keyakinan cabor vs KONI ──
  const selisih = useMemo(() =>
    cabang
      .filter(c => c.target_cabor_emas != null && c.target_koni_emas != null)
      .map(c => ({ ...c, d: (c.target_cabor_emas ?? 0) - (c.target_koni_emas ?? 0) }))
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d)),
  [cabang])

  const prioTanpaFoto = prioritas.filter(p => !p.foto_url)

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
        <Kotak label="Atlet Prioritas" nilai={prioritas.length} ket="ditandai pengurus" warna="#facc15" />
        <Kotak label="Belum Berfoto" nilai={prioTanpaFoto.length} ket="dari atlet prioritas"
          warna={prioTanpaFoto.length ? '#ef4444' : '#34d399'} />
      </div>

      {/* ── Peta ancaman ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2.5">
          <Swords size={16} style={{ color: accent }} />
          <div>
            <h3 className="text-white font-bold text-sm">Peta Ancaman</h3>
            <p className="text-[11px] text-slate-500">
              Kontingen lawan yang paling sering disebut pada {atlet.filter(a => a.pesaing).length} baris analisis.
            </p>
          </div>
        </div>
        <div className="p-4 space-y-1.5">
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
                <b className="text-slate-300">{ancaman[0].nama}</b> adalah lawan terberat —
                disebut {ancaman[0].total} kali, {ancaman[1] ? `${(ancaman[0].total / ancaman[1].total).toFixed(1)}× lebih sering daripada ${ancaman[1].nama}` : 'jauh di atas yang lain'}.
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

      {/* ── Atlet prioritas ── */}
      {prioritas.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-2.5">
            <Trophy size={16} className="text-amber-400" />
            <div>
              <h3 className="text-white font-bold text-sm">Atlet Prioritas Emas ({prioritas.length})</h3>
              <p className="text-[11px] text-slate-500">
                Ditandai pengurus cabor pada berkas analisis — penilaian orang lapangan, bukan hitungan sistem.
              </p>
            </div>
          </div>
          <div className="max-h-80 overflow-auto">
            {prioritas.slice(0, 200).map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.05] last:border-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: p.prioritas_emas === 'jingga' ? '#fb923c' : '#facc15' }} />
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
            <h3 className="text-white font-bold text-sm">Capaian Terbaik &amp; Pesaing ({atlet.length})</h3>
            <p className="text-[11px] text-slate-500">
              Kolom capaian mencatat prestasi yang <b className="text-slate-400">sudah diraih</b>, bukan proyeksi.
            </p>
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          {atlet.slice(0, 300).map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.05] last:border-0">
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
          ))}
          {atlet.length > 300 && (
            <div className="px-4 py-2 text-[11px] text-slate-600">
              Menampilkan 300 dari {atlet.length} baris.
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
