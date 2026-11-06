'use client'
// KalenderEmas — Kalender Panas War Room (pengganti KalenderPanas batang).
// Tiap hari = tumpukan koin, satu koin satu target emas KONI; warnanya mengikuti
// hasil yang disahkan. Klik tanggal mana pun → daftar calon/peraih emas hari itu
// (foto, cabor, nomor, status), plus emas kejutan di luar target.

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Flame } from 'lucide-react'
import type { DataWarRoom } from '@/lib/warroom-klien'
import { tglPanjangWR } from '@/lib/warroom-klien'
import type { CalonEmas, EmasKejutan, StatusMisi, WajahCalon } from '@/lib/warroom'
import { CSS_KOIN, URUT_KOIN, gayaKoin } from './PerburuanEmas'
import PanelHeadToHead from './HeadToHead'

const EMAS = '#ffd700', PERAK = '#e2e8f0', PERUNGGU = '#e0a060', HIJAU = '#34d399', MERAH = '#f87171', SIAN = '#22d3ee'
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const judul = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const inisial = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()

const STATUS: Record<StatusMisi, { teks: string; warna: string }> = {
  belum:       { teks: 'Menunggu',          warna: '#94a3b8' },
  berjalan:    { teks: 'Sedang bertanding', warna: HIJAU },
  emas:        { teks: 'EMAS ✓',            warna: EMAS },
  medali_lain: { teks: 'Medali',            warna: PERAK },
  meleset:     { teks: 'Meleset emas',      warna: MERAH },
}

function Foto({ w, warna, px }: { w: { nama: string; foto: string | null }; warna: string; px: number }) {
  return w.foto
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={w.foto} alt="" loading="lazy" className="rounded-full object-cover shrink-0" style={{ width: px, height: px, border: `2px solid ${warna}` }} />
    : <div className="rounded-full grid place-items-center font-black shrink-0" style={{ width: px, height: px, border: `2px solid ${warna}`, color: warna, background: 'rgba(255,255,255,0.04)', fontSize: px * 0.36 }}>{inisial(w.nama)}</div>
}

function namaRingkas(orang: WajahCalon[], cadangan: string) {
  if (!orang.length) return cadangan
  if (orang.length === 1) return judul(orang[0].nama)
  return `${orang.slice(0, 3).map(w => judul(w.nama).split(' ')[0]).join(', ')}${orang.length > 3 ? ` +${orang.length - 3}` : ''}`
}

