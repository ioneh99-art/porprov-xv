import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  return NextResponse.json({
    host:             req.headers.get('host'),
    x_forwarded_host: req.headers.get('x-forwarded-host'),
    x_forwarded_for:  req.headers.get('x-forwarded-for'),
    url:              req.url,
  })
}
