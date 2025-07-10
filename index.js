import express from 'express';
import dotenv from 'dotenv';
import pkg from 'discord-interactions';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';
import path from 'path';
import { raw } from 'body-parser';

const {
    verifyKeyMiddleware,
    InteractionType,
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    TextInputStyles
} = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
const applicationId = process.env.DISCORD_CLIENT_ID;

const rolesFilePath = path.resolve('./roles.json');
const messageIdsFilePath = path.resolve('./message_ids.json');
const roleIds = JSON.parse(fs.readFileSync(rolesFilePath, 'utf-8'));

let messageIds = {};
if (fs.existsSync(messageIdsFilePath)) {
    try {
        messageIds = JSON.parse(fs.readFileSync(messageIdsFilePath, 'utf-8'));
    } catch (e) {
        console.error("Hata: message_ids.json bozuk. Yeniden oluşturuluyor.", e);
        messageIds = {};
        fs.writeFileSync(messageIdsFilePath, JSON.stringify({}, null, 2));
    }
} else {
    fs.writeFileSync(messageIdsFilePath, JSON.stringify({}, null, 2));
}

function saveMessageIds(data) {
    try {
        fs.writeFileSync(messageIdsFilePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("message_ids.json yazma hatası:", e);
    }
}

async function fetchRolesInfo(guildId, roleIds) {
    try {
        const guildRoles = await rest.get(Routes.guildRoles(guildId));
        return guildRoles.filter(role => roleIds.includes(role.id));
    } catch (error) {
        console.error('Rol bilgisi çekilemedi:', error);
        return [];
    }
}

async function sendOrUpdateMessage(channelId, messageKey, messageContent) {
    if (!channelId) {
        console.error(`Hata: ${messageKey} için kanal ID'si yok.`);
        return;
    }
    try {
        let messageId = messageIds[messageKey];
        if (messageId) {
            try {
                await rest.patch(Routes.channelMessage(channelId, messageId), { body: messageContent });
            } catch (error) {
                if (error.code === 10008) {
                    const newMessage = await rest.post(Routes.channelMessages(channelId), { body: messageContent });
                    messageIds[messageKey] = newMessage.id;
                    saveMessageIds(messageIds);
                } else {
                    throw error;
                }
            }
        } else {
            const newMessage = await rest.post(Routes.channelMessages(channelId), { body: messageContent });
            messageIds[messageKey] = newMessage.id;
            saveMessageIds(messageIds);
        }
    } catch (error) {
        console.error(`Mesaj gönderme hatası (${messageKey}):`, error);
    }
}

async function initializeMessages() {
    console.log("Mesajlar başlatılıyor...");
    await sendOrUpdateMessage(
        process.env.ROLES_CHANNEL_ID,
        'rolesMessage',
        {
            content: 'Sunucudaki **diğer rolleri** almak için aşağıdaki butonu kullanın.',
            components: [
                {
                    type: MessageComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type: MessageComponentTypes.BUTTON,
                            label: 'Rolleri Seç',
                            style: 1,
                            custom_id: 'select_roles_button',
                        }
                    ]
                }
            ]
        }
    );

    await sendOrUpdateMessage(
        process.env.FACEIT_CHANNEL_ID,
        'faceitMessage',
        {
            content: 'Faceit seviyenize göre rol almak için aşağıdaki butonu kullanın. Bot, Faceit API\'sinden seviyenizi çekecektir.',
            components: [
                {
                    type: MessageComponentTypes.ACTION_ROW,
                    components: [
                        {
                            type: MessageComponentTypes.BUTTON,
                            label: 'Faceit Rolü Al',
                            style: 1,
                            custom_id: 'faceit_role_request_button',
                        }
                    ]
                }
            ]
        }
    );
}

