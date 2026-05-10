import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: NextRequest) {
  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'ioneh99@gmail.com',
      subject: 'Test Email PORPROV XV',
      html: '<h1>Test berhasil! 🎉</h1><p>Email dari sistem PORPROV XV Jawa Barat 2026</p>',
    })
    return NextResponse.json({ ok: true, result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}