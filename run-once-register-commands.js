import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
  {
    name: "ping",
    description: "Botun çalışıp çalışmadığını kontrol eder."
  },
  {
    name: "faceit",
    description: "Faceit nickname ile seviye bilgisi alır.",
    options: [
      {
        name: "nickname",
        description: "Faceit kullanıcı adınız",
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: "rolal",
    description: "Rolleri seçip almanızı sağlar."
  },
  {
    name: "faceitrol",
    description: "Faceit rolü almanızı sağlar."
  }
];

const url = `https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/commands`; // DISCORD_CLIENT_ID kullanıldı

fetch(url, {
  method: 'PUT',
  headers: {
    "Authorization": `Bot ${process.env.BOT_TOKEN}`, // BOT_TOKEN kullanıldı
    "Content-Type": "application/json"
  },
  body: JSON.stringify(commands)
})
.then(res => res.json())
.then(console.log)
.catch(console.error);