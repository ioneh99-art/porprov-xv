'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Save, Trophy, Info, RefreshCw } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import {
  calculatePentathlonTotal,
  parseTime,
  loadUIPMBaselines,
  DEFAULT_UIPM_BASELINES,
  type PentathlonRawScore,
  type PentathlonPointsBreakdown,
  type UIPMBaselines,
} from '@/lib/pentathlon-scoring'
import { usePentathlonRealtime, RealtimeStatusBadge } from '@/hooks/usePentathlonRealtime'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AtletRow {
  id: number
  nama_lengkap: string
  gender: string
  kontingen_id: number
  kontingen_nama: string
  status_registrasi: string
  fencing_wins: string
  fencing_total: string
  swimming_time: string
  obstacle_time: string
  laser_run_time: string
  points: PentathlonPointsBreakdown
}

interface NomorMapping {
  individual?: number
  fencing?: number
  swimming?: number
  obstacle?: number
  laser_run?: number
}

export default function PentathlonInputPage() {
  const [me, setMe] = useState<any>(null)
  const [rows, setRows] = useState<AtletRow[]>([])
  const [baselines, setBaselines] = useState<UIPMBaselines>(DEFAULT_UIPM_BASELINES)
  const [genderFilter, setGenderFilter] = useState<'L' | 'P'>('L')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Verified' | 'Menunggu Admin' | 'Posted'>('all')
  const [nomorMap, setNomorMap] = useState<{ L: NomorMapping; P: NomorMapping }>({ L: {}, P: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const meData = me ?? await fetch('/api/auth/me').then(r => r.json())
      if (!me) setMe(meData)
      const cabor_id = meData?.cabor_id
      if (!cabor_id) return

      // Load baselines dari DB (editable lewat settings)
      const loaded = await loadUIPMBaselines()
      setBaselines(loaded)

      const { data: nomorList } = await supabase
        .from('nomor_pertandingan').select('id, nama, gender').eq('cabor_id', cabor_id)

      const mapping: { L: NomorMapping; P: NomorMapping } = { L: {}, P: {} }
      nomorList?.forEach(n => {
        const g = n.gender as 'L' | 'P'
        if (g !== 'L' && g !== 'P') return
        if (n.nama.includes('Individual')) mapping[g].individual = n.id
        else if (n.nama.includes('Fencing')) mapping[g].fencing = n.id
        else if (n.nama.includes('Swimming')) mapping[g].swimming = n.id
        else if (n.nama.includes('Obstacle') || n.nama.includes('Riding')) mapping[g].obstacle = n.id
        else if (n.nama.includes('Laser Run')) mapping[g].laser_run = n.id
      })
      setNomorMap(mapping)

      const { data: atletList } = await supabase
        .from('atlet')
        .select('id, nama_lengkap, gender, kontingen_id, status_registrasi, kontingen(nama)')
        .eq('cabor_id', cabor_id)
        .order('status_registrasi', { ascending: true })
        .order('nama_lengkap')

      const initRows: AtletRow[] = (atletList ?? []).map(a => ({
        id: a.id, nama_lengkap: a.nama_lengkap, gender: a.gender,
        kontingen_id: a.kontingen_id, kontingen_nama: (a.kontingen as any)?.nama ?? '-',
        status_registrasi: a.status_registrasi ?? 'Draft',
        fencing_wins: '', fencing_total: '', swimming_time: '', obstacle_time: '', laser_run_time: '',
        points: { fencing: 0, swimming: 0, obstacle: 0, laser_run: 0, total: 0 },
      }))

      const allNomorIds = nomorList?.map(n => n.id) ?? []
      if (allNomorIds.length > 0) {
        const { data: hasilList } = await supabase
          .from('hasil_pertandingan').select('nomor_id, atlet_id, nilai').in('nomor_id', allNomorIds)

        hasilList?.forEach(h => {
          const row = initRows.find(r => r.id === h.atlet_id)
          if (!row) return
          const g = row.gender as 'L' | 'P'
          const map = mapping[g]
          if (h.nomor_id === map.fencing) row.points.fencing = h.nilai ?? 0
          else if (h.nomor_id === map.swimming) row.points.swimming = h.nilai ?? 0
          else if (h.nomor_id === map.obstacle) row.points.obstacle = h.nilai ?? 0
          else if (h.nomor_id === map.laser_run) row.points.laser_run = h.nilai ?? 0
          else if (h.nomor_id === map.individual) row.points.total = h.nilai ?? 0
        })

        initRows.forEach(r => {
          const computed = r.points.fencing + r.points.swimming + r.points.obstacle + r.points.laser_run
          if (computed > 0 && r.points.total === 0) r.points.total = computed
        })
      }

      setRows(initRows)
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [me])

  useEffect(() => { loadData() }, [])

  const { realtimeStatus, lastUpdate } = usePentathlonRealtime({
    cabor_id: me?.cabor_id,
    tables: ['hasil_pertandingan'],
    onUpdate: () => {
      // Reload tapi preserve user input yang belum di-save
      console.log('Hasil pertandingan changed (other operator?)')
    },
  })

  const updateRow = (atletId: number, field: keyof AtletRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== atletId) return r
      const updated = { ...r, [field]: value }
      const raw: PentathlonRawScore = {
        fencing_victories: updated.fencing_wins ? parseInt(updated.fencing_wins) : undefined,
        fencing_total_matches: updated.fencing_total ? parseInt(updated.fencing_total) : undefined,
        swimming_seconds: updated.swimming_time ? parseTime(updated.swimming_time) : undefined,
        obstacle_seconds: updated.obstacle_time ? parseTime(updated.obstacle_time) : undefined,
        laser_run_seconds: updated.laser_run_time ? parseTime(updated.laser_run_time) : undefined,
      }
      updated.points = calculatePentathlonTotal(raw)
      return updated
    }))
  }

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (r.gender !== genderFilter) return false
      if (statusFilter !== 'all' && r.status_registrasi !== statusFilter) return false
      return true
    })
  }, [rows, genderFilter, statusFilter])

  const rankedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => b.points.total - a.points.total)
    return sorted.map((r, idx) => ({
      ...r,
      rank: r.points.total > 0 ? idx + 1 : null,
      autoMedali: r.points.total > 0 && r.status_registrasi === 'Verified'
        ? (idx === 0 ? 'emas' : idx === 1 ? 'perak' : idx === 2 ? 'perunggu' : 'none')
        : 'none',
    }))
  }, [filteredRows])

  const stats = useMemo(() => {
    const gendered = rows.filter(r => r.gender === genderFilter)
    return {
      total: gendered.length,
      verified: gendered.filter(r => r.status_registrasi === 'Verified').length,
      menunggu: gendered.filter(r => r.status_registrasi === 'Menunggu Admin').length,
      posted: gendered.filter(r => r.status_registrasi === 'Posted').length,
    }
  }, [rows, genderFilter])

  const handleSave = async () => {
    setSaving(true)
    try {
      const map = nomorMap[genderFilter]
      if (!map.individual || !map.fencing || !map.swimming || !map.obstacle || !map.laser_run) {
        throw new Error(`Nomor pertandingan ${genderFilter === 'L' ? 'Putra' : 'Putri'} belum lengkap.`)
      }

      const toUpsert: any[] = []
      for (const row of rankedRows) {
        if (row.points.total <= 0) continue
        toUpsert.push(
          { nomor_id: map.fencing, atlet_id: row.id, kontingen_id: row.kontingen_id, nilai: row.points.fencing, medali: 'none', diinput_oleh: me.id, cabor_id: me.cabor_id },
          { nomor_id: map.swimming, atlet_id: row.id, kontingen_id: row.kontingen_id, nilai: row.points.swimming, medali: 'none', diinput_oleh: me.id, cabor_id: me.cabor_id },
          { nomor_id: map.obstacle, atlet_id: row.id, kontingen_id: row.kontingen_id, nilai: row.points.obstacle, medali: 'none', diinput_oleh: me.id, cabor_id: me.cabor_id },
          { nomor_id: map.laser_run, atlet_id: row.id, kontingen_id: row.kontingen_id, nilai: row.points.laser_run, medali: 'none', diinput_oleh: me.id, cabor_id: me.cabor_id },
          { nomor_id: map.individual, atlet_id: row.id, kontingen_id: row.kontingen_id, nilai: row.points.total, medali: row.autoMedali, ranking: row.rank, diinput_oleh: me.id, cabor_id: me.cabor_id },
        )
      }

      if (toUpsert.length === 0) {
        showToast('Tidak ada data untuk disimpan', 'error')
        return
      }

      const { error } = await supabase.from('hasil_pertandingan').upsert(toUpsert, { onConflict: 'nomor_id,atlet_id' })
      if (error) throw new Error(error.message)
      showToast(`✅ ${toUpsert.length} hasil tersimpan`)
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Input Skor Pentathlon</h1>
          <p className="text-slate-500 text-xs mt-1">
            Data mentah → auto-convert ke poin UIPM (formula editable di Settings)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeStatusBadge status={realtimeStatus} lastUpdate={lastUpdate} />
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-all">
            <RefreshCw size={12} />
            Reload
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 font-semibold text-xs px-4 py-2 rounded-lg transition-all">
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

      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          {(['L', 'P'] as const).map(g => (
            <button key={g} onClick={() => setGenderFilter(g)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                genderFilter === g
                  ? g === 'L' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                    : 'bg-pink-500/20 border border-pink-500/30 text-pink-400'
                  : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'
              }`}>
              {g === 'L' ? '👨 Putra' : '👩 Putri'} ({rows.filter(r => r.gender === g).length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 mr-1">Filter status:</span>
          <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label={`Semua (${stats.total})`} color="slate" />
          <FilterPill active={statusFilter === 'Verified'} onClick={() => setStatusFilter('Verified')} label={`Verified (${stats.verified})`} color="emerald" />
          <FilterPill active={statusFilter === 'Menunggu Admin'} onClick={() => setStatusFilter('Menunggu Admin')} label={`Menunggu (${stats.menunggu})`} color="amber" />
          <FilterPill active={statusFilter === 'Posted'} onClick={() => setStatusFilter('Posted')} label={`Posted (${stats.posted})`} color="blue" />
        </div>
      </div>

      <div className="mb-4 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed space-y-0.5">
          <div><span className="text-slate-200 font-medium">Fencing</span>: input wins & total matches. Baseline {(baselines.fencing.target_win_percent * 100).toFixed(0)}% = {baselines.fencing.target_points} pts.</div>
          <div><span className="text-slate-200 font-medium">Swimming/Obstacle/Laser Run</span>: input waktu format <code className="text-yellow-400">mm:ss.cc</code> atau detik.</div>
          <div className="text-amber-400/80 mt-1"><span className="font-medium">⚠️ Catatan:</span> Atlet non-Verified bisa di-input, tapi tidak otomatis dapat medali.</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/40">
              <tr className="border-b border-slate-800">
                <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3 sticky left-0 bg-slate-800/40 z-10">Atlet</th>
                <th className="text-left text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Status</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3" colSpan={2}>Fencing</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Swimming</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Obstacle</th>
                <th className="text-center text-slate-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Laser Run</th>
                <th className="text-center text-yellow-400 text-[10px] uppercase tracking-wider font-medium px-3 py-3 border-l border-slate-700">Total</th>
                <th className="text-center text-yellow-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Rank</th>
                <th className="text-center text-yellow-400 text-[10px] uppercase tracking-wider font-medium px-2 py-3">Medali</th>
              </tr>
            </thead>
            <tbody>
              {rankedRows.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16 text-slate-600">Tidak ada atlet</td></tr>
              ) : rankedRows.map(row => (
                <tr key={row.id} className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors ${row.status_registrasi !== 'Verified' ? 'opacity-75' : ''}`}>
                  <td className="px-3 py-2 text-slate-200 font-medium sticky left-0 bg-slate-900 z-10">
                    {row.nama_lengkap}
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">{row.kontingen_nama}</div>
                  </td>
                  <td className="px-2 py-2"><StatusBadge status={row.status_registrasi} /></td>
                  <td className="px-1 py-2">
                    <input type="number" min="0" value={row.fencing_wins}
                      onChange={e => updateRow(row.id, 'fencing_wins', e.target.value)}
                      placeholder="W"
                      className="w-12 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-xs text-slate-200 focus:outline-none focus:border-yellow-500" />
                  </td>
                  <td className="px-1 py-2">
                    <input type="number" min="0" value={row.fencing_total}
                      onChange={e => updateRow(row.id, 'fencing_total', e.target.value)}
                      placeholder="T"
                      className="w-12 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-xs text-slate-200 focus:outline-none focus:border-yellow-500" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.swimming_time}
                      onChange={e => updateRow(row.id, 'swimming_time', e.target.value)}
                      placeholder="02:22.50"
                      className="w-22 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-xs text-slate-200 focus:outline-none focus:border-yellow-500" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.obstacle_time}
                      onChange={e => updateRow(row.id, 'obstacle_time', e.target.value)}
                      placeholder="01:08.20"
                      className="w-22 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-xs text-slate-200 focus:outline-none focus:border-yellow-500" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="text" value={row.laser_run_time}
                      onChange={e => updateRow(row.id, 'laser_run_time', e.target.value)}
                      placeholder="11:00.00"
                      className="w-22 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center text-xs text-slate-200 focus:outline-none focus:border-yellow-500" />
                  </td>
                  <td className="px-3 py-2 text-center border-l border-slate-800">
                    <span className={`font-semibold ${row.points.total > 0 ? 'text-yellow-300' : 'text-slate-600'}`}>
                      {row.points.total > 0 ? row.points.total : '—'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {row.rank ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                        row.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : row.rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                        : row.rank === 3 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                        : 'text-slate-500'
                      }`}>{row.rank}</span>
                    ) : <span className="text-slate-700">—</span>}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {row.autoMedali === 'emas' && <span className="text-yellow-400">🥇</span>}
                    {row.autoMedali === 'perak' && <span className="text-slate-300">🥈</span>}
                    {row.autoMedali === 'perunggu' && <span className="text-amber-600">🥉</span>}
                    {row.autoMedali === 'none' && <span className="text-slate-700">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-800 px-5 py-3 bg-slate-800/20 text-xs text-slate-400 flex items-center justify-between">
          <div>
            <Trophy size={12} className="inline mr-1.5 text-yellow-400" />
            Hanya atlet <span className="text-emerald-400 font-medium">Verified</span> yang otomatis dapat medali
          </div>
          <div className="text-slate-500">
            {rankedRows.filter(r => r.points.total > 0).length} / {rankedRows.length} atlet ter-input
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterPill({ active, onClick, label, color }: any) {
  const map: any = {
    slate: active ? 'bg-slate-700 text-white border-slate-600' : 'text-slate-400 border-slate-700 hover:border-slate-600',
    emerald: active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'text-slate-400 border-slate-700 hover:border-emerald-500/30',
    amber: active ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'text-slate-400 border-slate-700 hover:border-amber-500/30',
    blue: active ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'text-slate-400 border-slate-700 hover:border-blue-500/30',
  }
  return <button onClick={onClick} className={`px-2.5 py-1 rounded-md border text-[10px] transition-all ${map[color]}`}>{label}</button>
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    'Verified': { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', label: '✓ Verified' },
    'Menunggu Admin': { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/20', label: '⏳ Menunggu' },
    'Posted': { bg: 'bg-blue-500/15 text-blue-400 border-blue-500/20', label: '📤 Posted' },
    'Ditolak Admin': { bg: 'bg-red-500/15 text-red-400 border-red-500/20', label: '✗ Ditolak' },
    'Draft': { bg: 'bg-slate-500/15 text-slate-400 border-slate-500/20', label: 'Draft' },
  }
  const c = config[status] ?? config['Draft']
  return <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${c.bg}`}>{c.label}</span>
}
