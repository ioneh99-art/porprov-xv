'use client'
// HasilResmiPorprov — bagian "Hasil resmi PORPROV XV" di halaman atlet Kejuaraan (KONIDA).
// Sumber: arsip situs panitia (tabel porprov15_*), ditautkan ke atlet kita lewat
// porprov15_atlet.atlet_id (nama sama di kontingen yang sama). Semua laga atlet itu:
// lawan, skor/waktu/nilai, babak, menang/kalah/peringkat, dan medali resmi.

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ShieldCheck, ExternalLink, Swords, Timer } from 'lucide-react'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const SITUS = 'https://porprov.konijabar.or.id'
const WARNA: Record<string, string> = { emas: '#ffd700', perak: '#c0c0c0', perunggu: '#cd7f32' }
const tglPendek = (t: string | null) => t ? new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'

interface AtletSitus { situs_id: number; slug: string; nama: string; kontingen: string | null; kontingen_situs_id: number | null; cabor: string | null; disiplin: string | null; emas: number; perak: number; perunggu: number }
interface Baris {
  ref: number; tanggal: string | null; jam: string | null; nomor: string | null; babak: string | null; kode: string | null
  bentuk: string; selesai: boolean; final: boolean
  saya: { sisi: string | null; menang: boolean | null; skor: number | null; peringkat: number | null; medali: string | null; nilai: string | null; rekan: string[] }
  lawan: { kontingen: string; skor: number | null; atlet: string[] }[]
  jumlah: number
}

