import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
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

    return NextResponse.json(counts)
  } catch (e: any) {
    return NextResponse.json({ total: 0 })
  }
}