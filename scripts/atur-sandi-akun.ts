// scripts/atur-sandi-akun.ts — atur ulang kata sandi akun admin/operator (mis. superadmin yang lupa sandi).
// Dijalankan SENDIRI oleh pemilik di terminal Mac-nya:  npx tsx scripts/atur-sandi-akun.ts
// Kata sandi diketik tersembunyi, tidak tampil di layar dan tidak disimpan di mana pun
// selain hash bcrypt di tabel users_auth (sama dengan cara login membacanya).
// Butuh .env.local berisi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_KEY.

import { readFileSync, existsSync } from 'fs'
import { createInterface } from 'readline'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

function muatEnv() {
  if (!existsSync('.env.local')) return
  for (const baris of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

function tanya(pertanyaan: string, sembunyi = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true }) as any
  if (sembunyi) {
    const tulis = rl._writeToOutput.bind(rl)
    // Readline kadang menulis ulang seluruh baris (pertanyaan + isian) — bagian isiannya tetap disamarkan.
    // Kode kendali terminal (\x1b[...) dibiarkan; setiap huruf isian jadi titik.
    const samarkan = (t: string) => t.replace(/(\x1b\[[0-9;]*[A-Za-z])|[^\r\n]/g, (c, kendali) => (kendali ? kendali : '•'))
    rl._writeToOutput = (s: string) => {
      const i = s.indexOf(pertanyaan)
      if (i >= 0) return tulis(s.slice(0, i + pertanyaan.length) + samarkan(s.slice(i + pertanyaan.length)))
      return tulis(samarkan(s))
    }
  }
  return new Promise(r => rl.question(pertanyaan, (j: string) => { rl.close(); if (sembunyi) process.stdout.write('\n'); r(j) }))
}

;(async () => {
  muatEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, kunci = process.env.SUPABASE_SERVICE_KEY
  if (!url || !kunci) { console.log('✗ .env.local tidak ditemukan / tidak lengkap. Jalankan dari folder proyek porprov.'); process.exit(1) }
  const db = createClient(url, kunci, { auth: { persistSession: false } })

  const username = (await tanya('Username akun: ')).trim().toLowerCase()
  const { data: u } = await db.from('users').select('id,username,nama,role,is_active').eq('username', username).maybeSingle()
  if (!u) { console.log(`✗ Akun "${username}" tidak ditemukan.`); process.exit(1) }
  console.log(`  Akun: ${u.nama} · role ${u.role}${u.is_active ? '' : ' · NONAKTIF'}`)

  const s1 = await tanya('Kata sandi baru (min. 10 karakter): ', true)
  if (s1.length < 10) { console.log('✗ Terlalu pendek. Tidak ada yang diubah.'); process.exit(1) }
  const s2 = await tanya('Ulangi kata sandi baru: ', true)
  if (s1 !== s2) { console.log('✗ Kedua isian tidak sama. Tidak ada yang diubah.'); process.exit(1) }

  const hash = await bcrypt.hash(s1, 12)
  const { error } = await db.from('users_auth').upsert({ user_id: u.id, password_hash: hash, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) { console.log('✗ Gagal menyimpan:', error.message); process.exit(1) }
  await db.from('audit_logs').insert({ action: 'SANDI_DIATUR_ULANG_TERMINAL', resource: 'users', resource_id: String(u.id), actor_email: 'terminal pemilik', severity: 'warning', payload: { username } })
  console.log(`✓ Kata sandi "${username}" sudah diganti. Silakan login dengan sandi baru.`)
  process.exit(0)
})()
