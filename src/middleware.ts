import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  const isProfileRoute = req.nextUrl.pathname.startsWith('/profile')

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/profile', req.nextUrl))
    }
    return null
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth', req.nextUrl))
    }
    // @ts-ignore
    if (req.auth.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/profile', req.nextUrl))
    }
    return null
  }

  if (isProfileRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth', req.nextUrl))
    }
    return null
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}