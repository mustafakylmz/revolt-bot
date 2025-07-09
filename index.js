import express from 'express';
import dotenv from 'dotenv';
// discord-interactions kütüphanesi için CommonJS uyumluluğu
import pkg from 'discord-interactions';
const {
    verifyKeyMiddleware,
    InteractionType,
    InteractionResponseType,
    InteractionResponseFlags,
    MessageComponentTypes,
    TextInputStyles // Modal metin giriş stilleri için eklendi
} = pkg;

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Discord için raw body middleware (Discord etkileşimlerinin doğrulanması için gereklidir)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Discord Bot token'ı ile REST client'ı başlat
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

// roles.json dosyasından rol ID'lerini oku
const roleIds = JSON.parse(fs.readFileSync('./roles.json', 'utf-8'));

/**
 * Sunucudaki belirli rol ID'lerinin detaylı bilgilerini (isim, ikon vb.) Discord API'sinden çeker.
 * @param {string} guildId - Komutun tetiklendiği sunucunun ID'si.
 * @param {string[]} roleIds - Bilgileri çekilecek rol ID'lerinin dizisi.
 * @returns {Promise<Array>} Filtrelenmiş ve detaylandırılmış rol bilgileri dizisi.
 */
async function fetchRolesInfo(guildId, roleIds) {
  try {
    const guildRoles = await rest.get(Routes.guildRoles(guildId));
    // Sadece roles.json'daki ID'lere sahip rolleri filtrele
    const filteredRoles = guildRoles.filter(role => roleIds.includes(role.id));
    return filteredRoles;
  } catch (error) {
    console.error('Rol bilgisi çekilemedi:', error);
    return [];
  }
}

