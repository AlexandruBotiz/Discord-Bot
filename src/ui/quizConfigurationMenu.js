import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder
} from 'discord.js';
import moment from 'moment';
import ServerClient from '../services/ServerClient.js';

const locale = 'en';

// all supported quiz durations
const durations = [
  moment.duration(30, 'seconds'),
  moment.duration(1, 'minute'),
  moment.duration(5, 'minutes'),
  moment.duration(10, 'minutes'),
  moment.duration(30, 'minutes'),
  moment.duration(1, 'hour'),
  moment.duration(2, 'hours'),
  moment.duration(4, 'hours'),
  moment.duration(8, 'hours'),
  moment.duration(24, 'hours')
];

// switch locale to use humanize()
moment.locale(locale);

export default async function quizConfigurationMenu(sessionID) {

  // get quiz types from backend
  const quizTypeOptions = await ServerClient.getQuizTypes()

  // == quiz configuration menu ==
  // for selecting quiz type
  const quizTypeSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select-quiz-type-${sessionID}`)
    .setPlaceholder('What quiz would you like to play?')
    .addOptions(
      quizTypeOptions.map(quizType =>
        new StringSelectMenuOptionBuilder()
          .setLabel(quizType.text.text)
          .setValue(quizType.value)
      )
    );

  // for selecting channel to post quiz in
  const quizChannelSelectMenu = new ChannelSelectMenuBuilder()
    .setCustomId(`select-quiz-channel-${sessionID}`)
    .setPlaceholder('Where should I post the quiz?')
    .setChannelTypes(ChannelType.GuildText)
    .setMinValues(1)
    .setMaxValues(1);

  // for typing quiz duration
  const quizDurationTextInputField = new StringSelectMenuBuilder()
    .setCustomId(`select-quiz-duration-${sessionID}`)
    .setPlaceholder('How long should the quiz last?')
    .addOptions(
      durations.map((duration) => ({
        label: duration.humanize(),
        value: `${duration.asSeconds()}`
      }))
    );

  // for submitting quiz configuration
  const submitButton = new ButtonBuilder()
    .setCustomId(`submit-quiz-config-${sessionID}`)
    .setLabel('Submit')
    .setStyle(ButtonStyle.Primary);

  return [
    new ActionRowBuilder().addComponents(quizTypeSelectMenu),
    new ActionRowBuilder().addComponents(quizChannelSelectMenu),
    new ActionRowBuilder().addComponents(quizDurationTextInputField),
    new ActionRowBuilder().addComponents(submitButton)
  ]
}