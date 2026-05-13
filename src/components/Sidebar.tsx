'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Trophy, UserSquare2,
  Database, BarChart2, Settings, ChevronRight,
  LogOut, ShieldCheck, Medal, ClipboardCheck,
  UserCog, FileUp, CreditCard,
  User,
  MapPin,
  Sparkles
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchCounts = async () => {
    try {
      const res = await fetch('/api/notifications?role=admin')
      const data = await res.json()
      setCounts(data)
    } catch {}
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Manajemen User', href: '/dashboard/users', icon: UserCog },
    { label: 'SIPA Intelligence', href: '/dashboard/ai', icon: Sparkles },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
    { label: 'Import Data', href: '/dashboard/import', icon: FileUp },
    { label: 'Atlet', href: '/dashboard/atlet', icon: Users, badge: '24K' },
    {
      label: 'Verifikasi', href: '/dashboard/verifikasi', icon: ShieldCheck,
      notif: counts.atlet ?? 0
    },
    { label: 'Kualifikasi', href: '/dashboard/kualifikasi', icon: ClipboardCheck },
    {
      label: 'Kejuaraan', href: '/dashboard/kejuaraan', icon: Trophy,
      notif: counts.kejuaraan ?? 0
    },
    { label: 'Kontingen', href: '/dashboard/kontingen', icon: UserSquare2 },
    { label: 'Venue', href: '/dashboard/venue', icon: MapPin },
  ]

  const dataItems = [
    { label: 'Master', href: '/dashboard/master', icon: Database },
    { label: 'Laporan', href: '/dashboard/laporan', icon: BarChart2 },
    { label: 'Kartu Atlet', href: '/dashboard/kartu', icon: CreditCard },
  ]

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="text-white font-semibold text-sm">PORPROV XV</div>
        <div className="text-slate-500 text-xs mt-0.5">Jawa Barat 2026</div>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-block bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded font-semibold tracking-wider">
            ADMIN
          </span>
          {counts.total > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {counts.total} pending
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">Menu</div>
        {navItems.map(({ label, href, icon: Icon, badge, notif }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all group
                ${active
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {/* Badge static */}
              {badge && !notif && (
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
              {/* Badge notifikasi dinamis */}
             {(notif ?? 0) > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                  {notif}
                </span>
              )}
              {active && <ChevronRight size={12} className="text-blue-400" />}
            </Link>
          )
        })}

        <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mt-4 mb-2">Data</div>
        {dataItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all
                ${active ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          )
        })}

        <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mt-4 mb-2">Sistem</div>
        <Link href="/dashboard/settings"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm text-slateate-400 hover:bg-slate-800 hover:text-slate-200 transition-all">
          <Settings size={16} />
          <span>Pengaturan</span>
        </Link>
      </nav>

      <Link href="/dashboard/profil"
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all">
        <User size={16} />
        <span>Profil</span>
      </Link>

      <div className="px-3 pb-1">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>

      <div className="px-4 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
            AD
          </div>
          <div>
            <div className="text-slate-300 text-xs font-medium">Admin</div>
            <div className="text-slate-600 text-[10px]">Super Admin</div>
          </div>
        </div>
      </div>
    </aside>
  )
}