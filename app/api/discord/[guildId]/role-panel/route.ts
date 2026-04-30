// app/api/discord/[guildId]/role-panel/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { getDb } from "../../../../lib/mongodb";
import { Routes } from 'discord-api-types/v10';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

const ComponentType = {
  ACTION_ROW: 1,
  STRING_SELECT: 3,
};

export async function POST(request: Request, { params }: { params: { guildId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return new Response(JSON.stringify({ message: "Yetkisiz" }), { status: 401 });
    }

    const { guildId } = params;
    const body = await request.json();
    const { channelId, roleIds, emojiMappings } = body;

    if (!channelId) {
      return new Response(JSON.stringify({ message: "Kanal ID'si gerekli." }), { status: 400 });
    }

    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
      return new Response(JSON.stringify({ message: "En az bir rol seçilmelidir." }), { status: 400 });
    }

    // Bot token kullan
    const botToken = process.env.BOT_TOKEN!;

    // Seçilen rollerin bilgilerini al
    const rolesResponse = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!rolesResponse.ok) {
      return new Response(JSON.stringify({ message: "Roller alınamadı." }), { status: 500 });
    }

    const allRoles = await rolesResponse.json();
    const selectedRoles = allRoles.filter((role: any) => roleIds.includes(role.id));

    if (selectedRoles.length === 0) {
      return new Response(JSON.stringify({ message: "Seçilen roller bulunamadı." }), { status: 400 });
    }

    // Rol seçeneklerini oluştur
    const options = selectedRoles.map((role: any) => {
      const option: any = {
        label: role.name,
        value: role.id,
        default: false,
      };

      // Emoji ekle (varsa)
      const emojiMapping = emojiMappings?.[role.id];
      if (emojiMapping) {
        option.emoji = {
          id: emojiMapping.id,
          name: emojiMapping.name,
          animated: emojiMapping.animated || false,
        };
      }

      return option;
    });

    const messagePayload = {
      content: 'Almak istediğiniz rolleri seçin:',
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.STRING_SELECT,
              custom_id: 'multi_role_select',
              placeholder: 'Rolleri Seçin',
              min_values: 0,
              max_values: options.length,
              options: options,
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
    const updateData: any = {
      configurableRoleIds: roleIds,
      rolePanelChannelId: channelId,
      rolePanelMessageId: messageData.id,
    };

    // Emoji mapping varsa ekle
    if (emojiMappings && Object.keys(emojiMappings).length > 0) {
      updateData.roleEmojiMappings = emojiMappings;
    }

    await db.collection('guild_configs').updateOne(
      { guildId },
      { $set: updateData },
      { upsert: true }
    );

    return new Response(JSON.stringify({
      message: "Rol paneli başarıyla gönderildi.",
      messageId: messageData.id,
      channelId: channelId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Rol paneli gönderilirken hata:", error);
    return new Response(JSON.stringify({ message: "Sunucu tarafı hatası." }), { status: 500 });
  }
}
