'use client'
// DetikEmas — layar penuh merayakan medali yang BARU disahkan (emas 12 dtk,
// perak/perunggu 8 dtk). Medali yang sudah ada saat halaman dibuka tidak
// diputar ulang. Beberapa medali sekaligus → antre satu per satu. Ketuk untuk lewati.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MedaliTerbaru } from '@/lib/lapor-klien'

const GAYA = {
  emas:     { warna: '#ffd700', teks: 'MEDALI EMAS', ikon: '🥇', lama: 12_000 },
  perak:    { warna: '#e2e8f0', teks: 'MEDALI PERAK', ikon: '🥈', lama: 8_000 },
  perunggu: { warna: '#e0a060', teks: 'MEDALI PERUNGGU', ikon: '🥉', lama: 8_000 },
} as const

// Serpihan konfeti — posisi & jeda tetap (bukan acak tiap render) supaya tidak berkedip.
const KONFETI = Array.from({ length: 46 }, (_, i) => ({
  kiri: (i * 37) % 100, jeda: ((i * 13) % 20) / 10, lama: 3 + ((i * 7) % 20) / 10, putar: (i * 47) % 360, lebar: 6 + (i % 4) * 3,
}))

export default function DetikEmas({ medali }: { medali: MedaliTerbaru[] | null | undefined }) {
  const dilihat = useRef<Set<number> | null>(null)
  const [antre, setAntre] = useState<MedaliTerbaru[]>([])
  const kini = antre[0] ?? null

  useEffect(() => {
    if (!medali) return
    if (dilihat.current == null) { dilihat.current = new Set(medali.map(m => m.id)); return }   // muatan pertama: tandai saja
    const baru = medali.filter(m => !dilihat.current!.has(m.id))
    if (!baru.length) return
    baru.forEach(m => dilihat.current!.add(m.id))
    // Emas dulu, lalu yang lebih lama disahkan.
    const urut = [...baru].sort((a, b) => (a.hasil === 'emas' ? 0 : 1) - (b.hasil === 'emas' ? 0 : 1) || a.waktu.localeCompare(b.waktu))
    setAntre(q => [...q, ...urut])
  }, [medali])

  useEffect(() => {
    if (!kini) return
    const t = setTimeout(() => setAntre(q => q.slice(1)), GAYA[kini.hasil].lama)
    return () => clearTimeout(t)
  }, [kini])

  const g = kini ? GAYA[kini.hasil] : null
  const atlet = useMemo(() => {
    if (!kini) return ''
    return kini.atlet.length <= 3 ? kini.atlet.join(' · ') : `${kini.atlet.slice(0, 3).join(' · ')} dkk. (${kini.atlet.length} atlet)`
  }, [kini])
  if (!kini || !g) return null

  return (
    <div role="alert" aria-live="assertive" onClick={() => setAntre(q => q.slice(1))}
      className="fixed inset-0 z-[1100] flex items-center justify-center overflow-hidden cursor-pointer select-none"
      style={{ backgroundColor: '#02050c', backgroundImage: `radial-gradient(ellipse at center, ${g.warna}33 0%, #050b16 55%, #02050c 100%)`, animation: 'de-masuk .5s ease-out' }}>
      {KONFETI.map((k, i) => (
        <span key={i} className="absolute top-[-5vh] rounded-sm" style={{
          left: `${k.kiri}%`, width: k.lebar, height: k.lebar * 1.8, background: i % 3 === 0 ? g.warna : i % 3 === 1 ? '#38bdf8' : '#ffffff',
          opacity: 0.85, transform: `rotate(${k.putar}deg)`, animation: `de-jatuh ${k.lama}s linear ${k.jeda}s infinite`,
        }} />
      ))}
      <div className="relative text-center px-[4vw]" style={{ animation: 'de-naik .7s cubic-bezier(.16,1,.3,1)' }}>
        <div className="leading-none" style={{ fontSize: 'min(22vw, 30vh)', filter: `drop-shadow(0 0 4vw ${g.warna}aa)`, animation: 'de-denyut 1.6s ease-in-out infinite' }}>{g.ikon}</div>
        <div className="font-black tracking-[0.25em] mt-[1vh]" style={{ color: g.warna, fontSize: 'min(5.4vw, 8vh)', textShadow: `0 0 3vw ${g.warna}88` }}>{g.teks}!</div>
        <div className="font-black text-white leading-tight mt-[2vh]" style={{ fontSize: 'min(4.6vw, 7vh)' }}>{atlet || kini.cabor}</div>
        <div className="font-bold text-sky-200 mt-[1.2vh]" style={{ fontSize: 'min(2.6vw, 4vh)' }}>{kini.cabor} · {kini.nomor}</div>
        {kini.nilai && <div className="font-mono font-bold text-white/80 mt-[1vh]" style={{ fontSize: 'min(2.2vw, 3.4vh)' }}>{kini.nilai}</div>}
        <div className="uppercase tracking-[0.35em] text-white/60 font-bold mt-[3vh]" style={{ fontSize: 'min(1.4vw, 2.2vh)' }}>Kabupaten Bandung · BEDAS!</div>
        {antre.length > 1 && <div className="text-white/50 mt-[1.5vh]" style={{ fontSize: 'min(1.2vw, 2vh)' }}>+{antre.length - 1} medali lagi · ketuk untuk lanjut</div>}
      </div>
      <style>{`
        @keyframes de-masuk{from{opacity:0}to{opacity:1}}
        @keyframes de-naik{from{opacity:0;transform:translateY(6vh) scale(.92)}to{opacity:1;transform:none}}
        @keyframes de-denyut{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes de-jatuh{to{transform:translateY(115vh) rotate(720deg)}}
        @media (prefers-reduced-motion: reduce){[role=alert] *{animation:none!important}}
      `}</style>
    </div>
  )
}
