// scripts/seed-baseline-performance.mjs
// Seed atlet_baseline_performance dari 2 file Excel (Atletik + Akuatik).
//
// Pemakaian:
//   node scripts/seed-baseline-performance.mjs            -> DRY RUN (tidak menulis DB)
//   node scripts/seed-baseline-performance.mjs --commit   -> tulis ke DB (butuh izin)
//
// Catatan struktur (hasil inspeksi file nyata):
//  ATLETIK (Cabor Atletik.xlsx): header baris idx 4, data 5+.
//    kolom: [0]No [1]Event [2]Pa/Pi/Mix [3]Nama [4]Waktu [5]Target [6]Pesaing [7]Rekor
//    event "menggantung" (carry-forward); nama multi diberi "1. ", "2. "; relay = "Estafet".
//  AKUATIK (ATLET DAN ... AKUATIK.xlsx): section di kolom[0] (RENANG=cabor7,
//    RENANG PERAIRAN TERBUKA=cabor9). header baris idx 1, data 2+.
//    kolom: [1]No [2]Event [3]Pa/Pi [4](posisi relay) [5]Nama [6]Waktu [7]Target [8]Pesaing

import fs from 'fs'
import path from 'path'
import xlsx from 'xlsx'
import { createClient } from '@supabase/supabase-js'

// ── helpers (mirror src/lib/baseline/*.ts; node tak bisa import .ts) ──
function parseTimeToSeconds(timeStr) {
  if (timeStr === null || timeStr === undefined) return null
  const cleaned = timeStr.toString().trim()
  if (!cleaned || /^(nt|n\/a|na|-|–|—)$/i.test(cleaned)) return null
  let parts
  if (cleaned.includes(':')) parts = cleaned.split(':')
  else if ((cleaned.match(/\./g) || []).length >= 2) {
    parts = cleaned.split('.')
    if (parts.length === 3) parts = [parts[0], `${parts[1]}.${parts[2]}`]
  } else parts = [cleaned]
  const nums = parts.map(p => Number(p.replace(',', '.')))
  if (nums.some(n => Number.isNaN(n))) return null
  let s
  if (nums.length === 1) s = nums[0]
  else if (nums.length === 2) s = nums[0] * 60 + nums[1]
  else if (nums.length === 3) s = nums[0] * 3600 + nums[1] * 60 + nums[2]
  else return null
  return Math.round(s * 1000) / 1000
}
function calculateGap(a, r) {
  const at = parseTimeToSeconds(a), re = parseTimeToSeconds(r)
  if (at === null || re === null || re === 0) return null
  return Math.round(((at - re) / re) * 10000) / 100
}
function normalizeName(raw) {
  return (raw || '').toUpperCase().replace(/^\s*\d+\s*[.)-]\s*/, '').replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim()
}
function levenshtein(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => i)
  for (let j = 1; j <= n; j++) { let prev = dp[0]; dp[0] = j
    for (let i = 1; i <= m; i++) { const t = dp[i]; dp[i] = a[i-1] === b[j-1] ? prev : 1 + Math.min(prev, dp[i], dp[i-1]); prev = t } }
  return dp[m]
}
function fuzzyMatchAtlet(excelName, dbAthletes) {
  const target = normalizeName(excelName); if (!target) return null
  const exact = dbAthletes.find(a => normalizeName(a.nama_lengkap) === target); if (exact) return exact
  const contains = dbAthletes.find(a => { const db = normalizeName(a.nama_lengkap); return db.includes(target) || target.includes(db) }); if (contains) return contains
  const firstTwo = target.split(' ').slice(0, 2).join(' ')
  const tw = dbAthletes.find(a => normalizeName(a.nama_lengkap).startsWith(firstTwo)); if (tw) return tw
  let best = null, bd = Infinity
  for (const a of dbAthletes) { const db2 = normalizeName(a.nama_lengkap).split(' ').slice(0, 2).join(' '); const d = levenshtein(firstTwo, db2); if (d < bd) { bd = d; best = a } }
  return bd <= 2 ? best : null
}
function predictMedalProbability(gap) {
  if (gap === null || Number.isNaN(gap)) return { emas: 0, perak: 0, perunggu: 0 }
  const g = Math.abs(gap), c = n => Math.max(0, Math.min(100, Math.round(n)))
  let e = 0, p = 0, b = 0
  if (g <= 3) { e = 75 - g*10; p = 90 - g*5; b = 95 }
  else if (g <= 7) { e = 45 - g*5; p = 80 - g*5; b = 90 - g*2 }
  else if (g <= 12) { e = 20 - g*2; p = 50 - g*3; b = 80 - g*3 }
  else { e = 0; p = 20 - g; b = 50 - g }
  return { emas: c(e), perak: c(p), perunggu: c(b) }
}

