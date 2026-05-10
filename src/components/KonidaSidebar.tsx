'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, BarChart2, LogOut, ChevronRight, Trophy, ClipboardCheck, User } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function KonidaSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setUser(data)
      fetchCounts(data)
    })
    const interval = setInterval(() => {
      fetch('/api/auth/me').then(r => r.json()).then(data => fetchCounts(data))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchCounts = async (u?: any) => {
    try {
      const kontingen_id = u?.kontingen_id
      if (!kontingen_id) return
      const res = await fetch(`/api/notifications?role=konida&kontingen_id=${kontingen_id}`)
      const data = await res.json()
      setCounts(data)
    } catch {}
  }

  const navItems = [
    { label: 'Dashboard', href: '/konida/dashboard', icon: LayoutDashboard },
    { label: 'Atlet', href: '/konida/atlet', icon: Users },
    { label: 'Kualifikasi', href: '/konida/kualifikasi', icon: ClipboardCheck },
    {
      label: 'Kejuaraan Atlet', href: '/konida/kejuaraan',
      icon: Trophy, notif: counts.kejuaraan ?? 0
    },
    { label: 'Laporan', href: '/konida/laporan', icon: BarChart2 },
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
          <span className="inline-block bg-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded font-semibold tracking-wider border border-amber-500/20">
            KONIDA
          </span>
          {(counts.total ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {counts.total}
            </span>
          )}
        </div>
        {user?.kontingen_nama && (
          <div className="text-slate-500 text-[10px] mt-1 truncate">{user.kontingen_nama}</div>
        )}
        {(counts.ditolak ?? 0) > 0 && (
          <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5">
            <div className="text-red-400 text-[10px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {counts.ditolak} atlet ditolak — perlu direvisi
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">Menu</div>
        {navItems.map(({ label, href, icon: Icon, notif }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all
                ${active
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
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
        })}
      </nav>

      <Link href="/konida/profil"
        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all mb-1">
        <User size={16} />
        <span>Profil</span>
      </Link>

      <div className="px-3 pb-3 border-t border-slate-800 pt-3">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )
}