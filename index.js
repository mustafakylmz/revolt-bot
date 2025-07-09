import express from 'express';
import { InteractionType, InteractionResponseType, verifyKeyMiddleware } from 'discord-interactions';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const roleIds = JSON.parse(fs.readFileSync('./roles.json', 'utf8'));

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_CLIENT_PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

  if (interaction.type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Buton etkileşimleri
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    if (interaction.data.custom_id === 'select_roles_button') {
      // Yeni Çoklu Rol Seçim menüsü aç
      const guildId = interaction.guild_id;

      import('axios').then(({ default: axios }) => {
        axios.get(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
          headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`
          }
        }).then(response => {
          const guildRoles = response.data;

          const options = roleIds.map(id => {
            const role = guildRoles.find(r => r.id === id);
            if (!role) return null;

            const emoji = role.icon ? { type: 1, id: role.icon, name: null } : undefined;

            return {
              label: role.name,
              value: role.id,
              description: `Rol: ${role.name}`,
              emoji: emoji,
            };
          }).filter(Boolean);

          const components = [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  custom_id: 'role_select_menu',
                  placeholder: 'Almak istediğiniz rolleri seçin',
                  min_values: 1,
                  max_values: options.length,
                  options: options,
                }
              ]
            }
          ];

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Lütfen almak istediğiniz rolleri seçin:',
              components: components,
              flags: 64,
            }
          });
        }).catch(err => {
          console.error('Rol listesini çekerken hata:', err);
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Roller yüklenirken hata oluştu. Lütfen daha sonra deneyin.',
              flags: 64,
            }
          });
        });
      });

      return;
    }

    // Çoklu seçim sonrası roller veriliyor
    if (interaction.data.custom_id === 'role_select_menu') {
      const selectedRoleIds = interaction.data.values;
      const guildId = interaction.guild_id;
      const memberId = interaction.member.user.id;

      import('axios').then(({ default: axios }) => {
        Promise.all(selectedRoleIds.map(roleId => {
          return axios.put(
            `https://discord.com/api/v10/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
            {},
            {
              headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
            }
          );
        })).then(() => {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Başarıyla seçtiğiniz roller verildi: <@&${selectedRoleIds.join('>, <@&')}>`,
              flags: 64,
            }
          });
        }).catch(err => {
          console.error('Rol verme hatası:', err);
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Roller verilirken bir hata oluştu.',
              flags: 64,
            }
          });
        });
      });

      return;
    }
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    if (interaction.data.name === 'rolal') {
      // Orijinal faceit rolü butonuyla birlikte yeni butonu gösteriyoruz
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Aşağıdaki butonlardan rol alabilirsiniz.',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: 'Faceit Rolü Al',
                  custom_id: 'faceit_role_button',
                },
                {
                  type: 2,
                  style: 1,
                  label: 'Rol Al (Çoklu Seçim)',
                  custom_id: 'select_roles_button',
                }
              ]
            }
          ],
          flags: 64,
        }
      });
    }
  }

  // Faceit rolü buton işleme kodunu buraya eklemen lazım (senin mevcut koddan)

  res.status(400).send('Bad request');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
