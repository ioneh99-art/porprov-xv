import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

// Login page per level (fallback kalau tidak ada tenant env var)
const LOGIN_BY_ORIGIN: Record<string, string> = {
  kabbandung:       '/konida/login/kabbandung',
  kabbogor:         '/konida/login/kabbogor',
  kotabekasi:       '/konida/login/kotabekasi',
  kabbekasi:        '/konida/login/kabbekasi',
  kotabandung:      '/konida/login/kotabandung',
  kotadepok:        '/konida/login/kotadepok',
  kotabogor:        '/konida/login/kotabogor',
  kabkarawang:      '/konida/login/kabkarawang',
  kabbandungbarat:  '/konida/login/kabbandungbarat',
  kotacirebon:      '/konida/login/kotacirebon',
  superadmin:       '/login/superadmin',
}

const DASHBOARD_BY_LEVEL: Record<string, string> = {
  superadmin: '/superadmin',
  koni_jabar: '/dashboard',
  level1:     '/konida/dashboard',
  level2:     '/konida/dashboard',
  level3:     '/konida/dashboard/basic',
}

export default function Home() {
  const jar        = cookies()
  const session    = jar.get('porprov_session')?.value
  const origin     = jar.get('login_origin')?.value ?? ''
  const level      = jar.get('user_level')?.value ?? ''
  const tenantId   = jar.get('tenant_id')?.value ?? ''
  const envTenant  = process.env.DEFAULT_TENANT ?? ''

  // Tentukan tenant yang aktif (env var prioritas, lalu cookie)
  const tenant = envTenant || tenantId || origin

  if (!session) {
    // Belum login → ke login page yang sesuai
    if (envTenant) redirect(`/konida/login/${envTenant}`)
    if (LOGIN_BY_ORIGIN[tenant]) redirect(LOGIN_BY_ORIGIN[tenant])
    redirect('/login') // generic (koni jabar / admin)
  }

  // Sudah login → ke dashboard yang sesuai
  if (envTenant) redirect(`/konida/dashboard/${envTenant}`)
  if (LOGIN_BY_ORIGIN[tenant]) redirect(LOGIN_BY_ORIGIN[tenant].replace('/login/', '/dashboard/'))
  redirect(DASHBOARD_BY_LEVEL[level] ?? '/dashboard')
}
