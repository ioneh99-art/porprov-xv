import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getOperatorContext } from '@/lib/operator-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const getSb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// GET: list eligible events (juara dari cabor operator)
export async function GET() {
  try {
    const ctx = await getOperatorContext()

    const { data, error } = await getSb()
      .from('kejuaraan_atlet')
      .select(`
        id, atlet_id, kejuaraan, cabor, medali, tanggal,
        highlight_status, highlight_video_url,
        atlet:atlet_id ( nama )
      `)
      .eq('cabor', ctx.cabor)
      .order('tanggal', { ascending: false })
      .limit(100)

    if (error) throw error

    const events = (data ?? [])
      .filter(r => {
        const m = String(r.medali ?? '').toLowerCase()
        return m.includes('emas') || m.includes('perak') || m.includes('perunggu')
      })
      .map(r => ({
        id: r.id,
        atletId: r.atlet_id,
        atletNama: (r.atlet as any)?.nama ?? '—',
        kejuaraan: r.kejuaraan ?? '—',
        cabor: r.cabor,
        medali: r.medali,
        tanggal: r.tanggal,
        highlightStatus: r.highlight_status ?? 'none',
        videoUrl: r.highlight_video_url ?? undefined,
      }))

    return NextResponse.json({ events })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, events: [] }, { status: 200 })
  }
}

// POST: submit highlight generation job(s) to ione Factory
export async function POST(req: NextRequest) {
  try {
    const { eventIds, stylePreset, voiceGender } = await req.json()
    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json({ error: 'eventIds required' }, { status: 400 })
    }

    const ioneFactoryURL = process.env.IONE_FACTORY_URL
    const ioneFactoryKey = process.env.IONE_FACTORY_API_KEY

    const jobs: any[] = []

    for (const eventId of eventIds) {
      const jobId = `hl_${eventId}_${Date.now().toString(36)}`

      // Fetch event detail
      const { data: ev } = await getSb()
        .from('kejuaraan_atlet')
        .select('id, kejuaraan, medali, tanggal, atlet:atlet_id(nama, cabor, kontingen)')
        .eq('id', eventId)
        .single()

      if (!ev) {
        jobs.push({
          jobId,
          status: 'failed',
          progress: 0,
          message: `Event ${eventId} not found`,
        })
        continue
      }

      const atlet = ev.atlet as any
      const payload = {
        job_id: jobId,
        topic: `Highlight ${atlet?.nama} juara ${ev.medali} di ${ev.kejuaraan}`,
        niche: 'sport_highlight',
        style_preset: stylePreset ?? 'cinematic_dark',
        voice_gender: voiceGender ?? 'male',
        duration_target_sec: 45,
        format: 'shorts_9_16',
        context: {
          atlet_nama: atlet?.nama,
          cabor: atlet?.cabor,
          kontingen: atlet?.kontingen,
          kejuaraan: ev.kejuaraan,
          medali: ev.medali,
          tanggal: ev.tanggal,
        },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/content/highlights/callback`,
      }

      // Try to dispatch to ione Factory
      let status: 'queued' | 'failed' = 'queued'
      let message = 'Submitted to ione Factory queue'

      if (ioneFactoryURL) {
        try {
          const dispatch = await fetch(`${ioneFactoryURL}/api/run-pipeline`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(ioneFactoryKey ? { 'Authorization': `Bearer ${ioneFactoryKey}` } : {}),
            },
            body: JSON.stringify(payload),
          })
          if (!dispatch.ok) {
            status = 'failed'
            message = `ione Factory returned ${dispatch.status}`
          }
        } catch (e: any) {
          status = 'failed'
          message = `Network error: ${e.message}. Pastikan IONE_FACTORY_URL env terisi & server jalan.`
        }
      } else {
        message = 'IONE_FACTORY_URL env belum di-set. Job logged tapi tidak dispatch.'
      }

      // Update kejuaraan_atlet status
      if (status === 'queued') {
        await getSb()
          .from('kejuaraan_atlet')
          .update({ highlight_status: 'queued', highlight_job_id: jobId })
          .eq('id', eventId)
      }

      jobs.push({
        jobId,
        status,
        progress: 5,
        message,
      })
    }

    return NextResponse.json({ jobs, total: jobs.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

