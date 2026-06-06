'use client'

// ChatbotWidget — JARVIS SCI-FI THEME
// src/components/ChatbotWidget.tsx

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, MessageCircle, Minimize2, Send, User, X, Cpu, TerminalSquare } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS: Record<string, string[]> = {
  admin: [
    '> CALC_REGISTERED_ASSETS',
    '> INSTRUCT_ADD_KONIDA',
    '> INSTRUCT_MASS_IMPORT',
    '> SETUP_QUALIFICATION_QUOTA',
  ],
  konida: [
    '> CHECK_VERIFIED_ASSETS',
    '> INSTRUCT_INPUT_ASSET',
    '> INSTRUCT_SUBMIT_OPERATOR',
    '> INSTRUCT_REGISTER_EVENT',
  ],
  operator_cabor: [
    '> INSTRUCT_VERIFY_ASSET',
    '> INSTRUCT_INPUT_RESULTS',
    '> INSTRUCT_CONFIRM_LINEUP',
    '> INSTRUCT_VALIDATE_CHAMPIONSHIP',
  ],
  atlet: [
    '> INSTRUCT_INPUT_HISTORY',
    '> WHY_UNVERIFIED_STATUS',
    '> INSTRUCT_UPLOAD_EVIDENCE',
    '> CHECK_REGISTRATION_STATUS',
  ],
  penyelenggara: [
    '> FETCH_VENUE_STATUS',
    '> SCAN_OPEN_INCIDENTS',
    '> SCHED_TODAY',
    '> VIP_GUEST_LOGS',
  ],
}

