'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Save, Loader2, AlertCircle, CheckCircle2, Palette, Image as ImageIcon,
  Eye, ExternalLink, Wand2, RotateCcw, Upload, QrCode, X, Copy, Check,
} from 'lucide-react'
import QrCodeDialog from './QrCodeDialog'

const COLOR_PRESETS = [
  { name: 'Amber Gold',  primary: '#F59E0B', secondary: '#1F2937' },
  { name: 'Royal Blue',  primary: '#3B82F6', secondary: '#0F172A' },
  { name: 'Emerald',     primary: '#10B981', secondary: '#064E3B' },
  { name: 'Crimson',     primary: '#EF4444', secondary: '#1F2937' },
  { name: 'Indigo',      primary: '#6366F1', secondary: '#1E1B4B' },
  { name: 'Rose Gold',   primary: '#F43F5E', secondary: '#1F2937' },
  { name: 'Cyber Cyan',  primary: '#06B6D4', secondary: '#0C4A6E' },
  { name: 'KONI Red',    primary: '#DC2626', secondary: '#0F172A' },
]

export default function TenantBrandingClient({ tenant }: { tenant: any }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    logo_url:        tenant.logo_url ?? '',
    color_primary:   tenant.color_primary ?? '#F59E0B',
    color_secondary: tenant.color_secondary ?? '#1F2937',
    tagline:         tenant.tagline ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  const dirty = (
    form.logo_url !== (tenant.logo_url ?? '') ||
    form.color_primary !== (tenant.color_primary ?? '#F59E0B') ||
    form.color_secondary !== (tenant.color_secondary ?? '#1F2937') ||
    form.tagline !== (tenant.tagline ?? '')
  )

  const reset = () => {
    setForm({
      logo_url: tenant.logo_url ?? '',
      color_primary: tenant.color_primary ?? '#F59E0B',
      color_secondary: tenant.color_secondary ?? '#1F2937',
      tagline: tenant.tagline ?? '',
    })
    setSavedAt(null)
  }

  const applyPreset = (p: typeof COLOR_PRESETS[0]) => {
    setForm(f => ({ ...f, color_primary: p.primary, color_secondary: p.secondary }))
  }

  const handleUpload = async (f: File | undefined | null) => {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setErrorMsg('Hanya file gambar yang diterima')
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      setErrorMsg('File logo maksimal 2MB')
      return
    }
    setUploading(true); setErrorMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', f)
      fd.append('tenant_id', tenant.id)
      const res = await fetch('/api/pentascore/storage/upload-logo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error + (json.hint ? `\n\n💡 ${json.hint}` : ''))
      setForm(prev => ({ ...prev, logo_url: json.url }))
      setSavedAt(new Date().toLocaleTimeString())
      router.refresh()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    setSaving(true); setErrorMsg(null); setSavedAt(null)
    try {
      const res = await fetch(`/api/pentascore/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url:        form.logo_url || null,
          color_primary:   form.color_primary,
          color_secondary: form.color_secondary,
          tagline:         form.tagline || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSavedAt(new Date().toLocaleTimeString())
      router.refresh()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo with upload */}
          <Section title="Logo" icon={ImageIcon}>
            <div className="space-y-3">
              {/* Current preview */}
              {form.logo_url && (
                <div className="flex items-center gap-3 p-3 rounded bg-slate-950/40 border border-slate-800">
                  <img
                    src={form.logo_url}
                    alt=""
                    className="h-12 w-12 rounded object-cover border-2"
                    style={{ borderColor: form.color_primary }}
                    onError={(e: any) => { e.target.style.display = 'none' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-300 truncate">{form.logo_url}</div>
                    <div className="text-[10px] text-slate-500">Current logo</div>
                  </div>
                  <button
                    onClick={() => setForm(f => ({ ...f, logo_url: '' }))}
                    className="p-1 text-slate-500 hover:text-red-400 transition"
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Upload dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files?.[0]) }}
                className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-amber-500/40 transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleUpload(e.target.files?.[0])}
                />
                {uploading ? (
                  <div>
                    <Loader2 size={20} className="animate-spin mx-auto mb-2 text-amber-400" />
                    <div className="text-xs text-slate-400">Uploading to Supabase Storage...</div>
                  </div>
                ) : (
                  <div>
                    <Upload size={20} className="mx-auto mb-2 text-slate-500" />
                    <div className="text-xs text-slate-300 font-semibold">Drop file atau klik untuk upload</div>
                    <div className="text-[10px] text-slate-500 mt-1">PNG/JPG/SVG/WebP · Max 2MB</div>
                  </div>
                )}
              </div>

              {/* URL alternative */}
              <div className="border-t border-slate-800 pt-3">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Or paste URL</label>
                <input
                  type="url"
                  value={form.logo_url}
                  onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </Section>

          {/* Colors */}
          <Section title="Brand Colors" icon={Palette}>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2">Quick Presets</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="p-2 rounded border border-slate-700 hover:border-amber-500/40 transition group"
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: p.primary }} />
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: p.secondary }} />
                    </div>
                    <div className="text-[10px] text-slate-400 group-hover:text-white">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ColorField label="Primary" hint="Accent, buttons, medal" value={form.color_primary} onChange={(v: string) => setForm(f => ({ ...f, color_primary: v }))} />
              <ColorField label="Secondary" hint="Background, surfaces" value={form.color_secondary} onChange={(v: string) => setForm(f => ({ ...f, color_secondary: v }))} />
            </div>
          </Section>

          {/* Tagline */}
          <Section title="Tagline" icon={Wand2}>
            <textarea
              value={form.tagline}
              onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
              placeholder="Modern Pentathlon Indonesia · Sejak 1965"
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
            <p className="text-[10px] text-slate-500 mt-1.5">Optional. Tampil di public live display. Max 200 char.</p>
          </Section>

          {/* Action bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3 text-xs">
              {errorMsg && (
                <div className="text-red-300 flex items-start gap-1.5 max-w-md whitespace-pre-wrap">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" /> {errorMsg}
                </div>
              )}
              {savedAt && (
                <div className="text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Saved at {savedAt}
                </div>
              )}
              {dirty && !savedAt && (
                <span className="text-amber-400 flex items-center gap-1">● Unsaved</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <button onClick={reset} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition flex items-center gap-1.5">
                  <RotateCcw size={11} /> Reset
                </button>
              )}
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Branding
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Preview + QR */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <Eye size={12} /> Live Preview
          </h3>

          {/* Mini preview */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              borderColor: `${form.color_primary}40`,
              background: `linear-gradient(135deg, ${form.color_secondary} 0%, #0F172A 100%)`,
            }}
          >
            <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: `${form.color_primary}30` }}>
              {form.logo_url ? (
                <img src={form.logo_url} alt="" className="h-10 w-10 rounded object-cover border-2"
                  style={{ borderColor: form.color_primary }}
                  onError={(e: any) => { e.target.style.display = 'none' }} />
              ) : (
                <div className="h-10 w-10 rounded flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: form.color_primary, color: form.color_secondary }}>
                  {(tenant.nama_pendek ?? tenant.nama).slice(0,2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate" style={{ color: form.color_primary }}>{tenant.nama}</div>
                {form.tagline && <div className="text-[10px] text-slate-300 truncate">{form.tagline}</div>}
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Sample Standings</div>
              {[
                { pos: 1, name: 'BORIES Leo', mp: 1542, accent: true },
                { pos: 2, name: 'GRECO Giorgio', mp: 1521 },
                { pos: 3, name: 'BELAUD Valentin', mp: 1515 },
              ].map(r => (
                <div key={r.pos} className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold w-6 text-right text-white">{r.pos}.</span>
                  <span className="flex-1 text-white truncate">{r.name}</span>
                  <span className="font-mono font-bold" style={{ color: form.color_primary }}>{r.mp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick action links */}
          {tenant.slug && (
            <>
              <Link
                href={`/live/${tenant.slug}`}
                target="_blank"
                className="block p-3 rounded-lg border text-xs hover:scale-[1.02] transition"
                style={{ borderColor: `${form.color_primary}40`, backgroundColor: `${form.color_secondary}40`, color: form.color_primary }}
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={11} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">Open Live Display</div>
                    <div className="opacity-60 text-[10px] font-mono truncate">/live/{tenant.slug}</div>
                  </div>
                </div>
              </Link>

              <button
                onClick={() => setShowQr(true)}
                className="w-full p-3 rounded-lg border text-xs hover:scale-[1.02] transition flex items-center gap-2"
                style={{ borderColor: `${form.color_primary}40`, backgroundColor: `${form.color_secondary}40`, color: form.color_primary }}
              >
                <QrCode size={11} />
                <div className="text-left">
                  <div className="font-bold">QR Code untuk Spectator</div>
                  <div className="opacity-60 text-[10px]">Print & display di venue</div>
                </div>
              </button>
            </>
          )}

          {/* Tips */}
          <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-900/30 rounded p-3 border border-slate-800">
            <p className="mb-2"><strong className="text-amber-300">Tips:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Upload PNG transparent background untuk best result</li>
              <li>Bucket Supabase Storage <code className="text-amber-300">pentascore-public</code> harus dibuat (public)</li>
              <li>Primary = warna brand utama (highlights, medal)</li>
              <li>Test kontras di public live display</li>
            </ul>
          </div>
        </div>
      </div>

      {showQr && (
        <QrCodeDialog
          url={typeof window !== 'undefined' ? `${window.location.origin}/live/${tenant.slug}` : `/live/${tenant.slug}`}
          title={tenant.nama}
          accentColor={form.color_primary}
          onClose={() => setShowQr(false)}
        />
      )}
    </>
  )
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5">
      <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-4">
        <Icon size={12} /> {title}
      </h3>
      {children}
    </div>
  )
}

function ColorField({ label, hint, value, onChange }: any) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-12 rounded border border-slate-700 cursor-pointer bg-slate-950"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm font-mono focus:outline-none focus:border-amber-500 uppercase"
          maxLength={7}
        />
      </div>
      <p className="text-[10px] text-slate-500 mt-1">{hint}</p>
    </div>
  )
}
