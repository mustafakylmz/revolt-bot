// index.js
import express from 'express';
import dotenv from 'dotenv';
import { verifyKey, InteractionResponseFlags, InteractionResponseType, MessageComponentTypes } from 'discord-interactions'; // Added MessageComponentTypes
import getRawBody from 'raw-body';
import { REST } from '@discordjs/rest';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { handleRoleInteraction, updateRoleSelectionMessage } from './interactions/roleInteractions.js'; // Import updateRoleSelectionMessage
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
        return guildRoles.filter(role => configurableRoleIds.includes(role.id));
    } catch (error) {
        console.error('Rol bilgisi alınamadı:', error);
        return [];
    }
};

/**
 * Checks and updates Faceit ranks for all registered users daily.
 */
async function checkAndUpdateFaceitRanks() {
    if (!db) {
        console.warn("MongoDB bağlantısı henüz kurulmadığı için Faceit rank kontrolü atlandı.");
        return;
    }

    console.log("Faceit ranklarını kontrol etme ve güncelleme işlemi başlatılıyor...");
    try {
        const faceitUsers = await db.collection('faceit_users').find({}).toArray();

        for (const user of faceitUsers) {
            const { discordId, guildId, faceitNickname, faceitLevel: storedFaceitLevel, assignedRoleId: storedAssignedRoleId } = user;
            let currentFaceitLevel = null;
            let newRoleIdToAssign = null;
            let updateNeeded = false;

            try {
                let faceitData = null;
                let faceitRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(faceitNickname)}`, {
                    headers: { Authorization: `Bearer ${process.env.FACEIT_API_KEY}` }
                });

                if (faceitRes.ok) {
                    faceitData = await faceitRes.json();
                } else if (faceitRes.status === 404) {
                    // Try lowercase if original not found
                    faceitRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(faceitNickname.toLowerCase())}`, {
                        headers: { Authorization: `Bearer ${process.env.FACEIT_API_KEY}` }
                    });
                    if (faceitRes.ok) {
                        faceitData = await faceitRes.json();
                    } else {
                        console.warn(`Faceit nickname "${faceitNickname}" bulunamadı veya API hatası. Kullanıcı ${discordId} için rank kontrolü atlandı.`);
                        continue; // Skip to next user
                    }
                } else {
                    const errorData = await faceitRes.json();
                    console.error(`Faceit API hatası (${faceitNickname}): ${errorData.message || 'Bilinmeyen hata'}. Kullanıcı ${discordId} için rank kontrolü atlandı.`);
                    continue; // Skip to next user
                }

                if (faceitData) {
                    if (faceitData.games && faceitData.games.cs2) {
                        currentFaceitLevel = faceitData.games.cs2.skill_level;
                    } else if (faceitData.games && faceitData.games.csgo) {
                        currentFaceitLevel = faceitData.games.csgo.skill_level;
                    }
                }

                if (currentFaceitLevel === undefined || currentFaceitLevel === null) {
                    console.warn(`Kullanıcı ${discordId} (${faceitNickname}) için CS2/CSGO seviyesi tespit edilemedi. Rank kontrolü atlandı.`);
                    continue; // Skip to next user
                }

                // Check if rank has changed
                if (currentFaceitLevel !== storedFaceitLevel) {
                    updateNeeded = true;
                    console.log(`Kullanıcı ${discordId} (${faceitNickname}) için rank değişti: ${storedFaceitLevel} -> ${currentFaceitLevel}`);

                    const guildConfig = await db.collection('guild_configs').findOne({ guildId });
                    newRoleIdToAssign = guildConfig?.faceitLevelRoles?.[String(currentFaceitLevel)] ?? null;

                    // Remove old role if it exists and is different from the new one
                    if (storedAssignedRoleId && storedAssignedRoleId !== newRoleIdToAssign) {
                        try {
                            await rest.delete(Routes.guildMemberRole(guildId, discordId, storedAssignedRoleId));
                            console.log(`Kullanıcı ${discordId} için eski rol ${storedAssignedRoleId} kaldırıldı.`);
                        } catch (e) {
                            console.error(`Kullanıcı ${discordId} için eski rol ${storedAssignedRoleId} kaldırılırken hata:`, e);
                        }
                    }

                    // Assign new role
                    if (newRoleIdToAssign) {
                        try {
                            await rest.put(Routes.guildMemberRole(guildId, discordId, newRoleIdToAssign));
                            console.log(`Kullanıcı ${discordId} için yeni rol ${newRoleIdToAssign} atandı.`);
                        } catch (e) {
                            console.error(`Kullanıcı ${discordId} için yeni rol ${newRoleIdToAssign} atanırken hata:`, e);
                        }
                    } else {
                        console.warn(`Faceit seviyesi ${currentFaceitLevel} için tanımlı rol bulunamadı. Kullanıcı ${discordId} için rol ataması yapılmadı.`);
                    }
                }

            } catch (e) {
                console.error(`Kullanıcı ${discordId} (${faceitNickname}) için Faceit rank kontrolü sırasında hata:`, e);
                continue; // Continue to next user even if one fails
            }

            // Update user in DB if rank changed or role was assigned/removed
            if (updateNeeded) {
                try {
                    await db.collection('faceit_users').updateOne(
                        { discordId, guildId },
                        {
                            $set: {
                                faceitLevel: currentFaceitLevel,
                                assignedRoleId: newRoleIdToAssign,
                                lastUpdated: new Date()
                            }
                        }
                    );
                    console.log(`Kullanıcı ${discordId} veritabanında güncellendi.`);
                } catch (e) {
                    console.error(`Kullanıcı ${discordId} MongoDB'ye kaydedilirken hata:`, e);
                }
            }
        }
        console.log("Faceit rank kontrolü ve güncelleme işlemi tamamlandı.");
    } catch (error) {
        console.error("Tüm Faceit kullanıcıları üzerinde işlem yapılırken hata:", error);
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
        const { type, data, guild_id, channel_id } = interaction; // Added channel_id

        if (type === 1) {
            return res.send({ type: 1 }); // PONG response for Discord's health check
        }

        if (!db) {
            return res.send({
                type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                data: {
                    content: 'Bot hazır değil, lütfen daha sonra tekrar deneyin.',
                    flags: InteractionResponseFlags.EPHEMERAL, // Only visible to the user
                }
            });
        }

        // Handle slash commands
        if (type === 2) { // APPLICATION_COMMAND
            const { name, options } = data;
            if (name === 'send-role-panel') {
                const targetChannelId = options?.find(opt => opt.name === 'channel')?.value || channel_id;
                await updateRoleSelectionMessage(guild_id, targetChannelId, db, rest, applicationId, fetchRolesInfo, true); // Pass true for initial send
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: `Rol seçim paneli <#${targetChannelId}> kanalına gönderildi/güncellendi.`,
                        flags: InteractionResponseFlags.EPHEMERAL
                    }
                });
            } else if (name === 'refresh-role-panel') {
                await updateRoleSelectionMessage(guild_id, null, db, rest, applicationId, fetchRolesInfo, false); // Pass false for refresh
                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Rol seçim paneli güncelleniyor...',
                        flags: InteractionResponseFlags.EPHEMERAL
                    }
                });
            }
        }


        if (type === 2 || type === 3 || type === 5) { // APPLICATION_COMMAND, MESSAGE_COMPONENT, MODAL_SUBMIT
            const custom_id = data?.custom_id;

            if (['select_roles_button', 'multi_role_select'].includes(custom_id)) {
                await handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo);
                return;
            }

            if (custom_id === 'faceit_role_request_button' || custom_id === 'modal_faceit_nickname_submit') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
                return;
            }
        }

        return res.send({
            type: 4,
            data: {
                content: 'Bilinmeyen bir etkileşim alındı.',
                flags: InteractionResponseFlags.EPHEMERAL,
            }
        });

    } catch (error) {
        console.error('Etkileşim işleme hatası:', error);
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
            res.status(500).send('Internal Server Error');
        }
    }
});

app.listen(PORT, async () => {
    console.log(`Sunucu port ${PORT} uzerinde dinleniyor.`);
    await connectToMongoDB();

    // Schedule daily rank check (every 24 hours)
    // For production, consider a dedicated cron job service or a more robust scheduler.
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
    setInterval(checkAndUpdateFaceitRanks, ONE_DAY_IN_MS);
    console.log("Faceit rank kontrolü günlük olarak planlandı.");

    // Optionally run once on startup
    checkAndUpdateFaceitRanks();
});
