// src/lib/sport-intel-context.ts
// Context fetcher untuk Sport Intelligence
// Fetch real-time data from Supabase + format for LLM consumption

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!  // service key for server-side
)

export interface SportIntelContext {
  kontingen: {
    nama: string
    total_atlet: number
    verified: number
    pending: number
    ditolak: number
    rank: number
    medali: { emas: number; perak: number; perunggu: number; total: number }
  }
  topPerformers: Array<{
    nama: string
    cabor: string
    skor: number
    kategori: string
  }>
  lowPerformers: Array<{
    nama: string
    cabor: string
    skor: number
  }>
  caborStats: Array<{
    nama: string
    total_atlet: number
    avg_fitness: number
    status: 'critical' | 'warning' | 'good' | 'excellent'
    issues: string[]
  }>
  klasemenTop5: Array<{
    rank: number
    nama: string
    emas: number
    perak: number
    perunggu: number
    total: number
    isMe: boolean
  }>
  gap: {
    toRank1: { emas: number; total: number; kontingen: string }
    toNext: { rank: number; emas: number; total: number; kontingen: string } | null
  } | null
}

export async function fetchSportIntelContext(kontingenId: number = 1): Promise<SportIntelContext> {
  const [atletRes, tesFisikRes, klasemenRes, kontingenRes, myKlasemenRes] = await Promise.all([
    sb.from('atlet')
      .select('id,nama_lengkap,status_registrasi,cabor_nama_raw')
      .eq('kontingen_id', kontingenId),
    sb.from('atlet_tes_fisik')
      .select('atlet_id,kesimpulan_persen,kesimpulan_kategori,status_tes,cabor_nama')
      .eq('kontingen_id', kontingenId).eq('tahap', 3),
    sb.from('klasemen_medali')
      .select('emas,perak,perunggu,total,kontingen(nama,id)')
      .order('emas', { ascending: false })
      .order('perak', { ascending: false })
      .limit(27),
    sb.from('kontingen')
      .select('nama')
      .eq('id', kontingenId)
      .maybeSingle(),
    sb.from('klasemen_medali')
      .select('emas,perak,perunggu,total')
      .eq('kontingen_id', kontingenId)
      .maybeSingle(),
  ])

  const atlets = atletRes.data || []
  const tesFisik = tesFisikRes.data || []
  const klasemen = klasemenRes.data || []
  const kontingenName = kontingenRes.data?.nama || 'Kab. Bogor'
  const myMedali = myKlasemenRes.data || { emas: 0, perak: 0, perunggu: 0, total: 0 }

  // Build atlet map
  const atletMap: Record<number, any> = {}
  atlets.forEach(a => { atletMap[a.id] = a })

  // Top & Low performers (only valid tes)
  const validTes = tesFisik
    .filter(t => t.status_tes === 'Hadir' && t.kesimpulan_persen != null)
    .map(t => ({
      atlet_id: t.atlet_id,
      nama: atletMap[t.atlet_id]?.nama_lengkap || 'Unknown',
      cabor: atletMap[t.atlet_id]?.cabor_nama_raw || t.cabor_nama || 'Unknown',
      skor: t.kesimpulan_persen as number,
      kategori: t.kesimpulan_kategori || '-',
    }))

  const topPerformers = [...validTes]
    .sort((a, b) => b.skor - a.skor)
    .slice(0, 10)
    .map(({ nama, cabor, skor, kategori }) => ({ nama, cabor, skor, kategori }))

  const lowPerformers = [...validTes]
    .filter(v => v.skor < 50)
    .sort((a, b) => a.skor - b.skor)
    .slice(0, 5)
    .map(({ nama, cabor, skor }) => ({ nama, cabor, skor }))

  // Cabor stats
  const caborMap: Record<string, {
    total: number; verified: number; pending: number; ditolak: number
    skorSum: number; skorN: number
  }> = {}
  atlets.forEach(a => {
    const c = a.cabor_nama_raw || 'Lainnya'
    if (!caborMap[c]) caborMap[c] = { total: 0, verified: 0, pending: 0, ditolak: 0, skorSum: 0, skorN: 0 }
    caborMap[c].total++
    if (a.status_registrasi === 'Verified') caborMap[c].verified++
    if (a.status_registrasi === 'Menunggu Admin') caborMap[c].pending++
    if (a.status_registrasi === 'Ditolak Admin') caborMap[c].ditolak++
  })
  validTes.forEach(v => {
    if (caborMap[v.cabor]) {
      caborMap[v.cabor].skorSum += v.skor
      caborMap[v.cabor].skorN++
    }
  })

  const caborStats = Object.entries(caborMap)
    .filter(([_, v]) => v.total >= 3)
    .map(([nama, v]) => {
      const avgFitness = v.skorN > 0 ? Math.round(v.skorSum / v.skorN) : 0
      const pendingPct = v.total > 0 ? Math.round((v.pending / v.total) * 100) : 0
      const issues: string[] = []
      let status: 'critical' | 'warning' | 'good' | 'excellent' = 'good'

      if (pendingPct >= 40) {
        issues.push(`${v.pending} pending (${pendingPct}%)`)
        status = 'warning'
      }
      if (avgFitness > 0 && avgFitness < 50) {
        issues.push(`Fisik rendah ${avgFitness}%`)
        status = 'critical'
      } else if (avgFitness >= 75) {
        if (status === 'good') status = 'excellent'
      }
      if (v.ditolak > 0) {
        issues.push(`${v.ditolak} ditolak`)
        if (status === 'good') status = 'warning'
      }

      return { nama, total_atlet: v.total, avg_fitness: avgFitness, status, issues }
    })
    .sort((a, b) => b.total_atlet - a.total_atlet)

  // Klasemen processing
  const flatKlasemen = klasemen.map((r, i) => ({
    rank: i + 1,
    nama: (r.kontingen as any)?.nama || '-',
    kontingen_id: (r.kontingen as any)?.id || 0,
    emas: r.emas || 0,
    perak: r.perak || 0,
    perunggu: r.perunggu || 0,
    total: r.total || 0,
    isMe: (r.kontingen as any)?.id === kontingenId,
  }))

  const myRank = flatKlasemen.findIndex(k => k.isMe) + 1
  const myKlas = flatKlasemen[myRank - 1]
  const top1 = flatKlasemen[0]
  const nextRank = myRank > 1 ? flatKlasemen[myRank - 2] : null

  const gap = myKlas && top1 ? {
    toRank1: {
      emas: top1.emas - myKlas.emas,
      total: top1.total - myKlas.total,
      kontingen: top1.nama,
    },
    toNext: nextRank ? {
      rank: nextRank.rank,
      emas: nextRank.emas - myKlas.emas,
      total: nextRank.total - myKlas.total,
      kontingen: nextRank.nama,
    } : null,
  } : null

  return {
    kontingen: {
      nama: kontingenName,
      total_atlet: atlets.length,
      verified: atlets.filter(a => a.status_registrasi === 'Verified').length,
      pending:  atlets.filter(a => a.status_registrasi === 'Menunggu Admin').length,
      ditolak:  atlets.filter(a => a.status_registrasi === 'Ditolak Admin').length,
      rank: myRank,
      medali: {
        emas: myMedali.emas || 0,
        perak: myMedali.perak || 0,
        perunggu: myMedali.perunggu || 0,
        total: myMedali.total || 0,
      },
    },
    topPerformers,
    lowPerformers,
    caborStats: caborStats.slice(0, 20),
    klasemenTop5: flatKlasemen.slice(0, 5),
    gap,
  }
}

