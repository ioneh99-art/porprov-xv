'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  MessageSquare, FileText, TrendingUp, BarChart3,
  Dna, Trophy, Search, GitBranch, ChevronDown,
  ChevronRight, LogOut, User,
  Edit3, Users, Medal, Settings, Calendar,
  Activity, Award, Database, Lock,
  Sparkles, Layers, Building2, Zap,
  ShieldCheck, CheckCircle, Wand2, Heart,
} from 'lucide-react'
import UpgradeModal from '@/components/UpgradeModal'
import type { SubscriptionTier } from '@/lib/subscription-tier'

type TierBadge = 'BASIC' | 'PRO' | 'ELITE' | 'CHAMPION'

type MenuItem = {
  label:          string
  href:           string
  icon:           any
  tier:           TierBadge
  badge?:         string
  // true = klik tampilkan UpgradeModal, false/undefined = navigasi biasa
  upgradeRequired?: boolean
}

type MenuGroup = {
  label: string
  items: MenuItem[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: 'PENTATHLON MODULE',
    items: [
      { label: 'Dashboard Pentathlon',   href: '/operator/pentathlon',              icon: Medal,        tier: 'BASIC' },
      { label: 'Data Atlet',             href: '/operator/pentathlon/atlet',        icon: Users,        tier: 'BASIC' },
      { label: 'Dokumen Atlet',          href: '/operator/pentathlon/dokumen',      icon: FileText,     tier: 'BASIC' },
      { label: 'Tes Fisik / BioMotorik', href: '/operator/pentathlon/tes-fisik',    icon: Activity,     tier: 'BASIC' },
      { label: 'Kejuaraan Atlet',        href: '/operator/pentathlon/kejuaraan',    icon: Award,        tier: 'BASIC' },
      { label: 'Laporan',                href: '/operator/pentathlon/laporan',      icon: FileText,     tier: 'BASIC' },
      { label: 'Data Gateway',           href: '/operator/pentathlon/data-gateway', icon: Database,     tier: 'BASIC' },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { label: 'Performance Trends',   href: '/operator/analytics/trends',  icon: TrendingUp, tier: 'PRO',      upgradeRequired: true },
      { label: 'Comparative Analysis', href: '/operator/analytics/compare', icon: BarChart3,  tier: 'PRO',      upgradeRequired: true },
      { label: 'Mutation Analytics',   href: '/operator/intel/mutation',    icon: GitBranch,  tier: 'CHAMPION', upgradeRequired: true },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Sport Intelligence', href: '/operator/sport-intel',     icon: MessageSquare, tier: 'PRO',      badge: 'AI', upgradeRequired: false },
      { label: 'Strategic Brief',    href: '/operator/strategic-brief', icon: FileText,      tier: 'PRO',      badge: 'AI', upgradeRequired: true },
      { label: 'Athlete Genome',     href: '/operator/intel/genome',    icon: Dna,           tier: 'ELITE',    badge: 'AI', upgradeRequired: true },
      { label: 'Medal Predictor',    href: '/operator/intel/predictor', icon: Trophy,        tier: 'ELITE',    badge: 'AI', upgradeRequired: true },
      { label: 'Talent Scout',       href: '/operator/intel/scout',     icon: Search,        tier: 'CHAMPION', badge: 'AI', upgradeRequired: true },
    ],
  },
  {
    label: 'LIVE EVENT TOOLS',
    items: [
      { label: 'Jadwal Pertandingan', href: '/operator/pentathlon/jadwal',   icon: Calendar, tier: 'BASIC' },
      { label: 'Lineup',              href: '/operator/pentathlon/lineup',   icon: Users,    tier: 'BASIC' },
      { label: 'Input UIPM',          href: '/operator/pentathlon/input',    icon: Edit3,    tier: 'BASIC' },
      { label: 'Klasemen Live',       href: '/operator/pentathlon/klasemen', icon: Trophy,   tier: 'BASIC' },
      { label: 'Settings Formula',    href: '/operator/pentathlon/settings', icon: Settings, tier: 'BASIC' },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  // NEW: PENTASCORE INDONESIA (Sprint 2)
  // Standalone UIPM-grade scoring system, separate from PORPROV operator module.
  // ────────────────────────────────────────────────────────────────
  {
    label: 'PENTASCORE',
    items: [
      { label: 'Dashboard',     href: '/operator/pentascore',                icon: Sparkles,   tier: 'BASIC', badge: 'BETA' },
      { label: 'Tenants',       href: '/operator/pentascore/tenants',        icon: Building2,  tier: 'BASIC', badge: 'BETA' },
      { label: 'Events',        href: '/operator/pentascore/events',         icon: Layers,     tier: 'BASIC', badge: 'BETA' },
      { label: 'Athletes',      href: '/operator/pentascore/athletes',       icon: Users,      tier: 'BASIC', badge: 'BETA' },
      { label: 'Import Wizard', href: '/operator/pentascore/athletes/import',icon: Zap,        tier: 'BASIC', badge: 'BETA' },
      { label: 'Audit Log',     href: '/operator/pentascore/audit',          icon: ShieldCheck,tier: 'BASIC', badge: 'BETA' },
      { label: 'Cross-Validate',href: '/operator/pentascore/cross-validate', icon: CheckCircle,tier: 'BASIC', badge: 'BETA' },
      { label: 'Demo Seed',     href: '/operator/pentascore/demo-seed',      icon: Wand2,      tier: 'BASIC', badge: 'BETA' },
      { label: 'Health',        href: '/operator/pentascore/health',         icon: Heart,      tier: 'BASIC', badge: 'BETA' },
    ],
  },
]

const TIER_COLORS: Record<TierBadge, string> = {
  BASIC:    'bg-slate-700 text-slate-300',
  PRO:      'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  ELITE:    'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  CHAMPION: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
}

// Map TierBadge → SubscriptionTier (untuk UpgradeModal)
const TIER_TO_SUB: Record<TierBadge, SubscriptionTier> = {
  BASIC: 'basic', PRO: 'pro', ELITE: 'elite', CHAMPION: 'champion',
}

export default function OperatorSidebar({
  user,
  onLogout,
}: {
  user?: { username?: string; cabor?: string; tier?: TierBadge }
  onLogout?: () => void | Promise<void>
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'PENTATHLON MODULE': true,
    ANALYTICS: true,
    INTELLIGENCE: true,
    'LIVE EVENT TOOLS': true,
    PENTASCORE: true,
  })
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean; targetTier: SubscriptionTier
  }>({ open: false, targetTier: 'pro' })

  const toggleCollapsed = () => setCollapsed(prev => !prev)
  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))

  const userTier: TierBadge = user?.tier ?? 'CHAMPION'
  const caborNama = user?.cabor ?? 'Modern Pentathlon'

  // Helper: detect PENTASCORE group for special amber-on-dark styling
  const isPentascoreGroup = (label: string) => label === 'PENTASCORE'
  const isPentascoreActive = pathname?.startsWith('/operator/pentascore')

  return (
    <>
      <aside className={`bg-slate-950 border-r border-slate-800 h-screen sticky top-0 flex flex-col transition-all ${collapsed ? 'w-16' : 'w-64'}`}>

        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {!collapsed && (
            <div>
              <div className="text-amber-400 font-bold text-sm tracking-wide">MODERN PENTATHLON</div>
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
              <span className="text-slate-500 text-xs truncate">{caborNama}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${TIER_COLORS[userTier]}`}>
                {userTier}
              </span>
            </div>
          </div>
        )}

        {/* Menu groups */}
        <nav className="flex-1 overflow-y-auto py-3">
          {MENU_GROUPS.map(group => {
            const isPSGrp = isPentascoreGroup(group.label)
            return (
              <div key={group.label} className={`mb-2 ${isPSGrp ? 'mt-3 pt-3 border-t border-amber-500/20' : ''}`}>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full px-4 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider transition
                      ${isPSGrp
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isPSGrp && <Sparkles size={10} className="text-amber-500" />}
                      {group.label}
                    </span>
                    {openGroups[group.label] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}
                {(collapsed || openGroups[group.label]) && (
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const Icon     = item.icon
                      const isActive = pathname === item.href
                      const needsUpgrade = item.upgradeRequired === true

                      if (needsUpgrade) {
                        return (
                          <button
                            key={item.href}
                            onClick={() => setUpgradeModal({ open: true, targetTier: TIER_TO_SUB[item.tier] })}
                            className="mx-2 w-[calc(100%-16px)] px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition text-slate-600 hover:bg-slate-900 hover:text-slate-400"
                            title={collapsed ? item.label : undefined}
                          >
                            <Icon size={16} className="shrink-0" />
                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate text-left">{item.label}</span>
                                {item.badge && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-violet-400/60 font-bold">
                                    {item.badge}
                                  </span>
                                )}
                                <Lock size={11} className="text-slate-700 shrink-0" />
                              </>
                            )}
                          </button>
                        )
                      }

                      // Pentascore items: amber theme variant
                      const activeClass = isPSGrp
                        ? (isActive
                          ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                          : 'text-amber-100/80 hover:bg-amber-500/5 hover:text-amber-200')
                        : (isActive
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white')

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`mx-2 px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition group ${activeClass}`}
                          title={collapsed ? item.label : undefined}
                        >
                          <Icon size={16} className="shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  item.badge === 'BETA'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-violet-300'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer — logout only */}
        <div className="p-3 border-t border-slate-800">
          {onLogout && (
            <form action={onLogout}>
              {!collapsed ? (
                <button
                  type="submit"
                  className="w-full px-3 py-2 rounded-lg flex items-center gap-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-full p-2 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              )}
            </form>
          )}
        </div>
      </aside>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal(m => ({ ...m, open: false }))}
        currentTier="basic"
        targetTier={upgradeModal.targetTier}
        caborNama={caborNama}
      />
    </>
  )
}
