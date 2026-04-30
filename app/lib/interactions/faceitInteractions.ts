// app/lib/interactions/faceitInteractions.ts
import { NextResponse } from 'next/server';
import { InteractionResponseType, InteractionResponseFlags, MessageComponentTypes } from 'discord-interactions';
import { Routes } from 'discord-api-types/v10';

// Discord interaction types (numeric)
// MESSAGE_COMPONENT = 3
// MODAL_SUBMIT = 5
const InteractionType = {
  MESSAGE_COMPONENT: 3,
  MODAL_SUBMIT: 5,
};

export async function handleFaceitInteraction(
  interaction: any,
  db: any,
  rest: any,
  applicationId: string,
  env: any,
  member: any
) {
  const { custom_id } = interaction.data;
  const memberId = member?.user?.id;
  const guildId = interaction.guild_id;

  console.log('Faceit Interaction:', { type: interaction.type, custom_id, memberId });

  if (!memberId) {
    console.error('handleFaceitInteraction: memberId is undefined', { interaction });
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Kullanıcı bilgisi alınamadı. Lütfen tekrar giriş yapmayı deneyin.',
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  // Handle the initial button click to request Faceit nickname
  if (interaction.type === InteractionType.MESSAGE_COMPONENT && custom_id === 'faceit_role_request_button') {
    return NextResponse.json({
      type: InteractionResponseType.MODAL,
      data: {
        custom_id: 'modal_faceit_nickname_submit',
        title: 'Faceit Nickname Gir',
        components: [
          {
            type: MessageComponentTypes.ACTION_ROW,
            components: [
              {
                type: 4, // Text Input component type
                custom_id: 'faceit_nickname_input',
                style: 1,
                label: 'Faceit Kullanıcı Adınız:',
                placeholder: 'shroud',
                required: true,
                min_length: 3,
                max_length: 30,
              }
            ]
          }
        ]
      }
    });
  }

  // Handle the submission of the Faceit nickname modal
  if (interaction.type === InteractionType.MODAL_SUBMIT && custom_id === 'modal_faceit_nickname_submit') {
    console.log('Faceit: Processing modal submit...');
    const originalNickname = interaction.data.components[0].components[0].value;
    console.log('Faceit: Nickname input:', originalNickname);

    let responseMessage = '';
    let faceitLevel = null;
    let roleIdToAssign = null;
    let faceitData = null;

    try {
      // Try fetching with the original nickname - with timeout
      console.log('Faceit: Calling Faceit API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sn timeout

      let faceitRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(originalNickname)}`, {
        headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Faceit: API response status:', faceitRes.status);

      if (faceitRes.ok) {
        faceitData = await faceitRes.json();
      } else if (faceitRes.status === 404) {
        // Try lowercase if original not found
        console.log(`Original nickname "${originalNickname}" not found. Trying lowercase.`);
        faceitRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(originalNickname.toLowerCase())}`, {
          headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}` }
        });
        if (faceitRes.ok) {
          faceitData = await faceitRes.json();
        } else {
          responseMessage = `Faceit nickname "${originalNickname}" bulunamadı. Lütfen tam ve doğru kullanıcı adınızı girdiğinizden emin olun.`;
        }
      } else {
        const errorData = await faceitRes.json();
        responseMessage = `Faceit API hatası: ${errorData.message || 'Bilinmeyen hata'}. Lütfen tekrar deneyiniz.`;
      }

      if (faceitData) {
        console.log('Faceit: Processing faceitData:', JSON.stringify(faceitData, null, 2));
        // Prioritize CS2, then fallback to CSGO
        if (faceitData.games && faceitData.games.cs2) {
          faceitLevel = faceitData.games.cs2.skill_level;
          console.log('Faceit: CS2 level found:', faceitLevel);
          if (faceitLevel === undefined || faceitLevel === null) {
            responseMessage = `Faceit hesabınızda CS2 seviyeniz tespit edilemedi veya eksik.`;
          } else {
            responseMessage = `Faceit CS2 seviyeniz ${faceitLevel}.`;
          }
        } else if (faceitData.games && faceitData.games.csgo) {
          faceitLevel = faceitData.games.csgo.skill_level;
          console.log('Faceit: CSGO level found:', faceitLevel);
          if (faceitLevel === undefined || faceitLevel === null) {
            responseMessage = `Faceit hesabınızda CSGO seviyeniz tespit edilemedi veya eksik.`;
          } else {
            responseMessage = `Faceit CSGO seviyeniz ${faceitLevel}.`;
          }
        } else {
          console.log('Faceit: No CS2 or CSGO game found');
          responseMessage = `Faceit hesabınızda CS2 veya CSGO oyunu bulunamadı veya verisi eksik.`;
        }
      } else {
        console.log('Faceit: No faceitData after API call');
      }

    } catch (e) {
      responseMessage = 'Faceit API ile bağlantı hatası oluştu. Lütfen tekrar deneyiniz.';
      console.error('Faceit API hatası:', e);
    }

    // Proceed to assign role if Faceit level was successfully retrieved
    if (faceitLevel !== null && faceitLevel !== undefined) {
      try {
        const guildConfig = await db.collection('guild_configs').findOne({ guildId });
        const faceitLevelRoles = guildConfig?.faceitLevelRoles || {};
        roleIdToAssign = faceitLevelRoles[String(faceitLevel)] ?? null;

        // Sadece kullanıcıda olan Faceit rollerini kaldır
        const userRoles = interaction.member?.roles || [];
        const allFaceitRoleIds = Object.values(faceitLevelRoles) as string[];

        for (const oldRoleId of allFaceitRoleIds) {
          if (oldRoleId && typeof oldRoleId === 'string' && oldRoleId !== roleIdToAssign && userRoles.includes(oldRoleId)) {
            try {
              await rest.delete(Routes.guildMemberRole(guildId, memberId, oldRoleId));
              console.log(`Faceit: Removed old role ${oldRoleId} from user ${memberId}`);
            } catch (e) {
              // Rol silme hatası önemli değil
            }
          }
        }

        // Yeni rolü ekle
        if (roleIdToAssign) {
          await rest.put(Routes.guildMemberRole(guildId, memberId, roleIdToAssign));
          responseMessage = responseMessage.includes("seviyeniz") ? responseMessage + " ve rol başarıyla atandı." : `Faceit seviyeniz ${faceitLevel} ve rol başarıyla atandı.`;
        } else {
          responseMessage = responseMessage.includes("seviyeniz") ? responseMessage + " ancak bu seviye için tanımlı rol bulunamadı." : `Faceit seviyesi ${faceitLevel} için tanımlı rol bulunamadı.`;
        }
      } catch (e) {
        console.error('Rol atama hatası:', e);
        responseMessage = 'Rol atanırken bir hata oluştu.';
      }
    } else {
      if (!responseMessage) {
        responseMessage = 'Faceit seviyeniz belirlenemediği için rol atanamadı.';
      }
    }

    // Save or update Faceit user data in MongoDB
    try {
      await db.collection('faceit_users').updateOne(
        { discordId: memberId, guildId },
        {
          $set: {
            discordId: memberId,
            guildId,
            faceitNickname: originalNickname,
            faceitLevel,
            assignedRoleId: roleIdToAssign,
            lastUpdated: new Date()
          }
        },
        { upsert: true }
      );
    } catch (e) {
      console.error('MongoDB veri kayıt hatası:', e);
      if (!responseMessage.includes("hata oluştu")) {
        responseMessage += ' Ancak verileriniz kaydedilirken bir sorun oluştu.';
      }
    }

    console.log('Faceit: Returning response:', responseMessage);
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: responseMessage,
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: 'Bilinmeyen Faceit etkileşimi.',
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}
