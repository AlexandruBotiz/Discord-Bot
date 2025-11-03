import QuizConfigurationSessionManager from '../../utils/QuizConfigurationSessionManager.js';
import { fetchAndPostQuiz } from '../../utils/fetchAndPostQuiz.js';

export async function handleQuizConfigSubmitButton(interaction) {
  // acknowledge the button interaction
  // we use deferReply to show a "BrainBuzz is thinking..." message
  await interaction.deferReply({ ephemeral: true });

  // extract session ID from button customId
  const sessionID = interaction.customId.replace('submit-quiz-config-', '');

  // get quiz configuration data from session manager
  const sessionData = QuizConfigurationSessionManager.getConfigData(sessionID);

  /**
   * `sessionData` is undefined when:
   *  - user has not selected any options
   *  - session has expired or been cleared from map (cache)
   */
  if (!sessionData) {
    await interaction.followUp({
      content:
        ':warning: Oops! Something went wrong on my part. Try re-selecting your quiz options.',
      ephemeral: true
    });
    return;
  }

  const { quizTypeValue, quizTypeText, channelId, durationValue, completed } = sessionData;

  if (!quizTypeValue || !channelId || !durationValue) {
    await interaction.followUp({
      content:
        ':warning: Please provide all required fields: quiz type, channel, and duration. Alternatively, try re-selecting your options.',
      ephemeral: true
    });
    return;
  }

  if (completed) {
    await interaction.followUp({
      content:
        ":warning: You've already submitted this quiz creation. If you wish to create another quiz, trigger another `/brainbuzz` command.",
      ephemeral: true
    });
    return;
  }

  // mark session as completed to prevent multiple submissions
  QuizConfigurationSessionManager.clear(sessionID);

  // get channel object using ID
  // get guild (server) object
  const guild = await interaction.client.guilds.cache.get(interaction.guildId);
  const channel = await guild.channels.fetch(channelId);

  await fetchAndPostQuiz(interaction, quizTypeValue, quizTypeText, channel, durationValue);
}
