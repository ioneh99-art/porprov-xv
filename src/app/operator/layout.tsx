import OperatorSidebar from '@/components/OperatorSidebar'
import ChatbotWidget from '@/components/ChatbotWidget'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const OPERATOR_ROLES = ['operator_cabor', 'operator', 'admin', 'superadmin']

type TierBadge = 'BASIC' | 'PRO' | 'ELITE' | 'CHAMPION'
function resolveTier(user: any): TierBadge {
  const id = parseInt(user?.plan_id) || 0
  const lvl = (user?.level ?? '').toLowerCase()
  if (id >= 4 || lvl === 'champion') return 'CHAMPION'
  if (id === 3 || lvl === 'elite')   return 'ELITE'
  if (id === 2 || lvl === 'pro')     return 'PRO'
  if (id === 1 || lvl === 'basic')   return 'BASIC'
  return 'CHAMPION' // default: operator aktif dapat akses penuh
}

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get('porprov_session')?.value
  let user: any = null
  try { user = session ? JSON.parse(session) : null } catch {}

  if (!user) redirect('/login')
  if (!OPERATOR_ROLES.includes(user.role)) redirect('/')

  // Operator Dayung kembali ke login Dayung saat logout.
  const loginTarget = /dayung/i.test(user?.cabor_nama ?? '') ? '/login/dayung' : '/login'

  async function logout() {
    'use server'
    cookies().delete('porprov_session')
    cookies().delete('user_level')
    cookies().delete('tenant_id')
    redirect(loginTarget)
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <OperatorSidebar
        user={{
          username: user.nama ?? user.username,
          cabor: user.cabor_nama ?? user.cabor_id,
          tier: resolveTier(user),
        }}
        onLogout={logout}
      />
      <main className="flex-1 p-7 min-w-0">
        {children}
      </main>
      <ChatbotWidget user={user} />
    </div>
  )
}