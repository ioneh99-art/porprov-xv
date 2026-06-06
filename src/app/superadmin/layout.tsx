'use client'
// src/app/superadmin/layout.tsx
// Layout wrapper — JARVIS COMMAND CENTER THEME

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2, CheckCircle, Cpu, FileSearch, FileText,
  Flame, Globe, Grid, LogOut, Package,
  Server, Sparkles,
  Terminal
} from 'lucide-react'
import { useEffect, useState } from 'react'

const LAYOUT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
  .font-sci { font-family: 'Rajdhani', sans-serif; }
  .font-lcd { font-family: 'Orbitron', sans-serif; }
  .bg-grid {
    background-image:
      radial-gradient(circle at 50% 50%, #0a192f 0%, #030712 100%),
      linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px);
    background-size: 100% 100%, 30px 30px, 30px 30px;
  }
  .scanline {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0, 243, 255, 0.1) 50%, rgba(255,255,255,0));
    background-size: 100% 4px; pointer-events: none; z-index: 50; opacity: 0.3;
  }
  .text-glow { text-shadow: 0 0 8px #00f3ff; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,243,255,0.4); }
`

const C = {
  primary: '#00f3ff', // Cyan Neon
  secondary: '#00ff66', // Green Neon
  alert: '#ff3366',
  bg: '#030712',
  bgPanel: 'rgba(10, 25, 47, 0.4)',
  border: 'rgba(0, 243, 255, 0.2)',
  text: '#f1f5f9', 
  muted: '#7a8b9e',
}

const NAV = [
  { section: 'SYSTEM_MAIN' },
  { icon: Grid,        label: 'DASHBOARD_HQ',       path: '/superadmin'                  },
  { icon: Globe,       label: 'OBSERVATORY',        path: '/superadmin/observatory'      },
  { icon: Package,     label: 'SUBSCRIPTIONS',      path: '/superadmin/subscriptions'    },
  { icon: Building2,  label: 'TENANTS_CONFIG',     path: '/superadmin/tenants'          },
  { section: 'OPERATIONS_PROTOCOL' },
  { icon: CheckCircle, label: 'VERIF_CENTER',       path: '/superadmin/verif'            },
  { icon: FileSearch,  label: 'INTEGRITY_SCAN',     path: '/superadmin/integrity'        },
  { icon: Cpu,         label: 'AI_MONITOR',         path: '/superadmin/ai'               },
  { icon: Server,      label: 'SYSTEM_HEALTH',      path: '/superadmin/system'           },
  { icon: FileText,    label: 'AUDIT_LOGS',         path: '/superadmin/logs'             },
  { section: 'QUICK_UPLINK' },
  { icon: Flame,       label: 'INVOICES',           path: '/superadmin/invoices'     },
  { icon: Sparkles,    label: 'AI_SPORT_INTEL',     path: '/superadmin/ai'               },
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
    <div className="flex h-screen overflow-hidden font-sci" style={{ background: C.bg }}>
      
      {/* Global Sci-Fi Styles */}
      <style dangerouslySetInnerHTML={{ __html: LAYOUT_CSS }} />
      
      <div className="fixed inset-0 bg-grid pointer-events-none z-0"/>
      <div className="scanline"/>

      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r overflow-y-auto relative z-10 backdrop-blur-md"
        style={{ background: 'rgba(3,7,18,0.8)', borderColor: C.border }}>

        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-3 border-b border-[#00f3ff]/30 bg-[#00f3ff]/5">
          <div className="w-10 h-10 border border-[#00f3ff] flex items-center justify-center flex-shrink-0 relative bg-cyan-950/50">
            <div className="absolute inset-0 bg-[#00f3ff]/20 animate-pulse"/>
            <Terminal size={18} className="text-[#00f3ff] z-10" />
          </div>
          <div className="min-w-0">
            <div className="text-[#00f3ff] font-lcd font-bold text-sm tracking-widest text-glow truncate">ROOT_ACCESS</div>
            <div className="text-[10px] font-mono text-[#00ff66] mt-0.5 uppercase tracking-widest flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse"/> Super Admin
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV.map((item, i) => {
            if ('section' in item) return (
              <p key={i} className="text-[9px] font-lcd font-bold text-[#00f3ff]/60 tracking-widest px-2 mb-2 mt-6 first:mt-0 uppercase flex items-center gap-2">
                <span className="w-2 h-px bg-[#00f3ff]/40"/> {item.section} <span className="flex-1 h-px bg-[#00f3ff]/10"/>
              </p>
            )
            const active = pathname === item.path || (item.path !== '/superadmin' && pathname.startsWith(item.path))
            return (
              <Link key={item.path} href={item.path}
                className="flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider transition-all group"
                style={{
                  color: active ? '#00f3ff' : C.muted,
                  background: active ? 'rgba(0,243,255,0.1)' : 'transparent',
                  borderLeft: active ? `3px solid ${C.primary}` : '3px solid transparent',
                  textShadow: active ? `0 0 8px ${C.primary}` : 'none'
                }}>
                <item.icon size={15} style={{ color: active ? C.primary : 'inherit' }} className="group-hover:text-[#00f3ff] transition-colors"/>
                <span className="group-hover:text-[#00f3ff] transition-colors">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-4 pb-4 pt-4 border-t border-[#00f3ff]/30 bg-slate-900/50">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 border border-slate-700/50 bg-black/40">
            <div className="w-8 h-8 flex items-center justify-center text-[#ffb000] text-xs font-lcd font-bold border border-[#ffb000]/50 bg-[#ffb000]/10">
              SA
            </div>
            <div className="flex-1 min-w-0 font-mono">
              <div className="text-xs font-bold text-white truncate">{user?.nama ?? 'SYS_ADMIN'}</div>
              <div className="text-[9px] text-[#00f3ff]/70 truncate">{user?.email ?? 'root@porprov.gov'}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono tracking-widest text-[#ff3366] hover:bg-[#ff3366]/10 border border-transparent hover:border-[#ff3366]/30 transition-all uppercase">
            <LogOut size={14} />
            <span>TERMINATE_SESSION</span>
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {children}
      </main>
    </div>
  )
}