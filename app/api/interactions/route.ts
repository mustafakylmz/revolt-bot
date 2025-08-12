// app/api/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyKey, InteractionResponseFlags, InteractionResponseType, MessageComponentTypes } from 'discord-interactions';
import { REST } from '@discordjs/rest';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { handleRoleInteraction, updateRoleSelectionMessage } from '@/lib/interactions/roleInteractions';
import { handleFaceitInteraction } from '@/lib/interactions/faceitInteractions';

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);
const applicationId = process.env.DISCORD_CLIENT_ID!;

// MongoDB bağlantısı
let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGO_URI!;
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();
  const dbName = new URL(uri).pathname.substring(1);
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

/**
 * Fetches the configurable role IDs for a given guild from the database.
 */
const getGuildConfigurableRoles = async (guildId: string, db: any) => {
  try {
    const guildConfig = await db.collection('guild_configs').findOne({ guildId });
    return guildConfig?.configurableRoleIds || [];
  } catch (error) {
    console.error(`Guild ${guildId} için yapılandırılabilir roller alınamadı:`, error);
    return [];
  }
};

/**
 * Fetches roles information for a given guild.
 */
const fetchRolesInfo = async (guildId: string, filterRoleIds: string[] | null = null) => {
  try {
    const guildRoles = await rest.get(Routes.guildRoles(guildId)) as any[];
    if (filterRoleIds && filterRoleIds.length > 0) {
      const filteredSet = new Set(filterRoleIds);
      return guildRoles.filter(role => filteredSet.has(role.id));
    }
    return guildRoles;
  } catch (error) {
    console.error('Rol bilgisi alınamadı:', error);
    return [];
  }
};

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 });
    }

    const isValid = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY!);
    if (!isValid) {
      console.warn('Geçersiz istek: imza doğrulanamadı');
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 });
    }

    const interaction = JSON.parse(rawBody);
    const { type, data, guild_id, channel_id, member } = interaction;

    if (type === 1) {
      return NextResponse.json({ type: 1 }); // PONG response
    }

    const { db } = await connectToDatabase();

    // Handle slash commands
    if (type === 2) { // APPLICATION_COMMAND
      const { name, options } = data;
      
      if (name === 'send-role-panel') {
        const targetChannelId = options?.find((opt: any) => opt.name === 'channel')?.value || channel_id;
        
        await db.collection('temp_interaction_data').updateOne(
          { userId: member.user.id, guildId: guild_id },
          { $set: { targetChannelId: targetChannelId, timestamp: new Date() } },
          { upsert: true }
        );

        const allGuildRoles = await fetchRolesInfo(guild_id, null);
        const guildConfig = await db.collection('guild_configs').findOne({ guildId: guild_id });
        const roleCustomEmojis = guildConfig?.roleEmojiMappings || {};

        const optionsForSelect = allGuildRoles.map((role: any) => {
          const option: any = {
            label: role.name,
            value: role.id,
            default: member.roles.includes(role.id),
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

        const displayOptionsForSelect = optionsForSelect.length > 0 ? optionsForSelect : [{ 
          label: "Rol bulunamadı", 
          value: "no_roles", 
          default: true, 
          description: "Lütfen Discord sunucunuzda atanabilir roller olduğundan emin olun." 
        }];
        const maxValuesForSelect = Math.max(1, displayOptionsForSelect.length);

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Panele eklemek istediğiniz rolleri seçin (bu mesaj sadece size gözükecektir):',
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.STRING_SELECT,
                    custom_id: 'select_roles_for_panel',
                    placeholder: 'Panele eklenecek rolleri seçin',
                    min_values: 0,
                    max_values: maxValuesForSelect,
                    options: displayOptionsForSelect
                  }
                ]
              }
            ],
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });
      } 
      
      else if (name === 'refresh-role-panel') {
        const configurableRoleIds = await getGuildConfigurableRoles(guild_id, db);
        await updateRoleSelectionMessage(guild_id, null, db, rest, applicationId, fetchRolesInfo, false, configurableRoleIds, member.roles);
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Rol seçim paneli güncelleniyor...',
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });
      } 
      
      else if (name === 'faceit-role-button') {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Faceit seviyenize göre rol almak için aşağıdaki butona tıklayın:',
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.BUTTON,
                    custom_id: 'faceit_role_request_button',
                    style: 1,
                    label: 'Faceit Rolü Talep Et',
                  },
                ],
              },
            ],
          },
        });
      }
    }

    // Handle message components
    if (type === 3) { // MESSAGE_COMPONENT
      const custom_id = data?.custom_id;

      if (custom_id === 'select_roles_for_panel') {
        const selectedRoleIds = data.values || [];
        const tempInteractionData = await db.collection('temp_interaction_data').findOne({ 
          userId: member.user.id, 
          guildId: guild_id 
        });
        const targetChannelId = tempInteractionData?.targetChannelId || channel_id;

        await db.collection('guild_configs').updateOne(
          { guildId: guild_id },
          { $set: { configurableRoleIds: selectedRoleIds } },
          { upsert: true }
        );

        await updateRoleSelectionMessage(guild_id, targetChannelId, db, rest, applicationId, fetchRolesInfo, true, selectedRoleIds, member.roles);

        await db.collection('temp_interaction_data').deleteOne({ userId: member.user.id, guildId: guild_id });
        
        return NextResponse.json({
          type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
          data: {
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });
      }

      if (['select_roles_button', 'multi_role_select'].includes(custom_id)) {
        return await handleRoleInteraction(interaction, db, rest, applicationId, fetchRolesInfo, member.roles);
      }

      if (custom_id === 'faceit_role_request_button' || custom_id === 'modal_faceit_nickname_submit') {
        return await handleFaceitInteraction(interaction, db, rest, applicationId, process.env, member);
      }
    }

    // Handle modal submissions
    if (type === 5) { // MODAL_SUBMIT
      const custom_id = data?.custom_id;
      if (custom_id === 'modal_faceit_nickname_submit') {
        return await handleFaceitInteraction(interaction, db, rest, applicationId, process.env, member);
      }
    }

    return NextResponse.json({
      type: 4,
      data: {
        content: 'Bilinmeyen bir etkileşim alındı.',
        flags: InteractionResponseFlags.EPHEMERAL,
      }
    });

  } catch (error) {
    console.error('Etkileşim işleme hatası:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
