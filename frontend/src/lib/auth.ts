import CredentialsProvider from "next-auth/providers/credentials"
import { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
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
        strategy: "jwt" as const,
    },
    callbacks: {
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.sub
                session.user.role = token.role
                session.user.department = token.department
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
