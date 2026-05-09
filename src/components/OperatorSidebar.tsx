'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, Trophy,
  LogOut, ChevronRight, ShieldCheck, ClipboardCheck, Calendar 
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function OperatorSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Ambil session user
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
      const cabor_id = u?.cabor_id
      if (!cabor_id) return
      const res = await fetch(`/api/notifications?role=operator_cabor&cabor_id=${cabor_id}`)
      const data = await res.json()
      setCounts(data)
    } catch {}
  }

  const navItems = [
    { label: 'Dashboard', href: '/operator/dashboard', icon: LayoutDashboard },
    {
      label: 'Verifikasi Atlet', href: '/operator/verifikasi',
      icon: ShieldCheck, notif: counts.atlet ?? 0
    },
    {
      label: 'Lineup', href: '/operator/kualifikasi',
      icon: ClipboardCheck, notif: counts.kualifikasi ?? 0
    },
    {
      label: 'Kejuaraan Atlet', href: '/operator/kejuaraan',
      icon: Trophy, notif: counts.kejuaraan ?? 0
    },
    { label: 'Nomor Pertandingan', href: '/operator/nomor', icon: ClipboardList },
    { label: 'Jadwal', href: '/operator/jadwal', icon: Calendar },
    { label: 'Input Hasil', href: '/operator/hasil', icon: Trophy },
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
          <span className="inline-block bg-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-semibold tracking-wider border border-emerald-500/20">
            OPERATOR CABOR
          </span>
          {(counts.total ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {counts.total}
            </span>
          )}
        </div>
        {user?.cabor_nama && (
          <div className="text-slate-500 text-[10px] mt-1 truncate">{user.cabor_nama}</div>
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
                  ? 'bg-emerald-500/10 text-emerald-400'
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