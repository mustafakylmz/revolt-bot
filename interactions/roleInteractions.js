// roleInteractions.js
import { InteractionResponseType, InteractionResponseFlags, MessageComponentTypes } from 'discord-interactions';
import { Routes } from 'discord-api-types/v10';

export async function handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo) {
    const { custom_id } = interaction.data;
    const guildId = interaction.guild_id;
    const memberId = interaction.member.user.id;

    if (custom_id === 'select_roles_button') {
        const roles = await fetchRolesInfo(guildId);
        if (roles.length === 0) {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Atanabilir rol bulunamadı.',
                    flags: InteractionResponseFlags.EPHEMERAL
                }
            });
        }

        const options = roles.map(role => ({
            label: role.name,
            value: role.id
        }));

        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Aşağıdan almak istediğiniz rolleri seçin:',
                flags: InteractionResponseFlags.EPHEMERAL,
                components: [
                    {
                        type: MessageComponentTypes.ACTION_ROW,
                        components: [
                            {
                                type: 3, // SELECT_MENU
                                custom_id: 'multi_role_select',
                                options,
                                min_values: 0,
                                max_values: options.length
                            }
                        ]
                    }
                ]
            }
        });
    } else if (custom_id === 'multi_role_select') {
        const selectedRoleIds = interaction.data.values;
        try {
            const allRoleIds = (await fetchRolesInfo(guildId)).map(role => role.id);

            // Önce eski rolleri temizle
            for (const roleId of allRoleIds) {
                try {
                    await rest.delete(Routes.guildMemberRole(guildId, memberId, roleId));
                } catch {}
            }

            // Seçilen rolleri ata
            for (const roleId of selectedRoleIds) {
                try {
                    await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                } catch {}
            }

            return await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                body: {
                    content: 'Roller başarıyla güncellendi.',
                    flags: InteractionResponseFlags.EPHEMERAL
                }
            });
        } catch (e) {
            console.error('Rol güncelleme hatası:', e);
            return await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                body: {
                    content: 'Roller güncellenirken bir hata oluştu.',
                    flags: InteractionResponseFlags.EPHEMERAL
                }
            });
        }
    }

    return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            content: 'Bilinmeyen rol etkileşimi.',
            flags: InteractionResponseFlags.EPHEMERAL
        }
    });
}
