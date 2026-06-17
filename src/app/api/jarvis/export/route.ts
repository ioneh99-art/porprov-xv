import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const ISSUE_LABELS: Record<string, string> = {
  nik_format:             'NIK Format Tidak Valid',
  nik_gender_mismatch:    'NIK vs Gender Tidak Cocok',
  nik_birthdate_mismatch: 'NIK vs Tanggal Lahir Tidak Cocok',
  duplicate_name:         'Nama Duplikat',
  duplicate_nik:          'NIK Duplikat',
  cabor_null:             'Cabor Belum Diisi (cabor_id NULL)',
  sync_mismatch:          'Data Tidak Sinkron (Verified tapi Cabor NULL)',
  required_field:         'Field Wajib Kosong',
}

function extractName(title: string) {
  return title.includes(':') ? title.split(':').slice(1).join(':').trim() : title
}

function fmtDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function autoWidth(ws: XLSX.WorkSheet) {
  const ref = ws['!ref']
  if (!ref) return
  const range = XLSX.utils.decode_range(ref)
  const cols: number[] = Array(range.e.c + 1).fill(10)
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })]
      if (cell && cell.v) cols[C] = Math.max(cols[C], String(cell.v).length + 2)
    }
  }
  ws['!cols'] = cols.map(w => ({ wch: Math.min(w, 60) }))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type        = searchParams.get('type') || 'all_issues'
  const kontingenId = parseInt(searchParams.get('kontingen_id') || '4')
  const dateStr     = new Date().toISOString().split('T')[0]

  const wb = XLSX.utils.book_new()
  let filename = 'jarvis-report'

  // ── Atlet Ditolak Admin ───────────────────────────────────────────────────
  if (type === 'ditolak') {
    const { data } = await sb
      .from('atlet')
      .select('nama_lengkap,no_ktp,tgl_lahir,gender,cabor_nama_raw,catatan_verifikasi,created_at')
      .eq('kontingen_id', kontingenId)
      .eq('status_registrasi', 'Ditolak Admin')
      .order('cabor_nama_raw')

    const rows = (data || []).map((a: any, i: number) => ({
      'No':                 i + 1,
      'Nama Lengkap':       a.nama_lengkap,
      'NIK':                a.no_ktp || '',
      'Cabor':              a.cabor_nama_raw || '',
      'Tgl Lahir':          a.tgl_lahir || '',
      'Gender':             a.gender || '',
      'Catatan Verifikasi': a.catatan_verifikasi || 'Tidak ada catatan',
      'Tanggal Daftar':     fmtDate(a.created_at),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Atlet Ditolak Admin')
    filename = `laporan-atlet-ditolak-kabbandung-${dateStr}`

  // ── Issues NIK ────────────────────────────────────────────────────────────
  } else if (type === 'nik_issues') {
    const { data } = await sb
      .from('jarvis_issues')
      .select('issue_type,severity,title,description,suggested_action,detected_at')
      .eq('kontingen_id', kontingenId)
      .eq('status', 'open')
      .in('issue_type', ['nik_format', 'nik_gender_mismatch', 'nik_birthdate_mismatch'])
      .order('issue_type')
      .order('detected_at', { ascending: false })

    const rows = (data || []).map((i: any, idx: number) => ({
      'No':              idx + 1,
      'Tipe Masalah':    ISSUE_LABELS[i.issue_type] || i.issue_type,
      'Severity':        i.severity.toUpperCase(),
      'Nama Atlet':      extractName(i.title),
      'Deskripsi':       i.description,
      'Saran Perbaikan': i.suggested_action,
      'Tgl Deteksi':     fmtDate(i.detected_at),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Masalah NIK')
    filename = `laporan-nik-issues-kabbandung-${dateStr}`

  // ── Cabor NULL ────────────────────────────────────────────────────────────
  } else if (type === 'cabor_null') {
    const { data } = await sb
      .from('jarvis_issues')
      .select('title,description,suggested_action,detected_at')
      .eq('kontingen_id', kontingenId)
      .eq('status', 'open')
      .eq('issue_type', 'cabor_null')
      .order('detected_at', { ascending: false })

    const rows = (data || []).map((i: any, idx: number) => ({
      'No':              idx + 1,
      'Nama Atlet':      extractName(i.title),
      'Deskripsi':       i.description,
      'Saran Perbaikan': i.suggested_action,
      'Tgl Deteksi':     fmtDate(i.detected_at),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Cabor Null')
    filename = `laporan-cabor-null-kabbandung-${dateStr}`

  // ── Semua Issues ──────────────────────────────────────────────────────────
  } else if (type === 'all_issues') {
    const { data } = await sb
      .from('jarvis_issues')
      .select('issue_type,severity,title,description,suggested_action,detected_at')
      .eq('kontingen_id', kontingenId)
      .eq('status', 'open')
      .order('severity')
      .order('issue_type')

    const rows = (data || []).map((i: any, idx: number) => ({
      'No':                  idx + 1,
      'Tipe Masalah':        ISSUE_LABELS[i.issue_type] || i.issue_type,
      'Severity':            i.severity.toUpperCase(),
      'Nama / Keterangan':   extractName(i.title),
      'Deskripsi':           i.description,
      'Saran Perbaikan':     i.suggested_action,
      'Tgl Deteksi':         fmtDate(i.detected_at),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Semua Open Issues')
    filename = `laporan-semua-issues-kabbandung-${dateStr}`

  // ── Summary QA ────────────────────────────────────────────────────────────
  } else if (type === 'summary') {
    const { data } = await sb
      .from('jarvis_issues')
      .select('issue_type,severity')
      .eq('kontingen_id', kontingenId)
      .eq('status', 'open')

    const groups: Record<string, { count: number; severity: string }> = {}
    for (const row of data || []) {
      if (!groups[row.issue_type]) groups[row.issue_type] = { count: 0, severity: row.severity }
      groups[row.issue_type].count++
    }

    const rows = Object.entries(groups).map(([t, info], idx) => ({
      'No':             idx + 1,
      'Tipe Masalah':   ISSUE_LABELS[t] || t,
      'Severity':       info.severity.toUpperCase(),
      'Jumlah Kasus':   info.count,
    }))

    const total = rows.reduce((s, r) => s + r['Jumlah Kasus'], 0)
    rows.push({ 'No': rows.length + 1, 'Tipe Masalah': 'TOTAL', 'Severity': '—', 'Jumlah Kasus': total })

    const ws = XLSX.utils.json_to_sheet(rows)
    autoWidth(ws)
    XLSX.utils.book_append_sheet(wb, ws, 'Summary QA')
    filename = `laporan-summary-qa-kabbandung-${dateStr}`

  } else {
    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf  = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as any
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    },
  })
}
