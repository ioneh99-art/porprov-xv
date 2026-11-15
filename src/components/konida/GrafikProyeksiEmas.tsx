'use client'
// src/components/konida/GrafikProyeksiEmas.tsx
// Situasi perolehan emas di War Room (v2, 15 Nov 2026 — atas permintaan Bos):
//  • grafik bulatan bergaya "Grafik Raihan Emas Harian" KONI: hijau tua = emas per
//    hari, hijau muda = jumlah emas (kumulatif), abu putus-putus = proyeksi KONI;
//  • klik satu hari → rekap emas hari itu (cabor, nomor, atlet);
//  • per cabor realisasi vs proyeksi; tombol Unduh Excel (rekap + per cabor).
// Realisasi = laporan lapangan yang sudah DISAHKAN; satu nomor = satu emas.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { labelTanggal, type RincianEmas, type RingkasProyeksi } from '@/lib/proyeksi'

const HARIAN = '#16a34a'
const KUMUL = '#a3e635'
const PROY = '#94a3b8'
const EMAS = '#fbbf24'
const TEKS = { utama: '#f4f4f5', kedua: '#a1a1aa', redup: '#71717a' }
const KARTU = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

type Data = ({ ada: false } | ({ ada: true; sumber: string[]; rincian?: RincianEmas[] } & RingkasProyeksi))

const hariDari = (iso: string) => NAMA_HARI[new Date(`${iso}T00:00:00Z`).getUTCDay()]

