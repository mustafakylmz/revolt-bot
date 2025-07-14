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
                // setup-roles, setup-faceit, set-faceit-level-roles gibi komutlar buraya eklenmeli
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
