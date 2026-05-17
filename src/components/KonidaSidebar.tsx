'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, BarChart2, LogOut, ChevronRight,
  Trophy, ClipboardCheck, User, MapPin, Monitor,
  CheckSquare, Hotel, FileText, Building2, Shield,
  Cpu, Layers, BarChart,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTenant, clearTenant } from '@/hooks/useTenant'

export default function KonidaSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const tenant   = useTenant()
  const [counts, setCounts]   = useState<Record<string, number>>({})
  const [user, setUser]       = useState<any>(null)
  const [userLevel, setUserLevel] = useState<string>('level3')

  const isPenyelenggara = ['bekasi', 'bogor', 'depok'].includes(tenant.id)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setUser(data)
      // Ambil level dari cookie (di-set saat login)
      const lvlCookie = document.cookie
        .split('; ').find(r => r.startsWith('user_level='))?.split('=')[1]
      setUserLevel(lvlCookie ?? data?.level ?? 'level3')
      fetchCounts(data)
    })
    const iv = setInterval(() => {
      fetch('/api/auth/me').then(r => r.json()).then(d => fetchCounts(d))
    }, 30000)
    return () => clearInterval(iv)
  }, [])

  const fetchCounts = async (u?: any) => {
    try {
      const kid = u?.kontingen_id
      if (!kid) return
      const res  = await fetch(`/api/notifications?role=konida&kontingen_id=${kid}`)
      const data = await res.json()
      setCounts(data)
    } catch {}
  }

  // ─── Logout: baca login_origin cookie → redirect ke login yg benar ──
  const handleLogout = async () => {
    try {
      const res  = await fetch('/api/auth/logout', { method: 'POST' })
      const data = await res.json()
      clearTenant()
      // Prioritas: dari API response, lalu dari cookie client
      const target = data?.redirect ?? getLoginFromCookie()
      router.push(target)
      router.refresh()
    } catch {
      router.push(getLoginFromCookie())
    }
  }

  const getLoginFromCookie = (): string => {
    const origin = document.cookie
      .split('; ').find(r => r.startsWith('login_origin='))?.split('=')[1] ?? 'konida'
    const map: Record<string, string> = {
      bekasi:     '/login/bekasi',
      bogor:      '/login/bogor',
      depok:      '/login/depok',
      superadmin: '/login/superadmin',
      jabar:      '/login/jabar',
      konida:     '/login/jabar',
    }
    return map[origin] ?? '/login/jabar'
  }

  // ─── Nav items per section ─────────────────────────────────────────

  // Dashboard link sesuai level
  const dashboardHref =
    userLevel === 'level1'     ? '/konida/dashboard/bekasi'
    : userLevel === 'level2'   ? '/konida/dashboard'
    : userLevel === 'superadmin' ? '/superadmin'
    : '/konida/dashboard/basic'

  const navKontingen = [
    { label: 'Dashboard',      href: dashboardHref,          icon: LayoutDashboard },
    { label: 'Atlet',          href: '/konida/atlet',         icon: Users },
    // Level 3 tidak dapat kualifikasi
    ...(userLevel !== 'level3' ? [
      { label: 'Kualifikasi',  href: '/konida/kualifikasi',   icon: ClipboardCheck },
    ] : []),
    { label: 'Kejuaraan Atlet',href: '/konida/kejuaraan',     icon: Trophy, notif: counts.kejuaraan ?? 0 },
    // Level 3 tidak dapat laporan
    ...(userLevel !== 'level3' ? [
      { label: 'Laporan',      href: '/konida/laporan',       icon: BarChart2 },
    ] : []),
  ]

  const navPenyelenggara = [
    { label: 'Command Center', href: '/konida/penyelenggara',              icon: Monitor    },
    { label: 'Venue & Jadwal', href: '/konida/penyelenggara/venue',        icon: MapPin     },
    { label: 'Kesiapan Teknis',href: '/konida/penyelenggara/kesiapan',     icon: CheckSquare},
    { label: 'Akomodasi Tamu', href: '/konida/penyelenggara/akomodasi',    icon: Hotel      },
    { label: 'Laporan Harian', href: '/konida/penyelenggara/laporan',      icon: FileText   },
  ]

  // SIPA — level1 & superadmin only
  const navAI = userLevel === 'level1' || userLevel === 'superadmin'
    ? [{ label: 'SIPA Intelligence', href: '/konida/sipa', icon: Cpu }]
    : []

  // ─── NavItem component ─────────────────────────────────────────────
  const NavItem = ({ label, href, icon: Icon, notif }: {
    label: string; href: string; icon: any; notif?: number
  }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all ${
          active ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
        style={active ? { background: `${tenant.primary}20`, color: tenant.primary } : {}}>
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

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${tenant.primary}, ${tenant.primaryDark})` }}>
            {tenant.nama.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-xs truncate">{tenant.nama}</div>
            <div className="text-slate-500 text-[10px]">PORPROV XV · 2026</div>
          </div>
        </div>

        {/* Badge level */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block text-[9px] px-2 py-0.5 rounded font-semibold tracking-wider border"
            style={{ background:`${tenant.primary}20`, color:tenant.primary, borderColor:`${tenant.primary}40` }}>
            {userLevel === 'superadmin' ? '⚡ SA'
              : userLevel === 'level1' ? '🥇 Gold'
              : userLevel === 'level2' ? '🥈 Silver'
              : 'KONIDA'}
          </span>
          {isPenyelenggara && userLevel === 'level1' && (
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-semibold"
              style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)' }}>
              🏟️ {tenant.badge}
            </span>
          )}
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

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 pt-3 overflow-y-auto space-y-0.5">

        {/* Kontingen */}
        <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">Kontingen</div>
        {navKontingen.map(item => <NavItem key={item.href} {...item} />)}

        {/* SIPA — level1 only */}
        {navAI.length > 0 && (
          <>
            <div className="h-px bg-slate-800 my-3" />
            <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">AI</div>
            {navAI.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}

        {/* Penyelenggara — level1 + isPenyelenggara */}
        {isPenyelenggara && userLevel === 'level1' && (
          <>
            <div className="h-px bg-slate-800 my-3" />
            <div className="flex items-center gap-1.5 px-2 mb-2">
              <Building2 size={10} style={{ color: tenant.primary }} />
              <span className="text-[10px] uppercase tracking-widest font-medium"
                style={{ color: tenant.primary }}>Penyelenggara</span>
            </div>
            {navPenyelenggara.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}

        {/* Superadmin shortcut */}
        {userLevel === 'superadmin' && (
          <>
            <div className="h-px bg-slate-800 my-3" />
            <NavItem label="Control Center" href="/superadmin" icon={Shield} />
          </>
        )}
      </nav>

      {/* ── Profil & Logout ── */}
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