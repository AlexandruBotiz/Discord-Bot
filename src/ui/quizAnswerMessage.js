import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function quizAnswerMessage(quizId, quiz) {
  const optionButtons = quiz.options.map((option, index) =>
    new ButtonBuilder()
      .setCustomId(`quiz_answer_button_${quiz.quiz_id}_${index}`)
      .setLabel(`Option ${index + 1}`)
      .setStyle(ButtonStyle.Primary)
  );
  const buttonRows = new ActionRowBuilder().addComponents(optionButtons);

  return {
    content:
      `**${quiz.quizText}**\n\n` +
      `${quiz.options.map((option, index) => `**${index + 1}.** ${option}`).join('\n')}`,
    components: [buttonRows],
    flags: 'Ephemeral'
  };
}
