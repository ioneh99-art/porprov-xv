'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { X, Lock, User, Calendar, Trophy, ShieldAlert, ArrowRight } from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface AuditEntry {
  id: number
  action_type: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  fix_source: string | null
  fix_reason: string | null
  performed_at: string
}

interface Props {
  atlet: {
    id: number
    nama_lengkap: string
    no_ktp?: string | null
    cabor_nama_raw?: string
    data_quality_status?: string | null
    is_locked?: boolean | null
    locked_reason?: string | null
    data_quality_notes?: any[] | null
    original_data?: any
  }
  onClose: () => void
}

const ACTION_CONFIG: Record<string, { emoji: string; title: string; color: string }> = {
  gender_fix:    { emoji: '👤', title: 'Koreksi Gender',            color: 'text-sky-300'     },
  tgl_lahir_fix: { emoji: '📅', title: 'Koreksi Tanggal Lahir',     color: 'text-emerald-300' },
  cabor_sync:    { emoji: '🏆', title: 'Sinkronisasi Cabang Olahraga', color: 'text-purple-300'},
  lock:          { emoji: '🔒', title: 'Flag untuk Verifikasi KONI', color: 'text-amber-300'   },
}

const STATUS_BADGE: Record<string, { emoji: string; label: string; cls: string }> = {
  ok:                     { emoji: '✅', label: 'Data Valid',            cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-700/30' },
  fixed_by_system:        { emoji: '🔧', label: 'Dikoreksi Sistem',      cls: 'bg-sky-500/10     text-sky-300     border-sky-700/30'     },
  manual_review_required: { emoji: '🔐', label: 'Perlu Verifikasi KONI', cls: 'bg-amber-500/10  text-amber-300  border-amber-700/30'  },
  investigation_required: { emoji: '⚠️', label: 'Investigasi',           cls: 'bg-amber-500/10  text-amber-300  border-amber-700/30'  },
  unverified:             { emoji: '○',  label: 'Belum Sync',            cls: 'bg-zinc-800       text-zinc-400    border-zinc-700'         },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function QualityDetailModal({ atlet, onClose }: Props) {
  const [auditLog, setAuditLog]   = useState<AuditEntry[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    sb.from('atlet_data_quality_audit')
      .select('id,action_type,field_name,old_value,new_value,fix_source,fix_reason,performed_at')
      .eq('atlet_id', atlet.id)
      .order('performed_at', { ascending: false })
      .then(({ data }) => {
        setAuditLog(data || [])
        setLoading(false)
      })
  }, [atlet.id])

  const statusKey   = atlet.data_quality_status || 'unverified'
  const statusBadge = STATUS_BADGE[statusKey] ?? STATUS_BADGE.unverified

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#0a0f1e', border: '1px solid rgba(139,92,246,0.25)', maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Data Quality Detail</p>
            <p className="text-sm font-semibold text-white mt-0.5">{atlet.nama_lengkap}</p>
            {atlet.no_ktp && <p className="text-[11px] text-zinc-500 mt-0.5">NIK: {atlet.no_ktp}</p>}
            {atlet.cabor_nama_raw && <p className="text-[11px] text-zinc-600">{atlet.cabor_nama_raw}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(88vh - 88px)' }}>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold border ${statusBadge.cls}`}>
              <span>{statusBadge.emoji}</span>
              <span>{statusBadge.label}</span>
            </span>
            <span className="text-[10px] text-zinc-600">Status Data Quality</span>
          </div>

          {/* Locked warning */}
          {atlet.is_locked && (
            <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-start gap-3">
                <Lock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">⚠️ Tindakan Diperlukan</p>
                  <p className="text-xs text-amber-400 mt-1">{atlet.locked_reason}</p>
                  <p className="text-[11px] text-amber-500/80 mt-2">
                    Mohon verifikasi NIK dengan KTP/Akta Kelahiran ke KONI.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Audit History dari atlet_data_quality_audit */}
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Riwayat Koreksi Sistem
            </p>

            {loading ? (
              <div className="text-xs text-zinc-600 py-3 text-center">Memuat riwayat…</div>
            ) : auditLog.length === 0 ? (
              <div className="text-xs text-zinc-600 py-3 text-center">
                {atlet.data_quality_status === 'ok'
                  ? '✅ Data bersih dari awal — tidak ada koreksi yang dilakukan.'
                  : 'Belum ada riwayat koreksi tercatat.'}
              </div>
            ) : (
              <div className="space-y-2">
                {auditLog.map(entry => {
                  const ac = ACTION_CONFIG[entry.action_type] ?? {
                    emoji: '⚙️', title: entry.action_type, color: 'text-zinc-300',
                  }
                  return (
                    <div key={entry.id} className="p-3 rounded-xl"
                      style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)' }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">{ac.emoji}</span>
                        <span className={`text-xs font-semibold ${ac.color}`}>{ac.title}</span>
                      </div>

                      {/* old → new */}
                      {(entry.old_value != null || entry.new_value != null) && (
                        <div className="flex items-center gap-1.5 text-[11px] mb-1">
                          <span className="text-zinc-500 line-through">{entry.old_value || '(kosong)'}</span>
                          <ArrowRight size={10} className="text-zinc-600 shrink-0" />
                          <span className="text-sky-300 font-medium">{entry.new_value || '—'}</span>
                        </div>
                      )}

                      {/* meta */}
                      <div className="text-[10px] text-zinc-600 space-x-2">
                        {entry.fix_source && <span>Sumber: <span className="text-zinc-500">{entry.fix_source}</span></span>}
                        <span>·</span>
                        <span>{formatDate(entry.performed_at)}</span>
                      </div>

                      {entry.fix_reason && (
                        <p className="text-[10px] text-zinc-600 italic mt-1">{entry.fix_reason}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Original data (collapsible) */}
          {atlet.original_data && (
            <details className="text-xs">
              <summary className="cursor-pointer text-zinc-600 hover:text-zinc-400 transition-colors">
                Lihat data asli sebelum auto-fix
              </summary>
              <pre className="mt-2 p-3 rounded-lg text-[11px] text-zinc-400 overflow-x-auto"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {JSON.stringify(atlet.original_data, null, 2)}
              </pre>
            </details>
          )}

        </div>
      </div>
    </div>
  )
}
