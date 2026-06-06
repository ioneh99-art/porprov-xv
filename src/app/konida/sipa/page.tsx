'use client'
// src/app/konida/sipa/kabbogor/page.tsx
// Sport Intelligence — AI Sport Strategist for KONI Kab. Bogor
// 4 Capability: Chat, Auto Insights, Athlete Lookup, Strategic Brief
// Hybrid LLM: Groq (fast) + Claude (deep)

import { useState, useRef, useEffect } from 'react'
import {
  Brain, Send, Sparkles, Users, FileText, MessageSquare,
  Loader2, Zap, ChevronRight, RefreshCw, Copy, Check,
  Activity, Trophy, AlertTriangle, Search,
} from 'lucide-react'

const ACCENT = '#00ffaa'

// ── Sample question prompts ──────────────────
const SAMPLE_QUESTIONS = [
  'Cabor mana yang paling berpotensi medali emas?',
  'Atlet mana yang butuh evaluasi medis segera?',
  'Apa strategi catch-up untuk naik peringkat?',
  'Berapa target realistis medali Kab. Bogor?',
  'Cabor mana yang harus diprioritaskan latihan?',
  'Bagaimana posisi kita vs Kab. Sukabumi?',
]

type Mode = 'chat' | 'insights' | 'athlete' | 'brief'

interface Message {
  role: 'user' | 'assistant'
  content: string
  provider?: 'groq' | 'claude'
  ts: number
}

// ── Simple markdown renderer (bold, bullet, emoji) ────────
function Markdown({ text }: { text: string }) {
  // Process: **bold**, lines starting with •/-/*/digit., emoji preserved
  const lines = text.split('\n')
  return (
    <div className="text-sm leading-relaxed space-y-2 text-zinc-200">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1"/>
        // Bold replacement
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} className="text-white font-bold">{p.slice(2,-2)}</strong>
            : <span key={j}>{p}</span>
        )
        // Bullet
        if (/^[•\-*]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span style={{ color: ACCENT }}>•</span>
              <span className="flex-1">{parts.slice(0).map((p, k) => {
                if (k === 0 && typeof p.props.children === 'string') {
                  return <span key={k}>{(p.props.children as string).replace(/^[•\-*]\s/, '')}</span>
                }
                return p
              })}</span>
            </div>
          )
        }
        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span style={{ color: ACCENT }} className="font-mono font-bold">{line.match(/^\d+/)?.[0]}.</span>
              <span className="flex-1">{parts.slice(0).map((p, k) => {
                if (k === 0 && typeof p.props.children === 'string') {
                  return <span key={k}>{(p.props.children as string).replace(/^\d+\.\s/, '')}</span>
                }
                return p
              })}</span>
            </div>
          )
        }
        // Heading: line starts with emoji + word
        if (/^[📊🎯📋📌⚠️🌟💪🏆📈🔥✨🚨💡⭐🥇🥈🥉]/.test(line)) {
          return <div key={i} className="text-sm font-bold text-white mt-2">{parts}</div>
        }
        return <p key={i}>{parts}</p>
      })}
    </div>
  )
}

