// src/components/konida/BadgeElite.tsx
// Penanda ELITE — satu bentuk, dipakai di semua tempat nama atlet muncul.
//
// Latar: pengurus cabor Kab. Bandung menandai atlet yang hampir dipastikan
// meraih emas dengan mewarnai selnya kuning/jingga di berkas Analisis Atlet.
// Kelompok itu disebut ELITE dan diperlakukan istimewa dalam segala hal —
// maka penandanya harus ikut ke mana pun namanya tampil, bukan hanya di satu
// papan. Satu komponen supaya bentuknya tidak berbeda-beda antar halaman.

const GAYA = {
  jingga: { background: 'rgba(249,115,22,0.18)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.45)' },
  kuning: { background: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.40)' },
} as const

const UKURAN = {
  mini:   'text-[8px]  px-1.5 py-0.5',
  kecil:  'text-[9px]  px-1.5 py-0.5',
  sedang: 'text-[10px] px-2   py-0.5',
  besar:  'text-[11px] px-2.5 py-1',
} as const

export default function BadgeElite({
  prioritas, capaian, ukuran = 'kecil',
}: {
  prioritas?: string | null
  capaian?: string | null
  ukuran?: keyof typeof UKURAN
}) {
  if (!prioritas) return null
  const gaya = prioritas === 'jingga' ? GAYA.jingga : GAYA.kuning
  return (
    <span
      title={
        'ELITE — atlet prioritas emas menurut pengurus cabor' +
        (capaian ? `\nCapaian terbaik: ${capaian}` : '')
      }
      className={`${UKURAN[ukuran]} font-black rounded tracking-[0.12em] shrink-0 whitespace-nowrap`}
      style={gaya}
    >
      ELITE
    </span>
  )
}
