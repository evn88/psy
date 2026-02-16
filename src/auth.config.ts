import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/auth',
    },
    providers: [],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
             // We can allow the middleware to handle the redirection logic largely, 
             // or put it here. For now, let's keep simple true/false here or 
             // let the middleware use its own logic on the session.
             // Returning true means "let the request pass" (or let middleware handle it).
             return true 
        },
        jwt({ token, user, trigger, session }) {
            if (user && user.role) {
                token.role = user.role
            }
             // Handle session update
            if (trigger === "update" && session?.name) {
                token.name = session.name
            }
            return token
        },
        session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (token.role && session.user) {
                session.user.role = token.role
            }
            return session
        }
    }
} satisfies NextAuthConfig
