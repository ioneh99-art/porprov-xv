'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, BarChart2, LogOut, ChevronRight,
  Trophy, ClipboardCheck, User, MapPin, Monitor,
  CheckSquare, Hotel, FileText, Building2, Shield, Cpu,
  Download, Lock, Activity, Database, FileCheck, TrendingUp, BarChart3,
  Radar, Crosshair,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const TENANT_COLORS: Record<string, { primary: string; dark: string; nama: string }> = {
  kabbogor:       { primary: '#065f46', dark: '#047857', nama: 'Kab. Bogor'          },
  kotabekasi:     { primary: '#E84E0F', dark: '#c43d0a', nama: 'Kota Bekasi'         },
  kabbekasi:      { primary: '#1B6EC2', dark: '#0F4F8F', nama: 'Kab. Bekasi'         },
  kotabandung:    { primary: '#2563eb', dark: '#1d4ed8', nama: 'Kota Bandung'        },
  kabbandung:     { primary: '#0369a1', dark: '#075985', nama: 'Kab. Bandung'        },
  kotadepok:      { primary: '#7c3aed', dark: '#6d28d9', nama: 'Kota Depok'          },
  kotabogor:      { primary: '#16a34a', dark: '#15803d', nama: 'Kota Bogor'          },
  kabkarawang:    { primary: '#dc2626', dark: '#b91c1c', nama: 'Kab. Karawang'       },
  kabbandungbarat:{ primary: '#0891b2', dark: '#0e7490', nama: 'Kab. Bandung Barat'  },
  kotacirebon:    { primary: '#ca8a04', dark: '#a16207', nama: 'Kota Cirebon'        },
  kabsukabumi:    { primary: '#b45309', dark: '#92400e', nama: 'Kab. Sukabumi'       },
  kotasukabumi:   { primary: '#dc2626', dark: '#b91c1c', nama: 'Kota Sukabumi'       },
  kabcianjur:     { primary: '#0891b2', dark: '#0e7490', nama: 'Kab. Cianjur'        },
  kabgarut:       { primary: '#15803d', dark: '#166534', nama: 'Kab. Garut'          },
  kabtasikmalaya: { primary: '#7e22ce', dark: '#6b21a8', nama: 'Kab. Tasikmalaya'    },
  kabciamis:      { primary: '#9a3412', dark: '#7c2d12', nama: 'Kab. Ciamis'         },
  kabkuningan:    { primary: '#166534', dark: '#14532d', nama: 'Kab. Kuningan'       },
  kabcirebon:     { primary: '#b45309', dark: '#92400e', nama: 'Kab. Cirebon'        },
  kabmajalengka:  { primary: '#0f766e', dark: '#0d9488', nama: 'Kab. Majalengka'     },
  kabsumedang:    { primary: '#1d4ed8', dark: '#1e40af', nama: 'Kab. Sumedang'       },
  kabindramayu:   { primary: '#b45309', dark: '#92400e', nama: 'Kab. Indramayu'      },
  kabsubang:      { primary: '#0369a1', dark: '#075985', nama: 'Kab. Subang'         },
  kabpurwakarta:  { primary: '#7c3aed', dark: '#6d28d9', nama: 'Kab. Purwakarta'     },
  kabpangandaran: { primary: '#065f46', dark: '#047857', nama: 'Kab. Pangandaran'    },
  kotatasikmalaya:{ primary: '#9333ea', dark: '#7e22ce', nama: 'Kota Tasikmalaya'    },
  kotacimahi:     { primary: '#0369a1', dark: '#075985', nama: 'Kota Cimahi'         },
  kotabanjar:     { primary: '#15803d', dark: '#166534', nama: 'Kota Banjar'         },
  jabar:          { primary: '#2563eb', dark: '#1d4ed8', nama: 'KONI Jabar'          },
  superadmin:     { primary: '#ef4444', dark: '#dc2626', nama: 'Super Admin'         },
}

const KONTINGEN_TO_TENANT: Record<number, string> = {
  1:  'kabbogor',        2:  'kabsukabumi',     3:  'kabcianjur',
  4:  'kabbandung',      5:  'kabgarut',        6:  'kabtasikmalaya',
  7:  'kabciamis',       8:  'kabkuningan',     9:  'kabcirebon',
  10: 'kabmajalengka',   11: 'kabsumedang',     12: 'kabindramayu',
  13: 'kabsubang',       14: 'kabpurwakarta',   15: 'kabkarawang',
  16: 'kabbekasi',       17: 'kabbandungbarat', 18: 'kabpangandaran',
  19: 'kotabogor',       20: 'kotasukabumi',    21: 'kotabandung',
  22: 'kotacirebon',     23: 'kotabekasi',      24: 'kotadepok',
  25: 'kotatasikmalaya', 26: 'kotabanjar',      27: 'kotacimahi',
}

