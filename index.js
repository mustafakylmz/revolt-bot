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

// Discord etkileşimleri için özel bir body parser kullanmaya gerek yok.
// verifyKeyMiddleware zaten raw body'yi işler ve req.body'yi doldurur.
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY));

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
const applicationId = process.env.DISCORD_CLIENT_ID;

// MongoDB bağlantı dizesi
const uri = process.env.MONGO_URI;
if (!uri) {
    console.error("Hata: MONGO_URI ortam değişkeni tanımlanmamış. Lütfen .env dosyasını kontrol edin.");
    process.exit(1); // Uygulamayı sonlandır
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db; // MongoDB veritabanı objesi

async function connectToMongoDB() {
    try {
        await client.connect();
        db = client.db(new URL(uri).pathname.substring(1)); // URI'dan veritabanı adını al
        console.log("MongoDB'ye başarıyla bağlandı!");
    } catch (error) {
        console.error("MongoDB bağlantı hatası:", error);
        process.exit(1); // Bağlantı hatasında uygulamayı sonlandır
    }
}

/**
 * Belirli bir sunucu için mesaj ID'lerini MongoDB'den okur.
 * @param {string} guildId - Sunucu ID'si.
 * @returns {Promise<object>} Mesaj ID'lerini içeren obje.
 */
async function getGuildMessageIds(guildId) {
    if (!db) {
        console.warn("MongoDB: Veritabanı bağlantısı hazır değil, mesaj ID'leri çekilemiyor.");
        return {};
    }
    const collection = db.collection('guild_configs');
    const doc = await collection.findOne({ guildId: guildId });
    return doc ? (doc.messages || {}) : {};
}

/**
 * Belirli bir sunucu için mesaj ID'lerini MongoDB'ye kaydeder.
 * @param {string} guildId - Sunucu ID'si.
 * @param {object} data - Kaydedilecek mesaj ID'leri.
 */
async function saveGuildMessageIds(guildId, data) {
    if (!db) {
        console.warn("MongoDB: Veritabanı bağlantısı hazır değil, mesaj ID'leri kaydedilemiyor.");
        return;
    }
    const collection = db.collection('guild_configs');
    await collection.updateOne(
        { guildId: guildId },
        { $set: { messages: data } },
        { upsert: true } // Belge yoksa oluştur
    );
    console.log(`MongoDB: Mesaj ID'leri ${guildId} için kaydedildi.`);
}

/**
 * Belirli bir sunucu için atanabilir rol ID'lerini MongoDB'den okur.
 * @param {string} guildId - Sunucu ID'si.
 * @returns {Promise<string[]>} Atanabilir rol ID'lerinin listesi.
 */
async function getGuildConfigurableRoles(guildId) {
    if (!db) {
        console.warn("MongoDB: Veritabanı bağlantısı hazır değil, atanabilir roller çekilemiyor.");
        return [];
    }
    const collection = db.collection('guild_configs');
    const doc = await collection.findOne({ guildId: guildId });
    return doc ? (doc.roleIds || []) : [];
}

/**
 * Belirli bir sunucu için atanabilir rol ID'lerini MongoDB'ye kaydeder.
 * @param {string} guildId - Sunucu ID'si.
 * @param {string[]} roleIdsArray - Atanabilir rol ID'lerinin listesi.
 */
async function saveGuildConfigurableRoles(guildId, roleIdsArray) {
    if (!db) {
        console.warn("MongoDB: Veritabanı bağlantısı hazır değil, atanabilir roller kaydedilemiyor.");
        return;
    }
    const collection = db.collection('guild_configs');
    await collection.updateOne(
        { guildId: guildId },
        { $set: { roleIds: roleIdsArray } },
        { upsert: true } // Belge yoksa oluştur
    );
    console.log(`MongoDB: Atanabilir roller ${guildId} için kaydedildi.`);
}

/**
 * Belirli bir sunucu için Faceit seviye-rol haritasını MongoDB'den okur.
 * @param {string} guildId - Sunucu ID'si.
 * @returns {Promise<object>} Faceit seviye-rol haritası.
 */
async function getGuildFaceitLevelRoles(guildId) {
    if (!db) {
        console.warn("MongoDB: Veritabanı bağlantısı hazır değil, Faceit seviye rolleri çekilemiyor.");
        return {};
    }
    const collection = db.collection('guild_configs');
    const doc = await collection.findOne({ guildId: guildId });
    return doc ? (doc.faceitLevelRoles || {}) : {};
}

/**
 * Belirli bir sunucu için Faceit seviye-rol haritasını MongoDB'ye kaydeder.
 * @param {string} guildId - Sunucu ID'si.
 * @param {object} levelRolesMap - Faceit seviye-rol haritası.
 */
async function saveGuildFaceitLevelRoles(guildId, levelRolesMap) {
    if (!db) {
        console.warn("MongoDB: Veritabanı bağlantısı hazır değil, Faceit seviye rolleri kaydedilemiyor.");
        return;
    }
    const collection = db.collection('guild_configs');
    await collection.updateOne(
        { guildId: guildId },
        { $set: { faceitLevelRoles: levelRolesMap } },
        { upsert: true }
    );
    console.log(`MongoDB: Faceit seviye rolleri ${guildId} için kaydedildi.`);
}


/**
 * Sunucudaki belirli rol ID'lerinin detaylı bilgilerini çeker.
 * Bu fonksiyon artık MongoDB'den gelen roleIds'i kullanacak.
 */
async function fetchRolesInfo(guildId) {
    const configurableRoleIds = await getGuildConfigurableRoles(guildId);
    if (configurableRoleIds.length === 0) {
        console.log(`fetchRolesInfo: ${guildId} için yapılandırılmış rol ID'si yok.`);
        return [];
    }
    try {
        const guildRoles = await rest.get(Routes.guildRoles(guildId));
        const filteredRoles = guildRoles.filter(role => configurableRoleIds.includes(role.id));
        console.log(`Çekilen ve filtrelenen rol sayısı: ${filteredRoles.length}`); // DEBUG LOG
        return filteredRoles;
    } catch (error) {
        console.error('Rol bilgisi çekilemedi:', error);
        return [];
    }
}

/**
 * Belirtilen kanalda mesajı gönderir veya günceller.
 * @param {string} guildId - Mesajın gönderileceği sunucu ID'si.
 * @param {string} channelId - Mesajın gönderileceği/güncelleneceği kanal ID'si.
 * @param {string} messageKey - MongoDB'deki anahtar (örn: 'rolesMessage', 'faceitMessage').
 * @param {object} messageContent - Mesajın içeriği (content, components, flags vb.).
 */
async function sendOrUpdateMessage(guildId, channelId, messageKey, messageContent) {
    if (!channelId) {
        console.error(`Hata: ${messageKey} için kanal ID'si tanımlanmamış. Mesaj gönderilemedi.`);
        return;
    }
    try {
        const guildMessageIds = await getGuildMessageIds(guildId);
        let messageId = guildMessageIds[messageKey];
        console.log(`Mesaj ${messageKey} için mevcut ID: ${messageId || 'Yok'} (Guild: ${guildId})`); // DEBUG LOG

        if (messageId) {
            try {
                // Mesajı güncellemeye çalış
                await rest.patch(Routes.channelMessage(channelId, messageId), { body: messageContent });
                console.log(`Mesaj başarıyla güncellendi: ${messageKey} (${messageId}) (Guild: ${guildId})`);
            } catch (error) {
                // Mesaj bulunamazsa veya silinmişse, yeni bir mesaj gönder
                if (error.code === 10008) { // DiscordAPIError[10008]: Unknown Message
                    console.warn(`Mevcut mesaj bulunamadı veya silinmiş: ${messageKey}. Yeni mesaj gönderiliyor... (Guild: ${guildId})`);
                    const newMessage = await rest.post(Routes.channelMessages(channelId), { body: messageContent });
                    guildMessageIds[messageKey] = newMessage.id;
                    await saveGuildMessageIds(guildId, guildMessageIds);
                    console.log(`Yeni mesaj gönderildi: ${messageKey} (${newMessage.id}) (Guild: ${guildId})`);
                } else {
                    throw error; // Diğer hataları yukarı fırlat
                }
            }
        } else {
            // Mesaj daha önce hiç gönderilmemişse, yeni bir mesaj gönder
            const newMessage = await rest.post(Routes.channelMessages(channelId), { body: messageContent });
            guildMessageIds[messageKey] = newMessage.id;
            await saveGuildMessageIds(guildId, guildMessageIds);
            console.log(`Yeni mesaj gönderildi: ${messageKey} (${newMessage.id}) (Guild: ${guildId})`);
        }
    } catch (error) {
        console.error(`Mesaj gönderme/güncelleme hatası (${messageKey}) (Guild: ${guildId}):`, error);
    }
}

// Global slash komutlarını kaydet
async function registerGlobalCommands() {
    const commands = [
        {
            name: 'ping',
            description: 'Botun durumunu kontrol eder.',
        },
        {
            name: 'setup-roles',
            description: 'Rol seçim mesajını bu kanala kurar ve atanabilir rolleri ayarlar.',
            options: [
                {
                    name: 'channel',
                    description: 'Mesajın gönderileceği kanal.',
                    type: ApplicationCommandOptionType.Channel,
                    required: true,
                },
                { name: 'role_1', description: 'Atanabilir ilk rol.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'role_2', description: 'Atanabilir ikinci rol.', type: ApplicationCommandOptionType.Role, required: false },
                { name: 'role_3', description: 'Atanabilir üçüncü rol.', type: ApplicationCommandOptionType.Role, required: false },
                { name: 'role_4', description: 'Atanabilir dördüncü rol.', type: ApplicationCommandOptionType.Role, required: false },
                { name: 'role_5', description: 'Atanabilir beşinci rol.', type: ApplicationCommandOptionType.Role, required: false },
                { name: 'role_6', description: 'Atanabilir altıncı rol.', type: ApplicationCommandOptionType.Role, required: false },
                { name: 'role_7', description: 'Atanabilir yedinci rol.', type: ApplicationCommandOptionType.Role, required: false },
                { name: 'role_8', description: 'Atanabilir sekizinci rol.', type: ApplicationCommandOptionType.Role, required: false },
                { name: 'role_9', description: 'Atanabilir dokuzuncu rol.', type: ApplicationCommandOptionType.Role, required: false },
                { name: 'role_10', description: 'Atanabilir onuncu rol.', type: ApplicationCommandOptionType.Role, required: false },
            ]
        },
        {
            name: 'setup-faceit',
            description: 'Faceit rolü alma mesajını bu kanala kurar.',
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
            description: 'Faceit seviyelerine göre atanacak rolleri ayarlar.',
            options: [
                { name: 'level_1_role', description: 'Faceit Level 1 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_2_role', description: 'Faceit Level 2 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_3_role', description: 'Faceit Level 3 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_4_role', description: 'Faceit Level 4 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_5_role', description: 'Faceit Level 5 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_6_role', description: 'Faceit Level 6 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_7_role', description: 'Faceit Level 7 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_8_role', description: 'Faceit Level 8 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_9_role', description: 'Faceit Level 9 rolü.', type: ApplicationCommandOptionType.Role, required: true },
                { name: 'level_10_role', description: 'Faceit Level 10 rolü.', type: ApplicationCommandOptionType.Role, required: true },
            ]
        }
    ];

    try {
        console.log('Global komutlar kaydediliyor...');
        await rest.put(
            Routes.applicationCommands(applicationId),
            { body: commands },
        );
        console.log('Global komutlar başarıyla kaydedildi!');
    } catch (error) {
        console.error('Global komutları kaydederken hata oluştu:', error);
    }
}


// Discord etkileşimlerini işleyen ana endpoint
app.post('/interactions', async (req, res) => {
    const interaction = req.body;

    // Discord PING etkileşimini yanıtla
    if (interaction.type === InteractionType.PING) {
        console.log("PING etkileşimi alındı.");
        return res.send({ type: InteractionResponseType.PONG });
    }

    // MongoDB bağlantısının hazır olduğundan emin ol
    if (!db) {
        console.warn("MongoDB: Veritabanı bağlantısı henüz hazır değil, etkileşim işlenemiyor.");
        return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                content: 'Bot hazırlanıyor, lütfen biraz bekleyin ve tekrar deneyin.',
                flags: InteractionResponseFlags.EPHEMERAL,
            }
        });
    }

    try {
        // Slash Komutlarını İşle
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            const { name, options } = interaction.data;
            const guildId = interaction.guild_id;

            console.log(`Uygulama komutu alındı: ${name} (Guild: ${guildId})`);

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
        }
        // Mesaj Bileşenlerini (Butonlar, Seçim Menüleri) İşle
        else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
            const { custom_id } = interaction.data;
            console.log(`Mesaj bileşeni etkileşimi alındı. custom_id: ${custom_id}`);

            // Rol etkileşimlerini işle
            if (['select_roles_button', 'multi_role_select'].includes(custom_id)) {
                await handleRoleInteraction(interaction, res, rest, applicationId, db, fetchRolesInfo);
            }
            // Faceit etkileşimlerini işle
            else if (custom_id === 'faceit_role_request_button' || custom_id === 'modal_faceit_nickname_submit') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
                return;
            }
            // Bilinmeyen bileşen
            else {
                console.warn(`Bilinmeyen bileşen custom_id: ${custom_id}`);
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: 'Bilinmeyen bir bileşen etkileşimi.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    }
                );
            }
        }
        // Modal Gönderimlerini İşle
        else if (interaction.type === InteractionType.MODAL_SUBMIT) {
            const { custom_id } = interaction.data;
            console.log(`Modal gönderimi alındı. custom_id: ${custom_id}.`);

            // Faceit modal gönderimini işle
            if (custom_id === 'modal_faceit_nickname_submit') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env, db);
            }
            // Bilinmeyen modal
            else {
                console.warn(`Bilinmeyen modal custom_id: ${custom_id}`);
                await rest.patch(
                    Routes.webhookMessage(applicationId, interaction.token),
                    {
                        body: {
                            content: 'Bilinmeyen bir modal gönderimi.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    }
                );
            }
        }
    } catch (error) {
        console.error('Genel etkileşim işleme hatası:', error);
        if (interaction.token && applicationId) {
            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: 'Komut işlenirken beklenmedik bir hata oluştu. Lütfen bot sahibine bildirin.',
                        flags: InteractionResponseFlags.EPHEMERAL,
                    }
                }
            ).catch(e => console.error('Hata mesajı gönderirken hata:', e));
        }
    }
});

app.listen(PORT, async () => {
    console.log(`Listening on port ${PORT}`);
    await connectToMongoDB();
    await registerGlobalCommands();
});