// Tüm Discord etkileşimlerini işleyen ana endpoint
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;
  // Uygulama ID'si, webhook mesajları göndermek için kullanılır
  const applicationId = process.env.DISCORD_CLIENT_ID;

  // Discord PING etkileşimini yanıtla (botun canlı olduğunu kontrol eder)
  if (interaction.type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  try {
    // Slash Komutlarını (Application Commands) İşle
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;

      switch (name) {
        case 'ping':
          // Ping komutu için hızlı yanıt
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Pong!',
              flags: InteractionResponseFlags.EPHEMERAL, // Sadece komutu kullanan kişiye görünür
            }
          });

        case 'rolal':
          // /rolal komutu çağrıldığında, iki buton içeren bir mesaj gönder
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Aşağıdan yapmak istediğin işlemi seç:',
              flags: InteractionResponseFlags.EPHEMERAL, // Sadece komutu kullanan kişiye görünür
              components: [
                {
                  type: MessageComponentTypes.ACTION_ROW, // Butonları aynı satırda tutar
                  components: [
                    {
                      type: MessageComponentTypes.BUTTON, // Rol Seç butonu
                      label: 'Rol Seç',
                      style: 1, // Primary (mavi) buton
                      custom_id: 'select_roles_button',
                    },
                    {
                      type: MessageComponentTypes.BUTTON, // Faceit Rolü Al butonu
                      label: 'Faceit Rolü Al',
                      style: 1, // Primary (mavi) buton
                      custom_id: 'faceit_role_request_button',
                    }
                  ]
                }
              ],
            }
          });

        default:
          // Tanımsız komutlar için hata mesajı
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

      // Bileşen etkileşimleri için hemen defer yanıtı gönder
      // Bu, Discord'a botun isteği aldığını ve işlediğini bildirir.
      await res.send({
        type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE, // Mesajı güncelleyeceğimizi belirtir
        flags: InteractionResponseFlags.EPHEMERAL
      });

      switch (custom_id) {
        case 'select_roles_button': // "Rol Seç" butonuna basıldığında tetiklenir
            const rolesInfo = await fetchRolesInfo(guildId, roleIds);

            // Discord select menü seçeneklerini hazırla
            const options = rolesInfo.map(role => {
                // Rol ikonları için hata almamak adına `emoji` kısmını şimdilik `undefined` bırakıyoruz.
                // Eğer özel Discord emojisi kullanmak isterseniz, burada emojinin gerçek snowflake ID'sini belirtmeniz gerekir.
                return {
                    label: role.name,
                    value: role.id,
                    emoji: undefined, // `role.icon` bir snowflake ID olmadığı için boş bırakıldı.
                };
            });

            // Defer yanıtını düzenleyerek seçim menüsünü gönder
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
                                        type: MessageComponentTypes.STRING_SELECT, // String Seçim Menüsü
                                        custom_id: 'multi_role_select',
                                        placeholder: 'Rolleri seç...',
                                        min_values: 1,
                                        // Max değer, listedeki seçenek sayısı kadar, en az 1
                                        max_values: options.length > 0 ? options.length : 1,
                                        // Eğer hiç rol yoksa, varsayılan bir "bulunamadı" seçeneği göster
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
            return res.send({
                type: InteractionResponseType.MODAL, // Modal yanıt türü
                data: {
                    custom_id: 'modal_faceit_nickname_submit', // Modal gönderildiğinde kullanılacak custom_id
                    title: 'Faceit Nickname Gir',
                    components: [
                        {
                            type: MessageComponentTypes.ACTION_ROW, // Modal içindeki input'lar için Action Row
                            components: [
                                {
                                    type: MessageComponentTypes.TEXT_INPUT, // Metin giriş bileşeni
                                    custom_id: 'faceit_nickname_input', // Giriş kutusunun custom_id'si
                                    style: 1, // BURASI DEĞİŞTİRİLDİ: TextInputStyles.SHORT yerine doğrudan 1 kullanıldı
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

          // Eğer "Rol bulunamadı" seçeneği seçilirse (yani liste boşsa)
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

          // Seçilen her bir role kullanıcıya atama işlemi
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

          // İşlem sonucunu kullanıcıya bildir
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
          // Tanımsız bileşen etkileşimleri için hata mesajı
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

        // Modal gönderimlerinde hemen defer yanıtı ver
        await res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            flags: InteractionResponseFlags.EPHEMERAL
        });

        if (custom_id === 'modal_faceit_nickname_submit') {
          const nicknameInput = interaction.data.components[0].components[0].value;
          console.log(`Faceit Nickname alındı: ${nicknameInput}`);

          let responseMessage = '';
          let faceitLevel = null;

          try {
              // === FACEIT API ENTEGRASYONU BURADA BAŞLIYOR ===
              // `node-fetch` kütüphanesini zaten yüklediniz. Axios da kullanabilirsiniz.
              const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
              if (!FACEIT_API_KEY) {
                  throw new Error("FACEIT_API_KEY environment variable is not set.");
              }

              const faceitApiUrl = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nicknameInput)}`;
              const apiResponse = await fetch(faceitApiUrl, {
                  headers: { 'Authorization': `Bearer ${FACEIT_API_KEY}` }
              });
              const playerData = await apiResponse.json();

              if (!apiResponse.ok) { // HTTP status 200 olmayan yanıtlar için
                  if (apiResponse.status === 404) {
                      responseMessage = `Faceit nickname "**${nicknameInput}**" bulunamadı. Lütfen nickinizi doğru yazdığınızdan emin olun.`;
                  } else {
                      console.error('Faceit API hata kodu:', apiResponse.status, playerData);
                      responseMessage = `Faceit API ile bağlantı kurarken bir hata oluştu: ${playerData.message || 'Bilinmeyen Hata'}.`;
                  }
              } else {
                  // Oyuncu verisini kontrol edin ve seviyeyi alın
                  if (playerData && playerData.games && playerData.games.csgo && playerData.games.csgo.skill_level) {
                      faceitLevel = playerData.games.csgo.skill_level;
                  } else {
                      responseMessage = `Faceit nickname "**${nicknameInput}**" için CS:GO oyun verisi bulunamadı.`;
                  }
              }
              // === FACEIT API ENTEGRASYONU BURADA BİTİYOR ===

          } catch (apiError) {
              console.error('Faceit API çağrısı sırasında genel hata:', apiError);
              responseMessage = 'Faceit API ile bağlantı kurarken beklenmedik bir hata oluştu. Lütfen bot sahibine bildirin.';
          }

          if (faceitLevel !== null) { // Eğer seviye başarılı bir şekilde alındıysa rol atama işlemi
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
                  default: break; // Tanımsız seviye
              }

              if (roleToAssignId) {
                  try {
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
          // Eğer API çağrısında hata olduysa veya seviye alınamadıysa responseMessage zaten ayarlanmış olacak.

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
    // Tüm genel hataları yakala ve kullanıcıya bildir
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

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});