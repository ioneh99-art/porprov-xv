'use client'
// src/app/konida/pipeline-watch/kabbandung/page.tsx
// KBAAS — Radar Prestasi: monitoring + input data kejurnas atlet Jabar.

import { useEffect, useMemo, useState } from 'react'
import { Radar, Trophy, Medal, Link2, Users, RefreshCw, AlertCircle, Plus, X, Loader2, CheckCircle2 } from 'lucide-react'

const ACCENT = '#38bdf8'

interface Row {
  id: number; event_date: string; event_short_name: string; cabor_nama: string
  kategori_umur: string; gender: string; nomor_pertandingan: string; round_type: string
  athlete_name_raw: string; year_of_birth: number; umur_2026: number; team_name: string
  atlet_id: number | null; atlet_db_nama: string | null; atlet_kontingen_id: number | null
  link_confidence: string; rank: number | null; mark: string; medal: string | null
  status: string; pipeline_tag: string
}

interface FuzzyMatch { atlet_id: number; nama_lengkap: string; similarity: number }

const TABS = [
  { key: 'kontingen', label: 'Kab. Bandung', icon: Trophy },
  { key: 'jabar',     label: 'Jabar Lainnya', icon: Users },
  { key: 'unlinked',  label: 'Belum Linked',  icon: Link2 },
  { key: 'all',       label: 'Semua',          icon: Radar },
]

const MEDAL_OPTIONS = [
  { value: '',         label: '— Tidak ada medali —' },
  { value: 'EMAS',     label: '🥇 Emas' },
  { value: 'PERAK',    label: '🥈 Perak' },
  { value: 'PERUNGGU', label: '🥉 Perunggu' },
]

const medalIcon   = (m: string | null) => m === 'EMAS' ? '🥇' : m === 'PERAK' ? '🥈' : m === 'PERUNGGU' ? '🥉' : ''
const confColor   = (c: string) =>
  c === 'EXACT'    ? '#34d399' :
  c === 'HIGH'     ? '#38bdf8' :
  c === 'MEDIUM'   ? '#fbbf24' :
  c === 'UNLINKED' ? '#64748b' : '#f87171'

const EMPTY_FORM = {
  event_name: '', event_short_name: '', event_date: '', event_venue: '', event_organizer: '',
  cabor_nama: '', kategori_umur: '', gender: 'L', nomor_pertandingan: '',
  athlete_name_raw: '', year_of_birth: '', team_name: 'Jawa Barat',
  mark: '', rank: '', medal: '',
}

