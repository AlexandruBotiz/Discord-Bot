import supabaseClient from '../services/supabaseClient.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import moment from 'moment';
import QuizConfigurationSessionManager from '../utils/QuizConfigurationSessionManager.js';
import quizConfigurationMenu from '../ui/quizConfigurationMenu.js';

/**
 * If no active quiz, shows an in-chat (not modal) select menu
 * to choose a quiz type
 */
export async function handleCommand(interaction) {
  if (interaction.commandName === 'brainbuzz') {

    /**
     * Generate a unique session ID for the quiz configuration session.
     * We do this to associate the user's selections with their session
     * (each component - select menu, channel select, buttons - will have the same session ID in their customId).
     * - when the user clicks 'Submit', we can retrieve all their selections using each component's customId
     * - to prevent conflicts when multiple users are configuring quizzes at the same time, and
     * - to prevent multiple submissions of the same quiz configuration.
     *
     */
    const sessionID = crypto.randomUUID()

    return await interaction.reply({
      content: "**Hey there! Let's set up your quiz. Please choose the options below:**\n",
      components: await quizConfigurationMenu(sessionID),
      ephemeral: true,
    });
  }
}
