'use client'
// src/app/konida/dashboard/premium/page.tsx
// Dashboard Premium — light theme profesional
// Untuk kontingen premium non-penyelenggara (Kab. Bogor, Kab. Bekasi, dll)

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Trophy, TrendingUp, CheckCircle, AlertTriangle,
  Clock, BarChart2, Download, Cpu, RefreshCw, Medal,
} from 'lucide-react'

interface UserData {
  nama_lengkap: string
  kontingen_nama: string
  kontingen_id: number
  plan_id: string
  features: string[]
}

interface Stats {
  total_atlet:    number
  verified:       number
  pending:        number
  ditolak:        number
  lolos_kual:     number
  total_emas:     number
  total_perak:    number
  total_perunggu: number
}

// Warna per kontingen_id
const KONTINGEN_COLORS: Record<number, { primary: string; light: string; name: string }> = {
  1:  { primary: '#065f46', light: '#d1fae5', name: 'Kab. Bogor'         },
  16: { primary: '#1B6EC2', light: '#dbeafe', name: 'Kab. Bekasi'        },
  4:  { primary: '#0369a1', light: '#e0f2fe', name: 'Kab. Bandung'       },
  21: { primary: '#2563eb', light: '#dbeafe', name: 'Kota Bandung'       },
  2:  { primary: '#b45309', light: '#fef3c7', name: 'Kab. Sukabumi'      },
  5:  { primary: '#15803d', light: '#dcfce7', name: 'Kab. Garut'         },
}

const DEFAULT_COLOR = { primary: '#2563eb', light: '#dbeafe', name: 'Kontingen' }

