'use client'
import { useRef, useEffect } from 'react'
import { X, Send, Sparkles, RefreshCw, Minus, Download } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: string
}

interface Props {
  messages: Message[]
  input: string
  loading: boolean
  onInputChange: (v: string) => void
  onSend: () => void
  onClose: () => void
  onMinimize: () => void
}

// Parse [DOWNLOAD:type:Label] tags → render sebagai tombol download
function renderContent(content: string) {
  const parts = content.split(/\[DOWNLOAD:([^:\]]+):([^\]]+)\]/)
  if (parts.length === 1) return <>{content}</>

  const nodes: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) nodes.push(<span key={`t${i}`}>{parts[i]}</span>)
    if (i + 1 < parts.length) {
      const type  = parts[i + 1]
      const label = parts[i + 2] || 'Download'
      nodes.push(
        <a key={`d${i}`}
          href={`/api/jarvis/export?type=${type}&kontingen_id=4`}
          download
          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] w-fit no-underline"
          style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 2px 10px rgba(5,150,105,0.3)' }}>
          <Download size={11} />
          {label}
        </a>
      )
    }
  }
  return <>{nodes}</>
}

export function JarvisChatModal({ messages, input, loading, onInputChange, onSend, onClose, onMinimize }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onMinimize()}>
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
          <div className="flex items-center gap-1">
            {/* Minimize → bubble */}
            <button onClick={onMinimize}
              className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Minimize">
              <Minus size={16} />
            </button>
            {/* Close completely */}
            <button onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Tutup">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                {renderContent(msg.content)}
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
            <input value={input} onChange={e => onInputChange(e.target.value)} onKeyDown={onKey}
              placeholder="Tanya Jarvis…"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <button onClick={onSend} disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {loading
                ? <RefreshCw size={16} className="text-white animate-spin" />
                : <Send size={16} className="text-white" />}
            </button>
          </div>
          <p className="text-[10px] text-zinc-700 mt-2 text-center">Enter kirim · — minimize · × tutup</p>
        </div>
      </div>
    </div>
  )
}
