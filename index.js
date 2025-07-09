import express from 'express';
import dotenv from 'dotenv';
import { verifyKeyMiddleware, InteractionType, InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
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

      // Tüm uygulama komutları için defer yanıtı gönder
      // Bu, Discord'a botun isteği aldığını ve işlediğini bildirir.
      await res.send({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        flags: InteractionResponseFlags.EPHEMERAL // Sadece kullanıcıya görünür
      });

      // Komutların adlarına göre işlem yap
      switch (name) {
        case 'ping':
          // Defer yanıtını düzenleyerek asıl mesajı gönder
          await rest.patch(
            Routes.webhookMessage(applicationId, interaction.token),
            {
              body: {
                content: 'Pong!',
                flags: InteractionResponseFlags.EPHEMERAL,
              }
            }
          );
          break;

        case 'rolal':
          const guildId = interaction.guild_id;
          const rolesInfo = await fetchRolesInfo(guildId, roleIds);

          const options = rolesInfo.map(role => {
            const emoji = role.icon ? { id: role.icon, name: '' } : undefined;
            return {
              label: role.name,
              value: role.id,
              emoji,
            };
          });

          // Defer yanıtını düzenleyerek asıl mesajı (seçim menüsü ile) gönder
          await rest.patch(
            Routes.webhookMessage(applicationId, interaction.token),
            {
              body: {
                content: 'Almak istediğin rolleri seç, istediğin kadar seçebilirsin.',
                flags: InteractionResponseFlags.EPHEMERAL,
                components: [
                  {
                    type: 1, // Action Row
                    components: [
                      {
                        type: 3, // String Select Menu
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

        case 'faceitrol':
          await rest.patch(
            Routes.webhookMessage(applicationId, interaction.token),
            {
              body: {
                content: 'Faceit rolünü almak için aşağıdaki butona tıkla.',
                flags: InteractionResponseFlags.EPHEMERAL,
                components: [
                  {
                    type: 1, // Action Row
                    components: [
                      {
                        type: 2, // Button
                        label: 'Faceit Rolü Al',
                        style: 1, // Primary (mavi) buton
                        custom_id: 'faceit_role_button',
                      }
                    ]
                  }
                ],
              }
            }
          );
          break;
        
        // Buraya diğer APPLICATION_COMMAND'leriniz de eklenebilir (örn. 'faceit' komutu)
        case 'faceit':
            // Kullanıcının nickname'ini al
            const nicknameOption = interaction.data.options.find(opt => opt.name === 'nickname');
            const nickname = nicknameOption ? nicknameOption.value : 'Bilinmiyor';

            // Faceit API'sinden veri çekme mantığı buraya gelecek
            // Şimdilik sadece bir placeholder mesajı gönderelim
            await rest.patch(
                Routes.webhookMessage(applicationId, interaction.token),
                {
                    body: {
                        content: `Faceit nickname '${nickname}' için seviye bilgisi çekiliyor... (Bu özellik henüz tamamlanmadı)`,
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
                content: 'Bilinmeyen komut.',
                flags: InteractionResponseFlags.EPHEMERAL,
              }
            }
          );
          break;
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
        flags: InteractionResponseFlags.EPHEMERAL // Sadece kullanıcıya görünür
      });

      switch (custom_id) {
        case 'multi_role_select':
          const selectedRoleIds = interaction.data.values;
          let rolesGivenCount = 0;
          let failedRoles = [];

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
              responseContent += `Bazı roller verilemedi: ${failedRoles.join(', ')}. Botun yeterli izni olduğundan emin olun.`;
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

        case 'faceit_role_button':
          const faceitRoleId = 'ROL_ID_BURAYA'; // Kendi Faceit rol ID'nizi buraya yazın!

          try {
            await rest.put(Routes.guildMemberRole(guildId, memberId, faceitRoleId));
            await rest.patch(
              Routes.webhookMessage(applicationId, interaction.token),
              {
                body: {
                  content: 'Faceit rolü başarıyla verildi!',
                  flags: InteractionResponseFlags.EPHEMERAL,
                }
              }
            );
          } catch (e) {
            console.error('Faceit rolü verirken hata oluştu:', e);
            await rest.patch(
              Routes.webhookMessage(applicationId, interaction.token),
              {
                body: {
                  content: 'Faceit rolü verirken hata oluştu. Botun yeterli izni olduğundan veya rol ID\'sinin doğru olduğundan emin olun.',
                  flags: InteractionResponseFlags.EPHEMERAL,
                }
              }
            );
          }
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
  // Önemli: Yukarıdaki defer ve patch işlemleri res.send() yerine geçtiği için,
  // buradaki genel return res.send({ type: InteractionResponseType.PONG }); artık gereksizdir.
  // Her yol kendi yanıtını göndermelidir.
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});