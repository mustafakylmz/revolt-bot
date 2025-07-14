import pkg from 'discord-interactions';
const {
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    TextInputStyles
} = pkg;

import { Routes } from '@discordjs/rest';

/**
 * Faceit entegrasyonu etkileşimlerini işler.
 * @param {object} interaction - Discord etkileşim objesi.
 * @param {object} res - Express yanıt objesi.
 * @param {object} rest - Discord REST client.
 * @param {string} applicationId - Botun uygulama ID'si.
 * @param {object} env - Ortam değişkenlerini içeren obje (process.env).
 */
export async function handleFaceitInteraction(interaction, res, rest, applicationId, env) {
    const { custom_id } = interaction.data;
    const memberId = interaction.member.user.id;
    const guildId = interaction.guild_id;

    // Etkileşim tipine göre defer yanıtını ayarla
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        // Modal doğrudan yanıt olarak gönderileceği için burada defer yanıtı GÖNDERİLMEZ.
        // Bu yüzden custom_id kontrolü yapıyoruz.
        if (custom_id !== 'faceit_role_request_button') {
            console.log(`faceitInteractions: DEFERRED_UPDATE_MESSAGE gönderiliyor for custom_id: ${custom_id}`); // DEBUG LOG
            await res.send({
                type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
                flags: InteractionResponseFlags.EPHEMERAL
            });
        }
    } else if (interaction.type === InteractionType.MODAL_SUBMIT) {
        console.log(`faceitInteractions: Modal gönderimi alındı. custom_id: ${custom_id}. Defer yanıtı gönderiliyor...`); // DEBUG LOG
        await res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            flags: InteractionResponseFlags.EPHEMERAL
        });
    }


    switch (custom_id) {
        case 'faceit_role_request_button': // "Faceit Rolü Al" butonuna basıldığında tetiklenir
            console.log("faceitInteractions: Faceit Rolü Al butonu tıklandı. Modal gönderiliyor..."); // DEBUG LOG
            try {
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
                                        type: MessageComponentTypes.TEXT_INPUT,
                                        custom_id: 'faceit_nickname_input',
                                        style: 1, // TextInputStyles.SHORT yerine doğrudan 1 kullanıldı
                                        label: 'Faceit Kullanıcı Adınız:',
                                        placeholder: 'örnek: shroud',
                                        required: true,
                                        min_length: 3,
                                        max_length: 30,
                                    },
                                ],
                            },
                        ],
                    },
                });
            } catch (sendError) {
                console.error("faceitInteractions: Modal yanıtı gönderme sırasında kritik hata:", sendError);
                try {
                    await rest.patch(
                        Routes.webhookMessage(applicationId, interaction.token),
                        {
                            body: {
                                content: 'Modal açılırken beklenmedik bir hata oluştu. Lütfen bot sahibine bildirin.',
                                flags: InteractionResponseFlags.EPHEMERAL,
                            }
                        }
                    );
                } catch (patchError) {
                    console.error("faceitInteractions: Modal hatası sonrası webhook mesajı gönderme hatası:", patchError);
                }
                return; // Etkileşimi kapatmak için
            }

        case 'modal_faceit_nickname_submit': // Faceit nickname modalı gönderildiğinde tetiklenir
            const nicknameInput = interaction.data.components[0].components[0].value;
            console.log(`faceitInteractions: Faceit Nickname alındı: ${nicknameInput}. API çağrısı yapılıyor...`); // DEBUG LOG

            let responseMessage = '';
            let faceitLevel = null;

            try {
                const FACEIT_API_KEY = env.FACEIT_API_KEY;
                if (!FACEIT_API_KEY) {
                    throw new Error("FACEIT_API_KEY environment variable is not set.");
                }

                const faceitApiUrl = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nicknameInput)}`;
                const apiResponse = await fetch(faceitApiUrl, {
                    headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` }
                });
                const playerData = await apiResponse.json();

                if (!apiResponse.ok) {
                    if (apiResponse.status === 404) {
                        responseMessage = `Faceit nickname "**${nicknameInput}**" bulunamadı. Lütfen nickinizi doğru yazdığınızdan emin olun.`;
                    } else {
                        console.error('faceitInteractions: Faceit API hata kodu:', apiResponse.status, playerData);
                        responseMessage = `Faceit API ile bağlantı kurarken bir hata oluştu: ${playerData.message || 'Bilinmeyen Hata'}.`;
                    }
                } else {
                    if (playerData && playerData.games && playerData.games.csgo && playerData.games.csgo.skill_level) {
                        faceitLevel = playerData.games.csgo.skill_level;
                        console.log(`faceitInteractions: Faceit seviyesi algılandı: ${faceitLevel}`); // DEBUG LOG
                    } else {
                        responseMessage = `Faceit nickname "**${nicknameInput}**" için CS:GO oyun verisi bulunamadı.`;
                    }
                }

            } catch (apiError) {
                console.error('faceitInteractions: Faceit API çağrısı sırasında genel hata:', apiError);
                responseMessage = 'Faceit API ile bağlantı kurarken beklenmedik bir hata oluştu. Lütfen bot sahibine bildirin.';
            }

            if (faceitLevel !== null) {
                let roleToAssignId = null;

                switch (faceitLevel) {
                    case 1: roleToAssignId = env.LEVEL_1_ROLE_ID; break;
                    case 2: roleToAssignId = env.LEVEL_2_ROLE_ID; break;
                    case 3: roleToAssignId = env.LEVEL_3_ROLE_ID; break;
                    case 4: roleToAssignId = env.LEVEL_4_ROLE_ID; break;
                    case 5: roleToAssignId = env.LEVEL_5_ROLE_ID; break;
                    case 6: roleToAssignId = env.LEVEL_6_ROLE_ID; break;
                    case 7: roleToAssignId = env.LEVEL_7_ROLE_ID; break;
                    case 8: roleToAssignId = env.LEVEL_8_ROLE_ID; break;
                    case 9: roleToAssignId = env.LEVEL_9_ROLE_ID; break;
                    case 10: roleToAssignId = env.LEVEL_10_ROLE_ID; break;
                    default: break;
                }

                if (roleToAssignId) {
                    try {
                        console.log(`faceitInteractions: Rol atama denemesi: Kullanıcı ${memberId}, Rol ${roleToAssignId}`); // DEBUG LOG
                        await rest.put(Routes.guildMemberRole(guildId, memberId, roleToAssignId));
                        responseMessage = `Faceit seviyeniz **${faceitLevel}** olarak algılandı ve ilgili rol başarıyla verildi!`;
                    } catch (e) {
                        console.error(`faceitInteractions: Faceit rolü verme hatası (Level ${faceitLevel}, Role ID: ${roleToAssignId}):`, e);
                        responseMessage = `Faceit rolü (${faceitLevel}) verirken bir hata oluştu. Botun sunucuda rol verme izni olduğundan veya rol ID'sinin doğru olduğundan emin olun.`;
                    }
                } else {
                    responseMessage = `Faceit seviyeniz (${faceitLevel}) için tanımlı bir rol bulunamadı.`;
                }
            }

            console.log(`faceitInteractions: Faceit rolü işlemi tamamlandı. Yanıt gönderiliyor: ${responseMessage}`); // DEBUG LOG
            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: responseMessage,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                }
            );
            break;

        default:
            console.warn(`faceitInteractions: Bilinmeyen custom_id: ${custom_id}`); // DEBUG LOG
            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: 'Bilinmeyen bir Faceit bileşeni/modal etkileşimi.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                }
            );
            break;
    }
}
