import dotenv from 'dotenv';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.login(process.env.DISCORD_TOKEN);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'brainbuzz') {
    await interaction.reply('Work in progress - Brainbuzz');
  }
});
