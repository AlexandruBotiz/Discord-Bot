import QuizSessionManager from '../utils/QuizSessionManager.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Handles the start quiz button interaction.
 */
export async function handleQuizStartButton(interaction) {
  // get quiz id from button custom id
  const quizId = interaction.customId.replace('start_quiz_button_', '');

  // get metadata using quiz id
  const session = QuizSessionManager.getQuizSessionMetadata(quizId);

  if (!session) {
    return interaction.reply({ content: 'Could not find this quiz!', ephemeral: true });
  }

  const answerButton = new ButtonBuilder()
    .setCustomId(`answer_quiz_button_${quizId}`)
    .setLabel('Answer')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(answerButton);

  // time remaining
  let remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));

  const quizMessage = await interaction.reply({
    content:
      `**${session.quiz.quizText}**\n\n` +
      `${session.quiz.options.map((option, index) => `**${index + 1}.** ${option}`).join('\n')}` +
      `\n\nTime remaining: ${remaining}`,
    components: [row]
  });

  // set interval to update message every second
  const intervalID = setInterval(async () => {
    // evaluate remaining time
    remaining = Math.max(0, Math.floor((session.endTime - Date.now()) / 1000));

    // if quiz has ended/timed out
    if (remaining <= 0) {
      clearInterval(intervalID);

      // disable answer button
      const disabledButton = ButtonBuilder.from(answerButton).setDisabled(true);

      await quizMessage.edit({
        content: `<@${session.creatorUserID}>'s quiz has ended! ⏰ Check out my reply for the results.`,
        components: [new ActionRowBuilder().addComponents(disabledButton)]
      });
    }

    // update message with remaining time countdown
    await quizMessage.edit({
      content:
        `**${session.quiz.quizText}**\n\n` +
        `${session.quiz.options.map((option, index) => `**${index + 1}.** ${option}`).join('\n')}` +
        `\n\nTime remaining: ${remaining}`,
      components: [row]
    });
  }, 1000);
}
