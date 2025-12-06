/**
 * This script registers slash commands for a Discord bot by connecting to the Discord API
 */
import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config({
    path: '../.env'
});

const commands = [
  {
    name: 'brainbuzzdev',
    description: 'Create a quiz'
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Registering slash commands...');
  await rest.put(
    Routes.applicationCommands(process.env.APP_ID),
    { body: commands }
  );
  console.log('Done.');
} catch (error) {
  console.error(error);
}
