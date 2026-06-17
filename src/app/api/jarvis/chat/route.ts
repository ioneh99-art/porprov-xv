import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[]

let keyIdx = 0
function nextGroqKey() { const k = GROQ_KEYS[keyIdx % GROQ_KEYS.length]; keyIdx++; return k }

// Panggil Anthropic Claude (primary)
async function callClaude(systemPrompt: string, msgs: { role: string; content: string }[]) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY tidak tersedia')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   msgs,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return {
    text:       (data.content?.[0]?.text || '').trim(),
    tokens:     (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    model_used: 'claude-haiku-4-5',
  }
}

// Fallback ke Groq jika Claude gagal
async function callGroq(systemPrompt: string, msgs: { role: string; content: string }[]) {
  const key = nextGroqKey()
  if (!key) throw new Error('GROQ_API_KEY tidak tersedia')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'system', content: systemPrompt }, ...msgs],
      temperature: 0.7,
      max_tokens:  900,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return {
    text:       (data.choices?.[0]?.message?.content || '').trim(),
    tokens:     data.usage?.total_tokens || 0,
    model_used: 'groq-llama-3.3-70b',
  }
}

const ISSUE_TYPE_LABEL: Record<string, string> = {
  nik_format:             'NIK format tidak valid',
  nik_birthdate_mismatch: 'NIK vs tanggal lahir tidak cocok',
  nik_gender_mismatch:    'NIK vs gender tidak cocok',
  duplicate_name:         'Nama duplikat',
  duplicate_nik:          'NIK duplikat',
  cabor_null:             'Cabor belum diisi (cabor_id NULL)',
  sync_mismatch:          'Data tidak sinkron (verified tapi cabor NULL)',
  required_field:         'Field wajib kosong',
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, currentPage, kontingenId, contextData } = await req.json()
    if (!message) return NextResponse.json({ success: false, error: 'message required' }, { status: 400 })

    // Save user message
    await sb.from('jarvis_chat_history').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
      current_page: currentPage,
      current_data_snapshot: contextData ?? null,
    })

    // Fetch last 6 chat messages for context
    const { data: history } = await sb
      .from('jarvis_chat_history')
      .select('role,content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(6)

    const historyMessages = (history || []).reverse().map((h: any) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }))

    // Fetch summary per issue_type (semua open issues, bukan hanya 10)
    const { data: allOpen } = await sb
      .from('jarvis_issues')
      .select('issue_type,severity,title')
      .eq('kontingen_id', kontingenId)
      .eq('status', 'open')
      .order('detected_at', { ascending: false })

    // Group by issue_type
    const byType: Record<string, { count: number; severity: string; samples: string[] }> = {}
    for (const row of allOpen || []) {
      if (!byType[row.issue_type]) {
        byType[row.issue_type] = { count: 0, severity: row.severity, samples: [] }
      }
      byType[row.issue_type].count++
      if (byType[row.issue_type].samples.length < 5) {
        // Extract athlete name from title (format: "NIK tidak valid: Nama Atlet" or similar)
        const name = row.title.includes(':') ? row.title.split(':').slice(1).join(':').trim() : row.title
        if (!byType[row.issue_type].samples.includes(name)) {
          byType[row.issue_type].samples.push(name)
        }
      }
    }

    const totalOpen = (allOpen || []).length
    const issueCtx = totalOpen === 0
      ? 'Tidak ada open issue saat ini. Data Kab. Bandung bersih.'
      : `Total: ${totalOpen} open issues.\n` +
        Object.entries(byType).map(([type, info]) => {
          const label = ISSUE_TYPE_LABEL[type] || type
          const samples = info.samples.length > 0 ? `\n    Contoh: ${info.samples.join(', ')}` : ''
          return `  - [${info.severity.toUpperCase()}] ${label}: ${info.count} kasus${samples}`
        }).join('\n')

    // Fetch SEMUA atlet ditolak (max 100, aktual hanya 53)
    const { data: ditolakAll, count: ditolakTotal } = await sb
      .from('atlet')
      .select('nama_lengkap, cabor_nama_raw, catatan_verifikasi, no_ktp', { count: 'exact' })
      .eq('kontingen_id', kontingenId)
      .eq('status_registrasi', 'Ditolak Admin')
      .order('cabor_nama_raw')
      .limit(100)

    const ditolakCtx = ditolakAll?.length
      ? `Total: ${ditolakTotal} atlet ditolak. Daftar lengkap:\n` +
        ditolakAll.map((a: any) =>
          `  - ${a.nama_lengkap} (${a.cabor_nama_raw}) | NIK: ${a.no_ktp || 'kosong'} | Catatan: ${a.catatan_verifikasi || 'NULL — tidak ada alasan penolakan'}`
        ).join('\n')
      : 'Tidak ada data atlet ditolak.'

    const systemPrompt = `Kamu adalah Jarvis, AI QA companion untuk PORPROV XV - Kabupaten Bandung.

KONTEKS:
- Page saat ini: ${currentPage || 'unknown'}
- Kontingen: KAB. BANDUNG (kontingen_id: ${kontingenId})
- User: Iwan (developer/superadmin)

OPEN ISSUES TERDETEKSI (dari scan QA validator — data REAL):
${issueCtx}

DATA ATLET DITOLAK ADMIN (data REAL dari DB):
${ditolakCtx}
Catatan penting: SEMUA ${ditolakTotal || 0} atlet ditolak memiliki catatan_verifikasi = NULL. Ini adalah data demo yang di-seed, bukan penolakan operasional nyata.

KEMAMPUAN EXPORT EXCEL:
Kamu bisa generate laporan Excel untuk bos. Kalau bos minta laporan/export/download data, sertakan tag DOWNLOAD di respons kamu (langsung di dalam teks, jangan dibungkus backtick atau kode).

Tag yang tersedia:
- [DOWNLOAD:ditolak:Laporan Atlet Ditolak Admin] → daftar 53 atlet ditolak
- [DOWNLOAD:nik_issues:Laporan Masalah NIK] → semua issue NIK (format, gender, tanggal lahir)
- [DOWNLOAD:cabor_null:Laporan Atlet Cabor Null] → atlet verified tapi cabor_id NULL
- [DOWNLOAD:all_issues:Laporan Semua Open Issues] → seluruh issues aktif
- [DOWNLOAD:summary:Laporan Summary QA] → rekap jumlah per tipe masalah

Contoh respons kalau bos minta laporan ditolak:
"Siap bos, ini laporan atlet yang ditolak admin:
[DOWNLOAD:ditolak:Laporan Atlet Ditolak Admin]"

Contoh kalau bos minta semua laporan:
"Ini bos, semua pilihan laporan yang tersedia:
[DOWNLOAD:summary:Laporan Summary QA]
[DOWNLOAD:all_issues:Laporan Semua Open Issues]
[DOWNLOAD:ditolak:Laporan Atlet Ditolak Admin]
[DOWNLOAD:nik_issues:Laporan Masalah NIK]
[DOWNLOAD:cabor_null:Laporan Atlet Cabor Null]"

ATURAN KERAS — WAJIB DIPATUHI:
1. Semua data di atas (issue types, counts, sample names, list ditolak) adalah DATA REAL dari DB
2. Kamu BOLEH dan HARUS menyebut nama-nama atlet yang ada di konteks saat ditanya
3. Yang DILARANG adalah mengarang nama, NIK, atau detail yang TIDAK ADA dalam konteks di atas
4. Kalau ditanya data yang tidak ada di konteks (misal: atlet spesifik di luar list ini), jawab: "Data itu tidak ada di konteksku sekarang, bos"
5. Jangan bilang "tidak bisa menyebutkan nama karena aturan" — kamu BISA sebut nama kalau datanya ada di konteks
6. Tag DOWNLOAD ditulis persis seperti contoh di atas — tidak pakai backtick, tidak dimodifikasi

GAYA:
- Bahasa Indonesia casual, panggil "bos"
- To the point, tidak bertele-tele
- Sarankan action konkret
- Jangan auto-fix — semua via approval Iwan
- Maksimal 3 paragraf pendek`

    // Messages untuk LLM (tanpa system — sistem prompt dikirim terpisah untuk Anthropic)
    const llmMessages = [
      ...historyMessages,
      { role: 'user', content: message },
    ]

    // Coba Claude dulu, fallback ke Groq
    let result: { text: string; tokens: number; model_used: string }
    try {
      result = await callClaude(systemPrompt, llmMessages)
    } catch (claudeErr: any) {
      console.warn('Claude gagal, fallback ke Groq:', claudeErr.message)
      result = await callGroq(systemPrompt, llmMessages)
    }

    const { text: response, tokens: tokensUsed, model_used } = result

    // Save assistant response
    await sb.from('jarvis_chat_history').insert({
      session_id: sessionId,
      role: 'assistant',
      content: response,
      current_page: currentPage,
      ai_model: model_used,
      tokens_used: tokensUsed,
    })

    return NextResponse.json({ success: true, response, timestamp: new Date().toISOString() })
  } catch (error: any) {
    console.error('Jarvis chat error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
