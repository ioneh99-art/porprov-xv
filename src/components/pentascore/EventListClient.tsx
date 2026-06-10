'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, X, Check, AlertCircle, Calendar, MapPin, Trophy,
  ArrowRight, Layers, Sparkles,
} from 'lucide-react'

type Tenant = {
  id: string; slug: string; nama: string; nama_pendek: string | null; color_primary: string
}

type PSEvent = {
  id: string
  tenant_id: string
  nama: string
  slug: string
  tanggal_mulai: string
  tanggal_selesai: string
  lokasi: string | null
  age_group: string
  gender_mode: string
  format_type: string
  status: string
  has_quali: boolean
  has_semi: boolean
  has_final: boolean
  disciplines: string[]
  ps_tenants: { nama_pendek: string | null; slug: string; color_primary: string } | null
}

const AGE_GROUPS = [
  { value: 'u15', label: 'U15' }, { value: 'u17', label: 'U17' },
  { value: 'u19', label: 'U19' }, { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' }, { value: 'masters', label: 'Masters' },
]

const GENDER_MODES = [
  { value: 'both', label: 'Putra & Putri' },
  { value: 'men',  label: 'Putra Saja' },
  { value: 'women',label: 'Putri Saja' },
]

const FORMAT_TYPES = [
  { value: 'individual',   label: 'Individual' },
  { value: 'relay_gender', label: 'Gender Relay' },
  { value: 'relay_mixed',  label: 'Mixed Relay' },
]

const DISCIPLINE_OPTIONS = [
  { value: 'fencing',  label: 'Fencing' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'obstacle', label: 'Obstacle' },
  { value: 'laserrun', label: 'Laser Run' },
]

export default function EventListClient({ initialEvents, tenants }: {
  initialEvents: PSEvent[]; tenants: Tenant[]
}) {
  const router = useRouter()
  const [events, setEvents] = useState<PSEvent[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [form, setForm] = useState<any>({
    tenant_id: tenants[0]?.id ?? '',
    nama: '',
    slug: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    lokasi: '',
    age_group: 'senior',
    gender_mode: 'both',
    format_type: 'individual',
    has_quali: true,
    has_semi: false,
    has_final: true,
    disciplines: ['fencing','swimming','obstacle','laserrun'],
  })

  const reset = () => {
    setForm({
      tenant_id: tenants[0]?.id ?? '',
      nama: '',
      slug: '',
      tanggal_mulai: '',
      tanggal_selesai: '',
      lokasi: '',
      age_group: 'senior',
      gender_mode: 'both',
      format_type: 'individual',
      has_quali: true,
      has_semi: false,
      has_final: true,
      disciplines: ['fencing','swimming','obstacle','laserrun'],
    })
    setShowForm(false)
    setErrorMsg(null)
  }

  // Auto-generate slug from nama
  const autoSlug = (nama: string) => nama.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 80)

  const submit = async () => {
    setErrorMsg(null)
    if (!form.nama || !form.tanggal_mulai || !form.tanggal_selesai || !form.tenant_id) {
      setErrorMsg('Tenant, Nama, Tanggal Mulai, Tanggal Selesai wajib diisi')
      return
    }
    if (!form.slug) form.slug = autoSlug(form.nama)
    if (form.disciplines.length === 0) {
      setErrorMsg('Pilih minimal 1 disiplin')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/pentascore/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const created = await res.json()
      setEvents(prev => [created, ...prev])
      reset()
      router.refresh()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleDiscipline = (d: string) => {
    setForm((f: any) => ({
      ...f,
      disciplines: f.disciplines.includes(d)
        ? f.disciplines.filter((x: string) => x !== d)
        : [...f.disciplines, d]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          <strong className="text-white">{events.length}</strong> event
        </div>
        <button
          onClick={() => { reset(); setShowForm(true) }}
          disabled={tenants.length === 0}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
        >
          <Plus size={14} /> New Event
        </button>
      </div>

      {tenants.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-amber-200 text-sm flex items-center gap-2">
          <AlertCircle size={14} />
          <span>Belum ada tenant aktif. <Link href="/operator/pentascore/tenants" className="underline">Buat tenant dulu</Link>.</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900/70 border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">New Event</h3>
            <button onClick={reset} className="text-slate-500 hover:text-white"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="Tenant *">
              <select
                value={form.tenant_id}
                onChange={e => setForm((f: any) => ({ ...f, tenant_id: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {tenants.map(t => <option key={t.id} value={t.id}>{t.nama_pendek ?? t.nama}</option>)}
              </select>
            </Field>
            <Field label="Lokasi">
              <input
                type="text"
                value={form.lokasi}
                onChange={e => setForm((f: any) => ({ ...f, lokasi: e.target.value }))}
                placeholder="Bandung, Jawa Barat"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Nama Event *">
              <input
                type="text"
                value={form.nama}
                onChange={e => setForm((f: any) => ({ ...f, nama: e.target.value, slug: autoSlug(e.target.value) }))}
                placeholder="PORPROV XV Modern Pentathlon 2026"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Slug" hint="URL identifier (auto-generated)">
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm((f: any) => ({ ...f, slug: e.target.value }))}
                placeholder="porprov-xv-pentathlon-2026"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm font-mono focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Tanggal Mulai *">
              <input
                type="date"
                value={form.tanggal_mulai}
                onChange={e => setForm((f: any) => ({ ...f, tanggal_mulai: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Tanggal Selesai *">
              <input
                type="date"
                value={form.tanggal_selesai}
                onChange={e => setForm((f: any) => ({ ...f, tanggal_selesai: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Age Group">
              <select
                value={form.age_group}
                onChange={e => setForm((f: any) => ({ ...f, age_group: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {AGE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="Gender Mode">
              <select
                value={form.gender_mode}
                onChange={e => setForm((f: any) => ({ ...f, gender_mode: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {GENDER_MODES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="Format">
              <select
                value={form.format_type}
                onChange={e => setForm((f: any) => ({ ...f, format_type: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {FORMAT_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="Structure">
              <div className="flex items-center gap-3 mt-2">
                {[
                  { key: 'has_quali', label: 'Quali' },
                  { key: 'has_semi',  label: 'Semi' },
                  { key: 'has_final', label: 'Final' },
                ].map(s => (
                  <label key={s.key} className="flex items-center gap-1.5 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form[s.key]}
                      onChange={e => setForm((f: any) => ({ ...f, [s.key]: e.target.checked }))}
                      className="accent-amber-500"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Disciplines *">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              {DISCIPLINE_OPTIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDiscipline(d.value)}
                  className={`px-3 py-2 rounded border text-sm transition ${
                    form.disciplines.includes(d.value)
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>

          {errorMsg && (
            <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              <Check size={14} />
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {events.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Layers size={32} className="mx-auto mb-3 opacity-50" />
            <div className="text-sm">No events yet. Create the first one →</div>
          </div>
        ) : events.map(e => (
          <Link
            key={e.id}
            href={`/operator/pentascore/events/${e.id}`}
            className="block p-5 rounded-xl border bg-slate-900/50 border-slate-700 hover:border-amber-500/40 transition group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: e.ps_tenants?.color_primary ?? '#F59E0B' }}
                >
                  <Trophy size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-sm group-hover:text-amber-300 transition">{e.nama}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {e.ps_tenants?.nama_pendek ?? 'Unknown'}
                  </div>
                </div>
              </div>
              <StatusBadge status={e.status} />
            </div>

            <div className="text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2">
                <Calendar size={11} className="text-amber-500/60" />
                <span>{e.tanggal_mulai} → {e.tanggal_selesai}</span>
              </div>
              {e.lokasi && (
                <div className="flex items-center gap-2">
                  <MapPin size={11} className="text-amber-500/60" />
                  <span>{e.lokasi}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                {e.age_group}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                {e.gender_mode}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                {e.format_type.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-1 ml-auto text-amber-400/60 group-hover:text-amber-400 transition">
                <Sparkles size={11} />
                <span className="text-[10px]">{e.disciplines?.length ?? 0} disc</span>
                <ArrowRight size={11} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-[10px] text-slate-600 mt-1">{hint}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:     'bg-slate-700/50 text-slate-300',
    published: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
    live:      'bg-green-500/15 text-green-300 border border-green-500/30',
    completed: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    cancelled: 'bg-red-500/15 text-red-300 border border-red-500/30',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${styles[status] ?? styles.draft}`}>
      {status}
    </span>
  )
}
