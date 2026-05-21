// src/app/api/sipa/route.ts — v2
// Fix: query DB langsung (bukan rpc), dynamic per tenant/kontingen
// Semua tabel & view tersambung ke SIPA

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[]

let idx = 0
function nextKey() { const k = GROQ_KEYS[idx % GROQ_KEYS.length]; idx++; return k }

async function callGroq(messages: any[]): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const key = nextKey()
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model:       'llama-3.3-70b-versatile',
          messages,
          max_tokens:  1000,
          temperature: 0.3,
        }),
      })
      if (res.status === 429) { await new Promise(r => setTimeout(r, 1000)); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? 'Maaf, tidak ada respons.'
    } catch (e) {
      if (i === 2) throw e
    }
  }
  return 'SIPA sedang sibuk, coba lagi nanti.'
}

// ── Nama daerah lokal per kontingen_id ───────────────────
const DAERAH_LOKAL: Record<number, string> = {
  1:  'Kab. Bogor',        2:  'Kab. Sukabumi',    3:  'Kab. Cianjur',
  4:  'Kab. Bandung',      5:  'Kab. Garut',        6:  'Kab. Tasikmalaya',
  7:  'Kab. Ciamis',       8:  'Kab. Kuningan',     9:  'Kab. Cirebon',
  10: 'Kab. Majalengka',   11: 'Kab. Sumedang',     12: 'Kab. Indramayu',
  13: 'Kab. Subang',       14: 'Kab. Purwakarta',   15: 'Kab. Karawang',
  16: 'Kab. Bekasi',       17: 'Kab. Bandung Barat',18: 'Kab. Pangandaran',
  19: 'Kota Bogor',        20: 'Kota Sukabumi',     21: 'Kota Bandung',
  22: 'Kota Cirebon',      23: 'Kota Bekasi',       24: 'Kota Depok',
  25: 'Kota Tasikmalaya',  26: 'Kota Banjar',       27: 'Kota Cimahi',
}

