'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, Bell, Building2, Calendar,
  CheckCircle, ChevronRight, Clock, Cpu, Loader2,
  Mic, RefreshCw, Send, Shield, Sparkles, Users,
  Wifi, X, Zap, TrendingUp, Navigation, MessageSquare,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────
interface Message {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  intent?: string
  timestamp: Date
  isProactive?: boolean
}

interface ContextInfo {
  tanggal?: string
  jam?: string
  lagaLive?: number
  totalJadwal?: number
  totalVenue?: number
}

// ─── Quick Actions ────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Status Venue Sekarang', icon: Building2, color: 'bg-cyan-50 text-cyan-700 border-cyan-200', prompt: 'Berikan status terkini semua venue Klaster I Bekasi yang sedang aktif sekarang.' },
  { label: 'Pertandingan Live', icon: Activity, color: 'bg-green-50 text-green-700 border-green-200', prompt: 'Pertandingan apa yang sedang berlangsung saat ini? Berikan detail lengkap.' },
  { label: 'Cek Incident Aktif', icon: AlertTriangle, color: 'bg-red-50 text-red-700 border-red-200', prompt: 'Ada incident atau masalah apa yang masih terbuka/belum diselesaikan di venue?' },
  { label: 'Jadwal Hari Ini', icon: Calendar, color: 'bg-blue-50 text-blue-700 border-blue-200', prompt: 'Tampilkan seluruh jadwal pertandingan hari ini beserta venue dan waktu mulainya.' },
  { label: 'Tamu VIP & Protokoler', icon: Shield, color: 'bg-purple-50 text-purple-700 border-purple-200', prompt: 'Siapa saja tamu VIP yang terdaftar hari ini dan apa yang perlu dipersiapkan?' },
  { label: 'Koordinasi Petugas', icon: Users, color: 'bg-orange-50 text-orange-700 border-orange-200', prompt: 'Bantu saya mengkoordinasikan penugasan petugas untuk venue yang aktif hari ini.' },
  { label: 'Analisis Kesiapan', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', prompt: 'Analisis tingkat kesiapan teknis semua venue dan beri rekomendasi yang perlu diperhatikan.' },
  { label: 'Update Klasemen Medali', icon: TrendingUp, color: 'bg-yellow-50 text-yellow-700 border-yellow-200', prompt: 'Berikan update klasemen medali sementara dan kontingen mana yang perlu diperhatikan.' },
]

// Proactive alerts yang muncul otomatis
const PROACTIVE_ALERTS = [
  {
    id: 'alert1',
    type: 'warning',
    title: 'Sound system Stadion Patriot',
    body: 'Masalah sound system tribun barat belum resolved sejak 14.00. Pertandingan Atletik mulai 16.00 — perlu tindakan segera.',
    action: 'Lihat Detail',
  },
  {
    id: 'alert2',
    type: 'info',
    title: 'Tamu VIP tiba 30 menit lagi',
    body: 'Rombongan Deputi KEMENPORA dijadwalkan tiba pukul 15.30. Pastikan escort & lounge VIP siap.',
    action: 'Cek Akomodasi',
  },
]

