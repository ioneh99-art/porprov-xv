// src/app/api/baseline/smart-brief/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic    = 'force-dynamic'
export const fetchCache = 'force-no-store'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

function ageAt(tglLahir: string | null, targetDate: Date): number | null {
  if (!tglLahir) return null
  const birth = new Date(tglLahir)
  let age = targetDate.getFullYear() - birth.getFullYear()
  const m = targetDate.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && targetDate.getDate() < birth.getDate())) age--
  return age
}

const PEAK_WINDOW: Record<number, { min: number; max: number }> = {
  10: { min: 21, max: 30 }, // Atletik
  7:  { min: 16, max: 24 }, // Renang
}

export async function POST(req: NextRequest) {
  try {
    const { atletId } = await req.json()
    if (!atletId) return NextResponse.json({ success: false, error: 'atletId wajib diisi' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY tidak terdeteksi.' }, { status: 500 })

    // Fetch all data in parallel
    const [
      { data: atlet },
      { data: performances },
      { data: fitData },
    ] = await Promise.all([
      sb.from('atlet')
        .select('*, cabor:cabor_id(id,nama,avg_umur,min_umur,max_umur)')
        .eq('id', atletId).single(),
      sb.from('atlet_baseline_performance').select('*').eq('atlet_id', atletId).order('event_name'),
      sb.from('atlet_tes_fisik')
        .select('tahap,kesimpulan_persen,kesimpulan_kategori,bmi,berat_badan,tinggi_badan,tanggal_tes,status_tes')
        .eq('atlet_id', atletId).eq('status_tes', 'Hadir').order('tahap'),
    ])

    if (!atlet || !performances?.length) {
      return NextResponse.json({ success: false, error: 'Data atlet / baseline tidak ditemukan' }, { status: 404 })
    }

    // ── Derived indicators ──
    const PORPROV_DATE = new Date('2026-11-07')
    const age          = ageAt(atlet.tgl_lahir, PORPROV_DATE)
    const caborId      = atlet.cabor?.id as number | undefined
    const peakWindow   = caborId ? PEAK_WINDOW[caborId] : null
    const ageStatus    = age && peakWindow
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
      : 'Data 1 tahap saja'

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

    // ── Build prompt ──
    const prompt = `Kamu adalah analis performa atlet senior untuk KONI Kab. Bandung. Tulis analisa profesional, to-the-point, dalam Bahasa Indonesia.

═══ PROFIL ATLET ═══
Nama      : ${atlet.nama_lengkap}
Cabor     : ${atlet.cabor?.nama ?? '-'}
Gender    : ${atlet.gender === 'L' ? 'Putra' : 'Putri'}
Usia PORPROV (7 Nov 2026): ${age ?? 'Tidak diketahui'} tahun
Status Usia : ${ageStatus ?? 'Tidak diketahui'}${peakWindow ? ` (window puncak ${peakWindow.min}–${peakWindow.max} thn)` : ''}
Asal Daerah : ${isLokal}
Status Admin: ${atlet.status_registrasi ?? '-'}

═══ PERFORMA BASELINE (PORPROV 2022) ═══
${(performances ?? []).map((p: any) => `• ${p.event_name}${p.is_relay ? ' [RELAY]' : ''}
  Waktu terbaik : ${p.waktu_terbaik || 'NT'}
  Rekor PORPROV : ${p.rekor_porprov || 'N/A'}
  Gap dari rekor: ${p.gap_percentage != null ? p.gap_percentage + '%' : 'N/A'}
  Target medali : ${p.target_medali || 'Belum ditentukan'}
  Pesaing utama : ${p.pesaing || 'Belum teridentifikasi'}`).join('\n')}

Rata-rata gap  : ${avgGap !== null ? avgGap + '%' : 'N/A'}
Konsistensi    : ${gapVar !== null ? `σ = ${gapVar} (${Number(gapVar) < 3 ? 'sangat konsisten' : Number(gapVar) < 7 ? 'cukup konsisten' : 'bervariasi antar event'})` : 'Hanya 1 event'}

═══ KESIAPAN FISIK (TES FISIK) ═══
${fitSorted.length ? fitSorted.map((f: any) => `• Tahap ${f.tahap}: ${f.kesimpulan_persen}% — ${f.kesimpulan_kategori ?? ''} (${f.tanggal_tes ?? ''})`).join('\n') : '• Belum ada data tes fisik'}
Tren fitness   : ${fitTrend}
${latestFit?.bmi ? `BMI terakhir   : ${latestFit.bmi} (${latestFit.berat_badan}kg / ${latestFit.tinggi_badan}cm)` : ''}

═══ KUADRAN KESIAPAN ═══
${quadrant}

═══ INSTRUKSI ═══
Tulis analisa NARATIF PARAGRAF (BUKAN bullet/list), maksimal 220 kata, yang mencakup:
1. Penilaian menyeluruh kondisi atlet saat ini (gabungkan data fisik + teknik + usia)
2. Kekuatan utama yang bisa diandalkan di PORPROV XV
3. Risiko atau gap kritis yang perlu diselesaikan sebelum November 2026
4. Rekomendasi latihan yang SPESIFIK dan ACTIONABLE berdasarkan kuadran
5. Outlook realitis: apakah target medali tercapai, dan di event mana peluang terbesar

JANGAN gunakan markdown, bullet points, atau header. Tulis sebagai 3–4 paragraf naratif profesional.`

    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model:      'claude-sonnet-4-5-20250929',
      max_tokens: 700,
      temperature: 0.65,
      messages: [{ role: 'user', content: prompt }],
    })

    const brief = msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim()

    return NextResponse.json({ success: true, brief, generated_at: new Date().toISOString() })
  } catch (error: any) {
    console.error('Baseline smart-brief error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 })
  }
}
