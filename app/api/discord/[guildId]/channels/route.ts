// app/api/discord/[guildId]/channels/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { Routes } from 'discord-api-types/v10';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return new Response(JSON.stringify({ message: "Yetkisiz" }), { status: 401 });
    }

    const { guildId } = params;

    // Bot token kullan - daha güvenilir
    const botToken = process.env.BOT_TOKEN!;

    // Discord API'den sunucu kanallarını al
    const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ message: "Kanallar alınamadı.", error: errorData }), { status: response.status });
    }

    const channels = await response.json();

    // Sadece text kanallarını filtrele (GUILD_TEXT = 0, GUILD_ANNOUNCEMENT = 5)
    const textChannels = channels
      .filter((ch: any) => ch.type === 0 || ch.type === 5)
      .map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        parentId: ch.parent_id,
      }))
      .sort((a: any, b: any) => {
        // Kategorilere göre grupla veya alfabetik sırala
        if (a.parentId && b.parentId) {
          return a.parentId.localeCompare(b.parentId) || a.name.localeCompare(b.name);
        }
        if (a.parentId) return 1;
        if (b.parentId) return -1;
        return a.name.localeCompare(b.name);
      });

    return new Response(JSON.stringify({ channels: textChannels }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Kanal listesini alırken beklenmeyen hata:", error);
    return new Response(JSON.stringify({ message: "Sunucu tarafı hatası." }), { status: 500 });
  }
}