export default function PageSportIntelligence() {
  const [mode, setMode] = useState<Mode>('chat')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [chatProvider, setChatProvider] = useState<'groq'|'claude'>('groq')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Halo! Saya **Sport Intelligence AI** untuk KONI Kab. Bogor. Tanya saya apa saja seputar atlet, cabor, atau strategi PORPROV XV. Saya analisis pakai data real-time dari sistem.',
      ts: Date.now(),
    },
  ])
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Insights state
  const [insights, setInsights] = useState<string>('')
  const [insightsTs, setInsightsTs] = useState<number>(0)

  // Athlete state
  const [atletQuery, setAtletQuery] = useState('')
  const [atletAnalysis, setAtletAnalysis] = useState<string>('')

  // Brief state
  const [brief, setBrief] = useState<string>('')
  const [briefTs, setBriefTs] = useState<number>(0)
  const [briefCopied, setBriefCopied] = useState(false)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── API helper ─────────────────────
  async function callAPI(payload: any): Promise<{reply:string; provider:'groq'|'claude'}> {
    const res = await fetch('/api/sport-intel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, kontingenId: 1 }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
  }

  // ── Chat handler ───────────────────
  async function handleSendChat(query?: string) {
    const message = (query ?? chatInput).trim()
    if (!message || loading) return

    setMessages(m => [...m, { role: 'user', content: message, ts: Date.now() }])
    setChatInput('')
    setLoading(true)
    setError('')

    try {
      const { reply, provider } = await callAPI({ mode: 'chat', message, provider: chatProvider })
      setMessages(m => [...m, { role: 'assistant', content: reply, provider, ts: Date.now() }])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Insights handler ──────────────
  async function loadInsights() {
    setLoading(true); setError('')
    try {
      const { reply } = await callAPI({ mode: 'insights' })
      setInsights(reply)
      setInsightsTs(Date.now())
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  // ── Athlete handler ────────────────
  async function handleAtletLookup() {
    if (!atletQuery.trim() || loading) return
    setLoading(true); setError(''); setAtletAnalysis('')
    try {
      const { reply } = await callAPI({ mode: 'athlete', atletName: atletQuery.trim() })
      setAtletAnalysis(reply)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  // ── Brief handler ──────────────────
  async function loadBrief() {
    setLoading(true); setError('')
    try {
      const { reply } = await callAPI({ mode: 'brief' })
      setBrief(reply)
      setBriefTs(Date.now())
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  function copyBrief() {
    navigator.clipboard.writeText(brief)
    setBriefCopied(true)
    setTimeout(() => setBriefCopied(false), 2000)
  }

  // ── Tabs config ───────────────────
  const tabs: Array<{ k: Mode; l: string; icon: any; sub: string }> = [
    { k:'chat',     l:'Smart Chat',       icon:MessageSquare, sub:'Tanya jawab interaktif' },
    { k:'insights', l:'Auto Insights',    icon:Sparkles,      sub:'5 insight strategis'    },
    { k:'athlete',  l:'Athlete Lookup',   icon:Users,         sub:'Analisis per atlet'     },
    { k:'brief',    l:'Strategic Brief',  icon:FileText,      sub:'Executive summary'      },
  ]

  return (
    <div className="min-h-screen text-zinc-300 font-sans" style={{ background:'linear-gradient(145deg, #020a05 0%, #05160e 100%)' }}>

      {/* Bg grid */}
      <div className="fixed inset-0 pointer-events-none opacity-30 mix-blend-overlay" style={{ zIndex:0,
        backgroundImage:`linear-gradient(${ACCENT}06 1px,transparent 1px),linear-gradient(90deg,${ACCENT}06 1px,transparent 1px)`,
        backgroundSize:'60px 60px' }}/>

      {/* ═════════ HEADER ═════════ */}
      <header className="sticky top-0 z-40 px-6 py-4 backdrop-blur-xl border-b shadow-lg"
        style={{ background:'rgba(2,13,6,0.85)', borderColor:`${ACCENT}15` }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}40`, boxShadow:`0 0 20px ${ACCENT}30` }}>
                <Brain size={20} style={{color:ACCENT}}/>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#020d06]"
                style={{ background:ACCENT, boxShadow:`0 0 8px ${ACCENT}` }}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                SPORT INTELLIGENCE
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                  style={{ background:'rgba(168,85,247,0.15)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.3)' }}>
                  AI Powered
                </span>
              </h1>
              <p className="text-[11px] font-mono uppercase tracking-widest mt-1" style={{ color:`${ACCENT}90` }}>
                Strategic AI Assistant · Hybrid Claude + Groq
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 relative z-10 space-y-5">

        {/* ═════════ TABS ═════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tabs.map(t => {
            const Icon = t.icon
            const active = mode === t.k
            return (
              <button key={t.k} onClick={() => { setMode(t.k); setError('') }}
                className="rounded-2xl p-4 text-left transition-all relative overflow-hidden group"
                style={{
                  background:  active ? `${ACCENT}10` : 'rgba(255,255,255,0.025)',
                  border:      active ? `1px solid ${ACCENT}40` : '1px solid rgba(255,255,255,0.07)',
                  boxShadow:   active ? `0 0 20px ${ACCENT}20` : 'none',
                }}>
                {active && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: ACCENT }}/>}
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: active ? `${ACCENT}20` : 'rgba(255,255,255,0.05)' }}>
                    <Icon size={16} style={{ color: active ? ACCENT : 'rgba(255,255,255,0.4)' }}/>
                  </div>
                  {active && (
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: ACCENT }}>
                      Active
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold mb-1" style={{ color: active ? 'white' : 'rgba(255,255,255,0.7)' }}>
                  {t.l}
                </div>
                <div className="text-[10px]" style={{ color: active ? `${ACCENT}90` : 'rgba(255,255,255,0.4)' }}>
                  {t.sub}
                </div>
              </button>
            )
          })}
        </div>

        {/* ═════════ ERROR BAR ═════════ */}
        {error && (
          <div className="rounded-xl p-3 flex items-start gap-2"
            style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0"/>
            <div className="text-xs text-red-300">{error}</div>
          </div>
        )}

        {/* ═════════ TAB CONTENT ═════════ */}

        {/* ── CHAT MODE ── */}
        {mode === 'chat' && (
          <div className="rounded-3xl overflow-hidden bg-white/[0.02] border border-white/[0.07] shadow-xl"
            style={{ minHeight: 560 }}>

            {/* Chat history */}
            <div className="p-5 overflow-y-auto" style={{ maxHeight: 480 }}>
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role==='user'?'justify-end':''}`}>
                    {m.role === 'assistant' && (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}30` }}>
                        <Brain size={14} style={{color:ACCENT}}/>
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role==='user' ? '' : 'flex-1'}`}
                      style={{
                        background: m.role==='user' ? `${ACCENT}15` : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${m.role==='user' ? ACCENT+'40' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      {m.role === 'user'
                        ? <div className="text-sm text-white">{m.content}</div>
                        : <Markdown text={m.content}/>}
                      {m.provider && (
                        <div className="text-[9px] mt-2 font-mono uppercase tracking-widest text-zinc-600">
                          via {m.provider === 'claude' ? 'Claude Sonnet 4.5' : 'Groq llama-3.3-70b'} · {new Date(m.ts).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background:`${ACCENT}15`, border:`1px solid ${ACCENT}30` }}>
                      <Loader2 size={14} className="animate-spin" style={{color:ACCENT}}/>
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-white/[0.04] border border-white/[0.08]">
                      <span className="text-xs text-zinc-400">Sedang menganalisa data...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
            </div>

            {/* Sample questions */}
            {messages.length <= 1 && (
              <div className="px-5 pb-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Pertanyaan Cepat:</div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_QUESTIONS.map((q,i) => (
                    <button key={i} onClick={()=>handleSendChat(q)}
                      className="px-3 py-1.5 rounded-lg text-[11px] transition-all hover:scale-[1.02]"
                      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="p-4 border-t border-white/[0.05] bg-black/20">
              {/* Provider Toggle */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">AI Engine:</span>
                <div className="flex gap-1 rounded-lg p-1" style={{ background:'rgba(255,255,255,0.04)' }}>
                  <button onClick={() => setChatProvider('groq')}
                    className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    style={{
                      background: chatProvider === 'groq' ? `${ACCENT}20` : 'transparent',
                      color:      chatProvider === 'groq' ? ACCENT : 'rgba(255,255,255,0.4)',
                      border:     chatProvider === 'groq' ? `1px solid ${ACCENT}40` : '1px solid transparent',
                    }}>
                    ⚡ Groq <span className="opacity-60">(Fast · ~2s)</span>
                  </button>
                  <button onClick={() => setChatProvider('claude')}
                    className="px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    style={{
                      background: chatProvider === 'claude' ? 'rgba(168,85,247,0.20)' : 'transparent',
                      color:      chatProvider === 'claude' ? '#c084fc' : 'rgba(255,255,255,0.4)',
                      border:     chatProvider === 'claude' ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent',
                    }}>
                    🧠 Claude <span className="opacity-60">(Smart · ~10s)</span>
                  </button>
                </div>
                <span className="text-[9px] text-zinc-500 ml-auto hidden sm:block">
                  💡 Tip: Claude untuk strategi mendalam, Groq untuk Q&A cepat
                </span>
              </div>

              <div className="flex gap-2">
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() } }}
                  placeholder={chatProvider === 'claude' ? "Tanya strategi mendalam (Claude akan analyze ~10 detik)..." : "Tanya tentang atlet, cabor, atau strategi..."}
                  disabled={loading}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#00ffaa]/50 transition-colors disabled:opacity-50"/>
                <button onClick={()=>handleSendChat()}
                  disabled={loading || !chatInput.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-40"
                  style={{
                    background: chatProvider === 'claude' ? 'rgba(168,85,247,0.20)' : `${ACCENT}20`,
                    color:      chatProvider === 'claude' ? '#c084fc' : ACCENT,
                    border:     `1px solid ${chatProvider === 'claude' ? 'rgba(168,85,247,0.40)' : ACCENT+'40'}`,
                  }}>
                  <Send size={13}/> Kirim
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── INSIGHTS MODE ── */}
        {mode === 'insights' && (
          <div className="rounded-3xl p-6 bg-white/[0.02] border border-white/[0.07] shadow-xl">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Sparkles size={16} style={{color:ACCENT}}/>
                <h2 className="text-lg font-black text-white">Auto Insights</h2>
                {insightsTs > 0 && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Generated {new Date(insightsTs).toLocaleTimeString('id-ID')}
                  </span>
                )}
              </div>
              <button onClick={loadInsights} disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                style={{ background:`${ACCENT}15`, color:ACCENT, border:`1px solid ${ACCENT}40` }}>
                {loading
                  ? <><Loader2 size={12} className="animate-spin"/> Generating...</>
                  : <><RefreshCw size={12}/> {insights ? 'Refresh' : 'Generate Insights'}</>}
              </button>
            </div>

            {insights ? (
              <div className="rounded-2xl p-5 bg-black/20 border border-white/[0.05]">
                <Markdown text={insights}/>
                <div className="text-[9px] mt-4 pt-3 font-mono uppercase tracking-widest text-zinc-600 border-t border-white/[0.05]">
                  Powered by Groq · llama-3.3-70b
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-zinc-500">
                <Sparkles size={32} className="mx-auto mb-3 opacity-30"/>
                Klik "Generate Insights" untuk analisis real-time data Bogor
              </div>
            )}
          </div>
        )}

        {/* ── ATHLETE MODE ── */}
        {mode === 'athlete' && (
          <div className="rounded-3xl p-6 bg-white/[0.02] border border-white/[0.07] shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <Users size={16} style={{color:ACCENT}}/>
              <h2 className="text-lg font-black text-white">Athlete Analysis</h2>
            </div>

            <div className="flex gap-2 mb-5">
              <div className="flex-1 relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
                <input value={atletQuery} onChange={e=>setAtletQuery(e.target.value)}
                  onKeyDown={e=>{ if (e.key==='Enter') handleAtletLookup() }}
                  placeholder="Ketik nama atlet (contoh: Riko, Taufik)..."
                  disabled={loading}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#00ffaa]/50 disabled:opacity-50"/>
              </div>
              <button onClick={handleAtletLookup} disabled={loading || !atletQuery.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-40"
                style={{ background:`${ACCENT}20`, color:ACCENT, border:`1px solid ${ACCENT}40` }}>
                {loading ? <><Loader2 size={13} className="animate-spin"/> Analisa...</> : <><Sparkles size={13}/> Analisa</>}
              </button>
            </div>

            <div className="text-[10px] text-zinc-500 mb-4">
              💡 Tips: Data tersedia untuk atlet Top 10 performers (Riko, Taufik, Razandra) atau atlet skor &lt;50% (perlu evaluasi)
            </div>

            {atletAnalysis ? (
              <div className="rounded-2xl p-5 bg-black/20 border border-white/[0.05]">
                <Markdown text={atletAnalysis}/>
                <div className="text-[9px] mt-4 pt-3 font-mono uppercase tracking-widest text-zinc-600 border-t border-white/[0.05]">
                  Powered by Groq · llama-3.3-70b
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-zinc-500">
                <Users size={32} className="mx-auto mb-3 opacity-30"/>
                Cari atlet untuk analisa profil, strengths, weaknesses & training plan
              </div>
            )}
          </div>
        )}

        {/* ── BRIEF MODE ── */}
        {mode === 'brief' && (
          <div className="rounded-3xl p-6 bg-white/[0.02] border border-white/[0.07] shadow-xl">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <FileText size={16} style={{color:ACCENT}}/>
                <h2 className="text-lg font-black text-white">Strategic Brief</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                  style={{ background:'rgba(168,85,247,0.15)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.3)' }}>
                  Powered by Claude
                </span>
                {briefTs > 0 && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {new Date(briefTs).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {brief && (
                  <button onClick={copyBrief}
                    className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                    style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)' }}>
                    {briefCopied ? <><Check size={12} className="text-emerald-400"/> Copied!</> : <><Copy size={12}/> Copy</>}
                  </button>
                )}
                <button onClick={loadBrief} disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                  style={{ background:'rgba(168,85,247,0.15)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.4)' }}>
                  {loading
                    ? <><Loader2 size={12} className="animate-spin"/> Claude analyzing...</>
                    : <><Zap size={12}/> {brief ? 'Regenerate' : 'Generate Brief'}</>}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
              📌 <strong>Strategic Brief</strong> di-generate oleh Claude Sonnet 4.5 untuk reasoning yang lebih dalam.
              Output: Executive Summary, 3 Prioritas Strategis, Risiko & Mitigasi, dan Outlook.
              Format siap copy ke meeting agenda.
            </div>

            {brief ? (
              <div className="rounded-2xl p-6 bg-black/20 border border-purple-500/15">
                <Markdown text={brief}/>
                <div className="text-[9px] mt-4 pt-3 font-mono uppercase tracking-widest text-zinc-600 border-t border-purple-500/15">
                  Generated by Claude Sonnet 4.5 · Anthropic
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-zinc-500">
                <FileText size={32} className="mx-auto mb-3 opacity-30"/>
                Klik "Generate Brief" untuk executive summary lengkap untuk meeting pengurus
              </div>
            )}
          </div>
        )}

      </main>

      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${ACCENT}40;border-radius:10px}
      `}</style>
    </div>
  )
}
