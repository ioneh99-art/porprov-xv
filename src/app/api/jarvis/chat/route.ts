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
function nextKey() { const k = GROQ_KEYS[keyIdx % GROQ_KEYS.length]; keyIdx++; return k }

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

    // Fetch recent open issues for context
    const { data: recentIssues } = await sb
      .from('jarvis_issues')
      .select('severity,title,description')
      .eq('kontingen_id', kontingenId)
      .eq('status', 'open')
      .order('detected_at', { ascending: false })
      .limit(10)

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

OPEN ISSUES TERDETEKSI (dari scan validator):
${recentIssues?.length ? recentIssues.map((i: any) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`).join('\n') : 'Tidak ada open issue saat ini.'}

DATA ATLET DITOLAK ADMIN (sample real dari DB):
${ditolakCtx}
Catatan penting: SEMUA 53 atlet ditolak memiliki catatan_verifikasi = NULL. Ini adalah data demo yang di-seed, bukan penolakan operasional nyata.

ATURAN KERAS — WAJIB DIPATUHI:
1. DILARANG KERAS menyebut nama atlet, NIK, atau data spesifik yang TIDAK ADA dalam konteks di atas
2. Kalau ditanya nama-nama atlet bermasalah tapi tidak ada di konteks, jawab JUJUR: "Gw tidak punya data detail itu di konteks saat ini, bos. Coba trigger re-scan dulu atau cek langsung di halaman Atlet."
3. JANGAN mengarang, mengira-ngira, atau mengisi dengan contoh fiktif
4. Hanya berikan info yang bisa diverifikasi dari open issues atau data sample di atas

GAYA:
- Bahasa Indonesia casual, panggil "bos"
- To the point, tidak bertele-tele
- Sarankan action konkret
- Jangan auto-fix — semua via approval Iwan
- Maksimal 3 paragraf pendek`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message },
    ]

    const apiKey = nextKey()
    if (!apiKey) return NextResponse.json({ success: false, error: 'GROQ_API_KEY tidak tersedia' }, { status: 500 })

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 600,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq error ${res.status}: ${err}`)
    }

    const groqData = await res.json()
    const response = groqData.choices?.[0]?.message?.content?.trim() || ''
    const tokensUsed = groqData.usage?.total_tokens || 0

    // Save assistant response
    await sb.from('jarvis_chat_history').insert({
      session_id: sessionId,
      role: 'assistant',
      content: response,
      current_page: currentPage,
      ai_model: 'groq-llama-3.3-70b',
      tokens_used: tokensUsed,
    })

    return NextResponse.json({ success: true, response, timestamp: new Date().toISOString() })
  } catch (error: any) {
    console.error('Jarvis chat error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
