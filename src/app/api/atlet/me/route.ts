import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = req.cookies.get('porprov_atlet_session')?.value
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const user = JSON.parse(session)
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}