// app/lib/auth.ts
import { AuthOptions, Account, Profile, Session } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { JWT } from "next-auth/jwt";

// Discord API izinleri (scopes) hakkında daha fazla bilgi için:
// https://discord.com/developers/docs/topics/oauth2#bot-scopes
// https://discord.com/developers/docs/topics/oauth2#authorization-scopes
const scopes = ['identify', 'email', 'guilds', 'guilds.members.read'];

// NextAuth yapılandırma seçenekleri
// Bu dosyadan dışa aktarıyoruz, böylece route.ts dosyaları bunu içe aktarabilir.
export const authOptions: AuthOptions = {
  // Kimlik doğrulama sağlayıcılarını yapılandırın
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: scopes.join(' ') } },
    }),
    // Gelecekte başka sağlayıcılar (Google, GitHub vb.) eklenebilir
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
      session.accessToken = token.accessToken as string | undefined;
      session.user.id = token.id as string | undefined;
      return session;
    }
  },
  // Geliştirme modunda hata ayıklama bilgilerini konsola yazdırır
  debug: process.env.NODE_ENV === 'development',
};
