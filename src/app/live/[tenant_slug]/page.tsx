/**
 * Public Live Display - Tenant Landing
 * /live/[tenant_slug]
 *
 * NO AUTH. Public-facing branded page listing tenant's events.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { pscDb } from '@/lib/pentascore/db'
import { Calendar, MapPin, ChevronRight, Trophy, Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TenantLandingPage({
  params,
}: { params: Promise<{ tenant_slug: string }> }) {
  const { tenant_slug } = await params

  const { data: tenant } = await pscDb
    .from('ps_tenants')
    .select('*')
    .eq('slug', tenant_slug)
    .eq('is_active', true)
    .single()

  if (!tenant) notFound()

  const { data: events } = await pscDb
    .from('ps_events')
    .select('id, slug, nama, tanggal_mulai, tanggal_selesai, lokasi, age_group, gender_mode, status, format_type')
    .eq('tenant_id', tenant.id)
    .order('tanggal_mulai', { ascending: false })

  const primary = tenant.color_primary ?? '#F59E0B'
  const secondary = tenant.color_secondary ?? '#1F2937'

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: `linear-gradient(135deg, ${secondary} 0%, #0F172A 50%, ${secondary} 100%)`,
      }}
    >
      {/* Branded Header */}
      <div
        className="border-b backdrop-blur"
        style={{ borderColor: `${primary}30`, backgroundColor: `${secondary}80` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-4">
          {tenant.logo_url ? (
            <img
              src={tenant.logo_url}
              alt={tenant.nama}
              className="h-14 w-14 rounded-lg object-cover border-2"
              style={{ borderColor: primary }}
            />
          ) : (
            <div
              className="h-14 w-14 rounded-lg flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: primary, color: secondary }}
            >
              {(tenant.nama_pendek ?? tenant.nama).slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: primary }}>
              {tenant.nama}
            </h1>
            {tenant.tagline && (
              <p className="text-sm text-slate-300 mt-1">{tenant.tagline}</p>
            )}
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              {tenant.level} · {tenant.tipe}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <Sparkles size={14} style={{ color: primary }} />
            <span>Powered by PentaScore Indonesia</span>
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: primary }}>
          <Trophy size={18} /> Events
        </h2>

        {!events?.length ? (
          <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: `${primary}30` }}>
            <Trophy size={32} className="mx-auto mb-3 opacity-40" />
            <div className="text-slate-400">Belum ada event aktif</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(ev => (
              <Link
                key={ev.id}
                href={`/live/${tenant_slug}/${ev.slug ?? ev.id}`}
                className="block p-5 rounded-xl border transition group hover:scale-[1.02]"
                style={{
                  borderColor: `${primary}30`,
                  backgroundColor: `${secondary}40`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: ev.status === 'ongoing' ? `${primary}30` : `${secondary}80`,
                      color: ev.status === 'ongoing' ? primary : '#94A3B8',
                    }}
                  >
                    {ev.status}
                  </span>
                  <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition" />
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-white" style={{ color: primary }}>
                  {ev.nama}
                </h3>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} />
                    {ev.tanggal_mulai}{ev.tanggal_mulai !== ev.tanggal_selesai && ` → ${ev.tanggal_selesai}`}
                  </div>
                  {ev.lokasi && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} />
                      {ev.lokasi}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-3">
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase bg-slate-800/50 text-slate-300">
                    {ev.age_group}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase bg-slate-800/50 text-slate-300">
                    {ev.gender_mode}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t mt-12" style={{ borderColor: `${primary}20` }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-500">
          <div>© {new Date().getFullYear()} {tenant.nama}</div>
          <div className="flex items-center gap-2">
            <code style={{ color: primary }}>uipm-2026-v1</code>
            <span>· 99.52% verified vs UIPM</span>
          </div>
        </div>
      </div>
    </div>
  )
}
