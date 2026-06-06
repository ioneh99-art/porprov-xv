'use client'
// SipaAIFloat v6 — JARVIS SCI-FI THEME
// Hide di halaman /sipa untuk cegah double call

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, Cpu, Loader2, Send, Sparkles, X, TerminalSquare } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  intent?: string
}

interface UserCtx {
  role: string
  kontingen_id: number | null
  kontingen_nama: string
}

const QUICK_BY_ROLE: Record<string, { label: string; prompt: string }[]> = {
  konida: [
    { label: '> CALC_ASSETS',      prompt: 'Berapa total atlet kontingen kita dan berapa yang sudah verified?' },
    { label: '> SCAN_NON_LOCAL',   prompt: 'Berapa atlet kita yang berasal dari luar daerah kita?' },
    { label: '> TOP_SECTOR',       prompt: 'Cabang olahraga mana yang paling banyak atletnya?' },
    { label: '> RANK_TELEMETRY',   prompt: 'Di posisi berapa kontingen kita di klasemen medali?' },
  ],
  penyelenggara: [
    { label: '> VENUE_STATUS',     prompt: 'Apa status terkini venue yang aktif sekarang?' },
    { label: '> LIVE_MATCH_SCAN',  prompt: 'Pertandingan apa yang sedang live saat ini?' },
    { label: '> INCIDENT_LOGS',    prompt: 'Ada incident atau masalah yang masih terbuka?' },
    { label: '> NEXT_SCHEDULE',    prompt: 'Pertandingan apa yang dijadwalkan paling dekat?' },
  ],
  admin: [
    { label: '> SYS_SUMMARY',      prompt: 'Berikan ringkasan kondisi sistem PORPROV XV saat ini.' },
    { label: '> PENDING_NODES',    prompt: 'Kontingen mana yang paling banyak atlet masih pending?' },
    { label: '> TOP_5_STANDINGS',  prompt: 'Tampilkan top 5 klasemen medali saat ini.' },
    { label: '> GLOBAL_ASSETS',    prompt: 'Berapa total atlet yang sudah terdaftar di semua kontingen?' },
  ],
  publik: [
    { label: '> CURRENT_LEADER',   prompt: 'Siapa juara umum sementara PORPROV XV?' },
    { label: '> MEDAL_STANDINGS',  prompt: 'Tampilkan klasemen medali terkini PORPROV XV.' },
    { label: '> SECTOR_COUNT',     prompt: 'Ada berapa cabang olahraga di PORPROV XV?' },
    { label: '> INFO_PORPROV_XV',  prompt: 'Ceritakan tentang PORPROV XV Jawa Barat 2026.' },
  ],
}

export default function SipaAIFloat() {
  const pathname = usePathname()

  // ── HIDE di semua halaman /sipa/* ──────────────────────
  if (pathname?.includes('/sipa')) return null

  return <SipaAIFloatInner/>
}

