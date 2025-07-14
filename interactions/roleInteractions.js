import pkg from 'discord-interactions';
const {
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes
} = pkg;

// Düzeltme: Routes artık @discordjs/rest yerine discord-api-types/v10'dan import ediliyor.
import { Routes } from 'discord-api-types/v10';

/**
 * Rol seçimi ve atama etkileşimlerini işler.
 * @param {object} interaction - Discord etkileşim objesi.
 * @param {object} res - Express yanıt objesi.
 * @param {object} rest - Discord REST client.
 * @param {string} applicationId - Botun uygulama ID'si.
 * @param {string[]} roleIds - Sunucuda atanabilir rol ID'lerinin listesi.
 * @param {function} fetchRolesInfo - Rol bilgilerini çeken yardımcı fonksiyon.
 */
export async function handleRoleInteraction(interaction, res, rest, applicationId, roleIds, fetchRolesInfo) {
    const { custom_id } = interaction.data;
    const memberId = interaction.member.user.id;
    const guildId = interaction.guild_id;

    // Defer yanıtı sadece orijinal mesajı güncelleyeceğimiz durumlarda gönderilir.
    // Rol etkileşimleri için genellikle defer yanıtı göndeririz.
    await res.send({
        type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
        flags: InteractionResponseFlags.EPHEMERAL
    });

    switch (custom_id) {
        case 'select_roles_button': // "Rolleri Seç" butonuna basıldığında tetiklenir
            console.log("roleInteractions: select_roles_button tıklandı."); // DEBUG LOG
            const rolesInfo = await fetchRolesInfo(guildId, roleIds);

            const options = rolesInfo.map(role => {
                return {
                    label: role.name,
                    value: role.id,
                    emoji: undefined, // Rol ikonları için emoji desteğini şimdilik devre dışı bıraktık
                };
            });

            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: 'Almak istediğin rolleri seç, istediğin kadar seçebilirsin.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                        components: [
                            {
                                type: MessageComponentTypes.ACTION_ROW,
                                components: [
                                    {
                                        type: MessageComponentTypes.STRING_SELECT,
                                        custom_id: 'multi_role_select',
                                        placeholder: 'Rolleri seç...',
                                        min_values: 1,
                                        max_values: options.length > 0 ? options.length : 1,
                                        options: options.length > 0 ? options : [{ label: 'Rol bulunamadı', value: 'no_roles', description: 'Sunucuda seçilebilir rol bulunmuyor.' }],
                                    }
                                ]
                            }
                        ],
                    }
                }
            );
            console.log("roleInteractions: Rol seçim menüsü gönderildi."); // DEBUG LOG
            break;

        case 'multi_role_select': // Rol seçim menüsünden seçim yapıldığında tetiklenir
            console.log("roleInteractions: multi_role_select menüsünden seçim yapıldı."); // DEBUG LOG
            const selectedRoleIds = interaction.data.values;
            let rolesGivenCount = 0;
            let failedRoles = [];

            if (selectedRoleIds.includes('no_roles')) {
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: 'Seçilebilecek bir rol bulunamadı.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    }
                );
                break;
            }

            for (const roleId of selectedRoleIds) {
                try {
                    console.log(`roleInteractions: Kullanıcıya rol atanıyor: ${roleId}`); // DEBUG LOG
                    await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                    rolesGivenCount++;
                } catch (e) {
                    console.error(`roleInteractions: Rol verme hatası (${roleId}):`, e);
                    failedRoles.push(roleId);
                }
            }

            let responseContent = '';
            if (rolesGivenCount > 0) {
                responseContent += `${rolesGivenCount} rol başarıyla verildi! `;
            }
            if (failedRoles.length > 0) {
                responseContent += `Bazı roller verilemedi: ${failedRoles.join(', ')}. Botun sunucuda bu rolleri yönetme izni olduğundan emin olun.`;
            }
            if (rolesGivenCount === 0 && failedRoles.length === 0) {
                responseContent = 'Herhangi bir rol seçilmedi veya verilemedi. Botun yeterli izni olduğundan emin olun.';
            }

            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: responseContent,
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                }
            );
            console.log("roleInteractions: Rol seçim yanıtı gönderildi."); // DEBUG LOG
            break;

        default:
            console.warn(`roleInteractions: Bilinmeyen custom_id: ${custom_id}`); // DEBUG LOG
            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: 'Bilinmeyen bir rol bileşeni etkileşimi.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                }
            );
            break;
    }
}
