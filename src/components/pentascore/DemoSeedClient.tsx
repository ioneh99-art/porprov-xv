'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, AlertCircle, Loader2, CheckCircle2, ExternalLink,
  Users, Layers, Trophy, FileText, ArrowRight, Zap,
} from 'lucide-react'

export default function DemoSeedClient({ tenants }: { tenants: any[] }) {
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id ?? '')
  const [reset, setReset] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  const handleSeed = async () => {
    if (!tenantId) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/pentascore/demo-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, reset }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.event_id) {
          setError(`${json.error} (Existing event ID: ${json.event_id}). Centang "Reset" untuk overwrite.`)
        } else {
          throw new Error(json.error)
        }
      } else {
        setResult(json)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-5">
        <h2 className="text-amber-200 text-sm font-bold flex items-center gap-2 mb-2">
          <Sparkles size={14} /> Demo Walkthrough Setup
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Klik tombol di bawah → langsung punya event lengkap untuk demo:
          <strong className="text-white"> 20 atlet</strong> (10 L + 10 P) dengan UIPM-style nama,
          <strong className="text-white"> 2 phases</strong> Quali masing-masing 2 groups,
          atlet auto-distribute snake pattern, dan
          <strong className="text-white"> sample results 60%</strong> untuk demo standings yang interesting.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          <strong>Event name:</strong> "Demo PentaScore — Tes Verifikasi 2026"<br/>
          <strong>Slug:</strong> <code className="text-amber-300">demo-pentascore-2026</code>
        </p>
      </div>

      {!result && (
        <>
          {/* Tenant picker */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-3">
              Target Tenant
            </h3>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
            >
              {tenants.length === 0 && <option value="">No tenants — create one first</option>}
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.nama} ({t.slug})</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-2">
              Demo event akan dibuat di bawah tenant ini. Branding tenant (logo + colors) akan tampil di public live display.
            </p>

            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={reset}
                onChange={e => setReset(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-xs text-slate-300">
                Reset — hapus existing demo event sebelum seed ulang
              </span>
            </label>
          </div>

          {/* Action */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleSeed}
              disabled={!tenantId || loading}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {loading ? 'Seeding demo data...' : 'Seed Demo Event'}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}
        </>
      )}

      {/* Result */}
      {result && (
        <>
          <div className="bg-green-500/10 border border-green-500/40 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-400 shrink-0" />
              <div>
                <h3 className="text-green-300 font-bold mb-1">Demo event berhasil dibuat!</h3>
                <p className="text-xs text-slate-300">
                  Event ID: <code className="text-green-300">{result.event_id}</code>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
              <Stat icon={Users} label="Athletes" value={result.summary.athletes} />
              <Stat icon={Layers} label="Phases" value={result.summary.phases} />
              <Stat icon={Trophy} label="Groups" value={result.summary.groups} />
              <Stat icon={FileText} label="Assignments" value={result.summary.assignments} />
              <Stat icon={Sparkles} label="Results" value={result.summary.results} />
            </div>
          </div>

          {/* Next steps */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Next Steps</h3>

            <NextLink
              href={result.next_steps.operator_url}
              icon={ArrowRight}
              title="Operator View"
              desc="Edit event details, manage phases, input more results"
              external={false}
            />
            <NextLink
              href={result.next_steps.public_url}
              icon={ExternalLink}
              title="Public Live Display"
              desc="Spectator-facing klasemen page (no login required)"
              external
            />
            <NextLink
              href={result.next_steps.broadcast_url}
              icon={ExternalLink}
              title="Broadcast Mode"
              desc="Big-screen optimized for projector/TV at venue (refresh 5s)"
              external
            />
            <NextLink
              href={`/operator/pentascore/events/${result.event_id}/export`}
              icon={ArrowRight}
              title="Export Center"
              desc="UIPM XML/Excel · Result Book PDF · Certificates"
              external={false}
            />
          </div>

          <button
            onClick={() => { setResult(null); setError(null) }}
            className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded transition"
          >
            ← Seed lagi (different tenant)
          </button>
        </>
      )}

      {/* Demo flow guide */}
      <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-4">
        <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
          📋 Suggested Demo Flow (10 minutes)
        </h3>
        <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
          <li><strong>Operator</strong>: tampilkan tenant + branding (logo/colors)</li>
          <li><strong>Demo Seed</strong>: klik tombol → "20 atlet, 2 phases, 60% results dalam 5 detik"</li>
          <li><strong>Standings</strong>: tampilkan live klasemen sorted by Total MP</li>
          <li><strong>Public Live</strong>: buka di tab baru (atau HP) — sama tanpa login</li>
          <li><strong>Broadcast Mode</strong>: tampilkan di big screen → "ini yang dilihat audience"</li>
          <li><strong>Cross-Validate</strong>: upload UIPM Excel → "99.52% verified"</li>
          <li><strong>Formula Disclosure</strong> di footer → "transparent ke publik"</li>
          <li><strong>Audit Log</strong>: tampilkan semua actions tercatat</li>
          <li><strong>Export</strong>: download UIPM XML + certificates PDF</li>
          <li><strong>Closing</strong>: "Semua ini live di production, siap deploy ke event PB PI"</li>
        </ol>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-slate-900/40 rounded-lg p-3 text-center border border-slate-800">
      <Icon size={14} className="mx-auto text-amber-400 mb-1" />
      <div className="text-2xl font-bold font-mono text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  )
}

function NextLink({ href, icon: Icon, title, desc, external }: any) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      className="block p-4 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 transition group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500/20 transition">
          <Icon size={14} className="text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">{title}</div>
          <div className="text-[10px] text-slate-400">{desc}</div>
          <div className="text-[9px] text-slate-600 font-mono mt-0.5 truncate">{href}</div>
        </div>
        <ArrowRight size={14} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
      </div>
    </Link>
  )
}


