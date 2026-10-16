'use client'
// src/components/konida/GrafikProyeksiEmas.tsx
// Situasi perolehan emas: proyeksi KONI vs realisasi (laporan lapangan yang
// sudah disahkan). Dua grafik bersumbu satu — kumulatif dan per hari — bukan
// satu grafik bersumbu ganda. Warna sudah diuji untuk buta warna di latar gelap:
// biru = realisasi, oranye putus-putus = proyeksi.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { labelTanggal, type RingkasProyeksi, type TitikProyeksi } from '@/lib/proyeksi'

const REAL = '#3987e5'
const PROY = '#d95926'
const PERMUKAAN = '#07111c'
const TEKS = { utama: '#f4f4f5', kedua: '#a1a1aa', redup: '#71717a' }
const GARIS = 'rgba(255,255,255,0.06)'
const STATUS = {
  di_depan:    { warna: '#0ca30c', ikon: '▲', teks: 'Di depan proyeksi' },
  sesuai:      { warna: '#a1a1aa', ikon: '●', teks: 'Sesuai proyeksi' },
  di_belakang: { warna: '#d03b3b', ikon: '▼', teks: 'Di belakang proyeksi' },
  belum_mulai: { warna: '#a1a1aa', ikon: '○', teks: 'Belum ada yang disahkan' },
} as const

type Data = ({ ada: false } | ({ ada: true; sumber: string[] } & RingkasProyeksi))

function KotakTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const t: TitikProyeksi = payload[0].payload
  return (
    <div className="rounded-lg px-3 py-2 text-[11px] shadow-xl" style={{ background: '#0b1622', border: '1px solid rgba(255,255,255,0.12)', color: TEKS.utama }}>
      <div className="font-bold mb-1">{label}</div>
      <div className="flex items-center gap-2"><span className="inline-block w-3 h-0.5" style={{ background: PROY }} /> <span style={{ color: TEKS.kedua }}>Proyeksi</span> <b className="ml-auto pl-3">{t.proyeksi} <span style={{ color: TEKS.redup, fontWeight: 400 }}>· total {t.kum_proyeksi}</span></b></div>
      <div className="flex items-center gap-2"><span className="inline-block w-3 h-0.5" style={{ background: REAL }} /> <span style={{ color: TEKS.kedua }}>Realisasi</span> <b className="ml-auto pl-3">{t.kum_realisasi == null ? '—' : <>{t.realisasi} <span style={{ color: TEKS.redup, fontWeight: 400 }}>· total {t.kum_realisasi}</span></>}</b></div>
    </div>
  )
}

const sumbu = { tick: { fill: TEKS.redup, fontSize: 10 }, tickLine: false, axisLine: { stroke: 'rgba(255,255,255,0.12)' } } as const

