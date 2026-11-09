'use client'
// src/app/operator/dayung/profil/[id]/page.tsx
// PODSI Jabar — Rapor satu atlet Dayung: identitas & kelompok umur, kelengkapan data,
// indikator performa dari hasil lomba resmi, tes fisik & postur, dan data manajemen.
// [id] = id atlet di situs panitia (dayung_jabar_atlet.situs_id).

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, Timer, Activity, ClipboardList, CheckCircle2, Circle, Target, Medal, Gauge } from 'lucide-react'
import { muatJabar, labelDisiplin, WARNA_DISIPLIN, WARNA_MEDALI, SITUS_PANITIA, type JabarData } from '@/lib/sport-plugins/dayung/jabar-data'
import { kelengkapan, kelompokUmur, lagaAtlet, ringkasPerforma, umurPada, type Lapis } from '@/lib/dayung-profil'

const ACCENT = '#38bdf8'
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const warnaPersen = (p: number) => (p >= 75 ? '#34d399' : p >= 45 ? '#fbbf24' : '#f87171')
const gLabel = (g: string | null) => (g === 'L' ? 'Putra' : g === 'P' ? 'Putri' : g === 'MIX' ? 'Campuran' : '—')
const tgl = (t: string | null) => (t ? new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

// Ukuran yang paling menentukan di dayung, belum ada di tes biomotorik umum.
const SARAN_TES = [
  'Ergometer 2000 m (rowing) / 500 m & 1000 m (kayak, canoe)',
  'Kekuatan tarik: bench pull 1RM, pull-up maksimal',
  'Rentang lengan & tinggi duduk (pencarian bakat)',
  'Waktu uji air per jarak (200/500/1000 m) di luar lomba',
]

function Judul({ icon: I, teks, warna = ACCENT }: { icon: any; teks: string; warna?: string }) {
  return <div className="flex items-center gap-2 mb-3"><I size={14} style={{ color: warna }} /><h3 className="text-sm font-bold text-white">{teks}</h3></div>
}

export default function DayungRaporAtlet() {
  const { id } = useParams<{ id: string }>()
  const situsId = Number(id)
  const [data, setData] = useState<JabarData | null>(null)
  const [lokal, setLokal] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const d = await muatJabar()
      setData(d)
      const a = d.atlet.find(x => x.situs_id === situsId)
      if (a?.atlet_id) {
        const r = await fetch(`/api/dayung/profil?ids=${a.atlet_id}&rinci=1`).then(x => x.json()).catch(() => ({}))
        setLokal(r.atlet?.[a.atlet_id] ?? null)
      }
      setLoading(false)
    })()
  }, [situsId])

  const a = data?.atlet.find(x => x.situs_id === situsId) ?? null
  const rows = useMemo(() => (data && a ? lagaAtlet(a.situs_id, data.laga, data.peserta) : []), [data, a])
  const perf = useMemo(() => ringkasPerforma(rows), [rows])
  const umur = umurPada(lokal?.tgl_lahir)
  const k = kelengkapan({
    tanggalLahir: !!lokal?.tgl_lahir, terverifikasi: !!lokal?.terverifikasi,
    hasilLomba: rows.some(r => r.waktuDetik != null), tesFisik: !!lokal?.tes, postur: !!(lokal?.tes?.tinggi && lokal?.tes?.berat),
    bpjs: !!lokal?.bpjs, riwayat: (lokal?.jumlah_riwayat ?? 0) > 0, perlengkapan: !!lokal?.ada_perlengkapan, dokumen: (lokal?.jumlah_dokumen ?? 0) > 0,
  })

  if (!loading && !a) return (
    <div className="p-6 text-sm text-slate-400">Atlet tidak ditemukan. <Link href="/operator/dayung/profil" className="text-sky-400 hover:underline">Kembali ke daftar</Link></div>
  )
  const d = labelDisiplin(a?.disiplin)

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>
      <Link href="/operator/dayung/profil" className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-300 mb-3"><ArrowLeft size={12} /> Semua atlet</Link>

      {/* Identitas */}
      <div className="rounded-2xl p-5 mb-4 flex flex-wrap items-start justify-between gap-4" style={kartu}>
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `${WARNA_DISIPLIN[d] ?? '#64748b'}20`, color: WARNA_DISIPLIN[d] ?? '#94a3b8' }}>{d}</span>
            <span className="text-[11px] text-slate-500">{gLabel(a?.gender ?? null)}</span>
            {kelompokUmur(umur) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 font-bold">{kelompokUmur(umur)}</span>}
          </div>
          <h1 className="text-2xl font-black text-white">{a?.nama ?? '…'}</h1>
          <div className="text-sm text-slate-400">{a?.kontingen}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-4">
            <span>Umur: {umur != null ? `${umur} th (per 7 Nov 2026)` : 'belum ada data'}</span>
            <span>Status: {lokal ? (lokal.terverifikasi ? 'terverifikasi' : (lokal.status_registrasi ?? '—')) : 'belum ada data kontingen'}</span>
          </div>
          {a && <a href={`${SITUS_PANITIA}/atlet/${a.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline mt-2">Halaman resmi di situs panitia <ExternalLink size={10} /></a>}
        </div>
        <div className="flex gap-3">
          {(['emas', 'perak', 'perunggu'] as const).map(m => (
            <div key={m} className="text-center px-3">
              <div className="text-3xl font-black tabular-nums" style={{ color: WARNA_MEDALI[m] }}>{perf[m]}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500">{m}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Kelengkapan */}
      <div className="rounded-2xl p-5 mb-4" style={kartu}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white">Kelengkapan Data</h3>
          <span className="text-lg font-black" style={{ color: warnaPersen(k.persen) }}>{k.persen}% <span className="text-xs text-slate-500 font-normal">({k.ada}/{k.total})</span></span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['Identitas', 'Performa', 'Manajemen'] as Lapis[]).map(l => (
            <div key={l} className="rounded-xl p-3 bg-slate-900/40">
              <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: ACCENT }}>{l}</div>
              {k.butir.filter(b => b.lapis === l).map(b => (
                <div key={b.kunci} className="flex items-center gap-2 text-xs py-0.5">
                  {b.ada ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Circle size={13} className="text-slate-600" />}
                  <span className={b.ada ? 'text-slate-200' : 'text-slate-500'}>{b.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {!a?.atlet_id && <div className="text-[11px] text-amber-300/80 mt-3">Data awal atlet ini belum diisi kontingennya. Yang terlihat baru hasil lomba dari situs panitia.</div>}
      </div>

      {/* Performa */}
      <div className="rounded-2xl p-5 mb-4" style={kartu}>
        <Judul icon={Gauge} teks="Indikator Performa (hasil lomba resmi)" />
        {rows.length === 0 ? <div className="text-xs text-slate-500">Belum bertanding di PORPROV XV.</div> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {[
                { l: 'Laga', v: `${perf.laga}`, s: `${perf.final} final` },
                { l: '% kecepatan juara (rata-rata)', v: perf.persenRata != null ? `${perf.persenRata}%` : '—', s: '100% = sama dengan juara' },
                { l: '% kecepatan juara (terbaik)', v: perf.persenTerbaik != null ? `${perf.persenTerbaik}%` : '—', s: '' },
                { l: 'Jarak terdekat ke emas', v: perf.terdekatEmas ? `+${perf.terdekatEmas.selisih.toFixed(2)} dtk` : perf.emas ? 'sudah emas' : '—', s: perf.terdekatEmas?.nomor ?? '' },
                { l: 'Lolos heat → final', v: perf.lolosHeat.dari ? `${perf.lolosHeat.lolos}/${perf.lolosHeat.dari}` : '—', s: `maks ${perf.bebanMaksHarian} laga/hari` },
              ].map(x => (
                <div key={x.l} className="rounded-xl p-3 bg-slate-900/40">
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 leading-tight">{x.l}</div>
                  <div className="text-xl font-black text-white tabular-nums mt-1">{x.v}</div>
                  {x.s && <div className="text-[10px] text-slate-500 truncate">{x.s}</div>}
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                  <th className="text-left py-2">Tanggal</th><th className="text-left">Nomor</th><th className="text-left">Babak</th>
                  <th className="text-center">Peringkat</th><th className="text-right">Waktu</th><th className="text-right">vs juara</th>
                  <th className="text-right">% juara</th><th className="text-left pl-3">Keterangan</th>
                </tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.ref} className="border-b border-white/5">
                      <td className="py-2 text-slate-500 whitespace-nowrap">{r.tanggal?.slice(5)} {r.jam ?? ''}</td>
                      <td className="text-slate-200">{r.nomor}{r.rekan.length > 0 && <div className="text-[10px] text-slate-500">bersama {r.rekan.join(', ')}</div>}</td>
                      <td className="text-slate-400 whitespace-nowrap">{r.babak}{r.kode ? ` (${r.kode})` : ''}</td>
                      <td className="text-center font-black" style={{ color: r.medali ? WARNA_MEDALI[r.medali] : '#e2e8f0' }}>{r.peringkat ?? '—'}<span className="text-slate-600 font-normal text-[10px]">/{r.jumlahPerahu}</span></td>
                      <td className="text-right font-mono text-sky-300">{r.waktu ?? (r.selesai ? '—' : 'belum')}</td>
                      <td className="text-right font-mono text-slate-400">{r.selisihJuara ? `+${r.selisihJuara.toFixed(2)}` : r.selisihJuara === 0 ? '—' : ''}</td>
                      <td className="text-right font-bold tabular-nums text-slate-200">{r.persenJuara != null ? `${r.persenJuara}%` : ''}</td>
                      <td className="pl-3 text-[11px]">
                        {r.medali && <span className="font-bold capitalize" style={{ color: WARNA_MEDALI[r.medali] }}>{r.medali}</span>}
                        {r.selisihMedali != null && <span className="text-amber-300">+{r.selisihMedali.toFixed(2)} dtk dari perunggu</span>}
                        {r.lolosFinal === true && <span className="text-emerald-400">lolos final</span>}
                        {r.lolosFinal === false && <span className="text-slate-500">tidak lolos final</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {perf.terbaikPerNomor.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: ACCENT }}>Waktu terbaik per nomor (titik nol untuk perbandingan berikutnya)</div>
                <div className="flex flex-wrap gap-2">
                  {perf.terbaikPerNomor.map(t => (
                    <span key={t.nomor} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-white/5"><span className="text-slate-400">{t.nomor}</span> <b className="font-mono text-sky-300">{t.waktu}</b></span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Fisik */}
        <div className="rounded-2xl p-5" style={kartu}>
          <Judul icon={Activity} teks="Tes Fisik & Postur" warna="#34d399" />
          {!lokal?.tes ? <div className="text-xs text-slate-500 mb-3">Belum ada hasil tes fisik.</div> : (
            <>
              <div className="text-[11px] text-slate-500 mb-3">{tgl(lokal.tes.tanggal)} · {lokal.tes.lembaga ?? '—'}{lokal.tes.tahap ? ` · tahap ${lokal.tes.tahap}` : ''} · {lokal.tes.jumlah_tes}× tes</div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[['Tinggi', lokal.tes.tinggi, 'cm'], ['Berat', lokal.tes.berat, 'kg'], ['BMI', lokal.tes.bmi, ''], ['Skor fisik', lokal.tes.persen, '%']].map(([l, v, s]) => (
                  <div key={l as string} className="rounded-lg p-2 bg-slate-900/40 text-center">
                    <div className="text-[9px] uppercase text-slate-500">{l}</div>
                    <div className="text-base font-black text-white tabular-nums">{v ?? '—'}<span className="text-[10px] text-slate-500 font-normal">{v != null ? s : ''}</span></div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {(lokal.tes.item ?? []).map((i: any) => (
                  <div key={i.no_urut}>
                    <div className="flex justify-between text-[11px]"><span className="text-slate-300">{i.item_tes}</span><span className="text-slate-500 tabular-nums">{i.hasil_nilai} {i.hasil_satuan} · {i.kategori ?? ''}</span></div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5"><div className="h-full rounded-full" style={{ width: `${Math.min(100, i.capaian_persen ?? 0)}%`, background: warnaPersen(i.capaian_persen ?? 0) }} /></div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-widest font-bold mb-1.5 text-amber-300">Saran tes khusus dayung (belum ada datanya)</div>
            <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc pl-4">{SARAN_TES.map(s => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>

        {/* Manajemen */}
        <div className="rounded-2xl p-5" style={kartu}>
          <Judul icon={ClipboardList} teks="Manajemen Atlet" warna="#a78bfa" />
          {!lokal ? <div className="text-xs text-slate-500">Belum ada data dari kontingen.</div> : (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">BPJS Ketenagakerjaan</span><span className={lokal.bpjs ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{lokal.bpjs ? `ada${lokal.bpjs_berlaku ? ` · berlaku ${lokal.bpjs_berlaku}` : ''}` : 'belum ada'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Dokumen</span><span className="text-slate-300">{lokal.jumlah_dokumen ? (lokal.dokumen ?? []).map((x: any) => x.nama).join(', ') : <span className="text-slate-500">belum ada</span>}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Ukuran perlengkapan</span><span className="text-slate-300">{lokal.perlengkapan ? Object.entries(lokal.perlengkapan).filter(([k, v]) => v && k.startsWith('ukuran_')).map(([k, v]) => `${k.replace('ukuran_', '').replace('_', ' ')} ${v}`).join(' · ') || '—' : <span className="text-slate-500">belum ada</span>}</span></div>
              <div>
                <div className="text-slate-400 mb-1 flex items-center gap-1"><Medal size={12} /> Riwayat prestasi</div>
                {(lokal.riwayat ?? []).length === 0 ? <div className="text-slate-500">belum ada</div> : (lokal.riwayat as any[]).map((r, i) => (
                  <div key={i} className="text-slate-300">{r.tahun ?? ''} · {r.event} {r.nomor_tanding ? `· ${r.nomor_tanding}` : ''} <b className="text-amber-300">{r.hasil}</b></div>
                ))}
              </div>
              {(lokal.target ?? []).length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <div className="text-slate-400 mb-1 flex items-center gap-1"><Target size={12} /> Target kontingen</div>
                  {(lokal.target as any[]).map((t, i) => (
                    <div key={i} className="text-slate-300 mb-1">
                      <b className="capitalize text-amber-300">{t.target_medali}</b>{t.capaian_catatan ? ` · ${t.capaian_catatan}` : ''}
                      {t.pesaing && <div className="text-[11px] text-slate-500">Pesaing: {t.pesaing}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="text-[10px] text-slate-600 flex items-center gap-1"><Timer size={10} /> Hasil lomba: situs panitia PORPROV XV. Data lain: isian kontingen (contoh Kab. Bandung). Tanpa NIK, alamat, nomor kartu, atau rekening.</div>
    </div>
  )
}
