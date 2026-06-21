'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowLeft, Loader2, AlertCircle, Sparkles,
  RefreshCw, Calendar, Users,
} from 'lucide-react'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const KONTINGEN_ID = 4
const ACCENT = '#818cf8'

interface AgendaItem {
  no:       number
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LONG_TERM'
  judul:    string
  cabor:    string
  owner:    string
  deadline: string
}

interface AgendaData {
  total_items: number
  judul:       string
  subtitle:    string
  items:       AgendaItem[]
}

const PRIORITY_CONFIG = {
  CRITICAL:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  dot: '#ef4444', label: 'CRITICAL — minggu ini' },
  HIGH:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b', label: 'HIGH — 2 minggu' },
  MEDIUM:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)', dot: '#3b82f6', label: 'MEDIUM — 1 bulan' },
  LONG_TERM: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.25)', dot: '#6b7280', label: 'LONG-TERM — PORPROV 2030 prep' },
}

export default function AgendaPage() {
  const [agenda, setAgenda]     = useState<AgendaData | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [atletCount, setAtletCount] = useState(0)

  // Fetch raw data to pass to AI
  const [payload, setPayload] = useState<object | null>(null)

  useEffect(() => {
    async function loadData() {
      const [
        { data: atlets },
        { data: baseline },
      ] = await Promise.all([
        sb.from('atlet').select('id,nama_lengkap,cabor_id,cabang_olahraga:cabang_olahraga(nama)')
          .eq('kontingen_id', KONTINGEN_ID),
        sb.from('atlet_baseline_performance')
          .select('atlet_id,event_name,gap_percentage,target_medali_text,pesaing,metric_type')
          .in('atlet_id', []),  // will be re-fetched after atlet
      ])

      const atletList = (atlets || []) as Array<{ id: number; nama_lengkap: string; cabor_id: number; cabang_olahraga: Array<{ nama: string }> | null }>
      const atletIds = atletList.map(a => a.id)
      setAtletCount(atletIds.length)

      const { data: baselineReal } = await sb
        .from('atlet_baseline_performance')
        .select('atlet_id,event_name,gap_percentage,target_medali_text,pesaing,cabor_id')
        .in('atlet_id', atletIds)

      // Build grouped payload by cabor
      const caborMap: Record<string, { atlet: Set<number>; events: { event_name: string; gap: number | null; target: string | null }[] }> = {}
      ;(baselineReal || []).forEach((b: { atlet_id: number; event_name: string; gap_percentage: number | null; target_medali_text: string | null; pesaing: string | null; cabor_id: number }) => {
        const atl = atletList.find(a => a.id === b.atlet_id)
        const cabangArr = atl?.cabang_olahraga
        const caborNama = (Array.isArray(cabangArr) ? cabangArr[0]?.nama : null) || `Cabor ${b.cabor_id}`
        if (!caborMap[caborNama]) caborMap[caborNama] = { atlet: new Set(), events: [] }
        caborMap[caborNama].atlet.add(b.atlet_id)
        caborMap[caborNama].events.push({ event_name: b.event_name, gap: b.gap_percentage, target: b.target_medali_text })
      })

      const caborSummary = Object.entries(caborMap).map(([nama, data]) => ({
        cabor:         nama,
        totalAtlet:    data.atlet.size,
        events:        data.events.slice(0, 10),
        avgGap:        data.events.filter(e => e.gap !== null).length > 0
          ? parseFloat((data.events.filter(e => e.gap !== null).reduce((s, e) => s + (e.gap || 0), 0) / data.events.filter(e => e.gap !== null).length).toFixed(1))
          : null,
      }))

      const p = {
        kontingen: 'Kabupaten Bandung',
        totalAtlet: atletIds.length,
        cabors: caborSummary,
        generatedAt: new Date().toISOString(),
      }
      setPayload(p)
      setDataLoaded(true)
    }
    loadData()
  }, [])

  async function generate(force = false) {
    if (!payload) return
    if (agenda && !force) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/performance/meeting-agenda', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.items) setAgenda(data)
      else setError(data.error || 'Gagal generate agenda')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const grouped = agenda
    ? (['CRITICAL', 'HIGH', 'MEDIUM', 'LONG_TERM'] as const)
        .map(p => ({ priority: p, items: agenda.items.filter(i => i.priority === p) }))
        .filter(g => g.items.length > 0)
    : []

  return (
    <div className="min-h-screen text-zinc-300 font-sans"
      style={{ background: 'linear-gradient(145deg, #02060f 0%, #04121f 100%)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-4 backdrop-blur-xl border-b"
        style={{ background: 'rgba(2,10,20,0.85)', borderColor: `${ACCENT}15` }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/konida/performance/kabbandung"
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft size={16} className="text-slate-400"/>
            </Link>
            <div>
              <div className="text-sm font-black text-white">Meeting Agenda</div>
              <div className="text-[10px] font-mono uppercase tracking-widest mt-0.5" style={{ color: `${ACCENT}90` }}>
                Kab. Bandung · PORPROV XV 2026
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <Users size={10}/> {atletCount} atlet
            <Calendar size={10} className="ml-2"/> November 2026
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* Hero */}
        <div className="rounded-2xl p-6"
          style={{ background: `rgba(129,140,248,0.05)`, border: `1px solid ${ACCENT}20` }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-black text-white mb-1">Meeting Agenda — Kontingen Kab. Bandung</h1>
              <p className="text-sm text-zinc-500">
                AI-generated action items berdasarkan data baseline & proyeksi medali PORPROV XV 2026.
                Sortir by priority — CRITICAL harus diselesaikan minggu ini.
              </p>
            </div>
            <button
              onClick={() => generate(!!agenda)}
              disabled={loading || !dataLoaded}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shrink-0"
              style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
              {loading
                ? <><Loader2 size={14} className="animate-spin"/> Generating...</>
                : agenda
                ? <><RefreshCw size={14}/> Regenerate</>
                : <><Sparkles size={14}/> Generate Agenda</>}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !agenda && (
          <div className="space-y-3 animate-pulse">
            {[60, 45, 80, 55, 70].map((w, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5" style={{ opacity: 1 - i * 0.15 }}/>
            ))}
          </div>
        )}

        {/* Idle state */}
        {!loading && !agenda && !error && (
          <div className="py-20 text-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="text-4xl mb-3">📋</div>
            <div className="text-zinc-400 font-bold mb-1">Siap generate agenda</div>
            <div className="text-sm text-zinc-600 mb-6">
              {dataLoaded ? `Data ${atletCount} atlet sudah dimuat. Klik Generate Agenda.` : 'Memuat data kontingen...'}
            </div>
            {dataLoaded && (
              <button onClick={() => generate()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}35` }}>
                <Sparkles size={14}/> Generate Meeting Agenda
              </button>
            )}
          </div>
        )}

        {/* Agenda content */}
        {agenda && !loading && (
          <>
            {/* Meta */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">
                  Untuk meeting kontingen Kab. Bandung · sortir by priority
                </div>
              </div>
              <span className="text-[9px] font-mono text-zinc-700">
                {agenda.total_items || agenda.items.length} action items · AI: Claude Sonnet 4.6
              </span>
            </div>

            {/* Priority groups */}
            {grouped.map(g => {
              const cfg = PRIORITY_CONFIG[g.priority]
              return (
                <div key={g.priority} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }}/>
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  {g.items.map(item => (
                    <div key={item.no}
                      className="rounded-xl px-5 py-4 flex gap-4 items-start"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5"
                        style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                        {item.no}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white leading-snug">{item.judul}</div>
                        <div className="text-[10px] mt-1" style={{ color: cfg.color }}>
                          {item.cabor} · Owner: {item.owner}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Footer */}
            <div className="py-6 text-center text-[10px] text-zinc-700">
              Generated by Claude Sonnet 4.6 · {agenda.subtitle}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
