'use client'
// KlasemenBanding — dua tampilan klasemen medali di War Room (keputusan Bos 6 Nov 2026):
//  • "Rekap sementara" (dibuka pertama): kontingen lain dari situs KONI Kota Bandung,
//    Kab. Bandung dari data kita yang disahkan saat ini — khusus dalam aplikasi.
//  • "Situs KONI Jabar": klasemen resmi panitia apa adanya + kotak akurasi data Kab. Bandung.

import { useEffect, useMemo, useState } from 'react'
import { Flag, RefreshCw } from 'lucide-react'
import type { BarisKlasemenPublik, KlasemenPublik } from '@/lib/jadwal-publik'
import { JENIS, bandingKlasemen, klasemenDisesuaikan, type AngkaMedali } from '@/lib/klasemen-banding'

const WARNA = { emas: '#ffd700', perak: '#c0c0c0', perunggu: '#cd7f32' } as const
type Sementara = { potret: string | null; potret_at?: string; sumber?: string; langsung?: boolean; kab_bandung_sumber?: AngkaMedali | null; baris: BarisKlasemenPublik[] }
const jamWIB = (iso?: string) => iso ? new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

export default function KlasemenBanding({ kita, q = '' }: { kita: AngkaMedali | null; q?: string }) {
  const [situs, setSitus] = useState<KlasemenPublik | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)
  const [mode, setMode] = useState<'situs' | 'sementara'>('sementara')
  const [sementara, setSementara] = useState<Sementara | null>(null)
  const [semua, setSemua] = useState(false)

  async function muat() {
    setMemuat(true)
    fetch(`/api/konida/klasemen-sementara${q}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).then(j => { if (j?.baris) setSementara(j) }).catch(() => {})
    try {
      const r = await fetch(`/api/konida/klasemen-situs${q}`, { cache: 'no-store' })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.baris) { setGalat(j?.error ?? 'Klasemen situs tidak terbaca.'); return }
      setSitus(j); setGalat(null)
    } catch { setGalat('Klasemen situs tidak terbaca (jaringan).') } finally { setMemuat(false) }
  }
  useEffect(() => { muat(); const t = setInterval(muat, 5 * 60_000); return () => clearInterval(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const angkaKita = kita ?? { emas: 0, perak: 0, perunggu: 0 }
  const banding = useMemo(() => situs ? bandingKlasemen(situs.baris, angkaKita) : null, [situs, angkaKita.emas, angkaKita.perak, angkaKita.perunggu]) // eslint-disable-line react-hooks/exhaustive-deps
  const baris = useMemo(() => mode === 'sementara' ? klasemenDisesuaikan(sementara?.baris ?? [], angkaKita) : situs?.baris ?? [],
    [situs, sementara, mode, angkaKita.emas, angkaKita.perak, angkaKita.perunggu]) // eslint-disable-line react-hooks/exhaustive-deps
  const jamKini = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const batas = 10
  const kitaBaris = baris.find(b => b.kita)
  const tampil = semua ? baris : baris.slice(0, batas)
  const kitaDiLuar = !semua && kitaBaris && !tampil.includes(kitaBaris)
  const warnaAkurasi = banding?.akurasi == null ? '#64748b' : banding.akurasi >= 95 ? '#34d399' : banding.akurasi >= 70 ? '#fbbf24' : '#f87171'

  const tr = (b: (typeof baris)[number]) => (
    <tr key={b.nama} className={b.kita ? 'bg-sky-400/10' : ''} style={b.kita ? { boxShadow: 'inset 3px 0 0 #38bdf8' } : {}}>
      <td className="py-1.5 pl-3 pr-1 text-center tabular-nums font-bold text-zinc-400">{b.total > 0 ? b.peringkat : '–'}</td>
      <td className={`py-1.5 px-1 ${b.kita ? 'font-black text-sky-200' : 'font-semibold text-white'}`}>
        {b.nama}{b.kita && mode !== 'situs' ? <span className="ml-1 text-[10px] font-bold text-sky-300">(data kita)</span> : ''}
      </td>
      {JENIS.map(j => <td key={j} className="py-1.5 px-1 text-right tabular-nums font-bold" style={{ color: WARNA[j] }}>{b[j]}</td>)}
      <td className="py-1.5 pl-1 pr-3 text-right tabular-nums font-black text-white">{b.total}</td>
    </tr>
  )

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(2,10,20,0.65)', border: '1px solid rgba(56,189,248,0.22)' }}>
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap" style={{ borderColor: 'rgba(56,189,248,0.15)', background: 'linear-gradient(90deg, rgba(56,189,248,0.10), transparent)' }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-400"><Flag size={12} /> Klasemen medali</div>
          <h3 className="text-base font-black text-white mt-0.5">{mode === 'sementara' ? 'Rekap sementara perolehan medali' : 'Klasemen resmi situs KONI Jabar'}</h3>
          {mode === 'sementara' ? <p className="text-[11px] text-zinc-500 mt-0.5">Kontingen lain: situs KONI Kota Bandung · Kab. Bandung: data kita yang disahkan</p> : <p className="text-[11px] text-zinc-500 mt-0.5">
            Sumber: porprov.konijabar.or.id{situs?.diperbarui ? ` · ${situs.diperbarui}` : ''}
            {situs?.selesai != null && situs.nomor ? ` · panitia: ${situs.selesai.toLocaleString('id-ID')} dari ${situs.nomor.toLocaleString('id-ID')} nomor terverifikasi` : ''}
          </p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-white/10 text-[11px] font-bold">
            <button onClick={() => setMode('sementara')} aria-pressed={mode === 'sementara'} className={`px-3 py-1.5 ${mode === 'sementara' ? 'bg-amber-300 text-slate-950' : 'text-amber-200'}`}>Rekap sementara</button>
            <button onClick={() => setMode('situs')} aria-pressed={mode === 'situs'} className={`px-3 py-1.5 ${mode === 'situs' ? 'bg-sky-400 text-slate-950' : 'text-zinc-300'}`}>Situs KONI Jabar</button>
          </div>
          <button onClick={muat} disabled={memuat} title="Baca ulang situs" className="rounded-lg border border-white/10 p-1.5 text-zinc-300 disabled:opacity-40"><RefreshCw size={13} className={memuat ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {galat && mode === 'situs' && <p className="mx-5 mt-4 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-xs font-bold text-red-300">{galat}</p>}

      {((mode === 'situs' && banding) || (mode === 'sementara' && sementara?.potret)) && (
        <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-x-auto">
            {mode === 'sementara' && sementara && (
              <div className="border-b border-amber-300/20 bg-amber-300/5 px-3 py-2 text-[11px] leading-snug text-amber-100">
                <b>Rekap sementara</b> · kontingen lain: {sementara.sumber}{sementara.potret_at ? ` · ${sementara.langsung ? 'dibaca ' : ''}${jamWIB(sementara.potret_at)} WIB` : ''}.
                <div className="mt-0.5 font-bold text-sky-200">Kab. Bandung: data kita yang sudah disahkan KONIDA, per {jamKini} WIB ({angkaKita.emas}/{angkaKita.perak}/{angkaKita.perunggu}).</div>
                {sementara.kab_bandung_sumber && JENIS.some(j => sementara.kab_bandung_sumber![j] !== angkaKita[j]) && (
                  <div className="mt-0.5 text-amber-200">Situs KONI Kota Bandung mencatat Kab. Bandung {sementara.kab_bandung_sumber.emas}/{sementara.kab_bandung_sumber.perak}/{sementara.kab_bandung_sumber.perunggu}
                    {JENIS.some(j => sementara.kab_bandung_sumber![j] > angkaKita[j]) ? ' — ada medali di sana yang belum ada di data kita, cek Antrean.' : ' — data kita lebih baru.'}</div>
                )}
                <div className="mt-0.5 text-amber-100/70">Hanya tampil di dalam aplikasi; halaman publik tetap mengikuti situs KONI Jabar.</div>
              </div>
            )}
            <table className="w-full text-[12px] min-w-[300px]">
              <thead>
                <tr className="text-[10px] text-zinc-500 border-b border-white/10">
                  <th className="py-1.5 pl-3 pr-1 w-8">#</th>
                  <th className="py-1.5 px-1 text-left">Kontingen</th>
                  <th className="py-1.5 px-1 w-8 text-right" aria-label="Emas">🥇</th>
                  <th className="py-1.5 px-1 w-8 text-right" aria-label="Perak">🥈</th>
                  <th className="py-1.5 px-1 w-8 text-right" aria-label="Perunggu">🥉</th>
                  <th className="py-1.5 pl-1 pr-3 w-10 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tampil.map(tr)}
                {kitaDiLuar && (<><tr aria-hidden><td colSpan={6} className="py-0.5 text-center text-zinc-600 text-[10px]">⋯</td></tr>{tr(kitaBaris!)}</>)}
              </tbody>
            </table>
            {baris.length > batas && (
              <button onClick={() => setSemua(x => !x)} className="w-full border-t border-white/10 py-2 text-[11px] font-bold text-sky-300">{semua ? 'Tampilkan 10 teratas' : `Lihat semua ${baris.length} kontingen`}</button>
            )}
          </div>

          {mode === 'situs' && banding && <div className="rounded-2xl border p-4 md:w-72" style={{ borderColor: `${warnaAkurasi}55`, background: `${warnaAkurasi}0d` }}>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Akurasi data Kab. Bandung</div>
            <div className="text-3xl font-black mt-1" style={{ color: warnaAkurasi }}>{banding.akurasi == null ? '—' : `${banding.akurasi}%`}</div>
            <div className="text-[11px] text-zinc-400">{banding.cocok} medali sama-sama tercatat</div>
            <table className="w-full text-[12px] mt-3">
              <thead><tr className="text-[10px] text-zinc-500"><th className="text-left font-semibold"></th><th className="text-right font-semibold">Situs</th><th className="text-right font-semibold">Kita</th><th className="text-right font-semibold">Selisih</th></tr></thead>
              <tbody>
                {JENIS.map(j => (
                  <tr key={j}>
                    <td className="py-0.5 font-bold capitalize" style={{ color: WARNA[j] }}>{j}</td>
                    <td className="py-0.5 text-right tabular-nums text-white">{banding.situs[j]}</td>
                    <td className="py-0.5 text-right tabular-nums text-white">{banding.kita[j]}</td>
                    <td className={`py-0.5 text-right tabular-nums font-bold ${banding.selisih[j] === 0 ? 'text-zinc-500' : banding.selisih[j] > 0 ? 'text-amber-300' : 'text-red-300'}`}>{banding.selisih[j] > 0 ? '+' : ''}{banding.selisih[j]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-black/30 py-1.5"><div className="text-[9px] uppercase tracking-wider text-zinc-500">Peringkat situs</div><div className="text-sm font-black text-white">{banding.peringkatSitus ? `#${banding.peringkatSitus}` : '–'}</div></div>
              <div className="rounded-lg bg-black/30 py-1.5"><div className="text-[9px] uppercase tracking-wider text-zinc-500">Dengan data kita</div><div className="text-sm font-black text-sky-300">{banding.peringkatKita ? `#${banding.peringkatKita}` : '–'}</div></div>
            </div>
            <ul className="mt-3 space-y-1.5 text-[11px] leading-snug text-zinc-300">
              {banding.catatan.map(c => <li key={c}>• {c}</li>)}
            </ul>
          </div>}
        </div>
      )}
      {!banding && !galat && mode === 'situs' && <p className="px-5 py-6 text-sm text-zinc-500">Membaca klasemen situs KONI Jabar…</p>}
      {mode === 'sementara' && !sementara?.potret && <p className="px-5 py-6 text-sm text-zinc-500">{sementara ? 'Rekap sementara belum tersedia.' : 'Membaca rekap sementara…'}</p>}
    </div>
  )
}
