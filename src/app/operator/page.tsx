import { getServerSession } from '@/lib/guard'
import { redirect } from 'next/navigation'

export default async function OperatorRootPage() {
  // Sesi terverifikasi HMAC (bukan JSON.parse cookie yg bisa dipalsukan).
  const user: any = await getServerSession()

  if (!user) redirect('/login')

  const cabor = (user.cabor_nama ?? user.username ?? '').toLowerCase()

  if (/pentathlon/i.test(cabor)) redirect('/operator/pentathlon')
  if (/dayung|canoe|kayak/i.test(cabor)) redirect('/operator/dayung')

  // fallback: tampilkan halaman kosong dengan info cabor
  redirect('/operator/pentathlon')
}
