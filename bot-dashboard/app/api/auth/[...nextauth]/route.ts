    // app/api/auth/[...nextauth]/route.ts
    import NextAuth, { Account, Profile, Session } from "next-auth";
    import DiscordProvider from "next-auth/providers/discord";
    import { JWT } from "next-auth/jwt";
    import { authOptions } from "../../../lib/auth"; // authOptions'ı içe aktar

    // Discord API izinleri (scopes) hakkında daha fazla bilgi için:
    // https://discord.com/developers/docs/topics/oauth2#bot-scopes
    // https://discord.com/developers/docs/topics/oauth2#authorization-scopes
    // Bu kısım çok önemli: guilds ve guilds.members.read kapsamları olmalı!
    const scopes = ['identify', 'email', 'guilds', 'guilds.members.read']; // BURAYI KONTROL ET

    // NextAuth yapılandırma seçenekleri
    export const authOptions = {
      // Kimlik doğrulama sağlayıcılarını yapılandırın
      providers: [
        DiscordProvider({
          clientId: process.env.DISCORD_CLIENT_ID!,
          clientSecret: process.env.DISCORD_CLIENT_SECRET!,
          authorization: { params: { scope: scopes.join(' ') } }, // Kapsamlar burada kullanılıyor
        }),
      ],
      // ... (diğer ayarlar)
      callbacks: {
        async jwt({ token, account, profile }: { token: JWT; account: Account | null; profile?: Profile }) {
          if (account) {
            token.accessToken = account.access_token;
            token.id = profile?.id;
          }
          return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
          session.accessToken = token.accessToken as string | undefined;
          session.user.id = token.id as string | undefined;
          return session;
        }
      },
      debug: process.env.NODE_ENV === 'development',
    };

    const handler = NextAuth(authOptions);
    export { handler as GET, handler as POST };
    