export default function PipelineWatchPage() {
  const [rows,    setRows]    = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState('')
  const [tab,     setTab]     = useState('kontingen')

  // Form state
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState({ ...EMPTY_FORM })
  const [saving,     setSaving]     = useState(false)
  const [saveErr,    setSaveErr]    = useState('')
  const [saveOk,     setSaveOk]     = useState(false)
  const [matches,    setMatches]    = useState<FuzzyMatch[]>([])

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/konida/pipeline-watch').then(x => x.json())
      if (r.error) setErr(r.error); else setRows(r.rows ?? [])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const count = (k: string) => rows.filter(r =>
    k === 'kontingen' ? r.atlet_kontingen_id === 4 :
    k === 'jabar'     ? String(r.pipeline_tag).includes('JABAR') :
    k === 'unlinked'  ? !r.atlet_id : true).length

  const filtered = useMemo(() => rows.filter(r =>
    tab === 'kontingen' ? r.atlet_kontingen_id === 4 :
    tab === 'jabar'     ? String(r.pipeline_tag).includes('JABAR') :
    tab === 'unlinked'  ? !r.atlet_id : true), [rows, tab])

  const medalists = useMemo(() => rows.filter(r => r.atlet_kontingen_id === 4 && r.medal), [rows])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.event_name || !form.event_date || !form.cabor_nama || !form.athlete_name_raw || !form.nomor_pertandingan) {
      setSaveErr('Lengkapi field wajib: Nama Kejuaraan, Tanggal, Cabor, Nomor/Kelas, Nama Atlet.')
      return
    }
    setSaving(true); setSaveErr(''); setSaveOk(false); setMatches([])
    try {
      const res = await fetch('/api/konida/pipeline-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.error) { setSaveErr(json.error); return }
      setSaveOk(true)
      setMatches(json.matches ?? [])
      await load()
      setTimeout(() => {
        setShowForm(false)
        setForm({ ...EMPTY_FORM })
        setSaveOk(false)
        setMatches([])
      }, 3000)
    } catch (e: any) {
      setSaveErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  function closeForm() {
    setShowForm(false)
    setForm({ ...EMPTY_FORM })
    setSaveErr(''); setSaveOk(false); setMatches([])
  }

  return (
    <div className="text-zinc-300 min-h-screen" style={{ background: 'linear-gradient(150deg,#02060f,#04121f)', margin: '-1.75rem', padding: '1.75rem' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}40` }}>
            <Radar size={20} style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">RADAR PRESTASI</h1>
            <div className="text-[11px] text-slate-500">Atlet Jabar di kejurnas/kejurda nasional · deteksi calon & prestasi · Kab. Bandung</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border"
            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)' }}>
            <Plus size={13} /> Tambah Hasil Kejurnas
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50"
            style={{ background: `${ACCENT}15`, color: ACCENT, borderColor: `${ACCENT}40` }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-xs text-red-400 mb-4 rounded-lg p-3"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <AlertCircle size={14} />{err}
        </div>
      )}

      {/* Achievement Highlight */}
      {medalists.length > 0 && (
        <div className="rounded-2xl p-5 mb-5"
          style={{ background: 'linear-gradient(120deg,rgba(251,191,36,0.12),rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.25)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Medal size={15} style={{ color: '#fbbf24' }} />
            <h3 className="text-sm font-bold text-white">Prestasi Nasional — Atlet Kab. Bandung</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {medalists.map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-2xl">{medalIcon(r.medal)}</span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">{r.atlet_db_nama ?? r.athlete_name_raw}</div>
                  <div className="text-[11px] text-slate-400 truncate">{r.medal} · {r.nomor_pertandingan} {r.kategori_umur} {r.gender} · <span className="font-mono text-slate-300">{r.mark}</span></div>
                  <div className="text-[10px] text-slate-600 truncate">{r.event_short_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: active ? `${ACCENT}1a` : 'rgba(255,255,255,0.02)', color: active ? ACCENT : '#94a3b8', border: `1px solid ${active ? ACCENT + '40' : 'rgba(255,255,255,0.06)'}` }}>
              <t.icon size={13} /> {t.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.3)', color: active ? ACCENT : '#64748b' }}>{count(t.key)}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {loading ? (
          <div className="py-16 text-center text-slate-600 text-sm">Memuat data pipeline…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-600 text-sm">Belum ada data untuk filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="p-3 font-semibold">Tanggal</th>
                  <th className="p-3 font-semibold">Atlet</th>
                  <th className="p-3 font-semibold">Nomor</th>
                  <th className="p-3 font-semibold">Hasil</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Link</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{r.event_date}</td>
                    <td className="p-3">
                      <div className="text-slate-200 font-medium">{r.athlete_name_raw}</div>
                      {r.atlet_db_nama && r.atlet_db_nama !== r.athlete_name_raw && (
                        <div className="text-[10px] text-slate-500">DB: {r.atlet_db_nama}</div>
                      )}
                      <div className="text-[10px] text-slate-600">{r.team_name} · {r.umur_2026} thn · {r.cabor_nama}</div>
                    </td>
                    <td className="p-3 text-slate-400">
                      {r.nomor_pertandingan}
                      <div className="text-[10px] text-slate-600">{r.kategori_umur} {r.gender}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-200">
                      {r.mark}
                      {r.rank ? <span className="text-[10px] text-slate-500 ml-1">#{r.rank}</span> : null}
                    </td>
                    <td className="p-3">
                      {r.medal ? <span className="font-bold text-white">{medalIcon(r.medal)} {r.medal}</span>
                        : r.status === 'Q' || r.status === 'q' ? <span style={{ color: ACCENT }}>Lolos</span>
                        : r.status === 'DNS' || r.status === 'DNF' ? <span className="text-red-400">{r.status}</span>
                        : <span className="text-slate-500">{r.status}</span>}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: confColor(r.link_confidence), background: `${confColor(r.link_confidence)}18` }}>
                        {r.link_confidence || 'UNLINKED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-600 mt-3">
        📡 KBAAS · sumber: hasil kejurnas (event_kejurnas_results) · klik "+ Tambah Hasil Kejurnas" untuk input manual
      </div>

      {/* ══════════ MODAL FORM TAMBAH HASIL KEJURNAS ══════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeForm() }}>

          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: '#060e1a', border: '1px solid rgba(255,255,255,0.12)' }}>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
              style={{ background: '#060e1a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2">
                <Plus size={16} style={{ color: '#fbbf24' }} />
                <span className="text-sm font-black text-white">Tambah Hasil Kejurnas</span>
              </div>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Sukses */}
              {saveOk && (
                <div className="flex flex-col gap-2 p-4 rounded-xl"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                    <CheckCircle2 size={16} /> Data berhasil disimpan!
                  </div>
                  {matches.length > 0 && (
                    <div className="text-xs text-slate-400">
                      <span className="font-semibold text-emerald-300">Auto-match ditemukan:</span>{' '}
                      {matches.map(m => `${m.nama_lengkap} (${(m.similarity * 100).toFixed(0)}%)`).join(', ')}
                      {matches[0]?.similarity >= 0.8
                        ? ' — otomatis ter-link ✅'
                        : ' — perlu konfirmasi manual'}
                    </div>
                  )}
                  {matches.length === 0 && (
                    <div className="text-xs text-slate-500">Tidak ditemukan atlet matching di DB Kab. Bandung — tersimpan sebagai UNLINKED.</div>
                  )}
                </div>
              )}

              {/* Error */}
              {saveErr && (
                <div className="flex items-center gap-2 text-xs text-red-400 p-3 rounded-xl"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <AlertCircle size={14} /> {saveErr}
                </div>
              )}

              {/* Section: Info Kejuaraan */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Info Kejuaraan</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 mb-1 block">Nama Kejuaraan <span className="text-red-400">*</span></label>
                    <input value={form.event_name} onChange={e => set('event_name', e.target.value)}
                      placeholder="cth: Indonesia Open Athletics Championship U18 2026"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:ring-1"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', focusRingColor: ACCENT }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Nama Singkat</label>
                    <input value={form.event_short_name} onChange={e => set('event_short_name', e.target.value)}
                      placeholder="cth: IOAC U18 2026"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Tanggal <span className="text-red-400">*</span></label>
                    <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Lokasi / Venue</label>
                    <input value={form.event_venue} onChange={e => set('event_venue', e.target.value)}
                      placeholder="cth: GBK Jakarta"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Penyelenggara</label>
                    <input value={form.event_organizer} onChange={e => set('event_organizer', e.target.value)}
                      placeholder="cth: PB PRSI / PASI"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                </div>
              </div>

              {/* Section: Cabor & Nomor */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Cabor & Nomor</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Cabang Olahraga <span className="text-red-400">*</span></label>
                    <input value={form.cabor_nama} onChange={e => set('cabor_nama', e.target.value)}
                      placeholder="cth: Dayung"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 mb-1 block">Nomor / Kelas <span className="text-red-400">*</span></label>
                    <input value={form.nomor_pertandingan} onChange={e => set('nomor_pertandingan', e.target.value)}
                      placeholder="cth: Kayak Single 1000m Putra"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Kategori Umur</label>
                    <input value={form.kategori_umur} onChange={e => set('kategori_umur', e.target.value)}
                      placeholder="cth: U18 / Senior"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Tim / Provinsi</label>
                    <input value={form.team_name} onChange={e => set('team_name', e.target.value)}
                      placeholder="Jawa Barat"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <div className="text-[9px] text-slate-600 mt-1">Harus mengandung "Jawa Barat" agar muncul di radar</div>
                  </div>
                </div>
              </div>

              {/* Section: Data Atlet */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Data Atlet</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 mb-1 block">Nama Atlet (sesuai hasil resmi) <span className="text-red-400">*</span></label>
                    <input value={form.athlete_name_raw} onChange={e => set('athlete_name_raw', e.target.value)}
                      placeholder="cth: SITI RAHAYU"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <div className="text-[9px] text-slate-600 mt-1">Sistem akan coba auto-match ke data atlet Kab. Bandung</div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Tahun Lahir</label>
                    <input type="number" value={form.year_of_birth} onChange={e => set('year_of_birth', e.target.value)}
                      placeholder="cth: 2008"
                      min="1980" max="2015"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Gender</label>
                    <div className="flex gap-2">
                      {['L', 'P'].map(g => (
                        <button key={g} onClick={() => set('gender', g)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                          style={form.gender === g
                            ? { background: `${ACCENT}25`, color: ACCENT, border: `1px solid ${ACCENT}60` }
                            : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {g === 'L' ? 'Putra' : 'Putri'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Hasil */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Hasil Pertandingan</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Medali</label>
                    <select value={form.medal} onChange={e => set('medal', e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}>
                      {MEDAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Peringkat</label>
                    <input type="number" value={form.rank} onChange={e => set('rank', e.target.value)}
                      placeholder="cth: 1"
                      min="1"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Catatan Waktu / Hasil</label>
                    <input value={form.mark} onChange={e => set('mark', e.target.value)}
                      placeholder="cth: 3:58.12 / 68.5kg"
                      className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button onClick={closeForm} disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving || saveOk}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  style={{ background: saving || saveOk ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)' }}>
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Menyimpan…</>
                    : saveOk ? <><CheckCircle2 size={13} /> Tersimpan!</>
                    : <><Plus size={13} /> Simpan Data</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
