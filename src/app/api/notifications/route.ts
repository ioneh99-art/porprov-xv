import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Selalu ambil hitungan live dari DB — jangan cache (cegah badge basi spt "53 atlet ditolak").
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Satu klien per instans (dulu dibuat ulang 3–5× per permintaan).
let klien: ReturnType<typeof createClient> | null = null
const sb = () => (klien ??= createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
))

// Hasil yang sama dipakai ulang 60 dtk per instans: banyak tab/halaman KONIDA menanyakan angka
// yang sama, dan badge ini tidak perlu detik-an. (Tetap segar: paling basi 1 menit.)
const SIMPAN_MS = 60_000
const simpanan = new Map<string, { kapan: number; isi: Record<string, number> }>()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kunci = searchParams.toString()
  const ada = simpanan.get(kunci)
  if (ada && Date.now() - ada.kapan < SIMPAN_MS) return NextResponse.json(ada.isi)
  const role = searchParams.get('role')
  const kontingen_id = searchParams.get('kontingen_id')
  const cabor_id = searchParams.get('cabor_id')

  const counts: Record<string, number> = {}

  try {
    if (role === 'admin') {
      // Atlet menunggu verifikasi admin
      const { count: atletPending } = await sb()
        .from('atlet')
        .select('*', { count: 'exact', head: true })
        .eq('status_registrasi', 'Menunggu Admin')

      // Kejuaraan menunggu verifikasi admin
      const { count: kejuaraanPending } = await sb()
        .from('riwayat_kejuaraan')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Menunggu Admin')

      counts.atlet = atletPending ?? 0
      counts.kejuaraan = kejuaraanPending ?? 0
      counts.total = (atletPending ?? 0) + (kejuaraanPending ?? 0)
    }

    if (role === 'konida' && kontingen_id) {
      // Ambil atlet dari kontingen ini
      const { data: atletList } = await sb()
        .from('atlet')
        .select('id')
        .eq('kontingen_id', parseInt(kontingen_id))

      const atletIds = (atletList ?? []).map((a: any) => a.id)

      // Kejuaraan menunggu review KONIDA
      const { count: kejuaraanPending } = await sb()
        .from('riwayat_kejuaraan')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Menunggu KONIDA')
        .in('atlet_id', atletIds.length > 0 ? atletIds : [0])

      // Atlet yang ditolak (perlu direvisi)
      const { count: atletDitolak } = await sb()
        .from('atlet')
        .select('*', { count: 'exact', head: true })
        .eq('kontingen_id', parseInt(kontingen_id))
        .or('status_registrasi.eq.Ditolak Cabor,status_registrasi.eq.Ditolak Admin')

      counts.kejuaraan = kejuaraanPending ?? 0
      counts.ditolak = atletDitolak ?? 0
      counts.total = (kejuaraanPending ?? 0) + (atletDitolak ?? 0)
    }

    if (role === 'operator_cabor' && cabor_id) {
      // Ambil atlet dari cabor ini
      const { data: atletList } = await sb()
        .from('atlet')
        .select('id')
        .eq('cabor_id', parseInt(cabor_id))

      const atletIds = (atletList ?? []).map((a: any) => a.id)

      // Atlet menunggu verifikasi operator
      const { count: atletPending } = await sb()
        .from('atlet')
        .select('*', { count: 'exact', head: true })
        .eq('cabor_id', parseInt(cabor_id))
        .eq('status_registrasi', 'Menunggu Cabor')

      // Kejuaraan menunggu validasi cabor
      const { count: kejuaraanPending } = await sb()
        .from('riwayat_kejuaraan')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Menunggu Cabor')
        .in('atlet_id', atletIds.length > 0 ? atletIds : [0])

      // Kualifikasi menunggu konfirmasi
      const { data: nomorList } = await sb()
        .from('nomor_pertandingan')
        .select('id')
        .eq('cabor_id', parseInt(cabor_id))
        .eq('is_active', true)

      const nomorIds = (nomorList ?? []).map((n: any) => n.id)
      const { count: kualifikasiPending } = await sb()
        .from('kualifikasi_atlet')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Terdaftar')
        .in('nomor_id', nomorIds.length > 0 ? nomorIds : [0])

      counts.atlet = atletPending ?? 0
      counts.kejuaraan = kejuaraanPending ?? 0
      counts.kualifikasi = kualifikasiPending ?? 0
      counts.total = (atletPending ?? 0) + (kejuaraanPending ?? 0) + (kualifikasiPending ?? 0)
    }

    if (simpanan.size > 200) simpanan.clear()
    simpanan.set(kunci, { kapan: Date.now(), isi: counts })
    return NextResponse.json(counts)
  } catch (e: any) {
    return NextResponse.json({ total: 0 })
  }
}