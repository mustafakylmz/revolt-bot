import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
  {
    name: "ping",
    description: "Botun çalışıp çalışmadığını kontrol eder."
  }
];

const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/commands`;

fetch(url, {
  method: 'PUT', // PUT, mevcut tüm komutları bu listeyle değiştirir
  headers: {
    "Authorization": `Bot ${process.env.BOT_TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(commands)
})
.then(res => res.json())
.then(console.log)
.catch(console.error);