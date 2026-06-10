/**
 * Public Live Display - Single Event
 * /live/[tenant_slug]/[event_id_or_slug]
 *
 * Big-screen friendly. Auto-refresh standings every 10s.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { pscDb } from '@/lib/pentascore/db'
import { ChevronLeft, Calendar, MapPin, Sparkles, Trophy } from 'lucide-react'
import PublicLiveDisplay from '@/components/pentascore/PublicLiveDisplay'

export const dynamic = 'force-dynamic'

export default async function PublicEventPage({
  params, searchParams,
}: {
  params: Promise<{ tenant_slug: string; event_id: string }>
  searchParams: Promise<{ phase_id?: string; mode?: string }>
}) {
  const { tenant_slug, event_id } = await params
  const sp = await searchParams

  // Resolve tenant
  const { data: tenant } = await pscDb
    .from('ps_tenants').select('*').eq('slug', tenant_slug).eq('is_active', true).single()
  if (!tenant) notFound()

  // Resolve event by id OR slug within this tenant
  let { data: event } = await pscDb
    .from('ps_events').select('*')
    .eq('tenant_id', tenant.id)
    .or(`id.eq.${isUuid(event_id) ? event_id : '00000000-0000-0000-0000-000000000000'},slug.eq.${event_id}`)
    .single()

  if (!event) notFound()

  // Phases
  const { data: phases } = await pscDb
    .from('ps_event_phases')
    .select('id, phase_type, phase_label, gender, sort_order, is_locked, tanggal, waktu_mulai')
    .eq('event_id', event.id)
    .order('sort_order')

  const primary = tenant.color_primary ?? '#F59E0B'
  const secondary = tenant.color_secondary ?? '#1F2937'
  const isBroadcast = sp.mode === 'broadcast'

  return (
    <div
      className={`min-h-screen text-white ${isBroadcast ? 'overflow-hidden' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${secondary} 0%, #0F172A 50%, ${secondary} 100%)`,
      }}
    >
      {/* Branded Header */}
      {!isBroadcast && (
        <div
          className="border-b backdrop-blur sticky top-0 z-30"
          style={{ borderColor: `${primary}30`, backgroundColor: `${secondary}E6` }}
        >
          <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
            <Link
              href={`/live/${tenant_slug}`}
              className="text-slate-400 hover:text-white transition flex items-center gap-1 text-xs"
            >
              <ChevronLeft size={14} /> Events
            </Link>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="" className="h-9 w-9 rounded object-cover border" style={{ borderColor: primary }} />
            ) : (
              <div className="h-9 w-9 rounded flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: primary, color: secondary }}>
                {(tenant.nama_pendek ?? tenant.nama).slice(0,2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: primary }}>
                {event.nama}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1"><Calendar size={9} />{event.tanggal_mulai}</span>
                {event.lokasi && (
                  <span className="flex items-center gap-1 truncate"><MapPin size={9} />{event.lokasi}</span>
                )}
                <span className="hidden md:inline opacity-60">· {tenant.nama_pendek ?? tenant.nama}</span>
              </div>
            </div>
            <Link
              href={`/live/${tenant_slug}/${event_id}?mode=broadcast`}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition"
              style={{ backgroundColor: `${primary}20`, color: primary, border: `1px solid ${primary}40` }}
            >
              <Sparkles size={11} /> Broadcast Mode
            </Link>
          </div>
        </div>
      )}

      {/* Broadcast banner */}
      {isBroadcast && (
        <div
          className="border-b py-4 md:py-6 px-6 md:px-8 flex items-center gap-4"
          style={{
            borderColor: `${primary}40`,
            background: `linear-gradient(90deg, ${secondary} 0%, ${primary}10 50%, ${secondary} 100%)`,
          }}
        >
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt="" className="h-12 md:h-16 w-12 md:w-16 rounded-lg object-cover border-2" style={{ borderColor: primary }} />
          ) : (
            <div className="h-12 md:h-16 w-12 md:w-16 rounded-lg flex items-center justify-center text-xl md:text-2xl font-bold"
              style={{ backgroundColor: primary, color: secondary }}>
              {(tenant.nama_pendek ?? tenant.nama).slice(0,2).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest opacity-60">{tenant.nama_pendek ?? tenant.nama}</div>
            <h1 className="text-2xl md:text-4xl font-bold" style={{ color: primary }}>
              {event.nama}
            </h1>
            {tenant.tagline && (
              <div className="text-xs md:text-sm text-slate-300 mt-1">{tenant.tagline}</div>
            )}
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs uppercase tracking-widest opacity-60">Live Standings</div>
            <div className="text-3xl font-bold" style={{ color: primary }}>
              <PulseTime />
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <PublicLiveDisplay
        eventId={event.id}
        tenantSlug={tenant_slug}
        phases={phases ?? []}
        primary={primary}
        secondary={secondary}
        defaultPhaseId={sp.phase_id}
        broadcastMode={isBroadcast}
      />

      {/* Footer */}
      {!isBroadcast && (
        <div className="border-t mt-12" style={{ borderColor: `${primary}20` }}>
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between text-[10px] text-slate-500">
            <div>© {new Date().getFullYear()} {tenant.nama} · Live Display</div>
            <div className="flex items-center gap-2">
              <code style={{ color: primary }}>uipm-2026-v1</code>
              <span>· 99.52% verified vs UIPM 2026 Bonn</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function PulseTime() {
  return (
    <span className="font-mono text-2xl md:text-4xl tabular-nums">
      <ClientClock />
    </span>
  )
}

import ClientClock from '@/components/pentascore/ClientClock'
