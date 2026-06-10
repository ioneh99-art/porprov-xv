/**
 * Group Reorder Page (DnD)
 * /operator/pentascore/phases/[id]/reorder
 */
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { pscDb, getPentascoreSession } from '@/lib/pentascore/db'
import PentascoreShell from '@/components/pentascore/PentascoreShell'
import GroupReorderClient from '@/components/pentascore/GroupReorderClient'

export const dynamic = 'force-dynamic'

export default async function PhaseReorderPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await getPentascoreSession()
  if (!session) redirect('/operator/login')
  const { id: phaseId } = await params

  // Fetch phase + groups + assignments
  const { data: phase } = await pscDb
    .from('ps_event_phases')
    .select('*, ps_events(id, nama)')
    .eq('id', phaseId)
    .single()
  if (!phase) notFound()

  const { data: groups } = await pscDb
    .from('ps_groups')
    .select(`
      id, group_label, sort_order,
      ps_group_athletes(
        id, position_in_group,
        ps_event_athletes(id, nama_lengkap, gender, start_number)
      )
    `)
    .eq('phase_id', phaseId)
    .order('sort_order')

  // Shape: Group[]
  const shaped = (groups ?? []).map((g: any) => ({
    id: g.id,
    group_label: g.group_label,
    athletes: (g.ps_group_athletes ?? [])
      .map((ga: any) => ({
        ga_id: ga.id,
        ea_id: ga.ps_event_athletes?.id,
        nama_lengkap: ga.ps_event_athletes?.nama_lengkap,
        gender: ga.ps_event_athletes?.gender,
        start_number: ga.ps_event_athletes?.start_number,
      }))
      .filter((a: any) => a.ea_id)
      .sort((a: any, b: any) => (a.start_number ?? 999) - (b.start_number ?? 999)),
  }))

  return (
    <PentascoreShell
      title={`Manual Reorder — ${phase.phase_label}`}
      subtitle={`${phase.ps_events?.nama} · drag-and-drop atlet antar groups`}
      crumbs={[
        { label: 'Events', href: '/operator/pentascore/events' },
        { label: phase.ps_events?.nama, href: `/operator/pentascore/events/${phase.event_id}` },
        { label: 'Phases', href: `/operator/pentascore/events/${phase.event_id}/phases` },
        { label: phase.phase_label },
      ]}
      actions={
        <Link
          href={`/operator/pentascore/events/${phase.event_id}/phases`}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
        >
          <ChevronLeft size={12} /> Back to Phases
        </Link>
      }
    >
      <GroupReorderClient
        initialGroups={shaped}
        phaseId={phaseId}
        phaseLocked={!!phase.is_locked}
      />
    </PentascoreShell>
  )
}
