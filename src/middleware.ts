import {auth} from "@/auth"
import {NextResponse} from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')

    if (isAdminRoute && !isLoggedIn) {
        return NextResponse.redirect(new URL('/auth', req.nextUrl))
    }
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}