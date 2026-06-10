/**
 * PentaScore API — Logo Upload via Supabase Storage
 *
 * POST /api/pentascore/storage/upload-logo
 *   multipart/form-data:
 *     file:      image file (png/jpg/svg/webp)
 *     tenant_id: UUID (auto-namespaced bucket path)
 *
 * Returns: { url: string } — public URL of uploaded logo
 *
 * Requires: Supabase Storage bucket "pentascore-public" (public read access).
 * Create bucket via Supabase Dashboard → Storage → New bucket → public=true.
 */
import { NextRequest, NextResponse } from 'next/server'
import { pscDb, getPentascoreSession, writeAudit } from '@/lib/pentascore/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET = 'pentascore-public'
const MAX_SIZE = 2 * 1024 * 1024  // 2MB
const ALLOWED_TYPES = ['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp']

export async function POST(req: NextRequest) {
  const session = await getPentascoreSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const tenantId = form.get('tenant_id') as string | null

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 })
  }

  // Resolve tenant
  const { data: tenant } = await pscDb.from('ps_tenants').select('id, slug').eq('id', tenantId).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Build storage path: logos/{tenant_slug}/logo-{timestamp}.{ext}
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const safeExt = ['png','jpg','jpeg','svg','webp'].includes(ext) ? ext : 'png'
  const fileName = `logo-${Date.now()}.${safeExt}`
  const storagePath = `logos/${tenant.slug}/${fileName}`

  // Upload via Supabase Storage
  const bytes = await file.arrayBuffer()

  const { error: upErr } = await pscDb.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    })

  if (upErr) {
    return NextResponse.json({
      error: `Storage upload failed: ${upErr.message}`,
      hint: `Pastikan bucket "${BUCKET}" sudah dibuat di Supabase Dashboard → Storage dengan public access.`,
    }, { status: 500 })
  }

  // Get public URL
  const { data: pub } = pscDb.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = pub.publicUrl

  // Update tenant logo_url
  await pscDb.from('ps_tenants').update({ logo_url: publicUrl }).eq('id', tenantId)

  await writeAudit({
    tenantId,
    actorUsername: session.username,
    actorRole:     session.role,
    actionType:    'update',
    targetTable:   'ps_tenants',
    targetId:      tenantId,
    newValues:     { logo_url: publicUrl, storage_path: storagePath, file_size: file.size },
  })

  return NextResponse.json({
    url: publicUrl,
    storage_path: storagePath,
    size: file.size,
  })
}
