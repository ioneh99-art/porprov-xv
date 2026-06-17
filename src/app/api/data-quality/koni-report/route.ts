import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

function autoWidth(ws: XLSX.WorkSheet) {
  const ref = ws['!ref']
  if (!ref) return
  const range = XLSX.utils.decode_range(ref)
  const cols: number[] = Array(range.e.c + 1).fill(10)
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })]
      if (cell?.v) cols[C] = Math.max(cols[C], String(cell.v).length + 2)
    }
  }
  ws['!cols'] = cols.map(w => ({ wch: Math.min(w, 60) }))
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const kontingenId = parseInt(searchParams.get('kontingen_id') || '0')

    // Ambil atlet locked (NIK invalid — butuh manual fix KONI)
    const { data: locked } = await sb
      .from('atlet')
      .select('id,nama_lengkap,no_ktp,gender,tgl_lahir,cabor_nama_raw,locked_reason,locked_at')
      .eq('kontingen_id', kontingenId)
      .eq('is_locked', true)
      .order('nama_lengkap')

    // Ambil atlet ghost (investigation_required)
    const { data: ghost } = await sb
      .from('atlet')
      .select('id,nama_lengkap,no_ktp,gender,tgl_lahir,cabor_nama_raw,data_quality_notes')
      .eq('kontingen_id', kontingenId)
      .eq('data_quality_status', 'investigation_required')
      .order('nama_lengkap')

    // Summary dari import log
    const { data: lastImport } = await sb
      .from('rekap_import_log')
      .select('*')
      .order('imported_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Audit fixes dari 7 hari terakhir
    const { data: auditFixes } = await sb
      .from('atlet_data_quality_audit')
      .select('action_type')
      .gte('performed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const fixCounts = {
      gender_fix:    auditFixes?.filter(f => f.action_type === 'gender_fix').length    || 0,
      tgl_lahir_fix: auditFixes?.filter(f => f.action_type === 'tgl_lahir_fix').length || 0,
      cabor_sync:    auditFixes?.filter(f => f.action_type === 'cabor_sync').length    || 0,
    }

    const wb       = XLSX.utils.book_new()
    const dateStr  = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    const dateFile = new Date().toISOString().split('T')[0]

    // ── Sheet 1: Summary ─────────────────────────────────────────────────────
    const summaryWs = XLSX.utils.aoa_to_sheet([
      ['LAPORAN DATA QUALITY ATLET KAB. BANDUNG — PORPROV XV'],
      [`Tanggal: ${dateStr}`],
      [`Sumber rekap: 0rekap.xlsx (1,097 atlet KONI Bandung)`],
      [],
      ['AUTO-FIXES APPLIED BY SYSTEM:'],
      ['Tipe Fix', 'Jumlah Atlet'],
      ['Koreksi Gender (dari NIK)',            fixCounts.gender_fix],
      ['Koreksi Tanggal Lahir (dari NIK)',      fixCounts.tgl_lahir_fix],
      ['Sinkronisasi Cabang Olahraga',          fixCounts.cabor_sync],
      ['TOTAL AUTO-FIX', fixCounts.gender_fix + fixCounts.tgl_lahir_fix + fixCounts.cabor_sync],
      [],
      ['MEMERLUKAN TINDAK LANJUT KONI:'],
      ['Kategori', 'Jumlah'],
      ['Atlet NIK Tidak Valid (perlu verifikasi KTP)', locked?.length || 0],
      ['Atlet Tidak Ada di Rekap KONI (perlu investigasi)', ghost?.length || 0],
      [],
      lastImport
        ? ['Last sync', new Date(lastImport.imported_at).toLocaleString('id-ID')]
        : ['Belum pernah sync'],
    ])
    autoWidth(summaryWs)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // ── Sheet 2: NIK Invalid (untuk KONI fix) ────────────────────────────────
    if (locked && locked.length > 0) {
      const nikWs = XLSX.utils.json_to_sheet(locked.map((a, i) => ({
        'No':             i + 1,
        'Nama Atlet':     a.nama_lengkap,
        'NIK Tercatat':   a.no_ktp || '',
        'Gender':         a.gender || '',
        'Tgl Lahir':      a.tgl_lahir || '',
        'Cabor':          a.cabor_nama_raw || '',
        'Alasan Locked':  a.locked_reason || '',
        'Action Required': 'Verifikasi NIK dengan KTP/Akta Kelahiran, laporkan ke admin sistem',
      })))
      autoWidth(nikWs)
      XLSX.utils.book_append_sheet(wb, nikWs, 'NIK Invalid (Butuh KONI)')
    }

    // ── Sheet 3: Ghost Data ───────────────────────────────────────────────────
    if (ghost && ghost.length > 0) {
      const ghostWs = XLSX.utils.json_to_sheet(ghost.map((a, i) => ({
        'No':           i + 1,
        'Nama Atlet':   a.nama_lengkap,
        'NIK':          a.no_ktp || '',
        'Gender':       a.gender || '',
        'Tgl Lahir':    a.tgl_lahir || '',
        'Cabor':        a.cabor_nama_raw || '',
        'Keterangan':   'NIK tidak ditemukan di rekap KONI Bandung',
        'Action Required': 'Verifikasi apakah atlet ini legitimate — koordinasi dengan KONI',
      })))
      autoWidth(ghostWs)
      XLSX.utils.book_append_sheet(wb, ghostWs, 'Ghost Data (Investigasi)')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buf  = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as any
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-koni-bandung-${dateFile}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('KONI report error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