export function HasilResmiPorprov({ atletId, accent }: { atletId: number; accent: string }) {
  const [atlet, setAtlet] = useState<AtletSitus | null | undefined>(undefined)
  const [baris, setBaris] = useState<Baris[]>([])
  const [medali, setMedali] = useState<{ medali: string; nomor: string }[]>([])

  useEffect(() => {
    let batal = false
    ;(async () => {
      const { data: a } = await sb.from('porprov15_atlet')
        .select('situs_id, slug, nama, kontingen, kontingen_situs_id, cabor, disiplin, emas, perak, perunggu').eq('atlet_id', atletId).limit(1)
      const at = (a?.[0] ?? null) as AtletSitus | null
      if (batal) return
      setAtlet(at)
      if (!at) return
      const [{ data: pes }, { data: med }] = await Promise.all([
        sb.from('porprov15_laga_peserta').select('laga_ref, urutan, sisi, kontingen_situs_id, menang, skor, peringkat, medali, nilai, atlet_situs_ids, atlet_nama').contains('atlet_situs_ids', [at.situs_id]),
        sb.from('porprov15_medali').select('medali, porprov15_nomor(nama, disiplin)').contains('atlet_situs_ids', [at.situs_id]),
      ])
      const refs = Array.from(new Set((pes ?? []).map((p: any) => p.laga_ref)))
      const [{ data: laga }, { data: semua }] = refs.length ? await Promise.all([
        sb.from('porprov15_laga').select('ref, tanggal, jam, nomor, babak, kode, bentuk, selesai, perebutan_medali').in('ref', refs),
        sb.from('porprov15_laga_peserta').select('laga_ref, urutan, kontingen, kontingen_situs_id, skor, atlet_nama').in('laga_ref', refs),
      ]) : [{ data: [] }, { data: [] }] as any
      if (batal) return
      const hasil: Baris[] = (pes ?? []).map((p: any) => {
        const l = (laga ?? []).find((x: any) => x.ref === p.laga_ref) ?? {}
        const lain = (semua ?? []).filter((x: any) => x.laga_ref === p.laga_ref && x.urutan !== p.urutan)
        return {
          ref: p.laga_ref, tanggal: l.tanggal ?? null, jam: l.jam ?? null, nomor: l.nomor ?? null, babak: l.babak ?? null, kode: l.kode ?? null,
          bentuk: l.bentuk ?? 'kosong', selesai: !!l.selesai, final: !!l.perebutan_medali,
          saya: {
            sisi: p.sisi, menang: p.menang, skor: p.skor, peringkat: p.peringkat, medali: p.medali, nilai: p.nilai,
            rekan: (p.atlet_nama ?? []).filter((_: string, i: number) => p.atlet_situs_ids?.[i] !== at.situs_id),
          },
          lawan: lain.map((x: any) => ({ kontingen: x.kontingen, skor: x.skor, atlet: x.atlet_nama ?? [] })),
          jumlah: lain.length + 1,
        }
      }).sort((x, y) => `${x.tanggal ?? ''} ${x.jam ?? ''}`.localeCompare(`${y.tanggal ?? ''} ${y.jam ?? ''}`))
      setBaris(hasil)
      setMedali((med ?? []).map((m: any) => ({ medali: m.medali, nomor: [m.porprov15_nomor?.disiplin, m.porprov15_nomor?.nama].filter(Boolean).join(' · ') })))
    })()
    return () => { batal = true }
  }, [atletId])

  const ringkas = useMemo(() => ({
    laga: baris.length,
    menang: baris.filter(b => b.saya.menang === true).length,
    kalah: baris.filter(b => b.bentuk === 'duel' && b.selesai && b.saya.menang === false).length,
  }), [baris])

  if (atlet === undefined) return null
  return (
    <div className="rounded-2xl p-5 bg-slate-900/70 border border-slate-800 mb-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} style={{ color: accent }} />
          <h3 className="text-sm font-bold text-white">Hasil resmi PORPROV XV</h3>
          <span className="text-[10px] text-slate-500">sumber: situs panitia porprov.konijabar.or.id</span>
        </div>
        {atlet && <a href={`${SITUS}/atlet/${atlet.slug}`} target="_blank" rel="noopener" className="text-[10px] inline-flex items-center gap-1 text-sky-400 hover:underline">Halaman resmi <ExternalLink size={10} /></a>}
      </div>

      {!atlet ? (
        <div className="text-xs text-amber-300/90">Atlet ini tidak ditemukan di daftar atlet resmi panitia (nama di kontingen yang sama tidak cocok, atau tidak terdaftar bertanding).</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-3">
            {(['emas', 'perak', 'perunggu'] as const).map(m => (
              <div key={m} className="rounded-xl px-3 py-2 bg-slate-800/60 border border-slate-700/60 text-center min-w-[70px]">
                <div className="text-xl font-black tabular-nums" style={{ color: WARNA[m] }}>{atlet[m]}</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500">{m}</div>
              </div>
            ))}
            <div className="rounded-xl px-3 py-2 bg-slate-800/60 border border-slate-700/60 text-center min-w-[70px]">
              <div className="text-xl font-black tabular-nums text-white">{ringkas.laga}</div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500">laga</div>
            </div>
            {(ringkas.menang + ringkas.kalah) > 0 && (
              <div className="rounded-xl px-3 py-2 bg-slate-800/60 border border-slate-700/60 text-center min-w-[90px]">
                <div className="text-xl font-black tabular-nums text-white">{ringkas.menang}<span className="text-slate-500">–{ringkas.kalah}</span></div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500">menang–kalah</div>
              </div>
            )}
            <div className="text-[11px] text-slate-400 self-center">{atlet.cabor}{atlet.disiplin ? ` · ${atlet.disiplin}` : ''} · {atlet.kontingen}</div>
          </div>

          {medali.length > 0 && (
            <div className="mb-3 space-y-1">
              {medali.map((m, i) => (
                <div key={i} className="text-xs flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase w-16" style={{ color: WARNA[m.medali] }}>{m.medali}</span>
                  <span className="text-slate-200">{m.nomor}</span>
                </div>
              ))}
            </div>
          )}

          {baris.length === 0 ? <div className="text-xs text-slate-500">Tidak ada laga yang mencantumkan atlet ini di situs panitia.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="text-left py-2">Tanggal</th><th className="text-left">Nomor · babak</th><th className="text-left">Lawan / peserta</th>
                  <th className="text-right">Skor / hasil</th><th className="text-right pl-2">Keterangan</th>
                </tr></thead>
                <tbody>
                  {baris.map(b => (
                    <tr key={b.ref} className="border-b border-slate-800/60 align-top">
                      <td className="py-2 text-slate-500 whitespace-nowrap">{tglPendek(b.tanggal)} {b.jam ?? ''}</td>
                      <td className="text-slate-200 pr-2">
                        {b.nomor}<div className="text-[10px] text-slate-500">{b.babak}{b.kode ? ` (${b.kode})` : ''}{b.final ? ' · perebutan medali' : ''}</div>
                        {b.saya.rekan.length > 0 && <div className="text-[10px] text-slate-500">bersama {b.saya.rekan.join(', ')}</div>}
                      </td>
                      <td className="text-slate-400 pr-2">
                        {b.bentuk === 'duel'
                          ? b.lawan.map((l, i) => <div key={i} className="flex items-center gap-1"><Swords size={10} className="text-slate-600" />{l.kontingen}{l.atlet.length ? <span className="text-slate-600"> · {l.atlet.join(', ')}</span> : null}</div>)
                          : <span className="flex items-center gap-1"><Timer size={10} className="text-slate-600" />{b.jumlah} peserta</span>}
                      </td>
                      <td className="text-right font-mono whitespace-nowrap">
                        {b.bentuk === 'duel'
                          ? (b.saya.skor != null ? <span className={b.saya.menang ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{b.saya.skor}–{b.lawan[0]?.skor ?? '?'}</span> : <span className="text-slate-600">—</span>)
                          : <span className="text-sky-300">{b.saya.nilai ?? '—'}</span>}
                      </td>
                      <td className="text-right pl-2 whitespace-nowrap">
                        {b.saya.medali ? <span className="font-black uppercase text-[10px]" style={{ color: WARNA[b.saya.medali] }}>{b.saya.medali}</span>
                          : b.bentuk === 'duel' ? (b.selesai ? <span className={b.saya.menang ? 'text-emerald-400' : 'text-slate-500'}>{b.saya.menang ? 'Menang' : 'Kalah'}</span> : <span className="text-slate-600">belum</span>)
                          : b.saya.peringkat ? <span className="text-slate-300">peringkat {b.saya.peringkat}/{b.jumlah}</span> : <span className="text-slate-600">{b.selesai ? '—' : 'belum'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