function KartuTarget({ c, onLawan }: { c: CalonEmas; onLawan: () => void }) {
  const s = STATUS[c.status]
  const warna = c.status === 'medali_lain' ? (c.hasil === 'perunggu' ? PERUNGGU : PERAK) : s.warna
  const emas = c.status === 'emas'
  const orang = c.peraih?.length ? c.peraih : c.wajah
  const cadangan = c.atlet && !/^(TEAM|TIM)$/i.test(c.atlet) ? judul(c.atlet) : `Tim ${judul(c.cabor)}`
  const tampil = (orang.length ? orang : [{ nama: cadangan, foto: null, atlet_id: null }]).slice(0, 3)
  // Peraih sebenarnya beda dari nama di proyeksi → tetap tampilkan nama proyeksi sebagai keterangan.
  const beda = !!c.peraih?.length && c.atlet && !c.peraih.some(p => c.wajah.some(w => w.atlet_id != null && w.atlet_id === p.atlet_id))
  const gayaLabel = { color: emas ? '#1a1200' : warna, background: emas ? EMAS : `${warna}18`, border: `1px solid ${warna}66` }
  const teksLabel = `${c.status === 'berjalan' ? '● ' : ''}${c.status === 'medali_lain' && c.hasil ? judul(c.hasil) : s.teks}`
  return (
    <div data-kartu-emas role="button" tabIndex={0} onClick={onLawan} onKeyDown={e => { if (e.key === 'Enter') onLawan() }}
      title="Lihat head-to-head lawannya"
      className="relative rounded-2xl overflow-hidden flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 cursor-pointer hover:brightness-125"
      style={{
        background: emas ? 'linear-gradient(150deg, rgba(255,215,0,0.22), rgba(184,134,11,0.10) 60%, rgba(2,10,20,0.7))' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${emas ? EMAS : c.status === 'berjalan' ? HIJAU : `${warna}33`}`,
        animation: c.status === 'berjalan' ? 'pe-bingkai 1.6s ease-in-out infinite' : undefined,
      }}>
      {emas && <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)', backgroundSize: '250% 100%', animation: 'pe-sapu 3.5s ease-in-out infinite' }} />}
      <div className="flex -space-x-3 shrink-0" style={{ filter: c.status === 'belum' || c.status === 'meleset' ? 'grayscale(0.5) brightness(0.85)' : undefined }}>
        {tampil.map((w, i) => <Foto key={i} w={w} warna={warna} px={tampil.length > 1 ? 36 : 48} />)}
      </div>
      <div className="min-w-0 flex-1 relative">
        {/* Di HP label status di atas nama (lebar kartu dipakai penuh untuk tulisan); layar lebar tetap di kanan. */}
        <span className="sm:hidden inline-block mb-0.5 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full whitespace-nowrap" style={gayaLabel}>{teksLabel}</span>
        <div className="text-sm font-black text-white line-clamp-2 sm:line-clamp-none sm:truncate" title={orang.map(o => o.nama).join(', ')}>{namaRingkas(orang, cadangan)}</div>
        <div className="text-[11px] line-clamp-2 sm:line-clamp-none sm:truncate"><b className="uppercase tracking-wide text-sky-300">{c.cabor}</b> <span className="text-zinc-400">· {c.nomor ?? '—'}{c.kota ? ` · ${c.kota}` : ''}</span></div>
        {beda && <div className="text-[10px] text-zinc-500 truncate">Proyeksi KONI: {judul(c.atlet!)}</div>}
        {c.keterangan && <div className="text-[11px] leading-snug text-amber-100/90 my-0.5">📝 {c.keterangan}</div>}
        <div className="text-[10px] font-bold text-red-300">⚔ Lihat lawan</div>
      </div>
      <span className="relative hidden sm:inline-block shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap" style={gayaLabel}>
        {teksLabel}
      </span>
    </div>
  )
}

function KartuKejutan({ e }: { e: EmasKejutan }) {
  const tampil = (e.peraih.length ? e.peraih : [{ nama: e.cabor, foto: null, atlet_id: null }]).slice(0, 3)
  return (
    <div className="relative rounded-2xl overflow-hidden flex items-center gap-3 px-3 py-2.5"
      style={{ background: 'linear-gradient(150deg, rgba(34,211,238,0.14), rgba(255,215,0,0.12) 70%)', border: `1px solid ${SIAN}88` }}>
      <div className="flex -space-x-3 shrink-0">{tampil.map((w, i) => <Foto key={i} w={w} warna={EMAS} px={tampil.length > 1 ? 36 : 48} />)}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-white line-clamp-2 sm:line-clamp-none sm:truncate">{namaRingkas(e.peraih, e.cabor)}</div>
        <div className="text-[11px] line-clamp-2 sm:line-clamp-none sm:truncate"><b className="uppercase tracking-wide text-sky-300">{e.cabor}</b> <span className="text-zinc-400">· {e.nomor}</span></div>
      </div>
      <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap" style={{ color: '#1a1200', background: EMAS }}>★ Emas kejutan</span>
    </div>
  )
}

export default function KalenderEmas({ data }: { data: DataWarRoom | null }) {
  const target = useMemo(() => data?.perburuan ?? [], [data])
  const kejutan = useMemo(() => data?.emas_kejutan ?? [], [data])
  const hariIni = data?.hari_ini ?? ''
  const hari = useMemo(() => {
    const t = new Set([...(data?.kalender ?? []).map(k => k.tanggal), ...target.map(c => c.tanggal), ...kejutan.map(e => e.tanggal)])
    return Array.from(t).sort()
  }, [data, target, kejutan])
  const perTgl = useMemo(() => {
    const m = new Map<string, CalonEmas[]>()
    for (const c of target) m.set(c.tanggal, [...(m.get(c.tanggal) ?? []), c])
    return m
  }, [target])
  const kegiatan = useMemo(() => new Map((data?.kalender ?? []).map(k => [k.tanggal, k.kegiatan])), [data])
  const maks = Math.max(1, ...Array.from(perTgl.values()).map(l => l.length))
  const puncak = hari.filter(t => t >= hariIni && perTgl.has(t)).sort((a, b) => (perTgl.get(b)!.length - perTgl.get(a)!.length) || a.localeCompare(b))[0]

  const [pilih, setPilih] = useState<string | null>(null)
  const [h2h, setH2h] = useState<number | null>(null)
  // Tanggal awal: hari ini bila ada target/emas, selain itu hari target terdekat.
  useEffect(() => {
    if (pilih || !data) return
    const ada = (t: string) => perTgl.has(t) || kejutan.some(e => e.tanggal === t)
    setPilih(ada(hariIni) ? hariIni : (data.misi.tanggal ?? hari.find(ada) ?? null))
  }, [data, pilih, perTgl, kejutan, hariIni, hari])

  const daftar = pilih ? [...(perTgl.get(pilih) ?? [])].sort((a, b) => URUT_KOIN[a.status] - URUT_KOIN[b.status] || a.urutan - b.urutan) : []
  const kejutanPilih = kejutan.filter(e => e.tanggal === pilih)
  const jadi = target.filter(c => c.status === 'emas').length
  const jadiHari = daftar.filter(c => c.status === 'emas').length + kejutanPilih.length

  return (
    <div className="rounded-3xl p-5" style={{ background: 'rgba(2,10,20,0.65)', border: '1px solid rgba(249,115,22,0.25)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-400"><Flame size={12} /> Kalender Panas</div>
          <div className="text-white font-black text-lg mt-0.5">Hari-hari penentu emas <span className="text-yellow-300">· {jadi}/{target.length || '—'} sudah jadi</span>{kejutan.length ? <span className="text-cyan-300"> · +{kejutan.length} kejutan</span> : null}</div>
          <div className="text-[11px] text-zinc-500">Satu koin = satu target emas KONI · klik tanggal untuk melihat calon & peraih emasnya</div>
        </div>
        {puncak && (
          <div className="rounded-xl px-3 py-2 text-right" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }}>
            <div className="text-[10px] uppercase tracking-widest text-orange-300 font-bold">{puncak === hariIni ? 'Hari ini hari paling panas' : 'Hari paling panas'}</div>
            <div className="text-white font-black">{tglPanjangWR(puncak)} · {perTgl.get(puncak)!.length} emas</div>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-[10px] text-zinc-400 mb-3">
        {(['belum', 'berjalan', 'emas', 'medali_lain', 'meleset'] as StatusMisi[]).map(s => (
          <span key={s} className="flex items-center gap-1.5"><span data-koin className="w-3 h-3 rounded-full inline-block" style={gayaKoin({ status: s, hasil: s === 'medali_lain' ? 'perak' : null })} />{STATUS[s].teks.replace(' ✓', '')}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: EMAS, boxShadow: `0 0 0 2px ${SIAN}` }} />Emas kejutan</span>
      </div>

      {hari.length === 0 ? <div className="text-sm text-zinc-500 py-6 text-center">Belum ada jadwal.</div> : (
        <div className="overflow-x-auto pb-2">
          <div className="flex items-end gap-1 min-w-full">
            {hari.map(t => {
              const isi = [...(perTgl.get(t) ?? [])].sort((a, b) => URUT_KOIN[a.status] - URUT_KOIN[b.status])
              const kj = kejutan.filter(e => e.tanggal === t)
              const tgl = new Date(t + 'T00:00:00Z')
              const ini = t === hariIni, dipilih = t === pilih, lalu = !!hariIni && t < hariIni
              const panas = isi.length / maks
              const keg = kegiatan.get(t) ?? 0
              const kosong = !isi.length && !kj.length
              return (
                <button key={t} type="button" onClick={() => setPilih(t)} disabled={kosong}
                  title={`${tglPanjangWR(t)} · ${isi.length} target emas · ${keg} kegiatan cabor kita`}
                  className={`flex-1 min-w-[40px] flex flex-col items-center rounded-xl pt-1 pb-1 transition ${kosong ? 'cursor-default' : 'hover:bg-white/5'}`}
                  style={{ opacity: lalu && !dipilih ? 0.7 : 1, background: dipilih ? 'rgba(56,189,248,0.10)' : undefined, outline: dipilih ? '1px solid rgba(56,189,248,0.6)' : undefined }}>
                  <div className="text-[11px] font-black tabular-nums h-4" style={{ color: isi.length ? `rgb(255,${Math.round(200 - panas * 110)},60)` : '#52525b' }}>{isi.length || ''}</div>
                  <div className="flex flex-col-reverse items-center gap-[3px] mt-0.5 min-h-[14px]">
                    {isi.map(c => (
                      <span key={c.urutan} data-koin className="w-3.5 h-3.5 rounded-full grid place-items-center text-[8px] font-black" style={{ color: '#1a1200', ...gayaKoin(c) }}>
                        {c.status === 'meleset' ? '✕' : ''}
                      </span>
                    ))}
                    {kj.map(e => <span key={e.id} data-koin className="w-3.5 h-3.5 rounded-full" style={{ background: EMAS, boxShadow: `0 0 0 2px ${SIAN}`, animation: 'pe-kilau 2.4s ease-in-out infinite' }} />)}
                  </div>
                  <div className="text-[9px] text-zinc-600 tabular-nums h-3 mt-1">{keg ? `${keg} keg` : ''}</div>
                  <div className={`rounded-md w-full py-0.5 mt-0.5 ${ini ? 'bg-sky-500 text-slate-950' : dipilih ? 'text-sky-300' : 'text-zinc-400'}`}>
                    <div className="text-[11px] font-black leading-tight">{tgl.getUTCDate()}</div>
                    <div className="text-[8px] uppercase leading-tight">{ini ? 'Hari ini' : HARI[tgl.getUTCDay()]}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Daftar calon & peraih emas tanggal terpilih */}
      {pilih && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <div className="text-white font-black">
              {tglPanjangWR(pilih)}{pilih === hariIni ? ' · hari ini' : ''}
              <span className="text-zinc-400 font-bold text-sm"> · {daftar.length} target emas</span>
            </div>
            <div className="text-sm font-black"><span style={{ color: EMAS }}>{jadiHari} emas</span><span className="text-zinc-500"> sudah disahkan di tanggal ini</span></div>
          </div>
          {daftar.length === 0 && kejutanPilih.length === 0
            ? <div className="text-sm text-zinc-500 py-4 text-center">Tidak ada target emas di tanggal ini.</div>
            : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {kejutanPilih.map(e => <KartuKejutan key={`k${e.id}`} e={e} />)}
                {daftar.map(c => <KartuTarget key={c.urutan} c={c} onLawan={() => setH2h(c.urutan)} />)}
              </div>}
        </div>
      )}
      {/* Lewat portal ke <body>: bagian War Room memakai animasi transform yang mengurung elemen fixed. */}
      {h2h != null && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-sm overflow-y-auto p-4 md:p-10" onClick={() => setH2h(null)}>
          <div className="max-w-3xl mx-auto" onClick={e => e.stopPropagation()}>
            <PanelHeadToHead urutan={h2h} onTutup={() => setH2h(null)} />
          </div>
        </div>, document.body)}
      <style>{CSS_KOIN}</style>
    </div>
  )
}
