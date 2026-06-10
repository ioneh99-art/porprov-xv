'use client'
import { useEffect, useState } from 'react'
import { Save, RefreshCw, AlertCircle, RotateCcw, Settings as SettingsIcon } from 'lucide-react'
import { 
  DEFAULT_UIPM_BASELINES, 
  loadUIPMBaselines, 
  saveUIPMBaselines, 
  type UIPMBaselines 
} from '@/lib/pentathlon-scoring'

export default function PentathlonSettingsPage() {
  const [me, setMe] = useState<any>(null)
  const [baselines, setBaselines] = useState<UIPMBaselines>(DEFAULT_UIPM_BASELINES)
  const [original, setOriginal] = useState<UIPMBaselines>(DEFAULT_UIPM_BASELINES)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { init() }, [])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const init = async () => {
    try {
      const meData = await fetch('/api/auth/me').then(r => r.json())
      setMe(meData)
      const loaded = await loadUIPMBaselines(true)
      setBaselines(loaded)
      setOriginal(loaded)
    } catch (e: any) {
      showToast(`Error load: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!confirm('Simpan konfigurasi baseline UIPM baru? Ini akan affect semua perhitungan skor ke depan.')) return

    setSaving(true)
    try {
      const ok = await saveUIPMBaselines(baselines, notes || undefined, me?.id)
      if (!ok) throw new Error('Gagal save ke database')
      setOriginal(baselines)
      setNotes('')
      showToast('✅ Baseline UIPM tersimpan. Cache otomatis di-refresh.')
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefault = () => {
    if (!confirm('Reset semua nilai ke default UIPM Olympic standard?')) return
    setBaselines({ ...DEFAULT_UIPM_BASELINES })
    showToast('Reset ke default. Klik Save untuk apply.')
  }

  const handleDiscard = () => {
    setBaselines({ ...original })
    setNotes('')
    showToast('Perubahan dibatalkan.')
  }

  const isDirty = JSON.stringify(baselines) !== JSON.stringify(original)

  const updateField = (discipline: keyof UIPMBaselines, field: string, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    setBaselines(prev => ({
      ...prev,
      [discipline]: { ...prev[discipline], [field]: num }
    }))
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
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <SettingsIcon size={18} className="text-yellow-400" />
            Settings Formula UIPM
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Edit baseline UIPM Olympic 2028 di sini. Perubahan langsung apply ke perhitungan skor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button onClick={handleDiscard}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-all">
              <RefreshCw size={12} />
              Discard
            </button>
          )}
          <button onClick={handleResetDefault}
            className="flex items-center gap-2 text-slate-400 hover:text-amber-300 text-xs px-3 py-2 rounded-lg hover:bg-amber-500/10 transition-all">
            <RotateCcw size={12} />
            Reset Default
          </button>
          <button onClick={handleSave} disabled={saving || !isDirty}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold text-xs px-4 py-2 rounded-lg transition-all">
            {saving
              ? <div className="w-3 h-3 border border-slate-900 border-t-transparent rounded-full animate-spin" />
              : <Save size={13} />}
            Simpan
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-xs ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Warning info */}
      <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <span className="text-amber-400 font-medium">⚠️ Perhatian:</span> Mengubah baseline akan affect SEMUA perhitungan skor ke depan (skor yang udah disimpan sebelumnya tidak berubah, tapi rekap ulang akan pakai formula baru). Pastikan koordinasi dengan MPI Jabar / federasi sebelum save.
        </div>
      </div>

      {/* Formula cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* FENCING */}
        <DisciplineCard
          title="⚔️ Fencing"
          subtitle="Wins / Total matches → Points"
          color="red"
        >
          <FieldRow
            label="Target Win %" 
            value={(baselines.fencing.target_win_percent * 100).toFixed(0)}
            unit="%"
            onChange={(v: string) => updateField('fencing', 'target_win_percent', String(parseFloat(v) / 100))}
          />
          <FieldRow
            label="Target Poin" 
            value={baselines.fencing.target_points}
            unit="pts"
            onChange={(v: string) => updateField('fencing', 'target_points', v)}
          />
          <FieldRow
            label="Poin per Match (± dari target)" 
            value={baselines.fencing.points_per_match}
            unit="pts/win"
            onChange={(v: string) => updateField('fencing', 'points_per_match', v)}
          />
          <FieldRow
            label="Total Matches" 
            value={baselines.fencing.total_matches}
            unit="matches"
            onChange={(v: string) => updateField('fencing', 'total_matches', v)}
          />
          <Formula>
            {baselines.fencing.target_points} + (wins - {Math.round(baselines.fencing.target_win_percent * baselines.fencing.total_matches)}) × {baselines.fencing.points_per_match}
          </Formula>
        </DisciplineCard>

        {/* SWIMMING */}
        <DisciplineCard
          title="🏊 Swimming"
          subtitle="Waktu → Points"
          color="blue"
        >
          <FieldRow
            label="Target Waktu" 
            value={baselines.swimming.target_seconds}
            unit="detik"
            onChange={(v: string) => updateField('swimming', 'target_seconds', v)}
            hint={formatSec(baselines.swimming.target_seconds)}
          />
          <FieldRow
            label="Target Poin" 
            value={baselines.swimming.target_points}
            unit="pts"
            onChange={(v: string) => updateField('swimming', 'target_points', v)}
          />
          <FieldRow
            label="Detik per Poin" 
            value={baselines.swimming.seconds_per_point}
            unit="s/pt"
            step="0.01"
            onChange={(v: string) => updateField('swimming', 'seconds_per_point', v)}
          />
          <Formula>
            {baselines.swimming.target_points} + ({baselines.swimming.target_seconds} - waktu) ÷ {baselines.swimming.seconds_per_point}
          </Formula>
        </DisciplineCard>

        {/* OBSTACLE */}
        <DisciplineCard
          title="🧗 Obstacle"
          subtitle="Waktu → Points (LA 2028 baru, replace Riding)"
          color="green"
        >
          <FieldRow
            label="Target Waktu" 
            value={baselines.obstacle.target_seconds}
            unit="detik"
            onChange={(v: string) => updateField('obstacle', 'target_seconds', v)}
            hint={formatSec(baselines.obstacle.target_seconds)}
          />
          <FieldRow
            label="Target Poin" 
            value={baselines.obstacle.target_points}
            unit="pts"
            onChange={(v: string) => updateField('obstacle', 'target_points', v)}
          />
          <FieldRow
            label="Detik per Poin" 
            value={baselines.obstacle.seconds_per_point}
            unit="s/pt"
            step="0.01"
            onChange={(v: string) => updateField('obstacle', 'seconds_per_point', v)}
          />
          <Formula>
            {baselines.obstacle.target_points} + ({baselines.obstacle.target_seconds} - waktu) ÷ {baselines.obstacle.seconds_per_point}
          </Formula>
        </DisciplineCard>

        {/* LASER RUN */}
        <DisciplineCard
          title="🏃🎯 Laser Run"
          subtitle="Waktu → Points (Lari + Tembak gabungan)"
          color="orange"
        >
          <FieldRow
            label="Target Waktu" 
            value={baselines.laser_run.target_seconds}
            unit="detik"
            onChange={(v: string) => updateField('laser_run', 'target_seconds', v)}
            hint={formatSec(baselines.laser_run.target_seconds)}
          />
          <FieldRow
            label="Target Poin" 
            value={baselines.laser_run.target_points}
            unit="pts"
            onChange={(v: string) => updateField('laser_run', 'target_points', v)}
          />
          <FieldRow
            label="Detik per Poin" 
            value={baselines.laser_run.seconds_per_point}
            unit="s/pt"
            step="0.01"
            onChange={(v: string) => updateField('laser_run', 'seconds_per_point', v)}
          />
          <Formula>
            {baselines.laser_run.target_points} + ({baselines.laser_run.target_seconds} - waktu) ÷ {baselines.laser_run.seconds_per_point}
          </Formula>
        </DisciplineCard>
      </div>

      {/* Notes */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <label className="text-slate-300 text-xs font-medium mb-2 block">Catatan Perubahan (opsional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Misal: Update sesuai standar UIPM Olympic 2028 baru, atau adjust untuk level pengprov..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-yellow-500 min-h-[80px] resize-none" />
        <div className="text-[10px] text-slate-500 mt-2">
          Catatan ini disimpan di history untuk audit trail.
        </div>
      </div>
    </div>
  )
}

function DisciplineCard({ title, subtitle, color, children }: any) {
  const colorMap: any = {
    red: 'border-red-500/20 bg-red-500/[0.03]',
    blue: 'border-blue-500/20 bg-blue-500/[0.03]',
    green: 'border-green-500/20 bg-green-500/[0.03]',
    orange: 'border-orange-500/20 bg-orange-500/[0.03]',
  }
  return (
    <div className={`border rounded-2xl p-5 ${colorMap[color]}`}>
      <div className="mb-4">
        <div className="text-white text-sm font-medium">{title}</div>
        <div className="text-slate-500 text-[10px] mt-0.5">{subtitle}</div>
      </div>
      <div className="space-y-2.5">
        {children}
      </div>
    </div>
  )
}

function FieldRow({ label, value, unit, onChange, step, hint }: {
  label: string; value: any; unit?: string; step?: string; hint?: string
  onChange?: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-slate-400 flex-1">
        {label}
        {hint && <span className="text-[10px] text-slate-600 ml-1">({hint})</span>}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" value={value} step={step ?? '1'}
          onChange={e => onChange?.(e.target.value)}
          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-yellow-300 font-mono text-right focus:outline-none focus:border-yellow-500" />
        <span className="text-[10px] text-slate-500 w-12">{unit}</span>
      </div>
    </div>
  )
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-800/60">
      <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">Formula</div>
      <div className="text-[10px] font-mono text-yellow-300/70 leading-relaxed">{children}</div>
    </div>
  )
}

function formatSec(s: number): string {
  const mm = Math.floor(s / 60)
  const ss = (s % 60).toFixed(0).padStart(2, '0')
  return mm > 0 ? `${mm}:${ss}` : `${s}s`
}
