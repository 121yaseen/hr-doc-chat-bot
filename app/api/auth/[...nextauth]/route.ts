import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Create the NextAuth handler
const handler = NextAuth(authOptions);

// Export the GET and POST functions with proper typing
export { handler as GET, handler as POST };
