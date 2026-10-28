'use client'
// ArenaLive — partai yang sedang dimainkan (ditandai "Sedang main" oleh PIC/KONIDA)
// dan partai berikutnya dengan hitung mundur. Sumber: jadwal_partai.

import { Radio } from 'lucide-react'
import type { DataWarRoom, PartaiArena } from '@/lib/warroom-klien'
import { tglPendek, useJamWIB } from '@/lib/warroom-klien'
import { menitLagi } from '@/lib/warroom'

function sisa(menit: number | null) {
  if (menit == null) return null
  if (menit < -5) return { teks: 'lewat jadwal', warna: '#fbbf24' }
  if (menit <= 0) return { teks: 'segera mulai', warna: '#34d399' }
  if (menit < 60) return { teks: `${menit} mnt lagi`, warna: menit <= 15 ? '#34d399' : '#38bdf8' }
  return { teks: `${Math.floor(menit / 60)} j ${menit % 60} mnt lagi`, warna: '#94a3b8' }
}

function Kartu({ p, live, jamKini, hariIni }: { p: PartaiArena; live?: boolean; jamKini: string; hariIni: string }) {
  const s = live ? null : p.tanggal === hariIni ? sisa(menitLagi(p.jam, jamKini)) : null
  return (
    <div className="rounded-xl p-3 border" style={live
      ? { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.35)', boxShadow: '0 0 18px rgba(239,68,68,0.12)' }
      : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: live ? '#f87171' : '#38bdf8' }}>
          {live ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1 align-middle" />LIVE</> : (p.jam ?? '--:--')}
          {!live && p.tanggal !== hariIni && <span className="text-zinc-500 normal-case font-bold"> · {tglPendek(p.tanggal)}</span>}
        </span>
        {s && <span className="text-[10px] font-bold" style={{ color: s.warna }}>{s.teks}</span>}
        {p.status === 'ditunda' && <span className="text-[10px] font-bold text-amber-400">ditunda</span>}
      </div>
      <div className="text-sm font-black text-white mt-1 truncate">{p.cabor}</div>
      <div className="text-[11px] text-zinc-300 truncate">{[p.nomor, p.babak].filter(Boolean).join(' · ')}</div>
      {p.lawan && <div className="text-[11px] text-zinc-400 truncate">vs <b className="text-white">{p.lawan}</b></div>}
      {p.atlet.length > 0 && <div className="text-[10px] text-sky-200/80 truncate mt-0.5">{p.atlet.length <= 2 ? p.atlet.join(', ') : `${p.atlet[0]} dkk. (${p.atlet.length})`}</div>}
      {p.venue && <div className="text-[10px] text-zinc-500 truncate mt-0.5">📍 {p.venue}</div>}
    </div>
  )
}

export default function ArenaLive({ data }: { data: DataWarRoom | null }) {
  const jamKini = useJamWIB()
  const live = data?.arena.live ?? [], berikut = data?.arena.berikut ?? []
  return (
    <div className="rounded-3xl overflow-hidden h-full flex flex-col" style={{ background: 'rgba(2,10,20,0.65)', border: `1px solid ${live.length ? 'rgba(239,68,68,0.35)' : 'rgba(56,189,248,0.18)'}` }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: live.length ? '#f87171' : '#38bdf8' }}>
            <Radio size={12} className={live.length ? 'animate-pulse' : ''} /> Arena
          </div>
          <div className="text-white font-black text-lg mt-0.5">{live.length ? `${live.length} partai sedang main` : 'Tidak ada partai yang sedang main'}</div>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">{jamKini} WIB</span>
      </div>
      <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-[420px]">
        {live.map(p => <Kartu key={p.id} p={p} live jamKini={jamKini} hariIni={data!.hari_ini} />)}
        {berikut.length > 0 && <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pt-1">Berikutnya</div>}
        {berikut.map(p => <Kartu key={p.id} p={p} jamKini={jamKini} hariIni={data!.hari_ini} />)}
        {data && !live.length && !berikut.length && <div className="text-sm text-zinc-500 text-center py-8">Belum ada jadwal partai berikutnya.<br /><span className="text-[11px]">Diisi PIC lewat tab Jadwal, atau KONIDA di menu Jadwal Pertandingan.</span></div>}
      </div>
    </div>
  )
}
