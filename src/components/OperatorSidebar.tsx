'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, Trophy,
  LogOut, ChevronRight, ShieldCheck
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/operator/dashboard', icon: LayoutDashboard },
  { label: 'Verifikasi Atlet', href: '/operator/verifikasi', icon: ShieldCheck },
  { label: 'Nomor Pertandingan', href: '/operator/nomor', icon: ClipboardList },
  { label: 'Input Hasil', href: '/operator/hasil', icon: Trophy },
]

export default function OperatorSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="text-white font-semibold text-sm">PORPROV XV</div>
        <div className="text-slate-500 text-xs mt-0.5">Jawa Barat 2026</div>
        <span className="inline-block mt-2 bg-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-semibold tracking-wider border border-emerald-500/20">
          OPERATOR CABOR
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">Menu</div>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all
                ${active
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
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