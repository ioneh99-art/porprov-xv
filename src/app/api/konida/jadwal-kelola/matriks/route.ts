// src/app/api/konida/jadwal-kelola/matriks/route.ts
// Unggah berkas "Matriks Jadwal Harian" KONI → pratinjau perubahan; kirim
// ulang dengan simpan=1 untuk menyimpannya. Aturannya sama dengan
// scripts/impor-matriks-jadwal.ts (src/lib/impor-matriks.ts).

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { writeAudit, reqMeta } from '@/lib/audit'
import { KONTINGEN_JADWAL, ambilPengelolaJadwal } from '@/lib/jadwal-kelola'
import { rencanaMatriks, type BarisAda } from '@/lib/impor-matriks'
import { ambilSemua } from '@/lib/lapor-sesi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BATAS_BERKAS = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const p = await ambilPengelolaJadwal()
  if ('error' in p) return NextResponse.json({ error: p.error }, { status: p.status })

  const form = await req.formData().catch(() => null)
  const berkas = form?.get('berkas')
  if (!berkas || typeof berkas === 'string') return NextResponse.json({ error: 'Pilih berkas Excel Matriks Jadwal Harian.' }, { status: 400 })
  if (berkas.size > BATAS_BERKAS) return NextResponse.json({ error: 'Berkas terlalu besar (maksimal 5 MB).' }, { status: 400 })
  if (!/\.xlsx?$/i.test(berkas.name)) return NextResponse.json({ error: 'Berkas harus Excel (.xlsx).' }, { status: 400 })
  const simpan = form?.get('simpan') === '1'

  let baris: any[][]
  try {
    const wb = XLSX.read(Buffer.from(await berkas.arrayBuffer()), { type: 'buffer' })
    const ws = wb.Sheets['Matrix Jadwal Harian']
    if (!ws) return NextResponse.json({ error: 'Sheet "Matrix Jadwal Harian" tidak ada di berkas ini.' }, { status: 400 })
    // raw: sel tanggal keluar sebagai nomor seri Excel — lihat catatan di tanggalJadwal().
    baris = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: '' })
  } catch {
    return NextResponse.json({ error: 'Berkas tidak bisa dibaca sebagai Excel.' }, { status: 400 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: lama, error } = await db.from('jadwal_cabor').select('id,cabor_disiplin,mulai,selesai,venue,tuan_rumah,wilayah,akomodasi,catatan,sumber').order('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  let caborDb: string[] = []
  try {
    const atlet = await ambilSemua<{ cabor_nama_raw: string | null }>((d, s) => db.from('atlet').select('cabor_nama_raw').eq('kontingen_id', KONTINGEN_JADWAL).order('id').range(d, s))
    caborDb = Array.from(new Set(atlet.map(a => (a.cabor_nama_raw ?? '').trim()).filter(Boolean)))
  } catch { /* baris baru tetap ditambah, hanya tidak tertaut cabor */ }

  let rencana
  try {
    rencana = rencanaMatriks(baris, (lama ?? []) as BarisAda[], caborDb, berkas.name)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
  if (!simpan) return NextResponse.json({ ok: true, rencana, tersimpan: false })

  const kini = new Date().toISOString()
  const sebelum: Record<number, any> = {}
  for (const u of rencana.ubah) {
    const l = (lama ?? []).find((x: any) => x.id === u.id) as any
    sebelum[u.id] = Object.fromEntries(Object.keys(u.isi).map(k => [k, l?.[k] ?? null]))
    const { error: e } = await db.from('jadwal_cabor').update({ ...u.isi, updated_at: kini }).eq('id', u.id)
    if (e) return NextResponse.json({ error: `Gagal memperbarui ${u.nama}: ${e.message}` }, { status: 500 })
  }
  let ditambah: any[] = []
  if (rencana.tambah.length) {
    const { data: baru, error: e } = await db.from('jadwal_cabor').insert(rencana.tambah).select('id,cabor_disiplin')
    if (e) return NextResponse.json({ error: `Gagal menambah kegiatan baru: ${e.message}` }, { status: 500 })
    ditambah = baru ?? []
  }
  await writeAudit({
    action: 'JADWAL_IMPOR_MATRIKS', resource: 'jadwal_cabor', resource_id: berkas.name,
    actor_id: p.sesi.id ?? null, actor_email: p.sesi.username ?? null, actor_role: p.sesi.role ?? null,
    kontingen_id: KONTINGEN_JADWAL, severity: 'info', ...reqMeta(req),
    payload: { berkas: berkas.name, ubah: rencana.ubah.map(u => ({ id: u.id, nama: u.nama, sebelum: sebelum[u.id], sesudah: u.isi })), tambah: ditambah },
  })
  try { revalidatePath('/publik/kabbandung') } catch { /* cukup menunggu satu menit */ }
  return NextResponse.json({ ok: true, rencana, tersimpan: true })
}
