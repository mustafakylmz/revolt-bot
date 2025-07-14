// run-once-register-commands.js
import dotenv from 'dotenv';
import { REST } from '@discordjs/rest';
import { Routes, ApplicationCommandOptionType } from 'discord-api-types/v10';

dotenv.config();

const commands = [
    {
        name: 'send-role-panel',
        description: 'Belirtilen kanala rol seçim paneli gönderir veya günceller.',
        options: [
            {
                name: 'channel',
                description: 'Panelin gönderileceği kanal.',
                type: ApplicationCommandOptionType.Channel,
                required: false, // Make it optional, default to current channel
            },
        ],
    },
    {
        name: 'refresh-role-panel',
        description: 'Mevcut rol seçim panelini günceller.',
    },
    // Add other commands here if you have any, e.g., for Faceit button
    {
        name: 'faceit-role-button',
        description: 'Faceit rol talep butonunu gönderir.',
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log('Uygulama (/) komutları yenilenmeye başlanıyor.');
        // This will register global commands. For guild-specific commands, use Routes.applicationGuildCommands(applicationId, guildId)
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );
        console.log('Uygulama (/) komutları başarıyla yeniden yüklendi.');
    } catch (error) {
        console.error('Uygulama (/) komutları yüklenirken hata:', error);
    }
})();
