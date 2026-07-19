// scripts/hash_atlet_passwords.ts
// Migrasi 1x: hash semua atlet.atlet_password_hash yang masih plaintext -> bcrypt.
// AMAN dijalankan berkali-kali (yang sudah $2 dilewati). JANGAN log nilai plaintext.
// Prasyarat: kode login atlet sudah verifyAtletPassword (bcrypt-capable) & sudah ter-deploy.

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
const sb = createClient(URL, KEY)

async function main() {
  const { data, error } = await sb.from('atlet').select('id, atlet_password_hash')
    .not('atlet_password_hash', 'is', null)
    .not('atlet_password_hash', 'like', '$2%')  // hanya plaintext (lewati yg sudah bcrypt) → hindari cap 1000
  if (error) { console.error('fetch error:', error.message); process.exit(1) }
  const plain = (data ?? []).filter((a: any) => !String(a.atlet_password_hash).startsWith('$2'))
  console.log(`Total plaintext: ${plain.length}`)
  let done = 0, err = 0
  for (const a of plain) {
    try {
      const h = await bcrypt.hash(String(a.atlet_password_hash), 12)
      const { error: uerr } = await sb.from('atlet').update({ atlet_password_hash: h }).eq('id', a.id)
      if (uerr) err++; else done++
    } catch { err++ }
    if (done % 200 === 0 && done) console.log(`  ...${done}`)
  }
  console.log(`✅ Selesai — hashed ${done}, error ${err}`)
}
main().catch(e => { console.error(e); process.exit(1) })
