import { NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'arteria_admin_session'

export function middleware(req) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (req.nextUrl.searchParams.get('login') === '1') {
      return NextResponse.next()
    }
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value
    if (!sessionCookie) {
      const loginUrl = new URL('/admin', req.url)
      loginUrl.searchParams.set('login', '1')
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
