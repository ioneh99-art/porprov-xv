'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Calendar, Clock, MapPin, Users,
  AlertTriangle, Printer, Filter, Timer,
  CheckCircle2, Circle, Zap, ChevronRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Disiplin = 'Anggar' | 'Renang' | 'OCR/Obstacle' | 'Laser Run' | 'Combined Event'
type Kategori = 'Putra' | 'Putri'
type Status   = 'selesai' | 'berlangsung' | 'upcoming'

type Sesi = {
  id:            string
  tanggal:       string   // YYYY-MM-DD
  waktu_mulai:   string   // HH:MM
  waktu_selesai: string
  disiplin:      Disiplin
  kategori:      Kategori
  venue:         string
  atlet:         string[]
  keterangan?:   string
  is_final?:     boolean
}

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
// ⚠ DATA DI BAWAH ADALAH DEMO — belum tersambung ke database live PORPROV XV
const DEMO_ATLET_PUTRA = [
  'Andika Tri Prasetyo', 'Reza Firmansyah',
  'Bagas Adi Nugroho',   'Dimas Ananta W.',
]
const DEMO_ATLET_PUTRI = [
  'Sari Dewi Rahayu', 'Nadya Puspita A.',
  'Rini Anggraeni',   'Melati Suryani',
]

const DEMO_SESI: Sesi[] = [
  // ── Hari 1 · 8 Jun · SELESAI ──────────────────────────────────────────────
  {
    id: 'd1', tanggal: '2026-06-08',
    waktu_mulai: '08:00', waktu_selesai: '11:30',
    disiplin: 'Anggar', kategori: 'Putra',
    venue: 'GOR Anggar Bandung',
    atlet: DEMO_ATLET_PUTRA,
    keterangan: 'Babak Kualifikasi — setiap atlet melawan 4 lawan (bout 1 menit)',
  },
  {
    id: 'd2', tanggal: '2026-06-08',
    waktu_mulai: '13:00', waktu_selesai: '16:30',
    disiplin: 'Anggar', kategori: 'Putri',
    venue: 'GOR Anggar Bandung',
    atlet: DEMO_ATLET_PUTRI,
    keterangan: 'Babak Kualifikasi — setiap atlet melawan 4 lawan (bout 1 menit)',
  },
  // ── Hari 2 · 9 Jun · SELESAI ──────────────────────────────────────────────
  {
    id: 'd3', tanggal: '2026-06-09',
    waktu_mulai: '07:00', waktu_selesai: '09:30',
    disiplin: 'Renang', kategori: 'Putra',
    venue: 'Kolam Renang Arcamanik',
    atlet: DEMO_ATLET_PUTRA,
    keterangan: '200m Gaya Bebas — format time trial, target waktu kualifikasi ≤ 2:30',
  },
  {
    id: 'd4', tanggal: '2026-06-09',
    waktu_mulai: '10:00', waktu_selesai: '12:30',
    disiplin: 'Renang', kategori: 'Putri',
    venue: 'Kolam Renang Arcamanik',
    atlet: DEMO_ATLET_PUTRI,
    keterangan: '200m Gaya Bebas — format time trial, target waktu kualifikasi ≤ 2:40',
  },
  // ── Hari 3 · 11 Jun · UPCOMING ────────────────────────────────────────────
  {
    id: 'd5', tanggal: '2026-06-11',
    waktu_mulai: '06:30', waktu_selesai: '11:00',
    disiplin: 'OCR/Obstacle', kategori: 'Putra',
    venue: 'Arena OCR Arcamanik Bandung',
    atlet: DEMO_ATLET_PUTRA,
    keterangan: 'Obstacle Course Race — lintasan ±3 km, 15 rintangan (crawl, wall, rope, balance, water)',
  },
  {
    id: 'd6', tanggal: '2026-06-11',
    waktu_mulai: '12:00', waktu_selesai: '16:30',
    disiplin: 'OCR/Obstacle', kategori: 'Putri',
    venue: 'Arena OCR Arcamanik Bandung',
    atlet: DEMO_ATLET_PUTRI,
    keterangan: 'Obstacle Course Race — lintasan ±3 km, 15 rintangan (crawl, wall, rope, balance, water)',
  },
  // ── Hari 4 · 13 Jun · UPCOMING ────────────────────────────────────────────
  {
    id: 'd7', tanggal: '2026-06-13',
    waktu_mulai: '15:00', waktu_selesai: '17:30',
    disiplin: 'Laser Run', kategori: 'Putra',
    venue: 'Track Lari Kompleks GBLA Gedebage',
    atlet: DEMO_ATLET_PUTRA,
    keterangan: '4× lari 800m + 5 target tembak/lap — interval start sesuai skor Anggar+Renang+OCR/Obstacle',
    is_final: true,
  },
  {
    id: 'd8', tanggal: '2026-06-13',
    waktu_mulai: '18:00', waktu_selesai: '20:00',
    disiplin: 'Laser Run', kategori: 'Putri',
    venue: 'Track Lari Kompleks GBLA Gedebage',
    atlet: DEMO_ATLET_PUTRI,
    keterangan: '4× lari 800m + 5 target tembak/lap — interval start sesuai skor Anggar+Renang+OCR/Obstacle',
    is_final: true,
  },
  // ── Hari 5 · 15 Jun · FINAL ───────────────────────────────────────────────
  {
    id: 'd9', tanggal: '2026-06-15',
    waktu_mulai: '07:00', waktu_selesai: '17:00',
    disiplin: 'Combined Event', kategori: 'Putra',
    venue: 'Venue Terpadu GBLA Gedebage',
    atlet: DEMO_ATLET_PUTRA,
    keterangan: 'GRAND FINAL — Anggar Bonus Round → Renang 200m → OCR/Obstacle → Laser Run',
    is_final: true,
  },
  {
    id: 'd10', tanggal: '2026-06-15',
    waktu_mulai: '07:00', waktu_selesai: '17:00',
    disiplin: 'Combined Event', kategori: 'Putri',
    venue: 'Venue Terpadu GBLA Gedebage',
    atlet: DEMO_ATLET_PUTRI,
    keterangan: 'GRAND FINAL — Anggar Bonus Round → Renang 200m → OCR/Obstacle → Laser Run',
    is_final: true,
  },
]