// JARVIS THEME COLORS BY TENANT
const TENANT_COLORS: Record<string, string> = {
  kabbogor:'#00ffaa', kotabekasi:'#ffb000', kabbekasi:'#00f3ff',
  kotabandung:'#00f3ff', kabbandung:'#00ff66', kotadepok:'#ff00ff',
  kotabogor:'#00ff66', kabkarawang:'#ff3366', kabbandungbarat:'#00f3ff',
  kotacirebon:'#ffb000',
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

  const role = user?.role ?? 'konida'
  const quickQuestions = QUICK_QUESTIONS[role] ?? QUICK_QUESTIONS.konida
  const accent = TENANT_COLORS[user?.tenant_id ?? ''] ?? '#00f3ff'

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = `SYSTEM ONLINE. 
SPORT INTELLIGENCE ACTIVE — [NODE: ${user?.nama?.split(' ')[0] || 'GUEST'}]

Akses database PORPROV XV diizinkan. Silakan eksekusi perintah atau input query manual di bawah.`
      setMessages([{ role: 'assistant', content: greeting }])
    }
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
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
          // payload lama (kompatibel dengan route lama)
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          role,
          nama: user?.nama,
          kontingen: user?.kontingen_nama,
          cabor: user?.cabor_nama,
          kontingen_id: user?.kontingen_id,
          // payload baru (kompatibel dengan chatbot_route.ts baru)
          question: content,
          history: newMessages.slice(-4).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      // support kedua format response: reply (lama) atau answer (baru)
      const reply = data.reply ?? data.answer ?? 'ERROR: RESPONSE_MALFORMED. Please retry execution.'

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (!open) setUnread(prev => prev + 1)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ UPLINK_FAILED. Unable to connect to Sport Intelligence Core.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function formatMessage(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
      .replace(/(\d+\.\s)/g, '<br/>$1')
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@500;600&display=swap');
        .cw-font-sci { font-family: 'Rajdhani', sans-serif; }
        .cw-font-lcd { font-family: 'Orbitron', sans-serif; }
        
        .cw-scroll::-webkit-scrollbar { width: 4px; }
        .cw-scroll::-webkit-scrollbar-track { background: transparent; }
        .cw-scroll::-webkit-scrollbar-thumb { background: ${accent}40; }
      `}}/>

      {/* ─── Floating Button ─── */}
      <button
        onClick={() => { setOpen(true); setMinimized(false) }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-black/80 flex items-center justify-center transition-all duration-300 hover:bg-black border ${open ? 'hidden' : 'flex'}`}
        style={{ borderColor: accent, boxShadow: `0 0 15px ${accent}40` }}
      >
        <Cpu size={24} style={{ color: accent, filter: `drop-shadow(0 0 5px ${accent})` }} />
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#ff3366] text-white text-[10px] font-bold flex items-center justify-center border border-black animate-pulse"
                style={{ boxShadow: '0 0 10px #ff3366' }}>
            {unread}
          </span>
        )}
      </button>

      {/* ─── Chat Window ─── */}
      {open && (
        <div className={`fixed bottom-24 right-6 z-50 w-80 flex flex-col transition-all duration-300 cw-font-sci ${minimized ? 'h-[50px]' : 'h-[520px]'}`}
             style={{ 
               background: 'rgba(3, 7, 18, 0.95)',
               border: `1px solid ${accent}50`,
               boxShadow: `0 0 30px ${accent}20`,
               backdropFilter: 'blur(10px)'
             }}>

          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 border-b flex-shrink-0 cursor-pointer relative"
            style={{ borderColor: `${accent}40`, background: `${accent}10` }}
            onClick={() => setMinimized(m => !m)}
          >
            {/* Ornamen sudut */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: accent }}/>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: accent }}/>

            <div className="w-8 h-8 flex items-center justify-center border bg-black/50 flex-shrink-0"
                 style={{ borderColor: accent }}>
              <TerminalSquare size={16} style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-lcd font-bold text-sm tracking-widest leading-none" style={{ color: accent, textShadow: `0 0 8px ${accent}` }}>
                SPORT_INTEL
              </div>
              <div className="text-[9px] mt-1 flex items-center gap-1.5 font-mono text-slate-400 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
                AI ASST
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={e => { e.stopPropagation(); setMinimized(m => !m) }}
                className="w-6 h-6 rounded-none flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ color: accent }}
              >
                <Minimize2 size={12} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setOpen(false) }}
                className="w-6 h-6 rounded-none flex items-center justify-center hover:bg-[#ff3366]/20 hover:text-[#ff3366] transition-colors"
                style={{ color: accent }}
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative cw-scroll">
                
                {/* Decorative Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                     style={{ 
                       backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
                       backgroundSize: '20px 20px' 
                     }}/>

                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 relative z-10 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 border flex items-center justify-center flex-shrink-0 mt-0.5 bg-black/60`}
                         style={{ borderColor: msg.role === 'user' ? '#64748b' : accent }}>
                      {msg.role === 'user'
                        ? <User size={12} className="text-slate-400" />
                        : <Cpu size={12} style={{ color: accent }} />}
                    </div>
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed font-mono ${
                        msg.role === 'user'
                          ? 'border-r-2'
                          : 'border border-slate-800'
                      }`}
                      style={msg.role === 'user' ? {
                        background: `${accent}15`,
                        color: accent,
                        borderRightColor: accent
                      } : {
                        background: 'rgba(0,0,0,0.6)',
                        color: '#e2e8f0', // Slate 200
                      }}
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2 relative z-10">
                    <div className="w-6 h-6 border flex items-center justify-center flex-shrink-0 bg-black/60"
                         style={{ borderColor: accent }}>
                      <Cpu size={12} style={{ color: accent }} />
                    </div>
                    <div className="border border-slate-800 px-4 py-3 bg-black/60 flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mr-2">PROCESSING</span>
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1 h-1 bg-white animate-pulse"
                             style={{ animationDelay:`${i*150}ms` }}/>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Questions — hanya saat awal */}
              {messages.length <= 1 && (
                <div className="px-4 pb-3 pt-2 relative z-10 font-mono">
                  <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: `${accent}80` }}>EXECUTE_COMMANDS:</div>
                  <div className="flex flex-col gap-1.5">
                    {quickQuestions.map(q => (
                      <button
                        key={q}
                        onClick={() => void sendMessage(q)}
                        className="text-left text-[10px] border px-3 py-1.5 transition-all hover:pl-4 uppercase tracking-wider"
                        style={{ 
                          background: 'rgba(0,0,0,0.5)', 
                          borderColor: `${accent}40`, 
                          color: accent 
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="px-3 py-3 flex gap-2 flex-shrink-0 border-t"
                   style={{ borderColor: `${accent}30`, background: 'rgba(3,7,18,0.9)' }}>
                <div className="flex-1 relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold" style={{ color:accent }}></span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && void sendMessage()}
                    placeholder="INPUT_QUERY..."
                    disabled={loading}
                    className="w-full bg-black/50 border px-7 py-2 text-xs font-mono outline-none disabled:opacity-60 placeholder-slate-600 transition-colors"
                    style={{ borderColor: `${accent}40`, color: accent }}
                    onFocus={e => { e.target.style.borderColor = accent }}
                    onBlur={e => { e.target.style.borderColor = `${accent}40` }}
                  />
                </div>
                <button
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 border flex items-center justify-center transition-all disabled:opacity-50 hover:bg-white/10 flex-shrink-0"
                  style={{ borderColor: accent, background: `${accent}20` }}
                >
                  {loading ? <Loader2 size={13} className="animate-spin" style={{ color: accent }} /> : <Send size={13} style={{ color: accent }} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}