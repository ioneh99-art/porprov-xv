'use client'
// PerburuanEmas — Layar 4 Command Center. Tiga bagian:
//  1. Kalender Panas raksasa: tiap hari = tumpukan koin, satu koin satu target emas KONI
//     (kosong → berdenyut saat bertanding → emas berkilau / perak-perunggu / redup ✕).
//  2. Wajah calon peraih emas hari ini (atau hari target terdekat): kartu besar per target.
//  3. Hitungan perburuan + batang progres.
// Semua status hanya berubah dari laporan yang SUDAH disahkan KONIDA.

import { useMemo } from 'react'
import type { DataWarRoom } from '@/lib/warroom-klien'
import { tglPanjangWR } from '@/lib/warroom-klien'
import type { CalonEmas, StatusMisi } from '@/lib/warroom'

const EMAS = '#ffd700', PERAK = '#e2e8f0', PERUNGGU = '#e0a060', HIJAU = '#34d399', MERAH = '#f87171'
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const judul = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const inisial = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()

const PITA: Record<StatusMisi, { teks: string; warna: string }> = {
  belum:       { teks: 'Menunggu',           warna: '#94a3b8' },
  berjalan:    { teks: 'Sedang bertanding',  warna: HIJAU },
  emas:        { teks: 'EMAS ✓',             warna: EMAS },
  medali_lain: { teks: 'Medali',             warna: PERAK },
  meleset:     { teks: 'Tanpa medali',       warna: MERAH },
}

/** Gaya koin per status — dipakai Layar 4 dan Kalender Panas War Room. */
export function gayaKoin(c: Pick<CalonEmas, 'status' | 'hasil'>): React.CSSProperties {
  const lain = c.status === 'medali_lain' ? (c.hasil === 'perunggu' ? PERUNGGU : PERAK) : null
  return c.status === 'emas' ? { background: `radial-gradient(circle at 35% 30%, #fff8c4, ${EMAS} 45%, #b8860b)`, boxShadow: `0 0 10px ${EMAS}aa`, animation: 'pe-kilau 2.4s ease-in-out infinite', color: '#1a1200' }
    : c.status === 'berjalan' ? { background: `${HIJAU}cc`, boxShadow: `0 0 10px ${HIJAU}`, animation: 'pe-denyut 1.2s ease-in-out infinite' }
    : lain ? { background: `radial-gradient(circle at 35% 30%, #fff, ${lain} 55%, #64748b)` }
    : c.status === 'meleset' ? { background: 'rgba(248,113,113,0.12)', border: `2px solid ${MERAH}55`, color: MERAH }
    : { border: `2px solid ${EMAS}88`, background: 'rgba(255,215,0,0.05)' }
}
/** Animasi koin & kartu (sekali pasang per halaman). */
export const CSS_KOIN = `
  @keyframes pe-kilau{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
  @keyframes pe-denyut{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.18);opacity:.7}}
  @keyframes pe-bingkai{0%,100%{box-shadow:0 0 6px ${HIJAU}55}50%{box-shadow:0 0 22px ${HIJAU}}}
  @keyframes pe-sapu{0%{background-position:150% 0}60%,100%{background-position:-100% 0}}
  @media (prefers-reduced-motion: reduce){[data-koin],[data-kartu-emas] *{animation:none!important}}
`

function Koin({ c, ukuran }: { c: CalonEmas; ukuran: string }) {
  return (
    <div data-koin className="rounded-full grid place-items-center font-black shrink-0" title={`${c.cabor} · ${c.nomor ?? ''} · ${c.atlet ?? ''}`}
      style={{ width: ukuran, height: ukuran, fontSize: `calc(${ukuran} * 0.5)`, color: '#1a1200', ...gayaKoin(c) }}>
      {c.status === 'meleset' ? '✕' : c.status === 'emas' ? '★' : ''}
    </div>
  )
}

function Wajah({ w, warna, ukuran }: { w: { nama: string; foto: string | null }; warna: string; ukuran: string }) {
  return w.foto
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={w.foto} alt="" className="rounded-full object-cover shrink-0" style={{ width: ukuran, height: ukuran, border: `0.25vw solid ${warna}` }} />
    : <div className="rounded-full grid place-items-center font-black shrink-0" style={{ width: ukuran, height: ukuran, border: `0.25vw solid ${warna}`, color: warna, background: 'rgba(255,255,255,0.04)', fontSize: `calc(${ukuran} * 0.36)` }}>{inisial(w.nama)}</div>
}

