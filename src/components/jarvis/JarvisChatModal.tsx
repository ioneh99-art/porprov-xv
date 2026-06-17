'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, RefreshCw } from 'lucide-react'
import { usePathname } from 'next/navigation'

const KONTINGEN_ID = 4

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

export function JarvisChatModal({ onClose }: { onClose: () => void }) {
  const pathname = usePathname()
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Halo bos! Gw Jarvis, QA companion lo. Lagi monitor data Bandung nih. Ada yang mau ditanya atau dibantu?',
    ts: new Date().toISOString(),
  }])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sessionId] = useState(() => `jarvis-${Date.now()}`)
  const bottomRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text, ts: new Date().toISOString() }])
    setLoading(true)

    try {
      const res  = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, currentPage: pathname, kontingenId: KONTINGEN_ID }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.success ? data.response : `Error: ${data.error}`,
        ts: new Date().toISOString(),
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${e.message}`, ts: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl mx-4 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ height: '700px', maxHeight: '90vh', background: '#060b18', border: '1px solid rgba(139,92,246,0.3)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Jarvis QA</div>
              <div className="text-[10px] text-zinc-500">Monitoring data Bandung · Online</div>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <div key={d} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce"
                      style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder="Tanya Jarvis…"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <button onClick={send} disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {loading ? <RefreshCw size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-700 mt-2 text-center">Enter kirim · Shift+Enter baris baru</p>
        </div>
      </div>
    </div>
  )
}
