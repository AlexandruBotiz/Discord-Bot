import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default function getQuizStartMessage(quizId, creatorID, quizType, remainingCountdown) {
  // create "Start Quiz" button
  const startButton = new ButtonBuilder()
    .setCustomId(`start-quiz-button-${quizId}`)
    .setLabel('Start Quiz')
    .setStyle(ButtonStyle.Success);

  const content = `<@${creatorID}> has created a **${quizType}** quiz!\nClick the button below to start the quiz.\n\n**Time remaining:** ${remainingCountdown}`;

  return {
    content: content,
    components: [new ActionRowBuilder().addComponents(startButton)]
  };
}
