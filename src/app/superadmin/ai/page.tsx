'use client'
// src/app/superadmin/ai/page.tsx — AI Sport Intelligence · Claude Sonnet 4.6

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, BarChart2, BookOpen, Brain, Check,
  ChevronRight, Copy, Database, Loader2, MessageSquare,
  RefreshCw, Send, Sparkles, Trophy, X, Zap,
} from 'lucide-react'

const C = {
  primary:   '#00f3ff',
  secondary: '#00ff66',
  accent:    '#ffb000',
  alert:     '#ff3366',
  purple:    '#a855f7',
  border:    'rgba(0,243,255,0.15)',
  muted:     '#7a8b9e',
}

interface Msg {
  role:    'user' | 'assistant'
  content: string
  mode:    string
  ts:      number
  error?:  boolean
}

interface Meta {
  total_kontingen?: number
  total_atlet?:     number
  verified_atlet?:  number
  pending_atlet?:   number
  active_users?:    number
  active_subs?:     number
}

const MODES = [
  { id: 'chat',     label: 'FREE CHAT',      icon: MessageSquare, color: C.primary,   desc: 'Tanya bebas tentang data sistem'         },
  { id: 'brief',    label: 'EXEC BRIEF',     icon: BookOpen,      color: C.accent,    desc: 'Buat laporan eksekutif otomatis'          },
  { id: 'insights', label: 'AUTO INSIGHTS',  icon: Sparkles,      color: C.secondary, desc: '6 insight kritis dari seluruh data'       },
  { id: 'klasemen', label: 'KLASEMEN AI',    icon: Trophy,        color: C.purple,    desc: 'Analisis medali & prediksi posisi akhir'  },
  { id: 'cabor',    label: 'CABOR ANALYSIS', icon: BarChart2,     color: '#f97316',   desc: 'Kesiapan per cabang olahraga'             },
]

const QUICK_PROMPTS = [
  { text: 'Ringkasan kondisi sistem & yang perlu diperhatikan hari ini', mode: 'chat' },
  { text: 'Kontingen mana yang performanya paling mengkhawatirkan?', mode: 'chat' },
  { text: 'Prediksi 5 besar klasemen akhir PORPROV XV beserta alasan', mode: 'klasemen' },
  { text: 'Cabor mana yang paling siap & paling berisiko tidak berprestasi?', mode: 'cabor' },
  { text: 'Ada anomali data yang perlu segera diselidiki?', mode: 'chat' },
  { text: 'Buat strategic brief untuk rapat pengurus KONI hari ini', mode: 'brief' },
]

