import { redirect } from 'next/navigation'
export default function Home() {
  const tenant = process.env.NEXT_PUBLIC_DEFAULT_TENANT
  if (tenant) redirect(`/konida/login/${tenant}`)
  redirect('/dashboard')
}
