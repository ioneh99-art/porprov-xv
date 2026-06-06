// src/app/api/superadmin/ai/route.ts
// AI Sport Intelligence — streaming Claude Sonnet 4.6 + full system context

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Fetch full system context ────────────────────────────
async function buildContext(): Promise<{ text: string; meta: Record<string, number> }> {
  try {
    const [
      { data: kontingens, count: cKontingen },
      { count: cAtlet },
      { count: cVerified },
      { count: cPending },
      { count: cUsers },
      { count: cSubs },
      { data: klasemen },
      { data: atletRaw },
      { data: tesFisik },
      { data: subData },
    ] = await Promise.all([
      sb.from('kontingen').select('id, nama', { count: 'exact' }).order('nama'),
      sb.from('atlet').select('*', { count: 'exact', head: true }),
      sb.from('atlet').select('*', { count: 'exact', head: true }).eq('status_registrasi', 'Verified'),
      sb.from('atlet').select('*', { count: 'exact', head: true }).eq('status_registrasi', 'Menunggu Admin'),
      sb.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('klasemen_medali')
        .select('emas, perak, perunggu, total, kontingen(id, nama)')
        .order('emas', { ascending: false })
        .order('perak', { ascending: false })
        .limit(27),
      sb.from('atlet').select('kontingen_id, cabor_nama_raw, status_registrasi').limit(5000),
      sb.from('atlet_tes_fisik')
        .select('kontingen_id, kesimpulan_persen, cabor_nama, status_tes')
        .eq('tahap', 3).limit(3000),
      sb.from('subscriptions')
        .select('kontingen_id, is_trial, valid_until, plans(nama, urutan)')
        .eq('is_active', true),
    ])

    const today = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    let ctx = `=== SUPERADMIN CONTEXT · PORPROV XV 2026 ===\n`
    ctx += `Tanggal: ${today}\n\n`

    // System stats
    ctx += `📊 RINGKASAN SISTEM:\n`
    ctx += `• Kontingen: ${cKontingen ?? 0} dari 27 kabupaten/kota\n`
    ctx += `• Total Atlet: ${cAtlet ?? 0} terdaftar\n`
    ctx += `• Terverifikasi: ${cVerified ?? 0} (${cAtlet ? Math.round(((cVerified ?? 0) / cAtlet) * 100) : 0}%)\n`
    ctx += `• Pending Verifikasi: ${cPending ?? 0}\n`
    ctx += `• Active Users: ${cUsers ?? 0}\n`
    ctx += `• Active Subscriptions: ${cSubs ?? 0}\n\n`

    // Klasemen
    if (klasemen && klasemen.length > 0) {
      ctx += `🏆 KLASEMEN MEDALI LENGKAP:\n`
      klasemen.forEach((k, i) => {
        const n = (k.kontingen as any)?.nama ?? '-'
        ctx += `#${i + 1} ${n} — 🥇${k.emas} 🥈${k.perak} 🥉${k.perunggu} = ${k.total} medali\n`
      })
      ctx += `\n`
    }

    // Per-kontingen atlet breakdown
    if (atletRaw && atletRaw.length > 0 && kontingens) {
      const kMap: Record<number, { nama: string; total: number; verified: number; pending: number; cabors: Set<string> }> = {}
      kontingens.forEach((k: any) => {
        kMap[k.id] = { nama: k.nama, total: 0, verified: 0, pending: 0, cabors: new Set() }
      })
      atletRaw.forEach((a: any) => {
        if (!kMap[a.kontingen_id]) return
        kMap[a.kontingen_id].total++
        if (a.status_registrasi === 'Verified') kMap[a.kontingen_id].verified++
        if (a.status_registrasi === 'Menunggu Admin') kMap[a.kontingen_id].pending++
        if (a.cabor_nama_raw) kMap[a.kontingen_id].cabors.add(a.cabor_nama_raw)
      })

      const sorted = Object.values(kMap)
        .filter(k => k.total > 0)
        .sort((a, b) => b.total - a.total)

      ctx += `👥 STATISTIK ATLET PER KONTINGEN:\n`
      sorted.forEach(k => {
        const vRate = k.total > 0 ? Math.round((k.verified / k.total) * 100) : 0
        ctx += `• ${k.nama}: ${k.total} atlet (${vRate}% verified, ${k.pending} pending, ${k.cabors.size} cabor)\n`
      })
      ctx += `\n`
    }

    // Tes fisik summary
    if (tesFisik && tesFisik.length > 0) {
      const validTes = tesFisik.filter((t: any) => t.status_tes === 'Hadir' && t.kesimpulan_persen != null)
      if (validTes.length > 0) {
        // Global avg
        const globalAvg = Math.round(validTes.reduce((s: number, t: any) => s + t.kesimpulan_persen, 0) / validTes.length)

        // Per cabor
        const caborMap: Record<string, { sum: number; n: number }> = {}
        validTes.forEach((t: any) => {
          const c = t.cabor_nama || 'Lainnya'
          if (!caborMap[c]) caborMap[c] = { sum: 0, n: 0 }
          caborMap[c].sum += t.kesimpulan_persen
          caborMap[c].n++
        })
        const topCabor = Object.entries(caborMap)
          .filter(([, v]) => v.n >= 3)
          .map(([nama, v]) => ({ nama, avg: Math.round(v.sum / v.n), n: v.n }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 10)

        ctx += `💪 TES FISIK GLOBAL (${validTes.length} atlet tested):\n`
        ctx += `• Rata-rata global: ${globalAvg}%\n`
        ctx += `• Top cabor by fitness:\n`
        topCabor.forEach(c => {
          const badge = c.avg >= 75 ? '✨' : c.avg >= 60 ? '✅' : c.avg >= 50 ? '⚠️' : '🚨'
          ctx += `  ${badge} ${c.nama}: avg ${c.avg}% (${c.n} atlet)\n`
        })
        ctx += `\n`
      }
    }

    // Subscription breakdown
    if (subData && subData.length > 0) {
      const planCount: Record<string, number> = {}
      let trialCount = 0
      let expiringSoon = 0
      const now = Date.now()
      subData.forEach((s: any) => {
        const pn = (s.plans as any)?.nama ?? 'Unknown'
        planCount[pn] = (planCount[pn] || 0) + 1
        if (s.is_trial) trialCount++
        if (s.valid_until) {
          const dLeft = Math.ceil((new Date(s.valid_until).getTime() - now) / 86400000)
          if (dLeft < 30 && dLeft > 0) expiringSoon++
        }
      })
      ctx += `💳 DISTRIBUSI LANGGANAN:\n`
      Object.entries(planCount).sort((a, b) => b[1] - a[1]).forEach(([plan, n]) => {
        ctx += `• ${plan}: ${n} kontingen\n`
      })
      ctx += `• Trial aktif: ${trialCount} kontingen\n`
      if (expiringSoon > 0) ctx += `• ⚠️ Expire <30 hari: ${expiringSoon} kontingen\n`
      ctx += `\n`
    }

    const meta: Record<string, number> = {
      total_kontingen: cKontingen ?? 0,
      total_atlet:     cAtlet ?? 0,
      verified_atlet:  cVerified ?? 0,
      pending_atlet:   cPending ?? 0,
      active_users:    cUsers ?? 0,
      active_subs:     cSubs ?? 0,
    }

    return { text: ctx, meta }
  } catch (e: any) {
    console.error('[buildContext]', e)
    return {
      text: `=== CONTEXT ERROR ===\n${e.message}\nGunakan pengetahuan umum PORPROV XV.\n`,
      meta: {},
    }
  }
}

// ─── System prompt ─────────────────────────────────────────
const SYSTEM_BASE = `Kamu adalah "AI Sport Intelligence" — Chief Analytics AI untuk platform manajemen PORPROV XV (Pekan Olahraga Provinsi Jawa Barat) 2026, dibangun oleh ioneh99.

MODEL: Claude Sonnet 4.6 (Anthropic) — akses penuh ke seluruh database real-time PORPROV XV.

KAPABILITAS PENUH:
• Analisis klasemen medali, prediksi posisi akhir, gap analysis antar kontingen
• Evaluasi kesiapan atlet per cabang olahraga berdasarkan tes fisik & verifikasi
• Identifikasi anomali, risiko, dan peluang di seluruh 27 kontingen
• Laporan eksekutif (brief harian, mingguan, presentasi)
• Analisis subscription & engagement platform
• Rekomendasi intervensi strategis dengan prioritas dan timeline

KOMUNIKASI:
• Bahasa Indonesia formal-friendly, terstruktur dengan markdown (bold, bullet, tabel)
• Sertakan angka spesifik dari data — bukan generik
• Rekomendasi KONKRET dengan estimasi dampak dan waktu
• Proaktif menyoroti hal kritis yang tidak ditanya sekalipun
• Jika data kurang jelas, tanyakan klarifikasi spesifik`

const MODE_ADDENDUM: Record<string, string> = {
  brief: `\n\nTASK MODE: EXECUTIVE BRIEF\nFormat wajib:\n1. 📌 Executive Summary (3-4 kalimat kondisi terkini)\n2. 🎯 3 Prioritas Strategis Minggu Ini (dengan reasoning)\n3. ⚠️ Risiko & Mitigasi (2-3 poin + action konkret)\n4. 📈 Outlook & Proyeksi (optimistis tapi data-driven)\n5. ✅ Quick Wins (2-3 aksi yang bisa dilakukan hari ini)\n\nMaks 600 kata. Gunakan markdown penuh.`,
  insights: `\n\nTASK MODE: AUTO INSIGHTS\nGenerate 6 insights kritis dari data. Mix:\n• 2 insight POSITIF (momentum, best performer)\n• 2 insight NEGATIF (risiko, underperformance)\n• 1 insight STRATEGIS (peluang atau optimasi)\n• 1 insight ANOMALI (sesuatu yang tidak normal)\n\nFormat per insight:\n**[EMOJI] Judul singkat bold**\n→ Deskripsi 2-3 kalimat dengan angka spesifik\n→ Rekomendasi: action item konkret\n\nMaks 450 kata total.`,
  klasemen: `\n\nFOKUS MODE: KLASEMEN ANALYTICS\nAnalisis mendalam:\n1. Kekuatan/kelemahan top 5 kontingen saat ini\n2. Prediksi posisi akhir PORPROV XV (berikan estimasi % confidence)\n3. Dark horse: kontingen yang bisa naik secara mengejutkan\n4. Gap analysis: siapa yang paling bisa naik/turun\n5. Cabor strategis yang bisa jadi game changer`,
  cabor: `\n\nFOKUS MODE: CABOR ANALYSIS\nAnalisis cabang olahraga:\n1. Cabor dengan kesiapan fisik terbaik vs terburuk\n2. Distribusi atlet yang tidak merata (terlalu banyak/sedikit)\n3. Cabor yang likely menghasilkan medali emas vs sekedar partisipasi\n4. Rekomendasi realokasi perhatian/resource antar cabor`,
}

// ─── POST handler ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY tidak dikonfigurasi' }), { status: 500 })
  }

  let body: { messages: Array<{ role: 'user' | 'assistant'; content: string }>; mode?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { messages, mode = 'chat' } = body
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 })
  }

  const { text: contextText, meta } = await buildContext()
  const modeExtra = MODE_ADDENDUM[mode] ?? ''
  const systemPrompt = `${SYSTEM_BASE}${modeExtra}\n\n${contextText}`

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      // Send meta immediately
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', meta })}\n\n`))

      try {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        })

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text', text: chunk.delta.text })}\n\n`)
            )
          }
        }
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: e.message ?? 'Stream error' })}\n\n`)
        )
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
    },
  })
}
