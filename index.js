import express from 'express';
import dotenv from 'dotenv';
import pkg from 'discord-interactions';
const {
    verifyKeyMiddleware,
    InteractionType,
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    TextInputStyles
} = pkg;

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';
import path from 'path';

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
            content: 'Faceit seviyenize göre rol almak için aşağıdaki butonu kullanın. Bot, Faceit API\'sinden seviyenizi çekecektir.',
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
    return res.send({ type: InteractionResponseType.PONG });
  }

  try {
    // Slash Komutlarını İşle (sadece ping için)
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
              content: 'Bilinmeyen bir komut.',
              flags: InteractionResponseFlags.EPHEMERAL,
            }
          });
      }
    }
    // Mesaj Bileşenlerini (Butonlar, Seçim Menüleri) İşle
    else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const { custom_id } = interaction.data;
      const memberId = interaction.member.user.id;
      const guildId = interaction.guild_id;

      // Defer yanıtı sadece orijinal mesajı güncelleyeceğimiz durumlarda gönderilir.
      // Modal'lar doğrudan bir yanıt olarak gönderilmelidir.
      if (custom_id !== 'faceit_role_request_button') {
        await res.send({
          type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
          flags: InteractionResponseFlags.EPHEMERAL
        });
      }

      switch (custom_id) {
        case 'select_roles_button': // "Rolleri Seç" butonuna basıldığında tetiklenir
            const rolesInfo = await fetchRolesInfo(guildId, roleIds);

            const options = rolesInfo.map(role => {
                return {
                    label: role.name,
                    value: role.id,
                    emoji: undefined, // Rol ikonları için emoji desteğini şimdilik devre dışı bıraktık
                };
            });

            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: 'Almak istediğin rolleri seç, istediğin kadar seçebilirsin.',
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
                                        max_values: options.length > 0 ? options.length : 1,
                                        options: options.length > 0 ? options : [{ label: 'Rol bulunamadı', value: 'no_roles', description: 'Sunucuda seçilebilir rol bulunmuyor.' }],
                                    }
                                ]
                            }
                        ],
                    }
                }
            );
            break;

        case 'faceit_role_request_button': // "Faceit Rolü Al" butonuna basıldığında tetiklenir
            console.log("Faceit Rolü Al butonu tıklandı. Modal gönderiliyor..."); // DEBUG LOG
            // Modal doğrudan bir yanıt olduğu için burada defer yanıtı GÖNDERİLMEZ.
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
                                    style: 1, // TextInputStyles.SHORT yerine doğrudan 1 kullanıldı
                                    label: 'Faceit Kullanıcı Adınız:',
                                    placeholder: 'örnek: shroud',
                                    required: true,
                                    min_length: 3,
                                    max_length: 30,
                                },
                            ],
                        },
                    ],
                },
            });

        case 'multi_role_select': // Rol seçim menüsünden seçim yapıldığında tetiklenir
          const selectedRoleIds = interaction.data.values;
          let rolesGivenCount = 0;
          let failedRoles = [];

          if (selectedRoleIds.includes('no_roles')) {
            await rest.patch(
              Routes.webhookMessage(applicationId, interaction.token),
              {
                body: {
                  content: 'Seçilebilecek bir rol bulunamadı.',
                  flags: InteractionResponseFlags.EPHEMERAL,
                }
              }
            );
            break;
          }

          for (const roleId of selectedRoleIds) {
            try {
              await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
              rolesGivenCount++;
            } catch (e) {
              console.error(`Rol verme hatası (${roleId}):`, e);
              failedRoles.push(roleId);
            }
          }

          let responseContent = '';
          if (rolesGivenCount > 0) {
              responseContent += `${rolesGivenCount} rol başarıyla verildi! `;
          }
          if (failedRoles.length > 0) {
              responseContent += `Bazı roller verilemedi: ${failedRoles.join(', ')}. Botun sunucuda bu rolleri yönetme izni olduğundan emin olun.`;
          }
          if (rolesGivenCount === 0 && failedRoles.length === 0) {
              responseContent = 'Herhangi bir rol seçilmedi veya verilemedi. Botun yeterli izni olduğundan emin olun.';
          }

          await rest.patch(
            Routes.webhookMessage(applicationId, interaction.token),
            {
              body: {
                content: responseContent,
                flags: InteractionResponseFlags.EPHEMERAL,
              }
            }
          );
          break;

        default:
          await rest.patch(
            Routes.webhookMessage(applicationId, interaction.token),
            {
              body: {
                content: 'Bilinmeyen bir bileşen etkileşimi.',
                flags: InteractionResponseFlags.EPHEMERAL,
              }
            }
          );
          break;
      }
    }
    // Modal Gönderimlerini İşle
    else if (interaction.type === InteractionType.MODAL_SUBMIT) {
        const { custom_id } = interaction.data;
        const memberId = interaction.member.user.id;
        const guildId = interaction.guild_id;

        console.log("Modal gönderimi alındı. Defer yanıtı gönderiliyor..."); // DEBUG LOG
        await res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            flags: InteractionResponseFlags.EPHEMERAL
        });

        if (custom_id === 'modal_faceit_nickname_submit') {
            const nicknameInput = interaction.data.components[0].components[0].value;
            console.log(`Faceit Nickname alındı: ${nicknameInput}. API çağrısı yapılıyor...`); // DEBUG LOG

            let responseMessage = '';
            let faceitLevel = null;

            try {
                // === BURASI FACEIT API ENTEGRASYONU YAPACAĞINIZ YER ===
                const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
                if (!FACEIT_API_KEY) {
                    throw new Error("FACEIT_API_KEY environment variable is not set.");
                }

                const faceitApiUrl = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nicknameInput)}`;
                const apiResponse = await fetch(faceitApiUrl, {
                    headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` }
                });
                const playerData = await apiResponse.json();

                if (!apiResponse.ok) {
                    if (apiResponse.status === 404) {
                        responseMessage = `Faceit nickname "**${nicknameInput}**" bulunamadı. Lütfen nickinizi doğru yazdığınızdan emin olun.`;
                    } else {
                        console.error('Faceit API hata kodu:', apiResponse.status, playerData);
                        responseMessage = `Faceit API ile bağlantı kurarken bir hata oluştu: ${playerData.message || 'Bilinmeyen Hata'}.`;
                    }
                } else {
                    if (playerData && playerData.games && playerData.games.csgo && playerData.games.csgo.skill_level) {
                        faceitLevel = playerData.games.csgo.skill_level;
                    } else {
                        responseMessage = `Faceit nickname "**${nicknameInput}**" için CS:GO oyun verisi bulunamadı.`;
                    }
                }

            } catch (apiError) {
                console.error('Faceit API çağrısı sırasında genel hata:', apiError);
                responseMessage = 'Faceit API ile bağlantı kurarken beklenmedik bir hata oluştu. Lütfen bot sahibine bildirin.';
            }

            if (faceitLevel !== null) {
                let roleToAssignId = null;

                switch (faceitLevel) {
                    case 1: roleToAssignId = process.env.LEVEL_1_ROLE_ID; break;
                    case 2: roleToAssignId = process.env.LEVEL_2_ROLE_ID; break;
                    case 3: roleToAssignId = process.env.LEVEL_3_ROLE_ID; break;
                    case 4: roleToAssignId = process.env.LEVEL_4_ROLE_ID; break;
                    case 5: roleToAssignId = process.env.LEVEL_5_ROLE_ID; break;
                    case 6: roleToAssignId = process.env.LEVEL_6_ROLE_ID; break;
                    case 7: roleToAssignId = process.env.LEVEL_7_ROLE_ID; break;
                    case 8: roleToAssignId = process.env.LEVEL_8_ROLE_ID; break;
                    case 9: roleToAssignId = process.env.LEVEL_9_ROLE_ID; break;
                    case 10: roleToAssignId = process.env.LEVEL_10_ROLE_ID; break;
                    default: break;
                }

                if (roleToAssignId) {
                    try {
                        console.log(`Rol atama denemesi: Kullanıcı ${memberId}, Rol ${roleToAssignId}`); // DEBUG LOG
                        await rest.put(Routes.guildMemberRole(guildId, memberId, roleToAssignId));
                        responseMessage = `Faceit seviyeniz **${faceitLevel}** olarak algılandı ve ilgili rol başarıyla verildi!`;
                    } catch (e) {
                        console.error(`Faceit rolü verme hatası (Level ${faceitLevel}, Role ID: ${roleToAssignId}):`, e);
                        responseMessage = `Faceit rolü (${faceitLevel}) verirken bir hata oluştu. Botun sunucuda rol verme izni olduğundan veya rol ID'sinin doğru olduğundan emin olun.`;
                    }
                } else {
                    responseMessage = `Faceit seviyeniz (${faceitLevel}) için tanımlı bir rol bulunamadı.`;
                }
            }

            console.log(`Faceit rolü işlemi tamamlandı. Yanıt gönderiliyor: ${responseMessage}`); // DEBUG LOG
            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: responseMessage,
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
