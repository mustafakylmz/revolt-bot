// app/api/discord/[guildId]/roles/route.ts
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

    // Discord API'den sunucu rollerini al
    const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ message: "Roller alınamadı.", error: errorData }), { status: response.status });
    }

    const roles = await response.json();

    // Rollersizi çıkar ve pozisyona göre sırala (en üstten en alta)
    const memberRoles = roles
      .filter((role: any) => role.name !== "@everyone")
      .sort((a: any, b: any) => b.position - a.position)
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99a5df',
        position: role.position,
      }));

    return new Response(JSON.stringify({ roles: memberRoles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Rol listesini alırken beklenmeyen hata:", error);
    return new Response(JSON.stringify({ message: "Sunucu tarafı hatası." }), { status: 500 });
  }
}
