import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function OperatorRootPage() {
  const session = cookies().get('porprov_session')?.value
  let user: any = null
  try { user = session ? JSON.parse(session) : null } catch {}

  if (!user) redirect('/login')

  const cabor = (user.cabor_nama ?? user.username ?? '').toLowerCase()

  if (/pentathlon/i.test(cabor)) redirect('/operator/pentathlon')
  if (/dayung|canoe|kayak/i.test(cabor)) redirect('/operator/dayung')

  // fallback: tampilkan halaman kosong dengan info cabor
  redirect('/operator/pentathlon')
}
