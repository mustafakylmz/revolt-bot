require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, () => {
  console.log(`Bot hazır! ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);