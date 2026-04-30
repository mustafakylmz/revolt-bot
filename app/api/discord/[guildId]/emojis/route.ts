// app/api/discord/[guildId]/emojis/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return new Response(JSON.stringify({ message: "Yetkisiz" }), { status: 401 });
    }

    const { guildId } = params;

    // Bot token kullan
    const botToken = process.env.BOT_TOKEN!;

    // Discord API'den sunucu emojilerini al
    const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/emojis`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ message: "Emojiler alınamadı.", error: errorData }), { status: response.status });
    }

    const emojis = await response.json();

    // Emoji listesini düzenle
    const formattedEmojis = emojis.map((emoji: any) => ({
      id: emoji.id,
      name: emoji.name,
      animated: emoji.animated || false,
      imageUrl: emoji.animated
        ? `https://cdn.discordapp.com/emojis/${emoji.id}.gif`
        : `https://cdn.discordapp.com/emojis/${emoji.id}.png`,
    }));

    return new Response(JSON.stringify({ emojis: formattedEmojis }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Emoji listesini alırken beklenmeyen hata:", error);
    return new Response(JSON.stringify({ message: "Sunucu tarafı hatası." }), { status: 500 });
  }
}
