// faceitInteractions.js
import { InteractionResponseType, InteractionResponseFlags, MessageComponentTypes, InteractionType } from 'discord-interactions';
import { Routes } from 'discord-api-types/v10';

export async function handleFaceitInteraction(interaction, res, rest, applicationId, env, db) {
    const { custom_id } = interaction.data;
    const memberId = interaction.member.user.id;
    const guildId = interaction.guild_id;

    if (interaction.type === InteractionType.MESSAGE_COMPONENT && custom_id === 'faceit_role_request_button') {
        return res.send({
            type: InteractionResponseType.MODAL,
            data: {
                custom_id: 'modal_faceit_nickname_submit',
                title: 'Faceit Nickname Gir',
                components: [
                    {
                        type: MessageComponentTypes.ACTION_ROW,
                        components: [
                            {
                                type: 4, // Text Input
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

    if (interaction.type === InteractionType.MODAL_SUBMIT && custom_id === 'modal_faceit_nickname_submit') {
        const nickname = interaction.data.components[0].components[0].value;
        let responseMessage = '';
        let faceitLevel = null;

        try {
            const faceitRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`, {
                headers: { Authorization: `Bearer ${env.FACEIT_API_KEY}` }
            });
            const faceitData = await faceitRes.json();

            if (!faceitRes.ok) {
                responseMessage = faceitRes.status === 404
                    ? `Faceit nickname "${nickname}" bulunamadı.`
                    : `API hatası: ${faceitData.message}`;
            } else {
                faceitLevel = faceitData?.games?.csgo?.skill_level;
                if (!faceitLevel) {
                    responseMessage = `Faceit verisi eksik veya CSGO seviyesi tespit edilemedi.`;
                }
            }
        } catch (e) {
            responseMessage = 'Faceit API hatası oluştu. Lütfen tekrar deneyiniz.';
            console.error('Faceit API hatası:', e);
        }

        let roleId;
        try {
            const guildConfig = await db.collection('guild_configs').findOne({ guildId });
            roleId = guildConfig?.faceitLevelRoles?.[String(faceitLevel)] ?? null;

            if (roleId) {
                await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                responseMessage = `Faceit seviyeniz ${faceitLevel} ve rol başarıyla atandı.`;
            } else {
                responseMessage = `Faceit seviyesi ${faceitLevel} için tanımlı rol bulunamadı.`;
            }
        } catch (e) {
            console.error('Rol atama hatası:', e);
            responseMessage = 'Rol atanırken hata oluştu.';
        }

        try {
            await db.collection('faceit_users').updateOne(
                { discordId: memberId, guildId },
                {
                    $set: {
                        discordId: memberId,
                        guildId,
                        faceitNickname: nickname,
                        faceitLevel,
                        assignedRoleId: roleId,
                        lastUpdated: new Date()
                    }
                },
                { upsert: true }
            );
        } catch (e) {
            console.error('MongoDB veri kayıt hatası:', e);
        }

        return await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
            body: {
                content: responseMessage,
                flags: InteractionResponseFlags.EPHEMERAL
            }
        });
    }

    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'Bilinmeyen Faceit etkileşimi.',
            flags: InteractionResponseFlags.EPHEMERAL
        }
    });
}
