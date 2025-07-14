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
 * @param {string[]|null} specificRoleIds - Optional array of specific role IDs to include in the panel.
 * @param {string[]|null} memberRoles - Optional array of role IDs the interacting member currently has.
 */
export async function updateRoleSelectionMessage(guildId, channelId, db, rest, applicationId, fetchRolesInfo, isInitialSend, specificRoleIds = null, memberRoles = []) {
    try {
        let guildConfig = await db.collection('guild_configs').findOne({ guildId });
        let messageId = guildConfig?.rolePanelMessageId;
        let targetChannelId = channelId || guildConfig?.rolePanelChannelId;

        if (!targetChannelId) {
            console.error(`Guild ${guildId} için rol paneli kanalı tanımlı değil.`);
            return;
        }

        // fetchRolesInfo'ya filterRoleIds parametresi eklendi
        // Eğer specificRoleIds varsa, sadece o rolleri getir. Yoksa, veritabanındaki configurableRoleIds'ı kullan.
        // Bu, kalıcı panelin sadece admin tarafından seçilen rolleri göstermesini sağlar.
        let rolesToDisplay = [];
        if (specificRoleIds) { // If specific roles are passed from the /send-role-panel selection
            rolesToDisplay = await fetchRolesInfo(guildId, specificRoleIds);
        } else { // If refreshing or initial send without specific selection (e.g., from /refresh-role-panel)
            const configurableRoleIds = await db.collection('guild_configs').findOne({ guildId }).then(config => config?.configurableRoleIds || []);
            rolesToDisplay = await fetchRolesInfo(guildId, configurableRoleIds);
        }


        if (!rolesToDisplay || rolesToDisplay.length === 0) {
            console.warn(`Guild ${guildId} için yapılandırılmış atanabilir roller bulunamadı. Rol paneli boş gönderilecek/güncellenecek.`);
        }

        // Fetch custom emoji mappings from guild_configs
        const roleCustomEmojis = guildConfig?.roleEmojiMappings || {};

        const options = rolesToDisplay.map(role => {
            const option = {
                label: role.name,
                value: role.id,
                default: memberRoles.includes(role.id), // Set default based on member's current roles
            };

            // Add emoji if a custom emoji is defined for this role in the database
            const customEmoji = roleCustomEmojis[role.id];
            if (customEmoji) {
                option.emoji = {
                    id: customEmoji.id || null, // Use emoji ID if available, otherwise null for Unicode
                    name: customEmoji.name,
                    animated: customEmoji.animated || false // Default to false if not specified
                };
            }
            return option;
        });

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
                        custom_id: 'multi_role_select', // This custom_id is for the actual role selection
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


export async function handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo, memberRoles = []) {
    const { custom_id, type } = interaction.data;
    const guildId = interaction.guild_id;
    const memberId = interaction.member.user.id;

    // Handle the initial button click to open the ephemeral role selection menu
    if (custom_id === 'select_roles_button' && type === MessageComponentTypes.BUTTON) {
        const roles = await fetchRolesInfo(guildId); // This will still fetch all configurable roles as per DB

        if (!roles || roles.length === 0) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Yapılandırılmış atanabilir roller bulunamadı.',
                    flags: InteractionResponseFlags.EPHEMERAL
                }
            });
        }

        // Fetch custom emoji mappings from guild_configs for the ephemeral menu too
        const guildConfig = await db.collection('guild_configs').findOne({ guildId });
        const roleCustomEmojis = guildConfig?.roleEmojiMappings || {};

        const options = roles.map(role => {
            const option = {
                label: role.name,
                value: role.id,
                default: memberRoles.includes(role.id), // Set default based on member's current roles
            };
            // Add emoji if a custom emoji is defined for this role in the database
            const customEmoji = roleCustomEmojis[role.id];
            if (customEmoji) {
                option.emoji = {
                    id: customEmoji.id || null, // Use emoji ID if available, otherwise null for Unicode
                    name: customEmoji.name,
                    animated: customEmoji.animated || false // Default to false if not specified
                };
            }
            return option;
        });

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
        const roles = await fetchRolesInfo(guildId); // This fetches roles based on configurableRoleIds

        const allConfigurableIds = roles.map(role => role.id); // This will be the roles currently in the panel

        try {
            // Iterate through all roles that are currently in the panel (configurable roles)
            for (const roleId of allConfigurableIds) {
                try {
                    if (selectedRoleIds.includes(roleId)) {
                        // If the role was selected by the user AND it's a configurable role, add it
                        await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                    } else {
                        // If the role was NOT selected by the user AND it's a configurable role, remove it
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
