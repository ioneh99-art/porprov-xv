'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layers, Trophy, GitBranch, ListChecks, ChevronLeft, ExternalLink, Download } from 'lucide-react'

const SUB_TABS = [
  { key: '',          label: 'Overview',  icon: ChevronLeft },
  { key: 'phases',    label: 'Phases',    icon: Layers      },
  { key: 'bracket',   label: 'Bracket',   icon: GitBranch   },
  { key: 'results',   label: 'Results',   icon: ListChecks  },
  { key: 'standings', label: 'Standings', icon: Trophy      },
  { key: 'export',    label: 'Export',    icon: Download    },
]

export default function EventSubnav({ eventId, tenantSlug, eventSlug }: {
  eventId: string
  tenantSlug?: string
  eventSlug?: string
}) {
  const pathname = usePathname() ?? ''
  const base = `/operator/pentascore/events/${eventId}`

  return (
    <div className="flex items-center gap-1 mb-6 bg-slate-900/50 rounded-lg border border-slate-800 p-1 overflow-x-auto">
      {SUB_TABS.map(t => {
        const href = t.key ? `${base}/${t.key}` : base
        const active = t.key
          ? pathname.includes(`/${t.key}`)
          : pathname === base
        const Icon = t.icon
        return (
          <Link
            key={t.key}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition whitespace-nowrap ${
              active
                ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
            }`}
          >
            <Icon size={12} />
            {t.label}
          </Link>
        )
      })}
      {tenantSlug && (
        <Link
          href={`/live/${tenantSlug}/${eventSlug ?? eventId}`}
          target="_blank"
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold transition whitespace-nowrap bg-green-500/10 text-green-300 border border-green-500/30 hover:bg-green-500/20"
        >
          <ExternalLink size={11} />
          Public Live
        </Link>
      )}
    </div>
  )
}
