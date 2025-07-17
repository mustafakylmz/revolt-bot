// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "../../../lib/auth"; // authOptions'ı yeni konumundan içe aktar

// NextAuth handler'ını oluştur
const handler = NextAuth(authOptions);

// GET ve POST isteklerini NextAuth handler'ına yönlendir
export { handler as GET, handler as POST };
