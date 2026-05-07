import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('porprov_session')?.value
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/login'
  const isApi = pathname.startsWith('/api')
  const isDashboard = pathname.startsWith('/dashboard')
  const isKonida = pathname.startsWith('/konida')
  const isOperator = pathname.startsWith('/operator')
  const isPublik = pathname.startsWith('/publik')
  const isPresentasi = pathname.startsWith('/presentasi')

if (isApi || isPublik || isPresentasi) return NextResponse.next()
  // Publik & API bebas akses tanpa login
  if (isApi || isPublik) return NextResponse.next()

  // Belum login
  if (!session) {
    if (isLoginPage) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  let user: { role: string } | null = null
  try {
    user = JSON.parse(session)
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.set('porprov_session', '', { maxAge: 0, path: '/' })
    return res
  }

  // Sudah login → redirect dari login page
  if (isLoginPage) {
    if (user?.role === 'admin') return NextResponse.redirect(new URL('/dashboard', req.url))
    if (user?.role === 'konida') return NextResponse.redirect(new URL('/konida/dashboard', req.url))
    if (user?.role === 'operator_cabor') return NextResponse.redirect(new URL('/operator/dashboard', req.url))
  }

  // Proteksi per role
  if (isDashboard && user?.role !== 'admin') {
    if (user?.role === 'konida') return NextResponse.redirect(new URL('/konida/dashboard', req.url))
    if (user?.role === 'operator_cabor') return NextResponse.redirect(new URL('/operator/dashboard', req.url))
  }

  if (isKonida && user?.role !== 'konida') {
    if (user?.role === 'admin') return NextResponse.redirect(new URL('/dashboard', req.url))
    if (user?.role === 'operator_cabor') return NextResponse.redirect(new URL('/operator/dashboard', req.url))
  }

  if (isOperator && user?.role !== 'operator_cabor') {
    if (user?.role === 'admin') return NextResponse.redirect(new URL('/dashboard', req.url))
    if (user?.role === 'konida') return NextResponse.redirect(new URL('/konida/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo-porprov.png|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico).*)'],
}