function KartuCalon({ c, besar }: { c: CalonEmas; besar: boolean }) {
  const p = PITA[c.status]
  const warna = c.status === 'medali_lain' ? (c.hasil === 'perunggu' ? PERUNGGU : PERAK) : p.warna
  const emas = c.status === 'emas'
  const redup = c.status === 'belum' || c.status === 'meleset'
  const ukuranFoto = 'min(8vw, 13vh)'
  // Sudah ada medali → tampilkan atlet di laporan yang disahkan (bisa beda dari nama proyeksi).
  const orang = c.peraih?.length ? c.peraih : c.wajah
  const tim = orang.length > 1 || (c.tim && !c.peraih?.length)
  const wajah = orang.length ? orang : [{ nama: c.atlet && !/^(TEAM|TIM)$/i.test(c.atlet) ? c.atlet : `Tim ${judul(c.cabor)}`, foto: null, atlet_id: null }]
  const tampil = wajah.slice(0, tim ? 4 : 1)
  const namaTampil = tim
    ? (orang.length ? `${orang.slice(0, 3).map(w => judul(w.nama).split(' ')[0]).join(', ')}${orang.length > 3 ? ` +${orang.length - 3}` : ''}` : `Tim ${judul(c.cabor)}`)
    : judul(wajah[0].nama)
  const bingkai: React.CSSProperties = {
    background: emas ? 'linear-gradient(160deg, rgba(255,215,0,0.32), rgba(184,134,11,0.18) 60%, rgba(2,10,20,0.8))' : 'rgba(2,10,20,0.65)',
    border: `0.15vw solid ${emas ? EMAS : c.status === 'berjalan' ? HIJAU : `${warna}44`}`,
    boxShadow: emas ? `0 0 2.5vw ${EMAS}66` : c.status === 'berjalan' ? `0 0 1.5vw ${HIJAU}55` : undefined,
    animation: c.status === 'berjalan' ? 'pe-bingkai 1.6s ease-in-out infinite' : undefined,
  }
  const kilau = emas && <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)', backgroundSize: '250% 100%', animation: 'pe-sapu 3.5s ease-in-out infinite' }} />
  const foto = (u: string) => (
    <div className="flex justify-center -space-x-[1.2vw] shrink-0" style={{ filter: redup ? 'grayscale(0.55) brightness(0.8)' : undefined }}>
      {tampil.map((w, i) => <Wajah key={i} w={w} warna={warna} ukuran={tim && tampil.length > 1 ? `calc(${u} * 0.7)` : u} />)}
    </div>
  )
  const pita = (ukuran: string) => (
    <span className="inline-block rounded-full font-black uppercase tracking-widest px-[0.8vw] py-[0.3vh] whitespace-nowrap"
      style={{ fontSize: ukuran, color: emas ? '#1a1200' : warna, background: emas ? EMAS : `${warna}1f`, border: `1px solid ${warna}88` }}>
      {c.status === 'berjalan' && '● '}{c.status === 'medali_lain' && c.hasil ? judul(c.hasil) : p.teks}
    </span>
  )

  // Hari ramai (> 4 target): kartu mendatar — foto kiri, nama kanan — supaya nama tetap terbaca.
  if (!besar) return (
    <div className="relative rounded-[1vw] overflow-hidden flex items-center gap-[0.8vw] px-[0.8vw] py-[1vh] min-h-0" style={bingkai}>
      {kilau}
      {foto('min(4.2vw, 7.5vh)')}
      <div className="min-w-0 flex-1 relative">
        <div className="font-black text-white leading-tight truncate" style={{ fontSize: '1.15vw' }} title={namaTampil}>{namaTampil}</div>
        <div className="truncate leading-snug" style={{ fontSize: '0.75vw' }}><b className="uppercase tracking-wide" style={{ color: '#7dd3fc' }}>{c.cabor}</b> <span className="text-slate-300">· {c.nomor ?? '—'}</span></div>
        {c.keterangan && <div className="leading-snug text-amber-100/90 line-clamp-2" style={{ fontSize: '0.7vw' }} title={c.keterangan}>📝 {c.keterangan}</div>}
        <div className="mt-[0.4vh]">{pita('0.72vw')}</div>
      </div>
    </div>
  )

  return (
    <div className="relative rounded-[1.2vw] overflow-hidden flex flex-col items-center text-center px-[1vw] py-[1.6vh] min-h-0" style={bingkai}>
      {kilau}
      {foto(ukuranFoto)}
      <div className="font-black text-white leading-tight mt-[1.2vh] line-clamp-2" style={{ fontSize: '1.9vw' }}>{namaTampil}</div>
      <div className="font-bold uppercase tracking-wider mt-[0.5vh] truncate max-w-full" style={{ fontSize: '1.05vw', color: '#7dd3fc' }}>{c.cabor}</div>
      <div className="text-slate-300 truncate max-w-full" style={{ fontSize: '1vw' }}>{c.nomor ?? '—'}{c.kota ? ` · ${c.kota}` : ''}</div>
      {c.keterangan && <div className="leading-snug text-amber-100/90 line-clamp-3 mt-[0.6vh]" style={{ fontSize: '0.85vw' }} title={c.keterangan}>📝 {c.keterangan}</div>}
      <div className="mt-auto pt-[1vh]">{pita('1.05vw')}</div>
      {emas && <div className="absolute top-[1vh] right-[0.8vw] font-black rotate-12 rounded-[0.4vw] px-[0.6vw]" style={{ fontSize: '1.3vw', color: '#1a1200', background: EMAS, boxShadow: `0 0 1vw ${EMAS}` }}>EMAS</div>}
    </div>
  )
}

