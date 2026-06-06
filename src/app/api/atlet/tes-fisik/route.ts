// src/app/api/atlet/tes-fisik/route.ts
// Endpoint untuk athlete portal — atlet lihat data tes fisik miliknya
// Pattern: jose (jwtVerify), payload pakai `nik`, sesuai /api/atlet/me

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const JWT_SECRET = new TextEncoder().encode(
  process.env.ATLET_JWT_SECRET || 'porprov-atlet-secret-2026'
)

const FOKUS_MAP: Record<string, string> = {
  Flexibility:             'Stretching dinamis & PNF, yoga, foam rolling',
  Balance:                 'Stork stand, single-leg drills, balance board',
  'Speed Reaction':        'Reaction ball, audio-visual cue drills',
  Speed:                   'Sprint interval 20-40m, plyometric, sprint mechanics',
  Agility:                 'Cone drills, ladder drills, T-test, shuttle run',
  Power:                   'Plyometric, Olympic lift derivatives, jump squat',
  Strength:                'Progressive overload, compound lifts, 1RM cycles',
  'Local Muscle Endurance':'High-rep circuit, EMOM, isometric holds',
  'Core Stability':        'Dead bug, bird dog, plank progression, anti-rotation',
  'Aerobic Capacity':      'Zone-2 base, HIIT 4x4, fartlek, tempo run',
}

function generateInsights(sessions: any[]) {
  if (!sessions.length) return null
  const latest = sessions[0]
  if (latest.status_tes !== 'Hadir' || !latest.items?.length) {
    return {
      status: 'no_test_data',
      message: 'Belum ada data tes fisik. Hubungi pelatih untuk jadwal tes.',
    }
  }

  const sorted = [...latest.items].sort((a: any, b: any) => a.capaian_persen - b.capaian_persen)
  const weakest = sorted.slice(0, 3)
  const strongest = [...sorted].reverse().slice(0, 3)

  let progress = null
  if (sessions.length > 1) {
    const prev = sessions[1]
    const delta = (latest.kesimpulan_persen || 0) - (prev.kesimpulan_persen || 0)
    progress = {
      delta, direction: delta > 0 ? 'naik' : delta < 0 ? 'turun' : 'stabil',
      from_persen: prev.kesimpulan_persen, to_persen: latest.kesimpulan_persen,
    }
  }

  let bmi_status = null
  if (latest.bmi) {
    if (latest.bmi < 18.5)      bmi_status = { kategori: 'Underweight', color: 'yellow' }
    else if (latest.bmi < 25)   bmi_status = { kategori: 'Normal', color: 'green' }
    else if (latest.bmi < 30)   bmi_status = { kategori: 'Overweight', color: 'orange' }
    else                        bmi_status = { kategori: 'Obese', color: 'red' }
  }

  const rekomendasi = weakest.map((w: any) => ({
    komponen: w.komponen, item: w.item_tes, capaian: w.capaian_persen,
    fokus: FOKUS_MAP[w.komponen] || 'Konsultasi pelatih untuk program spesifik',
  }))

  return {
    status: 'ok',
    overall_persen: latest.kesimpulan_persen,
    overall_kategori: latest.kesimpulan_kategori,
    bmi_status, weakest_components: weakest,
    strongest_components: strongest, progress, rekomendasi,
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('atlet_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const nik = payload.nik as string
    if (!nik) return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })

    // Resolve atlet_id dari NIK
    const { data: atlet, error: atletErr } = await sb
      .from('atlet')
      .select('id, nama_lengkap, no_ktp, cabor_nama_raw, gender, tgl_lahir')
      .eq('no_ktp', nik)
      .maybeSingle()

    if (atletErr) return NextResponse.json({ error: atletErr.message }, { status: 500 })
    if (!atlet)   return NextResponse.json({ error: 'Atlet tidak ditemukan' }, { status: 404 })

    // Ambil semua sesi tes atlet (urut newest first)
    const { data: sessions, error } = await sb
      .from('atlet_tes_fisik')
      .select(`
        id, tanggal_tes, tahap, berat_badan, tinggi_badan, bmi,
        kesimpulan_persen, kesimpulan_kategori, status_tes,
        lokasi_tes, lembaga_penguji, sumber_data, penanggung_jawab,
        items:atlet_tes_fisik_item(
          no_urut, komponen, item_tes,
          hasil_nilai, hasil_satuan, norma_nilai, norma_satuan,
          capaian_persen, kategori
        )
      `)
      .eq('atlet_id', atlet.id)
      .order('tanggal_tes', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const insights = generateInsights(sessions || [])
    return NextResponse.json({
      atlet: { nama_lengkap: atlet.nama_lengkap, cabor: atlet.cabor_nama_raw, gender: atlet.gender },
      sessions: sessions || [],
      insights,
      has_data: (sessions || []).length > 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Token tidak valid', detail: e.message }, { status: 401 })
  }
}
