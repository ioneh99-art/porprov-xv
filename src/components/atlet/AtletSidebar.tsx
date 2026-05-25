'use client'
// src/components/atlet/AtletSidebar.tsx — v2
// Theme: slate-950 dark navy (sama kayak superadmin)

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Trophy, Calendar, Medal,
  Wallet, User, FileText, QrCode, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Shield
} from 'lucide-react'

const C = {
  bg:'#0b0e14', bgCard:'#111827', border:'rgba(255,255,255,0.07)',
  primary:'#10b981', muted:'#64748b', text:'#f1f5f9',
}

const STATUS_COLOR: Record<string,string> = {
  'Verified':'#10b981', 'Posted':'#3b82f6',
  'Menunggu Admin':'#f59e0b', 'Ditolak Admin':'#ef4444',
}

const NAV = [
  {
    group:'Utama',
    items:[
      {href:'/atlet/dashboard', icon:LayoutDashboard, label:'Dashboard',       desc:'Ringkasan & KPI'},
      {href:'/atlet/jadwal',    icon:Calendar,        label:'Jadwal Tanding',  desc:'Nomor & venue'},
      {href:'/atlet/hasil',     icon:Medal,           label:'Hasil & Medali',  desc:'Perolehan medali'},
    ],
  },
  {
    group:'Administrasi',
    items:[
      {href:'/atlet/bonus',     icon:Wallet,    label:'Status Bonus',    desc:'Estimasi & SPJ'},
      {href:'/atlet/profil',    icon:User,      label:'Profil Saya',     desc:'Data & apparel'},
      {href:'/atlet/kejuaraan', icon:Trophy,    label:'Riwayat Juara',   desc:'Track record'},
    ],
  },
  {
    group:'Dokumen',
    items:[
      {href:'/atlet/dokumen',   icon:FileText,  label:'Dokumen',         desc:'Sertifikat'},
      {href:'/atlet/idcard',    icon:QrCode,    label:'ID Card',         desc:'QR digital'},
    ],
  },
]

interface MeData {
  nama_lengkap: string
  cabor_nama_raw: string
  status_registrasi: string
  login_count: number
}

export default function AtletSidebar() {
  const pathname     = usePathname()
  const router       = useRouter()
  const [me,          setMe]          = useState<MeData|null>(null)
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  useEffect(() => {
    fetch('/api/atlet/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setMe(d))
  }, [])

  async function logout() {
    await fetch('/api/atlet/logout', { method:'POST' })
    document.cookie = 'atlet_token=; path=/; max-age=0'
    router.push('/atlet/login')
  }

  const isActive = (href: string) =>
    href==='/atlet/dashboard' ? pathname===href : pathname.startsWith(href)

  const Inner = () => (
    <div className="flex flex-col h-full" style={{ background:C.bg }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom:`1px solid ${C.border}` }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.25)' }}>
              <Trophy size={16} style={{ color:C.primary }}/>
            </div>
            <div>
              <div className="text-white text-xs font-bold">Portal Atlet</div>
              <div className="text-[9px] font-bold tracking-wider" style={{ color:C.primary }}>PORPROV XV · 2026</div>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(c=>!c)}
          className="hidden lg:flex p-1.5 rounded-lg transition-colors hover:bg-slate-800"
          style={{ color:C.muted, marginLeft:collapsed?'auto':'0' }}>
          {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
        </button>
        <button onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg" style={{ color:C.muted }}>
          <X size={14}/>
        </button>
      </div>

      {/* Profile card */}
      {me && (
        <div className="mx-3 mt-3 p-3 rounded-xl"
          style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.border}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)' }}>
              <User size={15} style={{ color:C.primary }}/>
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-white text-xs font-bold truncate">{me.nama_lengkap}</div>
                <div className="text-[10px] truncate" style={{ color:C.muted }}>{me.cabor_nama_raw}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ background:STATUS_COLOR[me.status_registrasi]||C.primary }}/>
                  <span className="text-[9px]"
                    style={{ color:STATUS_COLOR[me.status_registrasi]||C.primary }}>
                    {me.status_registrasi}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4"
        style={{ scrollbarWidth:'thin', scrollbarColor:`${C.border} transparent` }}>
        {NAV.map(group => (
          <div key={group.group}>
            {!collapsed && (
              <div className="text-[9px] font-black tracking-[0.15em] px-3 mb-1.5 uppercase"
                style={{ color:'rgba(100,116,139,0.6)' }}>
                {group.group}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
                    style={{
                      background: active ? 'rgba(16,185,129,0.1)' : 'transparent',
                      border:`1px solid ${active ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
                    }}>
                    <item.icon size={15}
                      style={{ color:active ? C.primary : C.muted, flexShrink:0 }}
                      className="group-hover:text-emerald-400 transition-colors"/>
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold leading-tight"
                          style={{ color:active ? C.primary : 'rgba(241,245,249,0.7)' }}>
                          {item.label}
                        </div>
                        <div className="text-[10px] leading-tight" style={{ color:C.muted }}>
                          {item.desc}
                        </div>
                      </div>
                    )}
                    {active && !collapsed && (
                      <div className="ml-auto w-1 h-4 rounded-full" style={{ background:C.primary }}/>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="p-3" style={{ borderTop:`1px solid ${C.border}` }}>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-red-500/10 group"
          style={{ color:C.muted }}>
          <LogOut size={14} className="flex-shrink-0 group-hover:text-red-400 transition-colors"/>
          {!collapsed && (
            <span className="text-xs font-semibold group-hover:text-red-400 transition-colors">
              Keluar
            </span>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background:C.bgCard, border:`1px solid ${C.border}` }}>
        <Menu size={16} style={{ color:C.primary }}/>
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-64 z-50">
            <Inner/>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0 h-screen sticky top-0 transition-all duration-300 overflow-hidden"
        style={{
          width: collapsed ? '64px' : '220px',
          borderRight:`1px solid ${C.border}`,
        }}>
        <Inner/>
      </div>
    </>
  )
}