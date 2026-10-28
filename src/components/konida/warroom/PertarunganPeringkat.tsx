'use client'
// PertarunganPeringkat — siapa yang kita kejar, siapa yang mengejar, dan duel
// dengan rival utama. Sumber: klasemen resmi (diketik tim KONIDA) + laporan lapangan.

import { Swords } from 'lucide-react'
import { duelRival, klasemenDimulai, RIVAL_KABBANDUNG, tetangga, type BarisKlasemenWR } from '@/lib/warroom'

const NAMA = 'KAB. BANDUNG'
const rapi = (n: string) => n.replace(/^KAB\. /, 'Kab. ').replace(/^KOTA /, 'Kota ').replace(/\B\w+/g, w => w.toLowerCase())

function Selisih({ n, satuan = 'emas' }: { n: number; satuan?: string }) {
  const w = n > 0 ? '#34d399' : n < 0 ? '#f87171' : '#a1a1aa'
  return <span className="font-black tabular-nums" style={{ color: w }}>{n > 0 ? '+' : ''}{n} {satuan}</span>
}

export default function PertarunganPeringkat({ klasemen, diperbarui, onInput }: { klasemen: BarisKlasemenWR[]; diperbarui: string | null; onInput?: () => void }) {
  const mulai = klasemenDimulai(klasemen)
  const t = tetangga(klasemen, NAMA)
  const duel = duelRival(klasemen, NAMA, RIVAL_KABBANDUNG)

  return (
    <div className="p-5 h-full flex flex-col" style={{ background: 'rgba(56,189,248,0.03)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Swords size={11} className="text-sky-400" />
        <span className="text-[9px] font-black uppercase tracking-widest text-sky-400">Pertarungan Peringkat</span>
      </div>

      {mulai && t.kita ? (
        <div className="space-y-1.5 mb-4">
          {t.atas && (
            <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-zinc-400">Dikejar ▲ <b className="text-zinc-200">{rapi(t.atas.nama)}</b></span>
              <Selisih n={t.kita.emas - t.atas.emas} />
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl px-3 py-2 border" style={{ background: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.4)' }}>
            <span className="text-[11px] font-black text-sky-300">Kab. Bandung ✦</span>
            <span className="text-[11px] font-mono font-bold"><span className="text-yellow-400">{t.kita.emas}</span> · <span className="text-zinc-300">{t.kita.perak}</span> · <span className="text-amber-600">{t.kita.perunggu}</span></span>
          </div>
          {t.bawah && (
            <div className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-zinc-400">Mengejar ▼ <b className="text-zinc-200">{rapi(t.bawah.nama)}</b></span>
              <Selisih n={t.kita.emas - t.bawah.emas} />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-4 text-center mb-4">
          <div className="text-[11px] font-bold text-zinc-400">Menunggu medali pertama</div>
          <div className="text-[10px] text-zinc-600 mt-1">Selisih dengan kontingen di atas & bawah muncul otomatis</div>
        </div>
      )}

      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Duel rival</div>
      <div className="space-y-1 flex-1">
        {duel.map(r => (
          <div key={r.nama} className="flex items-center justify-between text-[11px] px-1 py-1 border-b border-white/[0.04]">
            <span className="text-zinc-300 truncate">{rapi(r.nama)}</span>
            <span className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-zinc-500"><span className="text-yellow-500/80">{r.emas}</span>·{r.perak}·{r.perunggu}</span>
              {mulai ? <Selisih n={r.selisih_emas} /> : <span className="text-zinc-600">—</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
        <span className="text-[9px] text-zinc-600">
          {diperbarui ? `Klasemen resmi diperbarui ${new Date(diperbarui).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}` : 'Klasemen resmi belum pernah diisi'}
        </span>
        {onInput && <button onClick={onInput} className="text-[10px] font-bold text-sky-300 border border-sky-500/30 rounded-lg px-2 py-1 hover:bg-sky-500/10">Perbarui klasemen</button>}
      </div>
    </div>
  )
}
