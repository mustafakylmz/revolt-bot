// app/lib/interactions/roleInteractions.ts
import { NextResponse } from 'next/server';
import {
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes
} from 'discord-interactions';
import { Routes } from 'discord-api-types/v10';

const ComponentType = {
  ACTION_ROW: 1,
  STRING_SELECT: 3,
};

export async function updateRoleSelectionMessage(
  guildId: string, 
  channelId: string | null, 
  db: any, 
  rest: any, 
  applicationId: string, 
  fetchRolesInfo: Function, 
  isInitialSend: boolean, 
  specificRoleIds: string[] | null = null, 
  memberRoles: string[] = []
) {
  try {
    let guildConfig = await db.collection('guild_configs').findOne({ guildId });
    let messageId = guildConfig?.rolePanelMessageId;
    let targetChannelId = channelId || guildConfig?.rolePanelChannelId;

    if (!targetChannelId) {
      console.error(`Guild ${guildId} için rol paneli kanalı tanımlı değil.`);
      return;
    }

    let rolesToDisplay = [];
    if (specificRoleIds) {
      rolesToDisplay = await fetchRolesInfo(guildId, specificRoleIds);
    } else {
      const configurableRoleIds = await db.collection('guild_configs').findOne({ guildId }).then((config: any) => config?.configurableRoleIds || []);
      rolesToDisplay = await fetchRolesInfo(guildId, configurableRoleIds);
    }

    if (!rolesToDisplay || rolesToDisplay.length === 0) {
      console.warn(`Guild ${guildId} için yapılandırılmış atanabilir roller bulunamadı.`);
    }

    const roleCustomEmojis = guildConfig?.roleEmojiMappings || {};

    const options = rolesToDisplay.map((role: any) => {
      const option: any = {
        label: role.name,
        value: role.id,
        default: memberRoles.includes(role.id),
      };

      const customEmoji = roleCustomEmojis[role.id];
      if (customEmoji) {
        option.emoji = {
          id: customEmoji.id || null,
          name: customEmoji.name,
          animated: customEmoji.animated || false
        };
      }
      return option;
    });

    const displayOptions = options.length > 0 ? options : [{ 
      label: "Rol bulunamadı", 
      value: "no_roles", 
      default: true, 
      description: "Lütfen bot yöneticisinin rolleri yapılandırmasını bekleyin." 
    }];
    
    const maxValues = Math.max(1, displayOptions.length);

    const components = [
      {
        type: ComponentType.ACTION_ROW,
        components: [
          {
            type: ComponentType.STRING_SELECT,
            custom_id: 'multi_role_select',
            placeholder: 'Rolleri Seçin',
            min_values: 0,
            max_values: maxValues,
            options: displayOptions
          }
        ]
      }
    ];

    const messagePayload = {
      content: 'Almak istediğiniz rolleri seçin:',
      components: components,
    };

    if (isInitialSend || !messageId) {
      const sentMessage = await rest.post(Routes.channelMessages(targetChannelId), { body: messagePayload });
      await db.collection('guild_configs').updateOne(
        { guildId },
        { $set: { rolePanelChannelId: targetChannelId, rolePanelMessageId: sentMessage.id } },
        { upsert: true }
      );
      console.log(`Guild ${guildId} için rol paneli mesajı ${sentMessage.id} kanal ${targetChannelId} adresine gönderildi.`);
    } else {
      await rest.patch(Routes.channelMessage(targetChannelId, messageId), { body: messagePayload });
      console.log(`Guild ${guildId} için rol paneli mesajı ${messageId} güncellendi.`);
    }

  } catch (error) {
    console.error(`Rol seçim paneli gönderilirken/güncellenirken hata (Guild ${guildId}):`, error);
  }
}

export async function handleRoleInteraction(
  interaction: any,
  db: any,
  rest: any,
  applicationId: string,
  fetchRolesInfo: Function,
  memberRoles: string[] = []
) {
  try {
    const { custom_id, type } = interaction.data;
    const guildId = interaction.guild_id;
    const memberId = interaction.member?.user?.id;

    console.log('handleRoleInteraction:', { custom_id, type, guildId, memberId, memberRoles });

    if (!memberId) {
      console.error('handleRoleInteraction: memberId is undefined');
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Kullanıcı bilgisi alınamadı.',
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    if (custom_id === 'select_roles_button' && type === MessageComponentTypes.BUTTON) {
      const roles = await fetchRolesInfo(guildId);

      if (!roles || roles.length === 0) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Yapılandırılmış atanabilir roller bulunamadı.',
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });
      }

      const guildConfig = await db.collection('guild_configs').findOne({ guildId });
      const roleCustomEmojis = guildConfig?.roleEmojiMappings || {};

      const options = roles.map((role: any) => {
        const option: any = {
          label: role.name,
          value: role.id,
          default: memberRoles.includes(role.id),
        };
        const customEmoji = roleCustomEmojis[role.id];
        if (customEmoji) {
          option.emoji = {
            id: customEmoji.id || null,
            name: customEmoji.name,
            animated: customEmoji.animated || false
          };
        }
        return option;
      });

      const displayOptions = options.length > 0 ? options : [{
        label: "Rol bulunamadı",
        value: "no_roles",
        default: true,
        description: "Lütfen bot yöneticisinin rolleri yapılandırmasını bekleyin."
      }];

      const maxValues = Math.max(1, displayOptions.length);

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
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
                  max_values: maxValues,
                  options: displayOptions
                }
              ]
            }
          ],
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    if (custom_id === 'multi_role_select') {
      console.log('multi_role_select: Processing...');

      const selectedRoleIds = interaction.data.values || [];
      const userRoles = interaction.member?.roles || [];

      // Sadece configurable olan rolleri al
      const guildConfig = await db.collection('guild_configs').findOne({ guildId });
      const configurableRoleIds = guildConfig?.configurableRoleIds || [];

      console.log('multi_role_select: Selected:', selectedRoleIds, 'Configurable:', configurableRoleIds);

      // Sadece yapılandırılabilir rolleri yönet
      for (const roleId of configurableRoleIds) {
        try {
          if (selectedRoleIds.includes(roleId)) {
            await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
            console.log(`Rol ${roleId} eklendi`);
          } else if (userRoles.includes(roleId)) {
            // Sadece kullanıcıda varsa kaldır
            await rest.delete(Routes.guildMemberRole(guildId, memberId, roleId));
            console.log(`Rol ${roleId} kaldırıldı`);
          }
        } catch (err: any) {
          const discordError = err?.rawError;
          if (discordError?.code === 40031 || discordError?.code === 50001 || discordError?.code === 50013) {
            console.log(`Rol ${roleId}: ${discordError.code} - atlanıyor`);
          } else {
            console.warn(`Rol güncelleme hatası (rolId: ${roleId}):`, err);
          }
        }
      }

      console.log('multi_role_select: Returning success response');
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Rolleriniz güncellendi!',
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Bilinmeyen bir rol etkileşimi.',
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  } catch (error) {
    console.error('handleRoleInteraction ERROR:', error);
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Rol işlemi sırasında hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        flags: InteractionResponseFlags.EPHEMERAL
      }
    }, { status: 200 });
  }
}
