import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  emailAtletBaru,
  emailStatusAtlet,
  emailVerifikasiAdmin
} from '@/lib/email'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = JSON.parse(session)
  const body = await req.json()
  const { atlet_id, action, alasan } = body

  // action: 'approve_cabor' | 'reject_cabor' | 'approve_admin' | 'reject_admin' | 'posting'

  if (!atlet_id || !action) {
    return NextResponse.json({ error: 'atlet_id dan action wajib' }, { status: 400 })
  }

  try {
    // Ambil data atlet + kontingen + cabor + email KONIDA
    const { data: atlet, error: atletError } = await sb()
      .from('atlet')
      .select(`
        id, nama_lengkap, status_registrasi, kontingen_id, cabor_id,
        kontingen(nama),
        cabang_olahraga(nama)
      `)
      .eq('id', atlet_id)
      .single()

    if (atletError || !atlet) {
      return NextResponse.json({ error: 'Atlet tidak ditemukan' }, { status: 404 })
    }

    // Ambil email KONIDA kontingen ini
    const { data: konidaUser } = await sb()
      .from('users')
      .select('nama, email')
      .eq('role', 'konida')
      .eq('kontingen_id', atlet.kontingen_id)
      .single()

    // Ambil email operator cabor ini
    const { data: operatorUser } = await sb()
      .from('users')
      .select('nama, email')
      .eq('role', 'operator_cabor')
      .eq('cabor_id', atlet.cabor_id)
      .single()

    let newStatus = ''
    let logKeterangan = ''

    // Tentukan status baru
    switch (action) {
      case 'approve_cabor':
        newStatus = 'Menunggu Admin'
        logKeterangan = 'Diverifikasi oleh Operator Cabor'
        break
      case 'reject_cabor':
        newStatus = 'Ditolak Cabor'
        logKeterangan = alasan || 'Ditolak oleh Operator Cabor'
        break
      case 'approve_admin':
        newStatus = 'Verified'
        logKeterangan = 'Diverifikasi oleh Admin'
        break
      case 'reject_admin':
        newStatus = 'Ditolak Admin'
        logKeterangan = alasan || 'Ditolak oleh Admin'
        break
      case 'posting':
        newStatus = 'Posted'
        logKeterangan = 'Diposting oleh Admin'
        break
      default:
        return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
    }

    // Update status atlet
    const { error: updateError } = await sb()
      .from('atlet')
      .update({
        status_registrasi: newStatus,
        ...(action === 'posting' ? { is_posted: true } : {}),
      })
      .eq('id', atlet_id)

    if (updateError) throw new Error(updateError.message)

    // Catat log verifikasi
    await sb().from('log_verifikasi').insert({
      atlet_id,
      user_id: user.id,
      status_baru: newStatus,
      keterangan: logKeterangan,
    })

    // Kirim email notifikasi (tidak blocking — fire and forget)
    const namaAtlet = atlet.nama_lengkap
    const namaCabor = (atlet as any).cabang_olahraga?.nama ?? ''
    const namaKontingen = (atlet as any).kontingen?.nama ?? ''

    try {
      if (action === 'approve_cabor' && konidaUser?.email) {
        // Email ke KONIDA: atlet lolos verifikasi cabor
        await emailStatusAtlet({
          to: konidaUser.email,
          namaKonida: konidaUser.nama,
          namaAtlet,
          status: 'Menunggu Verifikasi Admin',
          namaOperator: operatorUser?.nama ?? 'Operator',
          namaCabor,
        })
      }

      if (action === 'reject_cabor' && konidaUser?.email) {
        // Email ke KONIDA: atlet ditolak cabor
        await emailStatusAtlet({
          to: konidaUser.email,
          namaKonida: konidaUser.nama,
          namaAtlet,
          status: 'Ditolak Cabor',
          alasan,
          namaOperator: operatorUser?.nama ?? 'Operator',
          namaCabor,
        })
      }

      if (action === 'approve_admin' && konidaUser?.email) {
        // Email ke KONIDA: atlet verified admin
        await emailVerifikasiAdmin({
          to: konidaUser.email,
          namaKonida: konidaUser.nama,
          namaAtlet,
          status: 'Verified',
        })
      }

      if (action === 'reject_admin' && konidaUser?.email) {
        // Email ke KONIDA: atlet ditolak admin
        await emailVerifikasiAdmin({
          to: konidaUser.email,
          namaKonida: konidaUser.nama,
          namaAtlet,
          status: 'Ditolak Admin',
          alasan,
        })
      }

      if (action === 'posting' && konidaUser?.email) {
        // Email ke KONIDA: atlet resmi posted
        await emailVerifikasiAdmin({
          to: konidaUser.email,
          namaKonida: konidaUser.nama,
          namaAtlet,
          status: 'Posted',
        })
      }
    } catch (emailError) {
      // Email gagal tidak blocking — log saja
      console.error('Email error:', emailError)
    }

    return NextResponse.json({
      ok: true,
      newStatus,
      message: `Atlet berhasil di-${action.replace('_', ' ')}`
    })

  } catch (e: any) {
    console.error('Verifikasi error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — ambil daftar atlet pending per role
export async function GET(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = JSON.parse(session)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  try {
    let query = sb()
      .from('atlet')
      .select(`
        id, nama_lengkap, gender, tgl_lahir, no_ktp,
        status_registrasi, status_kontingen, created_at,
        kontingen(nama), cabang_olahraga(nama)
      `)
      .order('created_at', { ascending: false })

    if (user.role === 'operator_cabor') {
      query = query
        .eq('cabor_id', user.cabor_id)
        .eq('status_registrasi', status || 'Menunggu Cabor')
    } else if (user.role === 'admin') {
      if (status) query = query.eq('status_registrasi', status)
      else query = query.eq('status_registrasi', 'Menunggu Admin')
    } else if (user.role === 'konida') {
      query = query.eq('kontingen_id', user.kontingen_id)
      if (status) query = query.eq('status_registrasi', status)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}