export default function PerburuanEmas({ data, kunjungan }: { data: DataWarRoom | null; kunjungan: boolean }) {
  const semua = useMemo(() => data?.perburuan ?? [], [data])
  const hariIni = data?.hari_ini ?? ''
  const perTgl = useMemo(() => {
    const m = new Map<string, CalonEmas[]>()
    for (const c of semua) m.set(c.tanggal, [...(m.get(c.tanggal) ?? []), c])
    return m
  }, [semua])
  const hariKalender = useMemo(() => Array.from(perTgl.keys()).sort(), [perTgl])
  const maks = Math.max(1, ...Array.from(perTgl.values()).map(l => l.length))
  const puncak = hariKalender.filter(t => t >= hariIni).sort((a, b) => (perTgl.get(b)!.length - perTgl.get(a)!.length) || a.localeCompare(b))[0]
  const tglFokus = data?.misi.tanggal ?? null
  const fokus = tglFokus ? (perTgl.get(tglFokus) ?? []) : []
  const n = (s: StatusMisi) => semua.filter(c => c.status === s).length
  const jadi = n('emas'), main = n('berjalan'), lain = n('medali_lain'), lewat = n('meleset')
  const sisa = semua.length - jadi - lain - lewat
  const pct = semua.length ? (jadi / semua.length) * 100 : 0
  const kolom = fokus.length <= 4 ? Math.max(fokus.length, 1) : fokus.length <= 6 ? 3 : fokus.length <= 8 ? 4 : 5
  const besar = fokus.length <= 4
  // Ukuran koin menyesuaikan hari terpadat supaya tumpukan tertinggi tetap muat.
  const koin = `min(2.1vw, ${(16 / maks).toFixed(2)}vh)`

  if (!data) return <div className="h-full grid place-items-center text-slate-400" style={{ fontSize: '1.6vw' }}>Memuat perburuan emas…</div>
  if (!semua.length) return <div className="h-full grid place-items-center text-slate-400" style={{ fontSize: '1.6vw' }}>Target emas KONI belum dimuat.</div>

  return (
    <div className="h-full flex flex-col gap-[1.6vh]">
      {/* 1 · Kalender Panas */}
      <section className="rounded-[1.2vw] px-[1.6vw] pt-[1.4vh] pb-[1vh]" style={{ background: 'rgba(2,10,20,0.6)', border: '1px solid rgba(249,115,22,0.3)' }}>
        <div className="flex items-baseline justify-between gap-[2vw]">
          <div className="flex items-baseline gap-[1vw]">
            <span className="font-black uppercase tracking-[0.25em]" style={{ fontSize: '1.2vw', color: '#fb923c' }}>🔥 Kalender Panas</span>
            <span className="text-slate-400 font-bold" style={{ fontSize: '0.95vw' }}>satu koin = satu emas yang diburu</span>
          </div>
          {puncak && (
            <div className="font-black" style={{ fontSize: '1.3vw' }}>
              <span className="text-orange-300">{puncak === hariIni ? 'HARI INI hari paling panas' : 'Hari paling panas'}: </span>
              <span className="text-white">{tglPanjangWR(puncak)} — {perTgl.get(puncak)!.length} emas dipertaruhkan</span>
            </div>
          )}
        </div>
        <div className="flex items-end justify-between gap-[0.4vw] mt-[1vh]">
          {hariKalender.map(t => {
            const daftar = perTgl.get(t)!
            const ini = t === hariIni, lalu = !!hariIni && t < hariIni
            const tgl = new Date(t + 'T00:00:00Z')
            const panas = daftar.length / maks
            const urut = [...daftar].sort((a, b) => URUT_KOIN[a.status] - URUT_KOIN[b.status])
            return (
              <div key={t} className="flex-1 flex flex-col items-center min-w-0" style={{ opacity: lalu ? 0.75 : 1 }}>
                <div className="font-black tabular-nums" style={{ fontSize: '1.1vw', color: `rgb(255,${Math.round(200 - panas * 110)},60)` }}>{daftar.length}</div>
                <div className="flex flex-col-reverse items-center gap-[0.25vh] mt-[0.3vh]">
                  {urut.map(c => <Koin key={c.urutan} c={c} ukuran={koin} />)}
                </div>
                <div className={`rounded-[0.5vw] w-full text-center mt-[0.8vh] py-[0.3vh] ${ini ? 'bg-sky-500 text-slate-950' : 'text-slate-300'}`} style={ini ? { boxShadow: '0 0 1.2vw rgba(56,189,248,.8)' } : undefined}>
                  <div className="font-black leading-tight" style={{ fontSize: '1.15vw' }}>{tgl.getUTCDate()}</div>
                  <div className="uppercase leading-tight font-bold" style={{ fontSize: '0.7vw' }}>{ini ? 'Hari ini' : HARI[tgl.getUTCDay()]}</div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 2 · Wajah calon peraih emas */}
      <section className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-baseline justify-between mb-[1vh]">
          <span className="font-black uppercase tracking-[0.25em] text-yellow-300" style={{ fontSize: '1.25vw' }}>
            {data.misi.hari_ini ? '🎯 Calon peraih emas hari ini' : '🎯 Calon peraih emas berikutnya'}
          </span>
          <span className="text-slate-300 font-bold" style={{ fontSize: '1.1vw' }}>{tglFokus ? `${tglPanjangWR(tglFokus)} · ${fokus.length} emas dipertaruhkan` : 'Semua tanggal target sudah lewat'}</span>
        </div>
        {fokus.length === 0
          ? <div className="flex-1 grid place-items-center text-slate-400" style={{ fontSize: '1.4vw' }}>Tidak ada target emas yang tersisa.</div>
          : <div className="flex-1 min-h-0 grid gap-[1vw] justify-center" style={{ gridTemplateColumns: `repeat(${kolom}, minmax(0, ${fokus.length <= 3 ? '24vw' : '1fr'}))`, gridAutoRows: 'minmax(0, 1fr)' }}>
              {fokus.map(c => <KartuCalon key={c.urutan} c={c} besar={besar} />)}
            </div>}
      </section>

      {/* 3 · Hitungan perburuan */}
      <section className="rounded-[1vw] px-[1.6vw] py-[1.2vh]" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.3)' }}>
        <div className="flex items-baseline justify-between gap-[2vw] flex-wrap font-black" style={{ fontSize: kunjungan ? '1.5vw' : '1.35vw' }}>
          <span><span style={{ color: EMAS, fontSize: '2.4vw' }}>{jadi}</span><span className="text-slate-400"> / {semua.length} emas diburu sudah jadi</span></span>
          <span className="flex gap-[2vw]">
            <span style={{ color: HIJAU }}>● {main} bertanding</span>
            <span style={{ color: PERAK }}>{lain} medali lain</span>
            {!kunjungan && <span style={{ color: MERAH }}>{lewat} tanpa medali</span>}
            <span className="text-white">{sisa} masih diburu</span>
          </span>
        </div>
        <div className="rounded-full overflow-hidden bg-white/10 mt-[1vh]" style={{ height: '1.4vh' }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#b8860b,#ffd700,#fff3b0)', boxShadow: `0 0 1vw ${EMAS}` }} />
        </div>
      </section>

      <style>{CSS_KOIN.replace(/(\d+)px/g, (_, n) => `${(Number(n) / 10).toFixed(1)}vw`)}</style>
    </div>
  )
}

/** Urutan koin dari bawah: emas dulu (fondasi), lalu medali lain, bertanding, menunggu, meleset di puncak. */
export const URUT_KOIN: Record<StatusMisi, number> = { emas: 0, medali_lain: 1, berjalan: 2, belum: 3, meleset: 4 }
