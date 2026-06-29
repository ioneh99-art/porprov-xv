// src/app/spotlight/[slug]/page.tsx
// KBAAS Fase 3.10 — halaman publik spotlight atlet (no auth). Service-key + filter is_public.

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
export const dynamic = 'force-dynamic'

const medalIcon = (m: string | null) => m === 'EMAS' ? '🥇' : m === 'PERAK' ? '🥈' : m === 'PERUNGGU' ? '🥉' : '🏅'

async function getAtlet(slug: string) {
  const { data } = await sb.from('atlet').select('*').eq('public_slug', slug).eq('is_public', true).maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getAtlet(params.slug)
  if (!a) return { title: 'Atlet Tidak Ditemukan' }
  const title = `${a.nama_lengkap} — Atlet ${a.cabor_nama_raw} Kab. Bandung`
  const desc = `Profil & prestasi ${a.nama_lengkap}, atlet binaan KONI Kabupaten Bandung · PORPROV XV Jawa Barat 2026.`
  return { title, description: desc, openGraph: { title, description: desc, type: 'profile' }, twitter: { card: 'summary_large_image', title, description: desc } }
}

export default async function SpotlightPage({ params }: { params: { slug: string } }) {
  const atlet = await getAtlet(params.slug)
  if (!atlet) notFound()

  const [{ data: riwayat }, { data: baseline }] = await Promise.all([
    sb.from('riwayat_kejuaraan').select('*').eq('atlet_id', atlet.id).eq('status', 'Verified').order('tahun', { ascending: false }).limit(12),
    sb.from('atlet_baseline_performance').select('*').eq('atlet_id', atlet.id).eq('is_latest', true),
  ])
  const umur = atlet.tgl_lahir ? new Date().getFullYear() - new Date(atlet.tgl_lahir).getFullYear() : null

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg,#0c1e3a,#0a1020)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(250,204,21,0.18), transparent 60%)' }} />
        <div className="max-w-4xl mx-auto px-6 py-12 relative">
          <div className="text-[11px] uppercase tracking-[0.3em] text-amber-300 font-bold">Atlet Kabupaten Bandung</div>
          <h1 className="text-4xl md:text-6xl font-black mt-2">{atlet.nama_lengkap}</h1>
          <div className="text-lg text-sky-200/80 mt-2">{atlet.cabor_nama_raw} · {atlet.gender === 'L' ? 'Putra' : 'Putri'}{umur ? ` · ${umur} tahun` : ''}</div>
        </div>
      </div>

      {/* Prestasi */}
      {riwayat && riwayat.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-black mb-4">🏆 Riwayat Prestasi</h2>
          <div className="space-y-2.5">
            {riwayat.map((r: any) => (
              <div key={r.id} className="rounded-xl p-4 bg-white/5 border border-white/10 flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <span className="text-lg font-bold">{medalIcon(r.medali)} {r.medali || 'Prestasi'} {r.nomor_lomba}</span>
                  <div className="text-sm text-sky-200/70 mt-0.5">{r.nama_kejuaraan} · {r.tahun}{r.tingkat ? ` · ${r.tingkat}` : ''}</div>
                </div>
                {r.hasil && <span className="font-mono text-amber-300">{r.hasil}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target PORPROV */}
      {baseline && baseline.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-black mb-4">🎯 Target PORPROV XV 2026</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {baseline.map((b: any) => {
              const mp = b.medal_probability || {}
              return (
                <div key={b.id} className="rounded-xl p-4 bg-white/5 border border-white/10">
                  <div className="font-bold text-lg">{b.event_name}</div>
                  {b.waktu_terbaik && <div className="text-sm text-sky-200/70 mt-0.5">PB: <span className="font-mono">{b.waktu_terbaik}</span></div>}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                    <div className="rounded bg-yellow-500/20 py-1.5">🥇 {Math.round((Number(mp.emas) || 0) * 100)}%</div>
                    <div className="rounded bg-slate-400/20 py-1.5">🥈 {Math.round((Number(mp.perak) || 0) * 100)}%</div>
                    <div className="rounded bg-orange-500/20 py-1.5">🥉 {Math.round((Number(mp.perunggu) || 0) * 100)}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-10 text-center text-sky-200/40 text-xs border-t border-white/10 mt-6">
        Profil resmi · KONI Kabupaten Bandung · PORPROV XV Jawa Barat 2026
      </div>
    </div>
  )
}
