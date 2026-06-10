'use client'

import { useState, useEffect } from 'react'
import { Film, Sparkles, RefreshCw, Play, Download, ExternalLink, Trophy, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

type Event = {
  id: string
  atletId: string
  atletNama: string
  kejuaraan: string
  cabor: string
  medali: string
  tanggal: string
  highlightStatus: 'none' | 'queued' | 'rendering' | 'ready' | 'failed'
  videoUrl?: string
}

type JobStatus = {
  jobId: string
  status: 'queued' | 'rendering' | 'ready' | 'failed'
  progress: number
  videoUrl?: string
  message?: string
}

export default function ContentHighlightsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [jobs, setJobs] = useState<JobStatus[]>([])
  const [stylePreset, setStylePreset] = useState<'cinematic_dark' | 'cyberpunk_neon' | 'corporate_clean' | 'workflow_modern'>('cinematic_dark')
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/content/highlights')
      if (res.ok) {
        const json = await res.json()
        setEvents(json.events ?? [])
      }
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitJob = async () => {
    if (selectedIds.size === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/content/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventIds: Array.from(selectedIds),
          stylePreset,
          voiceGender,
        }),
      })
      const json = await res.json()
      if (json.jobs) {
        setJobs(prev => [...json.jobs, ...prev])
        setSelectedIds(new Set())
      }
    } catch {
      // noop
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                <Film className="text-pink-400" size={20} />
              </div>
              <h1 className="text-2xl font-bold">Highlight Reels</h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">CHAMPION</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-pink-300 font-bold border border-pink-500/30">ione Factory</span>
            </div>
            <p className="text-slate-400 text-sm">
              Auto-generate Shorts highlight 30-60dt — voice-over AI + visual + BGM, via ione Factory pipeline
            </p>
          </div>
          <button onClick={loadEvents} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Config bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Visual Style</label>
              <select
                value={stylePreset}
                onChange={e => setStylePreset(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="cinematic_dark">🎬 Cinematic Dark</option>
                <option value="cyberpunk_neon">⚡ Cyberpunk Neon</option>
                <option value="corporate_clean">📊 Corporate Clean</option>
                <option value="workflow_modern">🔧 Workflow Modern</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Voice Gender</label>
              <div className="flex gap-1">
                {(['male', 'female'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setVoiceGender(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize ${
                      voiceGender === g ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {g === 'male' ? '👨 Male' : '👩 Female'}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="text-xs text-slate-400">
                {selectedIds.size} event terpilih
              </div>
              <button
                onClick={submitJob}
                disabled={submitting || selectedIds.size === 0}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 text-sm font-semibold flex items-center gap-2"
              >
                {submitting ? (
                  <><RefreshCw size={14} className="animate-spin" /> Submitting…</>
                ) : (
                  <><Sparkles size={14} /> Generate {selectedIds.size > 0 && `(${selectedIds.size})`}</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Active jobs */}
        {jobs.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock size={14} className="text-amber-400" /> Active Jobs ({jobs.length})
            </h3>
            <div className="space-y-2">
              {jobs.map(j => (
                <div key={j.jobId} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                  {j.status === 'ready' ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : j.status === 'failed' ? (
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                  ) : (
                    <RefreshCw size={16} className="text-amber-400 animate-spin shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono truncate">{j.jobId}</div>
                    {j.status !== 'ready' && j.status !== 'failed' && (
                      <div className="mt-1 h-1 bg-slate-700 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-violet-500"
                          style={{ width: `${j.progress}%` }}
                        />
                      </div>
                    )}
                    {j.message && <div className="text-xs text-slate-400 mt-1">{j.message}</div>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    j.status === 'ready' ? 'bg-emerald-500/20 text-emerald-300' :
                    j.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    {j.status}
                  </span>
                  {j.videoUrl && (
                    <a href={j.videoUrl} target="_blank" rel="noreferrer" className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-pink-300">
                      <Play size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events list */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Trophy size={14} className="text-amber-400" /> Eligible Events (juara emas/perak/perunggu)
            </div>
            <div className="text-xs text-slate-500">{events.length} event</div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="mx-auto animate-spin text-pink-400 mb-2" size={24} />
              <p className="text-slate-400 text-sm">Loading events…</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center">
              <Film className="mx-auto text-slate-700 mb-3" size={48} />
              <p className="text-slate-500 text-sm">Belum ada event juara di cabor lo.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
              {events.map(e => {
                const isSelected = selectedIds.has(e.id)
                return (
                  <div
                    key={e.id}
                    onClick={() => toggleSelect(e.id)}
                    className={`px-4 py-3 cursor-pointer transition flex items-center gap-3 ${
                      isSelected ? 'bg-pink-500/10' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(e.id)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.atletNama}</div>
                      <div className="text-xs text-slate-400 truncate">{e.kejuaraan} · {e.tanggal}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                        e.medali.toLowerCase().includes('emas') ? 'bg-amber-500/20 text-amber-300' :
                        e.medali.toLowerCase().includes('perak') ? 'bg-slate-500/20 text-slate-300' :
                        'bg-orange-500/20 text-orange-300'
                      }`}>
                        {e.medali}
                      </span>
                      {e.highlightStatus === 'ready' && (
                        <a
                          href={e.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={ev => ev.stopPropagation()}
                          className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-pink-300"
                          title="Lihat highlight"
                        >
                          <Play size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 text-xs text-slate-500 flex items-start gap-2">
          <ExternalLink size={12} className="mt-0.5 shrink-0" />
          <span>
            Pipeline ini delegasi ke <b>ione Factory</b> (Windows server, <code className="bg-slate-800 px-1 rounded">make_video11.py</code>).
            Render time ~3-5 menit per video. Output otomatis tersimpan di Supabase Storage + (optional) auto-upload ke YouTube Shorts.
          </span>
        </div>
      </div>
    </div>
  )
}
