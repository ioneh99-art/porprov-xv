// src/app/api/operator/tes-fisik/route.ts
// Endpoint operator — agregat tes biomotorik untuk cabor operator

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const getSb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // support both naming conventions
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  { auth: { persistSession: false } }
)

function getSession() {
  try {
    const val = cookies().get('porprov_session')?.value
    return val ? JSON.parse(val) : null
  } catch { return null }
}

export async function GET() {
  try {
    const sess         = getSession()
    const caborId      = sess?.cabor_id  ? parseInt(String(sess.cabor_id))  : null
    const kontingenId  = sess?.kontingen_id ? parseInt(String(sess.kontingen_id)) : null
    const caborNama: string = sess?.cabor_nama || 'Pentathlon'
    const sb = getSb()

    // ── 1. Daftar atlet terdaftar (field yg benar: nama_lengkap, gender) ──
    let regAtlet: Array<{ id: number; nama_lengkap: string; gender: string }> = []
    if (caborId) {
      const { data } = await sb
        .from('atlet')
        .select('id, nama_lengkap, gender')
        .eq('cabor_id', caborId)
        .limit(500)
      regAtlet = (data ?? []) as any
    }

    // ── 2. Data tes fisik — 3 strategi sekaligus ──
    const keyword = caborNama.toLowerCase().includes('pentathlon') ? 'pentathlon'
                  : caborNama.toLowerCase().includes('dayung')     ? 'dayung'
                  : caborNama.split(/\s+/).find(w => w.length > 3) || 'pentathlon'

    const queries: Promise<{ data: any[] | null }>[] = [
      // A. By atlet_id (matched records)
      regAtlet.length > 0
        ? sb.from('atlet_tes_fisik')
            .select('id,atlet_id,nama_atlet,jenis_kelamin,berat_badan,tinggi_badan,bmi,kesimpulan_persen,kesimpulan_kategori,status_tes,tahap,tanggal_tes,cabor_nama')
            .in('atlet_id', regAtlet.map(a => a.id))
            .order('tahap', { ascending: false }) as any
        : Promise.resolve({ data: [] }),

      // B. By cabor_nama ILIKE (for PDF-imported unmatched records)
      sb.from('atlet_tes_fisik')
        .select('id,atlet_id,nama_atlet,jenis_kelamin,berat_badan,tinggi_badan,bmi,kesimpulan_persen,kesimpulan_kategori,status_tes,tahap,tanggal_tes,cabor_nama')
        .ilike('cabor_nama', `%${keyword}%`)
        .order('tahap', { ascending: false }) as any,

      // C. By kontingen_id + cabor_nama (if operator has kontingen)
      kontingenId
        ? sb.from('atlet_tes_fisik')
            .select('id,atlet_id,nama_atlet,jenis_kelamin,berat_badan,tinggi_badan,bmi,kesimpulan_persen,kesimpulan_kategori,status_tes,tahap,tanggal_tes,cabor_nama')
            .eq('kontingen_id', kontingenId)
            .ilike('cabor_nama', `%${keyword}%`)
            .order('tahap', { ascending: false }) as any
        : Promise.resolve({ data: [] }),
    ]

    const [resA, resB, resC] = await Promise.all(queries)

    // Merge dan deduplikasi by id
    const seen = new Set<number>()
    const allTes: any[] = []
    for (const row of [...(resA.data ?? []), ...(resB.data ?? []), ...(resC.data ?? [])]) {
      if (!seen.has(row.id)) { seen.add(row.id); allTes.push(row) }
    }

    // ── 3. Ambil latest tes per atlet (highest tahap) ──
    const latestMap = new Map<string, any>()
    for (const t of allTes) {
      const key = t.atlet_id
        ? `id:${t.atlet_id}`
        : `name:${(t.nama_atlet || '').toLowerCase().trim()}`
      const existing = latestMap.get(key)
      if (!existing || (t.tahap ?? 0) > (existing.tahap ?? 0)) {
        latestMap.set(key, t)
      }
    }
    const latestList = Array.from(latestMap.values())

    // ── 4. Komponen items ──
    const hadirIds = latestList.filter(t => t.status_tes === 'Hadir').map(t => t.id)
    let komps: any[] = []
    if (hadirIds.length > 0) {
      const { data } = await sb
        .from('atlet_tes_fisik_item')
        .select('tes_fisik_id,komponen,item_tes,hasil_nilai,hasil_satuan,norma_nilai,norma_satuan,capaian_persen,kategori')
        .in('tes_fisik_id', hadirIds)
      komps = data ?? []
    }
    const itemsByTes: Record<number, any[]> = {}
    for (const k of komps) {
      if (!itemsByTes[k.tes_fisik_id]) itemsByTes[k.tes_fisik_id] = []
      itemsByTes[k.tes_fisik_id].push(k)
    }

    // ── 5. Build enriched list ──
    const regMap = new Map<number, any>()
    regAtlet.forEach(a => regMap.set(a.id, a))

    const enrichedAtlet: any[] = latestList.map(t => ({
      atlet_id:            t.atlet_id ?? t.id,
      nama_atlet:          t.nama_atlet || regMap.get(t.atlet_id)?.nama_lengkap || '—',
      jenis_kelamin:       t.jenis_kelamin || regMap.get(t.atlet_id)?.gender || '—',
      status_tes:          t.status_tes ?? null,
      berat_badan:         t.berat_badan ?? null,
      tinggi_badan:        t.tinggi_badan ?? null,
      bmi:                 t.bmi ?? null,
      kesimpulan_persen:   t.kesimpulan_persen ?? null,
      kesimpulan_kategori: t.kesimpulan_kategori ?? null,
      tahap:               t.tahap ?? null,
      tanggal_tes:         t.tanggal_tes ?? null,
      tes_id:              t.id,
      items:               itemsByTes[t.id] ?? [],
    })).sort((a, b) => (b.kesimpulan_persen ?? -1) - (a.kesimpulan_persen ?? -1))

    // Tambah atlet terdaftar yang belum ada di tes data (DNS murni)
    const testedAtletIds = new Set(latestList.filter(t => t.atlet_id).map(t => t.atlet_id))
    for (const a of regAtlet) {
      if (!testedAtletIds.has(a.id)) {
        enrichedAtlet.push({
          atlet_id: a.id, nama_atlet: a.nama_lengkap, jenis_kelamin: a.gender,
          status_tes: null, berat_badan: null, tinggi_badan: null, bmi: null,
          kesimpulan_persen: null, kesimpulan_kategori: null,
          tahap: null, tanggal_tes: null, tes_id: null, items: [],
        })
      }
    }

    // ── 6. Aggregates ──
    const komponenAgg: Record<string, { total: number; count: number }> = {}
    for (const k of komps) {
      if (!k.komponen || k.capaian_persen == null) continue
      if (!komponenAgg[k.komponen]) komponenAgg[k.komponen] = { total: 0, count: 0 }
      komponenAgg[k.komponen].total += k.capaian_persen
      komponenAgg[k.komponen].count++
    }
    const komponenOverall = Object.entries(komponenAgg)
      .map(([k, v]) => ({ komponen: k, rata_capaian: Math.round(v.total / v.count) }))
      .sort((a, b) => a.rata_capaian - b.rata_capaian)

    const total_atlet = enrichedAtlet.length
    const hadir = latestList.filter(t => t.status_tes === 'Hadir').length
    const dns   = total_atlet - hadir

    const validScores = latestList
      .filter(t => t.status_tes === 'Hadir' && t.kesimpulan_persen != null)
      .map(t => t.kesimpulan_persen as number)
    const avg_fitness = validScores.length
      ? Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length)
      : 0

    const genderL = enrichedAtlet.filter(a => a.jenis_kelamin === 'L').length
    const genderP = enrichedAtlet.filter(a => a.jenis_kelamin === 'P').length

    const kategoriDist: Record<string, number> = {
      'Baik Sekali': 0, 'Baik': 0, 'Cukup': 0, 'Kurang': 0, 'Kurang Sekali': 0,
    }
    for (const t of latestList) {
      if (t.status_tes === 'Hadir' && t.kesimpulan_kategori) {
        kategoriDist[t.kesimpulan_kategori] = (kategoriDist[t.kesimpulan_kategori] || 0) + 1
      }
    }

    const bmiDist = { underweight: 0, normal: 0, overweight: 0, obese: 0, unknown: 0 }
    for (const t of latestList) {
      if (!t.bmi || t.bmi === 0) bmiDist.unknown++
      else if (t.bmi < 18.5)    bmiDist.underweight++
      else if (t.bmi < 25)      bmiDist.normal++
      else if (t.bmi < 30)      bmiDist.overweight++
      else                      bmiDist.obese++
    }

    return NextResponse.json({
      summary: {
        total_atlet, hadir, dns,
        participation_rate: total_atlet ? Math.round((hadir / total_atlet) * 100) : 0,
        avg_fitness_persen: avg_fitness,
        gender: { L: genderL, P: genderP },
      },
      kategori_distribution: kategoriDist,
      bmi_distribution: bmiDist,
      komponen_overall: komponenOverall,
      atlet_list: enrichedAtlet,
      cabor_nama: caborNama,
      // debug info — for troubleshooting
      _debug: {
        session_cabor_id: caborId,
        session_kontingen_id: kontingenId,
        session_cabor_nama: caborNama,
        keyword,
        reg_count: regAtlet.length,
        tes_raw_count: allTes.length,
        tes_latest_count: latestList.length,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
