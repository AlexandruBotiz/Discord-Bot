import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

/**
 * Handles the answer button interaction by showing a modal for the user to input their answer.
 */
export async function handleAnswerButton(interaction) {
  const quizId = interaction.customId.replace('answer_quiz_button_', '');

  const modal = new ModalBuilder()
    .setCustomId(`answer_quiz_${quizId}`)
    .setTitle('Answer the quiz');

  const optionsInput = new TextInputBuilder()
    .setCustomId('answer')
    .setLabel('Type the answer exactly as it appears')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(optionsInput));

  await interaction.showModal(modal);
}
