// scripts/impor-akomodasi.ts
// Menambahkan kota akomodasi ke jadwal_cabor dari sheet rencana perjalanan.
//
// Sheet ini memuat 21 baris — cabor yang atletnya harus menginap di luar
// kluster tuan rumah utama. Isinya TIDAK selalu sama dengan sheet jadwal:
// ada disiplin yang cuma muncul di sini, ada satu baris kembar, dan ada
// tanggal yang berbeda untuk pertandingan yang sama.
//
// KEPUTUSAN PENGELOLA: bila tanggalnya bertentangan, YANG DIPAKAI ADALAH
// SHEET JADWAL. Skrip mengisi akomodasinya saja, tidak pernah menyentuh
// tanggal, dan menuliskan tanggal yang ditolak ke kolom catatan supaya
// jejaknya tetap ada bila suatu saat perlu ditinjau ulang.

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { caborDariJadwal, tanggalJadwal } from '../src/lib/jadwal'
import * as fs from 'fs'
import * as path from 'path'

const berkas = process.argv[2]
if (!berkas) { console.error('Sebutkan berkasnya.'); process.exit(1) }
const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
const ambil = (k: string) =>
  env.split('\n').find(l => l.startsWith(k + '='))?.slice(k.length + 1).replace(/["\r]/g, '').trim() ?? ''
const sb = createClient(ambil('NEXT_PUBLIC_SUPABASE_URL'), ambil('SUPABASE_SERVICE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } })

const norm = (s: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

async function main() {
  let caborDb: string[] = []
  for (let p = 0; ; p++) {
    const { data } = await sb.from('atlet').select('cabor_nama_raw')
      .eq('kontingen_id', 4).range(p * 1000, (p + 1) * 1000 - 1)
    if (!data?.length) break
    caborDb = caborDb.concat(data.map(r => (r.cabor_nama_raw ?? '').trim()).filter(Boolean))
    if (data.length < 1000) break
  }
  caborDb = Array.from(new Set(caborDb))

  const { data: adaRows } = await sb.from('jadwal_cabor')
    .select('id,cabor_disiplin,cabor_nama_raw,mulai,selesai,venue,akomodasi')
    .eq('jenis', 'pertandingan')
  const ada = adaRows ?? []

  const wb = XLSX.readFile(berkas)
  const baris = XLSX.utils.sheet_to_json<any[]>(wb.Sheets['Sheet1'], { header: 1, raw: false, defval: '' })

  const rencana: any[] = []
  for (const r of baris) {
    const k = (i: number) => String(r[i] ?? '').trim()
    if (!k(2) || k(0) === 'NO.' || !k(1)) continue
    const m = /^(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})$/.exec(k(1))
    rencana.push({
      disiplin: k(2).replace(/\s+/g, ' '), venue: k(3), akomodasi: k(4),
      mulai: tanggalJadwal(m ? m[1] : k(1)), selesai: tanggalJadwal(m ? m[2] : k(1)),
      cabor: caborDariJadwal(k(2), caborDb),
    })
  }
  console.log(`Baris rencana perjalanan: ${rencana.length}`)

  // Baris kembar di dalam sheet itu sendiri
  const terlihat = new Map<string, number>()
  const kembar: string[] = []
  rencana.forEach(x => {
    const key = `${norm(x.disiplin)}|${x.mulai}|${norm(x.venue)}`
    terlihat.set(key, (terlihat.get(key) ?? 0) + 1)
    if (terlihat.get(key) === 2) kembar.push(`${x.disiplin} (${x.mulai})`)
  })
  if (kembar.length) console.log(`\nBaris kembar di dalam sheet: ${kembar.join(', ')}`)

  const perbarui: any[] = []
  const tambahBaru: any[] = []
  const bentrokTanggal: string[] = []

  for (const x of rencana) {
    if (perbarui.some(p => p._k === norm(x.disiplin) + x.mulai)) continue
    // Cocokkan ke baris jadwal yang sudah ada. Cabor saja TIDAK cukup:
    // Dayung punya lima baris di venue yang sama, dan memilih yang pertama
    // membuat "Rowing - Klasik" tertaut ke Canoeing lalu tanggalnya dilaporkan
    // bertentangan padahal barisnya memang bukan itu. Jadi yang menentukan
    // adalah kemiripan nama disiplinnya.
    // Nama cabornya sendiri dibuang dari kedua sisi lebih dulu, sebab sheet
    // jadwal menulis "Canoeing" sedangkan sheet rencana menulis "Dayung
    // Canoeing - Sprint". Yang membedakan justru sisanya.
    //
    // Pembaginya gabungan (union), bukan yang terpendek. Dengan pembagi
    // terpendek, "Akuatik - Renang" mendapat nilai sempurna terhadap "Akuatik
    // - Renang Perairan Terbuka" — dua nomor berbeda yang tanggalnya beda,
    // dan bedanya akan dilaporkan sebagai bentrok padahal cuma salah tautan.
    const buangCabor = (t: string, cabor: string) => {
      const buang = new Set(norm(cabor).split(' '))
      return new Set(norm(t).split(' ').filter(w => w.length > 2 && !buang.has(w)))
    }
    const kx = buangCabor(x.disiplin, x.cabor ?? '')
    // Bila cabornya bukan milik Kab. Bandung, cocokkan lewat nama disiplin
    // apa adanya. Tanpa ini "Aerosport - Terbang Layang" dianggap belum ada
    // lalu ditambahkan sebagai baris kedua — kembar dengan yang dari sheet
    // jadwal, dan tanggalnya pun berbeda.
    const kandidat = ada
      .filter(a => x.cabor ? a.cabor_nama_raw === x.cabor : norm(a.cabor_disiplin) === norm(x.disiplin))
      .map(a => {
        const ka = buangCabor(a.cabor_disiplin, a.cabor_nama_raw ?? '')
        if (ka.size === 0 && kx.size === 0) return { a, skor: 1 }   // dua-duanya polos
        const irisan = Array.from(ka).filter(w => kx.has(w)).length
        const gabung = new Set([...Array.from(ka), ...Array.from(kx)]).size
        return { a, skor: gabung ? irisan / gabung : 0 }
      })
      .filter(c => c.skor >= 0.5)
      .sort((p, q) => q.skor - p.skor)
      .map(c => c.a)
    if (kandidat.length === 0) {
      tambahBaru.push({
        jenis: 'pertandingan', cabor_disiplin: x.disiplin, cabor_nama_raw: x.cabor,
        mulai: x.mulai, selesai: x.selesai, venue: x.venue, akomodasi: x.akomodasi,
        catatan: 'Hanya tercantum di sheet rencana perjalanan, tidak ada di sheet jadwal.',
        sumber: path.basename(berkas),
      })
      continue
    }
    const p = kandidat[0]
    const beda = p.mulai !== x.mulai
    if (beda) bentrokTanggal.push(`${x.disiplin}: dipakai ${p.mulai} (sheet jadwal), diabaikan ${x.mulai} (sheet rencana)`)
    perbarui.push({
      id: p.id, akomodasi: x.akomodasi, _k: norm(x.disiplin) + x.mulai,
      catatan: beda
        ? `Sheet rencana perjalanan menyebut ${x.mulai}; yang dipakai tanggal sheet jadwal. Keputusan pengelola.`
        : undefined,
    })
  }

  console.log(`\nAkan diisi akomodasinya : ${perbarui.length} baris`)
  console.log(`Baris baru (hanya di rencana): ${tambahBaru.length}`)
  tambahBaru.forEach(t => console.log(`   + ${t.cabor_disiplin} → ${t.cabor_nama_raw ?? '(bukan cabor kita)'}`))
  if (bentrokTanggal.length) {
    console.log(`\nTanggal bertentangan — sheet jadwal yang dipakai (keputusan pengelola):`)
    bentrokTanggal.forEach(b => console.log(`   · ${b}`))
  }

  if (process.argv.includes('--simpan')) {
    for (const p of perbarui) {
      const isi: any = { akomodasi: p.akomodasi, updated_at: new Date().toISOString() }
      if (p.catatan) isi.catatan = p.catatan
      await sb.from('jadwal_cabor').update(isi).eq('id', p.id)
    }
    if (tambahBaru.length) {
      const { error } = await sb.from('jadwal_cabor')
        .upsert(tambahBaru, { onConflict: 'cabor_disiplin,mulai,venue' })
      if (error) { console.error('Gagal menambah:', error.message); process.exit(1) }
    }
    console.log(`\nTersimpan: ${perbarui.length} diperbarui, ${tambahBaru.length} ditambahkan.`)
  } else {
    console.log('\n(pratinjau saja — tambahkan --simpan)')
  }
}
main()