// Simple markdown → HTML (safe, no external lib)
function md(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Re-allow safe tags after escape
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#### (.+)$/gm, '<p class="font-lcd font-bold text-xs mt-3 mb-0.5" style="color:#00f3ff">$1</p>')
    .replace(/^### (.+)$/gm, '<p class="font-lcd font-bold text-sm mt-4 mb-1" style="color:#00f3ff">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="font-lcd font-bold text-base mt-4 mb-1" style="color:#00f3ff">$1</p>')
    .replace(/^# (.+)$/gm, '<p class="font-lcd font-bold text-lg mt-4 mb-2" style="color:#00f3ff">$1</p>')
    .replace(/^• (.+)$/gm, '<div class="flex gap-1.5 mt-1 ml-1"><span style="color:#00f3ff">▸</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 mt-1 ml-1"><span style="color:#7a8b9e">·</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div class="mt-1 ml-4">$1</div>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-px text-[10px]" style="background:rgba(0,243,255,0.1);color:#00f3ff;border:1px solid rgba(0,243,255,0.2)">$1</code>')
    .replace(/\n\n/g, '<div class="mt-3"></div>')
    .replace(/\n/g, '<br/>')
}

export default function AISportIntelligencePage() {
  const [msgs,         setMsgs]         = useState<Msg[]>([])
  const [input,        setInput]        = useState('')
  const [mode,         setMode]         = useState('chat')
  const [streaming,    setStreaming]     = useState(false)
  const [streamText,   setStreamText]   = useState('')
  const [meta,         setMeta]         = useState<Meta>({})
  const [metaLoaded,   setMetaLoaded]   = useState(false)
  const [copiedIdx,    setCopiedIdx]    = useState<number | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, streamText])

  const send = useCallback(async (overrideText?: string, overrideMode?: string) => {
    const text = overrideText ?? input.trim()
    if (!text || streaming) return
    const activeMode = overrideMode ?? mode
    setInput('')

    const userMsg: Msg = { role: 'user', content: text, mode: activeMode, ts: Date.now() }
    const allMsgs = [...msgs, userMsg]
    setMsgs(allMsgs)
    setStreaming(true)
    setStreamText('')

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/superadmin/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
          mode: activeMode,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let buf  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.type === 'meta') {
              setMeta(parsed.meta)
              setMetaLoaded(true)
            } else if (parsed.type === 'text') {
              full += parsed.text
              setStreamText(full)
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error)
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e
          }
        }
      }

      setMsgs(prev => [...prev, { role: 'assistant', content: full, mode: activeMode, ts: Date.now() }])
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMsgs(prev => [...prev, {
          role: 'assistant', content: `Error: ${e.message ?? 'Unknown error'}`,
          mode: activeMode, ts: Date.now(), error: true,
        }])
      }
    } finally {
      setStreaming(false)
      setStreamText('')
    }
  }, [input, msgs, mode, streaming])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  const copy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1800)
  }

  const currentMode = MODES.find(m => m.id === mode) ?? MODES[0]
  const panel = { background: 'rgba(10,25,47,0.45)', border: `1px solid ${C.border}`, backdropFilter: 'blur(10px)' }

  return (
    <div className="flex h-full font-sci overflow-hidden" style={{ color: '#f1f5f9' }}>

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className="w-[270px] flex-shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: 'rgba(0,243,255,0.1)', background: 'rgba(3,7,18,0.7)' }}>

        {/* AI engine badge */}
        <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(0,243,255,0.08)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <Brain size={14} style={{ color: C.purple }} />
            <span className="text-[10px] font-lcd font-bold tracking-widest" style={{ color: C.purple }}>AI_ENGINE</span>
            <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-mono font-bold"
              style={{ background: `${C.purple}18`, border: `1px solid ${C.purple}40`, color: C.purple }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: C.purple }} />
              SONNET_4.6
            </div>
          </div>
          <div className="text-[8px] font-mono" style={{ color: C.muted }}>Anthropic Claude · Full System Access · Real-time DB</div>
        </div>

        {/* Context meta */}
        {metaLoaded && (
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,243,255,0.06)' }}>
            <div className="flex items-center gap-1 mb-2">
              <Database size={8} style={{ color: C.secondary }} />
              <span className="text-[8px] font-lcd uppercase tracking-widest" style={{ color: C.secondary }}>CONTEXT_LOADED</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {[
                { l: 'Kontingen', v: meta.total_kontingen },
                { l: 'Atlet',     v: meta.total_atlet     },
                { l: 'Verified',  v: meta.verified_atlet  },
                { l: 'Pending',   v: meta.pending_atlet   },
                { l: 'Users',     v: meta.active_users    },
                { l: 'Subs',      v: meta.active_subs     },
              ].map(s => (
                <div key={s.l} className="flex justify-between text-[9px] font-mono">
                  <span style={{ color: C.muted }}>{s.l}</span>
                  <span className="font-bold" style={{ color: C.primary }}>{s.v ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode selector */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,243,255,0.06)' }}>
          <div className="text-[8px] font-lcd uppercase tracking-widest mb-2" style={{ color: C.muted }}>ANALYSIS_MODE</div>
          <div className="space-y-1">
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="w-full text-left px-3 py-2 border transition-all"
                style={{
                  borderColor: mode === m.id ? `${m.color}50` : 'rgba(255,255,255,0.05)',
                  background:  mode === m.id ? `${m.color}0e` : 'transparent',
                }}>
                <div className="flex items-center gap-2">
                  <m.icon size={10} style={{ color: mode === m.id ? m.color : C.muted }} />
                  <span className="text-[10px] font-mono font-bold" style={{ color: mode === m.id ? m.color : C.muted }}>
                    {m.label}
                  </span>
                </div>
                <p className="text-[7.5px] font-mono mt-0.5 leading-tight" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {m.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Quick prompts */}
        <div className="px-4 py-3 flex-1">
          <div className="text-[8px] font-lcd uppercase tracking-widest mb-2" style={{ color: C.muted }}>QUICK_PROMPTS</div>
          <div className="space-y-1.5">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => { setMode(p.mode); void send(p.text, p.mode) }}
                disabled={streaming}
                className="w-full text-left px-2.5 py-2 border text-[8.5px] font-mono leading-snug transition-all disabled:opacity-40"
                style={{ borderColor: 'rgba(0,243,255,0.08)', color: C.muted }}
                onMouseEnter={e => { (e.currentTarget.style.borderColor = `${C.primary}35`); (e.currentTarget.style.color = '#e2e8f0') }}
                onMouseLeave={e => { (e.currentTarget.style.borderColor = 'rgba(0,243,255,0.08)'); (e.currentTarget.style.color = C.muted) }}>
                <ChevronRight size={8} className="inline mr-1 flex-shrink-0" style={{ color: C.primary }} />
                {p.text}
              </button>
            ))}
          </div>
        </div>

        {/* Clear */}
        <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(0,243,255,0.08)' }}>
          <button onClick={() => { setMsgs([]); setStreamText('') }}
            className="w-full flex items-center gap-2 justify-center px-3 py-2 border text-[9px] font-mono uppercase tracking-wider transition-all"
            style={{ borderColor: 'rgba(0,243,255,0.15)', color: C.muted }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = `${C.alert}40`)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,243,255,0.15)')}>
            <RefreshCw size={10} /> CLEAR_SESSION
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(0,243,255,0.1)', background: 'rgba(3,7,18,0.5)' }}>
          <div>
            <h1 className="font-lcd font-bold text-lg tracking-widest"
              style={{ color: C.primary, textShadow: `0 0 14px ${C.primary}` }}>
              AI_SPORT_INTELLIGENCE
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: streaming ? C.accent : C.secondary }} />
              <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: C.muted }}>
                {streaming
                  ? `ANALYZING · ${currentMode.label}`
                  : `READY · ${currentMode.label} · ${msgs.filter(m => m.role === 'user').length} QUERIES`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[8px] font-mono px-2 py-1" style={{ color: C.muted, border: `1px solid ${C.border}` }}>
              {msgs.length} msg{msgs.length !== 1 ? 's' : ''} · multi-turn
            </div>
            <div className="text-[8px] font-mono px-2 py-1"
              style={{ color: C.purple, border: `1px solid ${C.purple}40`, background: `${C.purple}0a` }}>
              <Zap size={8} className="inline mr-1" />claude-sonnet-4-6
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.purple}30 transparent` }}>

          {/* Welcome state */}
          {msgs.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
              <div>
                <div className="w-20 h-20 border flex items-center justify-center mx-auto mb-4 relative"
                  style={{ borderColor: `${C.purple}50`, background: `${C.purple}0a` }}>
                  <div className="absolute inset-0 animate-pulse" style={{ background: `${C.purple}05` }} />
                  <Brain size={32} style={{ color: C.purple }} className="z-10" />
                </div>
                <div className="font-lcd font-bold text-xl mb-1" style={{ color: C.primary, textShadow: `0 0 16px ${C.primary}` }}>
                  AI SPORT INTELLIGENCE
                </div>
                <div className="text-[10px] font-mono" style={{ color: C.muted }}>
                  Claude Sonnet 4.6 · Akses real-time ke seluruh database PORPROV XV 2026
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {MODES.map(m => (
                  <button key={m.id}
                    onClick={() => {
                      setMode(m.id)
                      if (m.id !== 'chat') {
                        void send(`Jalankan ${m.label.toLowerCase()} — analisis seluruh data sistem`, m.id)
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-3 border text-left transition-all"
                    style={{ borderColor: `${m.color}35`, background: `${m.color}08`, color: m.color }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${m.color}14`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `${m.color}08`)}>
                    <m.icon size={13} />
                    <div>
                      <div className="text-[10px] font-mono font-bold">{m.label}</div>
                      <div className="text-[7.5px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {msgs.map((msg, i) => {
            const isUser = msg.role === 'user'
            const mCfg   = MODES.find(m => m.id === msg.mode) ?? MODES[0]
            return (
              <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center border mt-1"
                    style={{ borderColor: `${C.purple}40`, background: `${C.purple}10` }}>
                    <Brain size={13} style={{ color: C.purple }} />
                  </div>
                )}
                <div className="max-w-[82%] min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {isUser
                      ? <span className="text-[8px] font-mono ml-auto" style={{ color: C.muted }}>
                          YOU · {new Date(msg.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      : <>
                          <mCfg.icon size={8} style={{ color: mCfg.color }} />
                          <span className="text-[8px] font-mono" style={{ color: C.muted }}>
                            AI · {mCfg.label} · {new Date(msg.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                    }
                  </div>
                  <div className="relative group px-4 py-3 text-sm leading-relaxed"
                    style={{
                      background: isUser ? 'rgba(0,243,255,0.05)' : msg.error ? 'rgba(255,51,102,0.06)' : 'rgba(168,85,247,0.06)',
                      border: `1px solid ${isUser ? 'rgba(0,243,255,0.18)' : msg.error ? 'rgba(255,51,102,0.25)' : 'rgba(168,85,247,0.18)'}`,
                    }}>
                    {isUser
                      ? <p className="text-sm font-mono whitespace-pre-wrap">{msg.content}</p>
                      : <div className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: msg.error
                            ? `<span style="color:#ff3366"><AlertTriangle size={12}/> ${msg.content}</span>`
                            : md(msg.content)
                          }} />
                    }
                    {!isUser && !msg.error && (
                      <button onClick={() => void copy(msg.content, i)}
                        className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity border"
                        style={{ borderColor: 'rgba(255,255,255,0.08)', color: C.muted }}
                        title="Copy">
                        {copiedIdx === i
                          ? <Check size={9} style={{ color: C.secondary }} />
                          : <Copy size={9} />}
                      </button>
                    )}
                  </div>
                </div>
                {isUser && (
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center border mt-1 text-[8px] font-lcd font-bold"
                    style={{ borderColor: `${C.primary}40`, background: `${C.primary}0a`, color: C.primary }}>
                    SA
                  </div>
                )}
              </div>
            )
          })}

          {/* Streaming bubble */}
          {streaming && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center border mt-1"
                style={{ borderColor: `${C.purple}50`, background: `${C.purple}10` }}>
                <Brain size={13} className="animate-pulse" style={{ color: C.purple }} />
              </div>
              <div className="max-w-[82%]">
                <div className="text-[8px] font-mono mb-1 flex items-center gap-1" style={{ color: C.muted }}>
                  <Loader2 size={7} className="animate-spin" />
                  AI · GENERATING...
                </div>
                <div className="px-4 py-3 text-sm leading-relaxed"
                  style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.18)' }}>
                  {streamText
                    ? <div dangerouslySetInnerHTML={{ __html:
                        md(streamText) +
                        '<span class="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle" style="background:#a855f7"></span>'
                      }} />
                    : <div className="flex items-center gap-2" style={{ color: C.muted }}>
                        <Loader2 size={12} className="animate-spin" />
                        <span className="text-[10px] font-mono">Mengambil data real-time & menganalisis...</span>
                      </div>
                  }
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t px-6 py-4"
          style={{ borderColor: 'rgba(0,243,255,0.1)', background: 'rgba(3,7,18,0.5)' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-[8px] font-mono">
              <currentMode.icon size={9} style={{ color: currentMode.color }} />
              <span style={{ color: currentMode.color }}>MODE: {currentMode.label}</span>
            </div>
            <span className="ml-auto text-[8px] font-mono" style={{ color: C.muted }}>
              Enter kirim · Shift+Enter baris baru
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 border transition-colors"
              style={{
                borderColor: streaming ? `${C.purple}50` : 'rgba(0,243,255,0.2)',
                background: 'rgba(10,25,47,0.7)',
              }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={streaming}
                rows={2}
                placeholder={`Tanya AI tentang data PORPROV XV... (${currentMode.label})`}
                className="w-full bg-transparent px-4 py-3 text-sm font-mono text-white outline-none resize-none disabled:opacity-50 placeholder-[#3a4a5e]"
                style={{ scrollbarWidth: 'thin' }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => void send()}
                disabled={!input.trim() || streaming}
                className="flex-1 w-12 flex items-center justify-center border transition-all disabled:opacity-30"
                style={{
                  borderColor: `${currentMode.color}50`,
                  background: `${currentMode.color}10`,
                  color: currentMode.color,
                }}>
                {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
              {streaming && (
                <button onClick={() => { abortRef.current?.abort(); setStreaming(false); setStreamText('') }}
                  className="w-12 py-1.5 border text-[8px] font-mono"
                  style={{ borderColor: `${C.alert}40`, color: C.alert, background: `${C.alert}08` }}>
                  <X size={10} className="mx-auto" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
