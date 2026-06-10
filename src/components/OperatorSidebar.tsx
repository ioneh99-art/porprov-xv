'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  MessageSquare, FileText, TrendingUp, BarChart3,
  Dna, Trophy, Search, GitBranch, ChevronDown,
  ChevronRight, Sparkles, LogOut, User,
  Edit3, Users, Medal, Settings, Calendar
} from 'lucide-react'

type TierBadge = 'BASIC' | 'PRO' | 'ELITE' | 'CHAMPION'

type MenuItem = {
  label: string
  href: string
  icon: any
  tier: TierBadge
  badge?: string
}

type MenuGroup = {
  label: string
  items: MenuItem[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: 'PENTATHLON MODULE',
    items: [
      { label: 'Dashboard Pentathlon', href: '/operator/pentathlon',           icon: Medal,          tier: 'BASIC' },
      { label: 'Data Atlet',           href: '/operator/pentathlon/atlet',     icon: Users,          tier: 'BASIC' },
      { label: 'Dokumen Atlet',        href: '/operator/pentathlon/dokumen',   icon: FileText,       tier: 'BASIC' },
      { label: 'Jadwal Pertandingan',   href: '/operator/pentathlon/jadwal',   icon: Calendar,       tier: 'BASIC' },
      { label: 'Lineup',               href: '/operator/pentathlon/lineup',    icon: Users,          tier: 'BASIC' },
    ]
  },
  {
    label: 'ANALYTICS',
    items: [
      { label: 'Performance Trends', href: '/operator/analytics/trends', icon: TrendingUp, tier: 'PRO' },
      { label: 'Comparative Analysis', href: '/operator/analytics/compare', icon: BarChart3, tier: 'PRO' },
    ]
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Sport Intelligence', href: '/operator/sport-intel',      icon: MessageSquare, tier: 'PRO',      badge: 'AI' },
      { label: 'Strategic Brief',    href: '/operator/strategic-brief',  icon: FileText,      tier: 'PRO',      badge: 'AI' },
      { label: 'Athlete Genome', href: '/operator/intel/genome', icon: Dna, tier: 'ELITE', badge: 'AI' },
      { label: 'Medal Predictor', href: '/operator/intel/predictor', icon: Trophy, tier: 'ELITE', badge: 'AI' },
      { label: 'Talent Scout', href: '/operator/intel/scout', icon: Search, tier: 'CHAMPION', badge: 'AI' },
      { label: 'Mutation Analytics', href: '/operator/intel/mutation', icon: GitBranch, tier: 'CHAMPION' },
    ]
  },
  {
    label: 'LIVE EVENT TOOLS',
    items: [
      { label: 'Input UIPM',       href: '/operator/pentathlon/input',    icon: Edit3,    tier: 'BASIC' },
      { label: 'Klasemen Live',    href: '/operator/pentathlon/klasemen', icon: Trophy,   tier: 'BASIC' },
      { label: 'Settings Formula', href: '/operator/pentathlon/settings', icon: Settings, tier: 'BASIC' },
    ]
  },
]

const TIER_COLORS: Record<TierBadge, string> = {
  BASIC: 'bg-slate-700 text-slate-300',
  PRO: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  ELITE: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  CHAMPION: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
}

export default function OperatorSidebar({
  user,
  onLogout,
}: {
  user?: { username?: string; cabor?: string; tier?: TierBadge }
  onLogout?: () => void
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'PENTATHLON MODULE': true,
    ANALYTICS: true,
    INTELLIGENCE: true,
    'LIVE EVENT TOOLS': true,
  })

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('sidebar_collapsed') : null
    if (saved === '1') setCollapsed(true)
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', next ? '1' : '0')
    }
  }

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const userTier: TierBadge = user?.tier ?? 'CHAMPION'
  const tierRank: Record<TierBadge, number> = { BASIC: 0, PRO: 1, ELITE: 2, CHAMPION: 3 }

  return (
    <aside className={`bg-slate-950 border-r border-slate-800 h-screen sticky top-0 flex flex-col transition-all ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm">PORPROV XV</div>
            <div className="text-slate-500 text-xs">Operator Cabor</div>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} className="rotate-90" />}
        </button>
      </div>

      {/* User badge */}
      {!collapsed && user && (
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <User size={14} className="text-slate-400" />
            <div className="text-white text-sm font-medium truncate">{user.username ?? 'operator'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs truncate">{user.cabor ?? '—'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TIER_COLORS[userTier]}`}>
              {userTier}
            </span>
          </div>
        </div>
      )}

      {/* Menu groups */}
      <nav className="flex-1 overflow-y-auto py-3">
        {MENU_GROUPS.map(group => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full px-4 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider"
              >
                <span>{group.label}</span>
                {openGroups[group.label] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            {(collapsed || openGroups[group.label]) && (
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  const locked = tierRank[item.tier] > tierRank[userTier]

                  return (
                    <Link
                      key={item.href}
                      href={locked ? '#' : item.href}
                      onClick={e => {
                        if (locked) {
                          e.preventDefault()
                          alert(`Fitur ini butuh tier ${item.tier}. Upgrade dulu bos.`)
                        }
                      }}
                      className={`mx-2 px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition group ${
                        isActive
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          : locked
                          ? 'text-slate-600 hover:bg-slate-900'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-violet-300 font-bold">
                              {item.badge}
                            </span>
                          )}
                          {locked && <span className="text-[10px]">🔒</span>}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        {!collapsed ? (
          <div>
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2 text-xs text-slate-500">
              <Sparkles size={12} className="text-amber-400" />
              <span>Powered by Claude + Groq</span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            )}
          </div>
        ) : (
          onLogout && (
            <button
              onClick={onLogout}
              className="w-full p-2 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          )
        )}
      </div>
    </aside>
  )
}
