import OperatorSidebar from '@/components/OperatorSidebar'

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <OperatorSidebar />
      <main className="ml-56 flex-1 p-7">{children}</main>
    </div>
  )
}