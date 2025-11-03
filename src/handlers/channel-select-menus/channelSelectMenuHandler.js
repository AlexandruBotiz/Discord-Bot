import QuizConfigurationSessionManager from '../../utils/QuizConfigurationSessionManager.js';

export async function handleChannelSelectMenu(interaction) {
  // acknowledge interaction to update UI
  await interaction.deferUpdate();

  // get selected channel ID
  const selectedChannelId = interaction.values[0];

  // update quiz configuration session data
  const sessionID = interaction.customId.replace('select-quiz-channel-', '');

  QuizConfigurationSessionManager.set(sessionID, {
    channelId: selectedChannelId
  });
}
