// roleInteractions.js
import {
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    ComponentType
} from 'discord-interactions';
import { Routes } from 'discord-api-types/v10';

export async function handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo) {
    const { custom_id } = interaction.data;
    const guildId = interaction.guild_id;
    const memberId = interaction.member.user.id;

    // Rol butonuna basıldığında açılacak rol seçim menüsü
    if (custom_id === 'select_roles_button') {
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
                                max_values: options.length,
                                options
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
        const selectedRoleIds = interaction.data.values;
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
                    console.warn(`Rol güncelleme hatası (rolId: ${roleId}):`, err);
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
