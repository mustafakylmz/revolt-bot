require('dotenv').config();

const express = require('express');
const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');

const app = express();
const PORT = process.env.PORT || 3000;

// Ortam değişkenlerini kontrol et
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
if (!DISCORD_PUBLIC_KEY) {
  throw new Error('DISCORD_PUBLIC_KEY environment variable is not set.');
}

app.use(express.json());

// Discord interactionları doğrulayan middleware (mutlaka doğru public key girilmeli)
app.post('/interactions', verifyKeyMiddleware(DISCORD_PUBLIC_KEY), (req, res) => {
  const interaction = req.body;

  // Slash Command (tip 1)
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    if (interaction.data.name === 'ping') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Pong! 🏓',
        },
      });
    }

    // Başka komutlar buraya
  }

  // Ping cevabı (tip 1) dışındaki diğer eventler
  return res.send({ type: InteractionResponseType.PONG });
});

// Basit ana sayfa (opsiyonel)
app.get('/', (req, res) => {
  res.send('Discord bot is running!');
});

// Server'ı başlat
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
