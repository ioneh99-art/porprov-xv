'use client'
import { X, Calendar, User, Trophy, Lock, AlertTriangle } from 'lucide-react'

interface FixNote {
  field: string
  original_value: any
  new_value: any
  fix_reason: string
  fix_source?: string
  fixed_at: string
}

interface Props {
  atlet: {
    id: number
    nama_lengkap: string
    no_ktp?: string | null
    data_quality_status?: string | null
    is_locked?: boolean | null
    locked_reason?: string | null
    data_quality_notes?: FixNote[] | null
    original_data?: any
  }
  onClose: () => void
}

const FIELD_ICON: Record<string, any> = { gender: User, tgl_lahir: Calendar, cabor_id: Trophy }
const FIELD_LABEL: Record<string, string> = {
  gender: 'Gender', tgl_lahir: 'Tanggal Lahir', cabor_id: 'Cabang Olahraga', general: 'Umum',
}

export function QualityDetailModal({ atlet, onClose }: Props) {
  const notes = atlet.data_quality_notes || []

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#0a0f1e', border: '1px solid rgba(139,92,246,0.25)', maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Data Quality Detail</p>
            <p className="text-sm font-semibold text-white mt-0.5">{atlet.nama_lengkap}</p>
            {atlet.no_ktp && <p className="text-[11px] text-zinc-500 mt-0.5">NIK: {atlet.no_ktp}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {/* Locked warning */}
          {atlet.is_locked && (
            <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="flex items-start gap-3">
                <Lock size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300">Atlet Di-Lock — Butuh Review Manual</p>
                  <p className="text-xs text-red-400 mt-1">{atlet.locked_reason}</p>
                  <p className="text-[11px] text-red-500 mt-2">Tidak bisa di-edit sampai KONI verifikasi ulang NIK</p>
                </div>
              </div>
            </div>
          )}

          {/* Investigation warning */}
          {atlet.data_quality_status === 'investigation_required' && !atlet.is_locked && (
            <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">Perlu Investigasi</p>
                  <p className="text-xs text-amber-400 mt-1">NIK tidak ditemukan di rekap resmi KONI Bandung. Koordinasikan dengan KONI untuk verifikasi.</p>
                </div>
              </div>
            </div>
          )}

          {/* Fix notes */}
          {notes.filter(n => n.field !== 'general').length > 0 && (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Auto-fixes Applied</p>
              <div className="space-y-2">
                {notes.filter(n => n.field !== 'general').map((note, i) => {
                  const Icon = FIELD_ICON[note.field] || User
                  return (
                    <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)' }}>
                      <div className="flex items-start gap-2">
                        <Icon size={13} className="text-blue-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-blue-300">{FIELD_LABEL[note.field] || note.field}</p>
                          <div className="text-[11px] text-zinc-400 mt-1 space-y-0.5">
                            <p>Sebelum: <span className="line-through text-zinc-500">{String(note.original_value ?? '—')}</span></p>
                            <p>Sesudah: <span className="text-blue-300 font-medium">{String(note.new_value ?? '—')}</span></p>
                            <p className="italic text-zinc-500 mt-1">{note.fix_reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Original data */}
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

          {notes.length === 0 && !atlet.is_locked && (
            <p className="text-sm text-zinc-500 text-center py-4">Belum ada data quality action untuk atlet ini.</p>
          )}
        </div>
      </div>
    </div>
  )
}
