'use client'
// src/app/konida/sipa/page.tsx — Dark Futuristic Glass Theme

import { useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, Building2, Calendar,
  CheckCircle, ChevronRight, Clock, Cpu, Loader2,
  RefreshCw, Send, Shield, Sparkles, Users,
  X, Zap, TrendingUp, MapPin, BarChart2, Award, Database,
} from 'lucide-react'

interface Message {
  id: number; role: 'user'|'assistant'|'system'
  content: string; timestamp: Date; isProactive?: boolean
}
interface UserCtx {
  role: string; kontingen_id: number|null
  kontingen_nama: string; plan_id: string; tenant_id: string
}

const TENANT_COLORS: Record<string, string> = {
  kabbogor:'#00ffaa', kotabekasi:'#ff6b35', kabbekasi:'#4da6ff',
  kotabandung:'#6495ed', kabbandung:'#4da6ff', kotadepok:'#b44fff',
  kotabogor:'#00e676', kabkarawang:'#ff5252', kabbandungbarat:'#00e5ff',
  kotacirebon:'#ffd700',
}

function getQuickActions(role: string, nama: string) {
  const konida = [
    { label:'Ringkasan kontingen',    icon:Users,       prompt:`Ringkasan lengkap kontingen ${nama}: atlet, verifikasi, klasemen.` },
    { label:'Atlet non-lokal?',       icon:MapPin,      prompt:`Berapa atlet ${nama} dari luar daerah dan dari mana?` },
    { label:'Posisi klasemen',        icon:TrendingUp,  prompt:`Posisi klasemen medali kontingen ${nama}?` },
    { label:'Cabor terbanyak',        icon:Award,       prompt:`Cabor terbanyak atlet di ${nama}?` },
    { label:'Atlet belum verified',   icon:Clock,       prompt:`Atlet ${nama} yang masih menunggu verifikasi?` },
    { label:'Profil demografis',      icon:BarChart2,   prompt:`Demografis atlet ${nama}: umur, gender, cabor dominan.` },
    { label:'Top 5 klasemen PORPROV', icon:Award,       prompt:'Top 5 klasemen medali PORPROV XV saat ini.' },
    { label:'Info cabor PORPROV',     icon:Database,    prompt:'Berapa cabor di PORPROV XV dan mana terbanyak?' },
  ]
  const penyelenggara = [
    { label:'Status venue',           icon:Building2,   prompt:'Status terkini venue yang aktif.' },
    { label:'Pertandingan live',      icon:Activity,    prompt:'Pertandingan yang sedang berlangsung.' },
    { label:'Incident aktif',         icon:AlertTriangle,prompt:'Incident yang masih terbuka.' },
    { label:'Jadwal hari ini',        icon:Calendar,    prompt:'Jadwal pertandingan hari ini.' },
    { label:'Tamu VIP',               icon:Shield,      prompt:'Tamu VIP terdaftar dan persiapannya.' },
    { label:'Kesiapan venue',         icon:CheckCircle, prompt:'Kesiapan teknis semua venue.' },
    { label:'Update klasemen',        icon:TrendingUp,  prompt:'Update klasemen medali sementara.' },
    { label:'Data cabor',             icon:Database,    prompt:'Info cabor PORPROV XV.' },
  ]
  const publik = [
    { label:'Juara umum',             icon:Award,       prompt:'Juara umum sementara PORPROV XV?' },
    { label:'Klasemen medali',        icon:TrendingUp,  prompt:'Klasemen medali terkini.' },
    { label:'Info PORPROV XV',        icon:Sparkles,    prompt:'Tentang PORPROV XV Jawa Barat 2026.' },
    { label:'Daftar cabor',           icon:Database,    prompt:'Cabang olahraga di PORPROV XV.' },
  ]
  if (role==='penyelenggara') return penyelenggara
  if (role==='konida')        return konida
  return publik
}

