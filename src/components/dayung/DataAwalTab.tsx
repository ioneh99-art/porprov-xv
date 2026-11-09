'use client'
// src/components/dayung/DataAwalTab.tsx
// Tab "Data Awal Se-Jabar" di Data Gateway Dayung (PODSI Jabar): isi tanggal lahir &
// pengukuran berkala (postur, ergometer, kekuatan) per kontingen — langsung di tabel
// atau lewat template Excel. Data yang sudah ada tidak ditimpa: tanggal lahir dari
// Data Atlet dan tinggi/berat dari Tes Biomotorik tampil sebagai nilai terakhir.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Save, Download, Upload, RefreshCw, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { muatJabar, labelDisiplin, type JabarAtlet } from '@/lib/sport-plugins/dayung/jabar-data'
import { ITEM_UKUR, KOLOM_TEMPLATE, bacaBarisTemplate, bacaNilai, gabungDataAwal, tampilNilai } from '@/lib/dayung-data-awal'

const ACCENT = '#38bdf8'
const kartu = { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }
const hariIni = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10) // WIB
const tglPendek = (t?: string) => (t ? `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(2, 4)}` : '')

type Isian = { tgl_lahir?: string; nilai: Record<string, string> }

export default function DataAwalTab({ kontingenAwal, sorotAwal }: { kontingenAwal?: string; sorotAwal?: number }) {
  const [atlet, setAtlet] = useState<JabarAtlet[]>([])
  const [kontingen, setKontingen] = useState(kontingenAwal ?? '')
  const [server, setServer] = useState<{ isian: Record<number, any>; pengukuran: Record<number, any[]>; lokal: Record<number, any> }>({ isian: {}, pengukuran: {}, lokal: {} })
  const [isian, setIsian] = useState<Record<number, Isian>>({})
  const [tanggal, setTanggal] = useState(hariIni())
  const [memuat, setMemuat] = useState(false)
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'galat'; teks: string; rinci?: string[] } | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { muatJabar().then(d => setAtlet(d.atlet)) }, [])

  const daftarKontingen = useMemo(() => {
    const n = new Map<string, number>()
    atlet.forEach(a => n.set(a.kontingen, (n.get(a.kontingen) ?? 0) + 1))
    return Array.from(n.entries()).sort((a, b) => b[1] - a[1])
  }, [atlet])
  useEffect(() => { if (!kontingen && daftarKontingen[0]) setKontingen(daftarKontingen[0][0]) }, [daftarKontingen, kontingen])

  const baris = useMemo(() => atlet.filter(a => a.kontingen === kontingen).sort((a, b) => a.nama.localeCompare(b.nama)), [atlet, kontingen])

  const muatServer = async (pertahankanPesan = false) => {
    if (!kontingen) return
    setMemuat(true)
    const r = await fetch(`/api/dayung/data-awal?kontingen=${encodeURIComponent(kontingen)}`).then(x => x.json()).catch(() => ({}))
    setServer({ isian: r.isian ?? {}, pengukuran: r.pengukuran ?? {}, lokal: r.lokal ?? {} })
    setIsian({}); if (!pertahankanPesan) setPesan(null); setMemuat(false)
  }
  useEffect(() => { muatServer() }, [kontingen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sorotAwal || !baris.length) return
    setTimeout(() => document.getElementById(`baris-${sorotAwal}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
  }, [sorotAwal, baris.length])

  const gabung = (id: number) => {
    const l = server.lokal[id]
    return gabungDataAwal({ tglLahirLokal: l?.tgl_lahir, tglLahirIsian: server.isian[id]?.tgl_lahir, tesFisik: l?.tes, pengukuran: server.pengukuran[id] })
  }

  const ubah = (id: number, o: Partial<Isian> & { item?: string; nilai1?: string }) => setIsian(s => {
    const cur = s[id] ?? { nilai: {} }
    const next: Isian = { ...cur, nilai: { ...cur.nilai } }
    if (o.tgl_lahir !== undefined) next.tgl_lahir = o.tgl_lahir
    if (o.item) next.nilai[o.item] = o.nilai1 ?? ''
    return { ...s, [id]: next }
  })

  const galatSel = (item: string, v?: string) => (v ? bacaNilai(item, v).galat : undefined)
  const berubah = Object.entries(isian).filter(([, v]) => v.tgl_lahir || Object.values(v.nilai).some(x => x.trim()))
  const adaGalat = berubah.some(([, v]) => Object.entries(v.nilai).some(([k, x]) => galatSel(k, x)))

  const simpan = async () => {
    setMenyimpan(true); setPesan(null)
    const payload = berubah.map(([id, v]) => ({
      situs_id: Number(id), tgl_lahir: v.tgl_lahir || undefined,
      nilai: Object.fromEntries(Object.entries(v.nilai).filter(([, x]) => x.trim())),
    }))
    const r = await fetch('/api/dayung/data-awal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tanggal, baris: payload }) })
    const j = await r.json().catch(() => ({}))
    setMenyimpan(false)
    if (!r.ok) { setPesan({ jenis: 'galat', teks: j.error ?? 'Gagal menyimpan.', rinci: j.galat }); return }
    setPesan({ jenis: 'ok', teks: `Tersimpan: ${j.ukuran} ukuran (tanggal ${tglPendek(tanggal)}), ${j.tgl_lahir} tanggal lahir.${j.tgl_lahir_dilewati ? ` ${j.tgl_lahir_dilewati} tanggal lahir dilewati karena sudah ada di Data Atlet.` : ''}` })
    await muatServer(true)
  }

  const unduhTemplate = async () => {
    const XLSX = await import('xlsx')
    const rows = baris.map(a => {
      const g = gabung(a.situs_id)
      return [a.situs_id, a.nama, a.kontingen, g.tglLahir ?? '', ...ITEM_UKUR.map(() => '')]
    })
    const petunjuk = ['(jangan ubah situs_id)', '', '', 'contoh 2004-05-17', ...ITEM_UKUR.map(i => i.waktu ? `${i.satuan === 'detik' ? 'm:ss.d, mis. 6:45.3' : ''}` : i.satuan)]
    const ws = XLSX.utils.aoa_to_sheet([KOLOM_TEMPLATE, petunjuk, ...rows])
    ws['!cols'] = KOLOM_TEMPLATE.map((k, i) => ({ wch: i === 1 ? 28 : i === 2 ? 18 : 14 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data Awal')
    XLSX.writeFile(wb, `DataAwal_Dayung_${kontingen.replace(/[^A-Za-z0-9]+/g, '_')}_${hariIni()}.xlsx`)
  }

  const unggah = async (f: File) => {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true })
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false, dateNF: 'yyyy-mm-dd' })
    const idKontingen = new Set(baris.map(a => a.situs_id))
    const baru: Record<number, Isian> = { ...isian }
    const galat: string[] = []
    let terisi = 0, luar = 0
    for (const r of rows) {
      const b = bacaBarisTemplate(r)
      if (!b) continue
      if (!idKontingen.has(b.situs_id)) { luar++; continue }
      b.galat.forEach(g => galat.push(`${r.nama || b.situs_id}: ${g}`))
      const cur = baru[b.situs_id] ?? { nilai: {} }
      const lokalTgl = server.lokal[b.situs_id]?.tgl_lahir
      baru[b.situs_id] = {
        tgl_lahir: b.tgl_lahir && !lokalTgl ? b.tgl_lahir : cur.tgl_lahir,
        nilai: { ...cur.nilai, ...Object.fromEntries(Object.keys(b.nilai).map(k => [k, String(r[k]).trim()])) },
      }
      if (b.tgl_lahir || Object.keys(b.nilai).length) terisi++
    }
    setIsian(baru)
    setPesan({
      jenis: galat.length ? 'galat' : 'ok',
      teks: `Excel dibaca: ${terisi} atlet terisi ke tabel${luar ? `, ${luar} baris bukan kontingen ini dilewati` : ''}. Periksa lalu tekan Simpan.`,
      rinci: galat.slice(0, 30),
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  const jmlTgl = baris.filter(a => gabung(a.situs_id).tglLahir).length
  const jmlKhusus = baris.filter(a => (server.pengukuran[a.situs_id] ?? []).some((p: any) => !['tinggi_badan', 'berat_badan', 'rentang_lengan', 'tinggi_duduk'].includes(p.item))).length

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 flex flex-wrap items-end gap-3" style={kartu}>
        <label className="text-[11px] text-slate-400">Kontingen
          <select value={kontingen} onChange={e => setKontingen(e.target.value)} className="block mt-1 px-2 py-2 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200 min-w-[200px]">
            {daftarKontingen.map(([k, n]) => <option key={k} value={k}>{k} ({n})</option>)}
          </select>
        </label>
        <label className="text-[11px] text-slate-400">Tanggal pengukuran
          <input type="date" value={tanggal} max={hariIni()} onChange={e => setTanggal(e.target.value)} className="block mt-1 px-2 py-1.5 rounded-lg text-xs bg-slate-900 border border-white/10 text-slate-200" />
        </label>
        <div className="flex gap-2 ml-auto flex-wrap">
          <button onClick={() => muatServer()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10"><RefreshCw size={12} className={memuat ? 'animate-spin' : ''} /> Muat ulang</button>
          <button onClick={unduhTemplate} disabled={!baris.length} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40"><Download size={12} /> Template Excel</button>
          <button onClick={() => fileRef.current?.click()} disabled={!baris.length} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40"><Upload size={12} /> Unggah Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) unggah(f) }} />
          <button onClick={simpan} disabled={!berubah.length || adaGalat || menyimpan} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-slate-900 disabled:opacity-40" style={{ background: ACCENT }}>
            <Save size={12} /> {menyimpan ? 'Menyimpan…' : `Simpan${berubah.length ? ` (${berubah.length} atlet)` : ''}`}
          </button>
        </div>
      </div>

      <div className="rounded-xl px-4 py-2.5 text-[11px] text-slate-400 flex gap-2" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
        <Info size={14} className="text-sky-400 shrink-0 mt-0.5" />
        <span>Kotak abu-abu = nilai terakhir yang sudah tersimpan; isi hanya yang baru. Setiap simpan dicatat dengan tanggal pengukuran, jadi isian pertama menjadi <b className="text-slate-200">titik nol</b> dan isian berikutnya menjadi perkembangan di Profil Atlet. Tanggal lahir yang sudah ada di Data Atlet tidak ditimpa; tinggi & berat dari Tes Biomotorik ikut tampil sebagai nilai terakhir.</span>
      </div>

      {pesan && (
        <div className={`rounded-xl px-4 py-2.5 text-xs ${pesan.jenis === 'ok' ? 'text-emerald-300' : 'text-amber-300'}`} style={{ background: pesan.jenis === 'ok' ? 'rgba(52,211,153,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${pesan.jenis === 'ok' ? 'rgba(52,211,153,0.25)' : 'rgba(245,158,11,0.3)'}` }}>
          <div className="flex items-center gap-1.5 font-bold">{pesan.jenis === 'ok' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}{pesan.teks}</div>
          {pesan.rinci && pesan.rinci.length > 0 && <ul className="mt-1 list-disc pl-5 space-y-0.5 font-normal">{pesan.rinci.map((g, i) => <li key={i}>{g}</li>)}</ul>}
        </div>
      )}

      <div className="rounded-2xl p-4" style={kartu}>
        <div className="text-[11px] text-slate-500 mb-2">{baris.length} atlet · {jmlTgl} sudah ada tanggal lahir · {jmlKhusus} sudah ada tes khusus dayung</div>
        <div className="overflow-x-auto">
          <table className="text-xs min-w-full">
            <thead><tr className="text-[9px] uppercase tracking-wider text-slate-500 border-b border-white/5">
              <th className="text-left py-2 pr-2 sticky left-0 bg-[#030d18] min-w-[180px]">Atlet</th>
              <th className="text-left px-1 min-w-[130px]">Tgl lahir</th>
              {ITEM_UKUR.map(i => <th key={i.kunci} className="text-left px-1 min-w-[78px]" title={`${i.label} (${i.waktu ? 'm:ss.d' : i.satuan})`}>{i.singkat}<div className="normal-case text-slate-600 font-normal">{i.waktu ? 'm:ss.d' : i.satuan}</div></th>)}
            </tr></thead>
            <tbody>
              {baris.map(a => {
                const g = gabung(a.situs_id)
                const v = isian[a.situs_id] ?? { nilai: {} }
                const lokalTgl = server.lokal[a.situs_id]?.tgl_lahir
                return (
                  <tr key={a.situs_id} id={`baris-${a.situs_id}`} className={`border-b border-white/5 ${sorotAwal === a.situs_id ? 'bg-sky-500/10' : ''}`}>
                    <td className="py-1.5 pr-2 sticky left-0 bg-[#030d18]">
                      <Link href={`/operator/dayung/profil/${a.situs_id}`} className="text-sky-300 hover:underline font-medium">{a.nama}</Link>
                      <div className="text-[10px] text-slate-500">{labelDisiplin(a.disiplin)} · {a.gender === 'L' ? 'Pa' : a.gender === 'P' ? 'Pi' : '—'}</div>
                    </td>
                    <td className="px-1">
                      {lokalTgl ? <div className="text-[11px] text-slate-300" title="Dari Data Atlet — ubah di sana">{lokalTgl}<div className="text-[9px] text-slate-600">dari Data Atlet</div></div>
                        : <input type="date" value={v.tgl_lahir ?? g.tglLahir ?? ''} onChange={e => ubah(a.situs_id, { tgl_lahir: e.target.value })}
                            className={`w-[124px] px-1.5 py-1 rounded-md text-[11px] bg-slate-900 border ${v.tgl_lahir ? 'border-sky-500/50' : 'border-white/10'} text-slate-200`} />}
                    </td>
                    {ITEM_UKUR.map(i => {
                      const isi = v.nilai[i.kunci] ?? ''
                      const t = g.terkini[i.kunci]
                      const gal = galatSel(i.kunci, isi)
                      return (
                        <td key={i.kunci} className="px-1">
                          <input value={isi} onChange={e => ubah(a.situs_id, { item: i.kunci, nilai1: e.target.value })} inputMode="decimal"
                            placeholder={t ? tampilNilai(i.kunci, t.nilai) : ''} title={gal ?? (t ? `Terakhir ${tampilNilai(i.kunci, t.nilai)} (${tglPendek(t.tanggal)}, ${t.sumber})` : i.label)}
                            className={`w-[74px] px-1.5 py-1 rounded-md font-mono text-[11px] bg-slate-900 border ${gal ? 'border-red-500' : isi ? 'border-sky-500/50' : 'border-white/10'} text-white placeholder:text-slate-600`} />
                          {t && <div className="text-[9px] text-slate-600 mt-0.5">{tglPendek(t.tanggal)}</div>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!baris.length && <div className="text-xs text-slate-500 py-4">Pilih kontingen.</div>}
        </div>
      </div>
    </div>
  )
}
