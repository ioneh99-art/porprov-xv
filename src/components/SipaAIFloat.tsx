'use client'

// SipaAIFloat v3 — Widget floating SIPA, hit /api/sipa (sama dengan halaman penuh)
// Taruh di layout.tsx atau per-page

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Cpu, Loader2, Send, Sparkles, X, Zap } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  intent?: string
}

const FLOAT_QUICK = [
  { label: 'Status venue sekarang?', prompt: 'Apa status terkini venue yang aktif sekarang?' },
  { label: 'Ada pertandingan live?', prompt: 'Pertandingan apa yang sedang live saat ini?' },
  { label: 'Incident terbuka?', prompt: 'Ada incident atau masalah yang masih terbuka?' },
  { label: 'Jadwal berikutnya?', prompt: 'Pertandingan apa yang dijadwalkan paling dekat?' },
]

export default function SipaAIFloat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [idCounter, setIdCounter] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Pulse tiap 30 detik untuk menarik perhatian jika ada alert baru
  useEffect(() => {
    if (open) return
    const t = setInterval(() => setPulse(p => !p), 30000)
    return () => clearInterval(t)
  }, [open])

  // Greeting saat pertama buka
  useEffect(() => {
    if (open && messages.length === 0) {
      addMsg({
        role: 'assistant',
        content: 'Halo! Saya SIPA 👋 Ada yang bisa saya bantu sekarang?\n\nPilih pertanyaan cepat di bawah atau ketik langsung.',
      })
    }
    if (open) {
      setHasNew(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function addMsg(msg: Omit<Message, never>) {
    setMessages(prev => [...prev, msg])
  }

  async function sendMessage(questionOverride?: string) {
    const question = (questionOverride ?? input).trim()
    if (!question || loading) return

    setInput('')
    addMsg({ role: 'user', content: question })
    setLoading(true)

    try {
      const history = messages.slice(-6)
      const res = await fetch('/api/sipa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      })
      const data = await res.json()
      const answer = data.answer ?? data.error ?? 'Maaf, tidak ada respons.'
      addMsg({ role: 'assistant', content: answer, intent: data.intent })
      if (!open) setHasNew(true)
    } catch {
      addMsg({ role: 'assistant', content: '⚠️ Gagal terhubung ke SIPA.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ─── Floating Chat Window ─── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-[900] w-[360px] bg-white rounded-2xl shadow-2xl shadow-blue-500/10 border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: 500 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Cpu size={15} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-none">SIPA Intelligence</div>
                <div className="text-white/70 text-[10px] mt-0.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Online · Klaster I Bekasi
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/30">
            {/* Quick Prompts — hanya tampil jika 1 pesan (greeting) */}
            {messages.length <= 1 && (
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {FLOAT_QUICK.map(q => (
                  <button
                    key={q.label}
                    onClick={() => void sendMessage(q.prompt)}
                    className="text-left bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50 rounded-xl px-3 py-2.5 text-[11px] text-gray-600 hover:text-blue-700 transition-all"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Cpu size={12} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                      : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.intent && msg.intent !== 'umum' && msg.role === 'assistant' && (
                    <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">{msg.intent}</div>
                  )}
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Cpu size={12} className="text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-4 py-3 flex gap-2 bg-white flex-shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void sendMessage() }}
              placeholder="Tanya SIPA..."
              disabled={loading}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading
                ? <Loader2 size={14} className="text-white animate-spin" />
                : <Send size={14} className="text-white" />
              }
            </button>
          </div>
        </div>
      )}

      {/* ─── FAB Button ─── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-[900] w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 ${
          open
            ? 'bg-gray-700 shadow-gray-500/30'
            : 'bg-gradient-to-br from-blue-600 to-cyan-500 shadow-blue-500/40 hover:scale-105 active:scale-95'
        }`}
      >
        {open ? (
          <X size={22} className="text-white" />
        ) : (
          <div className="relative">
            <Cpu size={22} className="text-white" />
            {hasNew && (
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </div>
        )}
      </button>

      {/* Label tooltip saat closed */}
      {!open && (
        <div className="fixed bottom-6 right-24 z-[899] bg-[#3c4858] text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none opacity-0 hover:opacity-100 flex items-center gap-1.5">
          <Sparkles size={11} /> SIPA Intelligence
        </div>
      )}
    </>
  )
}