// ── Ambil semua data dari DB ──────────────────────────────
async function getDBContext(kontingenId?: number | null, role?: string): Promise<string> {
  let context = '=== DATA REAL DATABASE PORPROV XV JAWA BARAT 2026 ===\n\n'

  try {
    // ── 1. Data atlet kontingen (kalau ada kontingen_id) ──
    if (kontingenId) {
      const [atletRes, asalRes, caborRes] = await Promise.allSettled([
        sb.from('atlet')
          .select('status_registrasi, gender, cabor_nama_raw, nama_asal_daerah, kode_asal_daerah, tgl_lahir')
          .eq('kontingen_id', kontingenId),

        sb.from('v_asal_daerah_atlet')
          .select('asal, total, putra, putri, persen')
          .order('total', { ascending: false })
          .limit(10),

        sb.from('v_top_cabor_kabbogor')
          .select('cabor, total, putra, putri, verified, avg_umur')
          .order('total', { ascending: false })
          .limit(10),
      ])

      // Proses atlet
      if (atletRes.status === 'fulfilled' && atletRes.value?.data) {
        const atlets   = atletRes.value.data as any[]
        const total    = atlets.length
        const putra    = atlets.filter(a => a.gender === 'L').length
        const putri    = atlets.filter(a => a.gender === 'P').length
        const verified = atlets.filter(a => a.status_registrasi === 'Verified').length
        const pending  = atlets.filter(a => a.status_registrasi === 'Menunggu Admin').length
        const ditolak  = atlets.filter(a => a.status_registrasi === 'Ditolak Admin').length
        const posted   = atlets.filter(a => a.status_registrasi === 'Posted').length
        const daerahLokal = DAERAH_LOKAL[kontingenId] ?? ''
        const lokal    = atlets.filter(a => a.nama_asal_daerah === daerahLokal).length
        const nonLokal = total - lokal

        // Distribusi umur
        const now = new Date()
        const umurs = atlets
          .filter(a => a.tgl_lahir)
          .map(a => now.getFullYear() - new Date(a.tgl_lahir).getFullYear())
          .filter(u => u > 10 && u < 65)
        const avgUmur = umurs.length
          ? Math.round(umurs.reduce((a,b)=>a+b,0)/umurs.length)
          : 0

        context += `DATA KONTINGEN: ${daerahLokal || `ID ${kontingenId}`}\n`
        context += `- Total atlet: ${total} (${putra} putra / ${putri} putri)\n`
        context += `- Status registrasi:\n`
        context += `  • Verified: ${verified} (${Math.round(verified/total*100)}%)\n`
        context += `  • Menunggu Admin: ${pending}\n`
        context += `  • Ditolak Admin: ${ditolak}\n`
        context += `  • Posted: ${posted}\n`
        context += `- Lolos verifikasi: ${verified + posted} dari ${total}\n`
        context += `- Atlet lokal (${daerahLokal}): ${lokal}\n`
        context += `- Atlet non-lokal (dari luar daerah): ${nonLokal} (${Math.round(nonLokal/total*100)}%)\n`
        context += `- Rata-rata umur: ${avgUmur} tahun\n\n`
      }

      // Proses asal daerah
      if (asalRes.status === 'fulfilled' && asalRes.value?.data) {
        const asal = asalRes.value.data as any[]
        if (asal.length > 0) {
          context += `ASAL DAERAH ATLET (top ${asal.length}):\n`
          asal.forEach((a: any) => {
            context += `- ${a.asal}: ${a.total} atlet (${a.putra}L/${a.putri}P, ${a.persen}%)\n`
          })
          context += '\n'
        }
      }

      // Proses top cabor
      if (caborRes.status === 'fulfilled' && caborRes.value?.data) {
        const cabors = caborRes.value.data as any[]
        if (cabors.length > 0) {
          context += `TOP CABOR KONTINGEN:\n`
          cabors.forEach((c: any, i: number) => {
            context += `${i+1}. ${c.cabor}: ${c.total} atlet (${c.putra}L/${c.putri}P), verified: ${c.verified}, avg umur: ${c.avg_umur}th\n`
          })
          context += '\n'
        }
      }
    }

    // ── 2. Klasemen medali semua kontingen ────────────────
    const klasemenRes = await sb
      .from('klasemen_medali')
      .select('emas, perak, perunggu, total, kontingen(nama)')
      .order('emas', { ascending: false })
      .order('perak', { ascending: false })
      .limit(27)

    if (klasemenRes.data && klasemenRes.data.length > 0) {
      context += `KLASEMEN MEDALI PORPROV XV (27 kontingen):\n`
      klasemenRes.data.forEach((k: any, i: number) => {
        const nama = k.kontingen?.nama ?? `ID ${k.kontingen_id}`
        const flag = kontingenId && k.kontingen?.nama === DAERAH_LOKAL[kontingenId] ? ' ← KONTINGEN KITA' : ''
        context += `${i+1}. ${nama}: 🥇${k.emas} 🥈${k.perak} 🥉${k.perunggu} (total: ${k.total})${flag}\n`
      })
      context += '\n'
    }

    // ── 3. Summary global PORPROV XV ─────────────────────
    const [totalAtletRes, totalCaborRes, venueRes] = await Promise.allSettled([
      sb.from('atlet').select('*', { count: 'exact', head: true }),
      sb.from('cabang_olahraga').select('*', { count: 'exact', head: true }),
      sb.from('venue').select('id, nama, klaster_id').limit(20),
    ])

    const totalAtlet = totalAtletRes.status === 'fulfilled' ? totalAtletRes.value?.count ?? 0 : 0
    const totalCabor = totalCaborRes.status === 'fulfilled' ? totalCaborRes.value?.count ?? 0 : 0

    context += `INFO UMUM PORPROV XV JAWA BARAT 2026:\n`
    context += `- Total atlet terdaftar: ${totalAtlet} atlet\n`
    context += `- Total cabang olahraga: ${totalCabor} cabor\n`
    context += `- 27 kontingen dari seluruh kab/kota Jawa Barat\n`
    context += `- Penyelenggara: Kota Bekasi (Klaster I), Kota Bogor (Klaster II), Kota Depok (Klaster III)\n`
    context += `- Ibukota penyelenggara: Kabupaten Bogor — Cibinong\n\n`

    // ── 4. Cabor profil (global) ──────────────────────────
    const caborProfilRes = await sb
      .from('cabang_olahraga')
      .select('nama, total_atlet, atlet_putra, atlet_putri, avg_umur, gender_dominan, kategori')
      .order('total_atlet', { ascending: false })
      .limit(15)

    if (caborProfilRes.data && caborProfilRes.data.length > 0) {
      context += `TOP 15 CABOR PORPROV XV (by jumlah atlet):\n`
      caborProfilRes.data.forEach((c: any, i: number) => {
        context += `${i+1}. ${c.nama}: ${c.total_atlet} atlet (${c.atlet_putra}L/${c.atlet_putri}P), avg umur ${c.avg_umur}th, dominan: ${c.gender_dominan}\n`
      })
      context += '\n'
    }

  } catch (e) {
    console.error('[SIPA DB Error]', e)
    context += '(Sebagian data DB tidak tersedia)\n'
  }

  return context
}

