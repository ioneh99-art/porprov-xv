'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Download, RefreshCw, Sparkles, CheckCircle2, Wrench, Lock, AlertTriangle, HelpCircle } from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID = 4

interface Breakdown {
  total: number
  ok: number
  fixed_by_system: number
  manual_review_required: number
  investigation_required: number
  unverified: number
  locked: number
}

export function QualityDashboard() {
  const [breakdown,  setBreakdown]  = useState<Breakdown | null>(null)
  const [lastImport, setLastImport] = useState<any>(null)
  const [syncing,    setSyncing]    = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  const fetchStatus = async () => {
    // Direct Supabase query — no API route, no server-side env var dependency
    let all: any[] = []
    for (let p = 0; ; p++) {
      const { data } = await sb
        .from('atlet')
        .select('data_quality_status, is_locked')
        .eq('kontingen_id', KONTINGEN_ID)
        .range(p * 1000, (p + 1) * 1000 - 1)
      if (!data || data.length === 0) break
      all = all.concat(data)
      if (data.length < 1000) break
    }

    const bd: Breakdown = {
      total: all.length,
      ok: 0, fixed_by_system: 0,
      manual_review_required: 0, investigation_required: 0,
      unverified: 0, locked: 0,
    }
    for (const a of all) {
      const s = (a.data_quality_status || 'unverified') as keyof Breakdown
      if (s in bd) (bd[s] as number)++
      if (a.is_locked) bd.locked++
    }
    setBreakdown(bd)

    // Last import log tetap dari API (butuh service key untuk rekap_import_log)
    try {
      const res  = await fetch(`/api/data-quality/status?kontingen_id=${KONTINGEN_ID}`)
      const json = await res.json()
      if (json.last_import) setLastImport(json.last_import)
    } catch { /* skip */ }
  }

  const triggerSync = async () => {
    if (!confirm('Jalankan Data Quality Sync?\n\nIni akan:\n• Auto-fix gender (dari NIK)\n• Auto-fix tanggal lahir (dari NIK)\n• Sync cabor_id (dari cabor_nama_raw)\n• Lock atlet NIK invalid\n• Flag ghost data\n\nSemua perubahan bisa di-rollback.')) return

    setSyncing(true)
    setSyncResult(null)
    try {
      const res  = await fetch('/api/data-quality/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kontingenId: KONTINGEN_ID }),
      })
      const data = await res.json()
      if (data.success) {
        setSyncResult(data.summary)
        fetchStatus()
      } else {
        alert('Sync gagal: ' + data.error)
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const stats = [
    { key: 'ok',                     label: 'Data OK',       icon: CheckCircle2,  color: 'emerald' },
    { key: 'fixed_by_system',        label: 'Auto-Fixed',    icon: Wrench,        color: 'blue'    },
    { key: 'manual_review_required', label: 'Locked',        icon: Lock,          color: 'red'     },
    { key: 'investigation_required', label: 'Investigasi',   icon: AlertTriangle, color: 'amber'   },
    { key: 'unverified',             label: 'Belum Sync',    icon: HelpCircle,    color: 'zinc'    },
  ] as const

  const colorMap: Record<string, string> = {
    emerald: 'rgba(16,185,129,0.1) border-emerald-700/30 text-emerald-300',
    blue:    'rgba(37,99,235,0.1) border-blue-700/30 text-blue-300',
    red:     'rgba(239,68,68,0.1) border-red-700/30 text-red-300',
    amber:   'rgba(245,158,11,0.1) border-amber-700/30 text-amber-300',
    zinc:    'rgba(100,116,139,0.1) border-zinc-700/30 text-zinc-400',
  }

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-white">Data Quality</span>
          {breakdown && (
            <span className="text-xs text-zinc-500">
              · {breakdown.total} atlet
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.open(`/api/data-quality/koni-report?kontingen_id=${KONTINGEN_ID}`, '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <Download size={12} />
            Report KONI
          </button>
          <button onClick={triggerSync} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync dari Rekap'}
          </button>
        </div>
      </div>

      {/* Stats grid */}
      {breakdown ? (
        <div className="grid grid-cols-5 gap-2">
          {stats.map(s => {
            const Icon  = s.icon
            const val   = breakdown[s.key as keyof Breakdown] as number
            const parts = colorMap[s.color].split(' ')
            return (
              <div key={s.key} className={`p-3 rounded-xl border`}
                style={{ background: parts[0] }}>
                <div className={`flex items-center gap-1 text-[10px] font-medium mb-1 ${parts[2]}`}>
                  <Icon size={10} />
                  {s.label}
                </div>
                <p className={`text-xl font-bold ${parts[2]}`}>{val}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center text-xs text-zinc-600">Memuat…</div>
      )}

      {/* Sync result toast */}
      {syncResult && (
        <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <p className="font-semibold text-emerald-300 mb-1">✓ Sync selesai</p>
          <div className="text-emerald-400 space-y-0.5">
            <p>Gender fix: {syncResult.gender_fixes} · Tgl lahir fix: {syncResult.tgl_lahir_fixes} · Cabor sync: {syncResult.cabor_syncs}</p>
            <p>Locked: {syncResult.locked} · Investigasi: {syncResult.investigated}</p>
          </div>
        </div>
      )}

      {/* Last import info */}
      {lastImport && (
        <p className="text-[10px] text-zinc-600 mt-3">
          Last sync: {new Date(lastImport.imported_at).toLocaleString('id-ID')} · {lastImport.fixes_applied} fixes · {lastImport.errors_found} locked
        </p>
      )}
    </div>
  )
}