export default function GrafikProyeksiEmas({ kontingenId }: { kontingenId: number }) {
  const [data, setData] = useState<Data | null>(null)
  const [semuaCabor, setSemuaCabor] = useState(false)
  const [tabel, setTabel] = useState(false)

  const muat = useCallback(async () => {
    try {
      const r = await fetch(`/api/konida/proyeksi-emas?kontingen_id=${kontingenId}`, { cache: 'no-store' })
      if (r.ok) setData(await r.json())
    } catch { /* sinyal putus: tampilan lama tetap */ }
  }, [kontingenId])

  useEffect(() => {
    muat()
    const iv = setInterval(() => { if (document.visibilityState === 'visible') muat() }, 20_000)
    return () => clearInterval(iv)
  }, [muat])

  const hari = useMemo(() => data && data.ada ? data.hari.map(h => ({ ...h, label: labelTanggal(h.tanggal) })) : [], [data])
  if (!data || !data.ada) return null

  const st = STATUS[data.status]
  const realSdBatas = data.batas ? (data.hari.find(h => h.tanggal === data.batas)?.kum_realisasi ?? 0) : 0
  const selisih = realSdBatas - data.proyeksi_sd_batas
  const persen = data.total_proyeksi ? Math.round(data.total_realisasi / data.total_proyeksi * 100) : 0
  const idxAkhirReal = hari.reduce((j, h, i) => h.kum_realisasi != null ? i : j, -1)
  const cabor = semuaCabor ? data.per_cabor : data.per_cabor.slice(0, 8)
  const maksCabor = Math.max(1, ...data.per_cabor.map(c => Math.max(c.proyeksi, c.realisasi)))

  // Label langsung hanya di ujung tiap garis — bukan angka di setiap titik.
  const labelUjung = (idx: number, warna: string) => (p: any) =>
    p.index === idx && p.value != null
      ? <text x={p.x + 6} y={p.y + 4} fill={TEKS.utama} fontSize={11} fontWeight={700}>{p.value}<tspan fill={warna}> ●</tspan></text>
      : null

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(2,10,20,0.65)', border: '1px solid rgba(56,189,248,0.12)' }}>
      <div className="px-5 py-3 flex items-center gap-3 border-b flex-wrap" style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(56,189,248,0.08)' }}>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#38bdf8' }}>Situasi Perolehan Emas</span>
        <span className="h-3 w-px bg-white/10" />
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: TEKS.redup }}>Proyeksi KONI vs realisasi yang sudah disahkan</span>
        <span className="ml-auto flex items-center gap-4 text-[11px]" style={{ color: TEKS.kedua }}>
          <span className="flex items-center gap-1.5"><svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke={PROY} strokeWidth="2" strokeDasharray="5 3" /></svg>Proyeksi KONI</span>
          <span className="flex items-center gap-1.5"><svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke={REAL} strokeWidth="2" /></svg>Realisasi</span>
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Angka utama */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: TEKS.redup }}>Realisasi emas</div>
            <div className="text-3xl font-black leading-tight" style={{ color: TEKS.utama }}>{data.total_realisasi}</div>
            <div className="text-[11px]" style={{ color: TEKS.kedua }}>{data.batas ? `sampai ${labelTanggal(data.batas)}` : 'belum ada yang disahkan'}</div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: TEKS.redup }}>Proyeksi sampai {data.batas ? labelTanggal(data.batas) : 'hari ini'}</div>
            <div className="text-3xl font-black leading-tight" style={{ color: TEKS.utama }}>{data.proyeksi_sd_batas}</div>
            <div className="text-[11px]" style={{ color: TEKS.kedua }}>dari total proyeksi {data.total_proyeksi}</div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: `${st.warna}12`, border: `1px solid ${st.warna}40` }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: TEKS.redup }}>Selisih</div>
            <div className="text-3xl font-black leading-tight" style={{ color: TEKS.utama }}>{data.batas ? `${selisih > 0 ? '+' : ''}${selisih}` : '—'}</div>
            <div className="text-[11px] font-bold" style={{ color: st.warna }}>{st.ikon} {st.teks}</div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: TEKS.redup }}>Tercapai dari total proyeksi</div>
            <div className="text-3xl font-black leading-tight" style={{ color: TEKS.utama }}>{persen}%</div>
            <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, persen)}%`, background: REAL }} />
            </div>
          </div>
        </div>

        {/* Dua grafik, satu sumbu masing-masing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-bold mb-2" style={{ color: TEKS.kedua }}>Akumulasi emas</div>
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hari} margin={{ top: 10, right: 36, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GARIS} />
                  <XAxis dataKey="label" {...sumbu} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis {...sumbu} axisLine={false} allowDecimals={false} width={30} />
                  <Tooltip content={<KotakTip />} cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }} />
                  <Line type="linear" dataKey="kum_proyeksi" name="Proyeksi" stroke={PROY} strokeWidth={2} strokeDasharray="6 4" dot={false}
                    activeDot={{ r: 4, fill: PROY, stroke: PERMUKAAN, strokeWidth: 2 }} isAnimationActive={false}>
                    <LabelList dataKey="kum_proyeksi" content={labelUjung(hari.length - 1, PROY)} />
                  </Line>
                  <Line type="linear" dataKey="kum_realisasi" name="Realisasi" stroke={REAL} strokeWidth={2} dot={false} connectNulls={false}
                    activeDot={{ r: 4, fill: REAL, stroke: PERMUKAAN, strokeWidth: 2 }} isAnimationActive={false}>
                    <LabelList dataKey="kum_realisasi" content={labelUjung(idxAkhirReal, REAL)} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold mb-2" style={{ color: TEKS.kedua }}>Emas per hari</div>
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hari} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke={GARIS} />
                  <XAxis dataKey="label" {...sumbu} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis {...sumbu} axisLine={false} allowDecimals={false} width={30} />
                  <Tooltip content={<KotakTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="proyeksi" name="Proyeksi" fill={PROY} radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={false} />
                  <Bar dataKey="realisasi" name="Realisasi" fill={REAL} radius={[4, 4, 0, 0]} maxBarSize={12} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Per cabor: yang paling tertinggal di atas */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="text-xs font-bold" style={{ color: TEKS.kedua }}>Per cabor <span className="font-normal" style={{ color: TEKS.redup }}>· yang paling tertinggal dari proyeksi di atas</span></div>
            <button onClick={() => setTabel(v => !v)} className="text-[11px] font-bold underline underline-offset-2" style={{ color: TEKS.kedua }}>
              {tabel ? 'Sembunyikan tabel harian' : 'Lihat tabel harian'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {cabor.map(c => (
              <div key={c.cabor} className="flex items-center gap-3 text-[11px]">
                <span className="w-28 truncate font-bold" style={{ color: TEKS.utama }} title={c.cabor}>{c.cabor}</span>
                <span className="flex-1 space-y-[2px]">
                  <span className="block h-1.5 rounded-full" style={{ width: `${c.proyeksi / maksCabor * 100}%`, minWidth: c.proyeksi ? 4 : 0, background: PROY }} />
                  <span className="block h-1.5 rounded-full" style={{ width: `${c.realisasi / maksCabor * 100}%`, minWidth: c.realisasi ? 4 : 0, background: REAL }} />
                </span>
                <span className="w-24 text-right tabular-nums" style={{ color: TEKS.kedua }}>{c.realisasi} / {c.proyeksi}</span>
                <span className="w-12 text-right tabular-nums font-bold" style={{ color: c.selisih < 0 ? STATUS.di_belakang.warna : c.selisih > 0 ? STATUS.di_depan.warna : TEKS.redup }}>
                  {c.selisih < 0 ? '▼' : c.selisih > 0 ? '▲' : '●'} {c.selisih > 0 ? '+' : ''}{c.selisih}
                </span>
              </div>
            ))}
          </div>
          {data.per_cabor.length > 8 && (
            <button onClick={() => setSemuaCabor(v => !v)} className="mt-2 text-[11px] font-bold underline underline-offset-2" style={{ color: TEKS.kedua }}>
              {semuaCabor ? 'Tampilkan 8 teratas' : `Tampilkan semua ${data.per_cabor.length} cabor`}
            </button>
          )}
        </div>

        {tabel && (
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <table className="w-full text-[11px] tabular-nums">
              <thead><tr style={{ color: TEKS.redup }} className="text-left">
                <th className="px-3 py-2">Tanggal</th><th className="px-3 py-2 text-right">Proyeksi</th><th className="px-3 py-2 text-right">Realisasi</th>
                <th className="px-3 py-2 text-right">Akumulasi proyeksi</th><th className="px-3 py-2 text-right">Akumulasi realisasi</th>
              </tr></thead>
              <tbody>
                {hari.map(h => (
                  <tr key={h.tanggal} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)', color: TEKS.kedua }}>
                    <td className="px-3 py-1.5" style={{ color: TEKS.utama }}>{h.label}</td>
                    <td className="px-3 py-1.5 text-right">{h.proyeksi}</td>
                    <td className="px-3 py-1.5 text-right">{h.kum_realisasi == null ? '—' : h.realisasi}</td>
                    <td className="px-3 py-1.5 text-right">{h.kum_proyeksi}</td>
                    <td className="px-3 py-1.5 text-right">{h.kum_realisasi ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px]" style={{ color: TEKS.redup }}>
          Sumber proyeksi: {data.sumber.join(', ')}. Realisasi = laporan PIC lapangan yang sudah disahkan KONIDA; satu nomor = satu emas. Disegarkan otomatis tiap 20 detik.
        </p>
      </div>
    </div>
  )
}
