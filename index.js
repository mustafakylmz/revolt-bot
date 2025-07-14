// index.js
import express from 'express';
import dotenv from 'dotenv';
import { verifyKey } from 'discord-interactions';
import getRawBody from 'raw-body';
import { REST } from '@discordjs/rest';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { handleRoleInteraction } from './interactions/roleInteractions.js';
import { handleFaceitInteraction } from './interactions/faceitInteractions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const applicationId = process.env.DISCORD_CLIENT_ID;
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

const uri = process.env.MONGO_URI;
if (!uri) {
    console.error("Hata: MONGO_URI tanımlı değil.");
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
        console.log("MongoDB'ye bağlantı başarılı!");
    } catch (err) {
        console.error("MongoDB bağlantı hatası:", err);
        process.exit(1);
    }
}

app.post('/interactions', async (req, res) => {
    let rawBody;
    try {
        rawBody = await getRawBody(req);
    } catch (err) {
        console.error('Raw body okunamadı:', err);
        return res.status(400).send('Bad Request');
    }

    const signature = req.header('X-Signature-Ed25519');
    const timestamp = req.header('X-Signature-Timestamp');

    const isValid = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
    if (!isValid) {
        console.warn('Geçersiz istek: imza doğrulanamadı');
        return res.status(401).send('Invalid request signature');
    }

    let interaction;
    try {
        interaction = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
        console.error('JSON parse hatası:', err);
        return res.status(400).send('Invalid JSON');
    }

    try {
        const { type, data, guild_id } = interaction;

        if (type === 1) {
            return res.send({ type: 1 }); // PONG
        }

        if (!db) {
            return res.send({
                type: 4,
                data: {
                    content: 'Bot hazır değil, lütfen daha sonra tekrar deneyin.',
                    flags: 64,
                }
            });
        }

        if (type === 2 || type === 3 || type === 5) {
            const custom_id = data?.custom_id;

            if (['select_roles_button', 'multi_role_select'].includes(custom_id)) {
                await handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo);
            }

            if (custom_id === 'faceit_role_request_button' || custom_id === 'modal_faceit_nickname_submit') {
                return await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
            }
        }

        return res.send({
            type: 4,
            data: {
                content: 'Bilinmeyen bir etkileşim alındı.',
                flags: 64,
            }
        });

    } catch (error) {
        console.error('Etkileşim işleme hatası:', error);
        if (interaction?.token) {
            try {
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: 'Roller güncellenirken bir hata oluştu.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    }
                );
            } catch (e) {
                console.error('Webhook mesajı gönderilirken hata:', e);
            }
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
});

app.listen(PORT, async () => {
    console.log(`Sunucu port ${PORT} uzerinde dinleniyor.`);
    await connectToMongoDB();
});
