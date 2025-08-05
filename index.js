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

client.on("messageCreate", async (message) => {
    console.log(message);

    if (!message.author.bot) {
        message.author.send('Salut Rege');
        //message.channel.send('Salut sefule');
    }
});