// ─── Config ──────────────────────────────────────────────────────────────────
const D_CFG: Record<Disiplin, { emoji: string; color: string; bg: string; border: string; pill: string }> = {
  'Anggar':         { emoji: '🤺', color: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', pill: 'bg-indigo-500/20 text-indigo-200' },
  'Renang':         { emoji: '🏊', color: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   pill: 'bg-cyan-500/20 text-cyan-200' },
  'OCR/Obstacle':        { emoji: '🧗', color: 'text-emerald-300',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',pill: 'bg-emerald-500/20 text-emerald-200' },
  'Laser Run':      { emoji: '🎯', color: 'text-rose-300',   bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   pill: 'bg-rose-500/20 text-rose-200' },
  'Combined Event': { emoji: '🏆', color: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30', pill: 'bg-violet-500/20 text-violet-200' },
}

const ALL_DISIPLIN: Disiplin[] = ['Anggar', 'Renang', 'OCR/Obstacle', 'Laser Run', 'Combined Event']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStatus(sesi: Sesi, now: Date): Status {
  const start = new Date(`${sesi.tanggal}T${sesi.waktu_mulai}:00`)
  const end   = new Date(`${sesi.tanggal}T${sesi.waktu_selesai}:00`)
  if (now > end)    return 'selesai'
  if (now >= start) return 'berlangsung'
  return 'upcoming'
}

function formatTanggal(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatCountdown(ms: number) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 24 * 3) {
    const days = Math.floor(h / 24)
    return `${days} hari ${h % 24} jam lagi`
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function JadwalPertandinganPage() {
  const [now, setNow]                   = useState(new Date())
  const [filterDisiplin, setFilterDisiplin] = useState<Disiplin | 'all'>('all')
  const [filterKategori, setFilterKategori] = useState<Kategori | 'all'>('all')
  const [filterStatus, setFilterStatus]     = useState<Status | 'all'>('all')
  const [expandedSesi, setExpandedSesi]     = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Filtered & sorted sessions
  const filtered = useMemo(() => {
    return DEMO_SESI.filter(s => {
      if (filterDisiplin !== 'all' && s.disiplin  !== filterDisiplin)  return false
      if (filterKategori !== 'all' && s.kategori  !== filterKategori)  return false
      if (filterStatus   !== 'all' && getStatus(s, now) !== filterStatus) return false
      return true
    })
  }, [filterDisiplin, filterKategori, filterStatus, now])

  // Group by date
  const grouped = useMemo(() => {
    const m: Record<string, Sesi[]> = {}
    filtered.forEach(s => {
      if (!m[s.tanggal]) m[s.tanggal] = []
      m[s.tanggal].push(s)
    })
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Next upcoming session (all cabor, no filter)
  const nextSesi = useMemo(() => {
    return DEMO_SESI.filter(s => getStatus(s, now) === 'upcoming')
      .sort((a, b) => {
        const ta = new Date(`${a.tanggal}T${a.waktu_mulai}:00`).getTime()
        const tb = new Date(`${b.tanggal}T${b.waktu_mulai}:00`).getTime()
        return ta - tb
      })[0] ?? null
  }, [now])

  const nextMs = nextSesi
    ? new Date(`${nextSesi.tanggal}T${nextSesi.waktu_mulai}:00`).getTime() - now.getTime()
    : null

  // KPI
  const selesaiCount     = DEMO_SESI.filter(s => getStatus(s, now) === 'selesai').length
  const berlangsungCount = DEMO_SESI.filter(s => getStatus(s, now) === 'berlangsung').length
  const upcomingCount    = DEMO_SESI.filter(s => getStatus(s, now) === 'upcoming').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── DEMO BANNER ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3.5">
        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <div>
          <div className="text-amber-300 text-sm font-semibold">Data Demo — Belum Live</div>
          <div className="text-amber-400/70 text-xs mt-0.5">
            Jadwal ini bersifat ilustratif untuk PORPROV XV 2026. Data aktual akan tersedia setelah
            administrator PORPROV merilis jadwal resmi dan tersambung ke database.
          </div>
        </div>
      </div>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Jadwal Pertandingan</h1>
          <p className="text-slate-500 text-xs mt-1">Modern Pentathlon · PORPROV XV Jawa Barat 2026</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-xl transition"
        >
          <Printer size={13} /> Cetak
        </button>
      </div>

      {/* ── KPI STRIP ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Sesi',       value: DEMO_SESI.length,    color: 'text-white',         sub: '5 disiplin' },
          { label: 'Selesai',          value: selesaiCount,        color: 'text-slate-400',      sub: 'sudah dilaksanakan' },
          { label: 'Sedang Berjalan',  value: berlangsungCount,    color: 'text-emerald-400',    sub: 'live sekarang' },
          { label: 'Akan Datang',      value: upcomingCount,       color: 'text-amber-400',      sub: 'terjadwal' },
        ].map(k => (
          <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5">
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-white text-xs font-medium mt-1">{k.label}</div>
            <div className="text-slate-600 text-[10px]">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── COUNTDOWN ─────────────────────────────────────────────────────── */}
      {nextSesi && nextMs !== null && nextMs > 0 && (
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <Timer size={20} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Sesi berikutnya</div>
            <div className="text-white text-sm font-medium">
              {D_CFG[nextSesi.disiplin].emoji} {nextSesi.disiplin} — {nextSesi.kategori}
            </div>
            <div className="text-slate-500 text-xs flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1"><Calendar size={10} /> {formatTanggal(nextSesi.tanggal)}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {nextSesi.waktu_mulai} WIB</span>
              <span className="flex items-center gap-1"><MapPin size={10} /> {nextSesi.venue}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-amber-400 font-mono text-xl font-bold tracking-widest">
              {formatCountdown(nextMs)}
            </div>
            <div className="text-slate-600 text-[10px]">hh:mm:ss</div>
          </div>
        </div>
      )}

      {/* ── DISCIPLINE OVERVIEW ───────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2">
        {ALL_DISIPLIN.map(d => {
          const cfg      = D_CFG[d]
          const sesiList = DEMO_SESI.filter(s => s.disiplin === d)
          const done     = sesiList.filter(s => getStatus(s, now) === 'selesai').length
          return (
            <button
              key={d}
              onClick={() => setFilterDisiplin(prev => prev === d ? 'all' : d)}
              className={`rounded-xl border p-3 text-center transition ${
                filterDisiplin === d
                  ? `${cfg.bg} ${cfg.border}`
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-2xl mb-1">{cfg.emoji}</div>
              <div className={`text-[10px] font-semibold ${filterDisiplin === d ? cfg.color : 'text-slate-400'}`}>
                {d}
              </div>
              <div className="text-slate-600 text-[10px] mt-0.5">{done}/{sesiList.length} selesai</div>
            </button>
          )
        })}
      </div>

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={12} className="text-slate-500" />
        {/* Kategori */}
        {(['all', 'Putra', 'Putri'] as const).map(k => (
          <button
            key={k}
            onClick={() => setFilterKategori(k)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              filterKategori === k
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {k === 'all' ? 'Semua Gender' : k}
          </button>
        ))}
        <div className="w-px h-4 bg-slate-800" />
        {/* Status */}
        {(['all', 'upcoming', 'berlangsung', 'selesai'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition capitalize ${
              filterStatus === s
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {s === 'all' ? 'Semua Status' : s === 'berlangsung' ? 'Live' : s}
          </button>
        ))}
        {(filterDisiplin !== 'all' || filterKategori !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => { setFilterDisiplin('all'); setFilterKategori('all'); setFilterStatus('all') }}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-red-400 transition"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── SESSION LIST ──────────────────────────────────────────────────── */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Calendar size={32} className="text-slate-700 mx-auto mb-3" />
          <div className="text-slate-500 text-sm">Tidak ada sesi yang cocok dengan filter</div>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([tgl, sessions]) => {
            const allDone = sessions.every(s => getStatus(s, now) === 'selesai')
            const anyLive = sessions.some(s => getStatus(s, now) === 'berlangsung')
            return (
              <div key={tgl}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                    anyLive  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                    allDone  ? 'bg-slate-800 border-slate-700 text-slate-500'             :
                               'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}>
                    {anyLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />}
                    {formatTanggal(tgl)}
                  </div>
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-600 text-xs">{sessions.length} sesi</span>
                </div>

                <div className="space-y-3">
                  {sessions.map(sesi => {
                    const st  = getStatus(sesi, now)
                    const cfg = D_CFG[sesi.disiplin]
                    const expanded = expandedSesi === sesi.id

                    return (
                      <div
                        key={sesi.id}
                        className={`rounded-2xl border transition-all ${
                          st === 'berlangsung' ? 'bg-emerald-950/30 border-emerald-500/30' :
                          st === 'selesai'     ? 'bg-slate-900/50 border-slate-800 opacity-70' :
                                                 `${cfg.bg} ${cfg.border}`
                        }`}
                      >
                        {/* Card header */}
                        <button
                          onClick={() => setExpandedSesi(expanded ? null : sesi.id)}
                          className="w-full px-5 py-4 flex items-start gap-4 text-left"
                        >
                          {/* Status dot */}
                          <div className="mt-0.5">
                            {st === 'selesai'     && <CheckCircle2 size={16} className="text-slate-600" />}
                            {st === 'berlangsung' && <Zap size={16} className="text-emerald-400 animate-pulse" />}
                            {st === 'upcoming'    && <Circle size={16} className="text-slate-500" />}
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-sm font-semibold ${
                                st === 'selesai' ? 'text-slate-400' : 'text-white'
                              }`}>
                                {cfg.emoji} {sesi.disiplin}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.pill}`}>
                                {sesi.disiplin}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                sesi.kategori === 'Putra'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-pink-500/20 text-pink-300'
                              }`}>
                                {sesi.kategori}
                              </span>
                              {sesi.is_final && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  FINAL
                                </span>
                              )}
                              {/* Demo tag */}
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-500 font-mono">
                                DEMO
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {sesi.waktu_mulai} – {sesi.waktu_selesai} WIB
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={11} /> {sesi.venue}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users size={11} /> {sesi.atlet.length} atlet
                              </span>
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold border ${
                              st === 'selesai'
                                ? 'bg-slate-800 text-slate-500 border-slate-700'
                                : st === 'berlangsung'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            }`}>
                              {st === 'selesai' ? 'Selesai' : st === 'berlangsung' ? '● Live' : 'Upcoming'}
                            </span>
                            <ChevronRight
                              size={14}
                              className={`text-slate-600 transition-transform ${expanded ? 'rotate-90' : ''}`}
                            />
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {expanded && (
                          <div className="border-t border-slate-800/60 px-5 py-4 space-y-4">
                            {/* Keterangan */}
                            {sesi.keterangan && (
                              <div className="bg-slate-900/60 rounded-xl px-4 py-3">
                                <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Keterangan</div>
                                <div className="text-slate-300 text-sm">{sesi.keterangan}</div>
                              </div>
                            )}

                            {/* Atlet list */}
                            <div>
                              <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                                <Users size={10} /> Daftar Atlet ({sesi.atlet.length})
                                <span className="text-[9px] bg-slate-700/50 text-slate-500 px-1.5 py-0.5 rounded font-mono ml-1">DEMO</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {sesi.atlet.map((nama, i) => (
                                  <div key={i} className="flex items-center gap-2 bg-slate-900/60 rounded-xl px-3 py-2">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                                      {i + 1}
                                    </div>
                                    <span className="text-slate-300 text-xs truncate">{nama}</span>
                                    {st === 'selesai' && (
                                      <CheckCircle2 size={12} className="text-emerald-500 ml-auto shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Timeline discipline info */}
                            <div className={`rounded-xl px-4 py-3 ${cfg.bg} border ${cfg.border}`}>
                              <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${cfg.color}`}>
                                Tentang Disiplin · {sesi.disiplin}
                              </div>
                              <div className="text-slate-400 text-xs leading-relaxed">
                                {sesi.disiplin === 'Anggar' && 'Setiap atlet saling bertanding melawan semua peserta lainnya (round-robin). Setiap bout berlangsung 1 menit. Poin dihitung berdasarkan jumlah kemenangan.'}
                                {sesi.disiplin === 'Renang' && 'Nomor 200m gaya bebas. Poin dihitung berdasarkan waktu finish — baseline 2:30 (Putra) / 2:40 (Putri) = 250 poin. Setiap 0.3 detik = ±2 poin.'}
                                {sesi.disiplin === 'OCR/Obstacle' && 'Obstacle Course Race sepanjang ±3 km dengan 15 rintangan (crawl net, wall climb, rope traverse, balance beam, water obstacle). Poin dihitung berdasarkan waktu finish — penalti 30 detik per rintangan yang gagal dilewati.'}
                                {sesi.disiplin === 'Laser Run' && '4 lap lari 800m. Di setiap awal lap, atlet harus menyelesaikan 5 target tembak laser sebelum berlari. Waktu total menentukan urutan finish.'}
                                {sesi.disiplin === 'Combined Event' && 'Event final yang menggabungkan semua disiplin dalam satu hari. Atlet start dengan interval berdasarkan total poin akumulasi dari Anggar, Renang, dan OCR/Obstacle. Yang pertama finish adalah juaranya.'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LEGEND ────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
        <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-3">5 Disiplin Modern Pentathlon</div>
        <div className="grid grid-cols-5 gap-3">
          {ALL_DISIPLIN.map((d, i) => (
            <div key={d} className="text-center">
              <div className="text-2xl mb-1">{D_CFG[d].emoji}</div>
              <div className={`text-[10px] font-semibold ${D_CFG[d].color}`}>{d}</div>
              <div className="text-slate-700 text-[9px] mt-0.5">Disiplin {i + 1}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-800 text-slate-600 text-[10px] text-center">
          ⚠ Semua jadwal, nama atlet, dan venue di halaman ini adalah data demonstrasi.
          Data resmi akan diperbarui setelah tersambung ke sistem PORPROV XV.
        </div>
      </div>
    </div>
  )
}
