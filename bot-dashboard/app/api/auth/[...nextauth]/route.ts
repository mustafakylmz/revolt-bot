// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// Discord API izinleri (scopes) hakkında daha fazla bilgi için:
// https://discord.com/developers/docs/topics/oauth2#bot-scopes
// https://discord.com/developers/docs/topics/oauth2#authorization-scopes
// identify: Kullanıcının temel kimlik bilgilerini (kullanıcı adı, avatar) okuma yetkisi.
// email: Kullanıcının e-posta adresini almak için (isteğe bağlı).
// guilds: Kullanıcının bulunduğu sunucuları listeleme yetkisi (panelde sunucuları göstermek için kritik).
// guilds.members.read: Kullanıcının sunuculardaki üyelik bilgilerini (rolleri vb.) okumak için.
const scopes = ['identify', 'email', 'guilds', 'guilds.members.read'];

// NextAuth yapılandırma seçenekleri
export const authOptions = {
  // Kimlik doğrulama sağlayıcılarını yapılandırın
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!, // Ortam değişkeninden Discord Client ID
      clientSecret: process.env.DISCORD_CLIENT_SECRET!, // Ortam değişkeninden Discord Client Secret
      authorization: { params: { scope: scopes.join(' ') } }, // İstenen Discord API izinleri
    }),
    // Gelecekte başka sağlayıcılar (Google, GitHub vb.) eklenebilir
  ],
  // Oturum ve geri arama (callback) ayarları
  callbacks: {
    // JWT (JSON Web Token) oluşturulduğunda veya güncellendiğinde çalışır
    async jwt({ token, account, profile }) {
      // İlk girişte (account ve profile mevcutsa) token'a Discord bilgilerini ekle
      if (account) {
        token.accessToken = account.access_token; // Discord API'ye istek yapmak için erişim token'ı
        token.id = profile?.id; // Discord kullanıcı ID'si
      }
      return token;
    },
    // Oturum nesnesi oluşturulduğunda veya güncellendiğinde çalışır
    async session({ session, token }) {
      // Oturum nesnesine token'daki bilgileri ekle
      session.accessToken = token.accessToken; // Frontend'de Discord API çağrıları için
      session.user.id = token.id; // Frontend'de kullanıcının Discord ID'si
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
