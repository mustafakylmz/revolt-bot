import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Faceit rol ID'lerini seviyeye göre eşle
const ROLE_IDS = {
  1: process.env.LEVEL_1_ROLE_ID,
  2: process.env.LEVEL_2_ROLE_ID,
  3: process.env.LEVEL_3_ROLE_ID,
  4: process.env.LEVEL_4_ROLE_ID,
  5: process.env.LEVEL_5_ROLE_ID,
  6: process.env.LEVEL_6_ROLE_ID,
  7: process.env.LEVEL_7_ROLE_ID,
  8: process.env.LEVEL_8_ROLE_ID,
  9: process.env.LEVEL_9_ROLE_ID,
  10: process.env.LEVEL_10_ROLE_ID
};

// Bu middleware sadece Discord /interactions endpoint'i için geçerli olacak şekilde tanımlanmalı
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), express.json(), async (req, res) => {
  const interaction = req.body;

  // Ping kontrolü
  if (interaction.type === 1) {
    return res.send({ type: 1 });
  }

  // Slash komutları
  if (interaction.type === 2 && interaction.data.name === 'faceit') {
    const nickname = interaction.data.options.find(opt => opt.name === 'nickname')?.value;
    if (!nickname) {
      return res.send({
        type: 4,
        data: {
          content: '❌ Kullanıcı adı alınamadı.',
          flags: 64
        }
      });
    }

    try {
      const response = await fetch(`https://open.faceit.com/data/v4/players?nickname=${nickname}`, {
        headers: { Authorization: `Bearer ${process.env.FACEIT_API_KEY}` }
      });

      const data = await response.json();

      const cs2Level = data.games?.cs2?.skill_level;
      const roleId = ROLE_IDS[cs2Level];

      if (!cs2Level || !roleId) {
        return res.send({
          type: 4,
          data: {
            content: `❌ Kullanıcı bulundu ancak CS2 seviyesi alınamadı veya rol tanımlı değil.`,
            flags: 64
          }
        });
      }

      // Ephemeral yanıt ver
      return res.send({
        type: 4,
        data: {
          content: `🎉 Faceit seviyen **${cs2Level}**, rolün başarıyla verildi.`,
          flags: 64
        }
      });

      // ⚠️ Bu örnekte rol verme işlemi yapılmaz — bunun için Discord bot token'ı ile ayrı bir API çağrısı yapılmalıdır.

    } catch (err) {
      console.error(err);
      return res.send({
        type: 4,
        data: {
          content: '❌ Faceit API isteği başarısız oldu. Lütfen kullanıcı adını kontrol et.',
          flags: 64
        }
      });
    }
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
