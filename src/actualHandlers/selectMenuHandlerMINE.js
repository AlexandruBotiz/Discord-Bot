import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

/**
 * After a user selects a quiz type from the select menu,
 * creates and shows a modal to configure quiz settings
 * (where the quiz will be posted and its duration)
 */
export async function handleSelectMenu(interaction) {
  // TODO: if multiple users create quizzes simultaneously, will there be conflicts?
  // get selected quiz type
  const selectedType = interaction.values[0];

  // create and show quiz creation modal
  // NOTE: may need to create unique custom IDs
  const modal = new ModalBuilder()
    .setCustomId(`quiz_creation_modal`)
    .setTitle('BrainBuzz Quiz');

  // TODO: remove DM option
  const deliveryInput = new TextInputBuilder()
    .setCustomId('delivery')
    .setLabel('Delivery (private/channel)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  // TODO: channel select menu
  const channelInput = new TextInputBuilder()
    .setCustomId('channel')
    .setLabel('Channel name (if channel delivery selected)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  // TODO: duration select menu
  const durationInput = new TextInputBuilder()
    .setCustomId('duration')
    .setLabel('Quiz duration (in format mm:ss or seconds)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(deliveryInput),
    new ActionRowBuilder().addComponents(channelInput),
    new ActionRowBuilder().addComponents(durationInput)
  );

  await interaction.showModal(modal);
}
