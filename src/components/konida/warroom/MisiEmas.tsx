'use client'
// MisiEmas — emas yang diproyeksikan KONI untuk hari ini (atau hari proyeksi
// terdekat), dengan status langsung: belum main → sedang berjalan → ✅ emas /
// 🥈🥉 medali lain / ✕ meleset. Sumber: proyeksi_medali + laporan yang disahkan.

import { Target } from 'lucide-react'
import type { DataWarRoom } from '@/lib/warroom-klien'
import { tglPanjangWR } from '@/lib/warroom-klien'
import type { StatusMisi } from '@/lib/warroom'

export const GAYA_MISI: Record<StatusMisi, { label: string; warna: string; ikon: string }> = {
  emas:        { label: 'Emas',          warna: '#facc15', ikon: '✓' },
  medali_lain: { label: 'Medali lain',   warna: '#cbd5e1', ikon: '◐' },
  meleset:     { label: 'Meleset',       warna: '#f87171', ikon: '✕' },
  berjalan:    { label: 'Berjalan',      warna: '#34d399', ikon: '●' },
  belum:       { label: 'Belum main',    warna: '#64748b', ikon: '○' },
}

export default function MisiEmas({ data, accent = '#38bdf8' }: { data: DataWarRoom | null; accent?: string }) {
  const m = data?.misi
  const daftar = m?.daftar ?? []
  const emas = daftar.filter(x => x.status === 'emas').length
  const selesai = daftar.filter(x => x.status === 'emas' || x.status === 'medali_lain' || x.status === 'meleset').length
  const pct = daftar.length ? Math.round((emas / daftar.length) * 100) : 0

  return (
    <div className="rounded-3xl overflow-hidden h-full flex flex-col" style={{ background: 'rgba(2,10,20,0.65)', border: '1px solid rgba(250,204,21,0.22)' }}>
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-wrap" style={{ background: 'linear-gradient(90deg, rgba(250,204,21,0.10), transparent)', borderColor: 'rgba(250,204,21,0.15)' }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-yellow-400">
            <Target size={12} /> {m?.hari_ini ? 'Misi emas hari ini' : 'Misi emas berikutnya'}
          </div>
          <div className="text-white font-black text-lg mt-0.5">
            {!m ? 'Memuat…' : !m.tanggal ? 'Proyeksi emas KONI sudah habis' : `${daftar.length} emas dipertaruhkan · ${tglPanjangWR(m.tanggal)}`}
          </div>
          <div className="text-[11px] text-zinc-500">Sumber: proyeksi emas KONI Kab. Bandung · status dari laporan yang disahkan</div>
        </div>
        {daftar.length > 0 && (
          <div className="text-right">
            <div className="text-3xl font-black tabular-nums text-yellow-300 leading-none">{emas}<span className="text-zinc-500 text-xl">/{daftar.length}</span></div>
            <div className="text-[10px] text-zinc-500 mt-1">{selesai} nomor sudah ada hasil</div>
          </div>
        )}
      </div>
      {daftar.length > 0 && (
        <div className="h-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#facc15,#fde68a)', boxShadow: '0 0 12px #facc1588' }} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-white/[0.05]">
        {daftar.length === 0 && m && (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">{m.tanggal ? 'Tidak ada emas yang diproyeksikan.' : 'Semua tanggal proyeksi sudah lewat.'}</div>
        )}
        {daftar.map(x => {
          const g = GAYA_MISI[x.status]
          return (
            <div key={x.urutan} className="px-5 py-2.5 flex items-center gap-3" style={x.status === 'emas' ? { background: 'rgba(250,204,21,0.06)' } : undefined}>
              <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[13px] font-black ${x.status === 'berjalan' ? 'animate-pulse' : ''}`}
                style={{ color: x.status === 'emas' ? '#1a1200' : g.warna, background: x.status === 'emas' ? g.warna : `${g.warna}1f`, border: `1px solid ${g.warna}66` }}>{g.ikon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>{x.cabor}{x.kota ? <span className="text-zinc-500 normal-case font-normal"> · {x.kota}</span> : null}</div>
                <div className="text-sm font-bold text-white truncate">{x.nomor ?? '—'}</div>
                {x.atlet && <div className="text-[11px] text-zinc-400 truncate">{x.atlet}</div>}
              </div>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: g.warna, background: `${g.warna}14`, border: `1px solid ${g.warna}40` }}>
                {x.status === 'medali_lain' && x.hasil ? x.hasil : g.label}
              </span>
            </div>
          )
        })}
      </div>
      {m && m.hari_ini && m.besok > 0 && <div className="px-5 py-2 text-[11px] text-zinc-500 border-t border-white/5">Besok: {m.besok} emas diproyeksikan</div>}
    </div>
  )
}
