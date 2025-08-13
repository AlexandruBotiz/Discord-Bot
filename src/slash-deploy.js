import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

//info needed for slash commands
const botID = '1401818514372825230';
const serverID = '1401820681473364078';
const botToken = process.env.DISCORD_TOKEN;

const rest = new REST({ version: '10' }).setToken(botToken);

const slashRegister = async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(botID, serverID), {
      body: [
        {
          name: 'brainbuzz',
          description: 'Test message'
        }
      ]
    });
  } catch (error) {
    console.error(error);
  }
};

slashRegister();