// ── System prompt dinamis ─────────────────────────────────
function buildSystemPrompt(
  role: string,
  dbContext: string,
  kontingenId?: number | null
): string {
  const namaKontingen = kontingenId ? (DAERAH_LOKAL[kontingenId] ?? `Kontingen ID ${kontingenId}`) : 'semua kontingen'
  const roleDesc: Record<string, string> = {
    konida:          `Koordinator kontingen ${namaKontingen} — fokus pada data atlet, verifikasi, dan klasemen kontingen ini`,
    penyelenggara:   'Panitia penyelenggara — fokus pada venue, jadwal, incident, dan koordinasi lapangan',
    admin:           'Administrator sistem — akses penuh semua data',
    operator_cabor:  'Operator cabang olahraga — fokus pada data atlet dan hasil pertandingan cabor',
    atlet:           'Atlet/peserta — informasi jadwal, venue, dan peraturan',
    publik:          'Pengunjung/publik — informasi umum PORPROV XV',
  }

  return `Kamu adalah SIPA — Sistem Informasi Pintar PORPROV XV Jawa Barat 2026.
Kamu adalah asisten AI yang MEMILIKI AKSES LANGSUNG ke database real PORPROV XV.

IDENTITAS PENGGUNA:
- Role: ${roleDesc[role] ?? roleDesc['publik']}
- Kontingen: ${namaKontingen}

${dbContext}

INSTRUKSI PENTING:
1. SELALU gunakan data dari database di atas — jangan mengarang angka
2. Jika data ada di context, sebutkan angka SPESIFIK (bukan "beberapa" atau "banyak")
3. Jawab dalam Bahasa Indonesia yang natural dan informatif
4. Panjang jawaban: 3-6 kalimat untuk pertanyaan biasa, lebih panjang untuk analisis
5. Format angka Indonesia: 1.097 (pakai titik), bukan 1097
6. Untuk pertanyaan tentang kontingen sendiri → fokus ke data kontingen ${namaKontingen}
7. Untuk klasemen → gunakan data klasemen di atas dan sebutkan posisi kontingen ini
8. Jika ditanya sesuatu yang tidak ada di data → jujur bilang data belum tersedia
9. Tambahkan emoji yang relevan untuk membuat jawaban lebih menarik
10. Kalau ada data "atlet non-lokal", jelaskan ini adalah atlet yang KTP-nya bukan dari daerah kontingen`
}

// ── POST Handler ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message: string          = body.message ?? body.question ?? ''
    const role: string             = body.role ?? 'publik'
    const kontingenId: number|null = body.kontingen_id ?? null
    const history: { role: 'user'|'assistant'; content: string }[] = body.history ?? []

    if (!message.trim()) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 })
    }

    // Parallel: ambil DB context
    const dbContext    = await getDBContext(kontingenId, role)
    const systemPrompt = buildSystemPrompt(role, dbContext, kontingenId)

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ]

    const reply = await callGroq(messages)

    return NextResponse.json({ reply, answer: reply, role })
  } catch (e) {
    console.error('[SIPA Error]', e)
    return NextResponse.json({ error: 'SIPA tidak tersedia saat ini.' }, { status: 500 })
  }
}