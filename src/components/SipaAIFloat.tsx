'use client'
// SipaAIFloat v5 — Hide di halaman /sipa untuk cegah double call

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, Cpu, Loader2, Send, Sparkles, X } from 'lucide-react'

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
    { label: 'Total atlet kita?',      prompt: 'Berapa total atlet kontingen kita dan berapa yang sudah verified?' },
    { label: 'Atlet non-lokal?',       prompt: 'Berapa atlet kita yang berasal dari luar daerah kita?' },
    { label: 'Cabor terbanyak?',       prompt: 'Cabang olahraga mana yang paling banyak atletnya?' },
    { label: 'Posisi klasemen kita?',  prompt: 'Di posisi berapa kontingen kita di klasemen medali?' },
  ],
  penyelenggara: [
    { label: 'Status venue sekarang?', prompt: 'Apa status terkini venue yang aktif sekarang?' },
    { label: 'Ada pertandingan live?', prompt: 'Pertandingan apa yang sedang live saat ini?' },
    { label: 'Incident terbuka?',      prompt: 'Ada incident atau masalah yang masih terbuka?' },
    { label: 'Jadwal berikutnya?',     prompt: 'Pertandingan apa yang dijadwalkan paling dekat?' },
  ],
  admin: [
    { label: 'Ringkasan sistem?',      prompt: 'Berikan ringkasan kondisi sistem PORPROV XV saat ini.' },
    { label: 'Atlet pending?',         prompt: 'Kontingen mana yang paling banyak atlet masih pending?' },
    { label: 'Top 5 klasemen?',        prompt: 'Tampilkan top 5 klasemen medali saat ini.' },
    { label: 'Total atlet?',           prompt: 'Berapa total atlet yang sudah terdaftar di semua kontingen?' },
  ],
  publik: [
    { label: 'Juara umum sementara?',  prompt: 'Siapa juara umum sementara PORPROV XV?' },
    { label: 'Klasemen medali?',       prompt: 'Tampilkan klasemen medali terkini PORPROV XV.' },
    { label: 'Cabor apa saja?',        prompt: 'Ada berapa cabang olahraga di PORPROV XV?' },
    { label: 'Info PORPROV XV?',       prompt: 'Ceritakan tentang PORPROV XV Jawa Barat 2026.' },
  ],
}

export default function SipaAIFloat() {
  const pathname = usePathname()

  // ── HIDE di semua halaman /sipa/* ──────────────────────
  // Cegah double call dengan SIPA full page
  if (pathname?.includes('/sipa')) return null

  return <SipaAIFloatInner/>
}

function SipaAIFloatInner() {
  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [hasNew,    setHasNew]    = useState(false)
  const [userCtx,   setUserCtx]   = useState<UserCtx>({
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

  // Greeting SEKALI pakai greetedRef
  useEffect(() => {
    if (open && ctxLoaded && !greetedRef.current) {
      greetedRef.current = true
      const nama = userCtx.kontingen_nama ? ` — ${userCtx.kontingen_nama}` : ''
      setMessages([{
        role:    'assistant',
        content: `Halo! Saya SIPA 👋${nama}\n\nSaya punya akses ke data real PORPROV XV. Pilih pertanyaan cepat di bawah atau ketik langsung.`,
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
      const answer = data.reply ?? data.answer ?? data.error ?? 'Maaf, tidak ada respons.'
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
      if (!open) setHasNew(true)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Gagal terhubung ke SIPA.' }])
    } finally {
      setLoading(false)
      isSendingRef.current = false
    }
  }

  const headerGrad =
    userCtx.role === 'penyelenggara' ? 'from-orange-500 to-red-500'
    : userCtx.role === 'admin'       ? 'from-purple-600 to-purple-500'
    : userCtx.role === 'konida'      ? 'from-emerald-600 to-teal-500'
    : 'from-blue-600 to-cyan-500'

  const fabGrad =
    userCtx.role === 'penyelenggara' ? 'from-orange-500 to-red-500 shadow-orange-500/40'
    : userCtx.role === 'admin'       ? 'from-purple-600 to-purple-500 shadow-purple-500/40'
    : userCtx.role === 'konida'      ? 'from-emerald-600 to-teal-500 shadow-emerald-500/40'
    : 'from-blue-600 to-cyan-500 shadow-blue-500/40'

  const quickPrompts = QUICK_BY_ROLE[userCtx.role] ?? QUICK_BY_ROLE['publik']

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-[900] w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: 520 }}>
          <div className={`bg-gradient-to-r ${headerGrad} px-4 py-3 flex items-center justify-between flex-shrink-0`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Cpu size={15} className="text-white"/>
              </div>
              <div>
                <div className="text-white font-bold text-sm leading-none">SIPA Intelligence</div>
                <div className="text-white/70 text-[10px] mt-0.5 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/>
                  {userCtx.kontingen_nama || 'PORPROV XV 2026'}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors">
              <ChevronDown size={16}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/30">
            {messages.length <= 1 && (
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {quickPrompts.map(q => (
                  <button key={q.label} onClick={() => void sendMessage(q.prompt)}
                    className="text-left bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50 rounded-xl px-3 py-2.5 text-[11px] text-gray-600 hover:text-blue-700 transition-all">
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role==='user'?'justify-end':'justify-start'} gap-2`}>
                {msg.role==='assistant' && (
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${headerGrad} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Cpu size={12} className="text-white"/>
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role==='user'
                    ? `bg-gradient-to-br ${headerGrad} text-white rounded-tr-sm`
                    : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split('\n').length-1 && <br/>}</span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${headerGrad} flex items-center justify-center flex-shrink-0`}>
                  <Cpu size={12} className="text-white"/>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay:`${i*150}ms` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          <div className="border-t border-gray-100 px-4 py-3 flex gap-2 bg-white flex-shrink-0">
            <input ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') void sendMessage() }}
              placeholder="Tanya SIPA..."
              disabled={loading}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"/>
            <button onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${headerGrad} flex items-center justify-center shadow-md disabled:opacity-50 transition-all active:scale-95`}>
              {loading ? <Loader2 size={14} className="text-white animate-spin"/> : <Send size={14} className="text-white"/>}
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-[900] w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 ${
          open ? 'bg-gray-700 shadow-gray-500/30' : `bg-gradient-to-br ${fabGrad} hover:scale-105 active:scale-95`
        }`}>
        {open ? <X size={22} className="text-white"/> : (
          <div className="relative">
            <Cpu size={22} className="text-white"/>
            {hasNew && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"/>}
          </div>
        )}
      </button>

      {!open && (
        <div className="fixed bottom-6 right-24 z-[899] bg-[#3c4858] text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none opacity-0 hover:opacity-100 flex items-center gap-1.5">
          <Sparkles size={11}/> SIPA Intelligence
        </div>
      )}
    </>
  )
}