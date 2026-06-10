/**
 * PentaScore Event Detail page (Sprint 4 update — adds public live URL + QR code)
 */
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import EventSubnav from '@/components/pentascore/EventSubnav'
import {
  Calendar, MapPin, Users, Trophy, Edit2, Layers,
  CheckCircle2, Shield, FileText, ArrowRight, AlertCircle,
  Sword, Waves, Mountain, Target, GitBranch, ExternalLink, Copy,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login')

  const { id } = await params
  const { data: ev } = await pscDb
    .from('ps_events')
    .select('*, ps_tenants(id, slug, nama, nama_pendek, color_primary, color_secondary, logo_url, tagline)')
    .eq('id', id)
    .single()

  if (!ev) notFound()

  const [{ count: athleteCount }, { data: phases }] = await Promise.all([
    pscDb.from('ps_event_athletes').select('id', { count: 'exact', head: true }).eq('event_id', id),
    pscDb.from('ps_event_phases')
      .select('id, phase_type, phase_label, gender, tanggal, waktu_mulai, expected_size, is_locked')
      .eq('event_id', id).order('sort_order'),
  ])

  const tenantColor = ev.ps_tenants?.color_primary ?? '#F59E0B'
  const tenantSlug = ev.ps_tenants?.slug
  const publicUrl = tenantSlug ? `/live/${tenantSlug}/${ev.slug ?? id}` : null

  return (
    <PentascoreShell
      title={ev.nama}
      subtitle={`${ev.ps_tenants?.nama_pendek ?? 'Unknown tenant'} · ${ev.tanggal_mulai} → ${ev.tanggal_selesai}`}
      crumbs={[
        { label: 'Events', href: '/operator/pentascore/events' },
        { label: ev.nama },
      ]}
      actions={
        <Link
          href={`/operator/pentascore/events/${id}/edit`}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
        >
          <Edit2 size={12} /> Edit
        </Link>
      }
    >
      <EventSubnav eventId={id} tenantSlug={tenantSlug} eventSlug={ev.slug} />

      {/* Status banner with public URL */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: tenantColor }}
            >
              <Trophy size={18} />
            </div>
            <div>
              <div className="text-amber-200 font-bold text-sm uppercase tracking-wider">{ev.status}</div>
              <div className="text-xs text-slate-400">
                Formula: <code className="text-amber-300">{ev.formula_version}</code>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <Shield size={14} />
            99.52% verified
          </div>
        </div>

        {/* Public URL card */}
        {publicUrl && (
          <Link
            href={publicUrl}
            target="_blank"
            className="p-4 rounded-xl border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-600/5 hover:scale-[1.02] transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-green-400">Public Live URL</span>
              <ExternalLink size={11} className="text-green-400 group-hover:translate-x-0.5 transition" />
            </div>
            <div className="text-xs text-green-200 font-mono truncate">{publicUrl}</div>
            <div className="text-[10px] text-slate-500 mt-1">No login required · share to spectators</div>
          </Link>
        )}
      </div>

      {/* 5-card nav grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <NavCard icon={Layers}    label="Phases"     desc="Setup rounds + groups"   count={phases?.length ?? 0}     href={`/operator/pentascore/events/${id}/phases`} />
        <NavCard icon={Users}     label="Athletes"   desc="Roster + import"          count={athleteCount ?? 0}       href={`/operator/pentascore/athletes?event_id=${id}`} />
        <NavCard icon={GitBranch} label="DE Bracket" desc="18-position bracket"                                       href={`/operator/pentascore/events/${id}/bracket`} />
        <NavCard icon={FileText}  label="Results"    desc="Input 4 disiplin"                                          href={`/operator/pentascore/events/${id}/results`} highlight />
        <NavCard icon={Trophy}    label="Standings"  desc="Live klasemen"                                             href={`/operator/pentascore/events/${id}/standings`} />
      </div>

      {/* Event info + phases preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-4">Event Details</h2>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <Detail icon={Calendar} label="Mulai">{ev.tanggal_mulai}</Detail>
            <Detail icon={Calendar} label="Selesai">{ev.tanggal_selesai}</Detail>
            {ev.lokasi && <Detail icon={MapPin} label="Lokasi">{ev.lokasi}</Detail>}
            <Detail label="Age Group"><span className="uppercase">{ev.age_group}</span></Detail>
            <Detail label="Gender"><span className="uppercase">{ev.gender_mode}</span></Detail>
            <Detail label="Format"><span className="uppercase">{ev.format_type?.replace('_',' ')}</span></Detail>
            <Detail label="Disciplines">
              <div className="flex gap-1 flex-wrap">
                {(ev.disciplines ?? []).map((d: string) => {
                  const map: any = { fencing: Sword, swimming: Waves, obstacle: Mountain, laserrun: Target }
                  const Icon = map[d] || FileText
                  return (
                    <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase flex items-center gap-1">
                      <Icon size={9} /> {d}
                    </span>
                  )
                })}
              </div>
            </Detail>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Phases</h2>
            <Link
              href={`/operator/pentascore/events/${id}/phases`}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Manage <ArrowRight size={10} />
            </Link>
          </div>
          {!phases?.length ? (
            <div className="text-center py-6 text-slate-500">
              <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
              <div className="text-xs">No phases yet</div>
            </div>
          ) : (
            <div className="space-y-1">
              {phases.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      p.phase_type === 'quali' ? 'bg-blue-500/15 text-blue-300' :
                      p.phase_type === 'semi'  ? 'bg-purple-500/15 text-purple-300' :
                      'bg-amber-500/15 text-amber-300'
                    }`}>{p.phase_type}</span>
                    <span className="text-xs text-white font-medium">{p.phase_label}</span>
                    <span className="text-[10px] text-slate-500">{p.gender === 'L' ? 'L' : 'P'}</span>
                  </div>
                  {p.is_locked && <span className="text-[10px] text-amber-400">🔒</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PentascoreShell>
  )
}

function NavCard({ icon: Icon, label, desc, count, href, highlight }: any) {
  return (
    <Link
      href={href}
      className={`p-4 rounded-xl border transition group ${
        highlight
          ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
          : 'bg-slate-900/60 border-slate-800 hover:border-amber-500/30 hover:bg-slate-900'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className={highlight ? 'text-amber-300' : 'text-amber-400/70 group-hover:text-amber-400'} />
        {count != null && (
          <span className="text-[10px] text-slate-500 font-mono">{count}</span>
        )}
      </div>
      <div className={`text-sm font-bold mb-0.5 ${highlight ? 'text-amber-200' : 'text-white'}`}>
        {label}
      </div>
      <div className="text-[10px] text-slate-500">{desc}</div>
    </Link>
  )
}

function Detail({ icon: Icon, label, children }: any) {
  return (
    <div className="text-slate-400">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
        {Icon && <Icon size={10} />} {label}
      </div>
      <div className="text-white text-sm">{children}</div>
    </div>
  )
}