const ENTERPRISE_TENANTS = [
  'kabbogor', 'kotabekasi', 'kabbekasi', 'kotabandung', 'kabbandung',
  'kotadepok', 'kotabogor', 'kabkarawang', 'kabbandungbarat', 'kotacirebon',
]

// ── Halaman yang TIDAK pakai subfolder (universal) ────────
const UNIVERSAL_PAGES = [
  '/konida/sipa',      // ← SIPA selalu universal, cegah double mount
  '/konida/profil',    // ← profil universal
]

function tp(base: string, tenantId: string): string {
  // Halaman universal → tidak pakai subfolder
  if (UNIVERSAL_PAGES.includes(base)) return base
  // Enterprise → custom subfolder
  return ENTERPRISE_TENANTS.includes(tenantId)
    ? `${base}/${tenantId}`
    : base
}

function getCookieVal(name: string): string {
  if (typeof window === 'undefined') return ''
  return document.cookie.split('; ').find(c => c.startsWith(`${name}=`))?.split('=')[1] ?? ''
}

function getLoginTarget(tenantId: string): string {
  if (typeof window === 'undefined') return '/login'
  const map: Record<string, string> = {
    kotabekasi: '/login/kotabekasi', kabbogor:    '/login/kabbogor',
    kabbekasi:  '/login/kabbekasi',  kotabandung: '/login/kotabandung',
    kotadepok:  '/login/kotadepok',  kotabogor:   '/login/kotabogor',
    superadmin: '/login/superadmin',
  }
  return map[tenantId] ?? '/login'
}

function NavItemVIP({ label, href, icon: Icon }: { label: string; href: string; icon: any }) {
  const pathname = usePathname()
  const tc       = TENANT_COLORS['kabbandung']
  const active   = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link href={href}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all ${
        active ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
      style={active ? { background: `${tc.primary}20`, color: tc.primary } : {}}>
      <Icon size={16}/>
      <span className="flex-1">{label}</span>
      <span className="text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider leading-none shrink-0"
        style={{ background:'rgba(139,92,246,0.18)', color:'#a78bfa', border:'1px solid rgba(139,92,246,0.35)' }}>
        VIP
      </span>
      {active && <ChevronRight size={12}/>}
    </Link>
  )
}

function NavItemPremium({ label, href, icon: Icon, tc }: { label: string; href: string; icon: any; tc: { primary: string } }) {
  const pathname = usePathname()
  const active   = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link href={href}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all ${
        active ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
      style={active ? { background: `${tc.primary}20`, color: tc.primary } : {}}>
      <Icon size={16}/>
      <span className="flex-1">{label}</span>
      <span className="text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider leading-none shrink-0"
        style={{ background: 'rgba(245,197,24,0.12)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.25)' }}>
        PRE
      </span>
      {active && <ChevronRight size={12}/>}
    </Link>
  )
}

