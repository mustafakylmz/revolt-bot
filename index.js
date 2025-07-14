import express from 'express';
import dotenv from 'dotenv';
import pkg from 'discord-interactions';
const {
    verifyKeyMiddleware,
    InteractionType,
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes
} = pkg;

import { REST } from '@discordjs/rest';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';

// MongoDB imports
import { MongoClient, ServerApiVersion } from 'mongodb';

// Etkileşim işleyici modüllerini import et
import { handleRoleInteraction } from './interactions/roleInteractions.js';
import { handleFaceitInteraction } from './interactions/faceitInteractions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// Discord etkileşimleri için verifyKeyMiddleware kullanıyoruz
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY));

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
const applicationId = process.env.DISCORD_CLIENT_ID;

// MongoDB bağlantı dizesi
const uri = process.env.MONGO_URI;
if (!uri) {
    console.error("Hata: MONGO_URI ortam değişkeni tanımlanmamış.");
    process.exit(1);
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;

async function connectToMongoDB() {
    try {
        await client.connect();
        db = client.db(new URL(uri).pathname.substring(1));
        console.log("MongoDB'ye başarıyla bağlandı!");
    } catch (error) {
        console.error("MongoDB bağlantı hatası:", error);
        process.exit(1);
    }
}

/**
 * Belirli bir sunucu için atanabilir rol ID'lerini MongoDB'den alır.
 * @param {string} guildId 
 * @returns {Promise<string[]>}
 */
async function getGuildConfigurableRoles(guildId) {
    if (!db) return [];
    const collection = db.collection('guild_configs');
    const doc = await collection.findOne({ guildId });
    return doc ? (doc.roleIds || []) : [];
}

/**
 * Sunucudaki belirli rol ID'lerinin detaylarını Discord API'den alır.
 * @param {string} guildId 
 * @returns {Promise<Array>}
 */
async function fetchRolesInfo(guildId) {
    const configurableRoleIds = await getGuildConfigurableRoles(guildId);
    if (configurableRoleIds.length === 0) return [];
    try {
        const guildRoles = await rest.get(Routes.guildRoles(guildId));
        return guildRoles.filter(role => configurableRoleIds.includes(role.id));
    } catch (error) {
        console.error('Rol bilgisi çekilemedi:', error);
        return [];
    }
}

// Slash komutlarını kayıt fonksiyonu
async function registerGlobalCommands() {
    const commands = [
        {
            name: 'ping',
            description: 'Botun durumunu kontrol eder.',
        },
        {
            name: 'setup-roles',
            description: 'Rol seçim mesajını kurar ve atanabilir rolleri ayarlar.',
            options: [
                {
                    name: 'channel',
                    description: 'Mesajın gönderileceği kanal.',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                },
                // Rol seçenekleri 1-10 arası
                ...Array(10).fill().map((_, i) => ({
                    name: `role_${i + 1}`,
                    description: `Atanabilir rol ${i + 1}`,
                    type: ApplicationCommandOptionType.Role,
                    required: i === 0,
                })),
            ]
        },
        {
            name: 'setup-faceit',
            description: 'Faceit rol mesajını kurar.',
            options: [
                {
                    name: 'channel',
                    description: 'Mesajın gönderileceği kanal.',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                }
            ]
        },
        {
            name: 'set-faceit-level-roles',
            description: 'Faceit seviye rolleri ayarlar.',
            options: Array(10).fill().map((_, i) => ({
                name: `level_${i + 1}_role`,
                description: `Faceit Level ${i + 1} rolü`,
                type: ApplicationCommandOptionType.Role,
                required: true,
            }))
        }
    ];

    try {
        console.log('Global komutlar kaydediliyor...');
        await rest.put(Routes.applicationCommands(applicationId), { body: commands });
        console.log('Global komutlar başarıyla kaydedildi!');
    } catch (error) {
        console.error('Global komutları kaydederken hata:', error);
    }
}

app.post('/interactions', async (req, res) => {
    const interaction = req.body;

    if (interaction.type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    if (!db) {
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Bot hazırlanıyor, lütfen bekleyin.',
                flags: InteractionResponseFlags.EPHEMERAL,
            }
        });
    }

    try {
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            const { name, options } = interaction.data;
            const guildId = interaction.guild_id;

            switch (name) {
                case 'ping':
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Pong!',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
                case 'setup-roles': {
                    const rolesChannelId = options.find(opt => opt.name === 'channel').value;
                    const rolesArray = [];
                    for (let i = 1; i <= 10; i++) {
                        const roleOpt = options.find(opt => opt.name === `role_${i}`);
                        if (roleOpt && roleOpt.value) rolesArray.push(roleOpt.value);
                    }
                    const collection = db.collection('guild_configs');
                    await collection.updateOne(
                        { guildId },
                        { $set: { roleIds: rolesArray } },
                        { upsert: true }
                    );

                    // Rol seçme mesajı gönder
                    await rest.post(Routes.channelMessages(rolesChannelId), {
                        body: {
                            content: 'Rolleri seçmek için aşağıdaki butonu kullanın.',
                            components: [{
                                type: MessageComponentTypes.ACTION_ROW,
                                components: [{
                                    type: MessageComponentTypes.BUTTON,
                                    label: 'Rolleri Seç',
                                    style: 1,
                                    custom_id: 'select_roles_button',
                                }]
                            }]
                        }
                    });

                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `Rol seçme mesajı <#${rolesChannelId}> kanalına kuruldu!`,
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
                }
                case 'setup-faceit': {
                    const faceitChannelId = options.find(opt => opt.name === 'channel').value;

                    await rest.post(Routes.channelMessages(faceitChannelId), {
                        body: {
                            content: 'Faceit seviyenize göre rol almak için butona tıklayın.',
                            components: [{
                                type: MessageComponentTypes.ACTION_ROW,
                                components: [{
                                    type: MessageComponentTypes.BUTTON,
                                    label: 'Faceit Rolü Al',
                                    style: 1,
                                    custom_id: 'faceit_role_request_button',
                                }]
                            }]
                        }
                    });

                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `Faceit rol alma mesajı <#${faceitChannelId}> kanalına kuruldu!`,
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
                }
                case 'set-faceit-level-roles': {
                    const levelRolesMap = {};
                    for (let i = 1; i <= 10; i++) {
                        const roleOpt = options.find(opt => opt.name === `level_${i}_role`);
                        if (roleOpt) {
                            levelRolesMap[String(i)] = roleOpt.value;
                        }
                    }
                    const collection = db.collection('guild_configs');
                    await collection.updateOne(
                        { guildId },
                        { $set: { faceitLevelRoles: levelRolesMap } },
                        { upsert: true }
                    );

                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Faceit seviye rolleri kaydedildi!',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
                }
                default:
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Bilinmeyen komut.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
            }
        } else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
            const { custom_id } = interaction.data;

            if (['select_roles_button', 'multi_role_select'].includes(custom_id)) {
                await handleRoleInteraction(interaction, res, rest, applicationId, db);
            } else if (custom_id === 'faceit_role_request_button' || custom_id === 'modal_faceit_nickname_submit') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
            } else {
                await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                    body: {
                        content: 'Bilinmeyen bileşen etkileşimi.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                });
            }
        } else if (interaction.type === InteractionType.MODAL_SUBMIT) {
            const { custom_id } = interaction.data;

            if (custom_id === 'modal_faceit_nickname_submit') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
            } else {
                await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                    body: {
                        content: 'Bilinmeyen modal gönderimi.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                });
            }
        }
    } catch (error) {
        console.error('Etkileşim işleme hatası:', error);
        try {
            await rest.patch(Routes.webhookMessage(applicationId, interaction.token), {
                body: {
                    content: 'Komut işlenirken hata oluştu. Lütfen bot sahibine bildirin.',
                    flags: InteractionResponseFlags.EPHEMERAL,
                }
            });
        } catch (e) {
            console.error('Hata mesajı gönderilirken hata:', e);
        }
    }
});

app.listen(PORT, async () => {
    console.log(`Sunucu port ${PORT} üzerinde çalışıyor.`);
    await connectToMongoDB();
    await registerGlobalCommands();
});