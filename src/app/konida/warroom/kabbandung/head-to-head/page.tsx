'use client'
// Halaman Head-to-Head: 74 target emas KONI dengan lawannya — lawan pasti dari bagan
// situs panitia, pesaing utama dari File B, dan calon lawan per kontingen. Klik kartu
// untuk membuka rinciannya. Data situs ditarik bertahap (server menahan jedanya).

import { useMemo, useState } from 'react'
import { Swords, RefreshCw } from 'lucide-react'
import PanelHeadToHead, { RingkasLawan, useHeadToHead, type TargetH2H } from '@/components/konida/warroom/HeadToHead'
import { tglPanjangWR } from '@/lib/warroom-klien'

const judul = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const hariIni = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)

export default function HalamanHeadToHead() {
  const { data, galat, menarik, tarik } = useHeadToHead()
  const [buka, setBuka] = useState<number | null>(null)
  const [cabor, setCabor] = useState('')
  const [tampil, setTampil] = useState<'mendatang' | 'semua' | 'pasti'>('mendatang')
  const [cari, setCari] = useState('')

  const target = useMemo(() => data?.target ?? [], [data])
  const daftarCabor = useMemo(() => Array.from(new Set(target.map(t => t.cabor))).sort(), [target])
  const saring = useMemo(() => {
    const q = cari.trim().toLowerCase(), h = hariIni()
    return target.filter(t =>
      (!cabor || t.cabor === cabor) &&
      (tampil === 'semua' || (tampil === 'mendatang' ? t.tanggal >= h : t.lawan_pasti.length > 0)) &&
      (!q || [t.cabor, t.nomor ?? '', ...t.wajah.map(w => w.nama), t.pesaing ?? '', ...t.kontingen_disebut].join(' ').toLowerCase().includes(q)))
  }, [target, cabor, tampil, cari])
  const perTanggal = useMemo(() => {
    const m = new Map<string, TargetH2H[]>()
    for (const t of saring) m.set(t.tanggal, [...(m.get(t.tanggal) ?? []), t])
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [saring])
  const s = data?.sinkron
  const pasti = target.filter(t => t.lawan_pasti.length).length

  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at top, #0a1a2e 0%, #030812 60%)' }}>
      <div className="max-w-[1400px] mx-auto p-6 space-y-5">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-300"><Swords size={14} /> Command Center</div>
            <h1 className="text-2xl font-black mt-1">Head-to-Head Target Emas</h1>
            <p className="text-sm text-zinc-400 mt-1">Siapa lawan tiap target emas KONI: lawan pasti dari bagan panitia, pesaing utama dari analisis KONI, dan calon lawan per kontingen.</p>
          </div>
          <div className="text-right">
            <button type="button" onClick={() => tarik(true)} disabled={menarik}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border border-white/15 bg-white/5 disabled:opacity-50">
              <RefreshCw size={12} className={menarik ? 'animate-spin' : ''} /> {menarik ? 'Menarik dari situs panitia…' : 'Tarik sekarang'}
            </button>
            <div className="text-[11px] text-zinc-500 mt-1">
              {s ? `${s.peserta.toLocaleString('id-ID')} peserta · ${s.bagan} bagan terbaca` : 'Memuat…'}
              {s?.terakhir ? ` · ${new Date(s.terakhir).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
              {s?.ringkas?.cabor_tersisa ? ` · ${s.ringkas.cabor_tersisa} cabor menyusul` : ''}
            </div>
          </div>
        </header>

        {galat && <div className="rounded-xl bg-red-500/15 border border-red-400/40 px-4 py-3 text-sm text-red-200">{galat}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {([['Target emas', target.length, '#ffd700'], ['Sudah ada lawan pasti', pasti, '#f87171'], ['Pesaing disebut KONI', target.filter(t => t.pesaing).length, '#fb923c'], ['Peserta terbaca', s?.peserta ?? 0, '#38bdf8']] as [string, number, string][]).map(([l, v, w]) => (
            <div key={l} className="rounded-xl px-4 py-3" style={{ background: `${w}0d`, border: `1px solid ${w}33` }}>
              <div className="text-2xl font-black tabular-nums" style={{ color: w }}>{v.toLocaleString('id-ID')}</div>
              <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold">{l}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {([['mendatang', 'Mulai hari ini'], ['pasti', 'Sudah ada lawan pasti'], ['semua', 'Semua tanggal']] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTampil(k)} aria-pressed={tampil === k}
              className={`rounded-full px-3 py-1.5 text-xs font-bold border ${tampil === k ? 'bg-sky-500 text-slate-950 border-sky-400' : 'border-white/15 text-zinc-300'}`}>{l}</button>
          ))}
          <select value={cabor} onChange={e => setCabor(e.target.value)} aria-label="Saring cabor" className="rounded-lg bg-slate-900 border border-white/15 px-3 py-1.5 text-xs">
            <option value="">Semua cabor</option>
            {daftarCabor.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari atlet, nomor, kontingen lawan…" aria-label="Cari"
            className="flex-1 min-w-[200px] rounded-lg bg-slate-900 border border-white/15 px-3 py-1.5 text-xs" />
        </div>

        {!data && !galat && <div className="text-center text-zinc-400 py-16">Memuat…</div>}
        {data && !saring.length && <div className="text-center text-zinc-400 py-10">Tidak ada target yang cocok.</div>}

        {perTanggal.map(([tgl, daftar]) => (
          <section key={tgl}>
            <h2 className="text-sm font-black uppercase tracking-widest text-yellow-300 mb-2">{tglPanjangWR(tgl)} · {daftar.length} target</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {daftar.map(t => (
                <div key={t.urutan} className={buka === t.urutan ? 'lg:col-span-2' : ''}>
                  {buka === t.urutan
                    ? <PanelHeadToHead urutan={t.urutan} onTutup={() => setBuka(null)} />
                    : <button type="button" onClick={() => setBuka(t.urutan)}
                        className="w-full text-left flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/5 transition"
                        style={{ background: 'rgba(2,10,20,0.65)', border: `1px solid ${t.lawan_pasti.length ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                        <div className="flex -space-x-3 shrink-0">
                          {(t.wajah.length ? t.wajah : [{ nama: t.cabor, foto: null, atlet_id: null }]).slice(0, 3).map((w, i) => w.foto
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img key={i} src={w.foto} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-yellow-400" />
                            : <div key={i} className="w-10 h-10 rounded-full grid place-items-center text-xs font-black border-2 border-yellow-400 text-yellow-300 bg-white/5">{w.nama.split(' ').slice(0, 2).map(x => x[0]).join('')}</div>)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black truncate">{t.wajah.length === 1 ? judul(t.wajah[0].nama) : t.wajah.length ? `${judul(t.wajah[0].nama).split(' ')[0]} dkk.` : `Tim ${judul(t.cabor)}`}</div>
                          <div className="text-[11px] truncate"><b className="uppercase text-sky-300">{t.cabor}</b> <span className="text-zinc-400">· {t.nomor ?? '—'}</span></div>
                          <RingkasLawan t={t} />
                        </div>
                        <Swords size={16} className="text-red-300 shrink-0" />
                      </button>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
