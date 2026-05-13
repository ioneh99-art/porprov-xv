// src/app/api/chatbot/route.ts
// ChatbotWidget backend — Groq auto-rotation
import { NextRequest, NextResponse } from 'next/server'

async function callGroq(messages: any[]): Promise<string> {
  const providers = [
    { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY,    model: 'llama-3.3-70b-versatile' },
    { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY_2,  model: 'llama-3.3-70b-versatile' },
    { url: 'https://api.cerebras.ai/v1/chat/completions',     key: process.env.CEREBRAS_API_KEY, model: 'llama-3.3-70b' },
    { url: 'https://api.cerebras.ai/v1/chat/completions',     key: process.env.CEREBRAS_API_KEY_2, model: 'llama-3.3-70b' },
  ].filter(p => p.key)

  let lastErr = ''
  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({ model: p.model, max_tokens: 1024, temperature: 0.4, messages }),
      })
      if (res.status === 429) { lastErr = 'rate limit'; continue }
      if (!res.ok) { const e = await res.json(); lastErr = e?.error?.message ?? 'error'; continue }
      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? 'Maaf, tidak ada jawaban.'
    } catch (e: any) { lastErr = e.message; continue }
  }
  throw new Error(`AI tidak tersedia: ${lastErr}`)
}

const SYSTEM_PROMPTS: Record<string, string> = {
  admin: `Kamu adalah SIPA — Asisten AI PORPROV XV Jawa Barat 2026 untuk Admin.
Bantu admin mengoperasikan sistem: manajemen user, import data, konfigurasi kuota kualifikasi, verifikasi atlet, laporan sistem.
Jawab singkat, jelas, dalam Bahasa Indonesia. Maksimal 3-4 kalimat per jawaban.`,

  konida: `Kamu adalah SIPA — Asisten AI PORPROV XV Jawa Barat 2026 untuk KONIDA (Kontingen Daerah).
Bantu pengguna: input atlet, submit ke operator, daftar nomor pertandingan, cek status registrasi, upload dokumen.
Jawab singkat, ramah, dalam Bahasa Indonesia. Maksimal 3-4 kalimat per jawaban.`,

  operator_cabor: `Kamu adalah SIPA — Asisten AI PORPROV XV Jawa Barat 2026 untuk Operator Cabor.
Bantu operator: verifikasi atlet, input hasil pertandingan, konfirmasi lineup, validasi kejuaraan, kelola nomor pertandingan.
Jawab singkat, teknis, dalam Bahasa Indonesia. Maksimal 3-4 kalimat per jawaban.`,

  atlet: `Kamu adalah SIPA — Asisten AI PORPROV XV Jawa Barat 2026 untuk Atlet.
Bantu atlet: cek status registrasi, input riwayat kejuaraan, upload bukti prestasi, cek jadwal bertanding, info dokumen.
Jawab ramah, suportif, dalam Bahasa Indonesia. Maksimal 3-4 kalimat per jawaban.`,

  default: `Kamu adalah SIPA — Asisten AI PORPROV XV Jawa Barat 2026.
Bantu pengguna menggunakan sistem manajemen atlet dan pertandingan PORPROV XV.
Jawab singkat, jelas, dalam Bahasa Indonesia. Maksimal 3-4 kalimat per jawaban.`,
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, role, nama, kontingen, cabor, kontingen_id } = await req.json()
  if (!messages?.length) return NextResponse.json({ error: 'Messages kosong' }, { status: 400 })

  const systemContent = (SYSTEM_PROMPTS[role] ?? SYSTEM_PROMPTS.default)
    + (nama ? `\nNama pengguna: ${nama}.` : '')
    + (kontingen ? `\nKontingen: ${kontingen}.` : '')
    + (cabor ? `\nCabang olahraga: ${cabor}.` : '')

  try {
    const groqMessages = [
      { role: 'system', content: systemContent },
      ...messages.slice(-8).map((m: any) => ({ role: m.role, content: m.content })),
    ]

    const reply = await callGroq(groqMessages)
    return NextResponse.json({ reply })

  } catch (e: any) {
    console.error('Chatbot error:', e)
    return NextResponse.json({ reply: 'Maaf, SIPA AI sedang tidak tersedia. Coba lagi dalam beberapa saat! 🙏' })
  }
}