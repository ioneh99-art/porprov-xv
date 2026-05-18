'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, BarChart2, LogOut, ChevronRight,
  Trophy, ClipboardCheck, User, MapPin, Monitor,
  CheckSquare, Hotel, FileText, Building2, Shield, Cpu,
  Download, Lock,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const TENANT_COLORS: Record<string, { primary: string; dark: string; nama: string }> = {
  bekasi: { primary: '#E84E0F', dark: '#c43d0a', nama: 'Kota Bekasi' },
  bogor:  { primary: '#16a34a', dark: '#15803d', nama: 'Kota Bogor'  },
  depok:  { primary: '#7c3aed', dark: '#6d28d9', nama: 'Kota Depok'  },
  jabar:  { primary: '#2563eb', dark: '#1d4ed8', nama: 'KONI Jabar'  },
}

function getCookieVal(name: string): string {
  if (typeof window === 'undefined') return ''
  return document.cookie.split('; ').find(c => c.startsWith(`${name}=`))?.split('=')[1] ?? ''
}

function getLoginTarget(): string {
  if (typeof window === 'undefined') return '/login'
  const map: Record<string, string> = {
    bekasi: '/login/bekasi', bogor: '/login/bogor',
    depok:  '/login/depok',  superadmin: '/login/superadmin',
    jabar:  '/login', konida: '/login', koni_jabar: '/login',
  }
  return map[getCookieVal('login_origin')] ?? '/login'
}

// Locked menu item — tampil tapi disable dengan tooltip upgrade
function LockedNavItem({ label, icon: Icon, plan }: {
  label: string; icon: any; plan: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 cursor-not-allowed opacity-40 relative group">
      <Icon size={16} className="text-slate-600"/>
      <span className="flex-1 text-slate-600 text-sm">{label}</span>
      <Lock size={10} className="text-slate-600"/>
      {/* Tooltip */}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block">
        <div className="bg-slate-800 border border-slate-700 text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
          🔒 Butuh paket <span className="font-bold text-yellow-400">{plan}</span>
        </div>
      </div>
    </div>
  )
}

