// src/app/api/sport-intel/route.ts
// Hybrid LLM endpoint:
//   - 'chat' | 'insights' | 'athlete' → Groq (fast)
//   - 'brief' → Claude (deep reasoning)

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchSportIntelContext, formatContextForLLM,
  SYSTEM_PROMPT_BASE, SYSTEM_PROMPT_BRIEF,
  SYSTEM_PROMPT_INSIGHTS, SYSTEM_PROMPT_ATHLETE,
} from '@/lib/sport-intel-context'

// ── Provider configs ────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'  // fast & smart enough untuk Q&A
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_MODEL = 'claude-sonnet-4-6'  // for deep reasoning

// ── Groq key rotation (3 keys for rate limit resilience) ──
function getGroqKey(): string {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[]
  if (keys.length === 0) throw new Error('No GROQ keys configured')
  return keys[Math.floor(Math.random() * keys.length)]
}

// ── Groq call ──────────────────────────────────────────
async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getGroqKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Groq error ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ── Claude call ────────────────────────────────────────
async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('No ANTHROPIC_API_KEY configured')

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':       'application/json',
      'x-api-key':          apiKey,
      'anthropic-version':  '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude error ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ── POST handler ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, message, atletName, kontingenId = 1 } = body

    if (!mode) {
      return NextResponse.json({ error: 'mode is required' }, { status: 400 })
    }

    // 1. Fetch context (real-time data)
    const ctx = await fetchSportIntelContext(kontingenId)
    const contextText = formatContextForLLM(ctx)

    // 2. Route by mode
    let reply: string
    let provider: 'groq' | 'claude' = 'groq'

    switch (mode) {
      case 'chat': {
        if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })
        const userPrompt = `${contextText}\n\n---\n\nPertanyaan pengurus: ${message}`
        // Allow override: user can pick Claude for chat
        const useProvider = body.provider === 'claude' ? 'claude' : 'groq'
        if (useProvider === 'claude') {
          try {
            reply = await callClaude(SYSTEM_PROMPT_BASE, userPrompt)
            provider = 'claude'
          } catch {
            reply = await callGroq(SYSTEM_PROMPT_BASE, userPrompt)
            provider = 'groq'
          }
        } else {
          reply = await callGroq(SYSTEM_PROMPT_BASE, userPrompt)
          provider = 'groq'
        }
        break
      }
      case 'insights': {
        const userPrompt = `${contextText}\n\n---\n\nGenerate 5 insights strategis dari data di atas.`
        reply = await callGroq(SYSTEM_PROMPT_INSIGHTS, userPrompt)
        provider = 'groq'
        break
      }
      case 'athlete': {
        if (!atletName) return NextResponse.json({ error: 'atletName required' }, { status: 400 })
        // Find atlet in context
        const atlet = ctx.topPerformers.find(p => p.nama.toLowerCase().includes(atletName.toLowerCase()))
                   || ctx.lowPerformers.find(p => p.nama.toLowerCase().includes(atletName.toLowerCase()))
        if (!atlet) {
          return NextResponse.json({
            error: `Atlet "${atletName}" tidak ditemukan di data tes fisik`,
          }, { status: 404 })
        }
        const userPrompt = `${contextText}\n\n---\n\nBuat analisis untuk atlet: ${JSON.stringify(atlet)}`
        reply = await callGroq(SYSTEM_PROMPT_ATHLETE, userPrompt)
        provider = 'groq'
        break
      }
      case 'brief': {
        const userPrompt = `${contextText}\n\n---\n\nBuat strategic brief untuk meeting pengurus hari ini.`
        try {
          reply = await callClaude(SYSTEM_PROMPT_BRIEF, userPrompt)
          provider = 'claude'
        } catch {
          // Fallback to Groq if Claude is unavailable (credits, rate limit, etc.)
          reply = await callGroq(SYSTEM_PROMPT_BRIEF, userPrompt)
          provider = 'groq'
        }
        break
      }
      default:
        return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 })
    }

    return NextResponse.json({
      reply,
      provider,
      mode,
      context_summary: {
        total_atlet: ctx.kontingen.total_atlet,
        rank: ctx.kontingen.rank,
        top_atlet_count: ctx.topPerformers.length,
        cabor_critical: ctx.caborStats.filter(c => c.status === 'critical').length,
      },
    })
  } catch (e: any) {
    console.error('[sport-intel]', e)
    return NextResponse.json({
      error: e.message || 'Internal error',
    }, { status: 500 })
  }
}
