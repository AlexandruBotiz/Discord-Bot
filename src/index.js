import dotenv from 'dotenv';
import { Client, GatewayIntentBits, InteractionType, Partials } from 'discord.js';
import { handleQuizCreationModal } from './actualHandlers/quizCreationModalHandler.js';
import { handleSelectMenu } from './actualHandlers/selectMenuHandlerMINE.js';
import { handleCommand } from './commands/brainbuzz.js';
import { handleAnswerSubmit } from './actualHandlers/answerSubmitHandlerMINE.js';
import { handleQuizStartButton } from './actualHandlers/startQuizHandlerMINE.js';
import { handleAnswerButton } from './actualHandlers/answerButtonHandlerMINE.js';

dotenv.config({ quiet: true });

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

(async () => {
  client.login(process.env.DISCORD_TOKEN)
})();

// Log when the bot is ready
client.once('ready', () => {
  console.log(`BrainBuzz is up and running!`);
});



client.on("interactionCreate", async (interaction) => {
  // Slash command handler
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction);
  }

  // Select menu handler
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'quiz_type_select_menu')
      await handleSelectMenu(interaction);
  }

  // Modal submission handler
  if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId.startsWith('quiz_creation_modal')) {
      await handleQuizCreationModal(interaction);
    } else if (interaction.customId.startsWith('answer_quiz_')) {
      await handleAnswerSubmit(interaction)
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('start_quiz_')) {
      await handleQuizStartButton(interaction);
    } else if (interaction.customId.startsWith('answer_quiz_button')) {
      await handleAnswerButton(interaction);
    }
  }
});
