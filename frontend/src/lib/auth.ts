import NextAuth, { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@axon.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';
                console.log(`[AUTH DEBUG] Attempting login to: ${apiUrl}/api/login`);

                try {
                    const res = await fetch(`${apiUrl}/api/login`, {
                        method: 'POST',
                        body: JSON.stringify(credentials),
                        headers: { "Content-Type": "application/json" }
                    })

                    console.log(`[AUTH DEBUG] Response Status: ${res.status}`);
                    const user = await res.json()

                    if (res.ok && user) {
                        console.log(`[AUTH DEBUG] Login successful for: ${credentials.email}`);
                        return user
                    }
                    
                    console.warn(`[AUTH DEBUG] Login failed for: ${credentials.email}. Status: ${res.status}`);
                    return null
                } catch (error) {
                    console.error("[AUTH DEBUG] Critical fetch error:", error);
                    return null
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async session({ session, token }: any) {
            if (session.user) {
                (session.user as any).id = token.sub
                (session.user as any).role = token.role
                (session.user as any).department = token.department
            }
            return session
        },
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role
                token.department = user.department
            }
            return token
        }
    },
    pages: {
        signIn: '/login',
    }
}

const handler = NextAuth(authOptions)
export const handlers = { GET: handler, POST: handler }

