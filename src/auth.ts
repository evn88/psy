import NextAuth from "next-auth"
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/shared/lib/prisma"
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config"

async function getUser(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    providers: [
        Google,
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    
                    // Rate Limit Check
                    const now = new Date();
                    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                    const attempts = await prisma.loginAttempt.count({
                        where: {
                            email,
                            createdAt: { gt: oneHourAgo }
                        }
                    });

                    if (attempts >= 3) {
                        throw new Error("Too many login attempts. Please try again after 1 hour.");
                    }

                    const user = await getUser(email);
                    if (!user || !user.password) {
                         // Record failed attempt
                         await prisma.loginAttempt.create({ data: { email } });
                         return null;
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) return user;
                    
                    // Record failed attempt
                    await prisma.loginAttempt.create({ data: { email } });
                }
                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        // We can override/extend callbacks here if we need server-side specific logic (like refreshing role from DB)
        // BUT for now, let's rely on the token info to be safe and consistent with middleware.
        // If we really need DB refresh, we can add it here, but it won't run on Edge.
        // For simplicity and preventing "mixed behavior", let's stick to the authConfig callbacks 
        // which rely on the initial login token data.

        async signIn({ user, account, profile }) {
            if (user.email === "evn88fx64@gmail.com") {
                // Force ADMIN role in database if not already set
                // @ts-ignore
                if (user.role !== "ADMIN") {
                    await prisma.user.update({
                        where: { email: user.email },
                        data: { role: "ADMIN" },
                    });
                    // Update the user object in memory so the JWT callback sees the new role immediately
                    // @ts-ignore
                    user.role = "ADMIN";
                }
            }
            return true;
        }
    }
})