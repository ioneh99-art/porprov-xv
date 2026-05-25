'use client'
// src/components/atlet/AtletSidebar.tsx
// Sidebar navigasi portal atlet — responsive + collapsible

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Trophy, Calendar, Medal,
  Wallet, User, FileText, QrCode, LogOut,
  ChevronLeft, ChevronRight, Shield, Menu, X
} from 'lucide-react'

interface AtletInfo {
  nama_lengkap: string
  cabor_nama_raw: string
  status_registrasi: string
  gender: string
}

const NAV = [
  {
    group: 'Utama',
    items: [
      { href:'/atlet/dashboard',  icon:LayoutDashboard, label:'Dashboard',      desc:'Ringkasan & KPI' },
      { href:'/atlet/jadwal',     icon:Calendar,        label:'Jadwal Tanding', desc:'Nomor & venue'   },
      { href:'/atlet/hasil',      icon:Medal,           label:'Hasil & Medali', desc:'Perolehan medali'},
    ]
  },
  {
    group: 'Administrasi',
    items: [
      { href:'/atlet/bonus',      icon:Wallet,          label:'Status Bonus',   desc:'Estimasi & SPJ'  },
      { href:'/atlet/profil',     icon:User,            label:'Profil Saya',    desc:'Data & apparel'  },
      { href:'/atlet/kejuaraan',  icon:Trophy,          label:'Riwayat Juara',  desc:'Track record'    },
    ]
  },
  {
    group: 'Dokumen',
    items: [
      { href:'/atlet/dokumen',    icon:FileText,        label:'Dokumen',        desc:'Sertifikat'      },
      { href:'/atlet/idcard',     icon:QrCode,          label:'ID Card',        desc:'QR digital'      },
    ]
  },
]

const C = { dark:'#020D06', accent:'#00B48A', green:'#065F46' }
const STATUS_COLOR: Record<string,string> = {
  'Verified':'#4ADE80','Posted':'#60A5FA',
  'Menunggu Admin':'#FBBF24','Ditolak Admin':'#F87171',
}

export default function AtletSidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [me,      setMe]      = useState<AtletInfo|null>(null)
  const [collapsed,setCollapsed] = useState(false)
  const [mobileOpen,setMobileOpen] = useState(false)

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
    href === '/atlet/dashboard' ? pathname === href : pathname.startsWith(href)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between p-4"
        style={{ borderBottom:'1px solid rgba(0,180,138,0.1)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(0,180,138,0.12)', border:'1px solid rgba(0,180,138,0.25)' }}>
              <Trophy size={16} style={{ color:C.accent }}/>
            </div>
            <div>
              <div className="text-white text-xs font-bold">Portal Atlet</div>
              <div className="text-[9px] font-bold tracking-wider" style={{ color:C.accent }}>PORPROV XV · 2026</div>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(c=>!c)}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors hidden lg:flex"
          style={{ marginLeft: collapsed ? 'auto' : '0' }}>
          {collapsed ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
        </button>
        <button onClick={() => setMobileOpen(false)}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-colors lg:hidden">
          <X size={15}/>
        </button>
      </div>

      {/* Atlet info card */}
      {me && (
        <div className="mx-3 mt-3 p-3 rounded-xl" style={{
          background:'rgba(0,180,138,0.06)', border:'1px solid rgba(0,180,138,0.12)',
        }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(0,180,138,0.12)', border:'1px solid rgba(0,180,138,0.2)' }}>
              <User size={16} style={{ color:C.accent }}/>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-white text-xs font-bold truncate">{me.nama_lengkap}</div>
                <div className="text-zinc-500 text-[10px] truncate">{me.cabor_nama_raw}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ background: STATUS_COLOR[me.status_registrasi]||C.accent }}/>
                  <span className="text-[9px]"
                    style={{ color: STATUS_COLOR[me.status_registrasi]||C.accent }}>
                    {me.status_registrasi}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4"
        style={{ scrollbarWidth:'thin', scrollbarColor:'rgba(0,180,138,0.1) transparent' }}>
        {NAV.map(group => (
          <div key={group.group}>
            {!collapsed && (
              <div className="text-[9px] font-bold tracking-[0.15em] text-zinc-600 uppercase px-3 mb-1.5">
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
                      background: active ? 'rgba(0,180,138,0.12)' : 'transparent',
                      border:`1px solid ${active ? 'rgba(0,180,138,0.25)' : 'transparent'}`,
                    }}>
                    <item.icon size={16}
                      style={{ color: active ? C.accent : '#52525B', flexShrink:0 }}
                      className="group-hover:text-emerald-400 transition-colors"/>
                    {!collapsed && (
                      <div className="min-w-0">
                        <div className="text-xs font-semibold leading-tight"
                          style={{ color: active ? C.accent : 'rgba(255,255,255,0.7)' }}>
                          {item.label}
                        </div>
                        <div className="text-[10px] text-zinc-600 leading-tight">{item.desc}</div>
                      </div>
                    )}
                    {active && !collapsed && (
                      <div className="ml-auto w-1 h-4 rounded-full" style={{ background:C.accent }}/>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom: logout */}
      <div className="p-3" style={{ borderTop:'1px solid rgba(0,180,138,0.08)' }}>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-400/5 transition-all">
          <LogOut size={16} className="flex-shrink-0"/>
          {!collapsed && <span className="text-xs font-semibold">Keluar</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background:'rgba(5,20,10,0.95)', border:'1px solid rgba(0,180,138,0.2)' }}>
        <Menu size={18} style={{ color:C.accent }}/>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-72 z-50"
            style={{ background:'#040f08', borderRight:'1px solid rgba(0,180,138,0.15)' }}>
            <SidebarContent/>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 transition-all duration-300"
        style={{
          width: collapsed ? '64px' : '240px',
          background:'rgba(4,15,8,0.98)',
          borderRight:'1px solid rgba(0,180,138,0.12)',
        }}>
        <SidebarContent/>
      </div>
    </>
  )
}