// Discord interaction middleware with raw body
app.post('/interactions', raw({ type: 'application/json' }), verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
    const interaction = JSON.parse(req.body.toString());

    if (interaction.type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    try {
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            const { name } = interaction.data;

            switch (name) {
                case 'ping':
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Pong!',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
                default:
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Bilinmeyen komut.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
            }
        }

        else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
            const { custom_id } = interaction.data;
            const memberId = interaction.member.user.id;
            const guildId = interaction.guild_id;

            if (custom_id !== 'faceit_role_request_button') {
                await res.send({
                    type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
                    flags: InteractionResponseFlags.EPHEMERAL
                });
            }

            switch (custom_id) {
                case 'select_roles_button':
                    const rolesInfo = await fetchRolesInfo(guildId, roleIds);
                    const options = rolesInfo.map(role => ({
                        label: role.name,
                        value: role.id,
                        emoji: undefined
                    }));

                    await rest.patch(
                        Routes.webhookMessage(applicationId, interaction.token),
                        {
                            body: {
                                content: 'Almak istediğin rolleri seç.',
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
                                                max_values: options.length || 1,
                                                options: options.length > 0 ? options : [
                                                    { label: 'Rol bulunamadı', value: 'no_roles' }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    );
                    break;

                case 'faceit_role_request_button':
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
                                            style: 1,
                                            label: 'Faceit Kullanıcı Adınız:',
                                            placeholder: 'örnek: shroud',
                                            required: true,
                                            min_length: 3,
                                            max_length: 30
                                        }
                                    ]
                                }
                            ]
                        }
                    });

                case 'multi_role_select':
                    const selectedRoleIds = interaction.data.values;
                    const failedRoles = [];
                    let rolesGivenCount = 0;

                    if (selectedRoleIds.includes('no_roles')) {
                        await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                            body: {
                                content: 'Seçilebilecek bir rol bulunamadı.',
                                flags: InteractionResponseFlags.EPHEMERAL
                            }
                        });
                        break;
                    }

                    for (const roleId of selectedRoleIds) {
                        try {
                            await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                            rolesGivenCount++;
                        } catch (e) {
                            failedRoles.push(roleId);
                        }
                    }

                    await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                        body: {
                            content: rolesGivenCount > 0
                                ? `${rolesGivenCount} rol başarıyla verildi!`
                                : failedRoles.length > 0
                                    ? `Bazı roller verilemedi: ${failedRoles.join(', ')}.`
                                    : 'Herhangi bir rol seçilmedi.',
                            flags: InteractionResponseFlags.EPHEMERAL
                        }
                    });
                    break;

                default:
                    await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                        body: {
                            content: 'Bilinmeyen bileşen.',
                            flags: InteractionResponseFlags.EPHEMERAL
                        }
                    });
            }
        }

        else if (interaction.type === InteractionType.MODAL_SUBMIT) {
            const { custom_id } = interaction.data;
            const memberId = interaction.member.user.id;
            const guildId = interaction.guild_id;

            await res.send({
                type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                flags: InteractionResponseFlags.EPHEMERAL
            });

            if (custom_id === 'modal_faceit_nickname_submit') {
                const nicknameInput = interaction.data.components[0].components[0].value;
                let responseMessage = '';
                let faceitLevel = null;

                try {
                    const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
                    const faceitApiUrl = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nicknameInput)}`;
                    const apiResponse = await fetch(faceitApiUrl, {
                        headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` }
                    });
                    const playerData = await apiResponse.json();

                    if (apiResponse.ok) {
                        faceitLevel = playerData?.games?.csgo?.skill_level;
                        if (!faceitLevel) {
                            responseMessage = `Faceit nickname "**${nicknameInput}**" için CS:GO verisi bulunamadı.`;
                        }
                    } else {
                        responseMessage = playerData?.message || 'Bilinmeyen bir hata oluştu.';
                    }
                } catch (apiError) {
                    responseMessage = 'API bağlantı hatası.';
                }

                if (faceitLevel) {
                    const roleToAssignId = process.env[`LEVEL_${faceitLevel}_ROLE_ID`];
                    if (roleToAssignId) {
                        try {
                            await rest.put(Routes.guildMemberRole(guildId, memberId, roleToAssignId));
                            responseMessage = `Faceit seviyeniz **${faceitLevel}** ve rol verildi.`;
                        } catch {
                            responseMessage = `Rol verme hatası (Level ${faceitLevel})`;
                        }
                    } else {
                        responseMessage = `Level ${faceitLevel} için rol tanımlı değil.`;
                    }
                }

                await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                    body: {
                        content: responseMessage,
                        flags: InteractionResponseFlags.EPHEMERAL
                    }
                });
            }
        }
    } catch (error) {
        console.error('Etkileşim işleme hatası:', error);
        if (interaction.token && applicationId) {
            await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                body: {
                    content: 'Beklenmeyen bir hata oluştu.',
                    flags: InteractionResponseFlags.EPHEMERAL
                }
            }).catch(console.error);
        }
    }
});

app.listen(PORT, async () => {
    console.log(`Listening on port ${PORT}`);
    await initializeMessages();
});
