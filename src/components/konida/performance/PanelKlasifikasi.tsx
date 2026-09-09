'use client'
// src/components/konida/performance/PanelKlasifikasi.tsx
// Pemilahan cabor menurut pengurus — kategori sifat pertandingan dan tingkat
// prioritas — disandingkan dengan raihan Babak Kualifikasi PORPROV 2025.
//
// Angka BK adalah hasil NYATA yang sudah diraih, bukan proyeksi. Itu yang
// membuatnya beda dari papan target: target menyatakan keinginan, papan ini
// menyatakan bukti. Dan begitu keduanya disandingkan, terlihat di mana
// keduanya sejalan dan di mana tidak.

import { useState, useEffect } from 'react'
import { Layers, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { WARNA_KATEGORI } from '@/lib/kategori-cabor'

const WARNA_PRIORITAS: Record<string, string> = {
  '1': '#ef4444', '2': '#f97316', '3': '#eab308', '4': '#64748b',
}

export default function PanelKlasifikasi({ accent = '#38bdf8' }: { accent?: string }) {
  const [d, setD] = useState<any>(null)
  const [sibuk, setSibuk] = useState(true)
  const [lihat, setLihat] = useState<'kategori' | 'prioritas'>('prioritas')
  const [buka, setBuka] = useState<string | null>(null)

  useEffect(() => {
    let hidup = true
    fetch('/api/konida/klasifikasi')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('gagal')))
      .then(x => { if (hidup) setD(x) })
      .catch(() => {})
      .finally(() => { if (hidup) setSibuk(false) })
    return () => { hidup = false }
  }, [])

  if (sibuk) return (
    <div className="rounded-2xl border border-white/10 p-8 text-center">
      <Loader2 size={18} className="mx-auto animate-spin text-slate-600" />
    </div>
  )
  if (!d?.cabor?.length) return null

  const kelompok = lihat === 'kategori' ? d.per_kategori : d.per_prioritas
  const maks = Math.max(1, ...kelompok.map((k: any) => k.emas))
  const warna = (nama: string) =>
    (lihat === 'kategori' ? WARNA_KATEGORI[nama] : WARNA_PRIORITAS[nama]) ?? '#64748b'
  const judul = (nama: string) =>
    lihat === 'prioritas' ? (nama === 'null' ? 'Tanpa prioritas' : `Prioritas ${nama}`) : nama

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.07] flex flex-wrap items-center gap-3">
        <Layers size={16} style={{ color: accent }} className="shrink-0" />
        <div className="min-w-0">
          <h3 className="text-white font-bold text-sm">Pemilahan Cabor &amp; Raihan Babak Kualifikasi</h3>
          <p className="text-[11px] text-slate-500">
            {d.total.emas} emas · {d.total.perak} perak · {d.total.perunggu} perunggu di BK PORPROV 2025 —
            hasil yang <b className="text-slate-400">sudah diraih</b>, bukan target.
          </p>
        </div>
        <div className="ml-auto flex gap-1.5 shrink-0">
          {(['prioritas', 'kategori'] as const).map(v => (
            <button key={v} onClick={() => { setLihat(v); setBuka(null) }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors"
              style={lihat === v
                ? { background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.38)', border: '1px solid transparent' }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Efisiensi: berapa emas dihasilkan tiap 100 atlet ──
          Angka mentah menyesatkan. Terukur punya atlet paling banyak (321)
          tapi emasnya 18; Beladiri dengan 217 atlet menghasilkan 35. Dibaca
          sebagai jumlah, Terukur tampak lebih besar; dibaca sebagai hasil per
          atlet, Beladiri enam kali lebih efisien daripada Beregu. Itu
          pembacaan yang mengubah keputusan, dan hanya muncul kalau dibagi. */}
      {lihat === 'kategori' && (
        <div className="px-4 pt-4">
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2.5">
              Emas per 100 atlet — hasil Babak Kualifikasi dibagi jumlah atlet
            </div>
            <div className="space-y-1">
              {(() => {
                const eff = kelompok
                  .filter((k: any) => k.atlet > 0)
                  .map((k: any) => ({ ...k, rasio: 100 * k.emas / k.atlet }))
                  .sort((a: any, b: any) => b.rasio - a.rasio)
                const maks = Math.max(1, ...eff.map((e: any) => e.rasio))
                return eff.map((e: any) => {
                  const w = warna(e.nama)
                  return (
                    <div key={e.nama} className="flex items-center gap-3">
                      <span className="text-[11px] w-24 shrink-0 capitalize" style={{ color: w }}>
                        {judul(e.nama).toLowerCase()}
                      </span>
                      <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <span className="block h-full rounded-full" style={{ width: `${Math.round(100 * e.rasio / maks)}%`, background: w }} />
                      </span>
                      <span className="text-[11px] font-bold w-10 text-right shrink-0" style={{ color: w }}>
                        {e.rasio.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-600 w-32 text-right shrink-0 hidden md:block">
                        {e.emas} emas · {e.atlet} atlet
                      </span>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-1.5">
        {kelompok.map((k: any) => {
          const w = warna(k.nama)
          const terbuka = buka === k.nama
          const isi = d.cabor.filter((c: any) =>
            String(lihat === 'kategori' ? c.kategori : c.prioritas ?? 'null') === k.nama)
          return (
            <div key={k.nama}>
              <button onClick={() => setBuka(terbuka ? null : k.nama)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                <span className="text-sm font-bold text-slate-200 w-32 text-left truncate shrink-0">
                  {judul(k.nama)}
                </span>
                <span className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span className="block h-full rounded-full"
                    style={{ width: `${Math.round(100 * k.emas / maks)}%`, background: w }} />
                </span>
                <span className="text-sm font-bold w-8 text-right shrink-0" style={{ color: w }}>{k.emas}</span>
                <span className="text-[11px] text-slate-500 w-36 text-right shrink-0 hidden md:block">
                  {k.cabor} cabor · {k.atlet} atlet
                  {k.tanpa_foto > 0 && <span className="text-red-400"> · {k.tanpa_foto} tanpa foto</span>}
                </span>
                {terbuka ? <ChevronDown size={14} className="text-slate-600 shrink-0" />
                         : <ChevronRight size={14} className="text-slate-600 shrink-0" />}
              </button>
              {terbuka && (
                <div className="px-3 pb-2 pt-1 space-y-0.5">
                  {isi.map((c: any) => (
                    <div key={c.cabor} className="flex items-center gap-3 text-[12px] px-3 py-1 rounded-lg bg-white/[0.02]">
                      <span className="text-slate-200 flex-1 truncate">{c.cabor}</span>
                      <span className="text-slate-500 w-24 text-right shrink-0">
                        {c.bk_emas}·{c.bk_perak}·{c.bk_perunggu}
                      </span>
                      <span className="text-slate-500 w-16 text-right shrink-0">{c.atlet} atlet</span>
                      {c.tanpa_foto > 0
                        ? <span className="text-[10px] text-red-400 w-24 text-right shrink-0">{c.tanpa_foto} tanpa foto</span>
                        : <span className="w-24 shrink-0" />}
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-600 px-3 pt-1">Angka medali: emas · perak · perunggu di Babak Kualifikasi.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
