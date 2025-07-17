// app/types/next-auth.d.ts

// `next-auth` modülünü genişletiyoruz
import { DefaultSession, DefaultJWT, Profile as NextAuthProfile } from "next-auth";

// `next-auth` modülüne yeni tipler ekliyoruz
declare module "next-auth" {
  /**
   * `useSession`, `getSession` tarafından döndürülen ve `SessionProvider` React Context'inde prop olarak alınan oturum arayüzü.
   * Buraya özel verilerimizi (örneğin Discord'dan gelen `accessToken` ve `id`) ekliyoruz.
   */
  interface Session {
    accessToken?: string; // Discord API'ye istek yapmak için erişim token'ı
    user: {
      id?: string; // Discord kullanıcı ID'si
    } & DefaultSession["user"]; // Varsayılan kullanıcı özelliklerini korurken id ekleriz
  }

  /**
   * `jwt` callback'i ve `getToken` tarafından döndürülen ve `session` callback'i tarafından kullanılan JWT arayüzü.
   * Buraya da özel verilerimizi ekliyoruz.
   */
  interface JWT extends DefaultJWT {
    accessToken?: string; // JWT'ye erişim token'ı ekleriz
    id?: string; // JWT'ye kullanıcı ID'si ekleriz
  }

  /**
   * OAuth sağlayıcısından gelen ham profil nesnesini temsil eden `Profile` arayüzü.
   * Özellikle Discord gibi sağlayıcılardan gelen `id` özelliğini tanımak için genişletiyoruz.
   */
  interface Profile extends NextAuthProfile {
    id?: string; // Discord profilinden gelen kullanıcı ID'si
  }
}
