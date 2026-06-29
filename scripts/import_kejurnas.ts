// scripts/import_kejurnas.ts
// KBAAS Fase 0 — bulk import hasil kejurnas (Excel) ke event_kejurnas_results + auto-link atlet.
// Usage: npx tsx scripts/import_kejurnas.ts <file.xlsx> [sheetName=Master_All_Entries]
//
// Mapping disesuaikan ke header ASLI file (UPPERCASE + spasi). MEDAL dibaca langsung dari kolom.
// Idempotent by (source_file, comp_no, nomor_pertandingan) → aman di-rerun & tak nimpa 4 seed.

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!URL || !KEY) { console.error('❌ Set NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_KEY'); process.exit(1) }
const sb = createClient(URL, KEY)

const SOURCE_FILE = 'RESULT_MORNING_SESSION_DAY_3.pdf'

const str = (v: any) => (v === undefined || v === null || v === '') ? null : String(v).trim()
const num = (v: any) => { const n = parseInt(String(v)); return isNaN(n) ? null : n }
const parseMedal = (v: any) => { const s = String(v ?? '').toUpperCase(); return s.includes('EMAS') ? 'EMAS' : s.includes('PERAK') ? 'PERAK' : s.includes('PERUNGGU') ? 'PERUNGGU' : null }

async function findAtlet(name: string, year: number | null, gender: string) {
  const genderDb = gender === 'Pa' ? 'L' : 'P'
  const { data: exact } = await sb.from('atlet')
    .select('id, tgl_lahir').ilike('nama_lengkap', name).eq('kontingen_id', 4).eq('gender', genderDb)
  if (exact && exact.length === 1 && exact[0].tgl_lahir && year) {
    const dbY = new Date(exact[0].tgl_lahir).getFullYear()
    if (Math.abs(dbY - year) <= 1) return { atlet_id: exact[0].id as number, confidence: 'EXACT' }
  }
  if (year) {
    const { data: fuzzy } = await sb.rpc('match_atlet_fuzzy', { p_name: name, p_kontingen_id: 4, p_gender: genderDb, p_year: year, p_threshold: 0.4 })
    if (fuzzy && fuzzy.length > 0) {
      const best = fuzzy[0]
      const c = best.similarity >= 0.7 ? 'HIGH' : best.similarity >= 0.55 ? 'MEDIUM' : 'LOW'
      return { atlet_id: best.atlet_id as number, confidence: c }
    }
  }
  return { atlet_id: null as number | null, confidence: 'UNLINKED' }
}

async function main() {
  const path = process.argv[2]
  if (!path) { console.error('Usage: npx tsx scripts/import_kejurnas.ts <xlsx> [sheet]'); process.exit(1) }
  const sheet = process.argv[3] || 'Master_All_Entries'

  const wb = XLSX.readFile(path)
  if (!wb.Sheets[sheet]) { console.error(`❌ Sheet "${sheet}" tak ada. Tersedia: ${wb.SheetNames.join(', ')}`); process.exit(1) }
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheet])
  console.log(`📖 ${path} · sheet ${sheet} · ${rows.length} baris`)

  let inserted = 0, linked = 0, skipped = 0, errors = 0
  for (const r of rows) {
    try {
      const name = str(r['ATHLETE NAME'])
      const comp_no = num(r['COMP NO'])
      const nomor = str(r['NOMOR PERTANDINGAN'])
      if (!name || !nomor) { skipped++; continue }

      // idempotency: (source_file, comp_no, nomor)
      let dupQ = sb.from('event_kejurnas_results').select('id', { count: 'exact', head: true })
        .eq('source_file', SOURCE_FILE).eq('nomor_pertandingan', nomor)
      dupQ = comp_no != null ? dupQ.eq('comp_no', comp_no) : dupQ.eq('athlete_name_raw', name)
      const { count } = await dupQ
      if ((count ?? 0) > 0) { skipped++; continue }

      const gender = str(r['GENDER']) || ''
      const year = num(r['YEAR OF BIRTH'])
      const { atlet_id, confidence } = await findAtlet(name, year, gender)
      if (atlet_id) linked++

      const status = str(r['STATUS']) || 'OK'
      const advance = String(r['ADVANCE'] ?? '').includes('✅') || ['Q', 'q'].includes(status)
      const kategori = str(r['KATEGORI UMUR'])

      const { error } = await sb.from('event_kejurnas_results').insert({
        event_name: 'Indonesia Open Athletics Championship U18 2026',
        event_short_name: `Kejurnas ${kategori ?? ''} Day 3 Morning`.replace(/\s+/g, ' ').trim(),
        event_date: '2026-06-29', event_venue: 'Rawamangun Stadium, Jakarta', event_organizer: 'PASI',
        cabor_id: 10, cabor_nama: 'Atletik',
        kategori_umur: kategori, gender, nomor_pertandingan: nomor,
        round_type: str(r['ROUND TYPE']), heat_no: num(r['HEAT NO']), comp_no,
        athlete_name_raw: name, year_of_birth: year, team_name: str(r['TEAM']) || 'UNKNOWN',
        atlet_id, link_confidence: confidence,
        rank: num(r['RANK']), mark: str(r['MARK']) || '-', status,
        medal: parseMedal(r['MEDAL']),
        advance_to_next_round: advance,
        rekornas_value: str(r['REKORNAS']), rekornas_holder: str(r['REKORNAS HOLDER']), rekornas_team: str(r['REKORNAS TEAM']),
        source_file: SOURCE_FILE,
      })
      if (error) { console.error(`❌ ${name}: ${error.message}`); errors++ } else inserted++
    } catch (e: any) { console.error(`❌ ${r['ATHLETE NAME']}: ${e.message}`); errors++ }
  }
  console.log(`\n✅ Selesai — inserted ${inserted} · linked ${linked} · skipped(dupe) ${skipped} · errors ${errors}`)
}
main().catch(console.error)