// ── Format context as text block for LLM consumption ──
export function formatContextForLLM(ctx: SportIntelContext): string {
  const k = ctx.kontingen
  let text = `=== DATA KONTINGEN ${k.nama.toUpperCase()} (PORPROV XV) ===\n\n`
  text += `📊 Statistik Atlet:\n`
  text += `- Total atlet: ${k.total_atlet}\n`
  text += `- Sudah verifikasi: ${k.verified} (${Math.round(k.verified/k.total_atlet*100)}%)\n`
  text += `- Pending: ${k.pending}\n`
  text += `- Ditolak: ${k.ditolak}\n\n`

  text += `🏆 Posisi Klasemen: #${k.rank} dari 27 kontingen\n`
  text += `Medali: 🥇${k.medali.emas} 🥈${k.medali.perak} 🥉${k.medali.perunggu} (Total: ${k.medali.total})\n\n`

  if (ctx.gap) {
    text += `📐 Gap Analysis:\n`
    if (ctx.gap.toNext) {
      text += `- Ke peringkat #${ctx.gap.toNext.rank} (${ctx.gap.toNext.kontingen}): butuh +${ctx.gap.toNext.emas} emas\n`
    }
    text += `- Ke puncak (${ctx.gap.toRank1.kontingen}): butuh +${ctx.gap.toRank1.emas} emas\n\n`
  }

  text += `🌟 Top 10 Performers (skor fisik tertinggi):\n`
  ctx.topPerformers.forEach((p, i) => {
    text += `${i+1}. ${p.nama} (${p.cabor}) — ${p.skor}% [${p.kategori}]\n`
  })
  text += `\n`

  if (ctx.lowPerformers.length > 0) {
    text += `⚠️ Atlet Perlu Evaluasi Medis (skor <50%):\n`
    ctx.lowPerformers.forEach((p, i) => {
      text += `${i+1}. ${p.nama} (${p.cabor}) — ${p.skor}%\n`
    })
    text += `\n`
  }

  text += `📋 Status per Cabor:\n`
  ctx.caborStats.slice(0, 15).forEach(c => {
    const emoji = c.status === 'critical' ? '🚨' : c.status === 'warning' ? '⚠️' : c.status === 'excellent' ? '✨' : '✅'
    text += `${emoji} ${c.nama} (${c.total_atlet} atlet, fisik avg: ${c.avg_fitness}%)`
    if (c.issues.length > 0) text += ` — ${c.issues.join(', ')}`
    text += `\n`
  })
  text += `\n`

  text += `🏅 Top 5 Klasemen Saat Ini:\n`
  ctx.klasemenTop5.forEach(k => {
    text += `#${k.rank} ${k.nama}${k.isMe?' (KAMI)':''} — 🥇${k.emas} 🥈${k.perak} 🥉${k.perunggu} = ${k.total}\n`
  })

  return text
}