// ─── Message Bubble ───────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-blue-50 border border-blue-100 text-blue-600 text-xs px-4 py-2 rounded-full flex items-center gap-2">
          <Sparkles size={12} /> {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-5`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20 mt-1">
          <Cpu size={16} className="text-white" />
        </div>
      )}
      {isUser && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0 mt-1">
          <Users size={14} className="text-gray-600" />
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Label */}
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold text-blue-600">SIPA Intelligence</span>
            {msg.intent && msg.intent !== 'umum' && (
              <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                {msg.intent}
              </span>
            )}
            {msg.isProactive && (
              <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                <Zap size={8} /> Proaktif
              </span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-500/20'
            : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
        }`}>
          {/* Render newlines */}
          {msg.content.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < msg.content.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>

        {/* Timestamp */}
        <span className="text-[9px] text-gray-400 px-1">
          {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

// ─── Alert Card ───────────────────────────────────────────
function AlertCard({ alert, onAsk }: { alert: typeof PROACTIVE_ALERTS[0]; onAsk: (q: string) => void }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const isWarning = alert.type === 'warning'
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${
      isWarning ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isWarning ? 'bg-red-100' : 'bg-blue-100'
      }`}>
        {isWarning ? <AlertTriangle size={16} className="text-red-600" /> : <Bell size={16} className="text-blue-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-bold mb-1 ${isWarning ? 'text-red-700' : 'text-blue-700'}`}>{alert.title}</div>
        <p className={`text-xs leading-relaxed ${isWarning ? 'text-red-600' : 'text-blue-600'}`}>{alert.body}</p>
        <button
          onClick={() => onAsk(alert.body)}
          className={`mt-2 text-[10px] font-bold flex items-center gap-1 ${isWarning ? 'text-red-700 hover:text-red-900' : 'text-blue-700 hover:text-blue-900'}`}
        >
          {alert.action} <ChevronRight size={10} />
        </button>
      </div>
      <button onClick={() => setDismissed(true)} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Typing Indicator ─────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
        <Cpu size={16} className="text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Live Context Bar ─────────────────────────────────────
function ContextBar({ ctx, loading }: { ctx: ContextInfo; loading: boolean }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {[
        { icon: Wifi, label: 'SIPA Live', value: 'Online', color: 'text-green-500' },
        { icon: Building2, label: 'Venue', value: ctx.totalVenue ? `${ctx.totalVenue} aktif` : '—' },
        { icon: Activity, label: 'Live Sekarang', value: ctx.lagaLive !== undefined ? `${ctx.lagaLive} laga` : '—', color: ctx.lagaLive ? 'text-red-500' : undefined },
        { icon: Calendar, label: 'Jadwal Hari Ini', value: ctx.totalJadwal ? `${ctx.totalJadwal} laga` : '—' },
        { icon: Clock, label: 'Update', value: ctx.jam ?? '—' },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <item.icon size={12} className={item.color ?? 'text-gray-400'} />
          <span className="text-gray-400">{item.label}:</span>
          <span className={`font-bold ${item.color ?? 'text-gray-700'}`}>{loading ? '...' : item.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function SIPAPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ctxInfo, setCtxInfo] = useState<ContextInfo>({})
  const [animIn, setAnimIn] = useState(false)
  const [showAlerts, setShowAlerts] = useState(true)
  const [msgIdCounter, setMsgIdCounter] = useState(1)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Animasi masuk
  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Pesan sambutan proaktif
  useEffect(() => {
    const now = new Date()
    const greeting = now.getHours() < 12 ? 'Selamat pagi' : now.getHours() < 17 ? 'Selamat siang' : 'Selamat sore'
    addMessage({
      role: 'assistant',
      content: `${greeting}! 👋 Saya **SIPA**, asisten AI operasional PORPROV XV Klaster I Kota Bekasi.\n\nSaya terhubung ke data real-time venue, jadwal, incident, dan koordinasi lapangan. Anda bisa tanya apa saja atau pilih salah satu aksi cepat di bawah.\n\nAda yang bisa saya bantu sekarang?`,
      isProactive: true,
    })
  }, [])

  function addMessage(msg: Omit<Message, 'id' | 'timestamp'>) {
    setMsgIdCounter(prev => {
      const id = prev + 1
      setMessages(msgs => [...msgs, { ...msg, id, timestamp: new Date() }])
      return id
    })
  }

  async function sendMessage(questionOverride?: string) {
    const question = (questionOverride ?? input).trim()
    if (!question || loading) return

    setInput('')
    addMessage({ role: 'user', content: question })
    setLoading(true)

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .slice(-8)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const res = await fetch('/api/sipa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      })

      const data = await res.json()

      if (data.error) {
        addMessage({ role: 'assistant', content: `⚠️ ${data.error}` })
        return
      }

      // Update context info
      if (data.context) setCtxInfo(data.context)

      addMessage({
        role: 'assistant',
        content: data.answer,
        intent: data.intent,
      })
    } catch (e) {
      addMessage({ role: 'assistant', content: '⚠️ Gagal terhubung ke SIPA. Pastikan koneksi internet stabil.' })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const ani = (d = 0) => ({
    style: { transitionDelay: `${d}ms`, transition: 'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 font-sans flex flex-col gap-6">

      {/* ─── Header ─── */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* SIPA Logo */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Cpu size={26} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-light text-[#3c4858]">SIPA Intelligence</h1>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-green-700">LIVE</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">Sistem Informasi Pengelolaan Acara · PORPROV XV Klaster I Bekasi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAlerts(a => !a)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm border transition-all ${
              showAlerts ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <Bell size={14} />
            Alert {PROACTIVE_ALERTS.length > 0 && `(${PROACTIVE_ALERTS.length})`}
          </button>
          <button
            onClick={() => { setMessages([]); setTimeout(() => { const t = document.querySelector('input'); t?.focus() }, 100) }}
            className="bg-white hover:bg-gray-50 px-4 py-2 rounded-full shadow-sm text-sm text-gray-600 flex items-center gap-2 border border-gray-100"
          >
            <RefreshCw size={14} /> Reset Chat
          </button>
        </div>
      </div>

      {/* ─── Context Bar ─── */}
      <div {...ani(40)} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3">
        <ContextBar ctx={ctxInfo} loading={false} />
      </div>

      {/* ─── Main Layout ─── */}
      <div className="grid grid-cols-3 gap-6 flex-1">

        {/* ─── Left: Quick Actions + Alerts ─── */}
        <div {...ani(60)} className="col-span-1 space-y-4">

          {/* Proactive Alerts */}
          {showAlerts && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Zap size={14} className="text-orange-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Alert Proaktif</span>
              </div>
              {PROACTIVE_ALERTS.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAsk={(q) => void sendMessage(q)}
                />
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <div className="flex items-center gap-2 px-1 mb-3">
              <Sparkles size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi Cepat</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => void sendMessage(action.prompt)}
                  disabled={loading}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:shadow-sm active:scale-95 disabled:opacity-50 ${action.color} bg-opacity-50`}
                >
                  <action.icon size={15} className="flex-shrink-0" />
                  <span className="text-xs font-medium leading-tight">{action.label}</span>
                  <ChevronRight size={12} className="ml-auto flex-shrink-0 opacity-50" />
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4">
            <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
              <MessageSquare size={12} /> Tips Penggunaan SIPA
            </div>
            <ul className="text-xs text-blue-600 space-y-1.5 leading-relaxed">
              <li>• Tanya dalam Bahasa Indonesia natural</li>
              <li>• SIPA terhubung ke data real-time</li>
              <li>• Bisa tanya soal venue, jadwal, incident, tamu VIP</li>
              <li>• SIPA proaktif memberi peringatan penting</li>
            </ul>
          </div>
        </div>

        {/* ─── Right: Chat Area ─── */}
        <div {...ani(80)} className="col-span-2 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>

          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
              <span className="text-white font-medium text-sm">SIPA sedang online & siap membantu</span>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Clock size={12} />
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-1 bg-gray-50/30">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanya SIPA apa saja tentang operasional PORPROV XV..."
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-60 transition-all"
                />
                {input && (
                  <button onClick={() => setInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {loading
                  ? <Loader2 size={18} className="text-white animate-spin" />
                  : <Send size={18} className="text-white" />
                }
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              SIPA menggunakan AI — selalu verifikasi info penting ke petugas lapangan
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}