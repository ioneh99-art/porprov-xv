import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Ambil konteks data untuk AI
async function getDataContext() {
  const [
    { data: atletStats },
    { data: kontingenList },
    { data: caborList },
    { data: medali },
  ] = await Promise.all([
    sb().from('atlet').select('gender, status_registrasi, kontingen_id, cabor_id, kontingen(nama), cabang_olahraga(nama)'),
    sb().from('kontingen').select('id, nama').order('nama'),
    sb().from('cabang_olahraga').select('id, nama, kode').eq('is_active', true).order('nama'),
    sb().from('klasemen_medali').select('*, kontingen(nama)').order('emas', { ascending: false }).limit(10),
  ])

  const atlet = atletStats ?? []
  const total = atlet.length
  const putra = atlet.filter((a: any) => a.gender === 'L').length
  const putri = atlet.filter((a: any) => a.gender === 'P').length
  const draft = atlet.filter((a: any) => a.status_registrasi === 'Draft').length
  const menunggu = atlet.filter((a: any) => a.status_registrasi?.includes('Menunggu')).length
  const verified = atlet.filter((a: any) => a.status_registrasi === 'Verified').length
  const posted = atlet.filter((a: any) => a.status_registrasi === 'Posted').length
  const ditolak = atlet.filter((a: any) => a.status_registrasi?.includes('Ditolak')).length

  // Per kontingen
  const perKontingen = (kontingenList ?? []).map((k: any) => {
    const atletK = atlet.filter((a: any) => a.kontingen_id === k.id)
    return {
      nama: k.nama,
      total: atletK.length,
      putra: atletK.filter((a: any) => a.gender === 'L').length,
      putri: atletK.filter((a: any) => a.gender === 'P').length,
      verified: atletK.filter((a: any) => a.status_registrasi === 'Verified').length,
      posted: atletK.filter((a: any) => a.status_registrasi === 'Posted').length,
      menunggu: atletK.filter((a: any) => a.status_registrasi?.includes('Menunggu')).length,
      ditolak: atletK.filter((a: any) => a.status_registrasi?.includes('Ditolak')).length,
    }
  }).filter(k => k.total > 0).sort((a, b) => b.total - a.total)

  // Per cabor
  const perCabor = (caborList ?? []).map((c: any) => {
    const atletC = atlet.filter((a: any) => a.cabor_id === c.id)
    return {
      nama: c.nama,
      kode: c.kode,
      total: atletC.length,
      putra: atletC.filter((a: any) => a.gender === 'L').length,
      putri: atletC.filter((a: any) => a.gender === 'P').length,
    }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return {
    ringkasan: { total, putra, putri, draft, menunggu, verified, posted, ditolak },
    perKontingen,
    perCabor: perCabor.slice(0, 30),
    klasemenMedali: (medali ?? []).map((m: any) => ({
      kontingen: m.kontingen?.nama,
      emas: m.emas,
      perak: m.perak,
      perunggu: m.perunggu,
      total: m.total,
    })),
  }
}

export async function POST(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = JSON.parse(session)
  const { question, history } = await req.json()

  if (!question) return NextResponse.json({ error: 'Pertanyaan kosong' }, { status: 400 })

  try {
    // Ambil data real dari database
    const ctx = await getDataContext()

    const systemPrompt = `Kamu adalah SIPA Intelligence — Asisten AI Analitik resmi PORPROV XV Jawa Barat 2026.
Kamu membantu ${user.nama} (${user.role}) menganalisa data atlet dan pertandingan PORPROV XV.

KEMAMPUAN KAMU:
- Jawab pertanyaan tentang data atlet, kontingen, cabor, dan klasemen
- Analisa statistik dan tren
- Berikan rekomendasi berdasarkan data
- Bandingkan performa antar kontingen/cabor
- Prediksi potensi medali berdasarkan jumlah atlet

FORMAT JAWABAN:
- Gunakan Bahasa Indonesia yang jelas dan profesional
- Sertakan angka spesifik dari data
- Gunakan bullet point untuk daftar
- Tambahkan insight/analisa singkat setelah data
- Jika pertanyaan tidak bisa dijawab dari data yang ada, katakan dengan jujur

DATA REAL SISTEM PORPROV XV (diperbarui saat ini):
${JSON.stringify(ctx, null, 2)}

CATATAN PENTING:
- Data ini adalah data real-time dari sistem
- Jawab hanya berdasarkan data yang tersedia
- Jika ditanya tentang hal yang tidak ada di data, arahkan ke fitur sistem yang relevan`

    const messages = [
      ...(history ?? []).slice(-6).map((h: any) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: question },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      // Cek apakah error karena credit habis
      if (err?.error?.type === 'invalid_request_error' &&
          err?.error?.message?.includes('credit')) {
        return NextResponse.json({
          error: 'credit_insufficient',
          message: 'Anthropic API credit habis. Silakan top up di console.anthropic.com'
        }, { status: 402 })
      }
      throw new Error(err?.error?.message ?? 'AI error')
    }

    const data = await response.json()
    const answer = data.content?.[0]?.text ?? 'Maaf, tidak ada jawaban.'

    return NextResponse.json({ answer, context: ctx.ringkasan })

  } catch (e: any) {
    console.error('AI NLQ error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}