function MsgBubble({ msg, accent }: { msg: Message; accent: string }) {
  const isUser = msg.role === 'user'
  if (msg.role === 'system') return (
    <div className="flex justify-center my-3">
      <div className="text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5"
        style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.1)' }}>
        <Sparkles size={10}/> {msg.content}
      </div>
    </div>
  )
  return (
    <div className={`flex gap-3 mb-5 ${isUser?'flex-row-reverse':'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl flex-shrink-0 mt-1 flex items-center justify-center"
          style={{ background:`${accent}20`, border:`1px solid ${accent}40`, boxShadow:`0 0 12px ${accent}30` }}>
          <Cpu size={14} style={{ color: accent }}/>
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-xl flex-shrink-0 mt-1 flex items-center justify-center"
          style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)' }}>
          <Users size={13} style={{ color:'rgba(255,255,255,0.6)' }}/>
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser?'items-end':'items-start'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold" style={{ color: accent }}>SIPA</span>
            {msg.isProactive && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"
                style={{ background:`${accent}20`, color: accent }}>
                <Zap size={7}/> AI
              </span>
            )}
          </div>
        )}
        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={isUser ? {
            background:`${accent}25`,
            border:`1px solid ${accent}40`,
            color:'white',
            borderTopRightRadius:4,
            boxShadow:`0 0 16px ${accent}15`,
          } : {
            background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.1)',
            color:'rgba(255,255,255,0.85)',
            borderTopLeftRadius:4,
            backdropFilter:'blur(8px)',
          }}>
          {msg.content.split('\n').map((line, i) => (
            <span key={i}>{line}{i<msg.content.split('\n').length-1&&<br/>}</span>
          ))}
        </div>
        <span className="text-[9px] px-1" style={{ color:'rgba(255,255,255,0.25)' }}>
          {msg.timestamp.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}
        </span>
      </div>
    </div>
  )
}

function Typing({ accent }: { accent: string }) {
  return (
    <div className="flex gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{ background:`${accent}20`, border:`1px solid ${accent}40` }}>
        <Cpu size={14} style={{ color: accent }}/>
      </div>
      <div className="rounded-2xl px-5 py-3.5 flex items-center gap-2"
        style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
        {[0,1,2].map(i=>(
          <div key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ backgroundColor:accent, animationDelay:`${i*150}ms`, opacity:0.8 }}/>
        ))}
      </div>
    </div>
  )
}

export default function SIPAPage() {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [animIn,    setAnimIn]    = useState(false)
  const [msgId,     setMsgId]     = useState(1)
  const [userCtx,   setUserCtx]   = useState<UserCtx>({
    role:'publik', kontingen_id:null, kontingen_nama:'', plan_id:'basic', tenant_id:'jabar'
  })
  const [ctxLoaded, setCtxLoaded] = useState(false)

  const chatEndRef   = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const greetedRef   = useRef(false)
  const isSendingRef = useRef(false)

  const accent = TENANT_COLORS[userCtx.tenant_id] ?? '#00b4ff'

  useEffect(() => {
    fetch('/api/auth/me', { credentials:'include' })
      .then(r=>r.json()).then(d=>{
        if(d&&!d.error) setUserCtx({
          role:d.role??'publik', kontingen_id:d.kontingen_id??null,
          kontingen_nama:d.kontingen_nama??'', plan_id:d.plan_id??'basic', tenant_id:d.tenant_id??'jabar'
        })
      }).catch(()=>{}).finally(()=>setCtxLoaded(true))
  },[])

  useEffect(()=>{ const t=setTimeout(()=>setAnimIn(true),80); return()=>clearTimeout(t) },[])
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}) },[messages,loading])

  useEffect(()=>{
    if(!ctxLoaded||greetedRef.current) return
    greetedRef.current = true
    const h = new Date().getHours()
    const g = h<12?'Selamat pagi':h<17?'Selamat siang':'Selamat sore'
    const nama = userCtx.kontingen_nama ? ` — ${userCtx.kontingen_nama}` : ''
    addMsg({ role:'assistant', isProactive:true,
      content:`${g}! Saya SIPA Intelligence${nama} 🤖\n\nTerhubung ke database real PORPROV XV. Saya siap menjawab pertanyaan tentang atlet, klasemen, cabor, dan lebih banyak lagi.\n\nPilih pertanyaan cepat atau ketik langsung!`
    })
  },[ctxLoaded])

  function addMsg(msg: Omit<Message,'id'|'timestamp'>) {
    setMsgId(p=>{ const id=p+1; setMessages(m=>[...m,{...msg,id,timestamp:new Date()}]); return id })
  }

  async function sendMessage(override?: string) {
    const q = (override??input).trim()
    if(!q||loading||isSendingRef.current) return
    isSendingRef.current = true
    setInput('')
    addMsg({role:'user',content:q})
    setLoading(true)
    try {
      const res = await fetch('/api/sipa',{
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          message:q, question:q, role:userCtx.role,
          kontingen_id:userCtx.kontingen_id,
          history:messages.filter(m=>m.role!=='system').slice(-8)
            .map(m=>({role:m.role as 'user'|'assistant',content:m.content}))
        })
      })
      const data = await res.json()
      addMsg({role:'assistant', content:data.reply??data.answer??data.error??'Tidak ada respons.'})
    } catch {
      addMsg({role:'assistant',content:'⚠️ Gagal terhubung ke SIPA.'})
    } finally {
      setLoading(false); isSendingRef.current=false; inputRef.current?.focus()
    }
  }

  function resetChat() {
    greetedRef.current=false; isSendingRef.current=false
    setMessages([]); setCtxLoaded(false)
    setTimeout(()=>setCtxLoaded(true),50)
  }

  const qa = getQuickActions(userCtx.role, userCtx.kontingen_nama||'kontingen')
  const ani = (d=0)=>({ style:{transitionDelay:`${d}ms`,transition:'all 0.6s ease'}, className:animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4' })

  return (
    <div className="min-h-screen p-5 flex flex-col gap-5"
      style={{ background:'linear-gradient(135deg,#060a0f 0%,#0a0f1a 50%,#060a0f 100%)', fontFamily:'system-ui,sans-serif' }}>

      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage:'linear-gradient(rgba(0,255,170,0.02) 1px,transparent 1px)', backgroundSize:'100% 3px', zIndex:0 }}/>

      {/* Grid bg */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage:`linear-gradient(${accent}06 1px,transparent 1px),linear-gradient(90deg,${accent}06 1px,transparent 1px)`, backgroundSize:'40px 40px', zIndex:0 }}/>

      {/* ── HEADER ── */}
      <div {...ani(0)} className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background:`${accent}15`, border:`1px solid ${accent}30`, boxShadow:`0 0 24px ${accent}20` }}>
              <Cpu size={26} style={{ color: accent }}/>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 animate-pulse"
              style={{ background:accent, borderColor:'#060a0f' }}/>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-light" style={{ color:'rgba(255,255,255,0.9)' }}>
                SIPA <span className="font-bold" style={{ color: accent }}>Intelligence</span>
              </h1>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background:`${accent}15`, border:`1px solid ${accent}30` }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }}/>
                <span className="text-[10px] font-bold" style={{ color: accent }}>LIVE · DB CONNECTED</span>
              </div>
            </div>
            <p className="text-sm" style={{ color:'rgba(255,255,255,0.35)' }}>
              Sistem Informasi Pintar · PORPROV XV Jawa Barat 2026
              {userCtx.kontingen_nama && <span style={{ color:`${accent}99` }}> · {userCtx.kontingen_nama}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background:`${accent}10`, border:`1px solid ${accent}20` }}>
            <Database size={12} style={{ color: accent }}/>
            <span className="text-xs font-semibold" style={{ color: accent }}>Data Real DB</span>
          </div>
          <button onClick={resetChat}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-all"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)' }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=`${accent}40`}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.1)'}}>
            <RefreshCw size={13}/> Reset
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="relative z-10 grid grid-cols-3 gap-5 flex-1">

        {/* Quick Actions */}
        <div {...ani(50)} className="col-span-1 space-y-4">
          <div>
            <div className="flex items-center gap-2 px-1 mb-3">
              <Sparkles size={13} style={{ color: accent }}/>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:'rgba(255,255,255,0.35)' }}>
                Pertanyaan Cepat
              </span>
            </div>
            <div className="space-y-1.5">
              {qa.map(a=>(
                <button key={a.label} onClick={()=>void sendMessage(a.prompt)} disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all disabled:opacity-40"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.65)' }}
                  onMouseEnter={e=>{const el=e.currentTarget as HTMLElement; el.style.borderColor=`${accent}40`; el.style.background=`${accent}10`; el.style.color='white'}}
                  onMouseLeave={e=>{const el=e.currentTarget as HTMLElement; el.style.borderColor='rgba(255,255,255,0.08)'; el.style.background='rgba(255,255,255,0.04)'; el.style.color='rgba(255,255,255,0.65)'}}>
                  <a.icon size={14} style={{ color: accent, flexShrink:0 }}/>
                  <span className="text-xs font-medium leading-tight flex-1">{a.label}</span>
                  <ChevronRight size={11} style={{ opacity:0.4 }}/>
                </button>
              ))}
            </div>
          </div>

          {/* DB Info */}
          <div className="rounded-xl p-4" style={{ background:`${accent}08`, border:`1px solid ${accent}15` }}>
            <div className="text-[10px] font-bold mb-3 flex items-center gap-1.5" style={{ color: accent }}>
              <Database size={11}/> Database Terhubung
            </div>
            {[
              '📊 1.097+ atlet real-time',
              '🏅 Klasemen 27 kontingen',
              '🏃 61 cabang olahraga',
              '🗺️ Asal daerah & demografi',
              '✅ Status verifikasi live',
            ].map(item=>(
              <div key={item} className="text-[10px] mb-1.5" style={{ color:`${accent}80` }}>{item}</div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div {...ani(70)} className="col-span-2 flex flex-col rounded-2xl overflow-hidden"
          style={{ height:'calc(100vh - 200px)', minHeight:520, background:'rgba(255,255,255,0.03)', border:`1px solid ${accent}20`, backdropFilter:'blur(12px)', boxShadow:`0 0 40px ${accent}10` }}>

          {/* Chat header */}
          <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
            style={{ background:`linear-gradient(135deg,${accent}15,${accent}08)`, borderBottom:`1px solid ${accent}20` }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }}/>
              <span className="font-medium text-sm" style={{ color:'rgba(255,255,255,0.8)' }}>
                SIPA · {userCtx.kontingen_nama||'PORPROV XV'} · {userCtx.plan_id}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color:'rgba(255,255,255,0.3)' }}>
              <Clock size={11}/>
              {new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})} WIB
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5"
            style={{ scrollbarWidth:'thin', scrollbarColor:`${accent}30 transparent` }}>
            {messages.map(msg=>(
              <MsgBubble key={msg.id} msg={msg} accent={accent}/>
            ))}
            {loading && <Typing accent={accent}/>}
            <div ref={chatEndRef}/>
          </div>

          {/* Input */}
          <div className="px-5 py-4 flex-shrink-0" style={{ borderTop:`1px solid rgba(255,255,255,0.06)` }}>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input ref={inputRef} value={input}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendMessage()} }}
                  placeholder={`Tanya SIPA tentang ${userCtx.kontingen_nama||'PORPROV XV'}...`}
                  disabled={loading}
                  className="w-full rounded-xl px-5 py-3 text-sm outline-none disabled:opacity-50 transition-all"
                  style={{
                    background:'rgba(255,255,255,0.06)',
                    border:`1px solid rgba(255,255,255,0.1)`,
                    color:'rgba(255,255,255,0.85)',
                  }}
                  onFocus={e=>{e.target.style.borderColor=`${accent}50`; e.target.style.boxShadow=`0 0 0 3px ${accent}10`}}
                  onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.boxShadow='none'}}/>
                {input && (
                  <button onClick={()=>setInput('')} className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color:'rgba(255,255,255,0.25)', background:'none', border:'none', cursor:'pointer' }}>
                    <X size={14}/>
                  </button>
                )}
              </div>
              <button onClick={()=>void sendMessage()} disabled={!input.trim()||loading}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
                style={{ background:`${accent}25`, border:`1px solid ${accent}40`, boxShadow:`0 0 16px ${accent}20` }}
                onMouseEnter={e=>{if(!loading&&input.trim())(e.currentTarget as HTMLElement).style.background=`${accent}40`}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${accent}25`}}>
                {loading
                  ? <Loader2 size={18} className="animate-spin" style={{ color: accent }}/>
                  : <Send size={18} style={{ color: accent }}/>
                }
              </button>
            </div>
            <p className="text-[10px] text-center mt-2" style={{ color:'rgba(255,255,255,0.2)' }}>
              SIPA · Data real PORPROV XV · Verifikasi info penting ke petugas
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}