export async function handleFaceitInteraction(interaction, res, rest, applicationId, env, db) {
    const { custom_id } = interaction.data;
    const memberId = interaction.member.user.id;
    const guildId = interaction.guild_id;

    try {
        if (interaction.type === InteractionType.MESSAGE_COMPONENT && custom_id !== 'faceit_role_request_button') {
            console.log(`faceitInteractions: DEFERRED_UPDATE_MESSAGE gönderiliyor for custom_id: ${custom_id}`);
            await res.send({
                type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
                flags: InteractionResponseFlags.EPHEMERAL
            });
            return;
        }

        if (interaction.type === InteractionType.MODAL_SUBMIT) {
            console.log(`faceitInteractions: Modal gönderimi alındı. custom_id: ${custom_id}. Defer yanıtı gönderiliyor...`);
            await res.send({
                type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                flags: InteractionResponseFlags.EPHEMERAL
            });
        }

        switch (custom_id) {
            case 'faceit_role_request_button':
                console.log("faceitInteractions: Faceit Rolü Al butonu tıklandı. Doğrudan modal yanıtı gönderiliyor...");
                await res.send({
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
                                        style: 1,
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
                return;

            case 'modal_faceit_nickname_submit':
                const nicknameInput = interaction.data.components[0].components[0].value;
                console.log(`faceitInteractions: Faceit Nickname alındı: ${nicknameInput}. API çağrısı yapılıyor...`);

                let responseMessage = '';
                let faceitLevel = null;
                let roleToAssignId = null;

                try {
                    const FACEIT_API_KEY = env.FACEIT_API_KEY;
                    if (!FACEIT_API_KEY) throw new Error("FACEIT_API_KEY environment variable is not set.");

                    const faceitApiUrl = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nicknameInput)}`;
                    const apiResponse = await fetch(faceitApiUrl, {
                        headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` }
                    });
                    const playerData = await apiResponse.json();

                    if (!apiResponse.ok) {
                        if (apiResponse.status === 404) {
                            responseMessage = `Faceit nickname "**${nicknameInput}**" bulunamadı.`;
                        } else {
                            console.error('Faceit API error:', playerData);
                            responseMessage = `Faceit API hatası: ${playerData.message || 'Bilinmeyen Hata'}.`;
                        }
                    } else {
                        if (playerData?.games?.csgo?.skill_level) {
                            faceitLevel = playerData.games.csgo.skill_level;
                            console.log(`faceitInteractions: Faceit seviyesi algılandı: ${faceitLevel}`);
                        } else {
                            responseMessage = `Faceit nickname "**${nicknameInput}**" için CS:GO verisi yok.`;
                        }
                    }
                } catch (apiError) {
                    console.error('API çağrısı sırasında hata:', apiError);
                    responseMessage = 'Faceit API hatası oluştu.';
                }

                let faceitLevelRolesMap = {};
                if (db) {
                    try {
                        const collection = db.collection('guild_configs');
                        const guildConfig = await collection.findOne({ guildId });
                        if (guildConfig?.faceitLevelRoles) {
                            faceitLevelRolesMap = guildConfig.faceitLevelRoles;
                        }
                    } catch (mongoError) {
                        console.error("MongoDB hatası:", mongoError);
                    }
                }

                if (faceitLevel !== null) {
                    roleToAssignId = faceitLevelRolesMap[String(faceitLevel)];
                    if (roleToAssignId) {
                        try {
                            await rest.put(Routes.guildMemberRole(guildId, memberId, roleToAssignId));
                            responseMessage = `Seviyeniz **${faceitLevel}**, rol başarıyla verildi!`;
                        } catch (e) {
                            console.error("Rol verilirken hata:", e);
                            responseMessage = `Rol verilirken hata oluştu. Botun izinlerini kontrol edin.`;
                        }
                    } else {
                        responseMessage = `Seviye ${faceitLevel} için tanımlı rol bulunamadı.`;
                    }
                }

                if (db) {
                    try {
                        const faceitUsersCollection = db.collection('faceit_users');
                        await faceitUsersCollection.updateOne(
                            { discordId: memberId, guildId },
                            {
                                $set: {
                                    discordId: memberId,
                                    guildId,
                                    faceitNickname: nicknameInput,
                                    faceitLevel,
                                    assignedRoleId: roleToAssignId,
                                    lastUpdated: new Date()
                                }
                            },
                            { upsert: true }
                        );
                    } catch (mongoError) {
                        console.error("MongoDB kayıt hatası:", mongoError);
                    }
                }

                console.log(`Yanıt gönderiliyor: ${responseMessage}`);
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: responseMessage,
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    }
                );
                return;

            default:
                console.warn(`Bilinmeyen custom_id: ${custom_id}`);
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: 'Bilinmeyen bir Faceit etkileşimi.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    }
                );
                return;
        }
    } catch (err) {
        console.error("Genel handleFaceitInteraction hatası:", err);
        try {
            await res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'İşlenemeyen bir hata oluştu. Lütfen tekrar deneyin.',
                    flags: InteractionResponseFlags.EPHEMERAL
                }
            });
        } catch (innerErr) {
            console.error("Yedek hata yanıtı da başarısız oldu:", innerErr);
        }
    }
}
