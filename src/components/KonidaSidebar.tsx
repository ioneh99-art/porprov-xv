'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, BarChart2, LogOut, ChevronRight,
  Trophy, ClipboardCheck, User, MapPin, Monitor,
  CheckSquare, Hotel, FileText, Building2, Shield, Cpu,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// Warna per kontingen — tidak perlu useTenant
const TENANT_COLORS: Record<string, { primary: string; dark: string; nama: string }> = {
  bekasi: { primary: '#E84E0F', dark: '#c43d0a', nama: 'Kota Bekasi' },
  bogor:  { primary: '#16a34a', dark: '#15803d', nama: 'Kota Bogor'  },
  depok:  { primary: '#7c3aed', dark: '#6d28d9', nama: 'Kota Depok'  },
  jabar:  { primary: '#2563eb', dark: '#1d4ed8', nama: 'KONI Jabar'  },
}

function getTenantFromCookie(): string {
  if (typeof window === 'undefined') return 'jabar'
  const match = document.cookie.split('; ').find(c => c.startsWith('tenant_id='))
  return match?.split('=')[1] ?? 'jabar'
}

function getLoginTarget(): string {
  if (typeof window === 'undefined') return '/login'
  const origin = document.cookie.split('; ').find(c => c.startsWith('login_origin='))?.split('=')[1] ?? 'jabar'
  const map: Record<string, string> = {
    bekasi: '/login/bekasi', bogor: '/login/bogor',
    depok: '/login/depok',  superadmin: '/login/superadmin',
    jabar: '/login', konida: '/login', koni_jabar: '/login',
  }
  return map[origin] ?? '/login'
}

