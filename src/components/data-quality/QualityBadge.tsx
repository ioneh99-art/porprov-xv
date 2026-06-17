'use client'
import { CheckCircle2, Wrench, Lock, AlertTriangle, HelpCircle } from 'lucide-react'

export type QualityStatus = 'ok' | 'fixed_by_system' | 'manual_review_required' | 'investigation_required' | 'unverified'

interface Props {
  status: QualityStatus | string | null | undefined
  notesCount?: number
  isLocked?: boolean
  lockedReason?: string | null
  onClick?: () => void
}

const CONFIG: Record<QualityStatus, { icon: any; label: string; cls: string }> = {
  ok: {
    icon: CheckCircle2,
    label: 'Data OK',
    cls: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  },
  fixed_by_system: {
    icon: Wrench,
    label: 'Auto-Fixed',
    cls: 'bg-blue-900/30 text-blue-300 border-blue-700/40',
  },
  manual_review_required: {
    icon: Lock,
    label: 'Locked',
    cls: 'bg-red-900/30 text-red-300 border-red-700/40',
  },
  investigation_required: {
    icon: AlertTriangle,
    label: 'Investigasi',
    cls: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  },
  unverified: {
    icon: HelpCircle,
    label: 'Belum Sync',
    cls: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  },
}

export function QualityBadge({ status, notesCount, isLocked, lockedReason, onClick }: Props) {
  const key    = (status as QualityStatus) || 'unverified'
  const config = CONFIG[key] ?? CONFIG.unverified
  const Icon   = config.icon

  return (
    <button
      onClick={onClick}
      title={isLocked ? (lockedReason ?? config.label) : config.label}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-opacity hover:opacity-80 ${config.cls}`}>
      <Icon size={10} />
      <span>{config.label}</span>
      {notesCount != null && notesCount > 0 && (
        <span className="ml-0.5 px-1 rounded text-[9px] bg-white/10">{notesCount}</span>
      )}
    </button>
  )
}
