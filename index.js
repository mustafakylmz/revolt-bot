import express from 'express';
import { InteractionType, InteractionResponseType, verifyKeyMiddleware } from 'discord-interactions';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

// Faceit seviye ID’lerini env'den al
const levelRoles = {
  1: process.env.LEVEL_1_ROLE_ID,
  2: process.env.LEVEL_2_ROLE_ID,
  3: process.env.LEVEL_3_ROLE_ID,
  4: process.env.LEVEL_4_ROLE_ID,
  5: process.env.LEVEL_5_ROLE_ID,
  6: process.env.LEVEL_6_ROLE_ID,
  7: process.env.LEVEL_7_ROLE_ID,
  8: process.env.LEVEL_8_ROLE_ID,
  9: process.env.LEVEL_9_ROLE_ID,
  10: process.env.LEVEL_10_ROLE_ID,
};

// Discord request’lerini doğrula
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

  if (interaction.type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = interaction.data;

    if (name === 'ping') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: '🏓 Pong!' }
      });
    }

    if (name === 'faceit') {
      const nickname = options.find(opt => opt.name === 'nickname')?.value;

      if (!nickname) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Lütfen bir Faceit kullanıcı adı girin.' }
        });
      }

      try {
        const response = await fetch(`https://open.faceit.com/data/v4/players?nickname=${nickname}`, {
          headers: { Authorization: `Bearer ${FACEIT_API_KEY}` }
        });

        const data = await response.json();

        const level = data.games?.cs2?.skill_level;

        if (!level) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `CS2 için Faceit seviyesi bulunamadı.` }
          });
        }

        const roleId = levelRoles[level];

        if (!roleId) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: `Faceit seviyesi ${level} için tanımlı bir rol yok.` }
          });
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🎯 **${nickname}** adlı oyuncunun Faceit seviyesi **${level}** olarak bulundu.\nLütfen yetkililere bildirerek <@&${roleId}> rolünü alınız.`
          }
        });
      } catch (error) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `Faceit API hatası: ${error.message}` }
        });
      }
    }
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
