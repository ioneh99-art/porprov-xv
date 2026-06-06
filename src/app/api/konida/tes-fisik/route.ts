// src/app/api/konida/tes-fisik/route.ts  [v2 — with atlet_list]
// Endpoint dashboard KONIDA — agregat tes fisik per kontingen + daftar atlet

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kontingenId = parseInt(searchParams.get('kontingen_id') || '0')
  if (!kontingenId)
    return NextResponse.json({ error: 'kontingen_id required' }, { status: 400 })

  try {
    // 1. Per-cabor aggregate
    const { data: perCabor } = await sb
      .from('v_tes_fisik_per_cabor').select('*').eq('kontingen_id', kontingenId)

    // 2. Komponen lemah per cabor
    const { data: komponenLemah } = await sb
      .from('v_tes_fisik_komponen_lemah').select('*').eq('kontingen_id', kontingenId)

    // 3. Overall stats
    const { data: allTes } = await sb
      .from('atlet_tes_fisik')
      .select('kesimpulan_persen, kesimpulan_kategori, status_tes, bmi, jenis_kelamin')
      .eq('kontingen_id', kontingenId).eq('tahap', 3)

    // 4. ATLET LIST — daftar atlet dengan data tes fisik
    const { data: atletList } = await sb
      .from('atlet_tes_fisik')
      .select(`
        id, atlet_id, nama_atlet, cabor_nama, jenis_kelamin,
        berat_badan, tinggi_badan, bmi,
        kesimpulan_persen, kesimpulan_kategori, status_tes,
        matching_method,
        atlet:atlet_id(id, nama_lengkap, no_ktp, cabor_nama_raw)
      `)
      .eq('kontingen_id', kontingenId)
      .eq('tahap', 3)
      .order('kesimpulan_persen', { ascending: false, nullsFirst: false })

    // 5. UNMATCHED COUNT — atlet yang belum berhasil dicocokkan
    const { count: unmatchedCount } = await sb
      .from('atlet_tes_fisik_unmatched')
      .select('id', { count: 'exact', head: true })
      .eq('kontingen_id', kontingenId)
      .eq('status_review', 'pending')

    const total = allTes?.length || 0
    const hadir = allTes?.filter(t => t.status_tes === 'Hadir').length || 0
    const dns = total - hadir

    const kategoriDist: Record<string, number> = {
      'Baik Sekali': 0, 'Baik': 0, 'Cukup': 0, 'Kurang': 0, 'Kurang Sekali': 0,
    }
    allTes?.forEach(t => {
      if (t.kesimpulan_kategori) {
        kategoriDist[t.kesimpulan_kategori] = (kategoriDist[t.kesimpulan_kategori] || 0) + 1
      }
    })

    const bmiDist = { underweight: 0, normal: 0, overweight: 0, obese: 0, unknown: 0 }
    allTes?.forEach(t => {
      if (!t.bmi || t.bmi === 0) bmiDist.unknown++
      else if (t.bmi < 18.5)     bmiDist.underweight++
      else if (t.bmi < 25)       bmiDist.normal++
      else if (t.bmi < 30)       bmiDist.overweight++
      else                       bmiDist.obese++
    })

    const genderDist = {
      L: allTes?.filter(t => t.jenis_kelamin === 'L').length || 0,
      P: allTes?.filter(t => t.jenis_kelamin === 'P').length || 0,
    }

    const validScores = (allTes || [])
      .filter(t => t.status_tes === 'Hadir' && t.kesimpulan_persen != null)
      .map(t => t.kesimpulan_persen as number)
    const avgFitness = validScores.length
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : 0

    const sortedCabor = (perCabor || []).filter((c: any) => c.jumlah_atlet_tes >= 3)
    const topCabor = [...sortedCabor]
      .sort((a: any, b: any) => (b.rata_kesimpulan || 0) - (a.rata_kesimpulan || 0))
      .slice(0, 5)
    const bottomCabor = [...sortedCabor]
      .sort((a: any, b: any) => (a.rata_kesimpulan || 0) - (b.rata_kesimpulan || 0))
      .slice(0, 5)

    const komponenAgg: Record<string, { total: number; count: number }> = {}
    komponenLemah?.forEach((k: any) => {
      if (!komponenAgg[k.komponen]) komponenAgg[k.komponen] = { total: 0, count: 0 }
      komponenAgg[k.komponen].total += k.rata_capaian * k.jumlah_data
      komponenAgg[k.komponen].count += k.jumlah_data
    })
    const komponenOverall = Object.entries(komponenAgg)
      .map(([k, v]) => ({ komponen: k, rata_capaian: Math.round(v.total / v.count) }))
      .sort((a, b) => a.rata_capaian - b.rata_capaian)

    return NextResponse.json({
      summary: {
        total_atlet: total, hadir, dns,
        participation_rate: total ? Math.round((hadir / total) * 100) : 0,
        avg_fitness_persen: avgFitness, gender: genderDist,
      },
      kategori_distribution: kategoriDist,
      bmi_distribution: bmiDist,
      per_cabor: perCabor || [],
      top_cabor: topCabor, bottom_cabor: bottomCabor,
      komponen_overall: komponenOverall,
      komponen_per_cabor: komponenLemah || [],
      atlet_list: atletList || [],
      unmatched_count: unmatchedCount ?? 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
