'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { JarvisStatusBar } from './JarvisStatusBar'
import { JarvisChatModal } from './JarvisChatModal'
import { JarvisChatBubble } from './JarvisChatBubble'

const KONTINGEN_ID = 4
const JARVIS_ROUTES = [
  '/konida/dashboard/kabbandung',
  '/konida/atlet/kabbandung',
  '/konida/dokumen/kabbandung',
  '/konida/kejuaraan/kabbandung',
  '/konida/Premiumreport/kabbandung/tes-fisik',
  '/konida/performance/kabbandung',
]

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

type ChatState = 'closed' | 'open' | 'bubble'

export function JarvisWrapper({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const isActive    = JARVIS_ROUTES.some(r => pathname?.startsWith(r))

  // Chat state — hidup di layout, tidak unmount saat navigasi
  const [chatState, setChatState] = useState<ChatState>('closed')
  const [messages,  setMessages]  = useState<Message[]>([{
    role: 'assistant',
    content: 'Halo bos! Gw Jarvis, QA companion lo. Lagi monitor data Bandung. Ada yang mau ditanya atau dibantu?',
    ts: new Date().toISOString(),
  }])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [unread,    setUnread]    = useState(0)
  const sessionId   = useRef(`jarvis-${Date.now()}`)

  // Auto-minimize saat pindah page kalau modal sedang terbuka
  const prevPath = useRef(pathname)
  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      if (chatState === 'open') setChatState('bubble')
    }
  }, [pathname, chatState])

  // Reset unread saat modal dibuka
  useEffect(() => {
    if (chatState === 'open') setUnread(0)
  }, [chatState])

  const send = useCallback(async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text, ts: new Date().toISOString() }])
    setLoading(true)

    try {
      const res  = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
          currentPage: pathname,
          kontingenId: KONTINGEN_ID,
        }),
      })
      const data = await res.json()
      const reply: Message = {
        role: 'assistant',
        content: data.success ? data.response : `Error: ${data.error}`,
        ts: new Date().toISOString(),
      }
      setMessages(prev => [...prev, reply])
      // Kalau lagi di bubble, tandai unread
      if (chatState === 'bubble') setUnread(n => n + 1)
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Network error: ${e.message}`,
        ts: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, pathname, chatState])

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null

  return (
    <>
      {isActive && <JarvisStatusBar />}

      {children}

      {/* Tombol buka chat (saat closed) */}
      {isActive && chatState === 'closed' && (
        <button onClick={() => setChatState('open')}
          className="fixed top-10 right-6 z-[150] flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
          <Sparkles size={14} />
          Ask Jarvis
        </button>
      )}

      {/* Full modal */}
      {chatState === 'open' && (
        <JarvisChatModal
          messages={messages}
          input={input}
          loading={loading}
          onInputChange={setInput}
          onSend={send}
          onMinimize={() => setChatState('bubble')}
          onClose={() => setChatState('closed')}
        />
      )}

      {/* Bubble saat minimize / navigasi */}
      {chatState === 'bubble' && (
        <JarvisChatBubble
          lastMessage={lastMessage}
          unread={unread}
          onExpand={() => setChatState('open')}
          onClose={() => setChatState('closed')}
        />
      )}
    </>
  )
}
