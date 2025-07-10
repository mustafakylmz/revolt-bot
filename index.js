import express from 'express';
import dotenv from 'dotenv';
import pkg from 'discord-interactions';
const {
    verifyKeyMiddleware,
    InteractionType,
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
} = pkg;

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
const applicationId = process.env.DISCORD_CLIENT_ID;

// === ROL & MESAJ DOSYALARI ===
const rolesFilePath = path.resolve('./roles.json');
const messageIdsFilePath = path.resolve('./message_ids.json');

const roleIds = JSON.parse(fs.readFileSync(rolesFilePath, 'utf-8'));

let messageIds = {};
if (fs.existsSync(messageIdsFilePath)) {
    try {
        messageIds = JSON.parse(fs.readFileSync(messageIdsFilePath, 'utf-8'));
    } catch {
        messageIds = {};
        fs.writeFileSync(messageIdsFilePath, JSON.stringify({}, null, 2));
    }
} else {
    fs.writeFileSync(messageIdsFilePath, JSON.stringify({}, null, 2));
}

function saveMessageIds(data) {
    fs.writeFileSync(messageIdsFilePath, JSON.stringify(data, null, 2));
}

async function fetchRolesInfo(guildId, roleIds) {
    try {
        const guildRoles = await rest.get(Routes.guildRoles(guildId));
        return guildRoles.filter(role => roleIds.includes(role.id));
    } catch (e) {
        console.error("Rol bilgisi çekilemedi:", e);
        return [];
    }
}

async function sendOrUpdateMessage(channelId, messageKey, messageContent) {
    if (!channelId) return;

    try {
        let messageId = messageIds[messageKey];

        if (messageId) {
            try {
                await rest.patch(Routes.channelMessage(channelId, messageId), { body: messageContent });
            } catch (e) {
                if (e.code === 10008) {
                    const newMessage = await rest.post(Routes.channelMessages(channelId), { body: messageContent });
                    messageIds[messageKey] = newMessage.id;
                    saveMessageIds(messageIds);
                } else throw e;
            }
        } else {
            const newMessage = await rest.post(Routes.channelMessages(channelId), { body: messageContent });
            messageIds[messageKey] = newMessage.id;
            saveMessageIds(messageIds);
        }
    } catch (e) {
        console.error("Mesaj güncelleme hatası:", e);
    }
}

async function initializeMessages() {
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
            content: 'Faceit seviyenize göre rol almak için aşağıdaki butonu kullanın.',
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

// 🔐 INTERACTIONS ROUTE — express.raw + verifyKeyMiddleware
app.post(
    '/interactions',
    express.raw({ type: 'application/json' }),
    verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY),
    async (req, res) => {
        const interaction = req.body; // ✅ BU ARTIK NESNE, PARSE ETME!
        const guildId = interaction.guild_id;
        const memberId = interaction?.member?.user?.id;

        try {
            // PING
            if (interaction.type === InteractionType.PING) {
                return res.send({ type: InteractionResponseType.PONG });
            }

            // KOMUTLAR
            if (interaction.type === InteractionType.APPLICATION_COMMAND) {
                const name = interaction.data.name;

                if (name === 'ping') {
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Pong!',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
                }
            }

            // BUTONLAR & SELECT MENU
            if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
                const { custom_id } = interaction.data;

                if (custom_id === 'select_roles_button') {
                    const roles = await fetchRolesInfo(guildId, roleIds);
                    const options = roles.map(r => ({
                        label: r.name,
                        value: r.id
                    }));

                    return await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                        body: {
                            content: 'Rolleri seç:',
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
                                            options: options.length > 0 ? options : [{ label: 'Rol yok', value: 'no_roles' }],
                                        }
                                    ]
                                }
                            ]
                        }
                    });
                }

                if (custom_id === 'faceit_role_request_button') {
                    return res.send({
                        type: InteractionResponseType.MODAL,
                        data: {
                            custom_id: 'modal_faceit_nickname_submit',
                            title: 'Faceit Nickname',
                            components: [
                                {
                                    type: MessageComponentTypes.ACTION_ROW,
                                    components: [
                                        {
                                            type: MessageComponentTypes.TEXT_INPUT,
                                            custom_id: 'faceit_nickname_input',
                                            style: 1,
                                            label: 'Kullanıcı adınız:',
                                            placeholder: 'örn: shroud',
                                            required: true,
                                            min_length: 3,
                                            max_length: 30
                                        }
                                    ]
                                }
                            ]
                        }
                    });
                }

                if (custom_id === 'multi_role_select') {
                    const selected = interaction.data.values;
                    let success = 0;

                    for (const roleId of selected) {
                        try {
                            await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                            success++;
                        } catch (e) {
                            console.error("Rol verilemedi:", roleId, e);
                        }
                    }

                    return await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                        body: {
                            content: `${success} rol başarıyla verildi.`,
                            flags: InteractionResponseFlags.EPHEMERAL
                        }
                    });
                }
            }

            // MODAL GÖNDERİMİ
            if (interaction.type === InteractionType.MODAL_SUBMIT) {
                const nickname = interaction.data.components[0].components[0].value;
                let responseText = '';
                let faceitLevel = null;

                try {
                    const apiKey = process.env.FACEIT_API_KEY;
                    const url = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`;

                    const response = await fetch(url, {
                        headers: { Authorization: `Bearer ${apiKey}` }
                    });
                    const json = await response.json();

                    if (response.ok && json?.games?.csgo?.skill_level) {
                        faceitLevel = json.games.csgo.skill_level;
                    } else {
                        responseText = `Faceit verisi alınamadı: ${json.message || 'bilinmeyen hata'}`;
                    }
                } catch (e) {
                    responseText = 'Faceit API hatası.';
                }

                if (faceitLevel) {
                    const roleId = process.env[`LEVEL_${faceitLevel}_ROLE_ID`];
                    try {
                        await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
                        responseText = `Level ${faceitLevel} için rol başarıyla verildi.`;
                    } catch {
                        responseText = `Rol verilemedi (level ${faceitLevel})`;
                    }
                }

                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: responseText,
                        flags: InteractionResponseFlags.EPHEMERAL
                    }
                });
            }
        } catch (e) {
            console.error("İşleme hatası:", e);
            return res.status(500).send('Sunucu hatası.');
        }
    }
);

// 🎯 SADECE /interactions için express.raw, geri kalan rotalar için express.json aktif
app.use(express.json());

app.listen(PORT, async () => {
    console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
    await initializeMessages();
});