const COMMIT = process.argv.includes('--commit')
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

// ── env + supabase (service key) ───────────────────────────
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

const KONTINGEN_ID = 4
const STAFF_BLACKLIST = ['PELATIH', 'KEPALA PELATIH', 'MANAGER', 'OFFICIAL', 'MAKE UP', 'HAIR DO', 'PENGADAAN', 'NAMA ATLET', 'NAMA']
const isStaff = (name) => {
  if (!name) return true
  const u = name.toUpperCase().trim()
  if (u === '-' || u === '') return true
  return STAFF_BLACKLIST.some(k => u.includes(k))
}
const isRelay = (event) => /estaf|relay|4\s*x|4x/i.test(event || '')
const stripNum = (s) => (s || '').replace(/^\s*\d+\s*[.)-]\s*/, '').trim()
const relayPos = (s) => { const m = (s || '').match(/^\s*(\d+)\s*[.)-]/); return m ? parseInt(m[1]) : null }
const sheetRows = (p) => { const wb = xlsx.readFile(p); return xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false }) }
const norm = (s) => (s || '').toString().trim()
const cleanTarget = (t) => { const u = norm(t); return (!u || u === '-' || u === '–') ? null : u }

// ── load DB refs ───────────────────────────────────────────
async function loadAtlet() {
  let all = [], from = 0
  while (true) {
    const { data } = await sb.from('atlet').select('id,nama_lengkap,gender,cabor_id,status_verifikasi').eq('kontingen_id', KONTINGEN_ID).range(from, from + 999)
    all.push(...data); if (data.length < 1000) break; from += 1000
  }
  return all
}
async function loadNomor(caborId) {
  const { data } = await sb.from('nomor_pertandingan').select('id,nama,gender').eq('cabor_id', caborId)
  return data || []
}
function matchNomor(eventName, gender, nomorList) {
  const target = normalizeName(eventName)
  if (!target) return null
  // cocokkan nama event (contains 2 arah), bila ada gender bias ke yg cocok
  const cand = nomorList.filter(n => {
    const nn = normalizeName(n.nama)
    return nn.includes(target) || target.includes(nn)
  })
  if (!cand.length) return null
  const g = gender === 'Pa' ? 'L' : gender === 'Pi' ? 'P' : null
  return (g && cand.find(c => (c.gender || '').toUpperCase().startsWith(g))) || cand[0]
}

// ── parse ATLETIK ──────────────────────────────────────────
function parseAtletik() {
  const rows = sheetRows(path.join(ROOT, 'data/baseline/Cabor Atletik.xlsx'))
  const out = []
  let curEvent = null, curGender = null
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i]
    const no = norm(r[0]), ev = norm(r[1]), gend = norm(r[2]), nama = norm(r[3])
    if (ev) { curEvent = ev; curGender = gend || null } // event baru
    else if (gend) { curGender = gend } // sub-gender (mis. relay mix)
    if (!nama || isStaff(nama)) continue
    out.push({
      cabor_id: 10,
      event_name: curEvent || ev,
      gender: (gend || curGender) === 'Pi' ? 'P' : (gend || curGender) === 'Mix' ? 'Mix' : 'L',
      raw_gender: gend || curGender,
      nama_excel: stripNum(nama),
      waktu_terbaik: norm(r[4]) || null,
      target_medali: cleanTarget(r[5]),
      pesaing: norm(r[6]) || null,
      rekor_porprov: norm(r[7]) || null,
      is_relay: isRelay(curEvent),
      relay_position: isRelay(curEvent) ? relayPos(nama) : null,
    })
  }
  return out
}

