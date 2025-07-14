// index.js
import express from 'express';
import dotenv from 'dotenv';
import { verifyKey, InteractionResponseFlags } from 'discord-interactions'; // Import InteractionResponseFlags
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
        // Extract database name from the URI
        const dbName = new URL(uri).pathname.substring(1);
        db = client.db(dbName);
        console.log("MongoDB'ye bağlantı başarılı!");
    } catch (err) {
        console.error("MongoDB bağlantı hatası:", err);
        process.exit(1);
    }
}

/**
 * Fetches the configurable role IDs for a given guild from the database.
 * @param {string} guildId - The ID of the guild.
 * @returns {Promise<string[]>} An array of configurable role IDs.
 */
const getGuildConfigurableRoles = async (guildId) => {
    try {
        const guildConfig = await db.collection('guild_configs').findOne({ guildId });
        return guildConfig?.configurableRoleIds || [];
    } catch (error) {
        console.error(`Guild ${guildId} için yapılandırılabilir roller alınamadı:`, error);
        return [];
    }
};

const fetchRolesInfo = async (guildId) => {
    const configurableRoleIds = await getGuildConfigurableRoles(guildId);
    if (configurableRoleIds.length === 0) return [];
    try {
        const guildRoles = await rest.get(Routes.guildRoles(guildId));
        // Filter out roles that are not in the configurable list
        return guildRoles.filter(role => configurableRoleIds.includes(role.id));
    } catch (error) {
        console.error('Rol bilgisi alınamadı:', error);
        return [];
    }
};


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
            return res.send({ type: 1 }); // PONG response for Discord's health check
        }

        // Ensure database connection is established before processing interactions
        if (!db) {
            return res.send({
                type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                data: {
                    content: 'Bot hazır değil, lütfen daha sonra tekrar deneyin.',
                    flags: InteractionResponseFlags.EPHEMERAL, // Only visible to the user
                }
            });
        }

        // Handle different interaction types (APPLICATION_COMMAND, MESSAGE_COMPONENT, MODAL_SUBMIT)
        if (type === 2 || type === 3 || type === 5) {
            const custom_id = data?.custom_id;

            // Handle role selection interactions
            if (['select_roles_button', 'multi_role_select'].includes(custom_id)) {
                await handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo);
                return; // Ensure no further response is sent
            }

            // Handle Faceit-related interactions
            if (custom_id === 'faceit_role_request_button' || custom_id === 'modal_faceit_nickname_submit') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
                return; // Ensure no further response is sent
            }
        }

        // Default response for any unhandled interaction
        return res.send({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: {
                content: 'Bilinmeyen bir etkileşim alındı.',
                flags: InteractionResponseFlags.EPHEMERAL,
            }
        });

    } catch (error) {
        console.error('Etkileşim işleme hatası:', error);
        // Attempt to send an error message back to Discord if interaction token is available
        if (interaction?.token && applicationId) {
            try {
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    }
                );
            } catch (e) {
                console.error('Webhook mesajı gönderilirken hata:', e);
            }
        } else {
            // If no token or application ID, send a standard HTTP 500 response
            res.status(500).send('Internal Server Error');
        }
    }
});

app.listen(PORT, async () => {
    console.log(`Sunucu port ${PORT} uzerinde dinleniyor.`);
    await connectToMongoDB(); // Establish MongoDB connection on server start
});
