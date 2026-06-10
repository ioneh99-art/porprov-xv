'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Brain, Zap, Trash2, Copy, Check } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  model?: 'groq' | 'claude'
}

const SUGGESTED_PROMPTS = [
  'Cabor apa yang punya potensi medali tertinggi PORPROV XV?',
  'Bandingkan performa atlet saya vs rata-rata kontingen lain',
  'Identifikasi titik lemah cabor dan rekomendasi training fokus',
  'Strategi alokasi resource 30 hari menjelang event',
]

export default function SportIntelPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [useClaudeModel, setUseClaudeModel] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const message = (text ?? input).trim()
    if (!message || loading) return

    const userMsg: Message = { role: 'user', content: message, timestamp: Date.now() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/sport-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          useClaudeModel,
        })
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)

      const data = await res.json()
      const reply: Message = {
        role: 'assistant',
        content: data.content ?? data.message ?? 'Tidak ada response dari AI.',
        timestamp: Date.now(),
        model: useClaudeModel ? 'claude' : 'groq',
      }
      setMessages([...next, reply])
    } catch (err: any) {
      setMessages([...next, {
        role: 'assistant',
        content: `❌ Error: ${err.message ?? 'gagal connect ke AI'}. Coba cek env var ANTHROPIC_API_KEY / GROQ_API_KEY di Vercel.`,
        timestamp: Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Brain className="text-blue-400" size={20} />
              </div>
              <h1 className="text-2xl font-bold">Sport Intelligence</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">PRO</span>
            </div>
            <p className="text-slate-400 text-sm">Konsultan AI strategis untuk operator cabor PORPROV XV</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseClaudeModel(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                !useClaudeModel ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Zap size={12} /> Groq
            </button>
            <button
              onClick={() => setUseClaudeModel(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                useClaudeModel ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Brain size={12} /> Claude
            </button>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition"
                title="Clear chat"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Sparkles className="text-blue-400 mb-3" size={32} />
                <h2 className="text-lg font-semibold mb-2">Tanya apa aja soal cabor lo</h2>
                <p className="text-slate-500 text-sm mb-6 max-w-md">
                  AI bakal jawab pake context data PORPROV real-time dari Supabase. Tier PRO+.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl w-full">
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => send(p)}
                      className="text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    m.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-slate-800 border border-slate-700'
                  }`}>
                    {m.role === 'assistant' && m.model && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          m.model === 'claude' ? 'bg-violet-500/20 text-violet-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {m.model === 'claude' ? '🧠 Claude' : '⚡ Groq'}
                        </span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    {m.role === 'assistant' && (
                      <button
                        onClick={() => copyMessage(i, m.content)}
                        className="mt-2 text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                      >
                        {copiedIdx === i ? <><Check size={10} /> Disalin</> : <><Copy size={10} /> Salin</>}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Tanya apa aja… (Enter kirim, Shift+Enter newline)"
                rows={1}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500 max-h-32"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 rounded-lg transition flex items-center gap-2"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
