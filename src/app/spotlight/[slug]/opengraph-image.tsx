// src/app/spotlight/[slug]/opengraph-image.tsx
// KBAAS Fase 3.10 — OG image dinamis untuk share halaman spotlight atlet.

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  const { data: a } = await sb.from('atlet').select('nama_lengkap, cabor_nama_raw, gender').eq('public_slug', params.slug).eq('is_public', true).maybeSingle()
  const nama = a?.nama_lengkap ?? 'Atlet'
  const cabor = a?.cabor_nama_raw ?? ''

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg,#0c1e3a,#0a1020)', color: 'white', padding: 64, fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 26, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: 4, fontWeight: 700 }}>KONI Kabupaten Bandung</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1 }}>{nama}</div>
          <div style={{ fontSize: 36, color: '#bae6fd', marginTop: 16 }}>{cabor}{a?.gender ? ` · ${a.gender === 'L' ? 'Putra' : 'Putri'}` : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 24, color: '#7dd3fc' }}>
          <div style={{ background: 'linear-gradient(90deg,#facc15,#f59e0b)', color: '#3b2f05', padding: '8px 20px', borderRadius: 12, fontWeight: 800 }}>PORPROV XV · Jawa Barat 2026</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
