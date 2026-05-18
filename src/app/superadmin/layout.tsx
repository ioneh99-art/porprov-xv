'use client'
// src/app/superadmin/layout.tsx
// Layout wrapper — sidebar otomatis muncul di semua halaman superadmin

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity, CheckCircle, Cpu, FileSearch,
  Flame, Grid, Layers, LogOut, Package,
  Server, Shield, Sparkles, Trophy, UserCog, Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const C = {
  primary: '#ef4444', secondary: '#f97316',
  bg: '#0b0e14', border: 'rgba(255,255,255,0.07)',
  text: '#f1f5f9', muted: '#64748b',
}

const NAV = [
  { section: 'Main' },
  { icon: Grid,        label: 'Dashboard',       path: '/superadmin'                  },
  { icon: Users,       label: 'Manajemen User',  path: '/superadmin/users'            },
  { icon: Package,     label: 'Subscriptions',   path: '/superadmin/subscriptions'    },
  { section: 'Operasional' },
  { icon: CheckCircle, label: 'Verifikasi',       path: '/superadmin/verif'            },
  { icon: Cpu,         label: 'AI Monitor',       path: '/superadmin/ai'               },
  { icon: Server,      label: 'System Health',    path: '/superadmin/system'           },
  { icon: FileSearch,  label: 'Audit Logs',       path: '/superadmin/logs'             },
  { section: 'Quick Nav' },
  { icon: Flame,       label: 'War Room Bekasi',  path: '/konida/dashboard/bekasi'     },
  { icon: Sparkles,    label: 'SIPA Console',     path: '/konida/sipa'                 },
]

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data?.role !== 'superadmin') router.push('/login')
      else setUser(data)
    })
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: C.bg }}>

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ background: C.bg, borderColor: C.border }}>

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b" style={{ borderColor: C.border }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})` }}>
            <Shield size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-white font-black text-sm leading-none">PORPROV XV</div>
            <div className="text-[10px] font-bold mt-0.5" style={{ color: C.secondary }}>Super Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item, i) => {
            if ('section' in item) return (
              <p key={i} className="text-[9px] font-black uppercase tracking-[2px] px-3 mb-2 mt-4 first:mt-0"
                style={{ color: `${C.muted}80` }}>
                {item.section}
              </p>
            )
            const active = pathname === item.path || (item.path !== '/superadmin' && pathname.startsWith(item.path))
            return (
              <Link key={item.path} href={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  color: active ? C.text : C.muted,
                  fontWeight: active ? 600 : 400,
                  background: active
                    ? `linear-gradient(135deg,${C.primary}25,${C.secondary}15)`
                    : 'transparent',
                  border: active ? `1px solid ${C.primary}30` : '1px solid transparent',
                }}>
                <item.icon size={15} style={{ color: active ? C.secondary : 'inherit' }} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 pb-4 pt-3 border-t space-y-1" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${C.primary},${C.secondary})` }}>
              SA
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.nama ?? 'Super Admin'}</div>
              <div className="text-[10px] truncate" style={{ color: C.muted }}>{user?.email ?? ''}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:text-red-400"
            style={{ color: C.muted }}>
            <LogOut size={15} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}