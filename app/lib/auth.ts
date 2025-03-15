import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";

// Extend the Session type to include user ID
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // For production, replace with your actual Google and GitHub credentials
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "dummy-client-id",
      clientSecret: process.env.GITHUB_SECRET || "dummy-client-secret",
    }),
    // Add credentials provider for email/password login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // For demo purposes, allow any login with matching password
        // In production, replace with actual user verification
        if (credentials?.email && credentials?.password === "password") {
          try {
            // Check if user exists, if not create them
            let user = await prisma.user.findUnique({
              where: { email: credentials.email },
            });

            if (!user) {
              // Create a new user if they don't exist
              user = await prisma.user.create({
                data: {
                  email: credentials.email,
                  name: "Demo User",
                },
              });
              console.log("Created new user:", user);
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
            };
          } catch (error) {
            console.error("Error in authorize callback:", error);
            return null;
          }
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