export default function KonidaSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]           = useState<any>(null)
  const [features, setFeatures]   = useState<string[]>([])
  const [planId, setPlanId]       = useState<string>('basic')
  const [counts, setCounts]       = useState<Record<string, number>>({})
  const [userLevel, setUserLevel] = useState<string>('level3')
  const [tenantId, setTenantId]   = useState<string>('jabar')
  const [mounted, setMounted]     = useState(false)

  useEffect(() => {
    setMounted(true)
    const lvl = getCookieVal('user_level')
    const tid = getCookieVal('tenant_id')
    if (lvl) setUserLevel(lvl)
    if (tid) setTenantId(tid)

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) return
        setUser(data)
        setFeatures(data.features ?? [])
        setPlanId(data.plan_id ?? 'basic')
        const cookieLvl = getCookieVal('user_level')
        const cookieTid = getCookieVal('tenant_id')
        setUserLevel(cookieLvl || data?.level || 'level3')
        setTenantId(cookieTid || 'jabar')
        if (data?.kontingen_id) {
          fetch(`/api/notifications?role=konida&kontingen_id=${data.kontingen_id}`)
            .then(r => r.json()).then(setCounts).catch(() => {})
        }
      })
      .catch(() => {})

    const iv = setInterval(() => {
      const lvl = getCookieVal('user_level')
      const tid = getCookieVal('tenant_id')
      if (lvl) setUserLevel(lvl)
      if (tid) setTenantId(tid)
    }, 10000)
    return () => clearInterval(iv)
  }, [pathname])

  // Feature check helpers
  const can = (f: string) => features.includes(f)
  const tc  = TENANT_COLORS[tenantId] ?? TENANT_COLORS.jabar
  const isPenyelenggara = ['bekasi','bogor','depok'].includes(tenantId)

  // Plan label untuk tooltip
  const planLabel: Record<string, string> = {
    basic:'Basic', standard:'Standard', premium:'Premium', enterprise:'Enterprise'
  }
  const upgradeTo = (need: string) => {
    const order = ['basic','standard','premium','enterprise']
    return order.find(p => order.indexOf(p) > order.indexOf(planId)) ?? 'Premium'
  }

  // Logout
  const handleLogout = async () => {
    try {
      document.cookie = 'tenant_id=; path=/; max-age=0'
      document.cookie = 'user_level=; path=/; max-age=0'
      localStorage.removeItem('tenant_id')
      const res  = await fetch('/api/auth/logout', { method:'POST' })
      const data = await res.json()
      router.push(data?.redirect ?? getLoginTarget())
      router.refresh()
    } catch { router.push(getLoginTarget()) }
  }

  // Dashboard href
  const dashboardHref =
    userLevel === 'level1'       ? '/konida/dashboard/bekasi'
    : userLevel === 'level2'     ? '/konida/dashboard'
    : userLevel === 'koni_jabar' ? '/dashboard'
    : userLevel === 'superadmin' ? '/superadmin'
    : '/konida/dashboard/basic'

  // NavItem
  const NavItem = ({ label, href, icon: Icon, notif }: {
    label: string; href: string; icon: any; notif?: number
  }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all ${
          active ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
        style={active ? { background:`${tc.primary}20`, color:tc.primary } : {}}>
        <Icon size={16}/>
        <span className="flex-1">{label}</span>
        {(notif ?? 0) > 0 && (
          <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
            {notif}
          </span>
        )}
        {active && <ChevronRight size={12}/>}
      </Link>
    )
  }

  if (!mounted) return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-slate-900 border-r border-slate-800 z-20"/>
  )

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-slate-900 border-r border-slate-800 flex flex-col z-20">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background:`linear-gradient(135deg,${tc.primary},${tc.dark})` }}>
            {tc.nama.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div suppressHydrationWarning className="text-white font-semibold text-xs truncate">
              {mounted ? tc.nama : 'PORPROV XV'}
            </div>
            <div className="text-slate-500 text-[10px]">PORPROV XV · 2026</div>
          </div>
        </div>

        {/* Badge level + plan */}
        <div className="flex items-center gap-2 flex-wrap">
          <span suppressHydrationWarning
            className="inline-block text-[9px] px-2 py-0.5 rounded font-semibold tracking-wider border"
            style={{ background:`${tc.primary}20`, color:tc.primary, borderColor:`${tc.primary}40` }}>
            {!mounted ? 'KONIDA'
              : userLevel === 'superadmin'   ? '⚡ SA'
              : userLevel === 'koni_jabar'   ? '🏛️ KONI Jabar'
              : userLevel === 'level1'       ? '🥇 Gold'
              : userLevel === 'level2'       ? '🥈 Silver'
              : 'KONIDA'}
          </span>
          {/* Plan badge */}
          {mounted && planId && (
            <span className="inline-block text-[9px] px-2 py-0.5 rounded font-semibold"
              style={{
                background: planId==='premium'||planId==='enterprise' ? 'rgba(245,197,24,0.15)' : 'rgba(100,116,139,0.15)',
                color: planId==='premium'||planId==='enterprise' ? '#F5C518' : '#64748b',
              }}>
              {planId==='basic'?'🏅':planId==='standard'?'🥈':planId==='premium'?'🥇':'⚡'} {planId}
            </span>
          )}
          {(counts.total ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>
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
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>
              {counts.ditolak} atlet ditolak
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3 overflow-y-auto space-y-0.5">
        <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">Kontingen</div>

        {/* Dashboard — semua bisa */}
        <NavItem label="Dashboard" href={dashboardHref} icon={LayoutDashboard}/>

        {/* Atlet — semua bisa */}
        <NavItem label="Atlet" href="/konida/atlet" icon={Users}/>

        {/* Kualifikasi — standard+ */}
        {can('kualifikasi')
          ? <NavItem label="Kualifikasi" href="/konida/kualifikasi" icon={ClipboardCheck}/>
          : <LockedNavItem label="Kualifikasi" icon={ClipboardCheck} plan="Standard"/>
        }

        {/* Kejuaraan — semua bisa */}
        <NavItem label="Kejuaraan Atlet" href="/konida/kejuaraan" icon={Trophy} notif={counts.kejuaraan ?? 0}/>

        {/* Laporan — standard+ */}
        {can('laporan')
          ? <NavItem label="Laporan" href="/konida/laporan" icon={BarChart2}/>
          : <LockedNavItem label="Laporan" icon={BarChart2} plan="Standard"/>
        }

        {/* Export — premium+ */}
        {can('export_pdf') && (
          <NavItem label="Export PDF" href="/konida/export" icon={Download}/>
        )}

        {/* SIPA — premium+ */}
        {can('sipa_full') ? (
          <>
            <div className="h-px bg-slate-800 my-3"/>
            <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">AI</div>
            <NavItem label="SIPA Intelligence" href="/konida/sipa" icon={Cpu}/>
          </>
        ) : (
          <>
            <div className="h-px bg-slate-800 my-3"/>
            <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">AI</div>
            <LockedNavItem label="SIPA Intelligence" icon={Cpu} plan="Premium"/>
          </>
        )}

        {/* Penyelenggara — premium + isPenyelenggara */}
        {isPenyelenggara && (
          <>
            <div className="h-px bg-slate-800 my-3"/>
            <div className="flex items-center gap-1.5 px-2 mb-2">
              <Building2 size={10} style={{ color:tc.primary }}/>
              <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color:tc.primary }}>
                Penyelenggara
              </span>
            </div>
            {can('command_center')
              ? <NavItem label="Command Center"  href="/konida/penyelenggara"             icon={Monitor}    />
              : <LockedNavItem label="Command Center" icon={Monitor} plan="Premium"/>
            }
            {can('venue_jadwal')
              ? <NavItem label="Venue & Jadwal"  href="/konida/penyelenggara/venue"       icon={MapPin}     />
              : <LockedNavItem label="Venue & Jadwal" icon={MapPin} plan="Premium"/>
            }
            {can('kesiapan_teknis')
              ? <NavItem label="Kesiapan Teknis" href="/konida/penyelenggara/kesiapan"    icon={CheckSquare}/>
              : <LockedNavItem label="Kesiapan Teknis" icon={CheckSquare} plan="Premium"/>
            }
            {can('akomodasi')
              ? <NavItem label="Akomodasi Tamu"  href="/konida/penyelenggara/akomodasi"   icon={Hotel}      />
              : <LockedNavItem label="Akomodasi Tamu" icon={Hotel} plan="Premium"/>
            }
            {can('laporan_harian')
              ? <NavItem label="Laporan Harian"  href="/konida/penyelenggara/laporan"     icon={FileText}   />
              : <LockedNavItem label="Laporan Harian" icon={FileText} plan="Premium"/>
            }
          </>
        )}

        {/* Superadmin shortcut */}
        {userLevel === 'superadmin' && (
          <>
            <div className="h-px bg-slate-800 my-3"/>
            <NavItem label="Control Center" href="/superadmin" icon={Shield}/>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-3 border-t border-slate-800 pt-3 space-y-0.5">
        <NavItem label="Profil" href="/konida/profil" icon={User}/>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut size={16}/>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )
}