// ── Grafik bulatan (SVG sendiri: angka di dalam bulatan seperti grafik KONI) ──
function GrafikBulatan({ data, pilih, setPilih }: {
  data: Extract<Data, { ada: true }>; pilih: string | null; setPilih: (t: string | null) => void
}) {
  const hari = data.hari
  const W = 1000, H = 380, KIRI = 24, KANAN = 24, ATAS = 30, BAWAH = 44
  const lebar = (W - KIRI - KANAN) / Math.max(1, hari.length)
  const maks = Math.max(1, data.total_proyeksi, ...hari.map(h => h.kum_realisasi ?? 0)) * 1.08
  const x = (i: number) => KIRI + lebar * (i + 0.5)
  const R = Math.min(15, lebar * 0.36)
  // Nilai 0 tetap di atas label tanggal (bulatan tidak menimpa sumbu).
  const y = (v: number) => ATAS + (H - ATAS - BAWAH - R - 6) * (1 - v / maks)
  const real = hari.map((h, i) => ({ h, i })).filter(p => p.h.kum_realisasi != null)
  // Bulatan kumulatif digeser naik bila menimpa bulatan harian (hari-hari awal).
  const yKum = (v: number, harian: number) => Math.min(y(v), y(harian) - R * 2.1)
  const akhir = real[real.length - 1]
  const garis = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px] select-none" role="img"
        aria-label="Grafik emas per hari dan kumulatif dibanding proyeksi KONI">
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={KIRI} x2={W - KANAN} y1={y(maks * f / 1.08)} y2={y(maks * f / 1.08)} stroke="rgba(255,255,255,0.05)" />
        ))}
        <line x1={KIRI} x2={W - KANAN} y1={H - BAWAH} y2={H - BAWAH} stroke="rgba(255,255,255,0.15)" />

        {/* kolom hari: bisa diklik */}
        {hari.map((h, i) => {
          const aktif = pilih === h.tanggal, kini = h.tanggal === data.batas
          return (
            <g key={h.tanggal} onClick={() => setPilih(aktif ? null : h.tanggal)} className="cursor-pointer">
              <rect x={x(i) - lebar / 2} y={ATAS - 18} width={lebar} height={H - ATAS - BAWAH + 18} rx={8}
                fill={aktif ? 'rgba(163,230,53,0.08)' : 'transparent'} stroke={aktif ? 'rgba(163,230,53,0.35)' : 'none'} />
              <text x={x(i)} y={H - BAWAH + 17} textAnchor="middle" fontSize={11} fontWeight={800}
                fill={aktif ? KUMUL : h.kum_realisasi == null ? TEKS.redup : TEKS.kedua}>{labelTanggal(h.tanggal).toUpperCase()}</text>
              {kini && <text x={x(i)} y={H - BAWAH + 32} textAnchor="middle" fontSize={9} fontWeight={800} fill={EMAS}>HARI INI</text>}
            </g>
          )
        })}

        {/* proyeksi KONI */}
        <path d={garis(hari.map((h, i) => [x(i), y(h.kum_proyeksi)]))} fill="none" stroke={PROY} strokeWidth={2} strokeDasharray="6 5" opacity={0.7} />
        {hari.map((h, i) => {
          const yp = y(h.kum_proyeksi)
          let yl = yp - 9
          if (h.kum_realisasi != null) {
            // Label proyeksi menjauh dari bulatan kumulatif bila berdekatan.
            const yk = yKum(h.kum_realisasi, h.realisasi)
            if (Math.abs(yp - yk) < R * 2 + 12) yl = h.kum_proyeksi >= h.kum_realisasi ? Math.min(yp, yk) - R - 7 : Math.max(yp, yk) + R + 14
          }
          return (
            <g key={`p${h.tanggal}`} pointerEvents="none">
              <circle cx={x(i)} cy={yp} r={3.5} fill="#07111c" stroke={PROY} strokeWidth={1.5} />
              <text x={x(i)} y={yl} textAnchor="middle" fontSize={10.5} fontWeight={800} fill={PROY}>{h.kum_proyeksi}</text>
            </g>
          )
        })}

        {/* emas per hari */}
        <path d={garis(real.map(p => [x(p.i), y(p.h.realisasi)]))} fill="none" stroke={HARIAN} strokeWidth={3} />
        {/* kumulatif */}
        <path d={garis(real.map(p => [x(p.i), yKum(p.h.kum_realisasi!, p.h.realisasi)]))} fill="none" stroke={KUMUL} strokeWidth={3} />

        {real.map(p => (
          <g key={`h${p.h.tanggal}`} pointerEvents="none">
            <circle cx={x(p.i)} cy={y(p.h.realisasi)} r={R} fill={HARIAN} stroke="#07111c" strokeWidth={2} />
            <text x={x(p.i)} y={y(p.h.realisasi) + 4.5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff">{p.h.realisasi}</text>
          </g>
        ))}
        {real.map(p => {
          const cy = yKum(p.h.kum_realisasi!, p.h.realisasi)
          const ujung = p === akhir
          return (
            <g key={`k${p.h.tanggal}`} pointerEvents="none">
              {ujung && (
                <circle cx={x(p.i)} cy={cy} r={R} fill="none" stroke={KUMUL} strokeWidth={2}>
                  <animate attributeName="r" values={`${R};${R + 12}`} dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={x(p.i)} cy={cy} r={ujung ? R + 3 : R} fill={KUMUL} stroke="#07111c" strokeWidth={2} />
              <text x={x(p.i)} y={cy + 4.5} textAnchor="middle" fontSize={ujung ? 15 : 13} fontWeight={900} fill="#1a2e05">{p.h.kum_realisasi}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

async function unduhExcel(data: Extract<Data, { ada: true }>, rincian: RincianEmas[]) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const sampai = data.batas ? labelTanggal(data.batas) : ''
  const harian = data.hari.map(h => ({
    'Tanggal': h.tanggal.split('-').reverse().join('-'), 'Hari': hariDari(h.tanggal),
    'Emas per hari': h.kum_realisasi == null ? '' : h.realisasi, 'Kumulatif': h.kum_realisasi ?? '',
    'Proyeksi per hari': h.proyeksi, 'Proyeksi kumulatif': h.kum_proyeksi,
    'Selisih kumulatif': h.kum_realisasi == null ? '' : h.kum_realisasi - h.kum_proyeksi,
  }))
  const s1 = XLSX.utils.json_to_sheet(harian)
  s1['!cols'] = [12, 9, 13, 11, 16, 18, 17].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, s1, 'Grafik Harian')

  const s2 = XLSX.utils.json_to_sheet(rincian.map((r, i) => ({
    'No': i + 1, 'Tanggal': r.tanggal.split('-').reverse().join('-'), 'Hari': hariDari(r.tanggal),
    'Cabang Olahraga': r.cabor, 'Disiplin': r.disiplin ?? '', 'Nomor Pertandingan': r.nomor,
    'Nama Atlet': r.atlet.join(', '), 'Jml Atlet': r.atlet.length, 'Hasil / Catatan': r.nilai ?? '',
  })))
  s2['!cols'] = [5, 12, 9, 18, 18, 42, 60, 9, 26].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, s2, 'Rekap Emas')

  const s3 = XLSX.utils.json_to_sheet(data.per_cabor.map(c => ({
    'Cabang Olahraga': c.cabor, 'Realisasi emas': c.realisasi, 'Proyeksi emas': c.proyeksi, 'Selisih': c.selisih,
  })))
  s3['!cols'] = [22, 15, 15, 10].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, s3, 'Per Cabor')
  XLSX.writeFile(wb, `Rekap_Emas_Harian_KabBandung_${sampai.replace(' ', '')}.xlsx`)
}

export default function GrafikProyeksiEmas({ kontingenId }: { kontingenId: number }) {
  const [data, setData] = useState<Data | null>(null)
  const [pilih, setPilih] = useState<string | null>(null)
  const [disentuh, setDisentuh] = useState(false)
  const [semuaCabor, setSemuaCabor] = useState(false)

  const muat = useCallback(async () => {
    try {
      const r = await fetch(`/api/konida/proyeksi-emas?kontingen_id=${kontingenId}`, { cache: 'no-store' })
      if (r.ok) setData(await r.json())
    } catch { /* sinyal putus: tampilan lama tetap */ }
  }, [kontingenId])

  useEffect(() => {
    muat()
    // 60 dtk cukup: emas baru juga diumumkan Detik Emas; hemat CPU server.
    const iv = setInterval(() => { if (document.visibilityState === 'visible') muat() }, 60_000)
    return () => clearInterval(iv)
  }, [muat])

  const rincian = useMemo(() => (data && data.ada ? data.rincian ?? [] : []), [data])
  // Bawaan: hari terakhir yang ada emasnya — sampai Bos memilih hari lain.
  useEffect(() => {
    if (!disentuh && rincian.length) setPilih(rincian[rincian.length - 1].tanggal)
  }, [rincian, disentuh])

  if (!data || !data.ada) return null

  const real = data.hari.filter(h => h.kum_realisasi != null)
  const realSdBatas = real.length ? real[real.length - 1].kum_realisasi! : 0
  const selisih = realSdBatas - data.proyeksi_sd_batas
  const persen = data.total_proyeksi ? Math.round(data.total_realisasi / data.total_proyeksi * 100) : 0
  const terbaik = Math.max(0, ...real.map(h => h.realisasi))
  const hariTerbaik = real.filter(h => terbaik > 0 && h.realisasi === terbaik).map(h => labelTanggal(h.tanggal))
  const sisaHari = data.hari.filter(h => !data.batas || h.tanggal > data.batas).length
  const kurang = Math.max(0, data.total_proyeksi - data.total_realisasi)
  const warnaSelisih = selisih > 0 ? '#22c55e' : selisih < 0 ? '#ef4444' : TEKS.kedua
  const daftar = pilih ? rincian.filter(r => r.tanggal === pilih) : rincian
  const titikPilih = pilih ? data.hari.find(h => h.tanggal === pilih) : null
  const cabor = semuaCabor ? data.per_cabor : data.per_cabor.slice(0, 10)
  const maksCabor = Math.max(1, ...data.per_cabor.map(c => Math.max(c.proyeksi, c.realisasi)))
  const pilihHari = (t: string | null) => { setDisentuh(true); setPilih(t) }

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(20,83,45,0.22), rgba(2,10,20,0.75) 45%)', border: '1px solid rgba(163,230,53,0.15)' }}>
      {/* kepala */}
      <div className="px-5 py-3.5 flex items-center gap-3 border-b flex-wrap" style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(163,230,53,0.1)' }}>
        <span className="text-lg">🥇</span>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: KUMUL }}>Situasi Perolehan Emas</div>
          <div className="text-sm font-black text-white leading-tight">Raihan Emas Harian Kab. Bandung · Porprov XV 2026</div>
        </div>
        <span className="ml-auto flex items-center gap-4 text-[11px] flex-wrap" style={{ color: TEKS.kedua }}>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: HARIAN }} />Emas per hari</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: KUMUL }} />Jumlah emas</span>
          <span className="flex items-center gap-1.5"><svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke={PROY} strokeWidth="2" strokeDasharray="5 3" /></svg>Proyeksi KONI</span>
          <button onClick={() => unduhExcel(data, rincian)} className="px-3 py-1.5 rounded-lg text-[11px] font-black"
            style={{ background: 'rgba(163,230,53,0.12)', color: KUMUL, border: '1px solid rgba(163,230,53,0.3)' }}>⬇ Unduh Excel</button>
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* angka utama */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-2xl px-4 py-3 col-span-2 lg:col-span-1" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: EMAS }}>Total emas disahkan</div>
            <div className="text-4xl font-black leading-tight" style={{ color: EMAS }}>{data.total_realisasi}</div>
            <div className="text-[11px]" style={{ color: TEKS.kedua }}>{data.batas ? `${labelTanggal(data.hari[0].tanggal)} – ${labelTanggal(data.batas)}` : 'belum ada yang disahkan'}</div>
          </div>
          <div className="rounded-2xl px-4 py-3" style={{ background: `${warnaSelisih}12`, border: `1px solid ${warnaSelisih}45` }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: TEKS.redup }}>Vs proyeksi s.d. {data.batas ? labelTanggal(data.batas) : 'hari ini'}</div>
            <div className="text-3xl font-black leading-tight" style={{ color: warnaSelisih }}>{data.batas ? `${selisih > 0 ? '+' : ''}${selisih}` : '—'}</div>
            <div className="text-[11px]" style={{ color: TEKS.kedua }}>{realSdBatas} dari proyeksi {data.proyeksi_sd_batas}</div>
          </div>
          <div className="rounded-2xl px-4 py-3" style={KARTU}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: TEKS.redup }}>Hari terbaik</div>
            <div className="text-3xl font-black leading-tight" style={{ color: TEKS.utama }}>{terbaik} <span className="text-sm font-bold" style={{ color: TEKS.kedua }}>emas</span></div>
            <div className="text-[11px] truncate" style={{ color: TEKS.kedua }}>{hariTerbaik.join(' & ') || '—'}</div>
          </div>
          <div className="rounded-2xl px-4 py-3" style={KARTU}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: TEKS.redup }}>Menuju target {data.total_proyeksi}</div>
            <div className="text-3xl font-black leading-tight" style={{ color: TEKS.utama }}>{kurang ? <>{kurang} <span className="text-sm font-bold" style={{ color: TEKS.kedua }}>emas lagi</span></> : 'Tercapai 🎉'}</div>
            <div className="text-[11px]" style={{ color: TEKS.kedua }}>
              {kurang && sisaHari ? `${sisaHari} hari tersisa · ±${Math.ceil(kurang / sisaHari)} emas/hari` : kurang ? 'jadwal proyeksi sudah habis' : 'target proyeksi terlampaui'}
            </div>
          </div>
          <div className="rounded-2xl px-4 py-3" style={KARTU}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: TEKS.redup }}>Tercapai</div>
            <div className="text-3xl font-black leading-tight" style={{ color: TEKS.utama }}>{persen}%</div>
            <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, persen)}%`, background: `linear-gradient(90deg, ${HARIAN}, ${KUMUL})` }} />
            </div>
          </div>
        </div>

        {/* grafik */}
        <div className="rounded-2xl p-3" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center justify-between px-1 mb-1 flex-wrap gap-2">
            <div className="text-xs font-bold" style={{ color: TEKS.kedua }}>Proyeksi raihan emas harian vs realisasi</div>
            <div className="text-[10px]" style={{ color: TEKS.redup }}>Klik tanggal untuk melihat emas hari itu</div>
          </div>
          <GrafikBulatan data={data} pilih={pilih} setPilih={pilihHari} />
        </div>

        {/* rekap per hari */}
        <div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => pilihHari(null)} className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black"
              style={{ background: pilih == null ? KUMUL : 'rgba(255,255,255,0.04)', color: pilih == null ? '#1a2e05' : TEKS.kedua, border: '1px solid rgba(255,255,255,0.08)' }}>
              Semua · {rincian.length}
            </button>
            {real.map(h => (
              <button key={h.tanggal} onClick={() => pilihHari(h.tanggal)} className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1.5"
                style={{ background: pilih === h.tanggal ? KUMUL : 'rgba(255,255,255,0.04)', color: pilih === h.tanggal ? '#1a2e05' : h.realisasi ? TEKS.utama : TEKS.redup, border: '1px solid rgba(255,255,255,0.08)' }}>
                {labelTanggal(h.tanggal)}
                <span className="px-1.5 rounded-full text-[10px]" style={{ background: pilih === h.tanggal ? 'rgba(0,0,0,0.15)' : h.realisasi ? HARIAN : 'rgba(255,255,255,0.06)', color: pilih === h.tanggal ? '#1a2e05' : '#fff' }}>{h.realisasi}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <div className="text-sm font-black text-white">
              {titikPilih ? `${hariDari(titikPilih.tanggal)}, ${labelTanggal(titikPilih.tanggal)} 2026` : 'Semua emas'}
            </div>
            <div className="text-[11px]" style={{ color: TEKS.kedua }}>
              {titikPilih
                ? `${titikPilih.realisasi} emas (proyeksi ${titikPilih.proyeksi}) · total sampai hari itu ${titikPilih.kum_realisasi ?? '—'}`
                : `${rincian.length} emas · ${new Set(rincian.map(r => r.cabor)).size} cabor`}
            </div>
          </div>

          {daftar.length === 0 ? (
            <div className="mt-2 rounded-xl px-4 py-6 text-center text-xs" style={{ ...KARTU, color: TEKS.redup }}>Belum ada emas yang disahkan pada hari ini.</div>
          ) : (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[460px] overflow-y-auto pr-1">
              {daftar.map(r => (
                <div key={r.id} className="rounded-xl px-3.5 py-2.5 flex gap-3" style={KARTU}>
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black"
                    style={{ background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 70%)', color: '#78350f' }}>E</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: KUMUL }}>{r.cabor}</span>
                      {!pilih && <span className="text-[10px]" style={{ color: TEKS.redup }}>· {labelTanggal(r.tanggal)}</span>}
                    </div>
                    <div className="text-[13px] font-bold text-white leading-snug">{r.nomor}</div>
                    <div className="text-[11px] mt-0.5 leading-snug" style={{ color: TEKS.kedua }}>
                      {r.atlet.length > 4 ? <>{r.atlet.slice(0, 4).join(', ')} <span style={{ color: TEKS.redup }}>+{r.atlet.length - 4} atlet</span></> : r.atlet.join(', ') || '—'}
                    </div>
                    {r.nilai && <div className="text-[10px] mt-0.5 truncate" style={{ color: TEKS.redup }} title={r.nilai}>{r.nilai}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* per cabor */}
        <div>
          <div className="text-xs font-bold mb-2" style={{ color: TEKS.kedua }}>Per cabor <span className="font-normal" style={{ color: TEKS.redup }}>· realisasi vs proyeksi, yang paling tertinggal di atas</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {cabor.map(c => (
              <div key={c.cabor} className="flex items-center gap-3 text-[11px]">
                <span className="w-28 truncate font-bold" style={{ color: TEKS.utama }} title={c.cabor}>{c.cabor}</span>
                <span className="flex-1 space-y-[2px]">
                  <span className="block h-1.5 rounded-full" style={{ width: `${c.proyeksi / maksCabor * 100}%`, minWidth: c.proyeksi ? 4 : 0, background: PROY, opacity: 0.6 }} />
                  <span className="block h-1.5 rounded-full" style={{ width: `${c.realisasi / maksCabor * 100}%`, minWidth: c.realisasi ? 4 : 0, background: KUMUL }} />
                </span>
                <span className="w-16 text-right tabular-nums" style={{ color: TEKS.kedua }}>{c.realisasi} / {c.proyeksi}</span>
                <span className="w-12 text-right tabular-nums font-bold" style={{ color: c.selisih < 0 ? '#ef4444' : c.selisih > 0 ? '#22c55e' : TEKS.redup }}>
                  {c.selisih < 0 ? '▼' : c.selisih > 0 ? '▲' : '●'} {c.selisih > 0 ? '+' : ''}{c.selisih}
                </span>
              </div>
            ))}
          </div>
          {data.per_cabor.length > 10 && (
            <button onClick={() => setSemuaCabor(v => !v)} className="mt-2 text-[11px] font-bold underline underline-offset-2" style={{ color: TEKS.kedua }}>
              {semuaCabor ? 'Tampilkan 10 teratas' : `Tampilkan semua ${data.per_cabor.length} cabor`}
            </button>
          )}
        </div>

        <p className="text-[10px]" style={{ color: TEKS.redup }}>
          Sumber proyeksi: {data.sumber.join(', ')}. Realisasi = laporan lapangan yang sudah disahkan KONIDA; satu nomor = satu emas. Disegarkan otomatis tiap 1 menit.
        </p>
      </div>
    </div>
  )
}
