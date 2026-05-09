'use client'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = {
  admin: [
    'Berapa total atlet terdaftar?',
    'Cara tambah akun KONIDA baru?',
    'Cara import data atlet massal?',
    'Cara setup kuota kualifikasi?',
  ],
  konida: [
    'Berapa atlet saya yang sudah verified?',
    'Cara input atlet baru?',
    'Cara submit atlet ke operator?',
    'Cara daftarkan atlet ke nomor pertandingan?',
  ],
  operator_cabor: [
    'Cara verifikasi atlet?',
    'Cara input hasil pertandingan?',
    'Cara konfirmasi lineup?',
    'Cara validasi kejuaraan atlet?',
  ],
  atlet: [
    'Cara input riwayat kejuaraan?',
    'Kenapa kejuaraan saya belum verified?',
    'Cara upload bukti prestasi?',
    'Status registrasi saya bagaimana?',
  ],
}

export default function ChatbotWidget({ user }: { user: any }) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const quickQuestions = QUICK_QUESTIONS[user?.role as keyof typeof QUICK_QUESTIONS] ?? QUICK_QUESTIONS.konida

  useEffect(() => {
    if (open && messages.length === 0) {
      // Pesan sambutan
      const greeting = `Halo ${user?.nama?.split(' ')[0] || 'Kak'}! 👋\n\nSaya **SIPA** — Asisten AI PORPROV XV Jawa Barat 2026.\n\nSaya siap membantu kamu menggunakan sistem ini. Silakan tanya apa saja! 😊`
      setMessages([{ role: 'assistant', content: greeting }])
    }
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const content = text || input.trim()
    if (!content || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          role: user?.role,
          nama: user?.nama,
          kontingen: user?.kontingen_nama,
          cabor: user?.cabor_nama,
          kontingen_id: user?.kontingen_id,
        }),
      })

      const data = await res.json()
      const reply = data.reply || 'Maaf, terjadi kesalahan. Coba lagi ya!'

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])

      if (!open) setUnread(prev => prev + 1)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maaf, tidak bisa terhubung ke server. Coba lagi dalam beberapa saat! 🙏'
      }])
    } finally {
      setLoading(false)
    }
  }

  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
      .replace(/(\d+\.\s)/g, '<br/>$1')
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setMinimized(false) }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-110 ${open ? 'hidden' : 'flex'}`}>
        <MessageCircle size={24} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 flex flex-col transition-all ${minimized ? 'h-14' : 'h-[520px]'}`}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 flex-shrink-0 cursor-pointer"
            onClick={() => setMinimized(!minimized)}>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold">SIPA</div>
              <div className="text-emerald-400 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Asisten AI PORPROV XV
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={e => { e.stopPropagation(); setMinimized(!minimized) }}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                <Minimize2 size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); setOpen(false) }}
                className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all">
                <X size={13} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                      ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                      {msg.role === 'user'
                        ? <User size={12} className="text-white" />
                        : <Bot size={12} className="text-blue-400" />}
                    </div>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed
                      ${msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Bot size={12} className="text-blue-400" />
                    </div>
                    <div className="bg-slate-800 px-3 py-2 rounded-2xl rounded-tl-sm">
                      <Loader2 size={14} className="text-blue-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick questions */}
              {messages.length <= 1 && (
                <div className="px-3 pb-2">
                  <div className="text-slate-600 text-[10px] mb-1.5">Pertanyaan cepat:</div>
                  <div className="flex flex-col gap-1">
                    {quickQuestions.map(q => (
                      <button key={q} onClick={() => sendMessage(q)}
                        className="text-left text-xs text-blue-400 hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-lg px-2.5 py-1.5 transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3 flex gap-2 flex-shrink-0 border-t border-slate-800 pt-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ketik pertanyaan..."
                  disabled={loading}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
                <button onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all flex-shrink-0">
                  <Send size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}