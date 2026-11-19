'use client'
// Halaman Perolehan Medali (menu di bawah War Room): klasemen KONI Jabar vs data kita
// dan situasi perolehan emas (target KONI 54 vs realisasi, sejak 19 Nov). Dipindah dari War Room 16 Nov.

import { useEffect, useState } from 'react'
import { Medal, RefreshCw } from 'lucide-react'
import KlasemenBanding from '@/components/konida/warroom/KlasemenBanding'
import GrafikProyeksiEmas from '@/components/konida/GrafikProyeksiEmas'
import { ambilRekapLapangan, type RekapLapangan } from '@/lib/lapor-klien'

// Hanya admin pusat yang perlu menyebut kontingen; KONIDA diambil dari sesinya.
const Q = '?kontingen_id=4'

export default function HalamanPerolehanMedali() {
  const [lapangan, setLapangan] = useState<RekapLapangan | null>(null)

  useEffect(() => {
    // Angka medali disahkan disegarkan sendiri selagi tab terbuka.
    const muat = () => ambilRekapLapangan(4).then(r => { if (r.ok) setLapangan(r.data) }).catch(() => {})
    muat()
    const iv = setInterval(() => { if (document.visibilityState === 'visible') muat() }, 20_000)
    return () => clearInterval(iv)
  }, [])

  const r = lapangan?.rekap
  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at top, #0a1a2e 0%, #030812 60%)' }}>
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-300"><Medal size={14} /> Command Center</div>
            <h1 className="text-2xl font-black mt-1">Perolehan Medali — Kab. Bandung</h1>
            <p className="text-sm text-zinc-400 mt-1">Klasemen resmi KONI Jabar dibanding data kita, dan situasi perolehan emas terhadap target KONI 54.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {r && r.laga > 0 && (
              <span className="text-xs text-zinc-300 rounded-xl px-3 py-2 border border-white/10 bg-white/5">
                Disahkan: <b className="text-amber-300">{r.emas} emas</b> · {r.perak} perak · {r.perunggu} perunggu
              </span>
            )}
            <button type="button" onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border border-white/15 bg-white/5 hover:bg-white/10">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </header>

        <KlasemenBanding kita={r ?? null} q={Q} />
        <GrafikProyeksiEmas kontingenId={4} />
      </div>
    </div>
  )
}
