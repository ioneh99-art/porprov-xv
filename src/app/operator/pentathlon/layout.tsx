import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Edit3, Users, Trophy, Medal, Settings, FileText, Calendar } from 'lucide-react'

const PENTATHLON_CABOR_NAME_MATCH = /pentathlon/i

export default async function PentathlonLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get('porprov_session')?.value
  let user: any = null
  try { user = session ? JSON.parse(session) : null } catch {}

  if (!user) redirect('/login?next=/operator/pentathlon')

  const isAdmin = user.role === 'admin' || user.role === 'superadmin'
  const isPentathlonOperator = user.role === 'operator_cabor' && (
    PENTATHLON_CABOR_NAME_MATCH.test(user.cabor_nama ?? '') ||
    PENTATHLON_CABOR_NAME_MATCH.test(user.username ?? '')
  )

  if (!isAdmin && !isPentathlonOperator) {
    redirect('/operator/dashboard')
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3 border-b border-slate-800/60 pb-4 -mt-1">
        <div className="flex items-center gap-2.5 pr-4 border-r border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 flex items-center justify-center">
            <Medal size={15} className="text-yellow-400" />
          </div>
          <div>
            <div className="text-white text-sm font-semibold leading-tight">Pentathlon</div>
            <div className="text-yellow-500/60 text-[10px]">LA 2028 UIPM · 🌟 Champion</div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-1">
          <NavTab href="/operator/pentathlon" icon={LayoutDashboard} label="Dashboard" step="" />
          <NavTab href="/operator/pentathlon/atlet" icon={Users} label="Data Atlet" step="" />
          <NavTab href="/operator/pentathlon/dokumen" icon={FileText} label="Dokumen" step="" />
          <NavTab href="/operator/pentathlon/jadwal" icon={Calendar} label="Jadwal" step="" />
          <NavTab href="/operator/pentathlon/lineup" icon={Users} label="Lineup" step="1" />
          <NavTab href="/operator/pentathlon/input" icon={Edit3} label="Input Skor" step="2" />
          <NavTab href="/operator/pentathlon/klasemen" icon={Trophy} label="Klasemen" step="3" />
          <NavTab href="/operator/pentathlon/settings" icon={Settings} label="Settings" step="" />
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-500">Login sebagai</div>
          <div className="text-xs text-yellow-300 font-medium">{user.nama ?? user.username}</div>
        </div>
      </div>

      {children}
    </>
  )
}

function NavTab({
  href, icon: Icon, label, step,
}: { href: string; icon: any; label: string; step?: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 text-slate-400 hover:text-yellow-300 text-xs px-3 py-2 rounded-lg hover:bg-yellow-500/5 transition-all"
    >
      {step && (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-800 text-slate-500 text-[9px] font-bold group-hover:bg-yellow-500/20 group-hover:text-yellow-400 transition-colors">
          {step}
        </span>
      )}
      <Icon size={13} className="group-hover:text-yellow-400 transition-colors" />
      <span className="font-medium">{label}</span>
    </Link>
  )
}
