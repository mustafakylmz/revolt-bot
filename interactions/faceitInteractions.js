import pkg from 'discord-interactions';
const {
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes
} = pkg;

const faceitLevels = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
];

/**
 * Faceit seviyesine göre rolü alır ve kullanıcıya atar.
 * @param {*} interaction 
 * @param {*} res 
 * @param {*} rest 
 * @param {*} applicationId 
 * @param {*} env - environment variables
 * @param {*} db - MongoDB instance
 */
export async function handleFaceitInteraction(interaction, res, rest, applicationId, env, db) {
    try {
        const guildId = interaction.guild_id;
        const userId = interaction.member.user.id;

        // MongoDB'den faceitLevelRoles mapini çek
        const collection = db.collection('guild_configs');
        const config = await collection.findOne({ guildId });

        if (!config || !config.faceitLevelRoles) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Faceit seviyelerine atanmış rol bulunamadı.',
                    flags: InteractionResponseFlags.EPHEMERAL,
                }
            });
        }

        if (interaction.type === 3) { // BUTTON interaction
            // Butona tıklandığında modal açalım
            return res.send({
                type: InteractionResponseType.MODAL,
                data: {
                    custom_id: 'modal_faceit_nickname_submit',
                    title: 'Faceit Nickname Giriniz',
                    components: [
                        {
                            type: MessageComponentTypes.ACTION_ROW,
                            components: [
                                {
                                    type: MessageComponentTypes.TEXT_INPUT,
                                    custom_id: 'faceit_nickname',
                                    style: 1,
                                    label: 'Faceit Nickname',
                                    placeholder: 'Örn: Mustafa123',
                                    required: true,
                                    min_length: 3,
                                    max_length: 32,
                                }
                            ]
                        }
                    ]
                }
            });
        } else if (interaction.type === 5) { // MODAL submit
            const nickname = interaction.data.components[0].components[0].value.trim();

            // Burada faceit API'den kullanıcı bilgisi alabiliriz (mock / gerçek)
            // Şimdilik nickname üzerinden seviye simüle edelim:

            // MOCK: nickname son karakter sayısına göre seviye
            const levelIndex = Math.min(nickname.length % 10, 9);
            const level = faceitLevels[levelIndex];

            if (!level) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Faceit seviyesi null için tanımlı rol bulunamadı.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                });
            }

            // Atanacak rol ID'si
            const roleId = config.faceitLevelRoles[level];
            if (!roleId) {
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Bu Faceit seviyesi için rol bulunamadı.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                });
            }

            try {
                // Kullanıcıya rol ekle
                await rest.put(
                    `/guilds/${guildId}/members/${userId}/roles/${roleId}`
                );

                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `Tebrikler! Faceit seviyenize uygun rol verildi: <@&${roleId}>`,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                });
            } catch (err) {
                console.error('Rol atama hatası:', err);
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Role atama sırasında bir hata oluştu.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                });
            }
        }
    } catch (err) {
        console.error('Faceit interaction işleme hatası:', err);
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Faceit etkileşimi işlenirken hata oluştu.',
                flags: InteractionResponseFlags.EPHEMERAL,
            }
        });
    }
}
