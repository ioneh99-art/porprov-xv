import Sidebar from '@/components/Sidebar'
import ChatbotWidget from '@/components/ChatbotWidget'
import { getServerSession } from '@/lib/guard'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Sesi terverifikasi HMAC (bukan JSON.parse cookie yg bisa dipalsukan).
  const user = await getServerSession()

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="ml-56 flex-1 p-7">
        {children}
      </main>
      <ChatbotWidget user={user} />
    </div>
  )
}