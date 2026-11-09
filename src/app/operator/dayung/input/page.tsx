'use client'
// src/app/operator/dayung/input/page.tsx
// PODSI Jabar — Input Waktu (MODE DEMO). Operator memilih laga dari start list resmi
// (situs panitia), mengetik catatan waktu per perahu, lalu aplikasi mengurutkan,
// memberi medali di final, dan membandingkan dengan hasil resmi. Waktu demo disimpan
// di dayung_demo_waktu (bisa dikosongkan), tidak mengubah hasil resmi.

import { useEffect, useMemo, useState } from 'react'
import { Save, RefreshCw, Timer, Trash2, Copy, FlaskConical, CheckCircle2, AlertTriangle } from 'lucide-react'
import { urutkanDemo, waktuTeks, type StatusDemo } from '@/lib/dayung-jabar'
import {
  muatJabar, muatDemo, bacaKetikan, labelDisiplin, WARNA_MEDALI,
  type JabarData, type DemoWaktu,
} from '@/lib/sport-plugins/dayung/jabar-data'

const ACCENT = '#38bdf8'
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
type Isian = { teks: string; status: StatusDemo }

export default function DayungInputWaktuDemo() {
  const [data, setData] = useState<JabarData | null>(null)
  const [demo, setDemo] = useState<DemoWaktu[]>([])
  const [ref, setRef] = useState<number | null>(null)
  const [isian, setIsian] = useState<Record<number, Isian>>({})
  const [loading, setLoading] = useState(true)
  const [simpan, setSimpan] = useState<'' | 'proses' | 'ok' | string>('')

  const load = async () => {
    setLoading(true)
    const [d, w] = await Promise.all([muatJabar(), muatDemo()])
    setData(d); setDemo(w); setLoading(false)
    if (ref == null) {
      const adaPeserta = new Set(d.peserta.map(p => p.laga_ref))
      const awal = d.laga.find(l => l.perebutan_medali && adaPeserta.has(l.ref)) ?? d.laga.find(l => adaPeserta.has(l.ref))
      if (awal) setRef(awal.ref)
    }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const laga = data?.laga.find(l => l.ref === ref) ?? null
  const peserta = useMemo(() => (data?.peserta ?? []).filter(p => p.laga_ref === ref).sort((a, b) => a.urutan - b.urutan), [data, ref])
  const lagaBerPeserta = useMemo(() => {
    const ada = new Set((data?.peserta ?? []).map(p => p.laga_ref))
    return (data?.laga ?? []).filter(l => ada.has(l.ref))
  }, [data])
  const lagaDemo = useMemo(() => new Set(demo.map(d => d.laga_ref)), [demo])

  // Isi ulang kotak isian dari data demo tersimpan setiap ganti laga
  useEffect(() => {
    const awal: Record<number, Isian> = {}
    for (const p of peserta) {
      const d = demo.find(x => x.laga_ref === ref && x.urutan === p.urutan)
      awal[p.urutan] = { teks: d?.waktu_detik != null ? waktuTeks(d.waktu_detik) : '', status: d?.status ?? 'ok' }
    }
    setIsian(awal); setSimpan('')
  }, [ref, peserta, demo])

  const hasil = useMemo(() => urutkanDemo(
    peserta.map(p => ({ urutan: p.urutan, waktuDetik: bacaKetikan(isian[p.urutan]?.teks ?? ''), status: isian[p.urutan]?.status ?? 'ok' })),
    !!laga?.perebutan_medali,
  ), [peserta, isian, laga])

  const salahKetik = peserta.filter(p => (isian[p.urutan]?.teks ?? '').trim() && bacaKetikan(isian[p.urutan].teks) == null).length
  const terisi = hasil.filter(h => h.peringkat != null).length
  const adaResmi = peserta.some(p => p.waktu_detik != null)
  const cocokResmi = adaResmi && terisi > 0 ? peserta.filter(p => {
    const h = hasil.find(x => x.urutan === p.urutan)
    return h?.peringkat != null && p.peringkat != null && h.peringkat === p.peringkat
  }).length : null

  const ubah = (u: number, o: Partial<Isian>) => { setIsian(s => ({ ...s, [u]: { ...(s[u] ?? { teks: '', status: 'ok' }), ...o } })); setSimpan('') }
  const salinResmi = () => {
    const s: Record<number, Isian> = {}
    peserta.forEach(p => { s[p.urutan] = { teks: p.waktu ?? '', status: 'ok' } })
    setIsian(s); setSimpan('')
  }

  const kirim = async () => {
    if (!ref) return
    setSimpan('proses')
    const baris = peserta.map(p => ({ urutan: p.urutan, waktu_detik: bacaKetikan(isian[p.urutan]?.teks ?? ''), status: isian[p.urutan]?.status ?? 'ok' }))
    const r = await fetch('/api/dayung/demo-waktu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ laga_ref: ref, baris }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setSimpan(j.error ?? 'Gagal menyimpan'); return }
    setDemo(await muatDemo()); setSimpan('ok')
  }
  const kosongkan = async (semua: boolean) => {
    if (!confirm(semua ? 'Kosongkan SEMUA waktu demo di semua laga?' : 'Kosongkan waktu demo laga ini?')) return
    await fetch(`/api/dayung/demo-waktu${semua ? '' : `?laga_ref=${ref}`}`, { method: 'DELETE' })
    setDemo(await muatDemo())
  }

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}><Timer size={20} style={{ color: ACCENT }} /></div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">INPUT WAKTU</h1>
            <div className="text-[11px] text-slate-500">Start list resmi panitia · operator mengetik waktu · peringkat & medali otomatis</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Muat ulang</button>
          <button onClick={() => kosongkan(true)} disabled={demo.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-40"><Trash2 size={12} /> Kosongkan semua demo</button>
        </div>
      </div>

      <div className="rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-xs font-bold" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24' }}>
        <FlaskConical size={14} /> MODE DEMO — waktu yang diketik di sini hanya untuk peragaan dan tidak mengubah hasil resmi panitia.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Pilih laga */}
        <div className="rounded-2xl p-3 max-h-[75vh] overflow-y-auto" style={kartu}>
          <div className="text-[10px] uppercase tracking-widest font-bold mb-2 px-1" style={{ color: ACCENT }}>Pilih laga · {lagaBerPeserta.length}</div>
          {lagaBerPeserta.map(l => (
            <button key={l.ref} onClick={() => setRef(l.ref)}
              className={`w-full text-left rounded-lg px-2.5 py-2 mb-1 ${ref === l.ref ? 'bg-sky-500/15 border border-sky-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
              <div className="text-[11px] text-slate-200 font-medium leading-tight">{l.nomor}</div>
              <div className="text-[10px] text-slate-500 flex gap-1.5 flex-wrap mt-0.5">
                <span>{l.tanggal?.slice(5)} {l.jam ?? ''}</span><span>· {l.babak}{l.kode ? ` ${l.kode}` : ''}</span>
                {l.perebutan_medali && <span style={{ color: WARNA_MEDALI.emas }}>· final</span>}
                {lagaDemo.has(l.ref) && <span className="text-amber-300">· ada isian demo</span>}
              </div>
            </button>
          ))}
          {!loading && lagaBerPeserta.length === 0 && <div className="text-xs text-slate-600 p-2">Belum ada laga dengan start list.</div>}
        </div>

        {/* Isian waktu */}
        <div className="rounded-2xl p-5" style={kartu}>
          {!laga ? <div className="text-xs text-slate-500">Pilih laga di kiri.</div> : (
            <>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{labelDisiplin(laga.disiplin)} · {laga.babak}{laga.kode ? ` (${laga.kode})` : ''}{laga.perebutan_medali ? ' · perebutan medali' : ''}</div>
                  <h2 className="text-lg font-black text-white">{laga.nomor}</h2>
                  <div className="text-[11px] text-slate-500">{laga.tanggal} {laga.jam ?? ''} · {laga.venue ?? ''}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {adaResmi && <button onClick={salinResmi} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10"><Copy size={12} /> Salin waktu resmi</button>}
                  {lagaDemo.has(laga.ref) && <button onClick={() => kosongkan(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10"><Trash2 size={12} /> Kosongkan laga ini</button>}
                  <button onClick={kirim} disabled={simpan === 'proses' || salahKetik > 0} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-900 disabled:opacity-50" style={{ background: ACCENT }}>
                    <Save size={12} /> {simpan === 'proses' ? 'Menyimpan…' : 'Simpan'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                    <th className="text-left py-2 w-10">Urut</th><th className="text-left">Kontingen & awak</th>
                    <th className="text-left w-32">Waktu (m:ss.cc)</th><th className="text-left w-20">Status</th>
                    <th className="text-center w-16">Peringkat</th><th className="text-right w-16">Selisih</th><th className="text-center w-20">Medali</th>
                    <th className="text-right w-28 text-slate-600">Resmi</th>
                  </tr></thead>
                  <tbody>
                    {peserta.map(p => {
                      const h = hasil.find(x => x.urutan === p.urutan)
                      const i = isian[p.urutan] ?? { teks: '', status: 'ok' as StatusDemo }
                      const salah = i.teks.trim() !== '' && bacaKetikan(i.teks) == null
                      const beda = h?.peringkat != null && p.peringkat != null && h.peringkat !== p.peringkat
                      return (
                        <tr key={p.urutan} className="border-b border-white/5">
                          <td className="py-2 font-black text-slate-500">{p.urutan}</td>
                          <td className="pr-2"><div className="text-slate-200 font-medium">{p.kontingen}</div><div className="text-[10px] text-slate-500">{p.atlet_nama.join(', ')}</div></td>
                          <td><input value={i.teks} onChange={e => ubah(p.urutan, { teks: e.target.value })} disabled={i.status !== 'ok'} placeholder="1:29.96" inputMode="decimal"
                            className={`w-28 px-2 py-1.5 rounded-lg font-mono text-sm bg-slate-900 border ${salah ? 'border-red-500' : 'border-white/10'} text-white disabled:opacity-40`} /></td>
                          <td><select value={i.status} onChange={e => ubah(p.urutan, { status: e.target.value as StatusDemo })} className="px-1.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10">
                            {['ok', 'DNS', 'DNF', 'DSQ'].map(s => <option key={s} value={s}>{s === 'ok' ? 'Finis' : s}</option>)}</select></td>
                          <td className="text-center font-black text-base" style={{ color: h?.medali ? WARNA_MEDALI[h.medali] : '#e2e8f0' }}>{h?.peringkat ?? (i.status !== 'ok' ? i.status : '—')}</td>
                          <td className="text-right font-mono text-slate-500 text-[11px]">{h?.selisih ? `+${h.selisih.toFixed(2)}` : ''}</td>
                          <td className="text-center">{h?.medali && <span className="text-[11px] font-bold capitalize" style={{ color: WARNA_MEDALI[h.medali] }}>{h.medali}</span>}</td>
                          <td className={`text-right font-mono text-[11px] ${beda ? 'text-amber-300' : 'text-slate-600'}`}>{p.waktu ? `${p.waktu} · #${p.peringkat}` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-4 flex-wrap mt-3 text-[11px]">
                <span className="text-slate-500">{terisi}/{peserta.length} perahu berwaktu</span>
                {salahKetik > 0 && <span className="text-red-400">{salahKetik} waktu tidak terbaca — contoh benar: 1:29.96 atau 45.12</span>}
                {cocokResmi != null && (cocokResmi === terisi
                  ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} /> Urutan sama dengan hasil resmi</span>
                  : <span className="flex items-center gap-1 text-amber-300"><AlertTriangle size={12} /> {terisi - cocokResmi} perahu beda urutan dengan hasil resmi</span>)}
                {simpan === 'ok' && <span className="text-emerald-400">Tersimpan.</span>}
                {simpan && !['ok', 'proses'].includes(simpan) && <span className="text-red-400">{simpan}</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
