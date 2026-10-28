'use client'
// KalenderPanas — tiap hari PORPROV: berapa emas dipertaruhkan (proyeksi KONI),
// berapa sudah disahkan, dan berapa kegiatan cabor kita. Hari paling menentukan disorot.

import { Flame } from 'lucide-react'
import type { DataWarRoom } from '@/lib/warroom-klien'
import { tglPanjangWR } from '@/lib/warroom-klien'

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function KalenderPanas({ data }: { data: DataWarRoom | null }) {
  const k = data?.kalender ?? []
  const maks = Math.max(1, ...k.map(h => h.proyeksi))
  const puncak = [...k].sort((a, b) => b.proyeksi - a.proyeksi)[0]
  const hariIni = data?.hari_ini

  return (
    <div className="rounded-3xl p-5" style={{ background: 'rgba(2,10,20,0.65)', border: '1px solid rgba(249,115,22,0.2)' }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-400"><Flame size={12} /> Kalender Panas</div>
          <div className="text-white font-black text-lg mt-0.5">Hari-hari penentu emas</div>
          <div className="text-[11px] text-zinc-500">Tinggi batang = emas yang diproyeksikan KONI · angka atas = kegiatan cabor kita</div>
        </div>
        {puncak && puncak.proyeksi > 0 && (
          <div className="rounded-xl px-3 py-2 text-right" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }}>
            <div className="text-[10px] uppercase tracking-widest text-orange-300 font-bold">Hari paling menentukan</div>
            <div className="text-white font-black">{tglPanjangWR(puncak.tanggal)} · {puncak.proyeksi} emas</div>
          </div>
        )}
      </div>
      {k.length === 0 ? <div className="text-sm text-zinc-500 py-6 text-center">Belum ada jadwal.</div> : (
        <div className="overflow-x-auto pb-1">
          <div className="flex items-end gap-1.5 min-w-max">
            {k.map(h => {
              const tgl = new Date(h.tanggal + 'T00:00:00Z')
              const ini = h.tanggal === hariIni, lewat = !!hariIni && h.tanggal < hariIni
              const panas = h.proyeksi / maks
              const warna = h.proyeksi === 0 ? 'rgba(255,255,255,0.08)' : `rgba(249,${Math.round(180 - panas * 120)},22,${0.35 + panas * 0.65})`
              return (
                <div key={h.tanggal} className="w-11 shrink-0 text-center" title={`${tglPanjangWR(h.tanggal)} · ${h.proyeksi} emas diproyeksikan · ${h.realisasi} emas disahkan · ${h.kegiatan} kegiatan`}>
                  <div className="text-[9px] text-zinc-500 tabular-nums h-3">{h.kegiatan || ''}</div>
                  <div className="relative h-24 flex items-end justify-center">
                    <div className="w-7 rounded-t-md transition-all" style={{ height: `${Math.max(4, panas * 80)}%`, background: warna, opacity: lewat ? 0.55 : 1, boxShadow: ini ? '0 0 14px rgba(56,189,248,.8)' : undefined }} />
                    {h.proyeksi > 0 && <div className="absolute left-0 right-0 text-[11px] font-black text-white tabular-nums" style={{ bottom: `calc(${Math.max(4, panas * 80)}% + 2px)` }}>{h.proyeksi}</div>}
                  </div>
                  <div className="text-[10px] font-black mt-1" style={{ color: h.realisasi ? '#facc15' : 'transparent' }}>{h.realisasi ? `✓${h.realisasi}` : '·'}</div>
                  <div className={`rounded-md py-0.5 mt-0.5 ${ini ? 'bg-sky-500 text-slate-950' : 'text-zinc-400'}`}>
                    <div className="text-[11px] font-black leading-tight">{tgl.getUTCDate()}</div>
                    <div className="text-[8px] uppercase leading-tight">{HARI[tgl.getUTCDay()]}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
