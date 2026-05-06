import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="ml-56 flex-1 p-7">
        {children}
      </main>
    </div>
  )
}
