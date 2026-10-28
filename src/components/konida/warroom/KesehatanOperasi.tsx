'use client'
// KesehatanOperasi — untuk meja admin, bukan videotron: laporan yang menunggu
// disahkan, catatan lapangan yang belum ditangani, dan cabor yang bertanding
// hari ini beserta keadaan PIC-nya. Semua tautan menuju tempat menindaklanjutinya.

import { Activity } from 'lucide-react'
import type { DataWarRoom } from '@/lib/warroom-klien'

const PIC = {
  aktif: { teks: 'PIC aktif', warna: '#34d399' },
  belum_dipakai: { teks: 'PIC belum aktif', warna: '#fbbf24' },
  tidak_ada: { teks: 'Belum ada PIC', warna: '#f87171' },
} as const

export default function KesehatanOperasi({ data }: { data: DataWarRoom | null }) {
  const o = data?.operasi
  const tanpaLaporan = (o?.cabor_hari_ini ?? []).filter(c => c.laporan_hari_ini === 0).length
  const kotak = [
    { l: 'Menunggu disahkan', v: o?.menunggu ?? 0, w: (o?.menunggu ?? 0) > 0 ? '#fbbf24' : '#34d399', href: '/konida/lappertandingan/kabbandung' },
    { l: 'Catatan belum ditangani', v: o?.catatan_baru ?? 0, w: (o?.catatan_mendesak ?? 0) > 0 ? '#f87171' : (o?.catatan_baru ?? 0) > 0 ? '#fbbf24' : '#34d399', sub: o?.catatan_mendesak ? `${o.catatan_mendesak} mendesak` : undefined, href: '/konida/lappertandingan/kabbandung' },
    { l: 'Cabor main hari ini', v: o?.cabor_hari_ini.length ?? 0, w: '#38bdf8', sub: tanpaLaporan ? `${tanpaLaporan} belum melapor` : undefined, href: '/konida/lappertandingan/kabbandung#langsung' },
  ]
  return (
    <div className="rounded-3xl p-5" style={{ background: 'rgba(2,10,20,0.65)', border: '1px solid rgba(52,211,153,0.18)' }}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3"><Activity size={12} /> Kesehatan Operasi <span className="text-zinc-600 normal-case tracking-normal font-semibold">· untuk meja admin</span></div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {kotak.map(k => (
          <a key={k.l} href={k.href} className="rounded-xl px-3 py-2.5 border hover:brightness-125 transition" style={{ background: `${k.w}0d`, borderColor: `${k.w}33` }}>
            <div className="text-2xl font-black tabular-nums leading-none" style={{ color: k.w }}>{k.v}</div>
            <div className="text-[10px] text-zinc-400 mt-1">{k.l}</div>
            {k.sub && <div className="text-[10px] font-bold mt-0.5" style={{ color: k.w }}>{k.sub}</div>}
          </a>
        ))}
      </div>
      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Cabor bertanding hari ini</div>
      {o && o.cabor_hari_ini.length === 0 && <div className="text-[12px] text-zinc-500 py-3">Tidak ada cabor kita yang bertanding hari ini.</div>}
      <div className="divide-y divide-white/[0.05] max-h-64 overflow-y-auto">
        {(o?.cabor_hari_ini ?? []).map(c => {
          const p = PIC[c.pic]
          return (
            <div key={c.cabor_id} className="flex items-center gap-2 py-1.5 text-[12px]">
              {c.live && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" title="Sedang main" />}
              <span className="flex-1 min-w-0 truncate text-white font-semibold">{c.cabor}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: p.warna, background: `${p.warna}14`, border: `1px solid ${p.warna}40` }}>{p.teks}</span>
              <span className={`w-20 text-right tabular-nums text-[11px] ${c.laporan_hari_ini ? 'text-emerald-300' : 'text-zinc-500'}`}>{c.laporan_hari_ini ? `${c.laporan_hari_ini} laporan` : 'belum lapor'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
