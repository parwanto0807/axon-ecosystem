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

                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
                        method: 'POST',
                        body: JSON.stringify(credentials),
                        headers: { "Content-Type": "application/json" }
                    })

                    const user = await res.json()

                    if (res.ok && user) {
                        return user
                    }
                    return null
                } catch (error) {
                    console.error("Auth error:", error)
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
