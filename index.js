const express = require('express');
const { InteractionType, verifyKeyMiddleware } = require('discord-interactions');
const { InteractionResponseType } = require('discord-api-types/v10');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Discord tarafından gönderilen istekleri doğrulamak için middleware
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), (req, res) => {
  const interaction = req.body;

  if (interaction.type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Slash komutun geldiği yer
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Faceit sistemine hoş geldin!',
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Bot sunucusu çalışıyor: http://localhost:${PORT}`);
});
