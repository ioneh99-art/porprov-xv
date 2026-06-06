// src/app/api/konida/tes-fisik/atlet/[id]/route.ts
// Endpoint KONIDA admin — lihat profil tes fisik atlet tertentu by ID
// Pattern: service role key (admin access), TIDAK pakai JWT atlet

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const FOKUS_MAP: Record<string, string> = {
  Flexibility:              'Stretching dinamis & PNF, yoga, foam rolling',
  Balance:                  'Stork stand, single-leg drills, balance board',
  'Speed Reaction':         'Reaction ball, audio-visual cue drills',
  Speed:                    'Sprint interval 20-40m, plyometric, sprint mechanics',
  Agility:                  'Cone drills, ladder drills, T-test, shuttle run',
  Power:                    'Plyometric, Olympic lift derivatives, jump squat',
  Strength:                 'Progressive overload, compound lifts, 1RM cycles',
  'Local Muscle Endurance': 'High-rep circuit, EMOM, isometric holds',
  'Core Stability':         'Dead bug, bird dog, plank progression, anti-rotation',
  'Aerobic Capacity':       'Zone-2 base, HIIT 4x4, fartlek, tempo run',
}

function generateInsights(sessions: any[]) {
  if (!sessions.length) return null
  const latest = sessions[0]
  if (latest.status_tes !== 'Hadir' || !latest.items?.length) {
    return { status: 'no_test_data', message: 'Belum ada data tes fisik.' }
  }

  // Sort items by capaian — weakest first
  const sorted = [...latest.items].sort((a: any, b: any) => a.capaian_persen - b.capaian_persen)

  // Filter weakest: <100% only (jangan tampilin "perlu latihan" untuk yg udah 100%)
  const weakest = sorted.filter((i: any) => i.capaian_persen < 100).slice(0, 3)
  const strongest = [...sorted].reverse().slice(0, 3)

  let progress = null
  if (sessions.length > 1) {
    const prev = sessions[1]
    const delta = (latest.kesimpulan_persen || 0) - (prev.kesimpulan_persen || 0)
    progress = {
      delta,
      direction: delta > 0 ? 'naik' : delta < 0 ? 'turun' : 'stabil',
      from_persen: prev.kesimpulan_persen,
      to_persen: latest.kesimpulan_persen,
    }
  }

  let bmi_status = null
  if (latest.bmi) {
    if (latest.bmi < 18.5)    bmi_status = { kategori: 'Underweight', color: 'yellow' }
    else if (latest.bmi < 25) bmi_status = { kategori: 'Normal',      color: 'green'  }
    else if (latest.bmi < 30) bmi_status = { kategori: 'Overweight',  color: 'orange' }
    else                      bmi_status = { kategori: 'Obese',       color: 'red'    }
  }

  const rekomendasi = weakest.map((w: any) => ({
    komponen: w.komponen,
    item: w.item_tes,
    capaian: w.capaian_persen,
    fokus: FOKUS_MAP[w.komponen] || 'Konsultasi dengan pelatih untuk program spesifik',
  }))

  return {
    status: 'ok',
    overall_persen: latest.kesimpulan_persen,
    overall_kategori: latest.kesimpulan_kategori,
    bmi_status,
    weakest_components: weakest,
    strongest_components: strongest,
    progress,
    rekomendasi,
    all_excellent: weakest.length === 0,  // flag: kalau semua 100%
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const atletId = parseInt(id)
  if (!atletId) {
    return NextResponse.json({ error: 'Invalid atlet id' }, { status: 400 })
  }

  // 1. Profil atlet
  const { data: atlet, error: atletErr } = await sb
    .from('atlet')
    .select(`
      id, nama_lengkap, no_ktp, gender, tgl_lahir,
      cabor_nama_raw, kontingen_id, nama_asal_daerah,
      status_registrasi, portal_aktif
    `)
    .eq('id', atletId)
    .maybeSingle()

  if (atletErr || !atlet) {
    return NextResponse.json({ error: 'Atlet tidak ditemukan' }, { status: 404 })
  }

  // 2. Semua sesi tes fisik atlet ini (urut newest first)
  const { data: sessions, error: sErr } = await sb
    .from('atlet_tes_fisik')
    .select(`
      id, tanggal_tes, tahap, berat_badan, tinggi_badan, bmi,
      kesimpulan_persen, kesimpulan_kategori, status_tes,
      lokasi_tes, lembaga_penguji, sumber_data, penanggung_jawab,
      cabor_nama, matching_method, matching_score,
      items:atlet_tes_fisik_item(
        no_urut, komponen, item_tes,
        hasil_nilai, hasil_satuan,
        norma_nilai, norma_satuan,
        capaian_persen, kategori
      )
    `)
    .eq('atlet_id', atletId)
    .order('tanggal_tes', { ascending: false })

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 })
  }

  const insights = generateInsights(sessions || [])

  return NextResponse.json({
    atlet,
    sessions: sessions || [],
    insights,
    has_data: (sessions || []).length > 0,
  })
}
