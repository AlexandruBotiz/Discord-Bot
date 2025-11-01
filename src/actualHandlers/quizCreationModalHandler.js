import { client } from '../index.js';
import ServerClient from '../services/ServerClient.js';
import QuizSessionManager from '../utils/QuizSessionManager.js';
import { handleQuizTimeout } from '../utils/handleQuizTimeout.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import moment from 'moment';

/**
 * Fetches the quiz and posts it to the specified channel or user.
 */
export async function handleQuizCreationModal(interaction) {
  const quizType = 'opentdb.18'; // temporary hardcoded quiz type
  const quizReadableType = '🖥️ Computers'; // temporary hardcoded quiz type

  // defer reply to display thinking message
  //  to prevent user from interacting again
  await interaction.reply({ content: 'Loading...', components: [], flags: 'Ephemeral' });

  const quizId = interaction.customId.replace('quiz_setup_', '');

  // get field values
  const delivery = interaction.fields.getTextInputValue('delivery').toLowerCase();
  const channelName = interaction.fields.getTextInputValue('channel');
  const durationInput = interaction.fields.getTextInputValue('duration');

  /**
   * The ID of either the channel or the user. This ID is used to fetch a `Channel` or a `User` object
   * that can be used to send messages in/to using the `send()` method.
   */
  let destinationId;

  /**
   * The channel object to send the quiz in
   * Eventually the 'private' option will be removed so the switch block
   * will be removed as well
   */
  let channel;

  // parse delivery field
  switch (delivery) {
    case 'channel':
      // validate channel field
      if (!channelName) {
        await interaction.followUp({
          content: '❌ Specify a channel to send the quiz in.',
          ephemeral: true
        });
      }

      // get selected channel id
      // NOTE: guild = server (discord server)
      const guild = client.guilds.cache.get(interaction.guildId);
      channel = guild.channels.cache.find(
        (channel) => channel.name.toLowerCase() === channelName.toLowerCase()
      );

      // if no channel with the given name found
      if (!channel) {
        await interaction.followUp({
          content: `❌ Couldn't find channel #${channelName}.`,
          ephemeral: true
        });
        return;
      }

      // set destination to channel id
      destinationId = channel.id;

      break;

    case 'private':
      // set destination to user id
      destinationId = interaction.user.id;

      break;

    default:
      // if input is not 'channel' or 'private'
      await interaction.followUp({
        content: '❌ Invalid delivery method. Type "private" or "channel".',
        flags: 'Ephemeral'
      });
      return;
  }

  // parse duration
  const durationInSeconds = await parseDuration(durationInput);

  // return if duration parsing failed
  if (!durationInSeconds) return;

  // get quiz
  let quiz;
  try {
    quiz = await ServerClient.getQuiz(quizType, durationInSeconds);
  } catch (error) {
    console.error('Error fetching quiz: ', error);
    await interaction.followUp({
      content: "❌ Can't think of a quiz right now. Try later.",
      flags: 'Ephemeral'
    });
    // delete the original quiz creation message
    await interaction.deleteReply();
    return;
  }

  // DEBUG: print correct answer
  console.log('Quiz correct answer:', quiz.answer);

  // store quiz data and metadata in the list of sessions
  // compute end time
  const endTime = Date.now() + durationInSeconds * 1000;

  const creatorID = interaction.user.id;
  QuizSessionManager.insert(quiz.quiz_id, {
    quiz,
    type: quizType,
    endTime,
    channelID: destinationId,
    messageTS: null, // to be filled when posting the quiz message
    usersAnswered: [],
    creatorUserID: creatorID
  });

  // start timeout
  // NOTE: do not use `await` since it will block the event loop
  handleQuizTimeout(quiz.quiz_id, endTime);

  // create "Start Quiz" button
  const startButton = new ButtonBuilder()
    .setCustomId(`start_quiz_button_${quiz.quiz_id}`)
    .setLabel('Start Quiz')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(startButton);

  // delete the original quiz creation message
  await interaction.deleteReply();

  const duration = moment.duration(durationInSeconds, 'seconds');
  const remainingCountdown = moment.utc(duration.asMilliseconds()).format('mm:ss');
  switch (delivery) {
    case 'channel':
      await channel.send({
        content: `<@${creatorID}> has started a new *${quizReadableType} quiz*!\nClick the "Start Quiz" button below to give it a try.\n\nTime remaining: ${remainingCountdown}`,
        components: [row]
      });

      break;

    case 'private':
      await interaction.user.send({
        content: `You have started a new *${quizId} quiz*!\nClick the "Start Quiz" button below to give it a try.\n*Time remaining:* ${remainingCountdown}`,
        components: [row]
      });
  }
}

async function parseDuration(durationInput, interaction) {
  let durationSeconds = 0;
  if (!durationInput) {
    // TODO: better error handling, maybe throw and catch in caller, sending message based on error
    await interaction.reply({
      content: '❌ Specify the duration of the quiz.',
      ephemeral: true
    });
    return;
  }

  if (durationInput.includes(':')) {
    // mm:ss format
    const [min, sec] = durationInput.split(':').map(Number);
    durationSeconds = min * 60 + sec;
  } else {
    // ss format
    durationSeconds = Number(durationInput);
  }

  // if duration could not be parsed
  if (isNaN(durationSeconds) || durationSeconds <= 0) {
    await interaction.reply({
      content: '❌ Invalid time! Try again and respect the mm:ss format.',
      ephemeral: true
    });
    return;
  }

  return durationSeconds;
}
