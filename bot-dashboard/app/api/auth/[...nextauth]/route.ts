// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// Discord API izinleri (scopes) hakkında daha fazla bilgi için:
// https://discord.com/developers/docs/topics/oauth2#bot-scopes
// https://discord.com/developers/docs/topics/oauth2#authorization-scopes
const scopes = ['identify', 'email', 'guilds', 'guilds.members.read'];

// NextAuth yapılandırma seçenekleri
const authOptions = { // authOptions değişkenini dışa aktarmıyoruz, sadece burada tanımlıyoruz
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
    async jwt({ token, account, profile }) {
      // İlk girişte (account ve profile mevcutsa) token'a Discord bilgilerini ekle
      if (account) {
        token.accessToken = account.access_token;
        token.id = profile?.id; // Discord kullanıcı ID'si
      }
      return token;
    },
    // Oturum nesnesi oluşturulduğunda veya güncellendiğinde çalışır
    async session({ session, token }) {
      // Oturum nesnesine token'daki bilgileri ekle
      session.accessToken = token.accessToken;
      session.user.id = token.id;
      return session;
    }
  },
  // Geliştirme modunda hata ayıklama bilgilerini konsola yazdırır
  debug: process.env.NODE_ENV === 'development',
};

// NextAuth handler'ını oluştur
// Bu kısımda bir değişiklik yok, handler hala dışa aktarılıyor.
const handler = NextAuth(authOptions);

// GET ve POST isteklerini NextAuth handler'ına yönlendir
export { handler as GET, handler as POST };