export default function KonidaSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [counts, setCounts]   = useState<Record<string, number>>({})
  const [user, setUser]       = useState<any>(null)
  const [userLevel, setUserLevel] = useState<string>('level3')
  const [tenantId, setTenantId]   = useState<string>('jabar')

  useEffect(() => {
    // Baca tenant langsung dari cookie — bukan useTenant()
    setTenantId(getTenantFromCookie())

    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setUser(data)
      // Level dari cookie (lebih reliable)
      const lvl = document.cookie.split('; ').find(c => c.startsWith('user_level='))?.split('=')[1]
        ?? data?.level ?? 'level3'
      setUserLevel(lvl)
      if (data?.kontingen_id) {
        fetch(`/api/notifications?role=konida&kontingen_id=${data.kontingen_id}`)
          .then(r => r.json()).then(setCounts).catch(() => {})
      }
    })

    const iv = setInterval(() => {
      const lvl = document.cookie.split('; ').find(c => c.startsWith('user_level='))?.split('=')[1] ?? 'level3'
      setUserLevel(lvl)
      setTenantId(getTenantFromCookie())
    }, 10000)
    return () => clearInterval(iv)
  }, [])

  const tc = TENANT_COLORS[tenantId] ?? TENANT_COLORS.jabar
  const isPenyelenggara = ['bekasi', 'bogor', 'depok'].includes(tenantId)

  // ─── Logout ──────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      // Clear cookies client-side dulu
      document.cookie = 'tenant_id=; path=/; max-age=0'
      localStorage.removeItem('tenant_id')

      const res  = await fetch('/api/auth/logout', { method: 'POST' })
      const data = await res.json()

      const target = data?.redirect ?? getLoginTarget()
      router.push(target)
      router.refresh()
    } catch {
      router.push(getLoginTarget())
    }
  }

  // ─── Nav ──────────────────────────────────────────────────
  const dashboardHref =
    userLevel === 'level1'       ? '/konida/dashboard/bekasi'
    : userLevel === 'level2'     ? '/konida/dashboard'
    : userLevel === 'koni_jabar' ? '/dashboard'
    : userLevel === 'superadmin' ? '/superadmin'
    : '/konida/dashboard/basic'

  const navKontingen = [
    { label: 'Dashboard',       href: dashboardHref,         icon: LayoutDashboard },
    { label: 'Atlet',           href: '/konida/atlet',        icon: Users           },
    ...(userLevel !== 'level3' ? [
      { label: 'Kualifikasi',   href: '/konida/kualifikasi',  icon: ClipboardCheck  },
    ] : []),
    { label: 'Kejuaraan Atlet', href: '/konida/kejuaraan',    icon: Trophy, notif: counts.kejuaraan ?? 0 },
    ...(userLevel !== 'level3' ? [
      { label: 'Laporan',       href: '/konida/laporan',      icon: BarChart2       },
    ] : []),
  ]

  const navPenyelenggara = [
    { label: 'Command Center',  href: '/konida/penyelenggara',            icon: Monitor     },
    { label: 'Venue & Jadwal',  href: '/konida/penyelenggara/venue',      icon: MapPin      },
    { label: 'Kesiapan Teknis', href: '/konida/penyelenggara/kesiapan',   icon: CheckSquare },
    { label: 'Akomodasi Tamu',  href: '/konida/penyelenggara/akomodasi',  icon: Hotel       },
    { label: 'Laporan Harian',  href: '/konida/penyelenggara/laporan',    icon: FileText    },
  ]

  const showSIPA = ['level1', 'superadmin', 'koni_jabar'].includes(userLevel)
  const showPenyelenggara = isPenyelenggara && userLevel === 'level1'

  // ─── NavItem ──────────────────────────────────────────────
  const NavItem = ({ label, href, icon: Icon, notif }: {
    label: string; href: string; icon: any; notif?: number
  }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all ${
          active ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
        style={active ? { background: `${tc.primary}20`, color: tc.primary } : {}}>
        <Icon size={16} />
        <span className="flex-1">{label}</span>
        {(notif ?? 0) > 0 && (
          <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
            {notif}
          </span>
        )}
        {active && <ChevronRight size={12} />}
      </Link>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-slate-900 border-r border-slate-800 flex flex-col z-20">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${tc.primary}, ${tc.dark})` }}>
            {tc.nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-xs truncate">{tc.nama}</div>
            <div className="text-slate-500 text-[10px]">PORPROV XV · 2026</div>
          </div>
        </div>

        {/* Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block text-[9px] px-2 py-0.5 rounded font-semibold tracking-wider border"
            style={{ background: `${tc.primary}20`, color: tc.primary, borderColor: `${tc.primary}40` }}>
            {userLevel === 'superadmin'   ? '⚡ SA'
              : userLevel === 'koni_jabar' ? '🏛️ KONI Jabar'
              : userLevel === 'level1'     ? '🥇 Gold'
              : userLevel === 'level2'     ? '🥈 Silver'
              : 'KONIDA'}
          </span>
          {(counts.total ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {counts.total}
            </span>
          )}
        </div>

        {user?.kontingen_nama && (
          <div className="text-slate-500 text-[10px] mt-1.5 truncate">{user.kontingen_nama}</div>
        )}
        {(counts.ditolak ?? 0) > 0 && (
          <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5">
            <div className="text-red-400 text-[10px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {counts.ditolak} atlet ditolak
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3 overflow-y-auto space-y-0.5">
        <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">Kontingen</div>
        {navKontingen.map(item => <NavItem key={item.href} {...item} />)}

        {showSIPA && (
          <>
            <div className="h-px bg-slate-800 my-3" />
            <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">AI</div>
            <NavItem label="SIPA Intelligence" href="/konida/sipa" icon={Cpu} />
          </>
        )}

        {showPenyelenggara && (
          <>
            <div className="h-px bg-slate-800 my-3" />
            <div className="flex items-center gap-1.5 px-2 mb-2">
              <Building2 size={10} style={{ color: tc.primary }} />
              <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: tc.primary }}>
                Penyelenggara
              </span>
            </div>
            {navPenyelenggara.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}

        {userLevel === 'superadmin' && (
          <>
            <div className="h-px bg-slate-800 my-3" />
            <NavItem label="Control Center" href="/superadmin" icon={Shield} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 border-t border-slate-800 pt-3 space-y-0.5">
        <NavItem label="Profil" href="/konida/profil" icon={User} />
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )
}