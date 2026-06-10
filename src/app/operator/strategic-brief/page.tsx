'use client'

import { useState, useEffect } from 'react'
import { FileText, Sparkles, Printer, Download, RefreshCw, Trophy, Users, Target, TrendingUp, AlertCircle } from 'lucide-react'

type KPI = {
  totalAtlet: number
  totalMedaliEmas: number
  totalMedaliPerak: number
  totalMedaliPerunggu: number
  rankingKontingen: number | null
  cabor: string
  daysToEvent: number | null
}

export default function StrategicBriefPage() {
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [loadingKPI, setLoadingKPI] = useState(true)
  const [brief, setBrief] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  useEffect(() => {
    loadKPI()
  }, [])

  const loadKPI = async () => {
    setLoadingKPI(true)
    try {
      const res = await fetch('/api/strategic-brief/kpi')
      if (res.ok) {
        const data = await res.json()
        setKpi(data)
      } else {
        // fallback: zero state
        setKpi({
          totalAtlet: 0, totalMedaliEmas: 0, totalMedaliPerak: 0, totalMedaliPerunggu: 0,
          rankingKontingen: null, cabor: '—', daysToEvent: null,
        })
      }
    } catch {
      setKpi({
        totalAtlet: 0, totalMedaliEmas: 0, totalMedaliPerak: 0, totalMedaliPerunggu: 0,
        rankingKontingen: null, cabor: '—', daysToEvent: null,
      })
    } finally {
      setLoadingKPI(false)
    }
  }

  const generateBrief = async () => {
    setGenerating(true)
    setBrief('')
    try {
      const res = await fetch('/api/sport-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Buat Strategic Brief lengkap untuk operator cabor ${kpi?.cabor ?? ''} PORPROV XV. Format:

# STRATEGIC BRIEF — Cabor ${kpi?.cabor ?? '[CABOR]'}

## 1. Situasional Assessment
[Analisis kondisi saat ini: kekuatan, kelemahan, opportunity, threat]

## 2. Performance Snapshot
[Highlight angka kunci dan tren]

## 3. Top 3 Prioritas Strategis
[Aksi paling impactful 30 hari ke depan]

## 4. Risk & Mitigation
[Risiko utama dan rencana mitigasi]

## 5. Resource Allocation Recommendation
[Distribusi fokus: training, kompetisi, recovery]

## 6. KPI Target 30 Hari
[Target measurable]

Pakai tone professional tapi ringkas, langsung actionable. Bahasa Indonesia.`
          }],
          useClaudeModel: true,
        })
      })
      const data = await res.json()
      setBrief(data.content ?? data.message ?? 'Gagal generate brief.')
      setGeneratedAt(new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }))
    } catch (err: any) {
      setBrief(`❌ Error: ${err.message ?? 'gagal connect'}.`)
    } finally {
      setGenerating(false)
    }
  }

  const downloadAsText = () => {
    if (!brief) return
    const blob = new Blob([brief], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Strategic_Brief_${(kpi?.cabor ?? 'cabor').replace(/\s+/g, '_')}_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-violet-500/10 border border-violet-500/30 rounded-lg">
              <FileText className="text-violet-400" size={20} />
            </div>
            <h1 className="text-2xl font-bold">Strategic Brief</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">PRO</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold">🧠 Claude</span>
          </div>
          <p className="text-slate-400 text-sm">Auto-generate brief strategis dari data Supabase + AI Claude Sonnet 4.5</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KPICard
            icon={<Users size={16} />}
            label="Total Atlet"
            value={loadingKPI ? '...' : kpi?.totalAtlet?.toLocaleString('id-ID') ?? '0'}
            color="blue"
          />
          <KPICard
            icon={<Trophy size={16} />}
            label="Medali Emas"
            value={loadingKPI ? '...' : kpi?.totalMedaliEmas?.toString() ?? '0'}
            color="amber"
          />
          <KPICard
            icon={<Target size={16} />}
            label="Ranking Kontingen"
            value={loadingKPI ? '...' : kpi?.rankingKontingen ? `#${kpi.rankingKontingen}` : '—'}
            color="violet"
          />
          <KPICard
            icon={<TrendingUp size={16} />}
            label="Hari ke Event"
            value={loadingKPI ? '...' : kpi?.daysToEvent !== null ? `${kpi?.daysToEvent}d` : '—'}
            color="green"
          />
        </div>

        {/* Action bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-violet-400" size={16} />
            <div>
              <div className="text-sm font-medium">
                {brief ? 'Brief siap.' : 'Belum ada brief.'}
              </div>
              {generatedAt && (
                <div className="text-xs text-slate-500">Generated: {generatedAt}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadKPI}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Refresh KPI"
            >
              <RefreshCw size={14} />
            </button>
            {brief && (
              <>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm flex items-center gap-1.5"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  onClick={downloadAsText}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm flex items-center gap-1.5"
                >
                  <Download size={14} /> .md
                </button>
              </>
            )}
            <button
              onClick={generateBrief}
              disabled={generating || loadingKPI}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 disabled:opacity-50 text-sm font-semibold flex items-center gap-2"
            >
              {generating ? (
                <><RefreshCw size={14} className="animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={14} /> {brief ? 'Re-generate' : 'Generate AI Brief'}</>
              )}
            </button>
          </div>
        </div>

        {/* Brief output */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[400px]">
          {generating ? (
            <div className="flex items-center gap-3 text-slate-400">
              <RefreshCw className="animate-spin" size={16} />
              <span>Claude lagi nyusun brief… ~10-20 detik</span>
            </div>
          ) : brief ? (
            <article className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
              {brief}
            </article>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <AlertCircle className="text-slate-600 mb-3" size={32} />
              <h3 className="text-lg font-semibold mb-2">Belum ada brief</h3>
              <p className="text-slate-500 text-sm max-w-md mb-4">
                Klik <b>Generate AI Brief</b> di atas untuk request Claude Sonnet 4.5 nyusun brief strategis 6-section dari data Supabase real.
              </p>
              <p className="text-slate-600 text-xs">~$0.03 per generate · Output: Markdown, bisa di-print/download</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'blue' | 'amber' | 'violet' | 'green' }) {
  const colors = {
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-400',
    green: 'border-green-500/30 bg-green-500/5 text-green-400',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
}
