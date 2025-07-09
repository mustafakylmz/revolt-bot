import express from 'express';
import dotenv from 'dotenv';
import { verifyKeyMiddleware, InteractionType, InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// raw body middleware (discord için)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

// Rol ID dizisi
const roleIds = JSON.parse(fs.readFileSync('./roles.json', 'utf-8'));

async function fetchRolesInfo(guildId, roleIds) {
  try {
    // Sunucudaki tüm rolleri çek
    const guildRoles = await rest.get(Routes.guildRoles(guildId));
    // İstenen rol ID'lerine göre filtrele
    const filteredRoles = guildRoles.filter(role => roleIds.includes(role.id));
    return filteredRoles;
  } catch (error) {
    console.error('Rol bilgisi çekilemedi:', error);
    return [];
  }
}

app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_CLIENT_PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

  if (interaction.type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  try {
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      if (interaction.data.name === 'rolal') {
        const guildId = interaction.guild_id;
        // Roller hakkında detayları çek (isim, ikon)
        const rolesInfo = await fetchRolesInfo(guildId, roleIds);

        const options = rolesInfo.map(role => {
          // Eğer rolde ikon varsa emoji objesi oluştur
          const emoji = role.icon ? { id: role.icon, name: '' } : undefined;
          return {
            label: role.name,
            value: role.id,
            emoji,
          };
        });

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Almak istediğin rolleri seç, istediğin kadar seçebilirsin.',
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 3, // select menu
                    custom_id: 'multi_role_select',
                    placeholder: 'Rolleri seç...',
                    min_values: 1,
                    max_values: options.length,
                    options,
                  }
                ]
              }
            ],
          }
        });
      }

      if (interaction.data.name === 'faceitrol') {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Faceit rolünü almak için aşağıdaki butona tıkla.',
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    label: 'Faceit Rolü Al',
                    style: 1,
                    custom_id: 'faceit_role_button',
                  }
                ]
              }
            ],
          }
        });
      }
    } else if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const memberId = interaction.member.user.id;
      const guildId = interaction.guild_id;

      if (interaction.data.custom_id === 'multi_role_select') {
        const selectedRoleIds = interaction.data.values;

        for (const roleId of selectedRoleIds) {
          try {
            await rest.put(Routes.guildMemberRole(guildId, memberId, roleId));
          } catch (e) {
            console.error('Rol verme hatası:', e);
          }
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `${selectedRoleIds.length} rol başarıyla verildi!`,
            flags: InteractionResponseFlags.EPHEMERAL,
          }
        });
      }

      if (interaction.data.custom_id === 'faceit_role_button') {
        const faceitRoleId = 'ROL_ID_BURAYA'; // kendi Faceit rol ID'n

        try {
          await rest.put(Routes.guildMemberRole(guildId, memberId, faceitRoleId));
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Faceit rolü başarıyla verildi!',
              flags: InteractionResponseFlags.EPHEMERAL,
            }
          });
        } catch (e) {
          console.error(e);
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Faceit rolü verirken hata oluştu.',
              flags: InteractionResponseFlags.EPHEMERAL,
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Genel hata:', error);
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Bir hata oluştu.',
        flags: InteractionResponseFlags.EPHEMERAL,
      }
    });
  }

  return res.send({ type: InteractionResponseType.PONG });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