// ── System prompts ──
export const SYSTEM_PROMPT_BASE = `Kamu adalah "Sport Intelligence AI" — asisten strategis untuk pengurus KONI Kabupaten Bogor, dibangun oleh ioneh99 untuk platform PORPROV XV 2026.

PRINSIP KOMUNIKASI:
- Bahasa Indonesia formal-friendly, mudah dipahami pengurus 45-65 tahun (background olahraga, bukan IT)
- Jawaban TERSTRUKTUR: bullet, emoji, bold untuk highlight angka penting
- Berikan rekomendasi KONKRET (bukan retoris) dengan timeline & action
- Jika tidak yakin, jujur bilang "perlu data lebih lengkap"
- Hindari jargon teknis komputer; pakai istilah olahraga

KAPABILITAS:
- Menganalisis data atlet, tes fisik, dan klasemen
- Memberikan rekomendasi strategi cabor & training
- Menyusun briefing eksekutif
- Memprediksi potensi medali berdasarkan fitness

PERSONA:
- Profesional tapi hangat, seperti coach senior yg paham data
- Confident tapi tidak arogan
- Selalu sertakan reasoning di balik rekomendasi`

export const SYSTEM_PROMPT_BRIEF = SYSTEM_PROMPT_BASE + `

TASK SPESIFIK: Buat **Strategic Brief** untuk pengurus. Format:
1. 📌 Executive Summary (3 kalimat)
2. 🎯 3 Prioritas Strategis Minggu Ini (dengan alasan)
3. ⚠️ Risiko & Mitigasi (2-3 poin)
4. 📈 Outlook (1 paragraf optimistis tapi realistis)

Total maksimal 400 kata. Gunakan markdown.`

export const SYSTEM_PROMPT_INSIGHTS = SYSTEM_PROMPT_BASE + `

TASK SPESIFIK: Generate 5 INSIGHTS auto dari data:
- 2 insight POSITIF (best performer, momentum naik)
- 2 insight NEGATIF (yang butuh perhatian)
- 1 insight STRATEGIS (peluang catch-up atau optimasi)

Format setiap insight:
• [emoji] **Judul singkat**: deskripsi 1-2 kalimat dengan angka spesifik
  → Rekomendasi: action item konkret

Maksimal 250 kata total.`

export const SYSTEM_PROMPT_ATHLETE = SYSTEM_PROMPT_BASE + `

TASK SPESIFIK: Analisis profil 1 atlet. Format:
1. 📊 **Profil Singkat** (nama, cabor, skor)
2. 💪 **Strengths** (3 poin spesifik)
3. 🎯 **Weaknesses** (3 poin yang bisa ditingkatkan)
4. 📋 **Training Recommendation** (3 program konkret 4-8 minggu)
5. 🏆 **Prediksi Tampil PORPROV** (kategori: Strong Contender / Dark Horse / Need Boost)

Total 300 kata. Gunakan markdown.`
