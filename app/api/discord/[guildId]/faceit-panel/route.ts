// app/api/discord/[guildId]/faceit-panel/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { getDb } from "../../../../lib/mongodb";
import { Routes } from 'discord-api-types/v10';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return new Response(JSON.stringify({ message: "Yetkisiz" }), { status: 401 });
    }

    const { guildId } = params;
    const body = await request.json();
    const { channelId, faceitLevelRoles } = body;

    if (!channelId) {
      return new Response(JSON.stringify({ message: "Kanal ID'si gerekli." }), { status: 400 });
    }

    if (!faceitLevelRoles || typeof faceitLevelRoles !== 'object' || Object.keys(faceitLevelRoles).length === 0) {
      return new Response(JSON.stringify({ message: "En az bir Faceit seviyesi için rol seçilmelidir." }), { status: 400 });
    }

    // Bot token kullan
    const botToken = process.env.BOT_TOKEN!;

    // Tüm seviyeler için rollerin geçerli olup olmadığını kontrol et
    const rolesResponse = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!rolesResponse.ok) {
      return new Response(JSON.stringify({ message: "Roller alınamadı." }), { status: 500 });
    }

    const allRoles = await rolesResponse.json();
    const validRoleIds = new Set(allRoles.map((r: any) => r.id));

    // Geçerli rol ID'lerini filtrele
    const validLevelRoles: { [key: string]: string } = {};
    for (const [level, roleId] of Object.entries(faceitLevelRoles)) {
      if (validRoleIds.has(roleId as string)) {
        validLevelRoles[level] = roleId as string;
      }
    }

    if (Object.keys(validLevelRoles).length === 0) {
      return new Response(JSON.stringify({ message: "Geçerli rol ID'leri bulunamadı." }), { status: 400 });
    }

    // Faceit panel mesajını oluştur
    const messagePayload = {
      content: 'Faceit seviyenize göre otomatik rol almak için aşağıdaki butona tıklayın:',
      components: [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              custom_id: 'faceit_role_request_button',
              style: 1,
              label: 'Faceit Rolü Talep Et',
            },
          ],
        },
      ],
    };

    // Mesajı gönder
    const sentMessage = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    if (!sentMessage.ok) {
      const errorData = await sentMessage.json();
      return new Response(JSON.stringify({ message: "Mesaj gönderilemedi.", error: errorData }), { status: 500 });
    }

    const messageData = await sentMessage.json();

    // Yapılandırmayı kaydet
    const db = await getDb();
    await db.collection('guild_configs').updateOne(
      { guildId },
      {
        $set: {
          faceitLevelRoles: validLevelRoles,
          faceitPanelChannelId: channelId,
          faceitPanelMessageId: messageData.id,
        },
      },
      { upsert: true }
    );

    return new Response(JSON.stringify({
      message: "Faceit paneli başarıyla gönderildi.",
      messageId: messageData.id,
      channelId: channelId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Faceit paneli gönderilirken hata:", error);
    return new Response(JSON.stringify({ message: "Sunucu tarafı hatası." }), { status: 500 });
  }
}
