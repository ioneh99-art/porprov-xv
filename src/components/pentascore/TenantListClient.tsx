'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Edit2, Trash2, Power, Search, Building2, MapPin, Mail,
  Palette, ExternalLink, X, Loader2, AlertCircle,
} from 'lucide-react'

type Tenant = any

const TIPE_OPTIONS = [
  { value: 'federasi', label: 'Federasi' },
  { value: 'pengprov', label: 'Pengprov' },
  { value: 'klub',     label: 'Klub' },
  { value: 'sekolah',  label: 'Sekolah' },
  { value: 'lainnya',  label: 'Lainnya' },
]
const LEVEL_OPTIONS = [
  { value: 'nasional', label: 'Nasional' },
  { value: 'regional', label: 'Regional' },
  { value: 'klub',     label: 'Klub' },
]

export default function TenantListClient({ initialTenants }: { initialTenants: Tenant[] }) {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Tenant | null>(null)

  const filtered = tenants.filter(t => {
    const q = query.trim().toLowerCase()
    return !q || t.nama.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q)
  })

  const toggleActive = async (t: Tenant) => {
    try {
      const res = await fetch(`/api/pentascore/tenants/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !t.is_active }),
      })
      if (!res.ok) throw new Error('Failed')
      setTenants(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const removeTenant = async (t: Tenant) => {
    if (!confirm(`Hapus tenant "${t.nama}"? Akan menghapus semua data terkait.`)) return
    try {
      const res = await fetch(`/api/pentascore/tenants/${t.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setTenants(prev => prev.filter(x => x.id !== t.id))
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari tenant..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
        >
          <Plus size={12} /> New Tenant
        </button>
      </div>

      {/* Tenant cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
          <Building2 size={32} className="mx-auto mb-3 text-slate-500" />
          <div className="text-sm text-slate-400">
            {tenants.length === 0 ? 'Belum ada tenant.' : 'Tidak ada match.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <TenantCard
              key={t.id}
              tenant={t}
              onEdit={() => { setEditing(t); setShowForm(true) }}
              onToggle={() => toggleActive(t)}
              onDelete={() => removeTenant(t)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <TenantForm
          tenant={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={(updated: any) => {
            if (editing) {
              setTenants(prev => prev.map(x => x.id === updated.id ? updated : x))
            } else {
              setTenants(prev => [updated, ...prev])
            }
            setShowForm(false); setEditing(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
function TenantCard({ tenant, onEdit, onToggle, onDelete }: any) {
  return (
    <div className={`bg-slate-900/40 rounded-xl border p-4 transition ${
      tenant.is_active ? 'border-slate-800 hover:border-amber-500/30' : 'border-slate-800/50 opacity-60'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        {tenant.logo_url ? (
          <img
            src={tenant.logo_url}
            alt=""
            className="h-10 w-10 rounded object-cover shrink-0 border"
            style={{ borderColor: tenant.color_primary }}
          />
        ) : (
          <div
            className="h-10 w-10 rounded flex items-center justify-center text-sm font-bold shrink-0"
            style={{ backgroundColor: tenant.color_primary, color: tenant.color_secondary }}
          >
            {(tenant.nama_pendek ?? tenant.nama).slice(0,2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white truncate">{tenant.nama}</div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
            <span className="font-mono">/{tenant.slug}</span>
            <span>·</span>
            <span className="uppercase">{tenant.tipe}</span>
            <span>·</span>
            <span className="uppercase">{tenant.level}</span>
          </div>
          {tenant.tagline && (
            <div className="text-[10px] text-slate-600 mt-1 truncate">{tenant.tagline}</div>
          )}
        </div>
      </div>

      {/* Color indicators */}
      <div className="flex items-center gap-1 mb-3">
        <div className="w-4 h-4 rounded border border-slate-700" style={{ backgroundColor: tenant.color_primary }} title={`Primary: ${tenant.color_primary}`} />
        <div className="w-4 h-4 rounded border border-slate-700" style={{ backgroundColor: tenant.color_secondary }} title={`Secondary: ${tenant.color_secondary}`} />
        <span className="text-[9px] text-slate-600 ml-1 font-mono">{tenant.color_primary}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 border-t border-slate-800">
        <Link
          href={`/operator/pentascore/tenants/${tenant.id}/branding`}
          className="flex-1 px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded transition flex items-center justify-center gap-1.5"
        >
          <Palette size={10} /> Branding
        </Link>
        <Link
          href={`/live/${tenant.slug}`}
          target="_blank"
          className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded transition flex items-center gap-1.5"
          title="Open Live Display"
        >
          <ExternalLink size={10} />
        </Link>
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition"
          title="Edit"
        >
          <Edit2 size={11} />
        </button>
        <button
          onClick={onToggle}
          className={`p-1.5 rounded transition ${
            tenant.is_active
              ? 'text-green-400 hover:bg-green-500/10'
              : 'text-slate-500 hover:bg-slate-700'
          }`}
          title={tenant.is_active ? 'Deactivate' : 'Activate'}
        >
          <Power size={11} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
function TenantForm({ tenant, onClose, onSaved }: any) {
  const isEdit = !!tenant
  const [form, setForm] = useState({
    slug:        tenant?.slug ?? '',
    nama:        tenant?.nama ?? '',
    nama_pendek: tenant?.nama_pendek ?? '',
    tipe:        tenant?.tipe ?? 'federasi',
    level:       tenant?.level ?? 'regional',
    email_kontak:tenant?.email_kontak ?? '',
    telepon:     tenant?.telepon ?? '',
    alamat:      tenant?.alamat ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true); setErr(null)
    try {
      const url = isEdit ? `/api/pentascore/tenants/${tenant.id}` : '/api/pentascore/tenants'
      const method = isEdit ? 'PUT' : 'POST'
      const payload = { ...form }
      // slug locked in edit
      if (isEdit) delete (payload as any).slug

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      onSaved(data)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-w-lg w-full bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
            {isEdit ? 'Edit Tenant' : 'New Tenant'}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Slug ${isEdit ? '(locked)' : '*'}`}>
              <input
                value={form.slug}
                disabled={isEdit}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="pb-pi"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50"
              />
            </Field>
            <Field label="Nama Pendek">
              <input
                value={form.nama_pendek}
                onChange={e => setForm(f => ({ ...f, nama_pendek: e.target.value }))}
                placeholder="PB PI"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </Field>
          </div>
          <Field label="Nama Lengkap *">
            <input
              value={form.nama}
              onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
              placeholder="Pengurus Pusat Pentathlon Indonesia"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipe">
              <select
                value={form.tipe}
                onChange={e => setForm(f => ({ ...f, tipe: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {TIPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Level">
              <select
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              >
                {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                value={form.email_kontak}
                onChange={e => setForm(f => ({ ...f, email_kontak: e.target.value }))}
                placeholder="info@example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </Field>
            <Field label="Telepon">
              <input
                value={form.telepon}
                onChange={e => setForm(f => ({ ...f, telepon: e.target.value }))}
                placeholder="+62..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </Field>
          </div>
          <Field label="Alamat">
            <textarea
              value={form.alamat}
              onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
          </Field>

          {isEdit && (
            <div className="p-3 rounded bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
              <Palette size={12} />
              <span>For logo/colors/tagline, use the dedicated <strong>Branding</strong> page.</span>
            </div>
          )}

          {err && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={11} /> {err}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-2 text-sm text-slate-400 hover:text-white" disabled={saving}>Cancel</button>
            <button
              onClick={submit}
              disabled={saving || !form.nama || (!isEdit && !form.slug)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
