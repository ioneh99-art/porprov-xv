'use client'
// src/app/konida/Premiumreport/kabbandung/bupati/page.tsx
// KBAAS Fase 3.9 — Laporan Kuartalan Bupati (print-friendly executive summary).

import { useEffect, useState } from 'react'
import { Printer, Building2, Trophy, Target, RefreshCw } from 'lucide-react'

const medalIcon = (m: string) => m === 'EMAS' ? '🥇' : m === 'PERAK' ? '🥈' : '🥉'

export default function BupatiReportPage() {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => { setLoading(true); const r = await fetch('/api/konida/bupati-report').then(x => x.json()).catch(() => null); setD(r); setLoading(false) }
  useEffect(() => { load() }, [])

  if (loading) return <div className="py-20 text-center text-slate-500 text-sm">Menyusun laporan…</div>
  if (!d || d.error) return <div className="py-20 text-center text-red-500 text-sm">Gagal memuat laporan.</div>

  const totalProj = (d.projection.emas + d.projection.perak + d.projection.perunggu).toFixed(1)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toolbar (hidden saat print) */}
      <div className="flex items-center justify-between mb-5 print:hidden">
        <div className="flex items-center gap-2 text-slate-400 text-sm"><Building2 size={16} /> Laporan Kuartalan Bupati · {d.quarter}</div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-700 text-slate-300"><RefreshCw size={13} /> Refresh</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#075985' }}><Printer size={13} /> Cetak / PDF</button>
        </div>
      </div>

      {/* Dokumen */}
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-10 print:shadow-none print:p-0">
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">Laporan Kuartalan</div>
          <h1 className="text-2xl font-black mt-1">KONI KABUPATEN BANDUNG</h1>
          <div className="text-sm text-slate-600 mt-1">Executive Summary · {d.quarter} · PORPROV XV Jawa Barat 2026</div>
        </div>

        {/* 1. Snapshot */}
        <section className="mb-7">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 border-l-4 border-sky-700 pl-2 mb-3">1. Snapshot Kuartal</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Total Atlet', v: d.totals.atlet.toLocaleString('id-ID') },
              { l: 'Cabang Olahraga', v: d.totals.cabor },
              { l: 'Medali Nasional', v: `${d.medalCount.emas}🥇 ${d.medalCount.perak}🥈 ${d.medalCount.perunggu}🥉` },
              { l: 'Atlet Prob. Emas ≥50%', v: d.projection.highEmas },
            ].map(k => (
              <div key={k.l} className="rounded-lg border border-slate-200 p-3 text-center">
                <div className="text-lg font-black text-slate-800">{k.v}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{k.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Atlet Andalan */}
        <section className="mb-7">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 border-l-4 border-amber-500 pl-2 mb-3 flex items-center gap-2"><Trophy size={14} /> 2. Atlet Andalan</h2>
          {d.andalan.length === 0 ? <p className="text-sm text-slate-500 italic">Belum ada atlet andalan dengan medali nasional pada periode ini.</p> : (
            <div className="space-y-3">
              {d.andalan.map((a: any, i: number) => (
                <div key={i} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-black text-slate-900">{medalIcon(a.medal)} {a.nama.toUpperCase()}</span>
                    <span className="text-xs text-slate-500">{a.cabor} · {a.umur ?? '?'} thn</span>
                  </div>
                  <div className="text-sm text-slate-700 mt-1 font-semibold">{a.medal} {a.nomor} {a.kategori} {a.gender === 'Pi' ? 'Putri' : 'Putra'} — <span className="font-mono">{a.mark}</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">{a.event} · {a.venue} · {new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  {a.rekornas && <div className="text-[11px] text-slate-400 mt-0.5">Rekornas referensi: {a.rekornas} ({a.rekornas_holder})</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. Proyeksi PORPROV */}
        <section className="mb-7">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 border-l-4 border-sky-700 pl-2 mb-3 flex items-center gap-2"><Target size={14} /> 3. Proyeksi PORPROV XV</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Berdasarkan baseline performance dan data kejurnas terbaru, sistem memproyeksikan kontingen Kabupaten Bandung meraih sekitar
            <b> {d.projection.emas} EMAS, {d.projection.perak} PERAK, dan {d.projection.perunggu} PERUNGGU</b> (total <b>{totalProj} medali</b>) pada PORPROV XV Jawa Barat 2026.
          </p>
        </section>

        {/* 4. Rekomendasi */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 border-l-4 border-slate-700 pl-2 mb-3">4. Rekomendasi</h2>
          <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
            {d.andalan.length > 0 && <li>Leverage exposure media untuk {d.andalan.length} atlet andalan — perkuat brand value pembinaan KONI Kab. Bandung.</li>}
            <li>Intensifikasi pembinaan cabor unggulan untuk menaikkan proyeksi EMAS PORPROV.</li>
            <li>Refresh data baseline & tes fisik berkala untuk akurasi prediksi.</li>
            <li>Program akselerasi atlet TIER-2 berpotensi naik ke TIER-1.</li>
          </ul>
        </section>

        <div className="text-center text-[10px] text-slate-400 mt-8 pt-4 border-t border-slate-200">
          Di-generate otomatis oleh sistem PORPROV XV · {new Date(d.generated_at).toLocaleString('id-ID')}
        </div>
      </div>
    </div>
  )
}
