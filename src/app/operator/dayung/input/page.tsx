'use client'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Save, RefreshCw, Clock, Info } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function parseWaktu(s: string): number | null {
  s = s.trim()
  if (!s) return null
  const mmss = s.match(/^(\d+):(\d+)(?:\.(\d+))?$/)
  if (mmss) {
    const mins = parseInt(mmss[1])
    const secs = parseInt(mmss[2])
    const frac = mmss[3] ? parseFloat('0.' + mmss[3]) : 0
    return mins * 60 + secs + frac
  }
  const plain = parseFloat(s)
  return isNaN(plain) ? null : plain
}

function formatWaktu(seconds: number): string {
  if (!seconds || seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.round((seconds % 1) * 100)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
}

interface AtletRow {
  atlet_id: number
  nama_lengkap: string
  gender: string
  kontingen_id: number
  kontingen_nama: string
  status_registrasi: string
  waktu_raw: string
  waktu_seconds: number | null
  existing_seconds: number | null
}

interface Nomor {
  id: number
  nama: string
  gender: 'L' | 'P'
}

export default function DayungInputPage() {
  const [me, setMe] = useState<any>(null)
  const meRef = useRef<any>(null)
  const [nomors, setNomors] = useState<Nomor[]>([])
  const [selectedNomor, setSelectedNomor] = useState<number | null>(null)
  const [genderFilter, setGenderFilter] = useState<'L' | 'P'>('L')
  const [rows, setRows] = useState<AtletRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = useCallback(async (nomorId?: number) => {
    try {
      setLoading(true)
      if (!meRef.current) {
        const meData = await fetch('/api/auth/me').then(r => r.json())
        meRef.current = meData
        setMe(meData)
      }
      const cabor_id = meRef.current?.cabor_id
      if (!cabor_id) return

      const { data: nomorList } = await supabase
        .from('nomor_pertandingan')
        .select('id, nama, gender')
        .eq('cabor_id', cabor_id)
        .order('gender')
        .order('nama')
      setNomors((nomorList ?? []) as Nomor[])

      const activeNomor = nomorId ?? selectedNomor ?? nomorList?.[0]?.id ?? null
      if (!selectedNomor && nomorList?.[0]) {
        setSelectedNomor(nomorList[0].id)
        setGenderFilter(nomorList[0].gender as 'L' | 'P')
      }

      if (!activeNomor) return

      // Ambil atlet yang lineup ke nomor ini
      const { data: lineup } = await supabase
        .from('kualifikasi_atlet')
        .select('atlet_id, atlet(id, nama_lengkap, gender, kontingen_id, status_registrasi, kontingen(nama))')
        .eq('nomor_id', activeNomor)
        .neq('status', 'Dibatalkan')

      // Ambil hasil yang sudah ada
      const { data: hasil } = await supabase
        .from('hasil_pertandingan')
        .select('atlet_id, nilai')
        .eq('nomor_id', activeNomor)

      const hasilMap: Record<number, number> = {}
      hasil?.forEach(h => { hasilMap[h.atlet_id] = h.nilai ?? 0 })

      const newRows: AtletRow[] = (lineup ?? []).map(l => {
        const atlet = l.atlet as any
        if (!atlet) return null
        const existingSec = hasilMap[l.atlet_id] ?? null
        return {
          atlet_id: l.atlet_id,
          nama_lengkap: atlet.nama_lengkap,
          gender: atlet.gender,
          kontingen_id: atlet.kontingen_id,
          kontingen_nama: atlet.kontingen?.nama ?? '-',
          status_registrasi: atlet.status_registrasi ?? 'Draft',
          waktu_raw: existingSec ? formatWaktu(existingSec) : '',
          waktu_seconds: existingSec,
          existing_seconds: existingSec,
        }
      }).filter(Boolean) as AtletRow[]

      setRows(newRows)
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedNomor])

  useEffect(() => { loadData() }, [])

  const handleNomorChange = (nomorId: number) => {
    setSelectedNomor(nomorId)
    const nomor = nomors.find(n => n.id === nomorId)
    if (nomor) setGenderFilter(nomor.gender as 'L' | 'P')
    loadData(nomorId)
  }

  const updateWaktu = (atletId: number, val: string) => {
    setRows(prev => prev.map(r => {
      if (r.atlet_id !== atletId) return r
      const seconds = parseWaktu(val)
      return { ...r, waktu_raw: val, waktu_seconds: seconds }
    }))
  }

  const rankedRows = useMemo(() => {
    const withTime = rows.filter(r => r.waktu_seconds !== null && r.waktu_seconds > 0)
    const sorted = [...withTime].sort((a, b) => (a.waktu_seconds ?? 9999) - (b.waktu_seconds ?? 9999))
    const ranked = sorted.map((r, i) => ({ ...r, rank: i + 1, autoMedali: i < 3 ? (['emas', 'perak', 'perunggu'][i]) : 'none' }))
    const noTime = rows.filter(r => !r.waktu_seconds || r.waktu_seconds <= 0).map(r => ({ ...r, rank: null, autoMedali: 'none' }))
    return [...ranked, ...noTime]
  }, [rows])

  const handleSave = async () => {
    if (!selectedNomor) { showToast('Pilih nomor pertandingan dulu', 'error'); return }
    setSaving(true)
    try {
      const toUpsert = rankedRows
        .filter(r => r.waktu_seconds !== null && r.waktu_seconds > 0)
        .map(r => ({
          nomor_id: selectedNomor,
          atlet_id: r.atlet_id,
          kontingen_id: r.kontingen_id,
          nilai: r.waktu_seconds!,
          medali: r.status_registrasi === 'Verified' ? (r as any).autoMedali : 'none',
          ranking: (r as any).rank ?? null,
          diinput_oleh: meRef.current?.id,
          cabor_id: meRef.current?.cabor_id,
        }))

      if (toUpsert.length === 0) {
        showToast('Tidak ada waktu yang diinput', 'error')
        return
      }
      const res = await fetch('/api/operator/hasil', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: toUpsert }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out?.error || 'Gagal simpan hasil')
      showToast(`✅ ${toUpsert.length} hasil tersimpan · Rank 1 = waktu tercepat`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const nomorsByGender = nomors.filter(n => n.gender === genderFilter)
  const selectedNomorNama = nomors.find(n => n.id === selectedNomor)?.nama ?? ''

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Input Waktu Dayung</h1>
          <p className="text-slate-500 text-xs mt-1">
            Input finish time → auto-rank ascending (waktu tercepat = Rank 1)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData(selectedNomor ?? undefined)} disabled={loading}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-all">
            <RefreshCw size={12} /> Reload
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-900 font-semibold text-xs px-4 py-2 rounded-lg transition-all">
            {saving
              ? <div className="w-3 h-3 border border-slate-900 border-t-transparent rounded-full animate-spin" />
              : <Save size={13} />}
            Simpan Semua
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-xs ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>{toast.msg}</div>
      )}

      {/* Nomor Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5">
        <div className="text-slate-400 text-[10px] uppercase tracking-wider font-medium mb-3">Pilih Nomor Pertandingan</div>
        <div className="flex items-center gap-3 flex-wrap">
          {(['L', 'P'] as const).map(g => (
            <button key={g} onClick={() => {
              setGenderFilter(g)
              const first = nomors.find(n => n.gender === g)
              if (first) handleNomorChange(first.id)
            }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                genderFilter === g
                  ? g === 'L' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                    : 'bg-pink-500/20 border border-pink-500/30 text-pink-400'
                  : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'
              }`}>
              {g === 'L' ? '👨 Putra' : '👩 Putri'}
            </button>
          ))}
          <div className="flex-1 min-w-60">
            <select
              value={selectedNomor ?? ''}
              onChange={e => handleNomorChange(Number(e.target.value))}
              className="w-full bg-slate-800 border border-sky-500/30 rounded-lg px-3 py-2 text-xs text-sky-300 focus:outline-none focus:border-sky-500">
              <option value="">-- Pilih Nomor --</option>
              {nomorsByGender.map(n => (
                <option key={n.id} value={n.id}>{n.nama}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedNomorNama && (
          <div className="mt-2 text-[11px] text-sky-400/70">
            Nomor: <span className="font-medium text-sky-300">{selectedNomorNama}</span>
            <span className="text-slate-600 mx-2">·</span>
            <span className="text-slate-500">{rows.length} atlet terdaftar</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mb-4 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed space-y-0.5">
          <div><span className="text-slate-200 font-medium">Format waktu</span>: <code className="text-sky-400">mm:ss.cc</code> contoh <code className="text-sky-400">04:32.55</code> · atau plain detik misal <code className="text-sky-400">272.55</code></div>
          <div className="text-amber-400/80"><span className="font-medium">Ranking</span>: waktu tercepat (terkecil) = Rank 1. Medali otomatis untuk atlet <span className="text-emerald-400">Verified</span>.</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/40">
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-4 py-3 sticky left-0 bg-slate-800/40 z-10">Atlet</th>
                <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Status</th>
                <th className="text-center text-sky-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Input Waktu</th>
                <th className="text-center text-sky-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Detik</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Tersimpan</th>
                <th className="text-center text-sky-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3 border-l border-slate-700">Rank</th>
                <th className="text-center text-sky-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3">Medali</th>
              </tr>
            </thead>
            <tbody>
              {rankedRows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-slate-600">
                  {selectedNomor ? 'Belum ada atlet di lineup nomor ini. Daftarkan dulu di halaman Lineup.' : 'Pilih nomor pertandingan'}
                </td></tr>
              ) : rankedRows.map(row => (
                <tr key={row.atlet_id} className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors ${row.status_registrasi !== 'Verified' ? 'opacity-75' : ''}`}>
                  <td className="px-4 py-2 text-slate-200 font-medium sticky left-0 bg-slate-900 z-10">
                    {row.nama_lengkap}
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">{row.kontingen_nama}</div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={row.status_registrasi} /></td>
                  <td className="px-2 py-2">
                    <div className="relative">
                      <Clock size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={row.waktu_raw}
                        onChange={e => updateWaktu(row.atlet_id, e.target.value)}
                        placeholder="04:32.55"
                        className="w-28 bg-slate-800 border border-slate-700 rounded pl-7 pr-2 py-1.5 text-center text-xs text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20" />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-mono text-xs ${row.waktu_seconds ? 'text-sky-300' : 'text-slate-700'}`}>
                      {row.waktu_seconds ? row.waktu_seconds.toFixed(2) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] font-mono ${row.existing_seconds ? 'text-slate-400' : 'text-slate-700'}`}>
                      {row.existing_seconds ? formatWaktu(row.existing_seconds) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center border-l border-slate-800">
                    {(row as any).rank ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                        (row as any).rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : (row as any).rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                        : (row as any).rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                        : 'text-slate-500'
                      }`}>{(row as any).rank}</span>
                    ) : <span className="text-slate-700">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {(row as any).autoMedali === 'emas'     && <span className="text-yellow-400">🥇</span>}
                    {(row as any).autoMedali === 'perak'    && <span className="text-slate-300">🥈</span>}
                    {(row as any).autoMedali === 'perunggu' && <span className="text-amber-600">🥉</span>}
                    {(row as any).autoMedali === 'none'     && <span className="text-slate-700">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-800 px-5 py-3 bg-slate-800/20 text-xs text-slate-400 flex items-center justify-between">
          <div>
            <Clock size={12} className="inline mr-1.5 text-sky-400" />
            Rank ascending · waktu tercepat = Rank 1 · Hanya <span className="text-emerald-400 font-medium">Verified</span> yang dapat medali otomatis
          </div>
          <div className="text-slate-500">
            {rankedRows.filter(r => r.waktu_seconds && r.waktu_seconds > 0).length} / {rankedRows.length} atlet ter-input
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    'Verified':      { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', label: '✓ Verified' },
    'Menunggu Admin':{ bg: 'bg-amber-500/15  text-amber-400  border-amber-500/20',  label: '⏳ Menunggu' },
    'Posted':        { bg: 'bg-blue-500/15   text-blue-400   border-blue-500/20',   label: '📤 Posted' },
    'Ditolak Admin': { bg: 'bg-red-500/15    text-red-400    border-red-500/20',    label: '✗ Ditolak' },
    'Draft':         { bg: 'bg-slate-500/15  text-slate-400  border-slate-500/20',  label: 'Draft' },
  }
  const c = config[status] ?? config['Draft']
  return <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${c.bg}`}>{c.label}</span>
}