function LockedNavItem({ label, icon: Icon, plan }: { label: string; icon: any; plan: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 cursor-not-allowed opacity-40 relative group">
      <Icon size={16} className="text-slate-600"/>
      <span className="flex-1 text-slate-600 text-sm">{label}</span>
      <Lock size={10} className="text-slate-600"/>
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
  const [user,      setUser]      = useState<any>(null)
  const [features,  setFeatures]  = useState<string[]>([])
  const [planId,    setPlanId]    = useState<string>('basic')
  const [counts,    setCounts]    = useState<Record<string, number>>({})
  const [userLevel, setUserLevel] = useState<string>('level3')
  const [tenantId,  setTenantId]  = useState<string>('jabar')
  const [mounted,   setMounted]   = useState(false)
  const kontingenIdRef = useRef<number | null>(null)

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
        const resolvedTenant =
          cookieTid ||
          (data?.kontingen_id ? KONTINGEN_TO_TENANT[data.kontingen_id as number] : null) ||
          (data?.role === 'koni_jabar' ? 'jabar' : null) ||
          (data?.role === 'superadmin' ? 'superadmin' : null) ||
          'jabar'
        setTenantId(resolvedTenant)
        if (data?.kontingen_id) {
          kontingenIdRef.current = data.kontingen_id
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
      if (kontingenIdRef.current) {
        fetch(`/api/notifications?role=konida&kontingen_id=${kontingenIdRef.current}`)
          .then(r => r.json()).then(setCounts).catch(() => {})
      }
    }, 30_000)
    return () => clearInterval(iv)
  }, [pathname])

  const can = (f: string) => features.includes(f)
  const tc  = TENANT_COLORS[tenantId] ?? TENANT_COLORS.jabar

  const isPenyelenggara   = ['kotabekasi', 'kotabogor', 'kotadepok'].includes(tenantId)
  const isPremiumNonPenye = !isPenyelenggara && (planId === 'premium' || planId === 'enterprise')
  const isEnterprise      = ENTERPRISE_TENANTS.includes(tenantId)

  const handleLogout = async () => {
    try {
      document.cookie = 'tenant_id=; path=/; max-age=0'
      document.cookie = 'user_level=; path=/; max-age=0'
      localStorage.removeItem('tenant_id')
      const res  = await fetch('/api/auth/logout', { method: 'POST' })
      const data = await res.json()
      router.push(data?.redirect ?? getLoginTarget(tenantId))
      router.refresh()
    } catch { router.push(getLoginTarget(tenantId)) }
  }

  const dashboardHref =
    tenantId === 'kotabekasi'       ? '/konida/dashboard/kotabekasi'
    : tenantId === 'kabbogor'       ? '/konida/dashboard/kabbogor'
    : tenantId === 'kabbekasi'      ? '/konida/dashboard/kabbekasi'
    : tenantId === 'kotabandung'    ? '/konida/dashboard/kotabandung'
    : tenantId === 'kabbandung'     ? '/konida/dashboard/kabbandung'
    : tenantId === 'kotadepok'      ? '/konida/dashboard/kotadepok'
    : tenantId === 'kotabogor'      ? '/konida/dashboard/kotabogor'
    : tenantId === 'kabkarawang'    ? '/konida/dashboard/kabkarawang'
    : tenantId === 'kabbandungbarat'? '/konida/dashboard/kabbandungbarat'
    : tenantId === 'kotacirebon'    ? '/konida/dashboard/kotacirebon'
    : userLevel === 'level1'        ? '/konida/dashboard/kotabekasi'
    : isPremiumNonPenye             ? '/konida/dashboard/premium'
    : userLevel === 'level2'        ? '/konida/dashboard'
    : userLevel === 'koni_jabar'    ? '/dashboard'
    : userLevel === 'superadmin'    ? '/superadmin'
    : '/konida/dashboard/basic'

  const NavItem = ({ label, href, icon: Icon, notif }: {
    label: string; href: string; icon: any; notif?: number
  }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all ${
          active ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
        style={active ? { background: `${tc.primary}20`, color: tc.primary } : {}}>
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
            style={{ background: `linear-gradient(135deg,${tc.primary},${tc.dark})` }}>
            {tc.nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div suppressHydrationWarning className="text-white font-semibold text-xs truncate">
              {mounted ? tc.nama : 'PORPROV XV'}
            </div>
            <div className="text-slate-500 text-[10px]">PORPROV XV · 2026</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span suppressHydrationWarning
            className="inline-block text-[9px] px-2 py-0.5 rounded font-semibold tracking-wider border"
            style={{ background: `${tc.primary}20`, color: tc.primary, borderColor: `${tc.primary}40` }}>
            {!mounted ? 'KONIDA'
              : userLevel === 'superadmin' ? '⚡ SA'
              : userLevel === 'koni_jabar' ? '🏛️ KONI Jabar'
              : userLevel === 'level1'     ? '🥇 Gold'
              : userLevel === 'level2'     ? '🥈 Silver'
              : 'KONIDA'}
          </span>
          {mounted && planId && (
            <span className="inline-block text-[9px] px-2 py-0.5 rounded font-semibold"
              style={{
                background: planId === 'premium' || planId === 'enterprise'
                  ? 'rgba(245,197,24,0.15)' : 'rgba(100,116,139,0.15)',
                color: planId === 'premium' || planId === 'enterprise' ? '#F5C518' : '#64748b',
              }}>
              {planId === 'basic' ? '🏅' : planId === 'standard' ? '🥈' : planId === 'premium' ? '🥇' : '⚡'} {planId}
            </span>
          )}
          {mounted && isEnterprise && (
            <span className="inline-block text-[9px] px-2 py-0.5 rounded font-semibold"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
              ◆ Enterprise
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

        {/* ── KAB. BANDUNG — Kontingen di atas, Command Center di bawah ── */}
        {tenantId === 'kabbandung' ? (
          <>
            {/* ── 1. Kontingen ── */}
            <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">Kontingen</div>
            <NavItem label="Dashboard"       href={dashboardHref}                     icon={LayoutDashboard}/>
            <NavItem label="Data Atlet"      href="/konida/atlet/kabbandung"           icon={Users}/>
            <NavItem label="Dokumen Atlet"   href="/konida/dokumen/kabbandung"         icon={FileCheck}/>
            {can('kualifikasi')
              ? <NavItem label="Kualifikasi" href="/konida/kualifikasi/kabbandung"     icon={ClipboardCheck}/>
              : <LockedNavItem label="Kualifikasi" icon={ClipboardCheck} plan="Standard"/>
            }
            <NavItem label="Kejuaraan Atlet" href="/konida/kejuaraan/kabbandung"       icon={Trophy} notif={counts.kejuaraan ?? 0}/>
            {can('laporan')
              ? <NavItem label="Laporan"     href="/konida/laporan/kabbandung"         icon={BarChart2}/>
              : <LockedNavItem label="Laporan" icon={BarChart2} plan="Standard"/>
            }

            {/* ── 2. Premium ── */}
            <div className="flex items-center gap-2 px-2 mt-3 mb-2">
              <div className="flex-1 h-px bg-slate-800"/>
              <span className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: '#F5C518', opacity: 0.6 }}>Premium</span>
              <div className="flex-1 h-px bg-slate-800"/>
            </div>
            <NavItemPremium label="Data Gateway"   href="/konida/export/kabbandung"                          icon={Database}  tc={tc}/>
            <NavItemPremium label="Tes Biomotorik" href="/konida/Premiumreport/kabbandung/tes-fisik"          icon={Activity}  tc={tc}/>
            <NavItemPremium label="Heatmap Cabor"  href="/konida/Premiumreport/kabbandung/heatmap-cabor"      icon={BarChart2} tc={tc}/>
            <NavItemPremium label="Performance"    href="/konida/performance/kabbandung"                      icon={BarChart3} tc={tc}/>

            <div className="h-px bg-slate-800 my-3"/>

            {/* ── 3. Command Center ── */}
            <div className="flex items-center gap-2 px-2 mt-1 mb-2">
              <div className="flex-1 h-px bg-slate-800"/>
              <span className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: '#a78bfa', opacity: 0.7 }}>Command Center</span>
              <div className="flex-1 h-px bg-slate-800"/>
            </div>
            <NavItemVIP label="War Room"            href="/konida/warroom/kabbandung"         icon={Monitor}  />
            <NavItemVIP label="Pipeline Watch"      href="/konida/pipeline-watch/kabbandung"   icon={Radar}    />
            <NavItemVIP label="Talent Lobby"        href="/konida/talent-lobby/kabbandung"     icon={Crosshair}/>
            <NavItemVIP label="Report Pertandingan" href="/konida/lappertandingan/kabbandung"  icon={FileText} />
            <NavItemVIP label="Premium Report"      href="/konida/Premiumreport/kabbandung"    icon={Download} />
            <NavItemVIP label="Laporan Bupati"      href="/konida/Premiumreport/kabbandung/bupati" icon={Building2} />
          </>
        ) : (
          <>
            {/* ── PREMIUM — untuk tenant lain ── */}
            {isPremiumNonPenye && (
              <>
                <div className="flex items-center gap-1.5 px-2 mb-2">
                  <Trophy size={10} style={{ color: tc.primary }}/>
                  <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: tc.primary }}>
                    Premium
                  </span>
                </div>
                <NavItem label="War Room"         href={tp('/konida/warroom', tenantId)}                          icon={Monitor}  />
                <NavItem label="Tes Biomotorik"   href={tp('/konida/Premiumreport', tenantId) + '/tes-fisik'}     icon={Activity} />
                <NavItem label="Heatmap Cabor"    href={tp('/konida/Premiumreport', tenantId) + '/heatmap-cabor'} icon={BarChart2}/>
                <NavItem label="Premium Report"   href={tp('/konida/Premiumreport', tenantId)}                    icon={Download} />
                <Link href={tp('/konida/lappertandingan', tenantId)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-sm transition-all ${
                    pathname.startsWith(tp('/konida/lappertandingan', tenantId))
                      ? 'text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  style={pathname.startsWith(tp('/konida/lappertandingan', tenantId))
                    ? { background: `${tc.primary}20`, color: tc.primary } : {}}>
                  <FileText size={16}/>
                  <span className="flex-1 text-sm">Report Pertandingan</span>
                  {Date.now() >= new Date('2026-11-07').getTime() && Date.now() <= new Date('2026-11-20').getTime()
                    ? <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse leading-none">LIVE</span>
                    : <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500 leading-none">OFFLINE</span>
                  }
                </Link>
                <div className="h-px bg-slate-800 my-3"/>
              </>
            )}

            {/* ── AI / SPORT INTELLIGENCE ── */}
            <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">AI</div>
            {can('sipa_full')
              ? <NavItem label="Sport Intelligence" href="/konida/sipa" icon={Cpu}/>
              : <LockedNavItem label="Sport Intelligence" icon={Cpu} plan="Premium"/>
            }
            <div className="h-px bg-slate-800 my-3"/>

            {/* ── KONTINGEN ── */}
            <div className="text-slate-600 text-[10px] uppercase tracking-widest px-2 mb-2">Kontingen</div>
            <NavItem label="Dashboard"       href={dashboardHref}                       icon={LayoutDashboard}/>
            <NavItem label="Data Atlet"      href={tp('/konida/atlet', tenantId)}        icon={Users}/>
            <NavItem label="Dokumen Atlet"   href={tp('/konida/dokumen', tenantId)}      icon={FileCheck}/>
            {can('kualifikasi')
              ? <NavItem label="Kualifikasi" href={tp('/konida/kualifikasi', tenantId)}  icon={ClipboardCheck}/>
              : <LockedNavItem label="Kualifikasi" icon={ClipboardCheck} plan="Standard"/>
            }
            <NavItem label="Kejuaraan Atlet" href={tp('/konida/kejuaraan', tenantId)}    icon={Trophy} notif={counts.kejuaraan ?? 0}/>
            {can('laporan')
              ? <NavItem label="Laporan"     href={tp('/konida/laporan', tenantId)}      icon={BarChart2}/>
              : <LockedNavItem label="Laporan" icon={BarChart2} plan="Standard"/>
            }
            {can('export_pdf')
              ? <NavItem label="Data Gateway"  href={tp('/konida/export', tenantId)} icon={Database}/>
              : <LockedNavItem label="Data Gateway" icon={Database} plan="Premium"/>
            }
          </>
        )}

        {/* Penyelenggara */}
        {isPenyelenggara && (
          <>
            <div className="h-px bg-slate-800 my-3"/>
            <div className="flex items-center gap-1.5 px-2 mb-2">
              <Building2 size={10} style={{ color: tc.primary }}/>
              <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: tc.primary }}>
                Penyelenggara
              </span>
            </div>
            {can('command_center')
              ? <NavItem label="Command Center"  href="/konida/penyelenggara"           icon={Monitor}/>
              : <LockedNavItem label="Command Center" icon={Monitor} plan="Premium"/>
            }
            {can('venue_jadwal')
              ? <NavItem label="Venue & Jadwal"  href="/konida/penyelenggara/venue"     icon={MapPin}/>
              : <LockedNavItem label="Venue & Jadwal" icon={MapPin} plan="Premium"/>
            }
            {can('kesiapan_teknis')
              ? <NavItem label="Kesiapan Teknis" href="/konida/penyelenggara/kesiapan"  icon={CheckSquare}/>
              : <LockedNavItem label="Kesiapan Teknis" icon={CheckSquare} plan="Premium"/>
            }
            {can('akomodasi')
              ? <NavItem label="Akomodasi Tamu"  href="/konida/penyelenggara/akomodasi" icon={Hotel}/>
              : <LockedNavItem label="Akomodasi Tamu" icon={Hotel} plan="Premium"/>
            }
            {can('laporan_harian')
              ? <NavItem label="Laporan Harian"  href="/konida/penyelenggara/laporan"   icon={FileText}/>
              : <LockedNavItem label="Laporan Harian" icon={FileText} plan="Premium"/>
            }
          </>
        )}

        {/* Superadmin */}
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