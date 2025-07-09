import express from 'express';
import dotenv from 'dotenv';
import { verifyKeyMiddleware, InteractionType, InteractionResponseType, InteractionResponseFlags, MessageComponentTypes, TextInputs } from 'discord-interactions';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Discord için raw body middleware (gövdenin değiştirilmeden gelmesini sağlar)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// BOT_TOKEN'i .env dosyasından kullanın
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

// Rol ID'lerini dosyadan oku
const roleIds = JSON.parse(fs.readFileSync('./roles.json', 'utf-8'));

/**
 * Sunucudaki belirli rol ID'lerinin bilgilerini (isim, ikon vb.) çeker.
 * @param {string} guildId - Sunucu ID'si.
 * @param {string[]} roleIds - Çekilecek rol ID'lerinin dizisi.
 * @returns {Promise<Array>} Filtrelenmiş rol bilgileri dizisi.
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

// Tüm Discord etkileşimlerini işleyen ana endpoint
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;
  const applicationId = process.env.DISCORD_CLIENT_ID; // DISCORD_APPLICATION_ID yerine DISCORD_CLIENT_ID kullanıldı

  // Discord PING etkileşimini yanıtla
  if (interaction.type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  try {
    // Uygulama Komutlarını (Slash Commands) İşle
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;

      // Tüm uygulama komutları için defer yanıtı gönder (zorunlu değil ama iyi bir pratik)
      // await res.send({
      //   type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      //   flags: InteractionResponseFlags.EPHEMERAL
      // });

      // Komutların adlarına göre işlem yap
      switch (name) {
        case 'ping':
          // Ping komutu için hemen yanıt ver
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Pong!',
              flags: InteractionResponseFlags.EPHEMERAL,
            }
          });

        case 'rolal': // Yeni logic burada başlıyor
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Yapmak istediğin işlemi seç:',
              flags: InteractionResponseFlags.EPHEMERAL,
              components: [
                {
                  type: MessageComponentTypes.ACTION_ROW,
                  components: [
                    {
                      type: MessageComponentTypes.BUTTON,
                      label: 'Rol Seç',
                      style: 1, // Primary (mavi)
                      custom_id: 'select_roles_button',
                    },
                    {
                      type: MessageComponentTypes.BUTTON,
                      label: 'Faceit Rolü Al',
                      style: 1, // Primary (mavi)
                      custom_id: 'faceit_role_request_button',
                    }
                  ]
                }
              ],
            }
          });
          
        // `faceitrol` ve `faceit` komutları artık bu senaryoda doğrudan kullanılmayacak
        // Eğer hala ayrı slash komutları olarak istiyorsanız, bu case'leri tekrar eklemeniz gerekir.
        // Komut kayıt scriptinden de kaldırmayı unutmayın!
        default:
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Bilinmeyen komut.',
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

      // Bileşen etkileşimleri için defer yanıtı gönder (mesajı güncelleyeceğimizi belirtir)
      await res.send({
        type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
        flags: InteractionResponseFlags.EPHEMERAL
      });

      switch (custom_id) {
        case 'select_roles_button': // "Rol Seç" butonuna basıldığında
            const rolesInfo = await fetchRolesInfo(guildId, roleIds);

            const options = rolesInfo.map(role => {
                const emoji = role.icon ? { id: role.icon, name: '' } : undefined;
                return {
                    label: role.name,
                    value: role.id,
                    emoji,
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
                                type: MessageComponentTypes.ACTION_ROW, // Action Row
                                components: [
                                    {
                                        type: MessageComponentTypes.STRING_SELECT, // String Select Menu
                                        custom_id: 'multi_role_select',
                                        placeholder: 'Rolleri seç...',
                                        min_values: 1,
                                        max_values: options.length > 0 ? options.length : 1, // max_values 0 olamaz, en az 1 olmalı
                                        options: options.length > 0 ? options : [{ label: 'Rol bulunamadı', value: 'no_roles', description: 'Rol listesi boş' }], // Boşsa varsayılan seçenek
                                    }
                                ]
                            }
                        ],
                    }
                }
            );
            break;

        case 'faceit_role_request_button': // "Faceit Rolü Al" butonuna basıldığında Modal aç
            // res.send() sadece bir kere kullanılabilir, o yüzden burada Modal'ı yeni bir yanıt olarak gönderiyoruz
            // DEFERRED_UPDATE_MESSAGE zaten gönderildi, bu yüzden yeni bir modal yanıtı direkt gidebilir.
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
                                    type: TextInputs.SHORT, // Short text input
                                    custom_id: 'faceit_nickname_input',
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
            // Modalı gönderdikten sonra defer yanıtını kapatmak için ek bir patch gerekmez.
            // Zaten modal yeni bir yanıt türüdür.

        case 'multi_role_select': // Rol seçim menüsünden seçim yapıldığında
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
              responseContent += `Bazı roller verilemedi: ${failedRoles.join(', ')}. Botun yeterli izni olduğundan veya rol ID'lerinin doğru olduğundan emin olun.`;
          }
          if (rolesGivenCount === 0 && failedRoles.length === 0) {
              responseContent = 'Herhangi bir rol seçilmedi veya verilemedi.';
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
    // Modal Gönderimleri İşle
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

            // Burası Faceit API ile entegrasyon yapacağınız yer
            // Örnek: Faceit API çağrısı
            // const faceitData = await fetchFaceitLevel(nicknameInput);
            // const faceitLevel = faceitData.level; // Varsayımsal seviye

            // Seviyeye göre rol atama
            const faceitLevel = 5; // Test için sabit bir seviye
            let roleToAssignId;

            // .env dosyasından okunan rol ID'lerini kullanın
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
                default: roleToAssignId = null; // Tanımsız seviye
            }

            let responseMessage = '';
            if (roleToAssignId) {
                try {
                    await rest.put(Routes.guildMemberRole(guildId, memberId, roleToAssignId));
                    responseMessage = `Faceit seviyeniz ${faceitLevel} olarak algılandı ve ilgili rol başarıyla verildi!`;
                } catch (e) {
                    console.error(`Faceit rolü verme hatası (Level ${faceitLevel}, Role ID: ${roleToAssignId}):`, e);
                    responseMessage = `Faceit rolü verirken bir hata oluştu (Level ${faceitLevel}). Botun yeterli izni olduğundan veya rol ID'sinin doğru olduğundan emin olun.`;
                }
            } else {
                responseMessage = `Faceit seviyeniz (${faceitLevel}) için tanımlı bir rol bulunamadı.`;
            }

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
    // Hata durumunda kullanıcıya bilgi ver
    if (interaction.token && applicationId) {
      await rest.patch(
        Routes.webhookMessage(applicationId, interaction.token),
        {
          body: {
            content: 'Komut işlenirken beklenmedik bir hata oluştu.',
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