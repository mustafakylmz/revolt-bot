// app/api/auth/[...nextauth]/route.ts
import NextAuth, { Account, Profile, Session } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { JWT } from "next-auth/jwt";

// Discord API izinleri (scopes) hakkında daha fazla bilgi için:
// https://discord.com/developers/docs/topics/oauth2#bot-scopes
// https://discord.com/developers/docs/topics/oauth2#authorization-scopes
const scopes = ['identify', 'email', 'guilds', 'guilds.members.read'];

// NextAuth yapılandırma seçenekleri
const authOptions = {
  // Kimlik doğrulama sağlayıcılarını yapılandırın
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: scopes.join(' ') } },
    }),
  ],
  // Oturum ve geri arama (callback) ayarları
  callbacks: {
    // JWT (JSON Web Token) oluşturulduğunda veya güncellendiğinde çalışır
    async jwt({ token, account, profile }: { token: JWT; account: Account | null; profile?: Profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.id = profile?.id;
      }
      return token;
    },
    // Oturum nesnesi oluşturulduğunda veya güncellendiğinde çalışır
    async session({ session, token }: { session: Session; token: JWT }) {
      // Oturum nesnesine token'daki bilgileri ekle
      // token.accessToken'ı string olarak cast ediyoruz
      session.accessToken = token.accessToken as string | undefined;
      session.user.id = token.id as string | undefined; // id'yi de string olarak cast ediyoruz
      return session;
    }
  },
  // Geliştirme modunda hata ayıklama bilgilerini konsola yazdırır
  debug: process.env.NODE_ENV === 'development',
};

// NextAuth handler'ını oluştur
const handler = NextAuth(authOptions);

// GET ve POST isteklerini NextAuth handler'ına yönlendir
export { handler as GET, handler as POST };
