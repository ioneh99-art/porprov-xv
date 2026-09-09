// src/app/api/konida/pekerjaan-data/route.ts
// Daftar pekerjaan data yang masih menunggu tangan manusia.
//
// Kenapa perlu rute sendiri: dasbor selama ini memajang panel Data Quality
// Engine berisi angka yang DITULIS MATI di berkas halaman — dan semuanya
// bercerita tentang apa yang SUDAH diperbaiki mesin. Orang yang melihatnya
// menyimpulkan tidak ada pekerjaan tersisa, padahal ada.
//
// Rute ini menghitung yang sebaliknya: apa yang BELUM beres, sekarang juga,
// langsung dari basis data. Tiap butir menyebut jumlah, contoh namanya, dan
// ke halaman mana harus pergi untuk membereskannya.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

interface Atl {
  id: number; nama_lengkap: string | null; no_ktp: string | null
  foto_url: string | null; no_registrasi_koni: string | null
  cabor_nama_raw: string | null; cabor_id: number | null
  gender: string | null; tgl_lahir: string | null
  is_locked: boolean | null; prioritas_emas: string | null
  status_registrasi: string | null
}

export interface Pekerjaan {
  kunci: string
  judul: string
  jumlah: number
  dari: number | null       // pembagi, bila butirnya berupa kelengkapan
  keterangan: string
  akibat: string            // apa yang rusak kalau dibiarkan
  tingkat: 'kritis' | 'penting' | 'biasa'
  tautan: string
  contoh: string[]          // beberapa nama, supaya terasa nyata
}

