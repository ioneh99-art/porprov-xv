import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Edit3, Users, Trophy, Waves, ClipboardList, ListChecks } from 'lucide-react'

const DAYUNG_CABOR_MATCH = /dayung/i

export default async function DayungLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get('porprov_session')?.value
  let user: any = null
  try { user = session ? JSON.parse(session) : null } catch {}

  if (!user) redirect('/login?next=/operator/dayung')

  const isAdmin = user.role === 'admin' || user.role === 'superadmin'
  const isDayungOperator = user.role === 'operator_cabor' && (
    DAYUNG_CABOR_MATCH.test(user.cabor_nama ?? '') ||
    DAYUNG_CABOR_MATCH.test(user.username ?? '')
  )

  if (!isAdmin && !isDayungOperator) redirect('/operator/dashboard')

  return (
    <>
      <div className="mb-6 flex items-center gap-3 border-b border-slate-800/60 pb-4 -mt-1">
        <div className="flex items-center gap-2.5 pr-4 border-r border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/30 flex items-center justify-center">
            <Waves size={15} className="text-sky-400" />
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-tight">Dayung</div>
            <div className="text-sky-500/60 text-[10px]">PORPROV XV · Kab. Bandung</div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-1 flex-wrap">
          <NavTab href="/operator/dayung"          icon={LayoutDashboard} label="Dashboard" step="" />
          <NavTab href="/operator/dayung/roster"   icon={Users}           label="Roster"    step="" />
          <NavTab href="/operator/dayung/disiplin" icon={ClipboardList}   label="Disiplin"  step="" />
          <NavTab href="/operator/dayung/nomor"    icon={ListChecks}      label="Nomor"     step="" />
          <NavTab href="/operator/dayung/lineup"   icon={Edit3}           label="Lineup"    step="1" />
          <NavTab href="/operator/dayung/input"    icon={Edit3}           label="Input"     step="2" />
          <NavTab href="/operator/dayung/klasemen" icon={Trophy}          label="Klasemen"  step="3" />
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-500">Login sebagai</div>
          <div className="text-xs text-sky-300 font-medium">{user.nama ?? user.username}</div>
        </div>
      </div>

      {children}
    </>
  )
}

function NavTab({ href, icon: Icon, label, step }: { href: string; icon: any; label: string; step?: string }) {
  return (
    <Link href={href}
      className="group flex items-center gap-2 text-slate-400 hover:text-sky-300 text-xs px-3 py-2 rounded-lg hover:bg-sky-500/5 transition-all">
      {step && (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-800 text-slate-500 text-[9px] font-bold group-hover:bg-sky-500/20 group-hover:text-sky-400 transition-colors">
          {step}
        </span>
      )}
      <Icon size={13} className="group-hover:text-sky-400 transition-colors" />
      <span className="font-medium">{label}</span>
    </Link>
  )
}