export default function DashboardPremiumPage() {
  const router = useRouter()
  const [user, setUser]   = useState<UserData | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sipaQuery, setSipaQuery] = useState('')
  const [sipaReply, setSipaReply] = useState('')
  const [sipaLoading, setSipaLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState('')

  const color = user?.kontingen_id
    ? (KONTINGEN_COLORS[user.kontingen_id] ?? DEFAULT_COLOR)
    : DEFAULT_COLOR

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) { router.push('/login'); return }
        setUser(data)
        // Fetch stats atlet
        fetch(`/api/konida/atlet/stats?kontingen_id=${data.kontingen_id}`)
          .then(r => r.json())
          .then(s => { setStats(s); setLastUpdate(new Date().toLocaleTimeString('id-ID')) })
          .catch(() => setStats({
            total_atlet:0, verified:0, pending:0, ditolak:0,
            lolos_kual:0, total_emas:0, total_perak:0, total_perunggu:0
          }))
          .finally(() => setLoading(false))
      })
      .catch(() => router.push('/login'))
  }, [router])

  const askSipa = async () => {
    if (!sipaQuery.trim()) return
    setSipaLoading(true)
    setSipaReply('')
    try {
      const res = await fetch('/api/sipa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: sipaQuery }),
      })
      const data = await res.json()
      setSipaReply(data.reply || data.answer || 'Tidak ada jawaban.')
    } catch { setSipaReply('Gagal terhubung ke SIPA.') }
    finally { setSipaLoading(false) }
  }

  const QUICK = [
    'Berapa atlet yang belum verified?',
    'Siapa atlet terbaik kita?',
    'Progress kualifikasi hari ini?',
    'Cabor mana yang paling banyak atlet?',
  ]

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-blue-500"/>
        <p className="text-gray-500 text-sm">Memuat dashboard...</p>
      </div>
    </div>
  )

  const pct = stats ? Math.round((stats.verified / Math.max(stats.total_atlet, 1)) * 100) : 0
  const kualPct = stats ? Math.round((stats.lolos_kual / Math.max(stats.total_atlet, 1)) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{color.name}</h1>
          <p className="text-xs text-gray-500">Dashboard Premium · PORPROV XV Jawa Barat 2026</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={11}/> Update: {lastUpdate}
            </span>
          )}
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: color.light, color: color.primary }}>
            🥇 Premium
          </span>
          <button onClick={() => router.push('/konida/sipa')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white font-semibold"
            style={{ background: color.primary }}>
            <Cpu size={13}/> SIPA
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Total Atlet',   value: stats?.total_atlet ?? 0,  icon: Users,        color:'#2563eb', bg:'#eff6ff' },
            { label:'Terverifikasi', value: stats?.verified ?? 0,     icon: CheckCircle,  color:'#059669', bg:'#f0fdf4' },
            { label:'Lolos Kual.',   value: stats?.lolos_kual ?? 0,   icon: TrendingUp,   color:'#d97706', bg:'#fffbeb' },
            { label:'Perlu Aksi',    value: (stats?.pending ?? 0) + (stats?.ditolak ?? 0), icon: AlertTriangle, color:'#dc2626', bg:'#fef2f2' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{k.label}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
                  <k.icon size={17} style={{ color: k.color }}/>
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Progress + Medali */}
        <div className="grid grid-cols-2 gap-4">

          {/* Progress verifikasi & kualifikasi */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
              <BarChart2 size={15} style={{ color: color.primary }}/> Progress Kontingen
            </h3>

            {/* Verifikasi */}
            <div className="mb-5">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-gray-600">Verifikasi Atlet</span>
                <span className="text-xs font-bold" style={{ color: color.primary }}>{pct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width:`${pct}%`, background:`linear-gradient(90deg, ${color.primary}, ${color.primary}aa)` }}/>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">{stats?.verified ?? 0} verified</span>
                <span className="text-[10px] text-gray-400">{stats?.pending ?? 0} pending · {stats?.ditolak ?? 0} ditolak</span>
              </div>
            </div>

            {/* Kualifikasi */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-gray-600">Lolos Kualifikasi</span>
                <span className="text-xs font-bold text-amber-600">{kualPct}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width:`${kualPct}%`, background:'linear-gradient(90deg, #d97706, #f59e0b)' }}/>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">{stats?.lolos_kual ?? 0} lolos</span>
                <span className="text-[10px] text-gray-400">dari {stats?.total_atlet ?? 0} atlet</span>
              </div>
            </div>
          </div>

          {/* Perolehan Medali */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Medal size={15} style={{ color: color.primary }}/> Perolehan Medali
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label:'Emas',     value: stats?.total_emas ?? 0,     color:'#d97706', bg:'#fffbeb', emoji:'🥇' },
                { label:'Perak',    value: stats?.total_perak ?? 0,    color:'#6b7280', bg:'#f9fafb', emoji:'🥈' },
                { label:'Perunggu', value: stats?.total_perunggu ?? 0, color:'#92400e', bg:'#fef3c7', emoji:'🥉' },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-4 text-center" style={{ background: m.bg }}>
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <div className="text-2xl font-black" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">Total Medali</span>
              <span className="text-lg font-black text-gray-900">
                {(stats?.total_emas ?? 0) + (stats?.total_perak ?? 0) + (stats?.total_perunggu ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* SIPA Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Cpu size={15} style={{ color: color.primary }}/> SIPA Intelligence
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: color.light, color: color.primary }}>
              Powered by Groq AI
            </span>
          </h3>

          {/* Quick questions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK.map(q => (
              <button key={q} onClick={() => setSipaQuery(q)}
                className="text-[11px] px-3 py-1.5 rounded-full border transition-colors hover:text-white"
                style={{ borderColor: `${color.primary}40`, color: color.primary }}
                onMouseEnter={e => (e.currentTarget.style.background = color.primary)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 mb-4">
            <input
              value={sipaQuery}
              onChange={e => setSipaQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askSipa()}
              placeholder="Tanya SIPA tentang kontingen kamu..."
              className="flex-1 px-4 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 text-gray-800"
              style={{ borderColor: '#e5e7eb' }}
            />
            <button onClick={askSipa} disabled={sipaLoading || !sipaQuery.trim()}
              className="px-5 py-2.5 text-sm text-white font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2"
              style={{ background: color.primary }}>
              {sipaLoading ? <RefreshCw size={13} className="animate-spin"/> : <Cpu size={13}/>}
              Tanya
            </button>
          </div>

          {/* Reply */}
          {sipaReply && (
            <div className="p-4 rounded-xl text-sm text-gray-700 leading-relaxed"
              style={{ background: color.light, borderLeft: `3px solid ${color.primary}` }}>
              <div className="text-[10px] font-bold mb-1.5" style={{ color: color.primary }}>🤖 SIPA menjawab:</div>
              {sipaReply}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Kelola Atlet',      href:'/konida/atlet',      icon: Users,       desc:'Tambah, edit, verifikasi atlet' },
            { label:'Kualifikasi',       href:'/konida/kualifikasi', icon: TrendingUp,  desc:'Proses kualifikasi atlet' },
            { label:'Export Laporan',    href:'/konida/export',     icon: Download,    desc:'Export PDF & Excel data atlet' },
          ].map(a => (
            <button key={a.href} onClick={() => router.push(a.href)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform"
                style={{ background: color.light }}>
                <a.icon size={18} style={{ color: color.primary }}/>
              </div>
              <div className="text-sm font-bold text-gray-800">{a.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{a.desc}</div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}