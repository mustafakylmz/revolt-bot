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
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';
import path from 'path';

// Yeni etkileşim işleyici modüllerini import et
import { handleRoleInteraction } from './interactions/roleInteractions.js';
import { handleFaceitInteraction } from './interactions/faceitInteractions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Discord için raw body middleware
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
const applicationId = process.env.DISCORD_CLIENT_ID;

// Dosya yollarını tanımla
const rolesFilePath = path.resolve('./roles.json');
const messageIdsFilePath = path.resolve('./message_ids.json');

// Rol ID'lerini dosyadan oku
const roleIds = JSON.parse(fs.readFileSync(rolesFilePath, 'utf-8'));

// Mesaj ID'lerini dosyadan oku (yoksa boş obje oluştur)
let messageIds = {};
if (fs.existsSync(messageIdsFilePath)) {
    try {
        messageIds = JSON.parse(fs.readFileSync(messageIdsFilePath, 'utf-8'));
    } catch (e) {
        console.error("Hata: message_ids.json dosyası bozuk. Yeniden oluşturuluyor.", e);
        messageIds = {};
        fs.writeFileSync(messageIdsFilePath, JSON.stringify({}, null, 2));
    }
} else {
    fs.writeFileSync(messageIdsFilePath, JSON.stringify({}, null, 2));
}

/**
 * message_ids.json dosyasını günceller.
 * @param {object} data - Yazılacak veri.
 */
function saveMessageIds(data) {
    try {
        fs.writeFileSync(messageIdsFilePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("message_ids.json dosyasına yazma hatası:", e);
    }
}

/**
 * Sunucudaki belirli rol ID'lerinin detaylı bilgilerini çeker.
 */
async function fetchRolesInfo(guildId, roleIds) {
    try {
        const guildRoles = await rest.get(Routes.guildRoles(guildId));
        const filteredRoles = guildRoles.filter(role => roleIds.includes(role.id));
        console.log(`Çekilen ve filtrelenen rol sayısı: ${filteredRoles.length}`); // DEBUG LOG
        return filteredRoles;
    } catch (error) {
        console.error('Rol bilgisi çekilemedi:', error);
        return [];
    }
}

/**
 * Belirtilen kanalda mesajı gönderir veya günceller.
 * @param {string} channelId - Mesajın gönderileceği/güncelleneceği kanal ID'si.
 * @param {string} messageKey - message_ids.json dosyasındaki anahtar (örn: 'rolesMessage', 'faceitMessage').
 * @param {object} messageContent - Mesajın içeriği (content, components, flags vb.).
 */
async function sendOrUpdateMessage(channelId, messageKey, messageContent) {
    if (!channelId) {
        console.error(`Hata: ${messageKey} için kanal ID'si tanımlanmamış. Mesaj gönderilemedi.`);
        return;
    }
    try {
        let messageId = messageIds[messageKey];
        console.log(`Mesaj ${messageKey} için mevcut ID: ${messageId || 'Yok'}`); // DEBUG LOG

        if (messageId) {
            try {
                // Mesajı güncellemeye çalış
                await rest.patch(Routes.channelMessage(channelId, messageId), { body: messageContent });
                console.log(`Mesaj başarıyla güncellendi: ${messageKey} (${messageId})`);
            } catch (error) {
                // Mesaj bulunamazsa veya silinmişse, yeni bir mesaj gönder
                if (error.code === 10008) { // DiscordAPIError[10008]: Unknown Message
                    console.warn(`Mevcut mesaj bulunamadı veya silinmiş: ${messageKey}. Yeni mesaj gönderiliyor...`);
                    const newMessage = await rest.post(Routes.channelMessages(channelId), { body: messageContent });
                    messageIds[messageKey] = newMessage.id;
                    saveMessageIds(messageIds);
                    console.log(`Yeni mesaj gönderildi: ${messageKey} (${newMessage.id})`);
                } else {
                    throw error; // Diğer hataları yukarı fırlat
                }
            }
        } else {
            // Mesaj daha önce hiç gönderilmemişse, yeni bir mesaj gönder
            const newMessage = await rest.post(Routes.channelMessages(channelId), { body: messageContent });
            messageIds[messageKey] = newMessage.id;
            saveMessageIds(messageIds);
            console.log(`Yeni mesaj gönderildi: ${messageKey} (${newMessage.id})`);
        }
    } catch (error) {
        console.error(`Mesaj gönderme/güncelleme hatası (${messageKey}):`, error);
    }
}

// Bot başladığında veya yeniden dağıtıldığında otomatik olarak mesajları gönder/güncelle
async function initializeMessages() {
    console.log("Mesajlar başlatılıyor/güncelleniyor...");
    // Genel Rol Seçim Mesajı
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
                            style: 1, // Primary (mavi)
                            custom_id: 'select_roles_button',
                        }
                    ]
                }
            ]
        }
    );

    // Faceit Rolü Mesajı
    await sendOrUpdateMessage(
        process.env.FACEIT_CHANNEL_ID,
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
    console.log("Mesaj başlatma/güncelleme tamamlandı.");
}


// Discord etkileşimlerini işleyen ana endpoint
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
    const interaction = req.body;

    // Discord PING etkileşimini yanıtla
    if (interaction.type === InteractionType.PING) {
        console.log("PING etkileşimi alındı."); // DEBUG LOG
        return res.send({ type: InteractionResponseType.PONG });
    }

    try {
        // Slash Komutlarını İşle (sadece ping için)
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            const { name } = interaction.data;
            console.log(`Uygulama komutu alındı: ${name}`); // DEBUG LOG

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
                            content: 'Bilinmeyen bir komut.',
                            flags: InteractionResponseFlags.EPHEMERAL,
                        }
                    });
            }
        }
        // Mesaj Bileşenlerini (Butonlar, Seçim Menüleri) İşle
        else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
            const { custom_id } = interaction.data;
            console.log(`Mesaj bileşeni etkileşimi alındı. custom_id: ${custom_id}`); // DEBUG LOG

            // Rol etkileşimlerini işle
            if (['select_roles_button', 'multi_role_select'].includes(custom_id)) {
                await handleRoleInteraction(interaction, res, rest, applicationId, roleIds, fetchRolesInfo);
            }
            // Faceit etkileşimlerini işle
            else if (custom_id === 'faceit_role_request_button') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env);
            }
            // Bilinmeyen bileşen
            else {
                console.warn(`Bilinmeyen bileşen custom_id: ${custom_id}`); // DEBUG LOG
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
            console.log(`Modal gönderimi alındı. custom_id: ${custom_id}.`); // DEBUG LOG

            // Faceit modal gönderimini işle
            if (custom_id === 'modal_faceit_nickname_submit') {
                await handleFaceitInteraction(interaction, res, rest, applicationId, process.env);
            }
            // Bilinmeyen modal
            else {
                console.warn(`Bilinmeyen modal custom_id: ${custom_id}`); // DEBUG LOG
                // Modal gönderimleri için defer yanıtı zaten gönderildiği için burada ek bir yanıt göndermeye gerek yok.
                // Ancak kullanıcıya bilgi vermek isterseniz, webhookMessage kullanabilirsiniz.
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
    // Bot başladığında mesajları başlat/güncelle
    await initializeMessages();
});
