// src/app/api/performance/smart-brief/route.ts
// AI Smart Brief untuk Performance module — dengan caching (P0-4 fix)
// Cache invalidation by source data hash + model version

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const dynamic    = 'force-dynamic'
export const fetchCache = 'force-no-store'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const MODEL_VERSION = 'claude-sonnet-4-6'   // FIXED P0-5
const CACHE_TTL_DAYS = 30                    // force regen after 30 days

function ageAt(tglLahir: string | null, targetDate: Date): number | null {
  if (!tglLahir) return null
  const birth = new Date(tglLahir)
  let age = targetDate.getFullYear() - birth.getFullYear()
  const m = targetDate.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && targetDate.getDate() < birth.getDate())) age--
  return age
}

function hashData(data: any): string {
  const json = JSON.stringify(data, Object.keys(data).sort())
  return createHash('sha256').update(json).digest('hex').slice(0, 16)
}

export async function POST(req: NextRequest) {
  try {
    const { atletId, forceRegen = false } = await req.json()
    if (!atletId) return NextResponse.json({ success: false, error: 'atletId wajib diisi' }, { status: 400 })
    
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY tidak terdeteksi.' }, { status: 500 })
    
    // Fetch all data in parallel
    const [
      { data: atlet },
      { data: performances },
      { data: fitData },
      { data: riwayat },
    ] = await Promise.all([
      sb.from('atlet')
        .select('*, cabor:cabor_id(id,nama,avg_umur,min_umur,max_umur)')
        .eq('id', atletId).single(),
      sb.from('atlet_baseline_performance').select('*').eq('atlet_id', atletId).order('event_name'),
      sb.from('atlet_tes_fisik')
        .select('tahap,kesimpulan_persen,kesimpulan_kategori,bmi,berat_badan,tinggi_badan,tanggal_tes,status_tes')
        .eq('atlet_id', atletId).eq('status_tes', 'Hadir').order('tahap'),
      sb.from('riwayat_prestasi')
        .select('event,tahun,hasil,level_event,nomor_tanding,is_demo,submission_status')
        .eq('atlet_id', atletId)
        .order('tahun', { ascending: false }),
    ])
    
    if (!atlet) {
      return NextResponse.json({ success: false, error: 'Atlet tidak ditemukan' }, { status: 404 })
    }
    
    // Compute source hash for cache invalidation
    const sourceHash = hashData({
      performances: performances ?? [],
      fitData:      fitData ?? [],
      riwayat:      (riwayat ?? []).filter((r: any) => !r.is_demo && r.submission_status !== 'rejected'),
    })
    
    // ── Try cache (unless forceRegen) ──
    if (!forceRegen) {
      const { data: cached } = await sb
        .from('atlet_smart_brief_cache')
        .select('brief, source_hash, model_used, generated_at')
        .eq('atlet_id', atletId)
        .maybeSingle()
      
      if (cached && cached.source_hash === sourceHash && cached.model_used === MODEL_VERSION) {
        const ageDays = (Date.now() - new Date(cached.generated_at).getTime()) / (1000 * 60 * 60 * 24)
        if (ageDays < CACHE_TTL_DAYS) {
          return NextResponse.json({
            success: true,
            brief: cached.brief,
            generated_at: cached.generated_at,
            from_cache: true,
            cache_age_days: Math.round(ageDays),
          })
        }
      }
    }
    
    // ── Derived indicators ──
    const PORPROV_DATE = new Date('2026-11-07')
    const age          = ageAt(atlet.tgl_lahir, PORPROV_DATE)
    const caborInfo    = atlet.cabor
    
    // FIXED P0-1: Use DB peak age values if available
    const peakWindow = caborInfo?.min_umur && caborInfo?.max_umur
      ? { min: caborInfo.min_umur, max: caborInfo.max_umur }
      : null
    
    const ageStatus = age && peakWindow
      ? age < peakWindow.min ? 'Berkembang (belum puncak)'
        : age > peakWindow.max ? 'Senior (melewati puncak)'
        : 'Usia Puncak'
      : null
    
    const fitSorted = (fitData ?? []).sort((a: any, b: any) => a.tahap - b.tahap)
    const latestFit = fitSorted.length ? fitSorted[fitSorted.length - 1] : null
    const fitTrend  = fitSorted.length >= 2
      ? (() => {
          const vals = fitSorted.map((f: any) => f.kesimpulan_persen)
          const delta = vals[vals.length - 1] - vals[0]
          return delta > 3 ? `NAIK ${delta} poin` : delta < -3 ? `TURUN ${Math.abs(delta)} poin` : 'STABIL'
        })()
      : 'Belum cukup data trend'
    
    const validGaps = (performances ?? []).filter((p: any) => p.gap_percentage !== null).map((p: any) => Number(p.gap_percentage))
    const avgGap    = validGaps.length ? (validGaps.reduce((s: number, g: number) => s + g, 0) / validGaps.length).toFixed(1) : null
    const gapVar    = validGaps.length > 1
      ? Math.sqrt(validGaps.reduce((s: number, g: number) => s + Math.pow(g - Number(avgGap), 2), 0) / validGaps.length).toFixed(1)
      : null
    
    const isFit   = latestFit && latestFit.kesimpulan_persen >= 70
    const isClose = avgGap !== null && Number(avgGap) <= 7
    const quadrant = !latestFit && avgGap === null ? 'DATA TIDAK CUKUP'
      : isFit && isClose   ? 'UNGGULAN (fisik prima + dekat rekor)'
      : isFit && !isClose  ? 'POTENSIAL (fisik prima, teknik perlu dikembangkan)'
      : !isFit && isClose  ? 'AT RISK (dekat rekor tapi fisik belum prima)'
      : 'PERHATIAN (fisik & teknik perlu intervensi)'
    
    const isLokal = atlet.kode_asal_daerah?.startsWith('3204') ? 'Ya (lokal Kab. Bandung)' : 'Tidak (luar daerah)'
    
    // Riwayat prestasi summary
    const validRiwayat = (riwayat ?? []).filter((r: any) => !r.is_demo && r.submission_status !== 'rejected')
    const riwayatEmas  = validRiwayat.filter((r: any) => r.hasil === 'Emas').length
    const riwayatPerak = validRiwayat.filter((r: any) => r.hasil === 'Perak').length
    const riwayatPerunggu = validRiwayat.filter((r: any) => r.hasil === 'Perunggu').length
    const topLevel = validRiwayat.reduce((top: string | null, r: any) => {
      const LEVEL_RANK: Record<string, number> = { 'Internasional': 5, 'Nasional': 4, 'Provinsi': 3, 'Kabupaten': 2, 'Lokal': 1 }
      if (!top) return r.level_event
      return (LEVEL_RANK[r.level_event] || 0) > (LEVEL_RANK[top] || 0) ? r.level_event : top
    }, null)
    
    // ── Build prompt ──
    const prompt = `Kamu adalah analis performa atlet senior untuk KONI Kab. Bandung. Tulis analisa profesional, to-the-point, dalam Bahasa Indonesia.

═══ PROFIL ATLET ═══
Nama        : ${atlet.nama_lengkap}
Cabor       : ${caborInfo?.nama ?? '-'}
Gender      : ${atlet.gender === 'L' ? 'Putra' : 'Putri'}
Usia PORPROV (7 Nov 2026): ${age ?? 'Tidak diketahui'} tahun
Status Usia : ${ageStatus ?? 'Tidak diketahui'}${peakWindow ? ` (window puncak ${peakWindow.min}–${peakWindow.max} thn dari data cabor)` : ''}
Asal Daerah : ${isLokal}
Status Admin: ${atlet.status_registrasi ?? '-'}

═══ PERFORMA BASELINE (PORPROV 2022) ═══
${(performances ?? []).length > 0 ? (performances ?? []).map((p: any) => `• ${p.event_name}${p.is_relay ? ' [RELAY]' : ''}
  Waktu terbaik : ${p.waktu_terbaik || 'NT'}
  Rekor PORPROV : ${p.rekor_porprov || 'N/A'}
  Gap dari rekor: ${p.gap_percentage != null ? p.gap_percentage + '%' : 'N/A'}
  Target medali : ${p.target_medali || 'Belum ditentukan'}
  Pesaing utama : ${p.pesaing || 'Belum teridentifikasi'}`).join('\n') : '(Cabor ini belum memiliki data baseline)'}

Rata-rata gap  : ${avgGap !== null ? avgGap + '%' : 'N/A'}
Konsistensi    : ${gapVar !== null ? `σ = ${gapVar} (${Number(gapVar) < 3 ? 'sangat konsisten' : Number(gapVar) < 7 ? 'cukup konsisten' : 'bervariasi antar event'})` : 'Belum cukup event untuk konsistensi'}

═══ RIWAYAT PRESTASI KEJUARAAN ═══
${validRiwayat.length > 0 ? `Total: ${validRiwayat.length} records · 🥇 ${riwayatEmas} · 🥈 ${riwayatPerak} · 🥉 ${riwayatPerunggu}
Level tertinggi: ${topLevel ?? '-'}

Sampel terbaru:
${validRiwayat.slice(0, 5).map((r: any) => `• ${r.tahun} — ${r.event} (${r.nomor_tanding}) → ${r.hasil} [${r.level_event}]`).join('\n')}` : '(Belum ada riwayat prestasi terverifikasi)'}

═══ KESIAPAN FISIK (TES FISIK) ═══
${fitSorted.length ? fitSorted.map((f: any) => `• Tahap ${f.tahap}: ${f.kesimpulan_persen}% — ${f.kesimpulan_kategori ?? ''} (${f.tanggal_tes ?? ''})`).join('\n') : '• Belum ada data tes fisik'}
Tren fitness   : ${fitTrend}
${latestFit?.bmi ? `BMI terakhir   : ${latestFit.bmi} (${latestFit.berat_badan}kg / ${latestFit.tinggi_badan}cm)` : ''}

═══ KUADRAN KESIAPAN ═══
${quadrant}

═══ INSTRUKSI ═══
Tulis analisa NARATIF PARAGRAF (BUKAN bullet/list), maksimal 250 kata, yang mencakup:
1. Penilaian menyeluruh kondisi atlet saat ini (gabungkan data fisik + teknik + usia + track record kejuaraan)
2. Kekuatan utama yang bisa diandalkan di PORPROV XV
3. Risiko atau gap kritis yang perlu diselesaikan sebelum November 2026
4. Rekomendasi latihan yang SPESIFIK dan ACTIONABLE
5. Outlook realitis: peluang medali dan event mana yang paling menjanjikan
6. Bila track record kejuaraan kuat, gunakan sebagai konteks pendukung untuk prediksi

JANGAN gunakan markdown, bullet points, atau header. Tulis sebagai 3–4 paragraf naratif profesional.`
    
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model:       MODEL_VERSION,
      max_tokens:  800,
      temperature: 0.65,
      messages:    [{ role: 'user', content: prompt }],
    })
    
    const brief = msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim()
    
    const now = new Date().toISOString()
    
    // ── Save to cache ──
    await sb.from('atlet_smart_brief_cache')
      .upsert({
        atlet_id:     atletId,
        brief,
        source_hash:  sourceHash,
        model_used:   MODEL_VERSION,
        generated_at: now,
      }, { onConflict: 'atlet_id' })
    
    return NextResponse.json({
      success:      true,
      brief,
      generated_at: now,
      from_cache:   false,
      model:        MODEL_VERSION,
    })
  } catch (error: any) {
    console.error('Performance smart-brief error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}