function SipaAIFloatInner() {
  const [open,       setOpen]       = useState(false)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [hasNew,     setHasNew]     = useState(false)
  const [userCtx,    setUserCtx]    = useState<UserCtx>({
    role: 'publik', kontingen_id: null, kontingen_nama: ''
  })
  const [ctxLoaded, setCtxLoaded] = useState(false)

  const endRef        = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLInputElement>(null)
  const greetedRef    = useRef(false)
  const isSendingRef  = useRef(false)

  // Load user context SEKALI
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setUserCtx({
            role:           data.role ?? 'publik',
            kontingen_id:   data.kontingen_id ?? null,
            kontingen_nama: data.kontingen_nama ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setCtxLoaded(true))
  }, [])

  // Scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus saat buka
  useEffect(() => {
    if (open) {
      setHasNew(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Greeting
  useEffect(() => {
    if (open && ctxLoaded && !greetedRef.current) {
      greetedRef.current = true
      const nama = userCtx.kontingen_nama ? ` — [NODE: ${userCtx.kontingen_nama}]` : ''
      setMessages([{
        role:    'assistant',
        content: `SYSTEM ONLINE. 
SPORT INTELLIGENCE ACTIVE ${nama}

Akses database PORPROV XV diizinkan. Silakan pilih execute command di bawah atau input query manual.`,
      }])
    }
  }, [open, ctxLoaded])

  async function sendMessage(questionOverride?: string) {
    const question = (questionOverride ?? input).trim()
    if (!question || loading || isSendingRef.current) return

    isSendingRef.current = true
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await fetch('/api/sipa', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:      question,
          question:     question,
          role:         userCtx.role,
          kontingen_id: userCtx.kontingen_id,
          history:      messages.slice(-6),
        }),
      })
      const data   = await res.json()
      const answer = data.reply ?? data.answer ?? data.error ?? 'NO_RESPONSE_FROM_SERVER'
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
      if (!open) setHasNew(true)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ UPLINK_FAILED. Unable to connect to Sport Intelligence Core.' }])
    } finally {
      setLoading(false)
      isSendingRef.current = false
    }
  }

  // Warna sesuai role (disesuaikan ke neon sci-fi)
  const themeColor =
    userCtx.role === 'penyelenggara' ? '#ff3366' // Merah/Pink Neon
    : userCtx.role === 'admin'       ? '#00f3ff' // Cyan Neon
    : userCtx.role === 'konida'      ? '#00ff66' // Hijau Neon
    : '#ffb000' // Kuning/Gold (Publik)

  const quickPrompts = QUICK_BY_ROLE[userCtx.role] ?? QUICK_BY_ROLE['publik']

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@500;600&display=swap');
        .ai-font-sci { font-family: 'Rajdhani', sans-serif; }
        .ai-font-lcd { font-family: 'Orbitron', sans-serif; }

        /* Custom scrollbar khusus chat AI */
        .ai-scroll::-webkit-scrollbar { width: 4px; }
        .ai-scroll::-webkit-scrollbar-track { background: transparent; }
        .ai-scroll::-webkit-scrollbar-thumb { background: ${themeColor}40; border-radius: 4px; }
      ` }} />

      {open && (
        <div className="fixed bottom-24 right-6 z-[900] w-[360px] rounded-sm flex flex-col overflow-hidden ai-font-sci"
          style={{ 
            height: 520, 
            background: 'rgba(3, 7, 18, 0.95)',
            border: `1px solid ${themeColor}50`,
            boxShadow: `0 0 30px ${themeColor}20`,
            backdropFilter: 'blur(10px)'
          }}>
          
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between flex-shrink-0 border-b relative"
               style={{ borderColor: `${themeColor}40`, background: `${themeColor}10` }}>
             {/* Ornamen sci-fi header */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: themeColor }}/>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: themeColor }}/>
            
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center border bg-black/50"
                   style={{ borderColor: themeColor }}>
                <TerminalSquare size={16} style={{ color: themeColor }}/>
              </div>
              <div>
                <div className="font-lcd font-bold text-sm tracking-widest leading-none" style={{ color: themeColor, textShadow: `0 0 8px ${themeColor}` }}>
                  SPORT_INTELLIGENCE
                </div>
                <div className="text-[10px] mt-1 flex items-center gap-1.5 font-mono text-slate-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: themeColor }}/>
                  {userCtx.kontingen_nama || 'ROOT_ACCESS'}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              className="w-7 h-7 hover:bg-white/10 flex items-center justify-center transition-colors"
              style={{ color: themeColor }}>
              <ChevronDown size={18}/>
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-transparent ai-scroll relative">
            {/* Grid scanline background (hanya di chat) */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                 style={{ 
                   backgroundImage: `linear-gradient(${themeColor} 1px, transparent 1px), linear-gradient(90deg, ${themeColor} 1px, transparent 1px)`,
                   backgroundSize: '20px 20px' 
                 }}/>

            {messages.length <= 1 && (
              <div className="grid grid-cols-1 gap-1.5 mb-4 relative z-10 font-mono">
                {quickPrompts.map(q => (
                  <button key={q.label} onClick={() => void sendMessage(q.prompt)}
                    className="text-left border px-3 py-2 text-[10px] uppercase tracking-wider transition-all hover:pl-4"
                    style={{ 
                      background: 'rgba(0,0,0,0.5)', 
                      borderColor: `${themeColor}40`, 
                      color: themeColor 
                    }}>
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role==='user'?'justify-end':'justify-start'} gap-2 relative z-10`}>
                {msg.role==='assistant' && (
                  <div className="w-6 h-6 border flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ borderColor: themeColor, background: `${themeColor}15` }}>
                    <Cpu size={12} style={{ color: themeColor }}/>
                  </div>
                )}
                <div className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed font-mono ${
                  msg.role==='user'
                    ? 'border-l-2'
                    : 'border border-slate-800'
                }`}
                style={msg.role === 'user' ? {
                  background: `${themeColor}15`,
                  color: themeColor,
                  borderLeftColor: themeColor
                } : {
                  background: 'rgba(0,0,0,0.6)',
                  color: '#e2e8f0', // Slate 200
                }}>
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split('\n').length-1 && <br/>}</span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start relative z-10">
                <div className="w-6 h-6 border flex items-center justify-center flex-shrink-0"
                     style={{ borderColor: themeColor, background: `${themeColor}15` }}>
                  <Cpu size={12} style={{ color: themeColor }}/>
                </div>
                <div className="border border-slate-800 px-4 py-3 bg-black/60 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mr-2">PROCESSING</span>
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-white animate-pulse"
                      style={{ animationDelay:`${i*150}ms` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* Input Area */}
          <div className="border-t px-3 py-3 flex gap-2 flex-shrink-0"
               style={{ borderColor: `${themeColor}30`, background: 'rgba(3,7,18,0.9)' }}>
            <input ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') void sendMessage() }}
              placeholder="INPUT_QUERY..."
              disabled={loading}
              className="flex-1 bg-black/50 border rounded-none px-3.5 py-2 text-xs font-mono outline-none disabled:opacity-60 placeholder-slate-600 transition-colors"
              style={{ borderColor: `${themeColor}40`, color: themeColor }}
              onFocus={(e) => e.target.style.borderColor = themeColor}
              onBlur={(e) => e.target.style.borderColor = `${themeColor}40`}
            />
            <button onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 border flex items-center justify-center transition-all disabled:opacity-50 hover:bg-white/10"
              style={{ borderColor: themeColor, background: `${themeColor}20` }}>
              {loading ? <Loader2 size={16} className="animate-spin" style={{ color: themeColor }}/> : <Send size={16} style={{ color: themeColor }}/>}
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-[900] w-14 h-14 flex items-center justify-center transition-all duration-300"
        style={{ 
          background: open ? '#1e293b' : 'rgba(3,7,18,0.9)',
          border: `1px solid ${open ? '#475569' : themeColor}`,
          boxShadow: open ? 'none' : `0 0 20px ${themeColor}40`
        }}>
        {open ? <X size={24} className="text-slate-400"/> : (
          <div className="relative flex items-center justify-center">
            <Cpu size={24} style={{ color: themeColor, filter: `drop-shadow(0 0 5px ${themeColor})` }}/>
            {hasNew && <div className="absolute -top-2 -right-2 w-3 h-3 rounded-none animate-pulse" style={{ background: '#ff3366', boxShadow: '0 0 10px #ff3366' }}/>}
          </div>
        )}
      </button>

      {/* Tooltip Hover Indicator */}
      {!open && (
        <div className="fixed bottom-10 right-24 z-[899] font-mono text-[10px] px-3 py-1.5 border pointer-events-none opacity-0 hover:opacity-100 flex items-center gap-1.5 uppercase tracking-widest backdrop-blur-sm"
             style={{ background: 'rgba(0,0,0,0.8)', borderColor: themeColor, color: themeColor }}>
          <Sparkles size={10}/> Sport_Intelligence
        </div>
      )}
    </>
  )
}