export async function GET() {
  const s = await getServerSession()
  if (!s) return NextResponse.json({ error: 'Silakan login dulu.' }, { status: 401 })

  const kontingen = s.kontingen_id ?? 4
  const db = sb()

  // PostgREST memotong di 1000 baris — halaman lanjutan wajib, bukan pilihan.
  let atlet: Atl[] = []
  for (let p = 0; ; p++) {
    const { data } = await db.from('atlet')
      .select('id,nama_lengkap,no_ktp,foto_url,no_registrasi_koni,cabor_nama_raw,cabor_id,gender,tgl_lahir,is_locked,prioritas_emas,status_registrasi')
      .eq('kontingen_id', kontingen)
      .range(p * 1000, (p + 1) * 1000 - 1)
    if (!data?.length) break
    atlet = atlet.concat(data as Atl[])
    if (data.length < 1000) break
  }
  const aktif = atlet.filter(a => a.status_registrasi !== 'Ditolak Admin')
  const total = aktif.length

  const [issuesRes, rekonRes, auditRes] = await Promise.all([
    db.from('jarvis_issues').select('id,issue_type,severity,title,description')
      .eq('kontingen_id', kontingen).eq('status', 'open'),
    db.from('rekonsiliasi_peserta').select('id,nama_peserta')
      .eq('kontingen_id', kontingen).eq('status_peserta', 'tidak_ketemu'),
    // Jejak koreksi otomatis. Dulu angkanya ditulis mati di halaman dasbor,
    // jadi membeku sejak hari diketik; sekarang dihitung tiap kali dibuka.
    db.from('atlet_data_quality_audit').select('action_type').range(0, 4999),
  ])
  const issues = issuesRes.data ?? []
  const belumTertaut = rekonRes.data ?? []
  const audit = auditRes.data ?? []

  const nama = (xs: Atl[]) => xs.slice(0, 3).map(a => a.nama_lengkap ?? `Atlet ${a.id}`)

  // ── Nama kembar: dua baris untuk orang yang sama ──
  const perNama = new Map<string, Atl[]>()
  aktif.forEach(a => {
    const k = (a.nama_lengkap ?? '').trim().toUpperCase()
    if (!k) return
    perNama.set(k, [...(perNama.get(k) ?? []), a])
  })
  const kembar = Array.from(perNama.entries()).filter(([, v]) => v.length > 1)

  const tanpaFoto     = aktif.filter(a => !a.foto_url)
  const prioTanpaFoto = tanpaFoto.filter(a => a.prioritas_emas)
  const tanpaNoReg    = aktif.filter(a => !a.no_registrasi_koni)
  const nikDikunci    = aktif.filter(a => a.is_locked)
  const tanpaCabor    = aktif.filter(a => !a.cabor_nama_raw && !a.cabor_id)
  const wajibKosong   = aktif.filter(a => !a.nama_lengkap || !a.gender || !a.tgl_lahir)

  const daftar: Pekerjaan[] = []
  const tambah = (p: Pekerjaan) => { if (p.jumlah > 0) daftar.push(p) }

  tambah({
    kunci: 'prioritas_tanpa_foto', judul: 'Atlet ELITE belum berpasfoto',
    jumlah: prioTanpaFoto.length, dari: aktif.filter(a => a.prioritas_emas).length,
    keterangan: 'Atlet yang ditandai pengurus hampir pasti meraih emas, tapi pasfotonya belum ada.',
    akibat: 'Kartu identitasnya tidak bisa dicetak. Dahulukan mereka.',
    tingkat: 'kritis', tautan: '/konida/atlet/kabbandung/foto', contoh: nama(prioTanpaFoto),
  })
  tambah({
    kunci: 'nama_kembar', judul: 'Atlet terdaftar lebih dari sekali',
    jumlah: kembar.length, dari: null,
    keterangan: 'Nama yang sama muncul pada dua baris atau lebih — biasanya salah ketik NIK saat pendaftaran ulang.',
    akibat: 'Jumlah atlet terhitung lebih banyak dari kenyataan, dan satu orang bisa dapat dua kartu.',
    tingkat: 'kritis', tautan: '/konida/atlet/kabbandung',
    contoh: kembar.slice(0, 3).map(([k, v]) => `${k} (${v.map(a => `#${a.id}`).join(' & ')})`),
  })
  tambah({
    kunci: 'nik_dikunci', judul: 'NIK ditolak sistem, menunggu KTP asli',
    jumlah: nikDikunci.length, dari: null,
    keterangan: 'Format NIK tidak masuk akal — mesin mengunci barisnya dan tidak berani menebak.',
    akibat: 'Atlet tidak bisa diverifikasi sampai KTP atau akta aslinya diperiksa orang.',
    tingkat: 'kritis', tautan: '/konida/atlet/kabbandung', contoh: nama(nikDikunci),
  })
  tambah({
    kunci: 'wajib_kosong', judul: 'Kolom wajib masih kosong',
    jumlah: wajibKosong.length, dari: null,
    keterangan: 'Nama, gender, atau tanggal lahir belum terisi.',
    akibat: 'Baris seperti ini gagal dipakai hampir di semua laporan.',
    tingkat: 'kritis', tautan: '/konida/atlet/kabbandung', contoh: nama(wajibKosong),
  })
  tambah({
    kunci: 'belum_tertaut', judul: 'Peserta KONI belum ketemu padanannya',
    jumlah: belumTertaut.length, dari: null,
    keterangan: 'Nama ada di daftar resmi KONI, tapi belum ketemu atletnya di sistem.',
    akibat: 'Berisiko tidak dapat kartu identitas dan tidak terhitung di laporan.',
    tingkat: 'kritis', tautan: '/konida/rekonsiliasi',
    contoh: belumTertaut.slice(0, 3).map((r: any) => r.nama_peserta ?? '—'),
  })
  tambah({
    kunci: 'tanpa_no_reg', judul: 'Belum bernomor registrasi KONI',
    jumlah: tanpaNoReg.length, dari: total,
    keterangan: 'Nomor registrasi resmi KONI belum diisikan.',
    akibat: 'Menyulitkan pencocokan dengan dokumen resmi KONI.',
    tingkat: 'penting', tautan: '/konida/atlet/kabbandung', contoh: nama(tanpaNoReg),
  })
  tambah({
    kunci: 'tanpa_foto', judul: 'Belum berpasfoto',
    jumlah: tanpaFoto.length, dari: total,
    keterangan: 'Pasfoto belum masuk ke sistem.',
    akibat: 'Kartu identitas atlet tidak dapat dicetak.',
    tingkat: tanpaFoto.length > 100 ? 'penting' : 'biasa',
    tautan: '/konida/atlet/kabbandung/foto', contoh: nama(tanpaFoto),
  })
  tambah({
    kunci: 'tanpa_cabor', judul: 'Belum punya cabang olahraga',
    jumlah: tanpaCabor.length, dari: null,
    keterangan: 'Atlet tidak terhubung ke cabor mana pun.',
    akibat: 'Tidak muncul di daftar cabor mana pun.',
    tingkat: 'penting', tautan: '/konida/atlet/kabbandung', contoh: nama(tanpaCabor),
  })

  const urut = { kritis: 0, penting: 1, biasa: 2 }
  daftar.sort((a, b) => urut[a.tingkat] - urut[b.tingkat] || b.jumlah - a.jumlah)

  return NextResponse.json({
    total_atlet: total,
    pekerjaan: daftar,
    ringkas: {
      kritis:  daftar.filter(p => p.tingkat === 'kritis').length,
      penting: daftar.filter(p => p.tingkat === 'penting').length,
      biasa:   daftar.filter(p => p.tingkat === 'biasa').length,
    },
    mesin: {
      // Yang sudah dibereskan mesin — dihitung, bukan ditulis mati seperti dulu.
      temuan_terbuka: issues.length,
      temuan_kritis:  issues.filter((i: any) => i.severity === 'critical').length,
      koreksi_total:  audit.length,
      koreksi: {
        cabor:     audit.filter((r: any) => r.action_type === 'cabor_sync').length,
        tgl_lahir: audit.filter((r: any) => r.action_type === 'tgl_lahir_fix').length,
        gender:    audit.filter((r: any) => r.action_type === 'gender_fix').length,
        dikunci:   audit.filter((r: any) => r.action_type === 'lock').length,
      },
    },
  })
}
