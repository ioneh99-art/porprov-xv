'use client'

// Impor massal ATURAN nomor (umur/tim) via Excel — konfigurasi tanpa ubah kode.
// Alur: Export template (data nomor sekarang) → isi kolom aturan → Upload → Terapkan.
import { useState } from 'react'
import { Download, Upload, CheckCircle, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react'

const HEADER = ['id', 'cabor', 'nomor', 'gender', 'usia_min', 'usia_maks', 'max_peserta_kontingen', 'max_nomor_per_atlet']
const RULE_KEYS = ['usia_min', 'usia_maks', 'max_peserta_kontingen', 'max_nomor_per_atlet']

function anonClient() {
  // dynamic supabase anon (baca nomor — SELECT publik).
  return import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!))
}

export default function AturanNomorPage() {
  const [busy, setBusy] = useState('')
  const [parsed, setParsed] = useState<any[]>([])
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<{ updated: number; skipped: any[] } | null>(null)
  const [err, setErr] = useState('')

  async function exportTemplate() {
    setBusy('export'); setErr('')
    try {
      const sb = await anonClient()
      let all: any[] = []
      for (let p = 0; ; p++) {
        const { data } = await sb.from('nomor_pertandingan')
          .select('id,nama,gender,usia_min,usia_maks,max_peserta_kontingen,max_nomor_per_atlet,cabang_olahraga(nama)')
          .order('id').range(p * 1000, (p + 1) * 1000 - 1)
        if (!data || data.length === 0) break
        all = all.concat(data); if (data.length < 1000) break
      }
      const XLSX = await import('xlsx')
      const rows = all.map((n: any) => [n.id, n.cabang_olahraga?.nama ?? '', n.nama, n.gender,
        n.usia_min ?? '', n.usia_maks ?? '', n.max_peserta_kontingen ?? '', n.max_nomor_per_atlet ?? ''])
      const ws = XLSX.utils.aoa_to_sheet([HEADER, ...rows])
      ws['!cols'] = HEADER.map((h, i) => ({ wch: i < 3 ? 26 : 16 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Aturan Nomor')
      XLSX.writeFile(wb, `Template_Aturan_Nomor_${all.length}.xlsx`)
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy('parse'); setErr(''); setResult(null); setFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as any[][]
      if (raw.length < 2) throw new Error('File kosong / hanya header')
      const head = (raw[0] as string[]).map(h => String(h).trim().toLowerCase())
      const idx = (k: string) => head.indexOf(k)
      if (idx('id') < 0) throw new Error('Kolom "id" wajib ada (pakai template export)')
      const out: any[] = []
      for (let i = 1; i < raw.length; i++) {
        const r = raw[i]; if (!r || r.every(c => c === '')) continue
        const row: any = { id: r[idx('id')] }
        if (!row.id) continue
        for (const k of RULE_KEYS) { const j = idx(k); if (j >= 0) row[k] = r[j] === '' ? '' : r[j] }
        // hanya kirim baris yg punya minimal 1 nilai aturan terisi (atau sengaja dikosongkan utk clear)
        out.push({ ...row, _cabor: r[idx('cabor')] ?? '', _nomor: r[idx('nomor')] ?? '' })
      }
      setParsed(out)
    } catch (e: any) { setErr(e.message); setParsed([]) } finally { setBusy('') }
  }

  async function apply() {
    setBusy('apply'); setErr('')
    try {
      const rows = parsed.map(({ _cabor, _nomor, ...r }) => r)
      const res = await fetch('/api/operator/nomor/rules-bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out?.error || 'Gagal menerapkan')
      setResult({ updated: out.updated ?? 0, skipped: out.skipped ?? [] })
      setParsed([])
    } catch (e: any) { setErr(e.message) } finally { setBusy('') }
  }

  const terisi = parsed.filter(p => RULE_KEYS.some(k => p[k] !== '' && p[k] != null)).length

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <FileSpreadsheet className="text-emerald-400" size={22} />
          <h1 className="text-xl font-light">Impor Aturan Nomor (Massal)</h1>
        </div>
        <p className="text-xs text-slate-500 mb-6">Atur umur & batas peserta ratusan nomor sekaligus lewat Excel — tanpa ubah program. Kosongkan sel = tanpa batas.</p>

        {err && <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">{err}</div>}

        {/* Langkah 1: export */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Langkah 1 — Ambil template</div>
          <p className="text-sm text-slate-400 mb-3">Unduh semua nomor beserta aturan saat ini. Isi kolom <b>usia_min, usia_maks, max_peserta_kontingen, max_nomor_per_atlet</b> sesuai juknis. Jangan ubah kolom <b>id</b>.</p>
          <button onClick={exportTemplate} disabled={busy === 'export'}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm px-4 py-2.5 rounded-xl">
            {busy === 'export' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export Template Excel
          </button>
        </div>

        {/* Langkah 2: upload */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Langkah 2 — Upload & terapkan</div>
          <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm px-4 py-2.5 rounded-xl cursor-pointer w-fit">
            {busy === 'parse' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Pilih File Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          </label>
          {fileName && <div className="text-xs text-slate-500 mt-2">{fileName} · {parsed.length} baris · {terisi} punya aturan terisi</div>}

          {parsed.length > 0 && (
            <div className="mt-4">
              <div className="max-h-64 overflow-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase text-slate-500 bg-slate-900 sticky top-0"><tr>
                    <th className="text-left px-3 py-2">Nomor</th><th className="px-3 py-2">Umur</th><th className="px-3 py-2">Maks/Kont</th><th className="px-3 py-2">Maks/Atlet</th>
                  </tr></thead>
                  <tbody>
                    {parsed.slice(0, 200).map((p, i) => (
                      <tr key={i} className="border-t border-slate-800/50">
                        <td className="px-3 py-1.5 text-slate-400">{p._cabor} · {p._nomor}</td>
                        <td className="px-3 py-1.5 text-center text-slate-300">{p.usia_min || '–'}{(p.usia_min || p.usia_maks) ? ' s/d ' : ''}{p.usia_maks || (p.usia_min ? '∞' : '–')}</td>
                        <td className="px-3 py-1.5 text-center text-slate-300">{p.max_peserta_kontingen || '–'}</td>
                        <td className="px-3 py-1.5 text-center text-slate-300">{p.max_nomor_per_atlet || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.length > 200 && <div className="text-[11px] text-slate-600 mt-1">…{parsed.length - 200} baris lagi (semua akan diterapkan)</div>}
              <button onClick={apply} disabled={busy === 'apply'}
                className="mt-3 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl">
                {busy === 'apply' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Terapkan {parsed.length} baris
              </button>
            </div>
          )}
        </div>

        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm mb-2"><CheckCircle size={16} /> Selesai</div>
            <div className="text-sm text-slate-300">{result.updated} nomor diperbarui{result.skipped.length ? `, ${result.skipped.length} dilewati` : ''}.</div>
            {result.skipped.length > 0 && (
              <div className="mt-2 text-xs text-amber-300/80 space-y-0.5">
                {result.skipped.slice(0, 20).map((s, i) => <div key={i}><AlertTriangle size={11} className="inline mr-1" />id {s.id}: {s.reason}</div>)}
                {result.skipped.length > 20 && <div>…{result.skipped.length - 20} lagi</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
