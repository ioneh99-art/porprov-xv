'use client'
import { useEffect, useRef, useState } from 'react'
import {
  Send, Bot, User, Loader2, Sparkles,
  BarChart2, Users, Trophy, TrendingUp,
  RefreshCw, Copy, CheckCircle
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  { icon: Users, text: 'Berapa total atlet yang sudah terdaftar?' },
  { icon: BarChart2, text: 'Kontingen mana yang paling banyak atletnya?' },
  { icon: Trophy, text: 'Siapa yang memimpin klasemen medali?' },
  { icon: TrendingUp, text: 'Cabor apa yang paling banyak peminatnya?' },
  { icon: Users, text: 'Berapa atlet putri yang sudah verified?' },
  { icon: BarChart2, text: 'Kontingen mana yang paling sedikit kemajuan registrasinya?' },
  { icon: Trophy, text: 'Bagaimana distribusi atlet putra vs putri?' },
  { icon: TrendingUp, text: 'Berikan analisa progress registrasi keseluruhan' },
]

export default function AINLQPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [creditError, setCreditError] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [stats, setStats] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendQuestion = async (q?: string) => {
    const question = q || input.trim()
    if (!question || loading) return

    const userMsg: Message = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setCreditError(false)

    try {
      const res = await fetch('/api/ai-nlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()

      if (data.error === 'credit_insufficient') {
        setCreditError(true)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ **Credit Anthropic API belum diisi.**\n\nSilakan top up di [console.anthropic.com](https://console.anthropic.com) → Plans & Billing → Add Credits.\n\nSetelah top up, fitur ini langsung aktif tanpa perlu konfigurasi tambahan! 🚀',
          timestamp: new Date(),
        }])
        return
      }

      if (!res.ok) throw new Error(data.error)

      if (data.context) setStats(data.context)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${e.message}`,
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuestion()
    }
  }

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleReset = () => {
    setMessages([])
    setCreditError(false)
    setStats(null)
  }

  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
      .replace(/^• /gm, '&bull; ')
      .replace(/^- /gm, '&bull; ')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-88px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
            <Sparkles size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              SIPA Intelligence
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-normal">
                AI Powered
              </span>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Tanya apa saja tentang data PORPROV XV dalam bahasa natural
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <div className="flex items-center gap-3 text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
              <span className="text-white font-bold">{stats.total}</span> atlet
              <span className="text-slate-700">·</span>
              <span className="text-blue-400 font-bold">{stats.putra}</span> putra
              <span className="text-slate-700">·</span>
              <span className="text-pink-400 font-bold">{stats.putri}</span> putri
            </div>
          )}
          {messages.length > 0 && (
            <button onClick={handleReset}
              className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs px-3 py-2 rounded-xl hover:bg-slate-800 transition-all">
              <RefreshCw size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Credit error banner */}
      {creditError && (
        <div className="mb-4 flex-shrink-0 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4">
          <div className="text-amber-400 text-sm font-medium mb-1">
            ⚠️ Anthropic API Credit Belum Diisi
          </div>
          <div className="text-slate-400 text-xs">
            Top up di{' '}
            <a href="https://console.anthropic.com" target="_blank"
              className="text-blue-400 hover:underline">
              console.anthropic.com
            </a>
            {' '}→ Plans & Billing → Add Credits (minimal $5)
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin scrollbar-thumb-slate-700">

        {/* Welcome / Suggested questions */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">SIPA Intelligence</div>
                  <div className="text-emerald-400 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Siap membantu
                  </div>
                </div>
              </div>
              <div className="text-slate-300 text-sm leading-relaxed">
                Halo! Saya <strong>SIPA Intelligence</strong> — AI Analitik PORPROV XV. 👋
                <br /><br />
                Saya bisa menjawab pertanyaan tentang data atlet, statistik kontingen,
                perbandingan cabor, klasemen medali, dan banyak lagi — cukup tanya dalam
                bahasa natural Indonesia!
              </div>
            </div>

            <div>
              <div className="text-slate-600 text-xs mb-3 px-1">💡 Coba tanya:</div>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map(({ icon: Icon, text }) => (
                  <button key={text} onClick={() => sendQuestion(text)}
                    className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:bg-blue-500/5 rounded-2xl px-4 py-3 text-left transition-all group">
                    <Icon size={14} className="text-slate-500 group-hover:text-blue-400 flex-shrink-0 transition-colors" />
                    <span className="text-slate-400 group-hover:text-slate-200 text-xs leading-relaxed transition-colors">
                      {text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1
              ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}>
              {msg.role === 'user'
                ? <User size={14} className="text-white" />
                : <Bot size={14} className="text-blue-400" />}
            </div>
            <div className={`max-w-[75%] group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'}`}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
              <div className="flex items-center gap-2 px-1">
                <span className="text-slate-700 text-[10px]">
                  {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.role === 'assistant' && (
                  <button onClick={() => handleCopy(msg.content, i)}
                    className="text-slate-700 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100">
                    {copied === i
                      ? <CheckCircle size={11} className="text-emerald-400" />
                      : <Copy size={11} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-blue-400" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Loader2 size={13} className="animate-spin text-blue-400" />
                <span>Menganalisa data...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-3">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya apa saja tentang data PORPROV XV... (Enter untuk kirim)"
            disabled={loading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none max-h-32 disabled:opacity-50"
            style={{ minHeight: '24px' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 128) + 'px'
            }}
          />
          <button onClick={() => sendQuestion()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all flex-shrink-0">
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="text-slate-700 text-[10px]">
            Enter untuk kirim · Shift+Enter untuk baris baru
          </div>
          <div className="flex items-center gap-1 text-slate-700 text-[10px]">
            <Sparkles size={10} className="text-blue-500/50" />
            Powered by Claude AI
          </div>
        </div>
      </div>
    </div>
  )
}