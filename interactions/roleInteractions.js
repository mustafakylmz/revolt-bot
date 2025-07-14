// roleInteractions.js
import pkg from 'discord-interactions';
import { Routes } from 'discord-api-types/v10';

const {
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes
} = pkg;

// Define component types for better readability
const ComponentType = {
    ACTION_ROW: 1,
    STRING_SELECT: 3,
};

/**
 * Updates or sends a persistent role selection message in a Discord channel.
 * This function handles both initial sending and subsequent updates.
 * @param {string} guildId - The ID of the guild.
 * @param {string|null} channelId - The ID of the channel to send/update the message in. If null, tries to use stored channelId.
 * @param {object} db - The MongoDB database instance.
 * @param {object} rest - The Discord REST API client.
 * @param {string} applicationId - The Discord bot's application ID.
 * @param {function} fetchRolesInfo - Function to fetch configurable roles for a guild.
 * @param {boolean} isInitialSend - True if this is the initial command to send the message, false for refresh.
 */
export async function updateRoleSelectionMessage(guildId, channelId, db, rest, applicationId, fetchRolesInfo, isInitialSend) {
    try {
        let guildConfig = await db.collection('guild_configs').findOne({ guildId });
        let messageId = guildConfig?.rolePanelMessageId;
        let targetChannelId = channelId || guildConfig?.rolePanelChannelId;

        if (!targetChannelId) {
            console.error(`Guild ${guildId} için rol paneli kanalı tanımlı değil.`);
            // If it's an initial send command and no channel is provided, it means
            // the command itself didn't specify a channel, and no default is stored.
            // In a real scenario, the slash command would require a channel option.
            return;
        }

        const roles = await fetchRolesInfo(guildId);

        if (!roles || roles.length === 0) {
            console.warn(`Guild ${guildId} için yapılandırılmış atanabilir roller bulunamadı. Rol paneli boş gönderilecek/güncellenecek.`);
        }

        const options = roles.map(role => ({
            label: role.name,
            value: role.id,
            default: false,
            emoji: role.icon ? { id: null, name: role.icon } : undefined
        }));

        // Determine the options to display in the select menu
        const displayOptions = options.length > 0 ? options : [{ label: "Rol bulunamadı", value: "no_roles", default: true, description: "Lütfen bot yöneticisinin rolleri yapılandırmasını bekleyin." }];
        
        // Ensure max_values is at least 1 if there are any options to display
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
                        max_values: maxValues, // Use the calculated maxValues
                        options: displayOptions // Use the determined displayOptions
                    }
                ]
            }
        ];

        const messagePayload = {
            content: 'Almak istediğiniz rolleri seçin:',
            components: components,
        };

        if (isInitialSend || !messageId) {
            // Send new message if it's an initial send command or messageId is not stored
            const sentMessage = await rest.post(Routes.channelMessages(targetChannelId), { body: messagePayload });
            await db.collection('guild_configs').updateOne(
                { guildId },
                { $set: { rolePanelChannelId: targetChannelId, rolePanelMessageId: sentMessage.id } },
                { upsert: true }
            );
            console.log(`Guild ${guildId} için rol paneli mesajı ${sentMessage.id} kanal ${targetChannelId} adresine gönderildi.`);
        } else {
            // Edit existing message
            await rest.patch(Routes.channelMessage(targetChannelId, messageId), { body: messagePayload });
            console.log(`Guild ${guildId} için rol paneli mesajı ${messageId} güncellendi.`);
        }

    } catch (error) {
        console.error(`Rol seçim paneli gönderilirken/güncellenirken hata (Guild ${guildId}):`, error);
    }
}


export async function handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo) {
    const { custom_id, type } = interaction.data; // Added type for clarity
    const guildId = interaction.guild_id;
    const memberId = interaction.member.user.id;

    // Handle the initial button click to open the ephemeral role selection menu
    if (custom_id === 'select_roles_button' && type === MessageComponentTypes.BUTTON) { // Ensure it's a button click
        const roles = await fetchRolesInfo(guildId);

        if (!roles || roles.length === 0) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Yapılandırılmış atanabilir roller bulunamadı.',
                    flags: InteractionResponseFlags.EPHEMERAL
                }
            });
        }

        const options = roles.map(role => ({
            label: role.name,
            value: role.id,
            default: false,
            emoji: role.icon ? { id: null, name: role.icon } : undefined
        }));

        // Determine the options to display in the select menu
        const displayOptions = options.length > 0 ? options : [{ label: "Rol bulunamadı", value: "no_roles", default: true, description: "Lütfen bot yöneticisinin rolleri yapılandırmasını bekleyin." }];
        
        // Ensure max_values is at least 1 if there are any options to display
        const maxValues = Math.max(1, displayOptions.length);

        return res.send({
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
                                max_values: maxValues, // Use the calculated maxValues
                                options: displayOptions // Use the determined displayOptions
                            }
                        ]
                    }
                ],
                flags: InteractionResponseFlags.EPHEMERAL
            }
        });
    }

    // Rol seçim menüsünden seçim yapıldığında rollerin atanması
    if (custom_id === 'multi_role_select') {
        // Immediately defer the update to the message containing the select menu
        await res.send({
            type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL // Still ephemeral
            }
        });

        const selectedRoleIds = interaction.data.values || [];
        const roles = await fetchRolesInfo(guildId);
        const allConfigurableIds = roles.map(role => role.id);

        try {
            for (const roleId of allConfigurableIds) {
                try {
                    if (selectedRoleIds.includes(roleId)) {
                        await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                    } else {
                        await rest.delete(Routes.guildMemberRole(guildId, memberId, roleId));
                    }
                } catch (err) {
                    console.warn(`Rol güncelleme hatası (rolId: ${roleId}, kullanıcı: ${memberId}):`, err);
                }
            }

            return await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: 'Rolleriniz başarıyla güncellendi!',
                        flags: InteractionResponseFlags.EPHEMERAL
                    }
                }
            );
        } catch (error) {
            console.error('Rol güncelleme sırasında hata:', error);
            return await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: 'Roller güncellenirken bir hata oluştu.',
                        flags: InteractionResponseFlags.EPHEMERAL
                    }
                }
            );
        }
    }

    // Bilinmeyen etkileşim
    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'Bilinmeyen bir rol etkileşimi.',
            flags: InteractionResponseFlags.EPHEMERAL
        }
    });
}
