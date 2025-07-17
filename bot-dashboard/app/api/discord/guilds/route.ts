// app/api/discord/guilds/route.ts
import { getServerSession } from "next-auth"; // Sunucu tarafında oturum almak için
import { authOptions } from "../../auth/[...nextauth]/route"; // NextAuth yapılandırmasını içe aktar

// Discord API'den sunucuları getirmek için GET isteği işleyicisi
export async function GET() {
  try {
    // Sunucu tarafında oturum bilgisini al
    const session = await getServerSession(authOptions);

    // Oturum yoksa veya erişim token'ı yoksa yetkisiz yanıt döndür
    if (!session || !session.accessToken) {
      return new Response(JSON.stringify({ message: "Yetkisiz" }), { status: 401 });
    }

    // Discord API'den kullanıcının sunucularını getir
    // Botun değil, kullanıcının erişim token'ını kullanıyoruz
    const discordApiRes = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`, // Kullanıcının erişim token'ı
      },
    });

    // API yanıtı başarılı değilse hata döndür
    if (!discordApiRes.ok) {
      const errorData = await discordApiRes.json();
      console.error("Discord API'den sunucuları alırken hata:", errorData);
      return new Response(JSON.stringify({ message: "Discord sunucuları alınamadı.", error: errorData }), { status: discordApiRes.status });
    }

    // Sunucu verilerini JSON olarak al
    const guilds = await discordApiRes.json();

    // Sadece kullanıcının "MANAGE_GUILD" (Sunucuyu Yönet) iznine sahip olduğu sunucuları filtrele
    // MANAGE_GUILD izni değeri 0x20 (onaltılık) veya 32 (ondalık)
    // Discord izin bitmask'leri: https://discord.com/developers/docs/topics/permissions#permissions-bitwise-flags
    const MANAGE_GUILD_PERMISSION = 0x20; // 32

    const manageableGuilds = guilds.filter((guild: any) => {
      // Guild'in izinlerini kontrol et
      // `permissions` alanı string olarak gelebilir, bu yüzden BigInt'e dönüştürmek en güvenlisidir.
      const permissions = BigInt(guild.permissions);
      // Bitwise AND işlemi ile MANAGE_GUILD izninin olup olmadığını kontrol et
      return (permissions & BigInt(MANAGE_GUILD_PERMISSION)) === BigInt(MANAGE_GUILD_PERMISSION);
    });

    // Filtrelenmiş sunucuları döndür
    return new Response(JSON.stringify(manageableGuilds), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error("Sunucu listesini alırken beklenmeyen hata:", error);
    return new Response(JSON.stringify({ message: "Sunucu tarafı hatası." }), { status: 500 });
  }
}