// ── parse AKUATIK (multi-section) ──────────────────────────
function parseAkuatik() {
  const rows = sheetRows(path.join(ROOT, 'data/baseline/ATLET DAN NOMOR PERTANDINGAN AKUATIK.xlsx'))
  const SECTION_CABOR = { 'RENANG': 7, 'RENANG PERAIRAN TERBUKA': 9 }
  const out = []
  let curCabor = 7, curEvent = null, curGender = null
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const onlyCol0 = norm(r[0]) && r.slice(1).every(x => norm(x) === '')
    if (onlyCol0) { // section header
      const key = norm(r[0]).toUpperCase()
      if (SECTION_CABOR[key]) curCabor = SECTION_CABOR[key]
      continue
    }
    if (curCabor !== 7) continue // scope: hanya Akuatik-Renang (cabor 7), skip Perairan Terbuka/Polo Air
    const evNo = norm(r[1]), ev = norm(r[2]), gend = norm(r[3]), nama = norm(r[5])
    if (ev) { curEvent = ev; curGender = gend || null }
    else if (gend) { curGender = gend }
    if (!nama || isStaff(nama)) continue
    out.push({
      cabor_id: curCabor,
      event_name: curEvent || ev,
      gender: (gend || curGender) === 'Pi' ? 'P' : 'L',
      raw_gender: gend || curGender,
      nama_excel: stripNum(nama),
      waktu_terbaik: norm(r[6]) || null,
      target_medali: cleanTarget(r[7]),
      pesaing: norm(r[8]) || null,
      rekor_porprov: null, // file akuatik tidak punya kolom rekor
      is_relay: isRelay(curEvent),
      relay_position: isRelay(curEvent) ? (parseInt(norm(r[4])) || null) : null,
    })
  }
  return out
}

