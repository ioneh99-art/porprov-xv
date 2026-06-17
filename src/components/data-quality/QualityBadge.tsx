'use client'

export type QualityStatus = 'ok' | 'fixed_by_system' | 'manual_review_required' | 'investigation_required' | 'unverified'

interface Props {
  status: QualityStatus | string | null | undefined
  notesCount?: number
  isLocked?: boolean
  lockedReason?: string | null
  onClick?: () => void
}

const CONFIG: Record<QualityStatus, { emoji: string; label: string; cls: string; description: string }> = {
  ok: {
    emoji: '✅',
    label: 'Data Valid',
    cls: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
    description: 'Data lengkap dan valid sesuai standar KONI',
  },
  fixed_by_system: {
    emoji: '🔧',
    label: 'Dikoreksi Sistem',
    cls: 'bg-sky-900/30 text-sky-300 border-sky-700/40',
    description: 'Data sebelumnya tidak lengkap/salah, diperbaiki otomatis dari NIK atau rekap KONI',
  },
  manual_review_required: {
    emoji: '🔐',
    label: 'Perlu Verifikasi KONI',
    cls: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
    description: 'NIK tidak valid, butuh KTP/Akta Kelahiran dari KONI',
  },
  investigation_required: {
    emoji: '⚠️',
    label: 'Investigasi',
    cls: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
    description: 'NIK tidak ditemukan di rekap resmi KONI Bandung',
  },
  unverified: {
    emoji: '○',
    label: 'Belum Sync',
    cls: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    description: 'Belum diproses oleh Data Quality Engine',
  },
}

export function QualityBadge({ status, notesCount, isLocked, lockedReason, onClick }: Props) {
  const key    = (status as QualityStatus) || 'unverified'
  const config = CONFIG[key] ?? CONFIG.unverified
  const tip    = isLocked ? (lockedReason ?? config.description) : config.description

  return (
    <button
      onClick={onClick}
      title={tip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-opacity hover:opacity-80 ${config.cls}`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
      {notesCount != null && notesCount > 0 && (
        <span className="ml-0.5 px-1 rounded text-[9px] bg-white/10">{notesCount}</span>
      )}
    </button>
  )
}
