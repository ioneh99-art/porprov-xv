'use client'

import { useState, useEffect } from 'react'
import { Newspaper, Sparkles, RefreshCw, Copy, Download, Check, FileText, Trophy } from 'lucide-react'

type Event = {
  id: string
  atletNama: string
  kejuaraan: string
  cabor: string
  medali: string
  tanggal: string
}

type Tone = 'formal' | 'sport_journalist' | 'celebrative' | 'analytical'

const TONE_LABELS: Record<Tone, string> = {
  formal: '📰 Formal/Government',
  sport_journalist: '🎙️ Sport Journalist',
  celebrative: '🎉 Celebrative',
  analytical: '📊 Analytical',
}

export default function ContentPressPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [selectedId, setSelectedId] = useState<string>('')
  const [tone, setTone] = useState<Tone>('sport_journalist')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [output, setOutput] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setLoadingEvents(true)
    try {
      const res = await fetch('/api/content/press')
      if (res.ok) {
        const json = await res.json()
        setEvents(json.events ?? [])
      }
    } catch {
      setEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }

  const generate = async () => {
    if (!selectedId) return
    setGenerating(true)
    setOutput('')
    try {
      const res = await fetch('/api/content/press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedId,
          tone,
          length,
        }),
      })
      const data = await res.json()
      setOutput(data.content ?? 'Gagal generate.')
      setEditValue(data.content ?? '')
    } catch (err: any) {
      setOutput(`❌ Error: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const copy = () => {
    const text = editing ? editValue : output
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    const text = editing ? editValue : output
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `press_release_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedEvent = events.find(e => e.id === selectedId)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
              <Newspaper className="text-indigo-400" size={20} />
            </div>
            <h1 className="text-2xl font-bold">Press Release Generator</h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">CHAMPION</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold">🧠 Claude</span>
          </div>
          <p className="text-slate-400 text-sm">Generate press release dari raihan medali — siap kirim ke media partner</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: form */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-amber-400" /> Pilih Event
              </h3>
              {loadingEvents ? (
                <div className="text-center py-8">
                  <RefreshCw className="mx-auto animate-spin text-indigo-400 mb-2" size={20} />
                  <p className="text-xs text-slate-400">Loading events…</p>
                </div>
              ) : events.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Belum ada event juara.</p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {events.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        selectedId === e.id
                          ? 'bg-indigo-500/10 border-indigo-500/40'
                          : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm font-medium truncate">{e.atletNama}</div>
                      <div className="text-xs text-slate-400 truncate">{e.kejuaraan}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          e.medali.toLowerCase().includes('emas') ? 'bg-amber-500/20 text-amber-300' :
                          e.medali.toLowerCase().includes('perak') ? 'bg-slate-500/20 text-slate-300' :
                          'bg-orange-500/20 text-orange-300'
                        }`}>
                          {e.medali}
                        </span>
                        <span className="text-[10px] text-slate-500">{e.tanggal}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Tone</h3>
              <div className="space-y-1.5">
                {(Object.keys(TONE_LABELS) as Tone[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      tone === t
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {TONE_LABELS[t]}
                  </button>
                ))}
              </div>

              <h3 className="text-sm font-semibold mt-4 mb-2">Length</h3>
              <div className="flex gap-1">
                {(['short', 'medium', 'long'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLength(l)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs capitalize ${
                      length === l ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <button
                onClick={generate}
                disabled={!selectedId || generating}
                className="mt-4 w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 disabled:opacity-50 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={14} /> Generate Press Release</>
                )}
              </button>
            </div>
          </div>

          {/* Right: output */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col" style={{ minHeight: '600px' }}>
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-indigo-400" />
                  <span className="text-sm font-semibold">Press Release Output</span>
                  {selectedEvent && (
                    <span className="text-xs text-slate-500">· {selectedEvent.atletNama}</span>
                  )}
                </div>
                {output && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditing(e => !e)}
                      className={`px-3 py-1.5 rounded-lg text-xs ${editing ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {editing ? 'Done editing' : 'Edit'}
                    </button>
                    <button
                      onClick={copy}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                      title="Copy"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <button
                      onClick={download}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {generating ? (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <RefreshCw className="mx-auto animate-spin mb-3" size={24} />
                      <p className="text-sm">Claude lagi nyusun press release…</p>
                      <p className="text-xs text-slate-600 mt-1">~10-15 detik</p>
                    </div>
                  </div>
                ) : output ? (
                  editing ? (
                    <textarea
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className="w-full h-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm leading-relaxed font-mono resize-none focus:outline-none focus:border-indigo-500"
                      style={{ minHeight: '500px' }}
                    />
                  ) : (
                    <article className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-slate-200">
                      {output}
                    </article>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16">
                    <Newspaper className="text-slate-700 mb-3" size={48} />
                    <h3 className="text-lg font-semibold mb-1">Belum ada press release</h3>
                    <p className="text-slate-500 text-sm max-w-md">
                      Pilih event di kiri, set tone & length, klik <b>Generate</b>. Output bisa di-edit, copy, atau download .txt.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
