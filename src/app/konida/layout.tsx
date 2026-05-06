import KonidaSidebar from '@/components/KonidaSidebar'

export default function KonidaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <KonidaSidebar />
      <main className="ml-56 flex-1 p-7">{children}</main>
    </div>
  )
}
