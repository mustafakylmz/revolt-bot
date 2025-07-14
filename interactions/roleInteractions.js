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
 * Handles role-related interactions, including displaying a role selection menu
 * and updating user roles based on their selections.
 * @param {object} interaction - The Discord interaction object.
 * @param {object} res - The Express response object.
 * @param {object} rest - The Discord REST API client.
 * @param {string} applicationId - The Discord bot's application ID.
 * @param {object} db - The MongoDB database instance (though not directly used in this snippet, kept for consistency).
 * @param {function} fetchRolesInfo - Function to fetch configurable roles for a guild.
 */
export async function handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo) {
    const { custom_id } = interaction.data;
    const guildId = interaction.guild_id;
    const memberId = interaction.member.user.id;

    // Handle the initial button click to open the role selection menu
    if (custom_id === 'select_roles_button') {
        // Fetch the roles that are configured as assignable for this guild
        const roles = await fetchRolesInfo(guildId);

        // If no configurable roles are found, send an ephemeral message
        if (!roles || roles.length === 0) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Yapılandırılmış atanabilir roller bulunamadı.',
                    flags: InteractionResponseFlags.EPHEMERAL // Only visible to the user
                }
            });
        }

        // Map the fetched roles into the format required for Discord select menu options
        const options = roles.map(role => ({
            label: role.name, // Display name of the role
            value: role.id,   // Value to be returned when selected (role ID)
            default: false,   // Whether this option is pre-selected (false for new selection)
            // Add emoji if the role has one (Discord role icons)
            emoji: role.icon ? { id: null, name: role.icon } : undefined
        }));

        // Send a message with a multi-select dropdown for roles
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Almak istediğiniz rolleri seçin:',
                components: [
                    {
                        type: ComponentType.ACTION_ROW, // Container for interactive components
                        components: [
                            {
                                type: ComponentType.STRING_SELECT, // String select menu component
                                custom_id: 'multi_role_select', // Custom ID for this select menu
                                placeholder: 'Rolleri Seçin', // Placeholder text when nothing is selected
                                min_values: 0, // Allow selecting zero roles (e.g., to remove all)
                                max_values: options.length, // Allow selecting up to all available roles
                                options: options // The array of role options
                            }
                        ]
                    }
                ],
                flags: InteractionResponseFlags.EPHEMERAL // Only visible to the user
            }
        });
    }

    // Handle the submission from the role selection menu
    if (custom_id === 'multi_role_select') {
        // Immediately defer the update to the message containing the select menu
        // This keeps the interaction token alive while roles are being updated.
        await res.send({
            type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL // Still ephemeral
            }
        });

        // Get the IDs of the roles selected by the user
        const selectedRoleIds = interaction.data.values || []; // Ensure it's an array, even if empty

        // Fetch all configurable roles again to compare against
        const roles = await fetchRolesInfo(guildId);
        const allConfigurableIds = roles.map(role => role.id);

        try {
            // Iterate through all configurable roles
            for (const roleId of allConfigurableIds) {
                try {
                    if (selectedRoleIds.includes(roleId)) {
                        // If the role was selected, add it to the member
                        await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                    } else {
                        // If the role was not selected, remove it from the member
                        await rest.delete(Routes.guildMemberRole(guildId, memberId, roleId));
                    }
                } catch (err) {
                    // Log a warning if a specific role update fails, but continue with others
                    console.warn(`Rol güncelleme hatası (rolId: ${roleId}):`, err);
                }
            }

            // Send a success message back to the user by editing the deferred message
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
            // Catch any unexpected errors during the role update process
            console.error('Rol güncelleme sırasında hata:', error);
            // Send an error message back to the user by editing the deferred message
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

    // Default response for any unhandled role interactions
    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'Bilinmeyen bir rol etkileşimi.',
            flags: InteractionResponseFlags.EPHEMERAL
        }
    });
}