// ── main ───────────────────────────────────────────────────
async function main() {
  console.log(`\n=== SEED BASELINE PERFORMANCE — ${COMMIT ? 'COMMIT (tulis DB)' : 'DRY RUN (tidak menulis)'} ===\n`)
  const dbAtlet = await loadAtlet()
  const nomor10 = await loadNomor(10)
  const nomor7 = await loadNomor(7)
  const nomor9 = await loadNomor(9)
  const nomorByCabor = { 10: nomor10, 7: nomor7, 9: nomor9 }

  const records = [...parseAtletik(), ...parseAkuatik()]
  console.log(`Total baris atlet ter-parse: ${records.length}`)

  const REJECTED = new Set([1923, 2243])
  const toInsertAtlet = new Map() // nama_norm -> {nama, gender, cabor_id}
  let matched = 0, willAutoInsert = 0, skippedRejected = 0, skippedAtletikUnmatched = 0
  const prepared = []

  for (const rec of records) {
    let atlet = fuzzyMatchAtlet(rec.nama_excel, dbAtlet)
    if (atlet && REJECTED.has(atlet.id)) { skippedRejected++; continue }

    let atletId = atlet?.id ?? null
    if (!atlet) {
      // Atletik (cabor 10): hanya 13 atlet roster — relay-leg non-roster di-SKIP (tak auto-insert).
      if (rec.cabor_id === 10) { skippedAtletikUnmatched++; continue }
      // Akuatik (cabor 7): auto-insert atlet baru (Pending) sesuai keputusan brief.
      const key = normalizeName(rec.nama_excel)
      if (!toInsertAtlet.has(key)) toInsertAtlet.set(key, { nama: rec.nama_excel, gender: rec.gender === 'P' ? 'P' : 'L', cabor_id: rec.cabor_id })
      willAutoInsert++
    } else matched++

    const waktu_seconds = parseTimeToSeconds(rec.waktu_terbaik)
    const rekor_seconds = parseTimeToSeconds(rec.rekor_porprov)
    const gap = calculateGap(rec.waktu_terbaik, rec.rekor_porprov)
    const nomor = matchNomor(rec.event_name, rec.raw_gender, nomorByCabor[rec.cabor_id] || [])
    prepared.push({
      ...rec,
      atletId,
      atlet_nama_db: atlet?.nama_lengkap ?? null,
      atlet_cabor: atlet?.cabor_id ?? null,
      nomor_pertandingan_id: nomor?.id ?? null,
      waktu_seconds, rekor_seconds, gap_percentage: gap,
      medal_probability: predictMedalProbability(gap),
    })
  }

  console.log(`  matched ke atlet existing : ${matched}`)
  console.log(`  perlu auto-insert (baru)  : ${willAutoInsert} baris -> ${toInsertAtlet.size} atlet unik`)
  console.log(`  skip (rejected)           : ${skippedRejected}`)
  console.log(`  skip Atletik non-roster   : ${skippedAtletikUnmatched}`)
  const byCabor = prepared.reduce((a, p) => { a[p.cabor_id] = (a[p.cabor_id] || 0) + 1; return a }, {})
  console.log(`  per cabor_id              :`, byCabor)
  console.log(`  relay records             : ${prepared.filter(p => p.is_relay).length}`)
  console.log(`  dengan gap terhitung      : ${prepared.filter(p => p.gap_percentage !== null).length}`)

  console.log('\n  --- contoh 6 record ter-proses ---')
  prepared.slice(0, 6).forEach(p => console.log(`   [c${p.cabor_id}] ${p.event_name} | ${p.nama_excel}${p.atletId ? ' (id ' + p.atletId + ')' : ' (BARU)'} | wkt ${p.waktu_terbaik || '-'} gap ${p.gap_percentage ?? '-'}% | target ${p.target_medali || '-'} | medal ${JSON.stringify(p.medal_probability)}`))

  console.log('\n  --- atlet yang akan AUTO-INSERT (Pending) ---')
  ;[...toInsertAtlet.values()].slice(0, 40).forEach(a => console.log(`   + ${a.nama} (${a.gender}, cabor ${a.cabor_id})`))

  // AUDIT match cabor 7 (Akuatik): deteksi kemungkinan salah-cocok
  console.log('\n  --- AUDIT match Akuatik (cabor 7): excel -> DB | cabor DB | exact? ---')
  const seen7 = new Set()
  prepared.filter(p => p.cabor_id === 7).forEach(p => {
    if (seen7.has(p.nama_excel)) return; seen7.add(p.nama_excel)
    const exact = normalizeName(p.nama_excel) === normalizeName(p.atlet_nama_db || '')
    const flag = !exact ? ' ⚠️FUZZY' : ''
    const caborFlag = (p.atlet_cabor && ![7, 148, 4, 5, 6, 9].includes(p.atlet_cabor)) ? ` ⚠️cabor=${p.atlet_cabor}(bukan akuatik)` : ` cabor=${p.atlet_cabor ?? '-'}`
    console.log(`   ${p.nama_excel}  ->  ${p.atlet_nama_db}${caborFlag}${flag}`)
  })

  if (!COMMIT) {
    console.log('\n[DRY RUN] tidak ada yang ditulis ke DB. Jalankan dengan --commit untuk eksekusi.')
    return
  }

  // ── COMMIT ───────────────────────────────────────────────
  console.log('\n[COMMIT] menulis ke DB...')
  // 1. insert atlet baru
  const nameToNewId = new Map()
  for (const a of toInsertAtlet.values()) {
    const { data, error } = await sb.from('atlet').insert({
      kontingen_id: KONTINGEN_ID, cabor_id: a.cabor_id, nama_lengkap: a.nama, gender: a.gender,
      status_verifikasi: 'Pending', status_registrasi: 'Imported from Baseline',
    }).select('id').single()
    if (error) { console.log('  ERR insert atlet', a.nama, error.message); continue }
    nameToNewId.set(normalizeName(a.nama), data.id)
  }
  console.log(`  atlet baru ter-insert: ${nameToNewId.size}`)

  // 2. insert baseline rows
  let ok = 0, fail = 0
  for (const p of prepared) {
    const atletId = p.atletId ?? nameToNewId.get(normalizeName(p.nama_excel))
    if (!atletId) { fail++; continue }
    const { error } = await sb.from('atlet_baseline_performance').insert({
      atlet_id: atletId, cabor_id: p.cabor_id, nomor_pertandingan_id: p.nomor_pertandingan_id,
      event_name: p.event_name, gender: p.gender, waktu_terbaik: p.waktu_terbaik,
      target_medali: p.target_medali, pesaing: p.pesaing, rekor_porprov: p.rekor_porprov,
      waktu_seconds: p.waktu_seconds, rekor_seconds: p.rekor_seconds, gap_percentage: p.gap_percentage,
      medal_probability: p.medal_probability, tahun_baseline: 2022,
      is_relay: p.is_relay, relay_position: p.relay_position,
      notes: p.is_relay && p.relay_position ? `Relay leg ${p.relay_position}` : null,
    })
    if (error) { fail++; if (fail <= 5) console.log('  ERR baseline', p.nama_excel, error.message) } else ok++
  }
  console.log(`  baseline rows inserted: ${ok}, gagal: ${fail}`)
}

main().catch(e => { console.error(e); process.exit(1) })
