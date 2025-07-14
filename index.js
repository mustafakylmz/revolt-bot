// === index.js (TAM DÜZENLENMİŞ HALİ) ===

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
import { MongoClient, ServerApiVersion } from 'mongodb';
import { handleRoleInteraction } from './interactions/roleInteractions.js';
import { handleFaceitInteraction } from './interactions/faceitInteractions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Discord verify middleware için raw body gerekiyor
app.use('/interactions', express.raw({ type: 'application/json' }));

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
const applicationId = process.env.DISCORD_CLIENT_ID;

const uri = process.env.MONGO_URI;
if (!uri) {
    console.error("Hata: MONGO_URI ortam değişkeni tanımlanmamış. Lütfen .env dosyasını kontrol edin.");
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

// Discord etkileşimlerini işleyen endpoint
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
    const interaction = JSON.parse(req.body.toString('utf-8'));

    if (interaction.type === InteractionType.PING) {
        console.log("PING alındı.");
        return res.send({ type: InteractionResponseType.PONG });
    }

    if (!db) {
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Bot başlatılıyor, lütfen tekrar deneyin.',
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
                case 'setup-roles':
                    const rolesChannelId = options.find(opt => opt.name === 'channel').value;
                    const rolesArray = [];
                    // Rol seçeneklerinden ID'leri topla
                    for (let i = 1; i <= 10; i++) {
                        const roleOption = options.find(opt => opt.name === `role_${i}`);
                        if (roleOption && roleOption.value) {
                            rolesArray.push(roleOption.value);
                        }
                    }

                    await saveGuildConfigurableRoles(guildId, rolesArray);

                    await sendOrUpdateMessage(
                        guildId,
                        rolesChannelId,
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
                                            style: 1, // Primary (mavi)
                                            custom_id: 'select_roles_button',
                                        }
                                    ]
                                }
                            ]
                        }
                    );
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `Rol seçim mesajı <#${rolesChannelId}> kanalına başarıyla kuruldu ve atanabilir roller kaydedildi.`,
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });

                case 'setup-faceit':
                    const faceitChannelId = options.find(opt => opt.name === 'channel').value;

                    await sendOrUpdateMessage(
                        guildId,
                        faceitChannelId,
                        'faceitMessage',
                        {
                            content: 'Faceit seviyenize göre rol almak için aşağıdaki butonu kullanın. Bot, Faceit API\'sından seviyenizi çekecektir.',
                            components: [
                                {
                                    type: MessageComponentTypes.ACTION_ROW,
                                    components: [
                                        {
                                            type: MessageComponentTypes.BUTTON,
                                            label: 'Faceit Rolü Al',
                                            style: 1, // Primary (mavi)
                                            custom_id: 'faceit_role_request_button',
                                        }
                                    ]
                                }
                            ]
                        }
                    );
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: `Faceit rolü alma mesajı <#${faceitChannelId}> kanalına başarıyla kuruldu.`,
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });

                case 'set-faceit-level-roles':
                    const levelRolesMap = {};
                    for (let i = 1; i <= 10; i++) {
                        const roleOption = options.find(opt => opt.name === `level_${i}_role`);
                        if (roleOption) {
                            levelRolesMap[String(i)] = roleOption.value; // roleOption.value will be the role ID
                        }
                    }
                    await saveGuildFaceitLevelRoles(guildId, levelRolesMap);
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Faceit seviye rolleri başarıyla kaydedildi!',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });

                default:
                    return res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Bilinmeyen bir komut.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
            }
        } else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
            const { custom_id } = interaction.data;

            if ([
                'select_roles_button',
                'multi_role_select'
            ].includes(custom_id)) {
                await handleRoleInteraction(interaction, res, rest, applicationId, db);
            } else if ([
                'faceit_role_request_button',
                'modal_faceit_nickname_submit'
            ].includes(custom_id)) {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
            } else {
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: 'Bilinmeyen bileşen etkileşimi.',
                            flags: InteractionResponseFlags.EPHEMERAL
                        }
                    }
                );
            }
        } else if (interaction.type === InteractionType.MODAL_SUBMIT) {
            const { custom_id } = interaction.data;

            if (custom_id === 'modal_faceit_nickname_submit') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
            } else {
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: 'Bilinmeyen bir modal gönderimi.',
                            flags: InteractionResponseFlags.EPHEMERAL
                        }
                    }
                );
            }
        }
    } catch (error) {
        console.error('İşleme hatası:', error);
        if (interaction.token && applicationId) {
            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: 'Bir hata oluştu. Lütfen tekrar deneyin.',
                        flags: InteractionResponseFlags.EPHEMERAL
                    }
                }
            ).catch(console.error);
        }
    }
});

app.listen(PORT, async () => {
    console.log(`Listening on port ${PORT}`);
    await connectToMongoDB();
    // await registerGlobalCommands(); // Gerekirse global komut kayıt fonksiyonunu çağır
});
