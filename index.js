import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';
import dotenv from 'dotenv';
import axios from 'axios';

// .env dosyasını yükle
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Middleware – JSON verisini ve rawBody'yi al
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Faceit seviyelerine karşılık gelen rol ID'leri
const roleIds = {
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

// Etkileşimleri dinle
app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

  // Ping testi (Discord validasyonu)
  if (interaction.type === 1) {
    return res.send({ type: 1 });
  }

  // Slash komutu /faceit
  if (interaction.type === 2 && interaction.data.name === 'faceit') {
    const nickname = interaction.data.options.find(opt => opt.name === 'nickname').value;
    return handleFaceit(interaction, nickname, res);
  }

  // Buton tıklama → Modal göster
  if (interaction.type === 3 && interaction.data.custom_id === 'show_faceit_modal_button') {
    return res.send({
      type: 9,
      data: {
        custom_id: 'faceit_role_modal',
        title: 'Faceit Kullanıcı Adı',
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'nickname',
                label: 'Faceit Nick',
                style: 1,
                min_length: 2,
                max_length: 20,
                placeholder: 's1mple',
                required: true
              }
            ]
          }
        ]
      }
    });
  }

  // Modal submit
  if (interaction.type === 5 && interaction.data.custom_id === 'faceit_role_modal') {
    const nickname = interaction.data.components[0].components[0].value;
    return handleFaceit(interaction, nickname, res);
  }

  // Bilinmeyen etkileşim
  return res.send({ type: 4, data: { content: 'Etkileşim tanınamadı.' } });
});

// Faceit nickname işleme
async function handleFaceit(interaction, nickname, res) {
  try {
    const faceitResponse = await axios.get(`https://open.faceit.com/data/v4/players?nickname=${nickname}`, {
      headers: {
        Authorization: `Bearer ${process.env.FACEIT_API_KEY}`
      }
    });

    const data = faceitResponse.data;
    const cs2Level = data.games?.cs2?.skill_level || null;

    if (!cs2Level || !roleIds[cs2Level]) {
      return res.send({
        type: 4,
        data: {
          content: `Faceit seviyesi alınamadı veya eşleşen bir rol bulunamadı. Seviye: ${cs2Level || 'Bulunamadı'}`
        }
      });
    }

    const roleId = roleIds[cs2Level];

    return res.send({
      type: 4,
      data: {
        content: `🎉 Faceit seviyen **${cs2Level}**, rolün başarıyla verilecek. <@${interaction.member.user.id}>`,
        allowed_mentions: { parse: ['users'] }
      }
    });

    // Not: Gerçek rol verme işlemi için Discord API Token'ı ile PATCH çağrısı gerekir.
    // Bu örnekte sadece mesaj dönülüyor, istersen rol verme kodunu da ekleyebilirim.

  } catch (e) {
    console.error('Faceit API Hatası:', e.message);
    return res.send({
      type: 4,
      data: {
        content: '❌ Faceit API isteği başarısız oldu. Lütfen kullanıcı adını kontrol et.'
      }
    });
  }
}

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
