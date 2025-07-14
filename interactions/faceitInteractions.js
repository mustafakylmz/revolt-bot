import pkg from 'discord-interactions';
const {
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    TextInputStyles,
    InteractionType
} = pkg;

import { Routes } from 'discord-api-types/v10';

/**
 * Faceit entegrasyonu etkileşimlerini işler.
 * @param {object} interaction - Discord etkileşim objesi.
 * @param {object} res - Express yanıt objesi.
 * @param {object} rest - Discord REST client.
 * @param {string} applicationId - Botun uygulama ID'si.
 * @param {object} env - Ortam değişkenlerini içeren obje (process.env).
 * @param {object} db - MongoDB veritabanı objesi.
 */
export async function handleFaceitInteraction(interaction, res, rest, applicationId, env, db) {
    const { custom_id } = interaction.data;
    const memberId = interaction.member.user.id;
    const guildId = interaction.guild_id;

    // Etkileşim tipine göre defer yanıtını ayarla
    // Faceit rol alma butonu için (MESSAGE_COMPONENT) doğrudan MODAL yanıtı gönderileceği için
    // burada bir defer yanıtı GÖNDERİLMEZ.
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
        if (custom_id !== 'faceit_role_request_button') {
            console.log(`faceitInteractions: DEFERRED_UPDATE_MESSAGE gönderiliyor for custom_id: ${custom_id}`); // DEBUG LOG
            await res.send({
                type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
                flags: InteractionResponseFlags.EPHEMERAL
            });
        }
    } else if (interaction.type === InteractionType.MODAL_SUBMIT) {
        // Modal gönderimi için (MODAL_SUBMIT) defer yanıtı gereklidir, çünkü API çağrısı yapılacaktır.
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
                console.log("faceitInteractions: Modal yanıtı gönderilmeden önce."); // DEBUG LOG
                // Düzeltme: res.send çağrısının önüne 'return' eklendi.
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
                // Bu log artık unreachable olacak, çünkü return ifadesi fonksiyonu sonlandırır.
                // console.log("faceitInteractions: Modal yanıtı başarıyla gönderildi."); 
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
            let roleToAssignId = null; // Tanımlanmış rol ID'sini burada tutacağız

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

            // === MongoDB'den Faceit Seviye Rollerini Çekme ===
            let faceitLevelRolesMap = {};
            if (db) {
                try {
                    const collection = db.collection('guild_configs');
                    const guildConfig = await collection.findOne({ guildId: guildId });
                    if (guildConfig && guildConfig.faceitLevelRoles) {
                        faceitLevelRolesMap = guildConfig.faceitLevelRoles;
                        console.log(`faceitInteractions: MongoDB'den Faceit seviye rolleri çekildi:`, faceitLevelRolesMap);
                    } else {
                        console.warn(`faceitInteractions: ${guildId} için Faceit seviye rolleri MongoDB'de bulunamadı.`);
                    }
                } catch (mongoError) {
                    console.error("faceitInteractions: MongoDB'den Faceit seviye rolleri çekerken hata:", mongoError);
                }
            } else {
                console.warn("faceitInteractions: MongoDB bağlantısı mevcut değil, Faceit seviye rolleri çekilemedi.");
            }
            // === MongoDB'den Çekme Sonu ===

            if (faceitLevel !== null) {
                // Artık env yerine faceitLevelRolesMap kullanıyoruz
                roleToAssignId = faceitLevelRolesMap[String(faceitLevel)]; // JSON anahtarları string olabilir

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
                    responseMessage = `Faceit seviyeniz (${faceitLevel}) için tanımlı bir rol bulunamadı. Lütfen sunucu yöneticisinin \`/set-faceit-level-roles\` komutunu kullanarak bu seviye için bir rol tanımladığından emin olun.`;
                }
            }

            // === MongoDB'ye Faceit Kullanıcı Verilerini Kaydetme/Güncelleme ===
            if (db) {
                try {
                    const faceitUsersCollection = db.collection('faceit_users');
                    const faceitUserData = {
                        discordId: memberId,
                        guildId: guildId, // Hangi sunucuda olduğunu da kaydedebiliriz
                        faceitNickname: nicknameInput,
                        faceitLevel: faceitLevel,
                        assignedRoleId: roleToAssignId,
                        lastUpdated: new Date()
                    };

                    await faceitUsersCollection.updateOne(
                        { discordId: memberId, guildId: guildId }, // discordId ve guildId'ye göre benzersiz belge
                        { $set: faceitUserData },
                        { upsert: true } // Belge yoksa oluştur, varsa güncelle
                    );
                    console.log(`faceitInteractions: Faceit kullanıcı verisi MongoDB'ye kaydedildi/güncellendi: ${memberId}`);
                } catch (mongoError) {
                    console.error("faceitInteractions: MongoDB'ye Faceit verisi kaydederken hata:", mongoError);
                    // Kullanıcıya bu hatayı göstermeyebiliriz, sadece loglayabiliriz.
                }
            } else {
                console.warn("faceitInteractions: MongoDB bağlantısı mevcut değil, Faceit verisi kaydedilemedi.");
            }
            // === MongoDB Kayıt Sonu ===

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
